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

export default function App() {
  const [view, setView] = useState<View>("home");
  const [bank, setBank] = useState<Bank>(() => loadBankChoice());
  const [practiceKind, setPracticeKind] = useState<PracticeKind>("sequential");

  useEffect(() => {
    saveBankChoice(bank);
  }, [bank]);

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
