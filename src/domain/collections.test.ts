/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import { makeQuestion } from "../test-helpers";
import {
  entryId,
  favoriteEntriesFor,
  toggleFavoriteEntry,
  withWrong,
  withoutFavorite,
  withoutWrong,
  wrongEntriesFor,
} from "./collections";

function question(key: string, number: string | null = key) {
  return makeQuestion({ key, number, options: [] });
}

describe("wrong book", () => {
  it("creates an entry and increments the count on repeat errors", () => {
    const first = withWrong({}, "A", question("A-0001", "MC2-0001"), 100);
    const second = withWrong(first, "A", question("A-0001", "MC2-0001"), 200);

    expect(Object.keys(first)).toEqual([entryId("A", "A-0001")]);
    expect(first["A:A-0001"]).toMatchObject({
      bank: "A",
      key: "A-0001",
      number: "MC2-0001",
      wrongCount: 1,
      lastWrongAt: 100,
    });
    expect(second["A:A-0001"].wrongCount).toBe(2);
    expect(second["A:A-0001"].lastWrongAt).toBe(200);
  });

  it("removes only the requested bank and keys", () => {
    const map = withWrong(
      withWrong({}, "A", question("A-0001"), 100),
      "B",
      question("A-0001"),
      100,
    );
    const next = withoutWrong(map, "A", ["A-0001"]);

    expect(next["A:A-0001"]).toBeUndefined();
    expect(next["B:A-0001"]).toBeDefined();
  });

  it("filters and sorts entries by most recent error", () => {
    const map = withWrong(
      withWrong(withWrong({}, "A", question("one"), 100), "A", question("two"), 300),
      "B",
      question("three"),
      200,
    );

    expect(wrongEntriesFor(map, "A").map((entry) => entry.key)).toEqual(["two", "one"]);
    expect(wrongEntriesFor(map, "A")).toHaveLength(2);
  });
});

describe("favorites", () => {
  it("toggles on and off", () => {
    const added = toggleFavoriteEntry({}, "A", question("A-0001"), 100);
    expect(added.favorited).toBe(true);
    expect(added.map["A:A-0001"].createdAt).toBe(100);

    const removed = toggleFavoriteEntry(added.map, "A", question("A-0001"), 200);
    expect(removed.favorited).toBe(false);
    expect(removed.map["A:A-0001"]).toBeUndefined();
  });

  it("removes by bank and lists newest first", () => {
    const map = toggleFavoriteEntry(
      toggleFavoriteEntry({}, "A", question("one"), 100).map,
      "A",
      question("two"),
      300,
    ).map;

    expect(favoriteEntriesFor(map, "A").map((entry) => entry.key)).toEqual(["two", "one"]);
    expect(withoutFavorite(map, "A", ["two"])["A:two"]).toBeUndefined();
  });
});
