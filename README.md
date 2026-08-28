# 月度财务记录工具

一个面向“每月更新一次”的手机优先个人财务 PWA。包含车贷、还款银行卡、月度支出、重要支出、加油和多渠道储蓄。

## 启动

需要 Node.js 20+：

```bash
pnpm install
pnpm dev
```

浏览器打开终端显示的地址。生产构建及测试：

```bash
pnpm test
pnpm build
pnpm preview
```

## 数据与备份

- 所有数据保存在当前浏览器的 IndexedDB（数据库名 `monthly-finance-db`）中，不上传服务器。
- 浏览器清站点数据会删除本地账本；应用会在从未备份或距离上次备份超过 30 天时提醒。
- “设置 → 数据备份”会生成 `月度财务备份-YYYY-MM-DD.json`，并记录上次备份时间。建议保存到手机的 iCloud Drive、网盘或其他云盘。
- JSON 可完整恢复；Excel 用于查看和二次分析。
- PWA 构建后支持安装到手机主屏幕及离线打开。

## 结构

- `src/types.ts`：领域数据模型
- `src/db.ts`：IndexedDB、默认分类与模拟数据
- `src/utils.ts`：月份、金额、汇总规则
- `src/App.tsx`：页面、抽屉表单和交互组件
- `src/style.css`：手机优先响应式界面
- `src/utils.test.ts`：月份切换、汇总和余额延续测试

## 扩展模块

增加房贷、保险、信用卡或投资时，先在 `types.ts` 添加独立记录类型，再在 `AppData` 增加集合；汇总口径放在 `utils.ts`，页面只负责录入与展示。房贷可复用 Loan / Repayment 模型并增加 `loanType`；信用卡适合复用“月初、变动、月末”的账户快照思路。数据格式变化时提高 `version` 并在 `db.ts` 添加迁移函数。
