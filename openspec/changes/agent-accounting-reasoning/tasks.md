# Tasks

## 1. Dynamic Temporal Grounding

- [ ] 1.1 Update `apps/agent/src/agent/system-prompt.ts` to dynamically calculate runtime calendar dates in `Asia/Jakarta` timezone (today, start of current month, end of current month, start of next month, end of next month, formatted month labels) with zero hardcoded dates.
- [ ] 1.2 Update `apps/agent/src/__tests__/unit/system-prompt.test.ts` to verify dynamic date generation and WIB timezone adherence.

## 2. Maniyy Accounting Engine & Multi-Currency Prompt Integration

- [ ] 2.1 Formalize the Maniyy Accounting Matrix in `system-prompt.ts`: Income (+), Expense (-), Transfer ($\Delta = 0$), Planned Projection formula ($\text{Net Worth}_{\text{current}} + \text{Planned Income} - \text{Planned Expense}$), and liquidity partition rules (`spendable` vs `locked`).
- [ ] 2.2 Add multi-currency awareness to `system-prompt.ts`: instructions for citing foreign currencies (e.g. USDT) alongside consolidated IDR net worth.
- [ ] 2.3 Add category spending & budget drilldown rules to `system-prompt.ts`.

## 3. Financial Tool Payload Optimization

- [ ] 3.1 Update `apps/agent/src/agent/tools/financial.ts` `get_snapshot` tool to include `byCurrency` breakdown and top categories from `monthlyCashFlow.categoryBreakdown`.
- [ ] 3.2 Update `list_transactions` tool declaration in `apps/agent/src/agent/gemini-native.ts` and `apps/agent/src/agent/tools/financial.ts` to support clean parameter binding for `startDate`, `endDate`, and `limit`.

## 4. Evaluation Suite & Reasoning Verification

- [ ] 4.1 Update `apps/agent/eval/dataset.ts` with test cases covering: zero-delta transfer handling, multi-currency holdings, and category spending outliers.
- [ ] 4.2 Run `bun run eval/run.ts` to evaluate Gemini and Groq models against the updated accounting dataset and verify reasoning score $\ge 85/100$.

## 5. Build, Merge, & Deployment

- [ ] 5.1 Run all unit tests (`bun run test:web` and `bun run test:agent`) and typechecks (`bun run check:web`).
- [ ] 5.2 Merge change to branch `main` and push to GitHub repository.
- [ ] 5.3 Deploy `apps/agent` to Cloudflare Workers and `apps/web` to Cloudflare Pages, verifying live response in browser.
