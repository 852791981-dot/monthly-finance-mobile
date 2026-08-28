import { useEffect, useMemo, useState } from "react";
import {
  Home,
  Car,
  ReceiptText,
  PiggyBank,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Download,
  Upload,
  Trash2,
  GripVertical,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { AppData, CategoryKind } from "./types";
import { load, save, demoData, emptyData } from "./db";
import {
  currentMonth,
  money,
  monthLabel,
  monthsBack,
  num,
  shiftMonth,
  summary,
  uid,
} from "./utils";
type Page = "home" | "loan" | "expense" | "saving" | "settings";
type Drawer =
  | "expense"
  | "important"
  | "fuel"
  | "loan"
  | "loanPlan"
  | "bank"
  | "saving"
  | null;
const labels: Record<CategoryKind, string> = {
  expense: "支出分类",
  important: "重要事项标签",
  fuel: "加油标签",
  saving: "储蓄渠道",
  bank: "银行卡",
  loan: "贷款名称",
};
export default function App() {
  const [data, setData] = useState<AppData>();
  const [month, setMonth] = useState(currentMonth());
  const [page, setPage] = useState<Page>("home");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [onboard, setOnboard] = useState(false);
  useEffect(() => {
    load().then((d) => {
      setData(d);
      setOnboard(!d.initialized);
    });
  }, []);
  const update = (fn: (d: AppData) => void) =>
    setData((old) => {
      if (!old) return old;
      const next = structuredClone(old);
      fn(next);
      save(next);
      return next;
    });
  if (!data) return <div className="loading">正在打开账本…</div>;
  const s = summary(data, month),
    cats = (k: CategoryKind) =>
      data.categories
        .filter((x) => x.kind === k)
        .sort((a, b) => a.order - b.order),
    latest = (kind: "saving" | "bank", id: string) => {
      const arr =
        kind === "saving"
          ? data.savingRecords.filter((x) => x.channelId === id)
          : data.bankRecords.filter((x) => x.bankId === id);
      return (
        arr
          .filter((x) => x.month < month)
          .sort((a, b) => b.month.localeCompare(a.month))[0]?.closing || 0
      );
    };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      note = String(f.get("note") || "");
    update((d) => {
      if (drawer === "expense") {
        d.expenses = d.expenses.filter((x) => x.month !== month);
        d.expenses.push({
          id: uid(),
          month,
          amount: num(f.get("amount")),
          note,
        });
      }
      if (drawer === "fuel") {
        d.fuelRecords.push({
          id: uid(),
          month,
          date: String(f.get("date") || ""),
          amount: num(f.get("amount")),
          tagId: String(f.get("tagId") || ""),
          note,
        });
      }
      if (drawer === "important")
        d.importantExpenses.push({
          id: uid(),
          month,
          date: String(f.get("date") || ""),
          categoryId: String(f.get("categoryId")),
          amount: num(f.get("amount")),
          subject: String(f.get("subject")),
          note,
        });
      if (drawer === "loan") {
        const loan = d.loans[0],
          amount = num(f.get("amount")),
          before = num(f.get("before"));
        const after = num(f.get("after"));
        d.repayments = d.repayments.filter(
          (x) => !(x.month === month && x.loanId === loan.id),
        );
        d.repayments.push({
          id: uid(),
          loanId: loan.id,
          month,
          amount,
          before,
          after,
          paid: f.get("paid") === "on",
          paidDate: String(f.get("date") || ""),
          note,
        });
        loan.current = after;
        const principalDrop = Math.max(0, before - after);
        if (
          (loan.interestRemaining || 0) + (loan.interestFreeRemaining || 0) >
          0
        ) {
          const fromInterest = Math.min(
            loan.interestRemaining || 0,
            principalDrop,
          );
          loan.interestRemaining = Math.max(
            0,
            (loan.interestRemaining || 0) - fromInterest,
          );
          loan.interestFreeRemaining = Math.max(
            0,
            (loan.interestFreeRemaining || 0) - (principalDrop - fromInterest),
          );
        }
      }
      if (drawer === "loanPlan") {
        const loan = d.loans[0];
        loan.interestRemaining = num(f.get("interestRemaining"));
        loan.interestFreeRemaining = num(f.get("interestFreeRemaining"));
        loan.externalFunds = num(f.get("externalFunds"));
        loan.monthlyPlan = num(f.get("monthlyPlan"));
        loan.current = loan.interestRemaining + loan.interestFreeRemaining;
      }
      if (drawer === "bank") {
        const id = String(f.get("channelId")),
          opening = num(f.get("opening")),
          deposit = num(f.get("added")),
          repayment = num(f.get("reduced")),
          manual = f.get("manual") === "on",
          closing = manual
            ? num(f.get("closing"))
            : opening + deposit - repayment;
        d.bankRecords = d.bankRecords.filter(
          (x) => !(x.month === month && x.bankId === id),
        );
        d.bankRecords.push({
          id: uid(),
          bankId: id,
          month,
          opening,
          deposit,
          repayment,
          closing,
          manual,
          note,
        });
      }
      if (drawer === "saving") {
        const id = String(f.get("channelId")),
          opening = num(f.get("opening")),
          added = num(f.get("added")),
          reduced = num(f.get("reduced")),
          manual = f.get("manual") === "on",
          closing = manual ? num(f.get("closing")) : opening + added - reduced;
        d.savingRecords = d.savingRecords.filter(
          (x) => !(x.month === month && x.channelId === id),
        );
        d.savingRecords.push({
          id: uid(),
          channelId: id,
          month,
          opening,
          added,
          reduced,
          closing,
          manual,
          note,
        });
      }
    });
    setDrawer(null);
  };
  const remove = (type: keyof AppData, id: string) => {
    if (confirm("确定删除这条记录吗？此操作不可撤销。"))
      update((d) => {
        (d[type] as { id: string }[]) = (d[type] as { id: string }[]).filter(
          (x) => x.id !== id,
        ) as never;
      });
  };
  const backupDue =
    !data.lastBackupAt ||
    Date.now() - new Date(data.lastBackupAt).getTime() > 30 * 86400000;
  return (
    <div className="app">
      <header>
        <div>
          <small>我的月度财务</small>
          <h1>{monthLabel(month)}</h1>
        </div>
        <button className="avatar">财</button>
      </header>
      <div className="monthbar">
        <button onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft />
        </button>
        <input
          aria-label="选择月份"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight />
        </button>
        <button className="today" onClick={() => setMonth(currentMonth())}>
          本月
        </button>
      </div>
      {backupDue && data.initialized && (
        <button className="backupreminder" onClick={() => setPage("settings")}>
          <span>
            <b>{data.lastBackupAt ? "该备份账本了" : "还没有备份"}</b>
            <small>保存一份 JSON 到手机云盘，防止数据丢失</small>
          </span>
          <Download />
        </button>
      )}
      <main>
        {page === "home" && (
          <Dashboard data={data} month={month} open={setDrawer} />
        )}{" "}
        {page === "loan" && (
          <LoanPage
            data={data}
            month={month}
            open={setDrawer}
            remove={remove}
          />
        )}{" "}
        {page === "expense" && (
          <ExpensePage
            data={data}
            month={month}
            open={setDrawer}
            remove={remove}
          />
        )}{" "}
        {page === "saving" && (
          <SavingPage
            data={data}
            month={month}
            open={setDrawer}
            remove={remove}
          />
        )}{" "}
        {page === "settings" && <SettingsPage data={data} update={update} />}
      </main>
      <nav>
        {(
          [
            ["home", Home, "首页"],
            ["loan", Car, "车贷"],
            ["expense", ReceiptText, "支出"],
            ["saving", PiggyBank, "储蓄"],
            ["settings", Settings, "设置"],
          ] as const
        ).map(([p, I, l]) => (
          <button
            className={page === p ? "active" : ""}
            onClick={() => setPage(p)}
            key={p}
          >
            <I />
            <span>{l}</span>
          </button>
        ))}
      </nav>
      {drawer && (
        <Drawer
          title={
            {
              expense: "记录本月支出",
              important: "新增重要支出",
              fuel: "更新加油费用",
              loan: "更新本月车贷",
              loanPlan: "设置车贷资金计划",
              bank: "更新银行卡",
              saving: "更新本月储蓄",
            }[drawer]
          }
          close={() => setDrawer(null)}
        >
          <form onSubmit={submit}>
            {drawer === "important" && (
              <>
                <Field label="事项" name="subject" required />
                <Field label="日期（可选）" name="date" type="date" />
                <Select
                  label="标签"
                  name="categoryId"
                  items={cats("important")}
                />
              </>
            )}
            {drawer === "fuel" && (
              <>
                <Field label="加油日期" name="date" type="date" required />
                <Select label="费用标签" name="tagId" items={cats("fuel")} />
              </>
            )}
            {drawer === "loan" && data.loans[0] && (
              <>
                <Field
                  label="还款前余额"
                  name="before"
                  type="number"
                  value={data.loans[0].current}
                />
                <Field
                  label="还款后余额"
                  name="after"
                  type="number"
                  value={Math.max(
                    0,
                    data.loans[0].current - data.loans[0].monthlyPlan,
                  )}
                />
                <Field label="实际还款日期" name="date" type="date" />
                <label className="check">
                  <input name="paid" type="checkbox" defaultChecked /> 已还款
                </label>
              </>
            )}
            {(drawer === "saving" || drawer === "bank") && (
              <BalanceFields
                kind={drawer}
                items={cats(drawer)}
                latest={latest}
              />
            )}{" "}
            {drawer === "loanPlan" && data.loans[0] && (
              <>
                <Field
                  label="待还（有息阶段）"
                  name="interestRemaining"
                  type="number"
                  value={data.loans[0].interestRemaining || 0}
                />
                <Field
                  label="待还（无息阶段）"
                  name="interestFreeRemaining"
                  type="number"
                  value={data.loans[0].interestFreeRemaining || 0}
                />
                <Field
                  label="其他可用于还贷的资金"
                  name="externalFunds"
                  type="number"
                  value={data.loans[0].externalFunds || 0}
                />
                <Field
                  label="每月计划还款"
                  name="monthlyPlan"
                  type="number"
                  value={data.loans[0].monthlyPlan}
                />
                <p className="formhint">
                  还需攒 = 待还总额 − 还款卡余额 − 其他可用资金
                </p>
              </>
            )}
            {(drawer === "expense" ||
              drawer === "important" ||
              drawer === "fuel" ||
              drawer === "loan") && (
              <Field
                label={drawer === "loan" ? "本月还款金额" : "金额"}
                name="amount"
                type="number"
                required
                value={
                  drawer === "loan" ? data.loans[0]?.monthlyPlan : undefined
                }
              />
            )}
            <Field label="备注（可选）" name="note" />
            <button className="primary" type="submit">
              {drawer === "loanPlan" ? "保存资金计划" : "保存本月记录"}
            </button>
          </form>
        </Drawer>
      )}
      {onboard && (
        <Onboard
          data={data}
          finish={(loan, bank, start) => {
            update((d) => {
              d.initialized = true;
              d.startMonth = start;
              if (loan.initial) d.loans = [loan];
              if (bank) {
                const c = d.categories.find((x) => x.kind === "bank");
                if (c) c.name = bank;
              }
            });
            setOnboard(false);
          }}
          skip={() => {
            update((d) => {
              d.initialized = true;
            });
            setOnboard(false);
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  value,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={value}
      />
    </label>
  );
}
function Select({
  label,
  name,
  items,
}: {
  label: string;
  name: string;
  items: { id: string; name: string }[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name}>
        {items
          .filter((x: any) => x.active !== false)
          .map((x) => (
            <option value={x.id} key={x.id}>
              {x.name}
            </option>
          ))}
      </select>
    </label>
  );
}
function BalanceFields({
  kind,
  items,
  latest,
}: {
  kind: "saving" | "bank";
  items: any[];
  latest: (k: "saving" | "bank", id: string) => number;
}) {
  const [id, setId] = useState(items[0]?.id || "");
  return (
    <>
      <label className="field">
        <span>{kind === "saving" ? "储蓄渠道" : "银行卡"}</span>
        <select
          name="channelId"
          value={id}
          onChange={(e) => setId(e.target.value)}
        >
          {items
            .filter((x) => x.active)
            .map((x) => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
        </select>
      </label>
      <Field
        label="月初余额（自动延续）"
        name="opening"
        type="number"
        value={latest(kind, id)}
      />
      <Field
        label={kind === "saving" ? "本月新增" : "本月转入"}
        name="added"
        type="number"
      />
      <Field
        label={kind === "saving" ? "本月减少" : "用于还款"}
        name="reduced"
        type="number"
      />
      <label className="check">
        <input name="manual" type="checkbox" /> 手动指定月末余额
      </label>
      <Field label="手动月末余额" name="closing" type="number" />
    </>
  );
}
function Drawer({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section className="drawer">
        <div className="drawerhead">
          <h2>{title}</h2>
          <button onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={"card " + (tone || "")}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}
function Quick({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="quick" onClick={onClick}>
      <Plus /> {children}
    </button>
  );
}
function Bars({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(...values.map((x) => x.value), 1);
  return (
    <div className="bars">
      {values.map((x) => (
        <div className="baritem" key={x.label}>
          <div
            className="bar"
            style={{ height: `${Math.max(5, (x.value / max) * 100)}%` }}
          />
          <small>{x.label.slice(5)}</small>
        </div>
      ))}
    </div>
  );
}
function ExpenseStackedChart({
  data,
  month,
}: {
  data: AppData;
  month: string;
}) {
  const palette = ["#b42318", "#d94841", "#e76f51", "#c2410c", "#a63d40"];
  const months = monthsBack(month, 12).map((m) => {
    const daily = data.expenses.find((x) => x.month === m)?.amount || 0;
    const important = data.importantExpenses
      .filter((x) => x.month === m)
      .reduce<Record<string, number>>((acc, x) => {
        const name =
          data.categories.find((c) => c.id === x.categoryId)?.name ||
          "重要支出";
        acc[name] = (acc[name] || 0) + x.amount;
        return acc;
      }, {});
    const fuel = data.fuelRecords
      .filter((x) => x.month === m)
      .reduce((sum, x) => sum + x.amount, 0);
    const parts = [
      { name: "日常", value: daily, color: "#8f1d18" },
      ...Object.entries(important).map(([name, value], i) => ({
        name,
        value,
        color: palette[i % palette.length],
      })),
      { name: "加油", value: fuel, color: "#d99a2b" },
    ].filter((x) => x.value > 0);
    return { month: m, parts, total: parts.reduce((s, x) => s + x.value, 0) };
  });
  const max = Math.max(...months.map((x) => x.total), 1);
  return (
    <div className="stackscroll">
      {months.map((item) => (
        <div className="stackmonth" key={item.month}>
          <b>{item.month.slice(5)}月</b>
          <div
            className="stacktrack"
            style={{ height: `${Math.max(8, (item.total / max) * 112)}px` }}
          >
            {item.parts.map((part) => (
              <i
                key={part.name}
                title={`${part.name} ${money(part.value)}`}
                style={{
                  background: part.color,
                  height: `${(part.value / Math.max(item.total, 1)) * 100}%`,
                }}
              />
            ))}
          </div>
          <strong>{money(item.total)}</strong>
          <div className="stacklabels">
            {item.parts.map((part) => (
              <small key={part.name}>
                <em style={{ background: part.color }} />
                {part.name} {money(part.value).replace("CN¥", "¥")}
              </small>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function Dashboard({
  data,
  month,
  open,
}: {
  data: AppData;
  month: string;
  open: (x: Drawer) => void;
}) {
  const s = summary(data, month),
    ms = monthsBack(month, 6),
    loan = data.loans[0],
    paid = loan ? loan.initial - loan.current : 0;
  return (
    <>
      <section className="hero">
        <div>
          <small>本月总支出</small>
          <strong>{money(s.total)}</strong>
          <span>日常、重要支出与加油合计</span>
        </div>
        <div className="heroSide">
          <small>本月新增储蓄</small>
          <b>{money(s.added)}</b>
        </div>
      </section>
      <h2 className="sectiontitle">本月概览</h2>
      <div className="cards">
        <Card label="日常支出" value={s.daily} />
        <Card label="重要支出" value={s.important} />
        <Card label="加油费用" value={s.fuel} />
        <Card label="车贷还款" value={s.repay} />
        <Card label="当前贷款余额" value={s.loan} tone="green" />
        <Card label="还款卡余额" value={s.bank} tone="green" />
        <Card label="当前储蓄总额" value={s.saving} tone="gold" />
        <Card label="本月新增储蓄" value={s.added} tone="gold" />
      </div>
      <div className="panel">
        <h3>最近 6 个月支出</h3>
        <Bars
          values={ms.map((m) => ({ label: m, value: summary(data, m).total }))}
        />
      </div>
      <div className="panel">
        <h3>最近 6 个月储蓄</h3>
        <Bars
          values={ms.map((m) => ({ label: m, value: summary(data, m).saving }))}
        />
      </div>
      {loan && (
        <div className="panel">
          <div className="row">
            <h3>车贷还款进度</h3>
            <b>{Math.round((paid / loan.initial) * 100)}%</b>
          </div>
          <div className="progress">
            <i style={{ width: `${(paid / loan.initial) * 100}%` }} />
          </div>
          <p>
            {money(paid)} / {money(loan.initial)}
          </p>
        </div>
      )}
    </>
  );
}
function LoanPage({
  data,
  month,
  open,
  remove,
}: {
  data: AppData;
  month: string;
  open: (x: Drawer) => void;
  remove: any;
}) {
  const l = data.loans[0];
  if (!l)
    return <Empty title="还没有贷款资料" action="去设置中添加贷款基础信息" />;
  const totalDue =
      (l.interestRemaining || 0) + (l.interestFreeRemaining || 0) || l.current,
    bankBalance = summary(data, month).bank,
    fundingGap = Math.max(0, totalDue - bankBalance - (l.externalFunds || 0)),
    paid = Math.max(0, l.initial - l.current),
    remaining = l.monthlyPlan ? Math.ceil(totalDue / l.monthlyPlan) : 0;
  return (
    <>
      <div className="pagehead">
        <div>
          <small>车贷账户</small>
          <h2>{l.name}</h2>
        </div>
        <Quick onClick={() => open("loan")}>更新本月</Quick>
      </div>
      <div className="loanhero">
        <small>按当前资金计划，还需要攒</small>
        <strong>{money(fundingGap)}</strong>
        <div className="row">
          <span>待还合计 {money(totalDue)}</span>
          <span>约剩 {remaining} 个月</span>
        </div>
        <div className="progress">
          <i
            style={{
              width: `${l.initial ? Math.min(100, (paid / l.initial) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
      <div className="cards">
        <Card label="待还有息部分" value={l.interestRemaining || 0} />
        <Card label="待还无息部分" value={l.interestFreeRemaining || 0} />
        <Card label="计划月还" value={l.monthlyPlan} />
        <Card label="本月已还" value={summary(data, month).repay} />
        <Card label="还款卡余额" value={bankBalance} />
        <Card label="其他可用资金" value={l.externalFunds || 0} />
      </div>
      <div className="actions">
        <Quick onClick={() => open("loan")}>记本月还款</Quick>
        <Quick onClick={() => open("bank")}>更新账户余额</Quick>
        <Quick onClick={() => open("loanPlan")}>资金计划</Quick>
      </div>
      <List
        title="还款记录"
        rows={data.repayments
          .filter((x) => x.loanId === l.id)
          .sort((a, b) => b.month.localeCompare(a.month))
          .map((x) => ({
            id: x.id,
            main: monthLabel(x.month),
            sub: `${x.paid ? "已还" : "未还"} · 余额 ${money(x.after)}`,
            amount: x.amount,
            type: "repayments",
          }))}
        remove={remove}
      />
      <List
        title="本月还款账户记录"
        rows={data.bankRecords
          .filter((x) => x.month === month)
          .map((x) => ({
            id: x.id,
            main:
              data.categories.find((c) => c.id === x.bankId)?.name || "银行卡",
            sub: `转入 ${money(x.deposit)} · 还款 ${money(x.repayment)}`,
            amount: x.closing,
            type: "bankRecords",
          }))}
        remove={remove}
      />
    </>
  );
}
function ExpensePage({
  data,
  month,
  open,
  remove,
}: {
  data: AppData;
  month: string;
  open: (x: Drawer) => void;
  remove: any;
}) {
  const s = summary(data, month),
    year = month.slice(0, 4),
    fuelYear = data.fuelRecords
      .filter((x) => x.month.startsWith(year))
      .reduce((a, x) => a + x.amount, 0);
  return (
    <>
      <div className="pagehead">
        <div>
          <small>每月汇总，不记流水</small>
          <h2>支出与加油</h2>
        </div>
        <Quick onClick={() => open("expense")}>更新本月</Quick>
      </div>
      <div className="cards">
        <Card label="日常支出" value={s.daily} />
        <Card label="重要支出" value={s.important} />
        <Card label="本月合计" value={s.total} tone="gold" />
        <Card label="年度加油" value={fuelYear} />
      </div>
      <div className="actions">
        <Quick onClick={() => open("important")}>重要支出</Quick>
        <Quick onClick={() => open("fuel")}>加油费用</Quick>
      </div>
      <div className="panel">
        <h3>最近 12 个月分类支出</h3>
        <ExpenseStackedChart data={data} month={month} />
      </div>
      <List
        title="本月日常支出"
        rows={data.expenses
          .filter((x) => x.month === month)
          .map((x) => ({
            id: x.id,
            main: "日常支出合计",
            sub: monthLabel(x.month),
            amount: x.amount,
            type: "expenses",
          }))}
        remove={remove}
      />
      <List
        title="本月重要支出"
        rows={data.importantExpenses
          .filter((x) => x.month === month)
          .map((x) => ({
            id: x.id,
            main: x.subject || "未命名事项",
            sub:
              data.categories.find((c) => c.id === x.categoryId)?.name ||
              "已停用标签",
            amount: x.amount,
            type: "importantExpenses",
          }))}
        remove={remove}
      />
      <List
        title="本月加油记录"
        rows={data.fuelRecords
          .filter((x) => x.month === month)
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .map((x) => ({
            id: x.id,
            main: x.date || monthLabel(x.month),
            sub: data.categories.find((c) => c.id === x.tagId)?.name || "加油",
            amount: x.amount,
            type: "fuelRecords",
          }))}
        remove={remove}
      />
    </>
  );
}
function SavingPage({
  data,
  month,
  open,
  remove,
}: {
  data: AppData;
  month: string;
  open: (x: Drawer) => void;
  remove: any;
}) {
  const s = summary(data, month),
    year = month.slice(0, 4),
    annual = data.savingRecords
      .filter((x) => x.month.startsWith(year))
      .reduce((a, x) => a + x.added - x.reduced, 0),
    rows = data.categories
      .filter((x) => x.kind === "saving" && x.active)
      .map((c) => {
        const r = data.savingRecords
          .filter((x) => x.channelId === c.id && x.month <= month)
          .sort((a, b) => b.month.localeCompare(a.month))[0];
        return {
          id: c.id,
          main: c.name,
          sub: r
            ? `${monthLabel(r.month)} 更新${r.manual ? " · 手动调整" : ""}`
            : "尚未记录",
          amount: r?.closing || 0,
          type: "savingRecords",
        };
      });
  return (
    <>
      <div className="pagehead">
        <div>
          <small>资产积累</small>
          <h2>我的储蓄</h2>
        </div>
        <Quick onClick={() => open("saving")}>更新渠道</Quick>
      </div>
      <section className="savinghero">
        <small>当前储蓄总额</small>
        <strong>{money(s.saving)}</strong>
        <div>
          <span>本月净新增 {money(s.added)}</span>
          <span>本年净新增 {money(annual)}</span>
        </div>
      </section>
      <List title="各渠道余额" rows={rows} remove={() => {}} />
      <List
        title="本月储蓄更新"
        rows={data.savingRecords
          .filter((x) => x.month === month)
          .map((x) => ({
            id: x.id,
            main:
              data.categories.find((c) => c.id === x.channelId)?.name ||
              "储蓄渠道",
            sub: `新增 ${money(x.added)} · 减少 ${money(x.reduced)}`,
            amount: x.closing,
            type: "savingEntry",
          }))}
        remove={(_, id) => remove("savingRecords", id)}
      />
      <div className="panel">
        <h3>最近 12 个月储蓄趋势</h3>
        <Bars
          values={monthsBack(month, 12).map((m) => ({
            label: m,
            value: summary(data, m).saving,
          }))}
        />
      </div>
    </>
  );
}
function List({
  title,
  rows,
  remove,
}: {
  title: string;
  rows: {
    id: string;
    main: string;
    sub: string;
    amount: number;
    type: string;
  }[];
  remove: (t: any, id: string) => void;
}) {
  return (
    <section className="list">
      <h3>{title}</h3>
      {rows.length ? (
        rows.map((r) => (
          <div className="listrow" key={r.id}>
            <div>
              <b>{r.main}</b>
              <small>{r.sub}</small>
            </div>
            <strong>{money(r.amount)}</strong>
            {r.type !== "savingRecords" && (
              <button
                className="icon danger"
                onClick={() => remove(r.type, r.id)}
              >
                <Trash2 />
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="muted">本月还没有记录</p>
      )}
    </section>
  );
}
function Empty({ title, action }: { title: string; action: string }) {
  return (
    <div className="empty">
      <PiggyBank />
      <h2>{title}</h2>
      <p>{action}</p>
    </div>
  );
}
function SettingsPage({
  data,
  update,
}: {
  data: AppData;
  update: (fn: (d: AppData) => void) => void;
}) {
  const [kind, setKind] = useState<CategoryKind>("important");
  const add = () => {
    const name = prompt(`新增${labels[kind]}名称`);
    if (name?.trim())
      update((d) =>
        d.categories.push({
          id: uid(),
          kind,
          name: name.trim(),
          active: true,
          order: d.categories.filter((x) => x.kind === kind).length,
          includeInTotal: true,
        }),
      );
  };
  const rename = (id: string, old: string) => {
    const name = prompt("修改名称", old);
    if (name?.trim())
      update((d) => {
        const c = d.categories.find((x) => x.id === id);
        if (c) c.name = name.trim();
      });
  };
  const move = (id: string, dir: number) =>
    update((d) => {
      const arr = d.categories
          .filter((x) => x.kind === kind)
          .sort((a, b) => a.order - b.order),
        i = arr.findIndex((x) => x.id === id),
        j = i + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i].order, arr[j].order] = [arr[j].order, arr[i].order];
    });
  const del = (id: string) => {
    const used =
      data.importantExpenses.some((x) => x.categoryId === id) ||
      data.fuelRecords.some((x) => x.tagId === id) ||
      data.savingRecords.some((x) => x.channelId === id) ||
      data.bankRecords.some((x) => x.bankId === id);
    if (used) {
      if (confirm("此项目已有历史记录，不能直接删除。是否改为停用？"))
        update((d) => {
          d.categories.find((x) => x.id === id)!.active = false;
        });
    } else if (confirm("确定删除？"))
      update((d) => {
        d.categories = d.categories.filter((x) => x.id !== id);
      });
  };
  const exportJson = () => {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const snapshot = { ...data, lastBackupAt: now.toISOString() };
    download(
      JSON.stringify(snapshot, null, 2),
      `月度财务备份-${stamp}.json`,
      "application/json",
    );
    update((d) => {
      d.lastBackupAt = snapshot.lastBackupAt;
    });
  };
  const exportExcel = () => {
    const book = XLSX.utils.book_new();
    (
      [
        "expenses",
        "importantExpenses",
        "fuelRecords",
        "repayments",
        "bankRecords",
        "savingRecords",
      ] as const
    ).forEach((k) =>
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(data[k]),
        k.slice(0, 31),
      ),
    );
    XLSX.writeFile(book, "月度财务数据.xlsx");
  };
  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result));
        if (!next.version || !next.categories) throw 0;
        if (confirm("导入会覆盖当前数据，确定继续？"))
          update((d) => Object.assign(d, next));
      } catch {
        alert("备份文件格式不正确");
      }
    };
    reader.readAsText(file);
  };
  return (
    <>
      <div className="pagehead">
        <div>
          <small>按你的习惯调整</small>
          <h2>设置与备份</h2>
        </div>
      </div>
      <section className="panel">
        <h3>分类管理</h3>
        <div className="chips">
          {(Object.keys(labels) as CategoryKind[]).map((k) => (
            <button
              className={kind === k ? "selected" : ""}
              onClick={() => setKind(k)}
              key={k}
            >
              {labels[k]}
            </button>
          ))}
        </div>
        <div className="settinglist">
          {data.categories
            .filter((x) => x.kind === kind)
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <div key={c.id}>
                <GripVertical />
                <button className="name" onClick={() => rename(c.id, c.name)}>
                  {c.name}
                  <small>{c.active ? "启用" : "已停用"}</small>
                </button>
                <button onClick={() => move(c.id, -1)}>↑</button>
                <button onClick={() => move(c.id, 1)}>↓</button>
                <button
                  onClick={() =>
                    update((d) => {
                      const x = d.categories.find((x) => x.id === c.id);
                      if (x) x.active = !x.active;
                    })
                  }
                >
                  {c.active ? "停用" : "启用"}
                </button>
                <button className="danger" onClick={() => del(c.id)}>
                  <Trash2 />
                </button>
              </div>
            ))}
        </div>
        <button className="outline" onClick={add}>
          <Plus />
          新增{labels[kind]}
        </button>
      </section>
      <section className="panel">
        <h3>数据备份</h3>
        <div className={`backupstatus ${data.lastBackupAt ? "safe" : "due"}`}>
          <b>{data.lastBackupAt ? "已有可恢复备份记录" : "尚未创建备份"}</b>
          <small>
            {data.lastBackupAt
              ? `上次备份：${new Date(data.lastBackupAt).toLocaleString("zh-CN")}`
              : "现在创建第一份完整账本备份"}
          </small>
        </div>
        <p className="muted">
          JSON 包含全部账本、标签和设置。下载后请选择“存储到文件”或手机云盘。
        </p>
        <div className="backup">
          <button onClick={exportExcel}>
            <Download />
            Excel
          </button>
          <button onClick={exportJson}>
            <Download />
            JSON 备份
          </button>
          <label>
            <Upload />
            导入 JSON
            <input
              hidden
              type="file"
              accept="application/json"
              onChange={(e) =>
                e.target.files?.[0] && importJson(e.target.files[0])
              }
            />
          </label>
        </div>
      </section>
      <section className="dangerzone">
        <h3>测试数据</h3>
        <button
          onClick={() =>
            confirm("将覆盖当前数据，确定载入模拟数据？") &&
            update((d) => Object.assign(d, demoData()))
          }
        >
          载入模拟数据
        </button>
        <button
          onClick={() =>
            confirm("将清空全部数据，确定吗？") &&
            update((d) => Object.assign(d, emptyData(), { initialized: true }))
          }
        >
          清空全部数据
        </button>
      </section>
    </>
  );
}
function download(text: string, name: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function Onboard({
  data,
  finish,
  skip,
}: {
  data: AppData;
  finish: (loan: any, bank: string, start: string) => void;
  skip: () => void;
}) {
  return (
    <div className="overlay onboarding">
      <section className="drawer">
        <div className="onboardmark">财</div>
        <h2>建立你的月度账本</h2>
        <p>只需设置一次，以后每月花 5 分钟更新。</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              initial = num(f.get("initial")),
              current = num(f.get("current"));
            finish(
              {
                id: uid(),
                name: "车贷",
                initial,
                current,
                monthlyPlan: num(f.get("plan")),
                startMonth: String(f.get("start")),
                endMonth: "",
                note: "",
              },
              String(f.get("bank")),
              String(f.get("start")),
            );
          }}
        >
          <Field label="初始贷款金额（可选）" name="initial" type="number" />
          <Field label="当前贷款余额" name="current" type="number" />
          <Field label="每月计划还款" name="plan" type="number" />
          <Field label="还款银行卡" name="bank" />
          <label className="field">
            <span>开始记录月份</span>
            <input name="start" type="month" defaultValue={data.startMonth} />
          </label>
          <button className="primary">开始使用</button>
          <button className="skip" type="button" onClick={skip}>
            暂时跳过
          </button>
        </form>
      </section>
    </div>
  );
}
