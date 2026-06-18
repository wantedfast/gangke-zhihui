import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "岗课智评",
  description: "面向人工智能应用技术专业群的 AI 实训评分平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
