const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const CATEGORIES = [
  {
    name: "RPGXP",
    url: "https://www.pokeharbor.com/category/rpgxp/page/",
    source: "PokeHarbor",
    max: 12,
  },
  {
    name: "GBA",
    url: "https://www.pokeharbor.com/category/roms/gba/page/",
    source: "PokeHarbor",
    max: 108,
  },
  {
    name: "RPGXP",
    url: "https://eeveeexpo.com/completed-games/",
    source: "EeveeExpo",
  },
];

const DATA_FILE = "./src/data.json";

function normalizeDate(rawDate) {
  if (!rawDate) return "N/A";
  const dateObj = new Date(rawDate);
  return isNaN(dateObj.getTime()) ? "N/A" : dateObj.toISOString().split("T")[0];
}

async function getPokeHarborDetails(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const $ = cheerio.load(data);
    const updated =
      $('meta[property="article:modified_time"]').attr("content") ||
      $('meta[property="article:published_time"]').attr("content");
    const published = $('meta[property="article:published_time"]').attr(
      "content"
    );
    let version = "N/A",
      status = "Unknown";

    $("li").each((i, el) => {
      const text = $(el).text();
      if (text.includes("Version:")) version = text.split("Version:")[1].trim();
      if (text.includes("Status:")) status = text.split("Status:")[1].trim();
    });

    if (status === "Unknown" && version.toLowerCase().includes("demo"))
      status = "Demo";

    return {
      updated: normalizeDate(updated),
      released: normalizeDate(published),
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
    });
    const $ = cheerio.load(data);

    const image =
      $(".articlePreview-image")
        .css("background-image")
        ?.replace(/url\(['"]?(.*?)['"]?\)/i, "$1") ||
      $(".bbWrapper img").first().attr("src");

    const bodyText = $(".bbWrapper").text();
    const versionMatch =
      bodyText.match(/Version:?\s*([v\d.]+)/i) ||
      bodyText.match(/(\d+\.\d+\.\d+|\d+\.\d+)/);
    const version = versionMatch
      ? versionMatch[0].replace(/version:?/i, "").trim()
      : "Thread";

    const status = $(".label--completed").length > 0 ? "Completed" : "Demo";

    return { image: image || "", version, status };
  } catch (e) {
    return { image: "", version: "Thread", status: "Unknown" };
  }
}

async function startScraper() {
  let allGames = [];
  const seenUrls = new Set();

  for (const cat of CATEGORIES) {
    if (cat.source === "EeveeExpo") {
      try {
        const { data } = await axios.get(cat.url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const $ = cheerio.load(data);

        for (const el of $(".structItem--thread").toArray()) {
          const titleEl = $(el).find(".structItem-title a").last();
          const gameUrl = `https://eeveeexpo.com${titleEl.attr("href")}`;

          if (gameUrl && !seenUrls.has(gameUrl)) {
            const details = await getEeveeExpoDetails(gameUrl);
            seenUrls.add(gameUrl);
            allGames.push({
              id: Buffer.from(gameUrl).toString("base64").substring(0, 12),
              title: titleEl.text().trim(),
              game_url: gameUrl,
              image: details.image,
              last_updated: normalizeDate(
                $(el).find(".structItem-latestDate time").attr("datetime")
              ),
              initial_release: normalizeDate(
                $(el).find(".structItem-startDate time").attr("datetime")
              ),
              version: details.version,
              status: details.status,
              platform: "RPGXP",
              source: "EeveeExpo",
            });
          }
        }
      } catch (e) {}
    } else {
      const pagesToScrape = cat.max || 1;
      for (let i = 1; i <= pagesToScrape; i++) {
        try {
          const { data } = await axios.get(`${cat.url}${i}/`, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          const $ = cheerio.load(data);
          const elements = $(".p-wrap").toArray();
          for (const el of elements) {
            const titleEl = $(el).find(".entry-title a");
            const gameUrl = titleEl.attr("href");
            if (gameUrl && !seenUrls.has(gameUrl)) {
              const details = await getPokeHarborDetails(gameUrl);
              seenUrls.add(gameUrl);
              allGames.push({
                id: Buffer.from(gameUrl).toString("base64").substring(0, 12),
                title: titleEl.text().trim(),
                game_url: gameUrl,
                image:
                  $(el).find(".rb-iwrap img").attr("data-src") ||
                  $(el).find(".rb-iwrap img").attr("src"),
                last_updated: details.updated,
                initial_release: details.released,
                version: details.version,
                status: details.status,
                platform: cat.name,
                source: "PokeHarbor",
              });
            }
          }
        } catch (err) {
          break;
        }
      }
    }
  }

  const sortedData = allGames.sort(
    (a, b) => new Date(b.last_updated) - new Date(a.last_updated)
  );
  fs.writeFileSync(DATA_FILE, JSON.stringify(sortedData, null, 2));
}

startScraper();
