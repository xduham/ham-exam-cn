// SPDX-License-Identifier: MPL-2.0

// Build public/questions/{A,B,C}.json from the WTFPL dataset in data/.
// Keys are assigned here, once, and persisted in data/key-map.json.
// The frontend only ever reads question.key; it never derives keys.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { protectedLettersForQuestion, tokenizeExplanation } from "./explanation-tokens.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const outDir = path.join(root, "public", "questions");
const outImageDir = path.join(outDir, "images");
const keyMapPath = path.join(dataDir, "key-map.json");

const BANKS = ["A", "B", "C"];
const CSV_FILES = { A: "class_a.csv", B: "class_b.csv", C: "class_c.csv" };
const OPTION_LETTERS = ["A", "B", "C", "D"];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function headerIndex(header) {
  const map = {};
  header.forEach((h, i) => {
    map[h.replace(/^﻿/, "").trim()] = i;
  });
  return map;
}

function sanitizeOptionText(value) {
  return (value || "").replace(/\s*\[F\][^\s,]+\.jpg\d*/gi, "").trim();
}

function fingerprint(parts) {
  return createHash("sha1").update(parts.join("\u0000"), "utf8").digest("hex").slice(0, 16);
}

function loadKeyMap() {
  if (!existsSync(keyMapPath)) {
    return Object.fromEntries(BANKS.map((bank) => [bank, { next: 1, map: {} }]));
  }
  const parsed = JSON.parse(readFileSync(keyMapPath, "utf8"));
  for (const bank of BANKS) {
    if (!parsed[bank]) parsed[bank] = { next: 1, map: {} };
    if (!parsed[bank].map) parsed[bank].map = {};
    if (!Number.isFinite(parsed[bank].next) || parsed[bank].next < 1) parsed[bank].next = 1;
  }
  return parsed;
}

function nextKey(state, bank) {
  const key = `${bank}-${String(state.next).padStart(4, "0")}`;
  state.next += 1;
  return key;
}

function main() {
  mkdirSync(outImageDir, { recursive: true });

  const ai = JSON.parse(readFileSync(path.join(dataDir, "ai_explanations.json"), "utf8"));
  const keyMap = loadKeyMap();
  const usedImages = new Set();
  const summary = [];
  const errors = [];

  for (const bank of BANKS) {
    const csv = readFileSync(path.join(dataDir, CSV_FILES[bank]), "utf8");
    const rows = parseCsv(csv);
    const header = rows.shift() || [];
    const idx = headerIndex(header);
    const state = keyMap[bank];
    const seenIdentities = new Map();
    const out = [];

    for (const row of rows) {
      const jraw = (row[idx["J"]] || "").trim();
      const p = (row[idx["P"]] || "").trim();
      const i = (row[idx["I"]] || "").trim();
      const q = (row[idx["Q"]] || "").trim();
      if (!q) continue;

      const options = [];
      const sourceOptions = [];
      for (let index = 0; index < OPTION_LETTERS.length; index += 1) {
        const text = sanitizeOptionText(row[idx[OPTION_LETTERS[index]]] || "");
        if (text) {
          sourceOptions.push({ key: OPTION_LETTERS[index], text });
          options.push({ key: index + 1, text });
        }
      }

      const answerKeys = [
        ...new Set(
          (row[idx["T"]] || "")
            .toUpperCase()
            .split("")
            .filter((ch) => ch >= "A" && ch <= "Z")
            .map((ch) => ch.charCodeAt(0) - 64),
        ),
      ].sort((left, right) => left - right);

      if (answerKeys.length === 0) {
        errors.push(`${bank}: missing answer for ${jraw || i || q.slice(0, 20)}`);
        continue;
      }
      for (const key of answerKeys) {
        if (!options.some((o) => o.key === key)) {
          errors.push(`${bank}: answer ${key} not in options for ${jraw || i || q.slice(0, 20)}`);
        }
      }

      const primaryJ = jraw.includes(",") ? jraw.split(",")[0].trim() : jraw;
      const imagePath = primaryJ ? path.join(dataDir, "images", `${primaryJ}.jpg`) : "";
      let imageUrl = null;
      if (imagePath && existsSync(imagePath)) {
        const fileName = `${primaryJ}.jpg`;
        copyFileSync(imagePath, path.join(outImageDir, fileName));
        imageUrl = `images/${fileName}`;
        usedImages.add(fileName);
      }

      const aiEntry = i ? ai[i] : null;
      const explanationRaw = (aiEntry?.explanation || "").trim() || undefined;
      const explanation = explanationRaw
        ? tokenizeExplanation(explanationRaw, options.length, protectedLettersForQuestion(q))
        : undefined;
      const mnemonic = (aiEntry?.mnemonic || "").trim() || undefined;

      if (explanation) {
        const optionKeys = new Set(options.map((option) => option.key));
        for (const match of explanation.matchAll(/\{\{([\d,]+)\}\}/g)) {
          for (const id of match[1].split(",").map(Number)) {
            if (!optionKeys.has(id)) {
              errors.push(`${bank}: explanation token ${id} not in options for ${jraw || i || q.slice(0, 20)}`);
            }
          }
        }
      }

      // Identity is the first J code, or a content hash when J is absent.
      // Duplicate J codes in the same bank get a content-hash suffix.
      // Hash source option letters, not the numeric keys, so keys stay stable.
      const contentHash = fingerprint([q, ...sourceOptions.map((o) => `${o.key}:${o.text}`)]);
      let identity = primaryJ || `hash:${contentHash}`;
      if (seenIdentities.has(identity)) {
        identity = `${identity}|${contentHash}`;
      }
      seenIdentities.set(identity, true);

      let key = state.map[identity];
      if (!key) {
        key = nextKey(state, bank);
        state.map[identity] = key;
      }

      out.push({
        key,
        number: primaryJ || null,
        code: i || null,
        question: q,
        options,
        answer_keys: answerKeys,
        type: answerKeys.length <= 1 ? "single" : "multiple",
        imageUrl,
        explanation,
        mnemonic,
      });
    }

    const keys = new Set();
    for (const question of out) {
      if (keys.has(question.key)) errors.push(`${bank}: duplicate key ${question.key}`);
      keys.add(question.key);
    }

    writeFileSync(path.join(outDir, `${bank}.json`), `${JSON.stringify(out)}\n`, "utf8");
    summary.push({
      bank,
      total: out.length,
      single: out.filter((q) => q.type === "single").length,
      multiple: out.filter((q) => q.type === "multiple").length,
      explained: out.filter((q) => q.explanation).length,
      mnemonics: out.filter((q) => q.mnemonic).length,
      images: out.filter((q) => q.imageUrl).length,
      nextKey: state.next,
    });
  }

  // Remove stale images that are no longer referenced.
  for (const fileName of readdirSync(outImageDir)) {
    if (!usedImages.has(fileName)) unlinkSync(path.join(outImageDir, fileName));
  }

  writeFileSync(keyMapPath, `${JSON.stringify(keyMap, null, 2)}\n`, "utf8");

  console.table(summary);
  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s):`);
    for (const error of errors.slice(0, 20)) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`\nWrote ${summary.reduce((sum, item) => sum + item.total, 0)} questions.`);
}

main();
