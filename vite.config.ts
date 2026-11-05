// SPDX-License-Identifier: MPL-2.0

import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import branding from "./branding/branding.json" with { type: "json" };

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function copyBrandingAssets(): Plugin {
  return {
    name: "copy-branding-assets",
    buildStart() {
      const source = path.join(rootDir, "branding");
      const target = path.join(rootDir, "public", "branding");
      mkdirSync(target, { recursive: true });
      for (const file of readdirSync(source)) {
        if (/\.(svg|png|jpe?g|webp|ico)$/i.test(file)) {
          copyFileSync(path.join(source, file), path.join(target, file));
        }
      }
    },
  };
}

function setToken(html: string, token: string, value: string): string {
  return html.split(token).join(value);
}

function brandingHtml(base: string, siteUrl: string): Plugin {
  return {
    name: "branding-html",
    transformIndexHtml(html) {
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;
      const assetPath = (value: string) => `${normalizedBase}${value.replace(/^\/+/, "")}`;
      const absolute = (value: string) => {
        const pathname = assetPath(value);
        return siteUrl ? `${siteUrl.replace(/\/$/, "")}${pathname}` : pathname;
      };

      let result = html;
      result = setToken(result, "%LANG%", branding.locale);
      result = setToken(result, "%SITE_NAME%", branding.siteName);
      result = setToken(result, "%SHORT_NAME%", branding.shortName);
      result = setToken(result, "%SITE_DESCRIPTION%", branding.description);
      result = setToken(result, "%THEME_COLOR%", branding.themeColor);
      result = setToken(result, "%THEME_COLOR_DARK%", branding.themeColorDark);
      result = setToken(result, "%PRIMARY%", branding.primaryColor);
      result = setToken(result, "%PRIMARY_FG%", branding.primaryForeground);
      result = setToken(result, "%PRIMARY_DARK%", branding.primaryColorDark);
      result = setToken(result, "%PRIMARY_FG_DARK%", branding.primaryForegroundDark);
      result = setToken(result, "%ACCENT%", branding.accentColor);
      result = setToken(result, "%ACCENT_DARK%", branding.accentColorDark);
      result = setToken(result, "%NAV%", branding.navColor);
      result = setToken(result, "%NAV_DARK%", branding.navColorDark);
      result = setToken(result, "%NAV_FG%", branding.navForeground);
      result = setToken(result, "%NAV_FG_DARK%", branding.navForegroundDark);
      result = setToken(result, "%BASE%", normalizedBase);
      result = setToken(result, "%FAVICON%", assetPath(branding.favicon));
      result = setToken(result, "%LOGO%", assetPath(branding.logo));
      result = setToken(result, "%OG_IMAGE_URL%", absolute(branding.ogImage));
      result = setToken(result, "%SITE_URL%", siteUrl);
      return result;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const base = env.VITE_BASE_PATH || "/";
  const siteUrl = env.VITE_SITE_URL || "";

  return {
    base,
    plugins: [react(), copyBrandingAssets(), brandingHtml(base, siteUrl)],
    server: {
      host: true,
      port: 3000,
    },
    build: {
      outDir: "dist",
    },
  };
});
