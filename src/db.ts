import { openDB } from "idb";
import type { AppData, CategoryKind } from "./types";
import { currentMonth, uid, shiftMonth } from "./utils";
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
  return (
    ((await (await store()).get("state", KEY)) as AppData | undefined) ||
    emptyData()
  );
}
export async function save(data: AppData) {
  await (await store()).put("state", data, KEY);
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
