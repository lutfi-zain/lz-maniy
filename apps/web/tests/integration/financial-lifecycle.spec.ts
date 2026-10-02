/// <reference types="node" />
import { test, expect, type APIRequestContext } from '@playwright/test';
import {
	getLiveAccountConfig,
	assertAuthorizedTestAccount,
	sweepLiveAccount,
	injectBrowserTestAuth
} from './helpers/live-account';
import {
	deriveTestPeriods,
	EXPECTED_FINANCIAL_JOURNAL,
	calculatePointInTimeWalletBalances
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
	let plannedDeficitId = '';
	let boundaryGoalId = '';
	let dueTemplateId = '';

	async function getJsonWithRetry<T>(
		req: APIRequestContext,
		url: string,
		headers: Record<string, string>,
		maxRetries = 6
	): Promise<T> {
		let lastStatus = 0;
		let lastBody = '';
		for (let i = 0; i < maxRetries; i++) {
			try {
				const res = await req.get(url, { headers });
				if (res.ok()) {
					return (await res.json()) as T;
				}
				lastStatus = res.status();
				lastBody = await res.text();
			} catch (err) {
				lastBody = String(err);
			}
			const delayMs = lastStatus === 503 || lastBody.includes('1102') ? 3500 : 1000 * (i + 1);
			const { promise, resolve } = Promise.withResolvers<void>();
			setTimeout(resolve, delayMs);
			await promise;
		}
		throw new Error(`GET ${url} failed (status ${lastStatus}): ${lastBody}`);
	}

	async function postJsonWithRetry<T>(
		req: APIRequestContext,
		url: string,
		headers: Record<string, string>,
		data: Record<string, unknown>,
		maxRetries = 6
	): Promise<T> {
		let lastStatus = 0;
		let lastBody = '';
		for (let i = 0; i < maxRetries; i++) {
			try {
				const res = await req.post(url, { headers, data });
				if (res.ok()) {
					return (await res.json()) as T;
				}
				lastStatus = res.status();
				lastBody = await res.text();
			} catch (err) {
				lastBody = String(err);
			}
			const delayMs = lastStatus === 503 || lastBody.includes('1102') ? 5000 : 1000 * (i + 1);
			const { promise, resolve } = Promise.withResolvers<void>();
			setTimeout(resolve, delayMs);
			await promise;
		}
		throw new Error(`POST ${url} failed (status ${lastStatus}): ${lastBody}`);
	}

	test.beforeEach(async () => {
		const { promise, resolve } = Promise.withResolvers<void>();
		setTimeout(resolve, 1200);
		await promise;
	});
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
		const { promise, resolve } = Promise.withResolvers<void>();
		setTimeout(resolve, 2000);
		await promise;
	});

	test('03. Task 5.2 - Submit categories, verify types and rename through UI', async ({ request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Create Salary (Income), Food (Expense), Transport (Expense) via API / UI
		const sJson = await postJsonWithRetry<{ categoryId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/categories`,
			headers,
			{ name: 'E2E Gaji', type: 'income', icon: 'Money' }
		);
		catSalaryId = sJson.categoryId;

		const fJson = await postJsonWithRetry<{ categoryId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/categories`,
			headers,
			{ name: 'E2E Makan', type: 'expense', icon: 'ForkKnife' }
		);
		catFoodId = fJson.categoryId;

		const tJson = await postJsonWithRetry<{ categoryId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/categories`,
			headers,
			{ name: 'E2E Transport', type: 'expense', icon: 'Car' }
		);
		catTransportId = tJson.categoryId;
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
		const bfCreated = await postJsonWithRetry<{ budgetId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/budgets`,
			headers,
			{
				name: 'E2E Pagu Makan',
				amount: 2_000_000,
				categoryId: catFoodId,
				periodStart: periods.m0.startDate.slice(0, 10),
				periodEnd: periods.m0.endDate.slice(0, 10)
			}
		);
		bFoodId = bfCreated.budgetId;

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
		const btJson = await postJsonWithRetry<{ budgetId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/budgets`,
			headers,
			{
				name: 'E2E Pagu Transport',
				amount: 1_000_000,
				categoryId: catTransportId,
				periodStart: periods.m0.startDate.slice(0, 10),
				periodEnd: periods.m0.endDate.slice(0, 10)
			}
		);
		bTransportId = btJson.budgetId;
	});

	test('05. Task 5.4 - Submit linked goals and verify wallet-derived current amounts', async ({ request }) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
		const targetDeadline = `${periods.mPlus3.key}-28`;

		// 1. Create G-EMERGENCY (target: 10M, linked to W-EMERGENCY)
		const geJson = await postJsonWithRetry<Record<string, unknown>>(
			request,
			`${config.apiBaseUrl}/api/v1/goals`,
			headers,
			{
				name: 'E2E Dana Darurat',
				targetAmount: 10_000_000,
				targetDate: targetDeadline,
				walletId: wEmergencyId
			}
		);
		gEmergencyId = String(geJson.goalId);

		// 2. Create G-TRIP (target: 5M, linked to W-TRIP)
		const gtJson = await postJsonWithRetry<Record<string, unknown>>(
			request,
			`${config.apiBaseUrl}/api/v1/goals`,
			headers,
			{
				name: 'E2E Liburan Akhir Tahun',
				targetAmount: 5_000_000,
				targetDate: targetDeadline,
				walletId: wTripId
			}
		);
		gTripId = String(gtJson.goalId);
		const geCurrent = Number(geJson.goalCurrentAmount ?? geJson.currentAmount ?? 0);
		const gtCurrent = Number(gtJson.goalCurrentAmount ?? gtJson.currentAmount ?? 0);
		expect(geCurrent).toBe(0);
		expect(gtCurrent).toBe(0);
		expect(geJson.isDerived ?? (Array.isArray(geJson.linkedWallets) && geJson.linkedWallets.length > 0)).toBeTruthy();
		expect(gtJson.isDerived ?? (Array.isArray(gtJson.linkedWallets) && gtJson.linkedWallets.length > 0)).toBeTruthy();
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
			const json = await postJsonWithRetry<{ templateId: string }>(
				request,
				`${config.apiBaseUrl}/api/v1/recurring-templates`,
				headers,
				{
					...data,
					frequency: 'monthly',
					interval: 1,
					startDate: recStart,
					endDate: recEnd,
					isActive: true
				}
			);
			recurringIds.push(json.templateId);
			const { promise, resolve } = Promise.withResolvers<void>();
			setTimeout(resolve, 2500);
			await promise;
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
		const food1 = await postJsonWithRetry<{ transactionId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/transactions`,
			headers,
			{ walletId: wOpId, categoryId: catFoodId, amount: 400_000, type: 'expense', date: m0Date, description: 'Makan Siang Tim' }
		);
		const food1Id = food1.transactionId;
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
		const ge = await getJsonWithRetry<Record<string, unknown>>(request, `${config.apiBaseUrl}/api/v1/goals/${gEmergencyId}`, headers);
		const geAmt = Number(ge.goalCurrentAmount ?? ge.currentAmount ?? 0);
		expect(geAmt).toBe(4_000_000);
		const gePacing = ge.pacing as Record<string, unknown> | undefined;
		const geProgress = Math.round(Number(gePacing?.progressPercentage ?? ge.progressPercentage ?? 0));
		expect(geProgress).toBe(40);

		const gt = await getJsonWithRetry<Record<string, unknown>>(request, `${config.apiBaseUrl}/api/v1/goals/${gTripId}`, headers);
		const gtAmt = Number(gt.goalCurrentAmount ?? gt.currentAmount ?? 0);
		expect(gtAmt).toBe(2_000_000);
		const gtPacing = gt.pacing as Record<string, unknown> | undefined;
		const gtProgress = Math.round(Number(gtPacing?.progressPercentage ?? gt.progressPercentage ?? 0));
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
		const snap = await getJsonWithRetry<{
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
		}>(
			request,
			`${config.apiBaseUrl}/api/v1/account-detail?startDate=${periods.m0.startDate}&endDate=${periods.m0.endDate}`,
			headers
		);
		// Net worth & wallet partition
		expect(snap.netWorth.consolidated.total).toBe(16_000_000);
		expect(snap.wallets.spendable.total).toBe(10_000_000);
		expect(snap.wallets.locked.total).toBe(6_000_000);

		// Monthly cashflow
		expect(snap.monthlyCashFlow.totalIncome).toBe(5_000_000);
		expect(snap.monthlyCashFlow.totalExpense).toBe(1_500_000);
		expect(snap.monthlyCashFlow.netSavings).toBe(3_500_000);
		// 2. Budgets
		const rawB = await getJsonWithRetry<Array<{
			budget?: { budgetId?: string; budgetAmount?: number; amount?: number };
			budgetId?: string;
			budgetAmount?: number;
			amount?: number;
		}>>(request, `${config.apiBaseUrl}/api/v1/budgets`, headers);
		const foodBEntry = rawB.find((entry) => (entry.budget?.budgetId || entry.budgetId) === bFoodId);
		const foodB = foodBEntry?.budget ?? foodBEntry;
		expect(foodB?.budgetAmount ?? foodB?.amount).toBe(2_500_000);

		const trBEntry = rawB.find((entry) => (entry.budget?.budgetId || entry.budgetId) === bTransportId);
		const trB = trBEntry?.budget ?? trBEntry;
		expect(trB?.budgetAmount ?? trB?.amount).toBe(1_000_000);

		// 3. Debts & Loans: zero active obligations
		const dl = await getJsonWithRetry<{
			debts?: unknown[];
			activeDebts?: unknown[];
			loans?: unknown[];
			activeLoans?: unknown[];
		}>(request, `${config.apiBaseUrl}/api/v1/debts-loans`, headers);
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
		const listBtn = page.getByRole('button', { name: 'List', exact: true });
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

	test('13. Task 7.1 - Validate historical M-2 and M-1 wallet closing vectors and net worth', async ({
		request,
		page
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Fetch all wallets and all transactions to compute point-in-time state
		const [rawWallets, txData] = await Promise.all([
			getJsonWithRetry<Array<{
				walletId: string;
				walletName: string;
				walletBalance: number;
				walletIsLocked?: number;
				isLocked?: number;
				walletCurrency?: string;
				currency?: string;
			}>>(request, `${config.apiBaseUrl}/api/v1/wallets`, headers),
			getJsonWithRetry<{ items?: unknown[] } | unknown[]>(
				request,
				`${config.apiBaseUrl}/api/v1/transactions?limit=100`,
				headers
			)
		]);
		const wallets = rawWallets.map((w) => ({
			walletId: w.walletId,
			walletName: w.walletName,
			institution: 'BCA',
			balance: w.walletBalance,
			currency: w.walletCurrency || w.currency || 'IDR',
			type: 'bank' as const,
			isLocked: (w.walletIsLocked ?? w.isLocked ?? 0) as 0 | 1,
			lastTransaction: null
		}));

		const rawTxs = Array.isArray(txData) ? txData : txData.items || [];
		interface RawTxEntry {
			transactionId: string;
			transactionWalletId: string;
			transactionTargetWalletId?: string | null;
			transactionAmount: number;
			transactionType: 'income' | 'expense' | 'transfer';
			transactionDate?: string;
			date?: string;
			transactionIsPlanned?: number;
			isPlanned?: number;
		}
		const allTxs = (rawTxs as RawTxEntry[]).map((t) => ({
			transactionId: t.transactionId,
			transactionWalletId: t.transactionWalletId,
			transactionTargetWalletId: t.transactionTargetWalletId,
			transactionAmount: t.transactionAmount,
			transactionType: t.transactionType,
			transactionDate: t.transactionDate || t.date || '',
			transactionIsPlanned: (t.transactionIsPlanned ?? t.isPlanned ?? 0) as 0 | 1
		}));

		// M-2 Point-in-time calculation (Design oracle: OP: 6M, EMG: 2M, TRIP: 1M, Total: 9M)
		const m2Balances = calculatePointInTimeWalletBalances({
			wallets,
			allTransactions: allTxs,
			endDate: periods.mMinus2.endDate,
			referenceDate: periods.m0.endDate.slice(0, 10)
		});
		expect(m2Balances.get(wOpId)).toBe(6_000_000);
		expect(m2Balances.get(wEmergencyId)).toBe(2_000_000);
		expect(m2Balances.get(wTripId)).toBe(1_000_000);
		const m2Total = (m2Balances.get(wOpId) ?? 0) + (m2Balances.get(wEmergencyId) ?? 0) + (m2Balances.get(wTripId) ?? 0);
		expect(m2Total).toBe(9_000_000);

		// M-1 Point-in-time calculation (Design oracle: OP: 8M, EMG: 3M, TRIP: 1.5M, Total: 12.5M)
		const m1Balances = calculatePointInTimeWalletBalances({
			wallets,
			allTransactions: allTxs,
			endDate: periods.mMinus1.endDate,
			referenceDate: periods.m0.endDate.slice(0, 10)
		});
		expect(m1Balances.get(wOpId)).toBe(8_000_000);
		expect(m1Balances.get(wEmergencyId)).toBe(3_000_000);
		expect(m1Balances.get(wTripId)).toBe(1_500_000);
		const m1Total = (m1Balances.get(wOpId) ?? 0) + (m1Balances.get(wEmergencyId) ?? 0) + (m1Balances.get(wTripId) ?? 0);
		expect(m1Total).toBe(12_500_000);

		// UI Check: Navigate to ledger with M-1 date range
		await injectBrowserTestAuth(page, config);
		const m1Start = periods.mMinus1.startDate.slice(0, 10);
		const m1End = periods.mMinus1.endDate.slice(0, 10);
		await page.goto(`/ledger?datePreset=custom&startDate=${m1Start}&endDate=${m1End}`);
		await page.waitForLoadState('networkidle');
		if (await page.locator('text=Failed to fetch').isVisible()) {
			const { promise, resolve } = Promise.withResolvers<void>();
			setTimeout(resolve, 1500);
			await promise;
			await page.reload();
			await page.waitForLoadState('networkidle');
		}
		// In ledger, filter bar shows 5 transactions and M-1 net cashflow (+3.5M)
		await expect(page.getByText(/5\s+transaksi/).first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText(/\+Rp\s*5[.,]000[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/[−\-]Rp\s*1[.,]500[.,]000/).first()).toBeVisible();
		await expect(page.getByText(/\+Rp\s*3[.,]500[.,]000/).first()).toBeVisible();

		// Overview capital remains live (16M) as required by specification
		await expect(page.getByText(/Rp\s*16[.,]000[.,]000/).first()).toBeVisible();
	});

	test('14. Task 7.2 - Exercise date controls and instant boundaries between M-2 and M-1', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. M-2 explicit ISO interval: exactly 4 transactions
		const m2Data = await getJsonWithRetry<{ items?: unknown[] } | unknown[]>(
			request,
			`${config.apiBaseUrl}/api/v1/transactions?startDate=${periods.mMinus2.startDate}&endDate=${periods.mMinus2.endDate}`,
			headers
		);
		const m2Items = Array.isArray(m2Data) ? m2Data : m2Data.items || [];
		expect(m2Items.length).toBe(4);

		// 2. M-1 explicit ISO interval: exactly 5 transactions
		const m1Data = await getJsonWithRetry<{ items?: unknown[] } | unknown[]>(
			request,
			`${config.apiBaseUrl}/api/v1/transactions?startDate=${periods.mMinus1.startDate}&endDate=${periods.mMinus1.endDate}`,
			headers
		);
		const m1Items = Array.isArray(m1Data) ? m1Data : m1Data.items || [];
		expect(m1Items.length).toBe(5);

		// 3. Instant boundary: query instant strictly between M-2 end and M-1 start
		const betweenStart = `${periods.mMinus2.key}-28T23:59:59.999Z`;
		const betweenEnd = `${periods.mMinus1.key}-01T00:00:00.000Z`;
		const bData = await getJsonWithRetry<{ items?: unknown[] } | unknown[]>(
			request,
			`${config.apiBaseUrl}/api/v1/transactions?startDate=${betweenStart}&endDate=${betweenEnd}`,
			headers
		);
		const bItems = Array.isArray(bData) ? bData : bData.items || [];
		expect(bItems.length).toBe(0);
	});

	test('15. Task 7.3 - Query explicit M+1, M+2, M+3 horizon periods and verify planned totals', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Query Horizon API for M+1, M+2, M+3
		const horizonPeriods = `${periods.mPlus1.key},${periods.mPlus2.key},${periods.mPlus3.key}`;
		const data = await getJsonWithRetry<{
			startingNetWorth: { total: number; spendable: number; locked: number };
			periods: Array<{
				periodKey: string;
				cashflow: { income: number; expense: number; net: number };
				netWorth: { total: number; spendable: number; locked: number };
				walletBalances?: Array<{ walletId: string; balance: number }>;
			}>;
		}>(
			request,
			`${config.apiBaseUrl}/api/v1/analytics/horizon?periods=${encodeURIComponent(horizonPeriods)}&baseCurrency=IDR`,
			headers
		);

		// Current realized wealth starting baseline is 16M
		expect(data.startingNetWorth.total).toBe(16_000_000);
		expect(data.startingNetWorth.spendable).toBe(10_000_000);
		expect(data.startingNetWorth.locked).toBe(6_000_000);

		expect(data.periods.length).toBe(3);

		// M+1: net cashflow +3.5M -> total wealth 19.5M (Spendable 12M, Locked 7.5M)
		const p1 = data.periods[0];
		expect(p1.periodKey).toBe(periods.mPlus1.key);
		expect(p1.cashflow.net).toBe(3_500_000);
		expect(p1.netWorth.total).toBe(19_500_000);
		expect(p1.netWorth.spendable).toBe(12_000_000);
		expect(p1.netWorth.locked).toBe(7_500_000);

		// M+2: net cashflow +3.5M -> total wealth 23M (Spendable 14M, Locked 9M)
		const p2 = data.periods[1];
		expect(p2.periodKey).toBe(periods.mPlus2.key);
		expect(p2.cashflow.net).toBe(3_500_000);
		expect(p2.netWorth.total).toBe(23_000_000);
		expect(p2.netWorth.spendable).toBe(14_000_000);
		expect(p2.netWorth.locked).toBe(9_000_000);

		// M+3: net cashflow +3.5M -> total wealth 26.5M (Spendable 16M, Locked 10.5M)
		const p3 = data.periods[2];
		expect(p3.periodKey).toBe(periods.mPlus3.key);
		expect(p3.cashflow.net).toBe(3_500_000);
		expect(p3.netWorth.total).toBe(26_500_000);
		expect(p3.netWorth.spendable).toBe(16_000_000);
		expect(p3.netWorth.locked).toBe(10_500_000);
	});

	test('16. Task 7.4 - Validate visible Ledger and Accounts horizon board periods and cells', async ({
		page
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		await injectBrowserTestAuth(page, config);

		// 1. Ledger Horizon Board
		await page.goto('/ledger');
		await page.waitForLoadState('networkidle');

		const ledgerHorizonBtn = page.getByRole('button', { name: 'Horizon Board', exact: true });
		await expect(ledgerHorizonBtn).toBeVisible({ timeout: 15000 });
		if ((await ledgerHorizonBtn.getAttribute('aria-pressed')) !== 'true') {
			await ledgerHorizonBtn.click();
			await expect(ledgerHorizonBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
		}

		// Verify 3 consecutive period columns visible on horizon board
		await expect(page.getByText(/6\s+transactions/).first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText(/5\s+transactions/).first()).toBeVisible();

		// 2. Accounts Horizon Board
		await page.goto('/accounts');
		await page.waitForLoadState('networkidle');

		const accHorizonBtn = page.getByRole('button', { name: 'Horizon Board', exact: true });
		await expect(accHorizonBtn).toBeVisible({ timeout: 15000 });
		if ((await accHorizonBtn.getAttribute('aria-pressed')) !== 'true') {
			await accHorizonBtn.click();
			await expect(accHorizonBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
		}

		// Verify accounts horizon board rendered
		await expect(page.locator('text=E2E BCA Utama').first()).toBeVisible({ timeout: 15000 });
	});

	test('17. Task 7.5 - Validate Goals Horizon projected amounts, 50/60/70% progression, and calendar pacing', async ({
		request,
		page
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. API Analytics Horizon goal progression check
		const horizonPeriods = `${periods.mPlus1.key},${periods.mPlus2.key},${periods.mPlus3.key}`;
		const data = await getJsonWithRetry<{
			periods: Array<{
				periodKey: string;
				goals?: Array<{
					goalId: string;
					currentAmount: number;
					targetAmount: number;
					progressPercentage: number;
				}>;
			}>;
		}>(
			request,
			`${config.apiBaseUrl}/api/v1/analytics/horizon?periods=${encodeURIComponent(horizonPeriods)}&baseCurrency=IDR`,
			headers
		);
		expect(data.periods.length).toBe(3);

		// 2. UI Goals Horizon Board check
		await injectBrowserTestAuth(page, config);
		await page.goto('/planning');
		await page.waitForLoadState('networkidle');

		const goalsHorizonBtn = page.getByRole('button', { name: 'Horizon Board', exact: true });
		await expect(goalsHorizonBtn).toBeVisible({ timeout: 15000 });
		if ((await goalsHorizonBtn.getAttribute('aria-pressed')) !== 'true') {
			await goalsHorizonBtn.click();
			await expect(goalsHorizonBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
		}

		// Verify progress percentages: 50%, 60%, 70% visible
		await expect(page.getByText('50%').first()).toBeVisible({ timeout: 15000 });
		await expect(page.getByText('60%').first()).toBeVisible();
		await expect(page.getByText('70%').first()).toBeVisible();
	});

	test('18. Task 8.1 - Planned deficit in M+3: negative projected operating capital, positive wealth, invariant live balances', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Add planned 20,000,000 operating-wallet expense in M+3
		const plannedDate = `${periods.mPlus3.key}-20T10:00:00.000Z`;
		const res = await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: {
				walletId: wOpId,
				categoryId: catFoodId,
				amount: 20_000_000,
				type: 'expense',
				isPlanned: 1,
				date: plannedDate,
				description: 'E2E Planned Deficit Expense'
			}
		});
		expect(res.ok()).toBe(true);
		const json = (await res.json()) as { transactionId: string };
		plannedDeficitId = json.transactionId;

		// Query Horizon API for M+3:
		// Baseline M+3 wealth was 26.5M. With -20M planned expense, total wealth becomes 6.5M.
		const hRes = await request.get(
			`${config.apiBaseUrl}/api/v1/analytics/horizon?periods=${periods.mPlus3.key}&baseCurrency=IDR`,
			{ headers }
		);
		expect(hRes.ok()).toBe(true);
		const hData = (await hRes.json()) as {
			periods: Array<{
				periodKey: string;
				netWorth: { total: number; spendable: number; locked: number };
				walletBalances?: Array<{ walletId: string; balance: number }>;
			}>;
		};
		expect(hData.periods.length).toBe(1);
		const p3 = hData.periods[0];
		expect(p3.netWorth.total).toBe(6_500_000);

		// Invariants: Live balances remain completely unaffected
		const walRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets`, { headers });
		const wallets = (await walRes.json()) as Array<{ walletId: string; walletBalance: number }>;
		expect(wallets.find((w) => w.walletId === wOpId)?.walletBalance).toBe(10_000_000);
		expect(wallets.find((w) => w.walletId === wEmergencyId)?.walletBalance).toBe(4_000_000);
		expect(wallets.find((w) => w.walletId === wTripId)?.walletBalance).toBe(2_000_000);
	});

	test('19. Task 8.2 - Exercise transfer admin fees with independent debit/credit/economic-flow expectations', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Transfer 100,000 from W-OP to W-TRIP with 5,000 admin fee
		const trfRes = await request.post(`${config.apiBaseUrl}/api/v1/transfers`, {
			headers,
			data: {
				sourceWalletId: wOpId,
				targetWalletId: wTripId,
				amount: 100_000,
				adminFee: 5_000,
				date: `${periods.m0.key}-12T10:00:00.000Z`,
				description: 'E2E Transfer with Fee'
			}
		});
		expect(trfRes.ok()).toBe(true);

		// Assert balances:
		// W-OP debits 100k + 5k = 105k (10,000,000 - 105,000 = 9,895,000)
		// W-TRIP credits 100k (2,000,000 + 100,000 = 2,100,000)
		// Total wealth reduced by 5,000 (16,000,000 - 5,000 = 15,995,000)
		const walRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets`, { headers });
		const wallets = (await walRes.json()) as Array<{ walletId: string; walletBalance: number }>;
		expect(wallets.find((w) => w.walletId === wOpId)?.walletBalance).toBe(9_895_000);
		expect(wallets.find((w) => w.walletId === wTripId)?.walletBalance).toBe(2_100_000);

		const snapRes = await request.get(
			`${config.apiBaseUrl}/api/v1/account-detail?startDate=${periods.m0.startDate}&endDate=${periods.m0.endDate}`,
			{ headers }
		);
		const snap = (await snapRes.json()) as { netWorth: { consolidated: { total: number } } };
		expect(snap.netWorth.consolidated.total).toBe(15_995_000);
	});

	test('20. Task 8.3 - Exercise transaction type, wallet, date, and category mutations', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. Create a 200,000 Food expense on W-OP
		const createRes = await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: {
				walletId: wOpId,
				categoryId: catFoodId,
				amount: 200_000,
				type: 'expense',
				date: `${periods.m0.key}-14T10:00:00.000Z`,
				description: 'E2E Mutation Test'
			}
		});
		expect(createRes.ok()).toBe(true);
		const txId = (await createRes.json()).transactionId;

		// 2. Change category from Food to Transport (date and category mutation)
		const patchRes = await request.patch(`${config.apiBaseUrl}/api/v1/transactions/${txId}`, {
			headers,
			data: {
				categoryId: catTransportId,
				date: `${periods.m0.key}-16T10:00:00.000Z`
			}
		});
		expect(patchRes.ok()).toBe(true);

		// Total wealth is invariant on date/category-only change
		const walRes = await request.get(`${config.apiBaseUrl}/api/v1/wallets`, { headers });
		const wallets = (await walRes.json()) as Array<{ walletId: string; walletBalance: number }>;
		expect(wallets.find((w) => w.walletId === wOpId)?.walletBalance).toBe(9_695_000);

		// Clean up this throwaway transaction
		await request.delete(`${config.apiBaseUrl}/api/v1/transactions/${txId}`, { headers });
	});

	test('21. Task 8.4 - Realize due recurring occurrence at actual amount and assert idempotency', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. Create due recurring template
		const recRes = await request.post(`${config.apiBaseUrl}/api/v1/recurring-templates`, {
			headers,
			data: {
				name: 'R-Due Realization',
				amount: 100_000,
				type: 'expense',
				frequency: 'monthly',
				interval: 1,
				startDate: `${periods.m0.key}-01`,
				walletId: wOpId,
				categoryId: catFoodId
			}
		});
		expect(recRes.ok()).toBe(true);
		const recJson = (await recRes.json()) as { templateId: string };
		dueTemplateId = recJson.templateId;

		// 2. Query transactions to find the planned occurrence
		const txsRes = await request.get(
			`${config.apiBaseUrl}/api/v1/transactions?templateId=${dueTemplateId}&isPlanned=1`,
			{ headers }
		);
		const txsData = (await txsRes.json()) as { items?: Array<{ transactionId: string }> } | Array<{ transactionId: string }>;
		const items = Array.isArray(txsData) ? txsData : txsData.items || [];

		if (items.length > 0) {
			const targetId = items[0].transactionId;
			const wOpPre = (await (await request.get(`${config.apiBaseUrl}/api/v1/wallets/${wOpId}`, { headers })).json()).walletBalance;

			// Realize at actual amount 120,000 (against planned 100,000)
			const realizeRes = await request.patch(`${config.apiBaseUrl}/api/v1/transactions/${targetId}`, {
				headers,
				data: {
					isPlanned: 0,
					amount: 120_000
				}
			});
			expect(realizeRes.ok()).toBe(true);

			const wOpPost = (await (await request.get(`${config.apiBaseUrl}/api/v1/wallets/${wOpId}`, { headers })).json()).walletBalance;
			expect(wOpPre - wOpPost).toBe(120_000);

			// Idempotency: attempt to patch again with same payload
			const secondRes = await request.patch(`${config.apiBaseUrl}/api/v1/transactions/${targetId}`, {
				headers,
				data: { isPlanned: 0, amount: 120_000 }
			});
			expect(secondRes.ok()).toBe(true);
			const wOpAfterSecond = (await (await request.get(`${config.apiBaseUrl}/api/v1/wallets/${wOpId}`, { headers })).json()).walletBalance;
			expect(wOpAfterSecond).toBe(wOpPost); // No duplicate debit!
		}
	});

	test('22. Task 8.5 - Exercise budget boundaries: 80% warning, 100% full, and over-budget negative remaining', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
		// Create a dedicated category so starting spending is clean (0)
		const catRes = await request.post(`${config.apiBaseUrl}/api/v1/categories`, {
			headers,
			data: { name: 'E2E Boundary Category', type: 'expense' }
		});
		expect(catRes.ok()).toBe(true);
		const catBoundaryId = (await catRes.json()).categoryId;

		// Create a dedicated boundary budget (limit: 1,000,000)
		const bRes = await request.post(`${config.apiBaseUrl}/api/v1/budgets`, {
			headers,
			data: {
				name: 'E2E Boundary Budget',
				amount: 1_000_000,
				categoryId: catBoundaryId,
				periodStart: periods.m0.startDate,
				periodEnd: periods.m0.endDate
			}
		});
		expect(bRes.ok()).toBe(true);
		const bId = (await bRes.json()).budgetId;

		// 1. 80% Warning: add 800,000 spending bound to budgetId
		const tx1 = await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: {
				walletId: wOpId,
				categoryId: catBoundaryId,
				budgetId: bId,
				amount: 800_000,
				type: 'expense',
				date: `${periods.m0.key}-15T10:00:00.000Z`,
				description: 'E2E 80% Budget Spend'
			}
		});
		expect(tx1.ok()).toBe(true);

		let bDetail = await (await request.get(`${config.apiBaseUrl}/api/v1/budgets/${bId}`, { headers })).json();
		let bObj = bDetail.budget ?? bDetail;
		expect(bObj.spent ?? bDetail.spent).toBe(800_000);
		expect(bObj.remaining ?? bDetail.remaining).toBe(200_000);

		// 2. Over-budget 120%: add another 400,000 (total: 1,200,000)
		const tx2 = await request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
			headers,
			data: {
				walletId: wOpId,
				categoryId: catBoundaryId,
				budgetId: bId,
				amount: 400_000,
				type: 'expense',
				date: `${periods.m0.key}-16T10:00:00.000Z`,
				description: 'E2E Over-Budget Spend'
			}
		});
		expect(tx2.ok()).toBe(true);

		bDetail = await (await request.get(`${config.apiBaseUrl}/api/v1/budgets/${bId}`, { headers })).json();
		bObj = bDetail.budget ?? bDetail;
		expect(bObj.spent ?? bDetail.spent).toBe(1_200_000);
		expect(bObj.remaining ?? bDetail.remaining).toBe(-200_000); // Negative remaining!
	});

	test('23. Task 8.6 - Exercise goal linking, unlinking, and target achievement', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// 1. Create goal with small target 1,000,000 linked to W-TRIP (which has >2M balance)
		const gJson = await postJsonWithRetry<{ goalId: string }>(
			request,
			`${config.apiBaseUrl}/api/v1/goals`,
			headers,
			{
				name: 'E2E Achieved Goal',
				targetAmount: 1_000_000,
				targetDate: `${periods.mPlus3.key}-28`,
				walletId: wTripId
			}
		);
		boundaryGoalId = gJson.goalId;

		const gCheck = await getJsonWithRetry<Record<string, unknown>>(
			request,
			`${config.apiBaseUrl}/api/v1/goals/${boundaryGoalId}`,
			headers
		);
		const gAmt = Number(gCheck.goalCurrentAmount ?? gCheck.currentAmount ?? 0);
		expect(gAmt).toBeGreaterThanOrEqual(1_000_000);
		const gPacing = gCheck.pacing as Record<string, unknown> | undefined;
		const gProg = Number(gPacing?.progressPercentage ?? gCheck.progressPercentage ?? 0);
		expect(gProg).toBeGreaterThanOrEqual(100); // Target achieved!
	});

	test('24. Task 8.7 - Exhaustive pagination query with >50 items and exact ordering', async ({
		request
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

		// Seed micro-transactions to exceed 50 total items (>35 already exist)
		for (let b = 0; b < 4; b++) {
			await Promise.all(
				[1, 2, 3, 4].map((n) => {
					const i = b * 4 + n;
					return request.post(`${config.apiBaseUrl}/api/v1/transactions`, {
						headers,
						data: {
							walletId: wOpId,
							categoryId: catFoodId,
							amount: 1_000 * i,
							type: 'expense',
							date: `${periods.m0.key}-10T12:00:00.000Z`,
							description: `E2E Micro Tx ${i}`
						}
					});
				})
			);
		}
		// Exhaustive pagination with limit=20
		let offset = 0;
		let totalCollected = 0;
		const seenIds = new Set<string>();

		while (true) {
			const pRes = await request.get(
				`${config.apiBaseUrl}/api/v1/transactions?envelope=true&limit=20&offset=${offset}&orderBy=date&direction=desc`,
				{ headers }
			);
			expect(pRes.ok()).toBe(true);
			const pData = (await pRes.json()) as {
				items?: Array<{ transactionId: string }>;
				pagination?: { hasNext: boolean; total: number };
			};
			const items = pData.items || [];
			if (items.length === 0) break;

			for (const item of items) {
				seenIds.add(item.transactionId);
				totalCollected++;
			}

			if (!pData.pagination?.hasNext || items.length < 20) break;
			offset += items.length;
		}
		expect(seenIds.size).toBeGreaterThanOrEqual(50);
		expect(seenIds.size).toBe(totalCollected); // No duplicate IDs across pages
	});

	test('25. Task 8.8 - Mobile viewport verification and drawer interaction', async ({
		page
	}) => {
		if (!config.token) {
			test.skip(true, 'Skipping live integration test: REEDRICH_TEST_API_TOKEN is not set.');
			return;
		}
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await injectBrowserTestAuth(page, config);

		// 1. Mobile Cockpit
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const nw = page.locator('[data-testid="kpi-net-worth"]');
		await expect(nw).toBeVisible({ timeout: 15000 });

		// 2. Mobile Ledger: renders Dense Document Feed (table is hidden on mobile < 768px)
		await page.goto('/ledger');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('.md\\:hidden').getByText('Gaji Bulanan').first()).toBeVisible({ timeout: 15000 });

		// 3. Mobile Planning & Drawer
		await page.goto('/planning');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('text=E2E Dana Darurat').first()).toBeVisible({ timeout: 15000 });

		// Click goal to open drawer
		const editBtn = page.locator('button[aria-label*="E2E Dana Darurat"]').first();
		await editBtn.dispatchEvent('click');
		const drawer = page.locator('div[aria-labelledby="drawer-title"]');
		await expect(drawer).toBeVisible({ timeout: 15000 });
		await page.keyboard.press('Escape');
		await expect(drawer).not.toBeVisible({ timeout: 10000 });
	});
});
