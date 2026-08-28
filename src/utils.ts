import type { AppData, Month } from "./types";
export const uid = () => crypto.randomUUID();
export const currentMonth = (): Month => new Date().toISOString().slice(0, 7);
export const money = (n = 0) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(
    n,
  );
export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return `${y}年${Number(mo)}月`;
};
export const shiftMonth = (m: string, d: number) => {
  const [y, mo] = m.split("-").map(Number);
  const x = new Date(y, mo - 1 + d, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
export const monthsBack = (m: string, n: number) =>
  Array.from({ length: n }, (_, i) => shiftMonth(m, i - n + 1));
export const num = (v: FormDataEntryValue | null) =>
  Math.round((Number(v) || 0) * 100) / 100;
export function summary(data: AppData, month: string) {
  const daily = data.expenses.find((x) => x.month === month)?.amount || 0;
  const important = data.importantExpenses
    .filter((x) => x.month === month)
    .reduce((s, x) => s + x.amount, 0);
  const fuel = data.fuelRecords
    .filter((x) => x.month === month)
    .reduce((sum, x) => sum + x.amount, 0);
  const repay = data.repayments
    .filter((x) => x.month === month && x.paid)
    .reduce((s, x) => s + x.amount, 0);
  const loan = data.loans.reduce((s, x) => s + x.current, 0);
  const latest = (r: { month: string; closing: number }[]) =>
    r
      .filter((x) => x.month <= month)
      .sort((a, b) => b.month.localeCompare(a.month))[0]?.closing || 0;
  const bank = data.categories
    .filter((x) => x.kind === "bank" && x.active)
    .reduce(
      (s, c) => s + latest(data.bankRecords.filter((x) => x.bankId === c.id)),
      0,
    );
  const saving = data.categories
    .filter((x) => x.kind === "saving" && x.includeInTotal !== false)
    .reduce(
      (s, c) =>
        s + latest(data.savingRecords.filter((x) => x.channelId === c.id)),
      0,
    );
  const added = data.savingRecords
    .filter((x) => x.month === month)
    .reduce((s, x) => s + x.added - x.reduced, 0);
  return {
    daily,
    important,
    fuel,
    repay,
    loan,
    bank,
    saving,
    added,
    total: daily + important + fuel,
  };
}
