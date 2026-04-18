import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新聞聚合 · Tech / Stock / World",
  description: "繁體中文科技、股市、國際情勢新聞聚合",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="text-neutral-900 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
