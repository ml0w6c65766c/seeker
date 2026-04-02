/**
 * Netlify Function: rss-feeds
 * Fetches RSS feeds server-side – no CORS issues.
 *
 * Aufruf im Frontend: fetch('/api/rss-feeds')
 * (netlify.toml leitet /api/* → /.netlify/functions/:splat weiter)
 */

const FEEDS = [
  { name: "Heise Security",    url: "https://www.heise.de/security/rss/alert-news-atpm.xml" },
  { name: "BleepingComputer",  url: "https://www.bleepingcomputer.com/feed/" },
  { name: "The Hacker News",   url: "https://feeds.feedburner.com/TheHackersNews" },
];

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const results = await Promise.allSettled(
    FEEDS.map(async ({ name, url }) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Seeker-Bot/1.0)" },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const xml = await res.text();
      return { name, url, xml };
    })
  );

  const feeds = [];
  const errors = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      feeds.push(result.value);
    } else {
      errors.push(result.reason?.message ?? String(result.reason));
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ feeds, errors }),
  };
};