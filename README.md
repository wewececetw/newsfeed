# Newsfeed

繁體中文新聞聚合 · 科技 / 股市 / 國際

以 Next.js 16 + Lucide Icons 打造的 RSS 聚合閱讀器，參考 Apple News / Google News 版面，支援圖文卡片、頭條主打、深色模式、關鍵字搜尋。

## 功能

- **三分類切換**：科技 / 股市 / 國際
- **圖文卡片**：RSS 內建圖優先，無圖時自動抓取 `og:image` fallback
- **頭條區**：大圖 + 漸層遮罩 + 最新標記
- **雙欄精選 + 縮圖列表**
- **深色模式**：跟隨系統或手動切換（localStorage 記憶）
- **即時搜尋**：標題、摘要、來源
- **10 分鐘快取**：減少 RSS 重複請求
- **12 個繁中新聞來源**

## 新聞來源

| 分類 | 來源 |
|------|------|
| 科技 | iThome、INSIDE、TechNews 科技新報、科技報橘 |
| 股市 | 經濟日報（財經要聞、產業情報）、中央社財經、Google 新聞台股 |
| 國際 | 中央社國際、BBC 中文、自由時報國際、德國之聲中文 |

## 技術棧

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS 3**
- **Lucide React** — icons
- **rss-parser** — RSS 解析

## 本地開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3939

## 架構

```
src/
├── app/
│   ├── api/
│   │   ├── news/route.ts    # RSS 聚合 API
│   │   └── og/route.ts      # og:image fallback API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx             # 主頁面
└── lib/
    └── feeds.ts             # RSS 來源設定
```

## 授權

MIT
