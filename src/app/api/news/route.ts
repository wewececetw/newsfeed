import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { CATEGORIES, CategoryKey } from "@/lib/feeds";

export const runtime = "nodejs";
export const revalidate = 600;

type CustomItem = {
  "media:content"?: { $: { url?: string } } | Array<{ $: { url?: string } }>;
  "media:thumbnail"?: { $: { url?: string } } | Array<{ $: { url?: string } }>;
  enclosure?: { url?: string };
};

const parser: Parser<Record<string, never>, CustomItem> = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": "Mozilla/5.0 NewsAggregator/1.0" },
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: false }],
      ["media:thumbnail", "media:thumbnail", { keepArray: false }],
      ["content:encoded", "content:encoded"],
      ["description", "description"],
    ],
  },
});

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  image: string | null;
}

function stripHtml(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
}

function extractImage(
  item: Parser.Item & CustomItem & {
    content?: string;
    contentSnippet?: string;
    "content:encoded"?: string;
    summary?: string;
  }
): string | null {
  const mc = item["media:content"];
  if (mc) {
    const arr = Array.isArray(mc) ? mc : [mc];
    for (const m of arr) {
      const url = m?.$?.url;
      if (url) return url;
    }
  }
  const mt = item["media:thumbnail"];
  if (mt) {
    const arr = Array.isArray(mt) ? mt : [mt];
    for (const m of arr) {
      const url = m?.$?.url;
      if (url) return url;
    }
  }
  if (item.enclosure?.url) return item.enclosure.url;

  const bodies = [
    item["content:encoded"],
    item.content,
    item.summary,
    (item as unknown as { description?: string }).description,
  ].filter(Boolean) as string[];
  for (const body of bodies) {
    const match = body.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return match[1];
  }
  return null;
}

async function fetchFeed(name: string, url: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).map((it) => ({
      title: it.title ?? "(無標題)",
      link: it.link ?? "#",
      source: name,
      pubDate: it.isoDate ?? it.pubDate ?? new Date().toISOString(),
      snippet: stripHtml(it.contentSnippet ?? it.content ?? it.summary),
      image: extractImage(it),
    }));
  } catch (err) {
    console.error(`[feed:${name}] ${(err as Error).message}`);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get("category") ??
    "tech") as CategoryKey;
  const cfg = CATEGORIES[category];
  if (!cfg) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const results = await Promise.all(
    cfg.feeds.map((f) => fetchFeed(f.name, f.url))
  );
  const all = results.flat();
  all.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return NextResponse.json({
    category,
    label: cfg.label,
    count: all.length,
    items: all.slice(0, 80),
  });
}
