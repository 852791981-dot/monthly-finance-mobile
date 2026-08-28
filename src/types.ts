export type Month = string;
export type CategoryKind =
  "expense" | "important" | "fuel" | "saving" | "bank" | "loan";
export interface Category {
  id: string;
  kind: CategoryKind;
  name: string;
  active: boolean;
  order: number;
  note?: string;
  includeInTotal?: boolean;
}
export interface Loan {
  id: string;
  name: string;
  initial: number;
  current: number;
  monthlyPlan: number;
  startMonth: string;
  endMonth: string;
  note: string;
}
export interface Repayment {
  id: string;
  loanId: string;
  month: Month;
  amount: number;
  before: number;
  after: number;
  paid: boolean;
  paidDate?: string;
  note: string;
}
export interface BankRecord {
  id: string;
  bankId: string;
  month: Month;
  opening: number;
  deposit: number;
  repayment: number;
  closing: number;
  manual: boolean;
  note: string;
}
export interface MonthlyExpense {
  id: string;
  month: Month;
  amount: number;
  note: string;
}
export interface ImportantExpense {
  id: string;
  month: Month;
  date?: string;
  categoryId: string;
  amount: number;
  subject: string;
  note: string;
}
export interface FuelRecord {
  id: string;
  month: Month;
  amount: number;
  times?: number;
  tagId?: string;
  note: string;
}
export interface SavingRecord {
  id: string;
  month: Month;
  channelId: string;
  opening: number;
  added: number;
  reduced: number;
  closing: number;
  manual: boolean;
  note: string;
}
export interface AppData {
  version: number;
  initialized: boolean;
  startMonth: Month;
  lastBackupAt?: string;
  categories: Category[];
  loans: Loan[];
  repayments: Repayment[];
  bankRecords: BankRecord[];
  expenses: MonthlyExpense[];
  importantExpenses: ImportantExpense[];
  fuelRecords: FuelRecord[];
  savingRecords: SavingRecord[];
}
