import { describe, expect, it } from "vitest";
import {
  emptyData,
  ensureCurrentShape,
  ensureHistoricalLoanRepayments,
  ensurePersonalLoanSeed,
} from "./db";
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

describe("personal car loan seed", () => {
  it("adds the full loan plan, bank balance, and eleven historical payments", () => {
    const data = emptyData();

    expect(ensurePersonalLoanSeed(data)).toBe(true);
    expect(ensureHistoricalLoanRepayments(data)).toBe(true);

    expect(data.loans[0]).toMatchObject({
      initial: 343000,
      current: 271500,
      interestRemaining: 84500,
      interestFreeRemaining: 187000,
      externalFunds: 120000,
    });
    expect(data.bankRecords[0].closing).toBe(131512);
    expect(data.repayments).toHaveLength(11);
    expect(data.repayments.map((record) => record.amount)).toEqual(
      Array(11).fill(6500),
    );
    expect(
      data.repayments.reduce((sum, record) => sum + record.amount, 0),
    ).toBe(71500);
    expect(data.repayments.map((record) => record.month).sort()).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(ensurePersonalLoanSeed(data)).toBe(false);
  });
});
