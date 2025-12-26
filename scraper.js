const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { performance } = require("perf_hooks");

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

const cleanLabel = (text, label) =>
  text
    .split(label)[1]
    .trim()
    .replace(/\&nbsp;/g, " ")
    .replace(/\*$/, "");

async function getPokeHarborDetails(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000,
    });
    const $ = cheerio.load(data);

    let version = "N/A";
    let status = "Unknown";
    let releasedDisplay = "N/A";
    let updatedDisplay = "N/A";

    let metaPublished =
      $('meta[property="article:published_time"]')
        .attr("content")
        ?.split("T")[0] || "N/A";
    let metaModified =
      $('meta[property="article:modified_time"]')
        .attr("content")
        ?.split("T")[0] || "N/A";

    $("li").each((i, el) => {
      const text = $(el).text();
      if (text.includes("Version:")) version = cleanLabel(text, "Version:");
      if (text.includes("Status:")) status = cleanLabel(text, "Status:");
      if (text.includes("Released:"))
        releasedDisplay = cleanLabel(text, "Released:");
      if (text.includes("Updated:"))
        updatedDisplay = cleanLabel(text, "Updated:");
    });

    const finalReleased =
      releasedDisplay !== "N/A" ? releasedDisplay : metaPublished;
    const finalUpdated =
      updatedDisplay !== "N/A"
        ? updatedDisplay
        : releasedDisplay !== "N/A"
        ? "N/A"
        : metaModified;

    if (status === "Unknown" && version.toLowerCase().includes("demo"))
      status = "Demo";

    return {
      updated: finalUpdated,
      released: finalReleased,
      version,
      status,
    };
  } catch (e) {
    return {
      updated: "N/A",
      released: "N/A",
      version: "N/A",
      status: "Unknown",
    };
  }
}

async function getEeveeExpoDetails(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000,
    });
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

    if (status === "Unknown" && $(".label--completed").length > 0)
      status = "Completed";
    if (status === "Unknown" && version.toLowerCase().includes("demo"))
      status = "Demo";

    return {
      updated: updatedDisplay,
      released: releasedDisplay,
      version,
      status,
      image: $(".bbWrapper img").first().attr("src") || "N/A",
    };
  } catch (e) {
    return {
      updated: "N/A",
      released: "N/A",
      version: "N/A",
      status: "Unknown",
      image: "N/A",
    };
  }
}

async function processCategory(cat, seenUrls) {
  const games = [];
  const pagesToScrape = cat.max || 1;
  let gameCount = 0;

  console.log(`\n--- Processing Category: ${cat.name} ---`);

  for (let i = 1; i <= pagesToScrape; i++) {
    try {
      const targetUrl =
        cat.source === "EeveeExpo"
          ? i === 1
            ? cat.url
            : `${cat.url}page-${i}`
          : `${cat.url}${i}/`;
      console.log(`[Page ${i}/${pagesToScrape}] Fetching: ${targetUrl}`);

      const { data } = await axios.get(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000,
      });
      const $ = cheerio.load(data);

      const selector =
        cat.source === "EeveeExpo"
          ? "article.message--articlePreview"
          : ".p-wrap";
      const elements = $(selector).toArray();

      for (const el of elements) {
        const titleEl =
          cat.source === "EeveeExpo"
            ? $(el).find(".articlePreview-title a").last()
            : $(el).find(".entry-title a");

        const title = titleEl.text().trim();
        const href = titleEl.attr("href");
        if (!href) continue;

        const gameUrl =
          cat.source === "EeveeExpo"
            ? href.startsWith("http")
              ? href
              : `https://eeveeexpo.com${href}`
            : href;

        if (seenUrls.has(gameUrl)) continue;

        console.log(`  -> Scraping: ${title}`);
        const details =
          cat.source === "EeveeExpo"
            ? await getEeveeExpoDetails(gameUrl)
            : await getPokeHarborDetails(gameUrl);

        seenUrls.add(gameUrl);
        gameCount++;

        const eeveeImage = $(el)
          .find(".articlePreview-image")
          .css("background-image")
          ? $(el)
              .find(".articlePreview-image")
              .css("background-image")
              .replace(/url\(['"]?(.*?)['"]?\)/i, "$1")
          : "N/A";

        games.push({
          id: Buffer.from(gameUrl).toString("base64").substring(0, 12),
          title,
          game_url: gameUrl,
          image:
            cat.source === "EeveeExpo"
              ? eeveeImage !== "N/A"
                ? eeveeImage
                : details.image
              : $(el).find(".rb-iwrap img").attr("data-src") ||
                $(el).find(".rb-iwrap img").attr("src"),
          last_updated:
            cat.source === "EeveeExpo"
              ? details.updated !== "N/A"
                ? details.updated
                : $(el).find("time.u-dt").first().text().trim()
              : details.updated,
          initial_release:
            cat.source === "EeveeExpo"
              ? details.released !== "N/A"
                ? details.released
                : "N/A"
              : details.released,
          version: details.version,
          status: details.status,
          platform: cat.name,
          source: cat.source,
        });
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      break;
    }
  }
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
        a.last_updated === "N/A" ? a.initial_release : a.last_updated
      );
      const dateB = new Date(
        b.last_updated === "N/A" ? b.initial_release : b.last_updated
      );
      return dateB - dateA;
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(sortedData, null, 2));
    console.log("SUCCESS!");
  }

  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`\nScraping completed in ${duration.toFixed(2)} seconds.`);
}

startScraper();
