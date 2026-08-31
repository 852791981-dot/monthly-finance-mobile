import { describe, expect, it } from "vitest";
import { emptyData, ensureHistoricalLoanRepayments } from "./db";
import { monthRange, num, shiftMonth, summary, uid } from "./utils";
describe("month logic", () => {
  it("crosses year boundaries", () =>
    expect(shiftMonth("2027-01", -1)).toBe("2026-12"));
  it("accepts negative bank movements", () =>
    expect(num("-1250.55")).toBe(-1250.55));
  it("creates an inclusive month range for loan history", () =>
    expect(monthRange("2025-10", "2026-02")).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]));
  it("calculates the two-stage loan schedule from October 2025", () => {
    expect(shiftMonth("2025-10", 24)).toBe("2027-10");
    expect(shiftMonth("2025-10", 24 + 36)).toBe("2030-10");
  });
  it("fills the eleven historical car-loan payments without duplicates", () => {
    const d = emptyData(),
      loanId = uid();
    d.loans = [
      {
        id: loanId,
        name: "车贷",
        initial: 0,
        current: 271500,
        monthlyPlan: 0,
        startMonth: "2026-08",
        endMonth: "",
        note: "",
        interestRemaining: 84500,
        interestFreeRemaining: 187000,
      },
    ];
    expect(ensureHistoricalLoanRepayments(d)).toBe(true);
    expect(d.repayments).toHaveLength(11);
    expect(d.repayments[0].month).toBe("2025-10");
    expect(d.repayments[10].month).toBe("2026-08");
    expect(d.repayments.reduce((sum, x) => sum + x.amount, 0)).toBe(71500);
    expect(d.repayments[10].after).toBe(271500);
    expect(ensureHistoricalLoanRepayments(d)).toBe(false);
    expect(d.repayments).toHaveLength(11);
  });
  it("summarizes monthly figures", () => {
    const d = emptyData();
    d.expenses = [{ id: uid(), month: "2027-01", amount: 1000, note: "" }];
    d.fuelRecords = [{ id: uid(), month: "2027-01", amount: 300, note: "" }];
    expect(summary(d, "2027-01").total).toBe(1300);
  });
  it("adds every fuel entry in the selected month", () => {
    const d = emptyData();
    d.fuelRecords = [
      {
        id: uid(),
        month: "2027-08",
        date: "2027-08-03",
        amount: 260,
        note: "",
      },
      {
        id: uid(),
        month: "2027-08",
        date: "2027-08-19",
        amount: 320,
        note: "",
      },
    ];
    expect(summary(d, "2027-08").fuel).toBe(580);
  });
  it("carries latest saving balance", () => {
    const d = emptyData(),
      c = d.categories.find((x) => x.kind === "saving")!;
    d.savingRecords = [
      {
        id: uid(),
        month: "2027-01",
        channelId: c.id,
        opening: 0,
        added: 500,
        reduced: 0,
        closing: 500,
        manual: false,
        note: "",
      },
    ];
    expect(summary(d, "2027-02").saving).toBe(500);
  });
});
