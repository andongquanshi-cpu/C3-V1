import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { ThemeProvider } from "@/components/app/ThemeProvider";
import { APP_PREFERENCES_STORAGE_KEY } from "@/lib/storage";
import "./globals.css";

export const metadata: Metadata = {
  title: "C3-V3",
  description: "C3-V3 · AI 内容创作工作台",
};

const themeInitScript = `
try {
  const raw = localStorage.getItem(${JSON.stringify(APP_PREFERENCES_STORAGE_KEY)});
  const preferences = raw ? JSON.parse(raw) : {};
  const theme = preferences.theme === "night" ? "night" : "day";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
} catch (_) {
  document.documentElement.dataset.theme = "day";
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="day" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
