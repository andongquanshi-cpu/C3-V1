import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C3-V0 Copilot AI 工作台",
  description: "第三项目组 Copilot AI 内容工作台最小可用基底",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
