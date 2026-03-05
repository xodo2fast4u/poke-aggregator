const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const crypto = require("crypto");
const { performance } = require("perf_hooks");

/*
 * Categories are defined declaratively to keep scraping logic generic.
 * This makes it easy to add or remove sources without touching the core scraper flow.
 * The max field exists to cap pagination and prevent accidental deep crawls.
 */
const CATEGORIES = [
  {
    name: "RPGXP",
    url: "https://www.pokeharbor.com/category/rpgxp/page/",
    source: "PokeHarbor",
    max: 12,
  },
  {
    name: "RPGXP",
    url: "https://eeveeexpo.com/completed-games/",
    source: "EeveeExpo",
    max: 17,
  },
  {
    name: "GBA",
    url: "https://www.pokeharbor.com/category/roms/gba/page/",
    source: "PokeHarbor",
    max: 108,
  },
];

const DATA_FILE = "./src/data.json";

/*
 * Simple retry with exponential backoff to handle transient network failures.
 * Max 3 attempts to avoid infinite loops on genuinely dead pages.
 */
async function retryRequest(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/*
 * IDs are derived from URLs instead of the titles to remain stable
 * across renames, formatting changes or minor text edits on source sites.
 */
function generateUniqueId(url) {
  return crypto.createHash("sha256").update(url).digest("hex").substring(0, 16);
}

/*
 * Duration formatting is user facing so this intentionally favors readability
 * over precision or localization.
 */
function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (minutes === 0) {
    return `${seconds} Second(s)`;
  } else if (seconds === 0) {
    return `${minutes} Minute(s)`;
  } else {
    return `${minutes} Minute(s), ${seconds} Second(s)`;
  }
}

/*
 * Scraped list items often contain inconsistent spacing, HTML artifacts or trailing markers
 */
const cleanLabel = (text, label) =>
  text
    .split(label)[1]
    .trim()
    .replace(/\&nbsp;/g, " ")
    .replace(/\*$/, "");

/*
 * Generic detail scraper that works for both PokeHarbor and EeveeExpo.
 * Each source provides its own selector and fallback strategy.
 */
async function scrapeGameDetails(url, config) {
  try {
    const { data } = await retryRequest(() =>
      axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 5000,
      })
    );
    const $ = cheerio.load(data);

    let version = "N/A";
    let status = "Unknown";
    let releasedDisplay = "N/A";
    let updatedDisplay = "N/A";

    $("li").each((i, el) => {
      const text = $(el).text();
      if (text.includes("Version:")) version = cleanLabel(text, "Version:");
      if (text.includes("Status:")) status = cleanLabel(text, "Status:");
      if (text.includes("Released:"))
        releasedDisplay = cleanLabel(text, "Released:");
      if (text.includes("Updated:"))
        updatedDisplay = cleanLabel(text, "Updated:");
    });

    /*
     * Apply source-specific fallback logic
     */
    const result = config.applyFallbacks($, {
      version,
      status,
      released: releasedDisplay,
      updated: updatedDisplay,
    });

    return result;
  } catch (e) {
    /*
     * We return defaults so that a single bad page does not poison the dataset
     */
    return {
      updated: "N/A",
      released: "N/A",
      version: "N/A",
      status: "Unknown",
      image: "N/A",
    };
  }
}

const sourceStrategies = {
  PokeHarbor: {
    buildPageUrl: (baseUrl, pageNum) => `${baseUrl}${pageNum}/`,

    getListSelector: () => ".p-wrap",

    extractGameLink: ($, element) => {
      const titleEl = $(element).find(".entry-title a");
      return {
        title: titleEl.text().trim(),
        href: titleEl.attr("href"),
      };
    },

    extractImage: ($, element) => {
      return (
        $(element).find(".rb-iwrap img").attr("data-src") ||
        $(element).find(".rb-iwrap img").attr("src") ||
        "N/A"
      );
    },

    applyFallbacks: ($, details) => {
      /*
       * PokeHarbor uses meta tags as fallback when visible dates are missing
       */
      const metaPublished =
        $('meta[property="article:published_time"]')
          .attr("content")
          ?.split("T")[0] || "N/A";
      const metaModified =
        $('meta[property="article:modified_time"]')
          .attr("content")
          ?.split("T")[0] || "N/A";

      const finalReleased =
        details.released !== "N/A" ? details.released : metaPublished;
      const finalUpdated =
        details.updated !== "N/A"
          ? details.updated
          : details.released !== "N/A"
            ? "N/A"
            : metaModified;

      let status = details.status;
      if (status === "Unknown" && details.version.toLowerCase().includes("demo")) {
        status = "Demo";
      }

      return {
        updated: finalUpdated,
        released: finalReleased,
        version: details.version,
        status,
      };
    },
  },

  EeveeExpo: {
    buildPageUrl: (baseUrl, pageNum) =>
      pageNum === 1 ? baseUrl : `${baseUrl}page-${pageNum}`,

    getListSelector: () => "article.message--articlePreview",

    extractGameLink: ($, element) => {
      const titleEl = $(element).find(".articlePreview-title a").last();
      const href = titleEl.attr("href");
      const fullUrl = href?.startsWith("http")
        ? href
        : `https://eeveeexpo.com${href}`;

      return {
        title: titleEl.text().trim(),
        href: fullUrl,
      };
    },

    extractImage: ($, element, details) => {
      /*
       * EeveeExpo has images in two places: background-image CSS or in details
       */
      const bgImage = $(element)
        .find(".articlePreview-image")
        .css("background-image");

      if (bgImage) {
        const cleaned = bgImage.replace(/url\(['"]?(.*?)['"]?\)/i, "$1");
        if (cleaned !== "N/A") return cleaned;
      }

      return details?.image || "N/A";
    },

    extractFallbackTimestamp: ($, element) => {
      return $(element).find("time.u-dt").first().text().trim() || "N/A";
    },

    applyFallbacks: ($, details) => {
      let status = details.status;

      if (status === "Unknown" && $(".label--completed").length > 0) {
        status = "Completed";
      }

      if (status === "Unknown" && details.version.toLowerCase().includes("demo")) {
        status = "Demo";
      }

      return {
        updated: details.updated,
        released: details.released,
        version: details.version,
        status,
        image: $(".bbWrapper img").first().attr("src") || "N/A",
      };
    },
  },
};

async function processCategory(cat, seenUrls) {
  const games = [];
  const pagesToScrape = cat.max || 1;
  const strategy = sourceStrategies[cat.source];

  if (!strategy) {
    console.error(`Unknown source: ${cat.source}`);
    return games;
  }

  console.log(`\n--- Processing Category: ${cat.name} (${cat.source}) ---`);

  for (let i = 1; i <= pagesToScrape; i++) {
    try {
      const targetUrl = strategy.buildPageUrl(cat.url, i);
      console.log(`[Page ${i}/${pagesToScrape}] Fetching: ${targetUrl}`);

      const { data } = await retryRequest(() =>
        axios.get(targetUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 10000,
        })
      );
      const $ = cheerio.load(data);

      const selector = strategy.getListSelector();
      const elements = $(selector).toArray();

      for (const el of elements) {
        const { title, href } = strategy.extractGameLink($, el);
        if (!href) continue;

        const gameUrl = href;
        if (seenUrls.has(gameUrl)) continue;

        console.log(`  -> Scraping: ${title}`);
        const details = await scrapeGameDetails(gameUrl, strategy);
        seenUrls.add(gameUrl);

        let image = "N/A";
        if (cat.source === "EeveeExpo") {
          image = strategy.extractImage($, el, details);
          /*
           * EeveeExpo can also fall back to timestamp from listing page
           */
          if (details.updated === "N/A") {
            details.updated = strategy.extractFallbackTimestamp($, el);
          }
        } else {
          image = strategy.extractImage($, el);
        }

        games.push({
          id: generateUniqueId(gameUrl),
          title,
          game_url: gameUrl,
          image,
          last_updated: details.updated,
          initial_release: details.released,
          version: details.version,
          status: details.status,
          platform: cat.name,
          source: cat.source,
        });
      }
    } catch (err) {
      console.error(`  Error on page ${i}: ${err.message}`);
      /*
       * Continue to next page instead of breaking entirely.
       * Partial data from other pages is still valuable.
       */
      continue;
    }
  }

  console.log(`Found ${games.length} games in ${cat.name} (${cat.source})`);
  return games;
}

async function startScraper() {
  const startTime = performance.now();
  const allGames = [];
  const seenUrls = new Set();

  for (const cat of CATEGORIES) {
    const catGames = await processCategory(cat, seenUrls);
    allGames.push(...catGames);
  }

  if (allGames.length > 0) {
    console.log(`\nSorting and Saving ${allGames.length} games...`);
    const sortedData = allGames.sort((a, b) => {
      const dateA = new Date(
        a.last_updated === "N/A" ? a.initial_release : a.last_updated,
      );
      const dateB = new Date(
        b.last_updated === "N/A" ? b.initial_release : b.last_updated,
      );
      return dateB - dateA;
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(sortedData, null, 2));
    console.log("SUCCESS!");
  }

  const endTime = performance.now();
  const durationSeconds = (endTime - startTime) / 1000;
  console.log(`\nScraping completed in: ${formatDuration(durationSeconds)}`);
}

startScraper();
