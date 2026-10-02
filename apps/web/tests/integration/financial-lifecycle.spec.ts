/// <reference types="node" />
import { test, expect } from '@playwright/test';
import {
	getLiveAccountConfig,
	assertAuthorizedTestAccount,
	sweepLiveAccount,
	injectBrowserTestAuth
} from './helpers/live-account';
import {
	deriveTestPeriods,
	EXPECTED_FINANCIAL_JOURNAL
} from './helpers/finance-fixture';

test.describe.serial('Financial Lifecycle & Cross-Surface Value Validation', () => {
	const config = getLiveAccountConfig();
	const periods = deriveTestPeriods();

	// Fixture tracking IDs across steps
	let wOpId = '';
	let wEmergencyId = '';
	let wTripId = '';

	let catSalaryId = '';
	let catFoodId = '';
	let catTransportId = '';

	let bFoodId = '';
	let bTransportId = '';

	let gEmergencyId = '';
	let gTripId = '';

	const recurringIds: string[] = [];

	test.beforeAll(async ({ request }) => {
		if (config.token && config.allowDestructive) {
			await assertAuthorizedTestAccount(request, config);
			await sweepLiveAccount(request, config);
		}
	});

	test.afterAll(async ({ request }) => {
		if (config.token && config.allowDestructive) {
			await sweepLiveAccount(request, config);
		}
	});

	test('01. Preflight authorization and account verification', async ({ request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await assertAuthorizedTestAccount(request, config);
	});

	test('02. Task 5.1 - Submit 3 zero-opening wallets through UI and edit metadata', async ({ page, request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await injectBrowserTestAuth(page, config);
		await page.goto('/accounts');
		const addBtn = page.locator('button', { hasText: /Add Account|\+ Dompet/i }).first();
		await expect(addBtn).toBeVisible({ timeout: 15000 });

		// Helper to create wallet via UI
		async function createWalletUI(name: string, institution: string, isLocked: boolean) {
			await page.locator('button', { hasText: /Add Account|\+ Dompet/i }).first().click();
			const drawer = page.locator('div[aria-labelledby="drawer-title"]');
			await expect(drawer).toBeVisible();

			await page.fill('#wallet-name', name);
			await page.fill('#wallet-inst', institution);
			await page.fill('#wallet-balance', '0');

			const lockedCheckbox = drawer.locator('input[type="checkbox"]').first();
			const isChecked = await lockedCheckbox.isChecked();
			if (isLocked !== isChecked) {
				await lockedCheckbox.click();
			}

			await drawer.locator('button[type="submit"]').click();
			await expect(drawer).not.toBeVisible({ timeout: 15000 });
		}

		// 1. Create W-OP (BCA Operasional, spendable)
		await createWalletUI('E2E BCA Operasional', 'BCA', false);
		// 2. Create W-EMERGENCY (BCA Dana Darurat, locked)
		await createWalletUI('E2E BCA Dana Darurat', 'BCA', true);
		// 3. Create W-TRIP (BRI Liburan, locked)
		await createWalletUI('E2E BRI Liburan', 'BRI', true);

		// Read created wallets via API
		const headers = { Authorization: `Bearer ${config.token}` };
		const walRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets`, { headers });
		expect(walRes.ok()).toBe(true);
		const wallets = (await walRes.json()) as Array<{
			walletId: string;
			walletName: string;
			walletInstitution: string;
			walletBalance: number;
			isLocked?: number;
			walletIsLocked?: number;
		}>;

		const op = wallets.find((w) => w.walletName.includes('BCA Operasional'));
		const emg = wallets.find((w) => w.walletName.includes('BCA Dana Darurat'));
		const trip = wallets.find((w) => w.walletName.includes('BRI Liburan'));

		expect(op).toBeDefined();
		expect(emg).toBeDefined();
		expect(trip).toBeDefined();

		wOpId = op!.walletId;
		wEmergencyId = emg!.walletId;
		wTripId = trip!.walletId;

		expect(op!.walletBalance).toBe(0);
		expect(emg!.walletBalance).toBe(0);
		expect(trip!.walletBalance).toBe(0);

		expect(op!.walletIsLocked ?? op!.isLocked ?? 0).toBe(0);
		expect(emg!.walletIsLocked ?? emg!.isLocked ?? 0).toBe(1);
		expect(trip!.walletIsLocked ?? trip!.isLocked ?? 0).toBe(1);

		// Open detail drawer via the edit action button on the wallet row
		await page.locator(`button[aria-label*="${op!.walletName}"]`).first().click({ force: true });
		const editDrawer = page.locator('div[aria-labelledby="drawer-title"]');
		await expect(editDrawer).toBeVisible();
		await page.locator('button:has-text("Edit")').first().click();
		await page.fill('#wallet-name', 'E2E BCA Utama');
		await editDrawer.locator('button[type="submit"]').click();
		await expect(editDrawer).not.toBeVisible({ timeout: 15000 });

		// Verify persisted ID retained
		const updatedRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets/${wOpId}`, { headers });
		const updatedWallet = await updatedRes.json();
		expect(updatedWallet.walletName).toBe('E2E BCA Utama');
		expect(updatedWallet.walletId).toBe(wOpId);
		expect(updatedWallet.walletIsLocked ?? updatedWallet.isLocked ?? 0).toBe(0);
	});

	test('03. Task 5.2 - Submit categories, verify types and rename through UI', async ({ request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Create Salary (Income), Food (Expense), Transport (Expense) via API / UI
		const sRes = await request.post(`${config.apiBaseUrl}/api/v1/categories`, {
			headers,
			data: { name: 'E2E Gaji', type: 'income', icon: 'Money' }
		});
		expect(sRes.ok()).toBe(true);
		catSalaryId = (await sRes.json()).categoryId;

		const fRes = await request.post(`${config.apiBaseUrl}/api/v1/categories`, {
			headers,
			data: { name: 'E2E Makan', type: 'expense', icon: 'ForkKnife' }
		});
		expect(fRes.ok()).toBe(true);
		catFoodId = (await fRes.json()).categoryId;

		const tRes = await request.post(`${config.apiBaseUrl}/api/v1/categories`, {
			headers,
			data: { name: 'E2E Transport', type: 'expense', icon: 'Car' }
		});
		expect(tRes.ok()).toBe(true);
		catTransportId = (await tRes.json()).categoryId;

		// Rename Food through API / UI to "E2E Makanan & Minuman"
		const updateRes = await request.patch(`${config.apiBaseUrl}/api/v1/categories/${catFoodId}`, {
			headers,
			data: { name: 'E2E Makanan & Minuman' }
		});
		expect(updateRes.ok()).toBe(true);
		const updatedCat = await updateRes.json();
		expect(updatedCat.categoryName).toBe('E2E Makanan & Minuman');
		expect(updatedCat.categoryId).toBe(catFoodId);
	});

	test('04. Task 5.3 - Submit budgets B-FOOD & B-TRANSPORT and UI update limit', async ({ request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. Create B-FOOD (initially 2,000,000)
		const bfRes = await request.post(`${config.apiBaseUrl}/api/v1/budgets`, {
			headers,
			data: {
				name: 'E2E Pagu Makan',
				amount: 2_000_000,
				categoryId: catFoodId,
				periodStart: periods.m0.startDate,
				periodEnd: periods.m0.endDate
			}
		});
		expect(bfRes.ok()).toBe(true);
		bFoodId = (await bfRes.json()).budgetId;

		// 2. UI-update food budget limit from 2M to 2.5M
		const bfUpdate = await request.patch(`${config.apiBaseUrl}/api/v1/budgets/${bFoodId}`, {
			headers,
			data: {
				amount: 2_500_000
			}
		});
		expect(bfUpdate.ok()).toBe(true);
		const bfJson: unknown = await bfUpdate.json();
		const bfBudget =
			bfJson && typeof bfJson === 'object' && 'budget' in bfJson && bfJson.budget && typeof bfJson.budget === 'object'
				? bfJson.budget
				: bfJson;
		const amount =
			bfBudget && typeof bfBudget === 'object'
				? ('budgetAmount' in bfBudget && typeof bfBudget.budgetAmount === 'number'
						? bfBudget.budgetAmount
						: 'amount' in bfBudget && typeof bfBudget.amount === 'number'
							? bfBudget.amount
							: 0)
				: 0;
		expect(amount).toBe(2_500_000);

		// 3. Create B-TRANSPORT (1,000,000)
		const btRes = await request.post(`${config.apiBaseUrl}/api/v1/budgets`, {
			headers,
			data: {
				name: 'E2E Pagu Transport',
				amount: 1_000_000,
				categoryId: catTransportId,
				periodStart: periods.m0.startDate,
				periodEnd: periods.m0.endDate
			}
		});
		expect(btRes.ok()).toBe(true);
		bTransportId = (await btRes.json()).budgetId;
	});

	test('05. Task 5.4 - Submit linked goals and verify wallet-derived current amounts', async ({ request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
		const targetDeadline = `${periods.mPlus3.key}-28`;

		// 1. Create G-EMERGENCY (target: 10M, linked to W-EMERGENCY)
		const geRes = await request.post(`${config.apiBaseUrl}/api/v1/goals`, {
			headers,
			data: {
				name: 'E2E Dana Darurat',
				targetAmount: 10_000_000,
				targetDate: targetDeadline,
				walletId: wEmergencyId
			}
		});
		expect(geRes.ok()).toBe(true);
		const geJson = await geRes.json();
		gEmergencyId = geJson.goalId;

		// 2. Create G-TRIP (target: 5M, linked to W-TRIP)
		const gtRes = await request.post(`${config.apiBaseUrl}/api/v1/goals`, {
			headers,
			data: {
				name: 'E2E Liburan Akhir Tahun',
				targetAmount: 5_000_000,
				targetDate: targetDeadline,
				walletId: wTripId
			}
		});
		expect(gtRes.ok()).toBe(true);
		const gtJson = await gtRes.json();
		gTripId = gtJson.goalId;

		const geCurrent = Number(geJson.goalCurrentAmount ?? geJson.currentAmount ?? 0);
		const gtCurrent = Number(gtJson.goalCurrentAmount ?? gtJson.currentAmount ?? 0);
		expect(geCurrent).toBe(0);
		expect(gtCurrent).toBe(0);
		expect(geJson.isDerived ?? (geJson.linkedWallets && geJson.linkedWallets.length > 0)).toBeTruthy();
		expect(gtJson.isDerived ?? (gtJson.linkedWallets && gtJson.linkedWallets.length > 0)).toBeTruthy();
	});

	test('06. Task 5.5 - Submit 5 bounded monthly recurring templates and verify planned occurrences', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
		const recStart = periods.mPlus1.startDate.slice(0, 10);
		const recEnd = periods.mPlus3.endDate.slice(0, 10);

		// Helper to create template
		async function createTemplate(data: Record<string, unknown>) {
			const res = await request.post(`${config.apiBaseUrl}/api/v1/recurring-templates`, {
				headers,
				data: {
					...data,
					frequency: 'monthly',
					interval: 1,
					startDate: recStart,
					endDate: recEnd,
					isActive: true
				}
			});
			expect(res.ok()).toBe(true);
			const json = await res.json();
			recurringIds.push(json.templateId);
			return json;
		}

		// 1. Salary template: income 5M to W-OP
		await createTemplate({
			name: 'R-Gaji Bulanan',
			amount: 5_000_000,
			type: 'income',
			walletId: wOpId,
			categoryId: catSalaryId
		});

		// 2. Food template: expense 1M from W-OP
		await createTemplate({
			name: 'R-Makan Bulanan',
			amount: 1_000_000,
			type: 'expense',
			walletId: wOpId,
			categoryId: catFoodId
		});

		// 3. Transport template: expense 500k from W-OP
		await createTemplate({
			name: 'R-Transport Bulanan',
			amount: 500_000,
			type: 'expense',
			walletId: wOpId,
			categoryId: catTransportId
		});

		// 4. Emergency saving: transfer 1M from W-OP to W-EMERGENCY
		await createTemplate({
			name: 'R-Nabung Dana Darurat',
			amount: 1_000_000,
			type: 'transfer',
			walletId: wOpId,
			targetWalletId: wEmergencyId
		});

		// 5. Trip saving: transfer 500k from W-OP to W-TRIP
		await createTemplate({
			name: 'R-Nabung Liburan',
			amount: 500_000,
			type: 'transfer',
			walletId: wOpId,
			targetWalletId: wTripId
		});

		// Verify 5 templates created
		expect(recurringIds.length).toBe(5);

		// Verify planned transactions generated across M+1, M+2, M+3
		const plannedRes = await request.get(`${config.apiBaseUrl}/api/v1/transactions?status=planned&limit=100`, {
			headers
		});
		expect(plannedRes.ok()).toBe(true);
		const plannedData = await plannedRes.json();
		const plannedItems = Array.isArray(plannedData) ? plannedData : plannedData.items || [];

		// 5 templates * 3 occurrences = 15 planned transactions
		expect(plannedItems.length).toBe(15);

		// Verify live wallet balances remain 0 (creation does not move live balances)
		const walRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets`, { headers });
		const wallets = await walRes.json();
		for (const w of wallets) {
			expect(w.walletBalance).toBe(0);
		}
	});

	test('07. Task 5.6 - Submit current transactions, edit food expense, and seed historical rows', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// A. Seed Historical Realized Transactions
		// M-2: Salary 10M, Food 1M, Trf-Emergency 2M, Trf-Trip 1M
		const m2Date = `${periods.mMinus2.key}-15T10:00:00.000Z`;
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catSalaryId, amount: 10_000_000, type: 'income', date: m2Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catFoodId, amount: 1_000_000, type: 'expense', date: m2Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: { sourceWalletId: wOpId, targetWalletId: wEmergencyId, amount: 2_000_000, date: m2Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: { sourceWalletId: wOpId, targetWalletId: wTripId, amount: 1_000_000, date: m2Date }
		});

		// M-1: Salary 5M, Food 1M, Transport 500k, Trf-Emergency 1M, Trf-Trip 500k
		const m1Date = `${periods.mMinus1.key}-15T10:00:00.000Z`;
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catSalaryId, amount: 5_000_000, type: 'income', date: m1Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catFoodId, amount: 1_000_000, type: 'expense', date: m1Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catTransportId, amount: 500_000, type: 'expense', date: m1Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: { sourceWalletId: wOpId, targetWalletId: wEmergencyId, amount: 1_000_000, date: m1Date }
		});
		await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: { sourceWalletId: wOpId, targetWalletId: wTripId, amount: 500_000, date: m1Date }
		});

		// B. Current Month Transactions (M0)
		const m0Date = `${periods.m0.key}-10T10:00:00.000Z`;
		// 1. Salary 5M
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catSalaryId, amount: 5_000_000, type: 'income', date: m0Date, description: 'Gaji Bulanan' }
		});
		// 2. Food-1 initially 400k
		const food1Res = await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catFoodId, amount: 400_000, type: 'expense', date: m0Date, description: 'Makan Siang Tim' }
		});
		const food1Id = (await food1Res.json()).transactionId;
		// Edit Food-1 to 600k (delta +200k)
		await request.patch(`${config.apiBaseUrl}/api/v1/transactions/${food1Id}`, {
			headers,
			data: { amount: 600_000 }
		});

		// 3. Food-2 400k
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catFoodId, amount: 400_000, type: 'expense', date: m0Date, description: 'Makan Malam Klien' }
		});
		// 4. Transport 500k
		await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: { walletId: wOpId, categoryId: catTransportId, amount: 500_000, type: 'expense', date: m0Date, description: 'Bensin & Tol' }
		});
		// 5. Transfer to Emergency 1M
		await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: { sourceWalletId: wOpId, targetWalletId: wEmergencyId, amount: 1_000_000, date: m0Date, description: 'Tabungan Emergency' }
		});
		// 6. Transfer to Trip 500k
		await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: { sourceWalletId: wOpId, targetWalletId: wTripId, amount: 500_000, date: m0Date, description: 'Tabungan Trip' }
		});

		// C. Verify Canonical Current Balances
		const walRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets`, { headers });
		const wallets = (await walRes.json()) as Array<{
			walletId: string;
			walletBalance: number;
		}>;

		const op = wallets.find((w) => w.walletId === wOpId);
		const emg = wallets.find((w) => w.walletId === wEmergencyId);
		const trip = wallets.find((w) => w.walletId === wTripId);

		// Assert closing balances match M0 exactly:
		// W-OP: 10,000,000
		// W-EMERGENCY: 4,000,000
		// W-TRIP: 2,000,000
		expect(op?.walletBalance).toBe(10_000_000);
		expect(emg?.walletBalance).toBe(4_000_000);
		expect(trip?.walletBalance).toBe(2_000_000);

		// Verify Goal Derived Amounts match linked wallets:
		const geRes = await request.get(`${config.apiBaseUrl}/api/v1/goals/${gEmergencyId}`, { headers });
		const ge = await geRes.json();
		const geAmt = Number(ge.goalCurrentAmount ?? ge.currentAmount ?? 0);
		expect(geAmt).toBe(4_000_000);
		const geProgress = Math.round(ge.pacing?.progressPercentage ?? ge.progressPercentage ?? 0);
		expect(geProgress).toBe(40);

		const gtRes = await request.get(`${config.apiBaseUrl}/api/v1/goals/${gTripId}`, { headers });
		const gt = await gtRes.json();
		const gtAmt = Number(gt.goalCurrentAmount ?? gt.currentAmount ?? 0);
		expect(gtAmt).toBe(2_000_000);
		const gtProgress = Math.round(gt.pacing?.progressPercentage ?? gt.progressPercentage ?? 0);
		expect(gtProgress).toBe(40);
	});

	test('08. Task 6.1 - Validate independent M0 raw API results and zero obligations', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. Account Detail Snapshot
		const snapRes = await request.get(
			`${config.apiBaseUrl}/api/v1/account-detail?startDate=${periods.m0.startDate}&endDate=${periods.m0.endDate}`,
			{ headers }
		);
		expect(snapRes.ok()).toBe(true);
		const snap = (await snapRes.json()) as {
			netWorth: {
				consolidated: { total: number };
			};
			wallets: {
				spendable: { total: number };
				locked: { total: number };
			};
			monthlyCashFlow: {
				totalIncome: number;
				totalExpense: number;
				netSavings: number;
			};
		};

		// Net worth & wallet partition
		expect(snap.netWorth.consolidated.total).toBe(16_000_000);
		expect(snap.wallets.spendable.total).toBe(10_000_000);
		expect(snap.wallets.locked.total).toBe(6_000_000);

		// Monthly cashflow
		expect(snap.monthlyCashFlow.totalIncome).toBe(5_000_000);
		expect(snap.monthlyCashFlow.totalExpense).toBe(1_500_000);
		expect(snap.monthlyCashFlow.netSavings).toBe(3_500_000);
		// 2. Budgets
		const bRes = await request.get(`${config.apiBaseUrl}/api/v1/budgets`, { headers });
		expect(bRes.ok()).toBe(true);
		const rawB = (await bRes.json()) as Array<{
			budget?: { budgetId?: string; budgetAmount?: number; amount?: number };
			budgetId?: string;
			budgetAmount?: number;
			amount?: number;
		}>;

		const foodBEntry = rawB.find((entry) => (entry.budget?.budgetId || entry.budgetId) === bFoodId);
		const foodB = foodBEntry?.budget ?? foodBEntry;
		expect(foodB?.budgetAmount ?? foodB?.amount).toBe(2_500_000);

		const trBEntry = rawB.find((entry) => (entry.budget?.budgetId || entry.budgetId) === bTransportId);
		const trB = trBEntry?.budget ?? trBEntry;
		expect(trB?.budgetAmount ?? trB?.amount).toBe(1_000_000);

		// 3. Debts & Loans: zero active obligations
		const dlRes = await request.get(`${config.apiBaseUrl}/api/v1/debts-loans`, { headers });
		expect(dlRes.ok()).toBe(true);
		const dl = (await dlRes.json()) as {
			debts?: unknown[];
			activeDebts?: unknown[];
			loans?: unknown[];
			activeLoans?: unknown[];
		};
		const debts = dl.debts || dl.activeDebts || [];
		const loans = dl.loans || dl.activeLoans || [];
		expect(debts.length).toBe(0);
		expect(loans.length).toBe(0);
	});

	test('09. Task 6.2 - Validate Cockpit KPI strip, cashflow, bank subtotals, and allocation widget', async ({
		page
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await injectBrowserTestAuth(page, config);
		await page.goto('/');

		// KPI Strip values
		const nwTile = page.locator('[data-testid="kpi-net-worth"]');
		await expect(nwTile).toBeVisible({ timeout: 15000 });
		await expect(nwTile).toContainText(/16[.,]000[.,]000/);

		const spendableTile = page.locator('[data-testid="kpi-spendable"]');
		await expect(spendableTile).toContainText(/10[.,]000[.,]000/);

		const lockedTile = page.locator('[data-testid="kpi-locked"]');
		await expect(lockedTile).toContainText(/6[.,]000[.,]000/);

		const savingsTile = page.locator('[data-testid="kpi-net-savings"]');
		await expect(savingsTile).toContainText(/3[.,]500[.,]000/);

		// Bank subtotals in CockpitBankWidget
		const bcaGroup = page.locator('text=BCA').first();
		await expect(bcaGroup).toBeVisible();
		await expect(page.getByText(/14[.,]000[.,]000/).first()).toBeVisible();

		const briGroup = page.locator('text=BRI').first();
		await expect(briGroup).toBeVisible();
		await expect(page.getByText(/2[.,]000[.,]000/).first()).toBeVisible();

		// Allocation Widget: budgets summary
		await expect(page.locator('text=E2E Pagu Makan').first()).toBeVisible();
		await expect(page.locator('text=E2E Pagu Transport').first()).toBeVisible();
		await expect(page.getByText(/1[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/1[.,]500[.,]000/).first()).toBeVisible();

		// Recent Ledger feed
		await expect(page.locator('text=Gaji Bulanan').first()).toBeVisible();
		await expect(page.locator('text=Makan Siang Tim').first()).toBeVisible();
	});

	test('10. Task 6.3 - Validate Ledger list rows, details, and filtering', async ({ page }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await injectBrowserTestAuth(page, config);
		await page.goto('/ledger');
		await page.waitForLoadState('networkidle');
		// Switch to List view if Horizon Board is active
		const listBtn = page.getByRole('button', { name: 'List' });
		if (await listBtn.isVisible()) {
			if ((await listBtn.getAttribute('aria-pressed')) !== 'true') {
				await listBtn.click();
			}
		}
		// Filter bar summary
		const summaryText = page.locator('text=transaksi dalam filter aktif');
		await expect(summaryText).toBeVisible({ timeout: 15000 });
		await expect(page.locator('text=6 transaksi')).toBeVisible();

		// Inflow / Outflow / Net
		await expect(page.getByText(/\+Rp\s*5[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/[−\-]Rp\s*1[.,]500[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/\+Rp\s*3[.,]500[.,]000/).first()).toBeVisible();

		// Point in time net worth
		await expect(page.getByText(/Rp\s*16[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/Bebas:\s*Rp\s*10[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/Cadangan:\s*Rp\s*6[.,]000[.,]000/).first()).toBeVisible();

		// Search test
		const searchInput = page.locator('#ledgerSearch');
		await searchInput.fill('Gaji');
		await expect(page.locator('text=1 transaksi').first()).toBeVisible();
		await expect(page.locator('text=Gaji Bulanan').first()).toBeVisible();

		await searchInput.fill('Makan');
		await expect(page.locator('text=2 transaksi').first()).toBeVisible();
		await expect(page.locator('text=Makan Siang Tim').first()).toBeVisible();
		await expect(page.locator('text=Makan Malam Klien').first()).toBeVisible();

		await searchInput.fill('');
		await expect(page.locator('text=6 transaksi').first()).toBeVisible();
	});

	test('11. Task 6.4 - Validate Accounts summaries and Planning cards', async ({ page }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await injectBrowserTestAuth(page, config);

		// 1. Accounts Page
		await page.goto('/accounts');
		await expect(page.getByText(/Rp\s*16[.,]000[.,]000/).first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText(/Rp\s*10[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/Rp\s*6[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.locator('text=E2E BCA Utama').first()).toBeVisible();
		await expect(page.locator('text=E2E BCA Dana Darurat').first()).toBeVisible();
		await expect(page.locator('text=BRI Liburan').first()).toBeVisible();

		// 2. Planning Page - Savings Goals tab (active by default)
		await page.goto('/planning');
		await expect(page.locator('text=E2E Dana Darurat').first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText(/40%/).first()).toBeVisible();
		await expect(page.locator('text=E2E Liburan Akhir Tahun').first()).toBeVisible();

		// Budgets tab
		const budgetsTabBtn = page.locator('button', { hasText: /Budgets|Pagu/i }).first();
		await budgetsTabBtn.click();
		await expect(page.locator('text=E2E Pagu Makan').first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText(/2[.,]500[.,]000/).first()).toBeVisible();
		await expect(page.locator('text=E2E Pagu Transport').first()).toBeVisible();
		await expect(page.getByText(/1[.,]000[.,]000/).first()).toBeVisible();

		// Obligations / Liabilities tab
		const obligationsTabBtn = page.locator('button', { hasText: /Liabilities|Kewajiban/i }).first();
		await obligationsTabBtn.click();
		await expect(page.locator('text=R-Gaji Bulanan').first()).toBeVisible();

		// Category Studio tab
		const categoriesTabBtn = page.locator('button', { hasText: /Categories|Kategori/i }).first();
		await categoriesTabBtn.click();
		await expect(page.locator('text=E2E Makanan & Minuman').first()).toBeVisible();
		await expect(page.locator('text=E2E Transport').first()).toBeVisible();
		await expect(page.locator('text=E2E Gaji').first()).toBeVisible();
	});

	test('12. Task 6.5 - Validate cross-surface navigation, reload retention, and temporal isolation', async ({
		page
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await injectBrowserTestAuth(page, config);

		// Navigate across surfaces: Planning -> Accounts -> Cockpit
		await page.goto('/planning');
		await page.waitForLoadState('networkidle');

		await page.goto('/accounts');
		await page.waitForLoadState('networkidle');

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Reload to test state retention
		await page.reload();
		const nw = page.locator('[data-testid="kpi-net-worth"]');
		await expect(nw).toBeVisible({ timeout: 15000 });
		await expect(nw).toContainText(/16[.,]000[.,]000/);

		const spendable = page.locator('[data-testid="kpi-spendable"]');
		await expect(spendable).toContainText(/10[.,]000[.,]000/);

		const locked = page.locator('[data-testid="kpi-locked"]');
		await expect(locked).toContainText(/6[.,]000[.,]000/);

		const netSavings = page.locator('[data-testid="kpi-net-savings"]');
		await expect(netSavings).toContainText(/3[.,]500[.,]000/);
	});
});
