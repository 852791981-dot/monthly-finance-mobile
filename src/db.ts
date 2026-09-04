import { openDB } from "idb";
import type { AppData, CategoryKind } from "./types";
import { currentMonth, monthRange, uid, shiftMonth } from "./utils";
const DB = "monthly-finance-db",
  KEY = "app";
const defaults: Record<CategoryKind, string[]> = {
  expense: ["日常支出"],
  important: [
    "人情往来",
    "礼金",
    "婚礼",
    "家庭支出",
    "大额购物",
    "旅游",
    "医疗",
    "其他重要事件",
  ],
  fuel: ["自费", "油卡", "现金", "公司报销"],
  saving: [
    "银行存款",
    "公积金余额",
    "父母给的钱",
    "彩礼",
    "公司攒的钱",
    "奖金",
    "现金",
    "理财",
    "其他",
  ],
  income: ["工资", "父母给的", "奖金", "副业收入", "其他收入"],
  bank: ["还款银行卡"],
  loan: ["车贷"],
};
export function emptyData(): AppData {
  const categories = Object.entries(defaults).flatMap(([kind, names]) =>
    names.map((name, order) => ({
      id: uid(),
      kind: kind as CategoryKind,
      name,
      active: true,
      order,
      includeInTotal: true,
    })),
  );
  return {
    version: 1,
    initialized: false,
    startMonth: currentMonth(),
    categories,
    loans: [],
    repayments: [],
    bankRecords: [],
    expenses: [],
    importantExpenses: [],
    fuelRecords: [],
    savingRecords: [],
    incomeRecords: [],
  };
}
async function store() {
  return openDB(DB, 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
}
export async function load() {
  const database = await store(),
    data =
      ((await database.get("state", KEY)) as AppData | undefined) ||
      emptyData();
  const shapeChanged = ensureCurrentShape(data),
    personalLoanSeeded = ensurePersonalLoanSeed(data),
    loanChanged = ensureHistoricalLoanRepayments(data);
  if (shapeChanged || personalLoanSeeded || loanChanged)
    await database.put("state", data, KEY);
  return data;
}
export async function save(data: AppData) {
  await (await store()).put("state", data, KEY);
}
export function ensureCurrentShape(data: AppData) {
  let changed = false;
  if (!Array.isArray(data.incomeRecords)) {
    data.incomeRecords = [];
    changed = true;
  }
  if (!data.categories.some((item) => item.kind === "income")) {
    defaults.income.forEach((name, order) =>
      data.categories.push({
        id: uid(),
        kind: "income",
        name,
        active: true,
        order,
        includeInTotal: true,
      }),
    );
    changed = true;
  }
  return changed;
}
export function ensurePersonalLoanSeed(data: AppData) {
  if (data.loans.length) return false;
  const loanId = uid();
  data.loans.push({
    id: loanId,
    name: "车贷",
    initial: 343000,
    current: 271500,
    monthlyPlan: 6500,
    startMonth: "2025-10",
    endMonth: "2030-10",
    note: "",
    externalFunds: 120000,
    interestRemaining: 84500,
    interestFreeRemaining: 187000,
    interestStartMonth: "2025-10",
    interestMonthlyPlan: 6500,
    interestTermMonths: 24,
    interestFreeMonthlyPlan: 5200,
    interestFreeTermMonths: 36,
  });
  const bank = data.categories
    .filter((item) => item.kind === "bank")
    .sort((a, b) => a.order - b.order)[0];
  if (bank && !data.bankRecords.some((record) => record.bankId === bank.id)) {
    data.bankRecords.push({
      id: uid(),
      bankId: bank.id,
      month: "2026-08",
      opening: 131512,
      deposit: 0,
      repayment: 0,
      closing: 131512,
      manual: true,
      note: "预置还款账户余额",
    });
  }
  data.initialized = true;
  if (!data.startMonth || data.startMonth > "2025-10")
    data.startMonth = "2025-10";
  return true;
}
export function ensureHistoricalLoanRepayments(data: AppData) {
  const loan = data.loans[0];
  if (
    !loan ||
    (loan.interestRemaining === undefined &&
      loan.interestFreeRemaining === undefined)
  )
    return false;
  let changed = false;
  const defaults = {
    interestStartMonth: "2025-10",
    interestMonthlyPlan: 6500,
    interestTermMonths: 24,
    interestFreeMonthlyPlan: 5200,
    interestFreeTermMonths: 36,
  } as const;
  for (const [key, value] of Object.entries(defaults)) {
    if (loan[key as keyof typeof defaults] === undefined) {
      (loan as unknown as Record<string, string | number>)[key] = value;
      changed = true;
    }
  }
  if (!loan.monthlyPlan) {
    loan.monthlyPlan = 6500;
    changed = true;
  }
  if (!loan.startMonth || loan.startMonth > "2025-10") {
    loan.startMonth = "2025-10";
    changed = true;
  }
  const months = monthRange("2025-10", "2026-08"),
    existingMonths = new Set(
      data.repayments
        .filter((record) => record.loanId === loan.id)
        .map((record) => record.month),
    ),
    augustRecord = data.repayments.find(
      (record) => record.loanId === loan.id && record.month === "2026-08",
    ),
    augustBalance = augustRecord?.after || loan.current;
  months.forEach((month, index) => {
    if (existingMonths.has(month)) return;
    const after = augustBalance + 6500 * (months.length - index - 1);
    data.repayments.push({
      id: uid(),
      loanId: loan.id,
      month,
      amount: 6500,
      before: after + 6500,
      after,
      paid: true,
      paidDate: "",
      note: "历史还款记录",
    });
    changed = true;
  });
  const paidTotal = data.repayments
      .filter((record) => record.loanId === loan.id && record.paid)
      .reduce((sum, record) => sum + record.amount, 0),
    remainingTotal =
      (loan.interestRemaining || 0) + (loan.interestFreeRemaining || 0),
    calculatedInitial = remainingTotal + paidTotal;
  if (calculatedInitial > 0 && loan.initial !== calculatedInitial) {
    loan.initial = calculatedInitial;
    changed = true;
  }
  return changed;
}
export function demoData() {
  const d = emptyData();
  d.initialized = true;
  const loanId = uid();
  d.loans = [
    {
      id: loanId,
      name: "车贷",
      initial: 180000,
      current: 126000,
      monthlyPlan: 4500,
      startMonth: shiftMonth(currentMonth(), -12),
      endMonth: shiftMonth(currentMonth(), 28),
      note: "",
    },
  ];
  for (let i = -5; i <= 0; i++) {
    const m = shiftMonth(currentMonth(), i);
    d.expenses.push({
      id: uid(),
      month: m,
      amount: 4200 + (i + 5) * 230,
      note: "",
    });
    d.fuelRecords.push({
      id: uid(),
      month: m,
      amount: 480 + (i + 5) * 25,
      times: 3,
      note: "",
    });
    const c = d.categories.find((x) => x.kind === "saving")!;
    d.savingRecords.push({
      id: uid(),
      month: m,
      channelId: c.id,
      opening: 50000 + (i + 5) * 3000,
      added: 3000,
      reduced: 0,
      closing: 53000 + (i + 5) * 3000,
      manual: false,
      note: "",
    });
  }
  return d;
}
