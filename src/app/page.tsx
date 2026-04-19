"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cpu,
  TrendingUp,
  Globe2,
  Search,
  X,
  RefreshCw,
  Sun,
  Moon,
  Flame,
  Sparkles,
  Newspaper,
  ArrowUpRight,
  Clock,
  type LucideIcon,
} from "lucide-react";

type CategoryKey = "tech" | "stock" | "world";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  image: string | null;
}

interface TabDef {
  key: CategoryKey;
  label: string;
  icon: LucideIcon;
  accent: string;
  accentSoft: string;
  ring: string;
}

const TABS: TabDef[] = [
  {
    key: "tech",
    label: "科技",
    icon: Cpu,
    accent: "bg-indigo-600 text-white",
    accentSoft: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    ring: "ring-indigo-500/20",
  },
  {
    key: "stock",
    label: "股市",
    icon: TrendingUp,
    accent: "bg-emerald-600 text-white",
    accentSoft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  {
    key: "world",
    label: "國際",
    icon: Globe2,
    accent: "bg-rose-600 text-white",
    accentSoft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    ring: "ring-rose-500/20",
  },
];

const SOURCE_META: Record<string, { dot: string; text: string; gradient: string }> = {
  iThome: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", gradient: "from-blue-500 to-sky-600" },
  INSIDE: { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", gradient: "from-violet-500 to-purple-600" },
  "TechNews 科技新報": { dot: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", gradient: "from-cyan-500 to-blue-600" },
  科技報橘: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-500 to-red-600" },
  "經濟日報 財經要聞": { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-500 to-teal-600" },
  "經濟日報 產業情報": { dot: "bg-teal-500", text: "text-teal-600 dark:text-teal-400", gradient: "from-teal-500 to-cyan-600" },
  "中央社 財經": { dot: "bg-green-500", text: "text-green-600 dark:text-green-400", gradient: "from-green-500 to-emerald-600" },
  "Google 新聞 台股": { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", gradient: "from-amber-500 to-yellow-600" },
  "中央社 國際": { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", gradient: "from-red-500 to-rose-600" },
  "BBC 中文": { dot: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", gradient: "from-pink-500 to-rose-600" },
  "自由時報 國際": { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", gradient: "from-amber-500 to-orange-600" },
  "德國之聲 中文": { dot: "bg-fuchsia-500", text: "text-fuchsia-600 dark:text-fuchsia-400", gradient: "from-fuchsia-500 to-purple-600" },
};

function sourceMeta(name: string) {
  return (
    SOURCE_META[name] ?? {
      dot: "bg-zinc-500",
      text: "text-zinc-600 dark:text-zinc-400",
      gradient: "from-zinc-500 to-zinc-700",
    }
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return `${Math.floor(d / 30)} 個月前`;
}

function isHot(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 3 * 60 * 60 * 1000;
}

// In-memory og:image cache — survives tab switch within one session
const ogCache = new Map<string, string | null>();
const ogInflight = new Map<string, Promise<string | null>>();

function fetchOg(url: string): Promise<string | null> {
  if (ogCache.has(url)) return Promise.resolve(ogCache.get(url) ?? null);
  const inflight = ogInflight.get(url);
  if (inflight) return inflight;
  const p = fetch(`/api/og?url=${encodeURIComponent(url)}`)
    .then((r) => r.json())
    .then((d: { image?: string | null }) => {
      const img = d.image ?? null;
      ogCache.set(url, img);
      ogInflight.delete(url);
      return img;
    })
    .catch(() => {
      ogCache.set(url, null);
      ogInflight.delete(url);
      return null;
    });
  ogInflight.set(url, p);
  return p;
}

function Thumbnail({
  src,
  fallbackSeed,
  source,
  className,
  eager = false,
}: {
  src: string | null;
  fallbackSeed: string;
  source: string;
  className?: string;
  eager?: boolean;
}) {
  const cachedOg = !src ? ogCache.get(fallbackSeed) : undefined;
  const initialSrc = src ?? cachedOg ?? null;
  const [error, setError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(initialSrc);
  const [loading, setLoading] = useState(!initialSrc);

  useEffect(() => {
    setError(false);
    if (src) {
      setResolvedSrc(src);
      setLoading(false);
      return;
    }
    const cached = ogCache.get(fallbackSeed);
    if (cached !== undefined) {
      setResolvedSrc(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    fetchOg(fallbackSeed).then((img) => {
      if (!cancelled) {
        setResolvedSrc(img);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src, fallbackSeed]);

  const meta = sourceMeta(source);
  const showFallback = !resolvedSrc || error;

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${className ?? ""}`}
    >
      {showFallback ? (
        <div
          className={`h-full w-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}
        >
          <Newspaper className="h-8 w-8 text-white/70" strokeWidth={1.5} />
        </div>
      ) : (
        <>
          {loading && <div className="skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc!}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "low"}
            onError={() => setError(true)}
            onLoad={() => setLoading(false)}
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
          />
        </>
      )}
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="skeleton aspect-[16/9] w-full" />
      <div className="p-5">
        <div className="skeleton mb-3 h-5 w-24 rounded" />
        <div className="skeleton mb-2 h-6 w-full rounded" />
        <div className="skeleton h-6 w-3/4 rounded" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="skeleton aspect-[16/9] w-full" />
      <div className="p-4">
        <div className="skeleton mb-2 h-4 w-20 rounded" />
        <div className="skeleton mb-1.5 h-4 w-full rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const meta = sourceMeta(source);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <span className={meta.text}>{source}</span>
    </span>
  );
}

interface CategoryState {
  items: NewsItem[];
  loadedAt: Date | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: CategoryState = {
  items: [],
  loadedAt: null,
  loading: false,
  error: null,
};

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

export default function Home() {
  const [active, setActive] = useState<CategoryKey>("tech");
  const [byCategory, setByCategory] = useState<Record<CategoryKey, CategoryState>>({
    tech: { ...EMPTY_STATE },
    stock: { ...EMPTY_STATE },
    world: { ...EMPTY_STATE },
  });
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);

  const current = byCategory[active];
  const items = current.items;
  const loading = current.loading;
  const error = current.error;
  const lastUpdated = current.loadedAt;

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function load(cat: CategoryKey, force = false) {
    setByCategory((prev) => {
      const entry = prev[cat];
      if (
        !force &&
        entry.loadedAt &&
        Date.now() - entry.loadedAt.getTime() < CLIENT_CACHE_TTL_MS
      ) {
        return prev;
      }
      return { ...prev, [cat]: { ...entry, loading: true, error: null } };
    });

    const entry = byCategory[cat];
    if (
      !force &&
      entry.loadedAt &&
      Date.now() - entry.loadedAt.getTime() < CLIENT_CACHE_TTL_MS
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/news?category=${cat}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setByCategory((prev) => ({
        ...prev,
        [cat]: {
          items: data.items ?? [],
          loadedAt: new Date(),
          loading: false,
          error: null,
        },
      }));
    } catch (e) {
      setByCategory((prev) => ({
        ...prev,
        [cat]: {
          ...prev[cat],
          loading: false,
          error: (e as Error).message,
        },
      }));
    }
  }

  // Active category: load on first view
  useEffect(() => {
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Prefetch other categories after initial load
  useEffect(() => {
    const timer = window.setTimeout(() => {
      (Object.keys(byCategory) as CategoryKey[])
        .filter((k) => k !== active)
        .forEach((k) => load(k));
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.snippet.toLowerCase().includes(q) ||
        it.source.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Pagination: show batches, load more on scroll
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [active, query]);

  const filteredLenRef = useRef(filtered.length);
  filteredLenRef.current = filtered.length;

  // Plain scroll-distance check. Fire when the user is within 1.5
  // viewports of the document bottom. Works regardless of sentinel
  // element timing / re-mount order.
  useEffect(() => {
    const check = () => {
      if (filteredLenRef.current === 0) return;
      const { scrollY, innerHeight } = window;
      const docHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = docHeight - (scrollY + innerHeight);
      if (distanceFromBottom < innerHeight * 3) {
        setVisibleCount((v) => {
          if (v >= filteredLenRef.current) return v;
          return Math.min(v + PAGE_SIZE, filteredLenRef.current);
        });
      }
    };
    const rafId = requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [visibleCount, active]);

  const sentinelRef = useCallback(() => {}, []);

  const activeTab = TABS.find((t) => t.key === active)!;
  const ActiveIcon = activeTab.icon;
  const visible = filtered.slice(0, visibleCount);
  const [hero, ...rest] = visible;
  const featured = rest.slice(0, 2);
  const list = rest.slice(2);
  const hasMore = visibleCount < filtered.length;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-zinc-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
              <Newspaper className="h-4.5 w-4.5" strokeWidth={2} size={18} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold leading-none tracking-tight">
                Newsfeed
              </h1>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                繁中科技・股市・國際
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label="切換主題"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => load(active, true)}
              disabled={loading}
              aria-label="重新整理"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const isActive = active === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? `${t.accent} shadow-sm ring-4 ${t.ring}`
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋標題、摘要、來源…"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-10 text-[14px] outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-600 dark:focus:ring-white/5"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="清除搜尋"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-5 flex items-center justify-between text-[12px] text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <ActiveIcon size={13} strokeWidth={2} />
          {loading ? (
            "載入中…"
          ) : (
            <>
              {activeTab.label} · <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{filtered.length}</strong> 則
              {query && <span className="ml-1 text-zinc-400">(篩自 {items.length})</span>}
            </>
          )}
        </span>
        {lastUpdated && !loading && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {timeAgo(lastUpdated.toISOString())}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="font-semibold">載入失敗</div>
          <div className="mt-0.5 text-xs opacity-80">{error}</div>
        </div>
      )}

      {loading && items.length === 0 && (
        <>
          <SkeletonHero />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
          <Search className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
          <div className="text-sm text-zinc-500">沒有符合的新聞</div>
        </div>
      )}

      {/* Hero */}
      {hero && (
        <a
          href={hero.link}
          target="_blank"
          rel="noopener noreferrer"
          className="animate-fade-in group mb-8 block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="relative">
            <Thumbnail
              src={hero.image}
              fallbackSeed={hero.link}
              source={hero.source}
              className="aspect-[16/9] sm:aspect-[2.2/1]"
              eager
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-16 text-white sm:p-7 sm:pt-24">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-zinc-900">
                  <Sparkles size={11} strokeWidth={2.5} />
                  頭條
                </span>
                <span className="rounded-md bg-white/15 px-2 py-1 text-white backdrop-blur">
                  {hero.source}
                </span>
                {isHot(hero.pubDate) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-white">
                    <Flame size={11} strokeWidth={2.5} />
                    最新
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-white/70">
                  <Clock size={11} />
                  {timeAgo(hero.pubDate)}
                </span>
              </div>
              <h2 className="line-clamp-3 text-xl font-bold leading-tight tracking-tight sm:text-[26px] sm:leading-[1.2]">
                {hero.title}
              </h2>
              {hero.snippet && (
                <p className="mt-2.5 line-clamp-2 hidden text-[13px] leading-relaxed text-white/80 sm:block">
                  {hero.snippet}
                </p>
              )}
            </div>
          </div>
        </a>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {featured.map((it, i) => (
            <a
              key={`${it.link}-f${i}`}
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="animate-fade-in group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Thumbnail
                src={it.image}
                fallbackSeed={it.link}
                source={it.source}
                className="aspect-[16/9]"
              />
              <div className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SourceBadge source={it.source} />
                  {isHot(it.pubDate) && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      <Flame size={10} strokeWidth={2.5} />
                      最新
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400">· {timeAgo(it.pubDate)}</span>
                </div>
                <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.4] tracking-tight text-zinc-900 transition-colors group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300">
                  {it.title}
                </h3>
                {it.snippet && (
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {it.snippet}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Section divider */}
      {list.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-[13px] font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
            更多{activeTab.label}新聞
          </h2>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[11px] text-zinc-400">{list.length} 則</span>
        </div>
      )}

      {/* Compact list */}
      <ul className="space-y-2.5">
        {list.map((it, i) => (
          <li
            key={`${it.link}-${i}`}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
          >
            <a
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 sm:gap-4 sm:p-3.5"
            >
              <Thumbnail
                src={it.image}
                fallbackSeed={it.link}
                source={it.source}
                className="aspect-square h-[92px] w-[92px] shrink-0 rounded-lg sm:h-28 sm:w-28"
              />
              <div className="min-w-0 flex-1 py-0.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <SourceBadge source={it.source} />
                  {isHot(it.pubDate) && (
                    <Flame size={11} className="text-red-500" strokeWidth={2.5} />
                  )}
                  <span className="text-[11px] text-zinc-400">· {timeAgo(it.pubDate)}</span>
                </div>
                <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.4] tracking-tight text-zinc-900 transition-colors group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300 sm:text-[15px]">
                  {it.title}
                </h3>
                {it.snippet && (
                  <p className="mt-1 line-clamp-2 hidden text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400 sm:block">
                    {it.snippet}
                  </p>
                )}
              </div>
              <ArrowUpRight
                size={16}
                className="mt-1 shrink-0 text-zinc-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-700 dark:group-hover:text-zinc-300"
              />
            </a>
          </li>
        ))}
      </ul>

      {hasMore && (
        <>
          <div ref={sentinelRef} aria-hidden className="h-4" />
          <div className="mt-4 flex items-center justify-center py-2 text-[12px] text-zinc-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent dark:border-zinc-600 dark:border-t-transparent" />
            <span className="ml-2">載入更多…</span>
          </div>
        </>
      )}

      <footer className="mt-14 text-center text-[11px] text-zinc-400">
        各媒體 RSS 聚合 · 10 分鐘快取 · 點擊開新分頁閱讀
      </footer>
    </main>
  );
}
