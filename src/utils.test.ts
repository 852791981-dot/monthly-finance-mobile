import { describe, expect, it } from "vitest";
import { emptyData } from "./db";
import { shiftMonth, summary, uid } from "./utils";
describe("month logic", () => {
  it("crosses year boundaries", () =>
    expect(shiftMonth("2027-01", -1)).toBe("2026-12"));
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
