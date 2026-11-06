/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useState } from "react";
import { asset, branding } from "./branding";
import { Exam } from "./components/Exam";
import { Favorites } from "./components/Favorites";
import { Home } from "./components/Home";
import { Practice } from "./components/Practice";
import { Stats } from "./components/Stats";
import { WrongBook } from "./components/WrongBook";
import { loadBankChoice, saveBankChoice } from "./storage";
import type { Bank, PracticeKind, View } from "./types";

const VIEW_TITLES: Record<View, string> = {
  home: "",
  practice: "练习",
  exam: "模拟考试",
  wrong: "错题本",
  favorites: "收藏",
  stats: "统计",
};

type Theme = "light" | "dark";
const THEME_KEY = "ham-exam-cn:theme";

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [bank, setBank] = useState<Bank>(() => loadBankChoice());
  const [practiceKind, setPracticeKind] = useState<PracticeKind>("sequential");
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    saveBankChoice(bank);
  }, [bank]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? branding.themeColorDark : branding.themeColor);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (storedTheme()) return;
      setTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function toggleTheme(): void {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be unavailable; the theme still applies for this session.
    }
  }

  useEffect(() => {
    const title = VIEW_TITLES[view];
    document.title = title ? `${title} · ${branding.shortName}` : branding.siteName;
    window.scrollTo({ top: 0 });
  }, [view]);

  function startPractice(kind: PracticeKind): void {
    setPracticeKind(kind);
    setView("practice");
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>

      <header className="site-header">
        <div className="container site-header-inner">
          <div className="brand">
            <img className="brand-logo" src={asset(branding.logo)} alt="" width={36} height={36} />
            <div className="brand-text">
              <span className="brand-name">{branding.siteName}</span>
              <span className="brand-short">{branding.shortName}</span>
            </div>
          </div>
          <div className="header-actions">
            {view === "home" ? (
              <span className="badge badge-muted">本地练习</span>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setView("home")}>
                首页
              </button>
            )}
            <button
              type="button"
              className="btn btn-icon btn-ghost theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "切换到浅色外观" : "切换到深色外观"}
              title={theme === "dark" ? "切换到浅色外观" : "切换到深色外观"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="site-main" id="main">
        <div className="container">
          {view === "home" ? (
            <Home
              bank={bank}
              onBankChange={setBank}
              onPractice={startPractice}
              onExam={() => setView("exam")}
              onWrong={() => setView("wrong")}
              onFavorites={() => setView("favorites")}
              onStats={() => setView("stats")}
            />
          ) : null}

          {view === "practice" ? (
            <Practice bank={bank} kind={practiceKind} onExit={() => setView("home")} />
          ) : null}

          {view === "exam" ? (
            <Exam
              bank={bank}
              onExit={() => setView("home")}
              onOpenWrong={() => setView("wrong")}
            />
          ) : null}

          {view === "wrong" ? (
            <WrongBook
              bank={bank}
              onPractice={() => startPractice("wrong")}
              onExit={() => setView("home")}
            />
          ) : null}

          {view === "favorites" ? (
            <Favorites
              bank={bank}
              onPractice={() => startPractice("favorite")}
              onExit={() => setView("home")}
            />
          ) : null}

          {view === "stats" ? <Stats onExit={() => setView("home")} /> : null}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p className="footer-copy">{branding.footer.copyright}</p>
          <nav className="footer-links" aria-label="页脚链接">
            {branding.footer.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
            {branding.sourceUrl ? (
              <a href={branding.sourceUrl} target="_blank" rel="noreferrer">
                源代码
              </a>
            ) : null}
          </nav>
          <p className="footer-notice">{branding.footer.notice}</p>
        </div>
      </footer>
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
