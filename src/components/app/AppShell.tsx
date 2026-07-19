"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Archive, ChartNoAxesCombined, PanelLeftClose, PanelLeftOpen, PenLine } from "lucide-react";
import { ProfileMenu } from "@/components/app/ProfileMenu";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "c3-sidebar-collapsed-v2";
const SIDEBAR_PREFERENCE_EVENT = "c3-sidebar-preference-change";

function subscribeToSidebarPreference(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, listener);
  };
}

function getSidebarPreference() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== "false";
}

function getServerSidebarPreference() {
  return true;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    getServerSidebarPreference,
  );
  const pageTitle = pathname === "/drafts" ? "草稿箱" : pathname === "/create" ? "开始创作" : "首页";

  function toggleSidebar() {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!sidebarCollapsed));
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }

  return (
    <div className={cn("app-shell", sidebarCollapsed && "is-sidebar-collapsed")}>
      <aside id="app-sidebar" className="app-sidebar" aria-label="主导航">
        <Link href="/" className="app-brand" aria-label="C3-V3 首页">
          <span className="app-brand-mark" aria-hidden>
            <ChartNoAxesCombined className="h-5 w-5" />
          </span>
          <span className="app-brand-copy">
            <strong>C3 Studio</strong>
            <small>Financial AI Workspace</small>
          </span>
        </Link>

        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={toggleSidebar}
          aria-controls="app-sidebar"
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
          title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>

        <nav className="app-nav" aria-label="工作台导航">
          <Link href="/create" aria-label="开始创作" title="开始创作" className={cn("app-nav-item", pathname === "/create" && "is-active")}>
            <PenLine className="h-4 w-4" />
            <span>开始创作</span>
          </Link>

          <Link
            href="/drafts"
            aria-label="草稿箱"
            title="草稿箱"
            className={cn("app-nav-item", pathname === "/drafts" && "is-active")}
          >
            <Archive className="h-4 w-4" />
            <span>草稿箱</span>
          </Link>

        </nav>

        <div className="app-profile-zone">
          <ProfileMenu />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <span className="app-topbar-kicker">C3 / Workspace</span>
            <strong className="app-topbar-title">{pageTitle}</strong>
          </div>
          <div className="app-topbar-meta" aria-label="系统状态">
            <span className="app-market-status"><Activity className="h-3 w-3" /> 系统就绪</span>
            <span>KB 5.0</span>
            <span className="is-primary">C3 · V3</span>
          </div>
        </header>
        <main className={cn("app-content", pathname === "/" && "homepage-content")}>{children}</main>
      </div>
    </div>
  );
}
