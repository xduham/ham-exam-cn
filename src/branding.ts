/* SPDX-License-Identifier: MPL-2.0 */

import config from "../branding/branding.json";

export type BrandingLink = {
  label: string;
  href: string;
};

export type Branding = {
  siteName: string;
  shortName: string;
  description: string;
  locale: string;
  logo: string;
  favicon: string;
  ogImage: string;
  themeColor: string;
  themeColorDark: string;
  primaryColor: string;
  primaryForeground: string;
  primaryColorDark: string;
  primaryForegroundDark: string;
  sourceUrl: string;
  footer: {
    copyright: string;
    links: BrandingLink[];
    notice: string;
  };
};

export const branding = config as Branding;

const base = import.meta.env.BASE_URL;

/** Resolve a repository-relative asset path against the deployment base. */
export function asset(pathname: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(pathname) || pathname.startsWith("data:")) {
    return pathname;
  }
  return `${base}${pathname.replace(/^\/+/, "")}`;
}

