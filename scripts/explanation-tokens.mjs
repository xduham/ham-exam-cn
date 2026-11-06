// SPDX-License-Identifier: MPL-2.0

// Convert option references in AI explanations into {{id}} tokens.
//
// The data source explains options with letters A-D. The app shuffles the
// options for display, so the letters in explanations must not be treated as
// display labels. We tokenize only real option references; technical uses such
// as "A类", "D层", "D触发器", "字母B", "罗兰C" and "A+B" stay as plain text.

const LETTERS = "ABCD";
const TECHNICAL_SUFFIXES = ["类", "层", "表", "端", "触发器", "级", "型", "指数"];
const TECHNICAL_SUFFIX_RE = new RegExp(
  `^[A-D][ \\t]*(?:${TECHNICAL_SUFFIXES.join("|")})`,
);
const CLASS_LIST_SUFFIX_RE = /^[ \t]*(?:[一二三四几]类|类|等级)/;
const TECHNICAL_PREFIX_RE =
  /(?:字母|罗兰|首位|次位|末位|符号|小天线|电容量|[RL][ \t]*[与和]|[A-Za-z]-|\d[ \t]+)[ \t]*$/;
const ELECTRODE_LABEL_RE =
  /(?:源极|栅极|漏极|基极|集电极|发射极|阴极|阳极|屏极|板极|门极|电极)[ \t]*$/;
const ORDER_PHRASE_RE = /(?:由[^。；，]{0,10}|排列|顺序|排序)[ \t]*为[ \t]*$/;
const ASSIGNMENT_CHARS = "=＋+";

function letterId(letter) {
  return letter.charCodeAt(0) - 64;
}

function token(letters) {
  return `{{${[...letters].map(letterId).join(",")}}}`;
}

/**
 * Letters that belong to the question's own content (device A, part B, ...),
 * not to option labels. Only the two shapes present in the dataset are
 * handled; new data can add a pattern here and review the token report.
 */
export function protectedLettersForQuestion(question) {
  const text = question || "";
  if (/图中部件[ \t]*A[、,，][ \t]*B[、,，][ \t]*C[、,，][ \t]*D/.test(text)) {
    return new Set(["A", "B", "C", "D"]);
  }
  if (/A[、,，][ \t]*B[ \t]*(?:两个)?设备/.test(text)) {
    return new Set(["A", "B"]);
  }
  if (/接收机[ \t]*A/.test(text) && /接收机[ \t]*B/.test(text)) {
    return new Set(["A", "B"]);
  }
  if (/电离层/.test(text) && /(?:高度|密度)/.test(text) && /排列/.test(text)) {
    return new Set(["D"]);
  }
  return new Set();
}

export function tokenizeExplanation(text, optionCount = 4, protectedLetters = new Set()) {
  if (!text) return text;

  const valid = (letter) => LETTERS.includes(letter) && letterId(letter) <= optionCount;
  const usable = (letter) => valid(letter) && !protectedLetters.has(letter);
  let out = "";
  let i = 0;

  while (i < text.length) {
    const rest = text.slice(i);
    const before = text.slice(0, i);
    const char = rest[0];
    const prev = i > 0 ? text[i - 1] : "";
    const next = i + 1 < text.length ? text[i + 1] : "";

    // A parenthesized answer sequence such as （AC） or (ABCD).
    let match = /^[（(]([A-D]{1,4})[）)]/.exec(rest);
    if (match && [...match[1]].every(valid)) {
      // Electrode symbols such as 漏极（D）are content, not option labels.
      if (ELECTRODE_LABEL_RE.test(before)) {
        out += match[0];
      } else {
        out += rest[0] + token(match[1]) + rest[match[0].length - 1];
      }
      i += match[0].length;
      continue;
    }

    // Answer markers: 答案 A / 故选 BCD / 答案为 AB.
    match = /^(正确答案|答案|故选|选|为)([ \t：:]*)([A-D]{1,4})(?![A-Za-z0-9])/.exec(rest);
    if (match) {
      const sequence = match[3];
      const after = rest.slice(match[0].length);
      const protectedAfter =
        CLASS_LIST_SUFFIX_RE.test(after) ||
        /^[ \t]*(?:层|表|端|触发器|级|型|指数|为其)/.test(after);
      const listContinuation = /^[ \t]*[、/]/.test(after);
      const assignment = /^[ \t]*[=＋+]/.test(after);
      const touchesProtected = [...sequence].some((letter) => protectedLetters.has(letter));
      if (
        [...sequence].every(valid) &&
        !protectedAfter &&
        !listContinuation &&
        !assignment &&
        !touchesProtected
      ) {
        out += match[1] + match[2] + token(sequence);
        i += match[0].length;
        continue;
      }
    }

    // A contiguous answer such as ABCD 全选.
    match = /^([A-D]{2,4})([ \t]*全选)/.exec(rest);
    if (match && [...match[1]].every(valid)) {
      out += token(match[1]) + match[2];
      i += match[0].length;
      continue;
    }

    // Lists such as B、C、D or B/C/D.
    match = /^([A-D](?:[ \t]*[、/][ \t]*[A-D])+)/.exec(rest);
    if (match) {
      // A list that starts inside a word (for example the A in BA) is not a
      // list of option labels.
      if (/[A-Za-z0-9]/.test(prev)) {
        out += char;
        i += 1;
        continue;
      }
      const list = match[1];
      const afterList = rest.slice(list.length);
      const classSuffix = CLASS_LIST_SUFFIX_RE.test(afterList);
      const orderPhrase = ORDER_PHRASE_RE.test(before);
      const resonance = /^[ \t]*谐振/.test(afterList);
      const innerOuter = /(?:内侧|外侧)[ \t]*$/.test(before);
      const embeddedBefore = /[A-Za-z][ \t]*[、/][ \t]*$/.test(before);
      const embeddedAfter = /^[ \t]*[、/][ \t]*[A-Za-z]/.test(afterList);
      const adjacentLetter = /^[A-Za-z]/.test(afterList);
      const allUsable = [...list].filter((item) => /[A-D]/.test(item)).every(usable);

      if (
        classSuffix ||
        orderPhrase ||
        resonance ||
        innerOuter ||
        embeddedBefore ||
        embeddedAfter ||
        adjacentLetter ||
        !allUsable
      ) {
        out += list;
        i += list.length;
        continue;
      }

      out += list.replace(/[A-D]/g, (letter) => (usable(letter) ? `{{${letterId(letter)}}}` : letter));
      i += list.length;
      continue;
    }

    // Technical labels such as A类 / D层 / D触发器 / A指数.
    match = TECHNICAL_SUFFIX_RE.exec(rest);
    if (match) {
      out += match[0];
      i += match[0].length;
      continue;
    }

    // Variable names and antenna segments: 波特率 B / B为波特率 /
    // B 的换算 / A为其1/4波长.
    if (
      /[A-D]/.test(char) &&
      /^[A-D][ \t]*(?:为(?:波特率|峰值频偏|最高调制频率|修正系数|其)|的换算)/.test(rest)
    ) {
      out += char;
      i += 1;
      continue;
    }
    if (/[A-D]/.test(char) && /波特率[ \t]*$/.test(before)) {
      out += char;
      i += 1;
      continue;
    }

    // Technical prefixes such as 字母B / 罗兰C / 首位A.
    if (/[A-D]/.test(char) && TECHNICAL_PREFIX_RE.test(before)) {
      out += char;
      i += 1;
      continue;
    }

    // Hyphenated terms such as D-STAR.
    if (/[A-D]/.test(char) && /^[A-D]-[A-Za-z]/.test(rest)) {
      out += char;
      i += 1;
      continue;
    }

    // Assignment and sum contexts: B=Bravo / Q=D / A+B.
    if (/[A-D]/.test(char) && (ASSIGNMENT_CHARS.includes(prev) || ASSIGNMENT_CHARS.includes(next))) {
      out += char;
      i += 1;
      continue;
    }

    // A label owned by the question stem (device A, part B, ...).
    if (/[A-D]/.test(char) && protectedLetters.has(char)) {
      out += char;
      i += 1;
      continue;
    }

    // A content letter after an option letter, such as the callsign A in "D的A".
    if (/[A-D]/.test(char) && /[A-D]的$/.test(before)) {
      out += char;
      i += 1;
      continue;
    }

    // A standalone option letter, not part of an English word or number.
    if (
      /[A-D]/.test(char) &&
      !/[A-Za-z0-9]/.test(prev) &&
      !/[A-Za-z0-9]/.test(next) &&
      usable(char)
    ) {
      out += `{{${letterId(char)}}}`;
      i += 1;
      continue;
    }

    out += char;
    i += 1;
  }

  return out;
}
