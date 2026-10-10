import type {
	AccountDetail,
	CategoryRecord,
	TransactionRecord,
	TransactionEnvelope,
	TransactionQueryParams,
	RecurringTemplate,
	HorizonBoardDTO
} from '$lib/types/account-detail';

import { PUBLIC_API_URL } from '$env/static/public';

export const DEFAULT_API_URL = PUBLIC_API_URL || 'https://reedrich-mcp.lutfidmz.workers.dev';

export const MOCK_SNAPSHOT: AccountDetail = {
	netWorth: {
		consolidated: { total: 45850000, currency: 'IDR', isEstimated: false, fxSource: 'live' },
		byCurrency: { IDR: 42850000, USDT: 187.5 },
		byInstitution: {
			BCA: 24250000,
			'Bank Jago': 17100000,
			GoPay: 1500000,
			Bitget: 3000000
		}
	},
	wallets: {
		spendable: {
			total: 12350000,
			items: [
				{
					walletId: 'w_demo_bca_op',
					walletName: 'BCA Operational',
					institution: 'BCA',
					type: 'bank',
					currency: 'IDR',
					balance: 6250000,
					isLocked: 0,
					lastTransaction: {
						transactionId: 'tx_demo_01',
						date: '2026-10-08T10:00:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 450000,
						description: 'Cloud Hosting & Edge CDN',
						category: 'Software & Cloud'
					}
				},
				{
					walletId: 'w_demo_jago_cash',
					walletName: 'Bank Jago Daily Cash',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 4600000,
					isLocked: 0,
					lastTransaction: {
						transactionId: 'tx_demo_02',
						date: '2026-10-07T12:30:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 85000,
						description: 'Team Coffee & Discussion',
						category: 'Meals & Dining'
					}
				},
				{
					walletId: 'w_demo_gopay',
					walletName: 'GoPay Petty Cash',
					institution: 'GoPay',
					type: 'e-wallet',
					currency: 'IDR',
					balance: 1500000,
					isLocked: 0,
					lastTransaction: {
						transactionId: 'tx_demo_03',
						date: '2026-10-06T18:15:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 65000,
						description: 'City Transport & Courier',
						category: 'Transport & Travel'
					}
				}
			]
		},
		locked: {
			total: 33500000,
			items: [
				{
					walletId: 'w_demo_lease_res',
					walletName: 'Workspace Lease Reserve',
					institution: 'BCA',
					type: 'bank',
					currency: 'IDR',
					balance: 18000000,
					isLocked: 1,
					lastTransaction: {
						transactionId: 'tx_demo_04',
						date: '2026-10-01T09:00:00+07:00',
						type: 'transfer',
						direction: 'in',
						amount: 3000000,
						description: 'Monthly Lease Allocation',
						category: 'Transfer'
					}
				},
				{
					walletId: 'w_demo_emergency_res',
					walletName: 'Emergency Reserve (6 Months)',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 12500000,
					isLocked: 1,
					lastTransaction: {
						transactionId: 'tx_demo_05',
						date: '2026-09-30T10:00:00+07:00',
						type: 'transfer',
						direction: 'in',
						amount: 2500000,
						description: 'Safety Net Buffer Deposit',
						category: 'Transfer'
					}
				},
				{
					walletId: 'w_demo_crypto_treasury',
					walletName: 'Crypto Treasury Reserve',
					institution: 'Bitget',
					type: 'crypto',
					currency: 'USDT',
					balance: 187.5,
					isLocked: 1,
					lastTransaction: null
				}
			]
		}
	},
	monthlyCashFlow: {
		period: { start: '2026-10-01T00:00:00.000Z', end: '2026-10-31T23:59:59.999Z' },
		totalIncome: 28500000,
		totalExpense: 16150000,
		netSavings: 12350000,
		categoryBreakdown: [
			{ categoryName: 'Software & Cloud', amount: 4850000, percentage: 30.03 },
			{ categoryName: 'Workspace & Studio', amount: 3500000, percentage: 21.67 },
			{ categoryName: 'Hardware & Gear', amount: 2800000, percentage: 17.34 },
			{ categoryName: 'Meals & Dining', amount: 2200000, percentage: 13.62 },
			{ categoryName: 'Transport & Travel', amount: 1400000, percentage: 8.67 },
			{ categoryName: 'Professional Services', amount: 1400000, percentage: 8.67 }
		]
	},
	budgets: [
		{
			budgetId: 'b_demo_cloud',
			budgetName: 'Q4 Cloud Infrastructure',
			categoryName: 'Software & Cloud',
			amount: 5000000,
			spent: 1850000,
			remaining: 3150000,
			percentUsed: 37,
			status: 'on_track'
		},
		{
			budgetId: 'b_demo_office',
			budgetName: 'Studio Operational & Supplies',
			categoryName: 'Workspace & Studio',
			amount: 4000000,
			spent: 2100000,
			remaining: 1900000,
			percentUsed: 52,
			status: 'on_track'
		}
	],
	goals: [
		{
			goalId: 'g_demo_lease',
			goalName: 'Studio Lease 2027',
			targetAmount: 24000000,
			currentAmount: 18000000,
			progressPercentage: 75.0,
			isDerived: true,
			daysRemaining: 78,
			linkedWalletsBreakdown: [
				{
					walletId: 'w_demo_lease_res',
					walletName: 'Workspace Lease Reserve',
					balance: 18000000,
					currency: 'IDR',
					convertedAmount: 18000000,
					usedPeg: false
				}
			]
		},
		{
			goalId: 'g_demo_gear',
			goalName: 'M4 Max Workstation Upgrade',
			targetAmount: 35000000,
			currentAmount: 12500000,
			progressPercentage: 35.7,
			isDerived: false,
			daysRemaining: 142
		}
	],
	obligations: {
		totalDebt: 4200000,
		totalReceivable: 7500000,
		activeDebts: [
			{
				debtLoanId: 'd_demo_server',
				personName: 'Cloud Server 3-Year Hardware Reserve',
				remainingAmount: 4200000,
				dueDate: '2026-12-15',
				status: 'partially_paid'
			}
		],
		activeLoans: [
			{
				debtLoanId: 'l_demo_invoice',
				personName: 'Client Milestone Invoice (Acme Global Corp)',
				remainingAmount: 7500000,
				dueDate: '2026-10-30',
				status: 'unpaid'
			}
		]
	}
};

export const MOCK_CATEGORIES: CategoryRecord[] = [
	{ categoryId: 'cat_demo_1', categoryName: 'Software & Cloud', categoryType: 'expense' },
	{ categoryId: 'cat_demo_2', categoryName: 'Workspace & Studio', categoryType: 'expense' },
	{ categoryId: 'cat_demo_3', categoryName: 'Hardware & Gear', categoryType: 'expense' },
	{ categoryId: 'cat_demo_4', categoryName: 'Meals & Dining', categoryType: 'expense' },
	{ categoryId: 'cat_demo_5', categoryName: 'Transport & Travel', categoryType: 'expense' },
	{ categoryId: 'cat_demo_6', categoryName: 'Client Retainer Revenue', categoryType: 'income' },
	{ categoryId: 'cat_demo_7', categoryName: 'SaaS Subscription Revenue', categoryType: 'income' }
];

export const MOCK_TRANSACTIONS: TransactionRecord[] = [
	{
		transactionId: 'tx_demo_101',
		transactionWalletId: 'w_demo_bca_op',
		transactionCategoryId: 'cat_demo_6',
		transactionAmount: 28500000,
		transactionType: 'income',
		transactionDescription: 'Monthly Client Retainer & SaaS Revenue',
		transactionIsPlanned: 0,
		transactionDate: '2026-10-01T09:00:00+07:00'
	},
	{
		transactionId: 'tx_demo_102',
		transactionWalletId: 'w_demo_bca_op',
		transactionTargetWalletId: 'w_demo_lease_res',
		transactionCategoryId: 'cat_demo_2',
		transactionAmount: 3000000,
		transactionType: 'transfer',
		transactionDescription: 'Transfer to Workspace Lease Reserve',
		transactionIsPlanned: 0,
		transactionDate: '2026-10-02T10:00:00+07:00'
	},
	{
		transactionId: 'tx_demo_103',
		transactionWalletId: 'w_demo_bca_op',
		transactionCategoryId: 'cat_demo_1',
		transactionAmount: 1250000,
		transactionType: 'expense',
		transactionDescription: 'Cloudflare Workers & D1 Edge Storage',
		transactionIsPlanned: 0,
		transactionDate: '2026-10-03T11:20:00+07:00'
	},
	{
		transactionId: 'tx_demo_104',
		transactionWalletId: 'w_demo_bca_op',
		transactionCategoryId: 'cat_demo_1',
		transactionAmount: 600000,
		transactionType: 'expense',
		transactionDescription: 'GitHub Enterprise & Copilot Seats',
		transactionIsPlanned: 0,
		transactionDate: '2026-10-04T14:00:00+07:00'
	},
	{
		transactionId: 'tx_demo_105',
		transactionWalletId: 'w_demo_jago_cash',
		transactionCategoryId: 'cat_demo_4',
		transactionAmount: 85000,
		transactionType: 'expense',
		transactionDescription: 'Studio Team Espresso & Pastries',
		transactionIsPlanned: 0,
		transactionDate: '2026-10-07T08:30:00+07:00'
	},
	{
		transactionId: 'tx_demo_106',
		transactionWalletId: 'w_demo_jago_cash',
		transactionCategoryId: 'cat_demo_5',
		transactionAmount: 120000,
		transactionType: 'expense',
		transactionDescription: 'Express Courier & Client Sample Dispatch',
		transactionIsPlanned: 0,
		transactionDate: '2026-10-07T15:45:00+07:00'
	},
	{
		transactionId: 'tx_demo_107',
		transactionWalletId: 'w_demo_bca_op',
		transactionBudgetId: 'b_demo_cloud',
		transactionCategoryId: 'cat_demo_1',
		transactionAmount: 2500000,
		transactionType: 'expense',
		transactionDescription: 'Planned AI Token Evaluation Batch',
		transactionIsPlanned: 1,
		transactionDate: '2026-10-25T10:00:00+07:00'
	},
	{
		transactionId: 'tx_demo_108',
		transactionWalletId: 'w_demo_bca_op',
		transactionBudgetId: 'b_demo_office',
		transactionCategoryId: 'cat_demo_2',
		transactionAmount: 1500000,
		transactionType: 'expense',
		transactionDescription: 'Planned Studio Acoustic Panels',
		transactionIsPlanned: 1,
		transactionDate: '2026-10-28T14:00:00+07:00'
	}
];

export const MOCK_RECURRING_TEMPLATES: RecurringTemplate[] = [
	{
		templateId: 'rec_demo_1',
		templateName: 'Monthly Studio Cloud Hosting',
		templateWalletId: 'w_demo_bca_op',
		templateCategoryId: 'cat_demo_1',
		templateAmount: 1250000,
		templateType: 'expense',
		templateFrequency: 'monthly',
		templateStartDate: '2026-01-01',
		templateNextRunDate: '2026-11-01',
		templateIsActive: 1
	},
	{
		templateId: 'rec_demo_2',
		templateName: 'Studio Lease Reserve Transfer',
		templateWalletId: 'w_demo_bca_op',
		templateTargetWalletId: 'w_demo_lease_res',
		templateCategoryId: 'cat_demo_2',
		templateAmount: 3000000,
		templateType: 'transfer',
		templateFrequency: 'monthly',
		templateStartDate: '2026-01-02',
		templateNextRunDate: '2026-11-02',
		templateIsActive: 1
	}
];

export function getMockTransactions(params: TransactionQueryParams = {}): TransactionEnvelope {
	let list = [...MOCK_TRANSACTIONS];

	if (params.q || params.search) {
		const q = (params.q || params.search || '').toLowerCase();
		list = list.filter((t) => (t.transactionDescription || '').toLowerCase().includes(q));
	}

	if (params.type && params.type !== 'all') {
		list = list.filter((t) => t.transactionType === params.type);
	}

	if (params.walletId) {
		const wId = Array.isArray(params.walletId) ? params.walletId : [params.walletId];
		list = list.filter((t) => wId.includes(t.transactionWalletId));
	}

	if (params.status === 'realized') {
		list = list.filter((t) => t.transactionIsPlanned === 0);
	} else if (params.status === 'planned') {
		list = list.filter((t) => t.transactionIsPlanned === 1);
	} else if (params.isPlanned !== undefined) {
		const pVal = params.isPlanned ? 1 : 0;
		list = list.filter((t) => t.transactionIsPlanned === pVal);
	}

	const total = list.length;
	const limit = params.limit ?? 50;
	const offset = params.offset ?? 0;
	const items = list.slice(offset, offset + limit);

	return {
		items,
		pagination: {
			total,
			limit,
			offset,
			hasNext: offset + limit < total,
			totalPages: Math.ceil(total / limit) || 1
		}
	};
}

export function getMockHorizonBoard(): HorizonBoardDTO {
	const nwTotal = MOCK_SNAPSHOT.netWorth.consolidated.total;
	const nwSpendable = MOCK_SNAPSHOT.wallets.spendable.total;
	const nwLocked = MOCK_SNAPSHOT.wallets.locked.total;

	return {
		baseCurrency: 'IDR',
		generatedAt: new Date().toISOString(),
		startingNetWorth: {
			total: nwTotal,
			spendable: nwSpendable,
			locked: nwLocked
		},
		periods: [
			{
				periodKey: '2026-10',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				cashflow: {
					income: 28500000,
					expense: 16150000,
					net: 12350000,
					netSpendable: 9350000,
					netLocked: 3000000
				},
				netWorth: {
					total: nwTotal,
					spendable: nwSpendable,
					locked: nwLocked
				},
				walletBalances: [
					{ walletId: 'w_demo_bca_op', walletName: 'BCA Operational', balance: 6250000, currency: 'IDR', isLocked: 0 },
					{ walletId: 'w_demo_jago_cash', walletName: 'Bank Jago Daily', balance: 4600000, currency: 'IDR', isLocked: 0 },
					{ walletId: 'w_demo_lease_res', walletName: 'Lease Reserve', balance: 18000000, currency: 'IDR', isLocked: 1 }
				],
				goals: [
					{
						goalId: 'g_demo_lease',
						name: 'Studio Lease 2027',
						currentAmount: 18000000,
						targetAmount: 24000000,
						progressPercentage: 75.0,
						isReached: false
					}
				]
			},
			{
				periodKey: '2026-11',
				startDate: '2026-11-01',
				endDate: '2026-11-30',
				cashflow: {
					income: 28500000,
					expense: 15500000,
					net: 13000000,
					netSpendable: 10000000,
					netLocked: 3000000
				},
				netWorth: {
					total: nwTotal + 13000000,
					spendable: nwSpendable + 10000000,
					locked: nwLocked + 3000000
				},
				walletBalances: [
					{ walletId: 'w_demo_bca_op', walletName: 'BCA Operational', balance: 16250000, currency: 'IDR', isLocked: 0 },
					{ walletId: 'w_demo_lease_res', walletName: 'Lease Reserve', balance: 21000000, currency: 'IDR', isLocked: 1 }
				],
				goals: [
					{
						goalId: 'g_demo_lease',
						name: 'Studio Lease 2027',
						currentAmount: 21000000,
						targetAmount: 24000000,
						progressPercentage: 87.5,
						isReached: false
					}
				]
			}
		]
	};
}
