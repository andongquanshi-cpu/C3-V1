"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useAppTheme } from "@/components/app/ThemeProvider";
import { cn } from "@/lib/utils";

export function ProfileMenu() {
  const { theme, setTheme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function showReservedNotice(message: string) {
    setNotice(message);
  }

  return (
    <div ref={rootRef} className="profile-menu-root">
      {open ? (
        <div id="profile-menu-panel" className="profile-menu-panel">
          <div className="profile-menu-heading">
            <span className="profile-avatar" aria-hidden>
              C
            </span>
            <span>
              <strong>访客用户</strong>
              <small>账号系统预留</small>
            </span>
          </div>

          <div className="profile-menu-section">
            <span className="profile-menu-label">外观模式</span>
            <div className="theme-options" aria-label="外观模式">
              <button
                type="button"
                onClick={() => setTheme("day")}
                className={cn("theme-option", theme === "day" && "is-active")}
                aria-pressed={theme === "day"}
              >
                <Sun className="h-4 w-4" />
                白天
              </button>
              <button
                type="button"
                onClick={() => setTheme("night")}
                className={cn("theme-option", theme === "night" && "is-active")}
                aria-pressed={theme === "night"}
              >
                <Moon className="h-4 w-4" />
                黑夜
              </button>
            </div>
          </div>

          <button
            type="button"
            className="profile-menu-row"
            onClick={() => showReservedNotice("设置中心将在账号系统接入后开放")}
          >
            <span className="profile-menu-row-copy">
              <Settings className="h-4 w-4" />
              设置
            </span>
            <small>预留</small>
          </button>

          <button
            type="button"
            className="profile-menu-row"
            onClick={() => showReservedNotice("退出登录接口已预留，当前仍为访客模式")}
          >
            <span className="profile-menu-row-copy">
              <LogOut className="h-4 w-4" />
              退出登录
            </span>
            <small>预留</small>
          </button>

          {notice ? <p className="profile-menu-notice" role="status">{notice}</p> : null}
        </div>
      ) : null}

      <div className="profile-zone-divider" aria-hidden />

      <button
        type="button"
        className="profile-trigger"
        onClick={() => {
          setOpen((current) => !current);
          setNotice("");
        }}
        aria-expanded={open}
        aria-controls="profile-menu-panel"
        aria-label={open ? "关闭个人菜单" : "打开个人菜单"}
      >
        <span className="profile-avatar" aria-hidden>
          C
        </span>
        <span className="profile-trigger-copy">
          <strong>访客用户</strong>
          <small>个人空间</small>
        </span>
        <ChevronUp className={cn("profile-trigger-chevron h-4 w-4", open && "is-open")} />
      </button>
    </div>
  );
}
