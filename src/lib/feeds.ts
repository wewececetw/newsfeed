export type CategoryKey = "tech" | "stock" | "world";

export interface Feed {
  name: string;
  url: string;
}

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; feeds: Feed[] }
> = {
  tech: {
    label: "科技",
    feeds: [
      { name: "iThome", url: "https://www.ithome.com.tw/rss" },
      { name: "INSIDE", url: "https://www.inside.com.tw/feed/rss" },
      { name: "TechNews 科技新報", url: "https://technews.tw/feed/" },
      { name: "科技報橘", url: "https://buzzorange.com/techorange/feed/" },
    ],
  },
  stock: {
    label: "股市",
    feeds: [
      { name: "經濟日報 財經要聞", url: "https://money.udn.com/rssfeed/news/1001/5588?ch=money" },
      { name: "經濟日報 產業情報", url: "https://money.udn.com/rssfeed/news/1001/5591?ch=money" },
      { name: "中央社 財經", url: "https://feeds.feedburner.com/rsscna/finance" },
      { name: "Google 新聞 台股", url: "https://news.google.com/rss/search?q=%E5%8F%B0%E8%82%A1+OR+%E8%82%A1%E5%B8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant" },
    ],
  },
  world: {
    label: "國際",
    feeds: [
      { name: "中央社 國際", url: "https://feeds.feedburner.com/rsscna/intworld" },
      { name: "BBC 中文", url: "https://feeds.bbci.co.uk/zhongwen/trad/rss.xml" },
      { name: "自由時報 國際", url: "https://news.ltn.com.tw/rss/world.xml" },
      { name: "德國之聲 中文", url: "https://rss.dw.com/xml/rss-chi-all" },
    ],
  },
};
