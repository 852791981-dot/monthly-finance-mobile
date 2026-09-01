import { describe, expect, it } from "vitest";
import { emptyData, ensureCurrentShape } from "./db";
import type { AppData } from "./types";

describe("income data migration", () => {
  it("adds income records and default sources to an old local ledger", () => {
    const legacy = emptyData() as Partial<AppData>;
    delete legacy.incomeRecords;
    legacy.categories = legacy.categories?.filter(
      (item) => item.kind !== "income",
    );

    expect(ensureCurrentShape(legacy as AppData)).toBe(true);
    expect(legacy.incomeRecords).toEqual([]);
    expect(
      legacy.categories
        ?.filter((item) => item.kind === "income")
        .map((x) => x.name),
    ).toEqual(["工资", "父母给的", "奖金", "副业收入", "其他收入"]);
    expect(ensureCurrentShape(legacy as AppData)).toBe(false);
  });
});
