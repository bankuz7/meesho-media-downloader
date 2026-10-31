import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua-Platform": '"Android"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

const MEDIA_RE =
  /https?:\\?\/\\?\/[^\s"'<>\\]+?\.(?:jpg|jpeg|png|webp|avif|mp4)(?:\?[^\s"'<>\\]*)?/gi;

function clean(url: string): string {
  return url
    .replace(/\\\//g, "/")
    .replace(/\\u002F/g, "/")
    .replace(/\\/g, "");
}

function dedupeByName(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const base = u.split("?")[0];
    const parts = base.split("/");
    let key = parts[parts.length - 1] || u;
    key = key.replace(/_\d+(?=\.)/, "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

function findMedia(html: string): string[] {
  const urls = new Set<string>();

  // 1. __NEXT_DATA__
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const blob = JSON.stringify(JSON.parse(nextDataMatch[1]));
      const matches = blob.match(MEDIA_RE) || [];
      for (const u of matches) urls.add(clean(u));
    } catch {
      // ignore
    }
  }

  // 2. full page regex
  const pageMatches = html.match(MEDIA_RE) || [];
  for (const u of pageMatches) urls.add(clean(u));

  // 3. og:image
  const ogMatches = html.matchAll(
    /property=["']og:image["']\s+content=["']([^"']+)["']/gi
  );
  for (const m of ogMatches) urls.add(m[1]);

  // also look for images array in JSON more carefully
  try {
    if (nextDataMatch) {
      const data = JSON.parse(nextDataMatch[1]);
      const details =
        data?.props?.pageProps?.initialState?.product?.details?.data;
      if (details?.images && Array.isArray(details.images)) {
        for (const img of details.images) {
          if (typeof img === "string") urls.add(img);
          else if (img?.url) urls.add(img.url);
          else if (img?.image) urls.add(img.image);
        }
      }
      // videos
      if (details?.videos && Array.isArray(details.videos)) {
        for (const v of details.videos) {
          if (typeof v === "string") urls.add(v);
          else if (v?.url) urls.add(v.url);
        }
      }
    }
  } catch {
    // ignore
  }

  return dedupeByName(Array.from(urls).filter((u) => u.startsWith("http")));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body?.url || "").trim();
    if (!url || !url.includes("meesho.com")) {
      return NextResponse.json(
        { error: "Valid Meesho product URL required" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Meesho returned ${res.status}. Bot protection may be active.` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const media = findMedia(html);

    if (media.length === 0) {
      return NextResponse.json(
        {
          error:
            "No media found. Meesho may be blocking this server (Akamai). Try the Python CLI from your own PC.",
          media: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ media, count: media.length });
  } catch (e: any) {
    const msg = e?.name === "TimeoutError" ? "Request timed out" : e?.message || "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
