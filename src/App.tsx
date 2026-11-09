/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useState } from "react";
import { asset, branding } from "./branding";
import { Exam } from "./components/Exam";
import { Favorites } from "./components/Favorites";
import { Home } from "./components/Home";
import { Practice } from "./components/Practice";
import { Stats } from "./components/Stats";
import { WrongBook } from "./components/WrongBook";
import { useTheme } from "./hooks/useTheme";
import { loadBankChoice, saveBankChoice } from "./storage";
import type { Bank, PracticeKind } from "./types";

/** Route state machine: exactly one screen, and practice always has a kind. */
type Route =
  | { name: "home" }
  | { name: "practice"; kind: PracticeKind }
  | { name: "exam" }
  | { name: "wrong" }
  | { name: "favorites" }
  | { name: "stats" };

const VIEW_TITLES: Record<Route["name"], string> = {
  home: "",
  practice: "练习",
  exam: "模拟考试",
  wrong: "错题本",
  favorites: "收藏",
  stats: "统计",
};

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [bank, setBank] = useState<Bank>(() => loadBankChoice());
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    saveBankChoice(bank);
  }, [bank]);

  useEffect(() => {
    const title = VIEW_TITLES[route.name];
    document.title = title ? `${title} · ${branding.shortName}` : branding.siteName;
    window.scrollTo({ top: 0 });
  }, [route.name]);

  function startPractice(kind: PracticeKind): void {
    setRoute({ name: "practice", kind });
  }

  const home = (): void => setRoute({ name: "home" });

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
            {route.name === "home" ? (
              <span className="badge badge-muted">本地练习</span>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={home}>
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
          {route.name === "home" ? (
            <Home
              bank={bank}
              onBankChange={setBank}
              onPractice={startPractice}
              onExam={() => setRoute({ name: "exam" })}
              onWrong={() => setRoute({ name: "wrong" })}
              onFavorites={() => setRoute({ name: "favorites" })}
              onStats={() => setRoute({ name: "stats" })}
            />
          ) : null}

          {route.name === "practice" ? (
            <Practice bank={bank} kind={route.kind} onExit={home} />
          ) : null}

          {route.name === "exam" ? (
            <Exam bank={bank} onExit={home} onOpenWrong={() => setRoute({ name: "wrong" })} />
          ) : null}

          {route.name === "wrong" ? (
            <WrongBook
              bank={bank}
              onPractice={() => startPractice("wrong")}
              onExit={home}
            />
          ) : null}

          {route.name === "favorites" ? (
            <Favorites
              bank={bank}
              onPractice={() => startPractice("favorite")}
              onExit={home}
            />
          ) : null}

          {route.name === "stats" ? <Stats onExit={home} /> : null}
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
