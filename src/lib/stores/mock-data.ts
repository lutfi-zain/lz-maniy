import type { AccountDetail, CategoryRecord } from '$lib/types/account-detail';

export const DEFAULT_API_URL = 'https://reedrich-mcp.lutfidmz.workers.dev';
export const DEFAULT_TOKEN = 'REDACTED_API_TOKEN';

export const MOCK_SNAPSHOT: AccountDetail = {
	netWorth: {
		consolidated: { total: 17333190.67, currency: 'IDR', isEstimated: true, fxSource: 'live' },
		byCurrency: { IDR: 15271190.85, USDT: 115.61 },
		byInstitution: {
			OCBC: 959368,
			BCA: 8975931.69,
			'Bank Jago': 4872868.16,
			GoPay: 10023,
			Bitget: 115.61,
			General: 453000
		}
	},
	wallets: {
		spendable: {
			total: 1102293.15,
			items: [
				{
					walletId: '731417c2-cb2c-4e52-8b36-05bb64e1c53b',
					walletName: 'BCA Main',
					institution: 'BCA',
					type: 'bank',
					currency: 'IDR',
					balance: 141994,
					isLocked: 0,
					lastTransaction: {
						transactionId: '38c4ea4c',
						date: '2026-09-22T10:00:00+07:00',
						type: 'transfer',
						direction: 'out',
						amount: 120200,
						description: 'Pengganti KFC 120.200 dari BCA Main ke BCA Pocket Sewa Rumah',
						category: 'Transfer'
					}
				},
				{
					walletId: '40fc8137-fd9f-41a9-bae2-4f7682ec2d25',
					walletName: 'Main Wallet',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 11507.03,
					isLocked: 0,
					lastTransaction: {
						transactionId: '04c86c3b',
						date: '2026-09-22T08:00:00+07:00',
						type: 'transfer',
						direction: 'out',
						amount: 20000,
						description: 'Top up GoPay dari Main Wallet pagi ini',
						category: 'Transfer'
					}
				},
				{
					walletId: 'c92f8229-d642-4368-b280-23966da29fd7',
					walletName: 'HUZ',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 42639,
					isLocked: 0,
					lastTransaction: {
						transactionId: '496ea846',
						date: '2026-09-19T20:51:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 105000,
						description: 'Pembayaran VPS SumoPod via DANA',
						category: 'Taktis / Operasional'
					}
				},
				{
					walletId: '9c403c2d-53f5-45fc-8074-f1c15f3c8945',
					walletName: 'Vitamin Istri',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 328600,
					isLocked: 0,
					lastTransaction: {
						transactionId: '54ae34d5',
						date: '2026-09-05T10:35:00+07:00',
						type: 'transfer',
						direction: 'in',
						amount: 250000,
						description: 'Alokasi Pos Vitamin Istri September 2026',
						category: 'Transfer'
					}
				},
				{
					walletId: 'db498393-3f84-41ec-a995-db7b2e529859',
					walletName: 'Bensin & Transport',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 109530,
					isLocked: 0,
					lastTransaction: {
						transactionId: 'b1de5e0d',
						date: '2026-09-18T08:33:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 184240,
						description: 'Tokopedia Baju Renang Pria Dewasa',
						category: 'Taktis / Operasional'
					}
				},
				{
					walletId: 'b5142896-2c37-4d69-b437-c1a9ab19dfed',
					walletName: 'Events',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 0,
					isLocked: 0,
					lastTransaction: {
						transactionId: '8799040f',
						date: '2026-08-19T00:00:00.000Z',
						type: 'transfer',
						direction: 'out',
						amount: 1500000,
						description: 'Pindah dana Events ke kantong Global untuk kencan',
						category: 'Transfer'
					}
				},
				{
					walletId: '1a509652-22dd-46ed-b814-fa6503596881',
					walletName: 'Savings',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 0,
					isLocked: 0,
					lastTransaction: null
				},
				{
					walletId: '9c970b74-5065-46c8-91bf-76bce8dca510',
					walletName: 'Comet',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 5000,
					isLocked: 0,
					lastTransaction: {
						transactionId: '87c3bbbb',
						date: '2026-08-20T00:00:00.000Z',
						type: 'transfer',
						direction: 'out',
						amount: 295000,
						description: 'Pindah dana Comet ke kantong Global',
						category: 'Transfer'
					}
				},
				{
					walletId: '571b3a78-03d3-4240-8663-e50f16b99c4a',
					walletName: 'GoPay',
					institution: 'GoPay',
					type: 'e-wallet',
					currency: 'IDR',
					balance: 10023,
					isLocked: 0,
					lastTransaction: {
						transactionId: '6d8cb76e',
						date: '2026-09-22T08:30:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 106000,
						description: 'Point Coffee untuk suami dan istri plus roti anak',
						category: 'Makan & Minum'
					}
				},
				{
					walletId: '6d78cec4-7aee-4f43-a7d3-b2e8e99f5303',
					walletName: 'Global',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 0.12,
					isLocked: 0,
					lastTransaction: {
						transactionId: 'c9ebe6c9',
						date: '2026-08-22T00:00:00.000Z',
						type: 'transfer',
						direction: 'out',
						amount: 156600,
						description: 'Sweep sisa saldo Global ke Main Pocket',
						category: 'Transfer'
					}
				},
				{
					walletId: '80c9260e-c4be-480e-9823-82c773d7e2d1',
					walletName: 'Dompet Tunai',
					institution: 'General',
					type: 'cash',
					currency: 'IDR',
					balance: 453000,
					isLocked: 0,
					lastTransaction: {
						transactionId: 'f0ceb552',
						date: '2026-09-20T16:02:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 170000,
						description: 'Bayar pak Unang (tukang)',
						category: 'Belanja Kebutuhan Rumah'
					}
				}
			]
		},
		locked: {
			total: 16230897.52,
			items: [
				{
					walletId: '43da8b6d-5a84-4bc1-a387-92fc65a1b42e',
					walletName: 'OCBC Main Sewa Rumah',
					institution: 'OCBC',
					type: 'bank',
					currency: 'IDR',
					balance: 959368,
					isLocked: 1,
					lastTransaction: {
						transactionId: 'd3686beb',
						date: '2026-09-07T10:00:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 500000,
						description: 'Koreksi transfer',
						category: 'Transfer'
					}
				},
				{
					walletId: 'eb15e4b7-4cab-4d7c-9e33-27bc7f28760b',
					walletName: 'BCA Pocket Sewa Rumah',
					institution: 'BCA',
					type: 'bank',
					currency: 'IDR',
					balance: 8833937.69,
					isLocked: 1,
					lastTransaction: {
						transactionId: '38c4ea4c',
						date: '2026-09-22T10:00:00+07:00',
						type: 'transfer',
						direction: 'in',
						amount: 120200,
						description: 'Pengganti KFC dari BCA Main',
						category: 'Transfer'
					}
				},
				{
					walletId: '52bbe86f-0ac5-4e6f-a987-f761c24e25ca',
					walletName: 'Dokter Anak',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 1500000,
					isLocked: 1,
					lastTransaction: {
						transactionId: '941087b4',
						date: '2026-09-05T10:34:00+07:00',
						type: 'transfer',
						direction: 'in',
						amount: 712500,
						description: 'Subsidi Dana Vaksin Saada',
						category: 'Transfer'
					}
				},
				{
					walletId: '26ee0170-e6af-4e1c-864f-5e1eb06c279d',
					walletName: 'Taktis',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 500000,
					isLocked: 1,
					lastTransaction: {
						transactionId: 'c8733577',
						date: '2026-09-21T10:00:00+07:00',
						type: 'transfer',
						direction: 'in',
						amount: 500000,
						description: 'Pindah 500k Jago Sewa Rumah ke Jago Taktis',
						category: 'Transfer'
					}
				},
				{
					walletId: 'f87ca599-9e0b-4894-957a-b681e533a324',
					walletName: 'Bitget Sewa Rumah',
					institution: 'Bitget',
					type: 'crypto',
					currency: 'USDT',
					balance: 115.61,
					isLocked: 1,
					lastTransaction: null
				},
				{
					walletId: '81f6276f-6b1e-4702-8e27-9e0c702d96a0',
					walletName: 'Sewa Rumah',
					institution: 'Bank Jago',
					type: 'bank',
					currency: 'IDR',
					balance: 2375592.01,
					isLocked: 1,
					lastTransaction: {
						transactionId: 'eac71af8',
						date: '2026-09-21T20:00:00+07:00',
						type: 'expense',
						direction: 'out',
						amount: 120200,
						description: 'KFC suami dan istri',
						category: 'Makan & Minum'
					}
				}
			]
		}
	},
	monthlyCashFlow: {
		period: { start: '2026-09-01T00:00:00.000Z', end: '2026-09-30T23:59:59.999Z' },
		totalIncome: 21835000,
		totalExpense: 16261065,
		netSavings: 5573935,
		categoryBreakdown: [
			{ categoryName: 'Makan & Minum', amount: 4009700, percentage: 24.66 },
			{ categoryName: 'Tagihan & Utilitas', amount: 2388300, percentage: 14.69 },
			{ categoryName: 'Nafkah Istri', amount: 2030000, percentage: 12.48 },
			{ categoryName: 'Nafkah Anak', amount: 1500000, percentage: 9.22 },
			{ categoryName: 'Cicilan Motor', amount: 1300000, percentage: 7.99 },
			{ categoryName: 'Belanja Kebutuhan Rumah', amount: 815400, percentage: 5.01 },
			{ categoryName: 'Taktis / Operasional', amount: 784140, percentage: 4.82 },
			{ categoryName: 'Nafkah Ibu', amount: 600000, percentage: 3.69 },
			{ categoryName: 'Pinjaman / Talangan Pribadi', amount: 500000, percentage: 3.07 },
			{ categoryName: 'Transfer', amount: 500000, percentage: 3.07 },
			{ categoryName: 'Pendidikan / Kuliah', amount: 406500, percentage: 2.5 },
			{ categoryName: 'Dokter Anak', amount: 302808, percentage: 1.86 },
			{ categoryName: 'Sedekah & Infaq', amount: 300000, percentage: 1.84 },
			{ categoryName: 'Laundry', amount: 250000, percentage: 1.54 },
			{ categoryName: 'Bensin & Transportasi', amount: 228540, percentage: 1.41 },
			{ categoryName: 'Uang Suami (Huz)', amount: 161000, percentage: 0.99 },
			{ categoryName: 'Jajan & Nongkrong', amount: 142000, percentage: 0.87 },
			{ categoryName: 'Biaya Admin & Transfer', amount: 20000, percentage: 0.12 },
			{ categoryName: 'Service Motor', amount: 20000, percentage: 0.12 },
			{ categoryName: 'Sisa Saldo & Penyesuaian', amount: 2677, percentage: 0.02 }
		]
	},
	budgets: [
		{
			budgetId: '5260371e-2153-4f52-808f-0a11a333cb0b',
			budgetName: 'Jenguk Mertua Bekasi (Sep 2026)',
			categoryName: 'General',
			amount: 1500000,
			spent: 0,
			remaining: 1500000,
			percentUsed: 0,
			status: 'on_track'
		}
	],
	goals: [
		{
			goalId: '393b2c26-ad98-4d84-a83a-443d5c316c96',
			goalName: 'Sewa Rumah 2026',
			targetAmount: 18000000,
			currentAmount: 14230897.52,
			progressPercentage: 79.06,
			isDerived: true,
			daysRemaining: 21,
			linkedWalletsBreakdown: [
				{
					walletId: 'eb15e4b7',
					walletName: 'BCA Pocket Sewa Rumah',
					balance: 8833937.69,
					currency: 'IDR',
					convertedAmount: 8833937.69,
					usedPeg: false
				},
				{
					walletId: '81f6276f',
					walletName: 'Sewa Rumah',
					balance: 2375592.01,
					currency: 'IDR',
					convertedAmount: 2375592.01,
					usedPeg: false
				},
				{
					walletId: '43da8b6d',
					walletName: 'OCBC Main Sewa Rumah',
					balance: 959368,
					currency: 'IDR',
					convertedAmount: 959368,
					usedPeg: false
				},
				{
					walletId: 'f87ca599',
					walletName: 'Bitget Sewa Rumah',
					balance: 115.61,
					currency: 'USDT',
					convertedAmount: 2061999.82,
					usedPeg: true
				}
			]
		},
		{
			goalId: '28229723',
			goalName: 'Safety Net 10jt (Milestone 1)',
			targetAmount: 10000000,
			currentAmount: 0,
			progressPercentage: 0,
			isDerived: false,
			daysRemaining: 129
		},
		{
			goalId: '02ce5461',
			goalName: 'Tabungan Lebaran 2027',
			targetAmount: 5000000,
			currentAmount: 0,
			progressPercentage: 0,
			isDerived: false,
			daysRemaining: 176
		}
	],
	obligations: {
		totalDebt: 6645000,
		totalReceivable: 302808,
		activeDebts: [
			{
				debtLoanId: 'e25eef7b',
				personName: 'Istri (Nabila Nurul Anisa)',
				remainingAmount: 800000,
				dueDate: '2026-09-30',
				status: 'partially_paid'
			},
			{
				debtLoanId: '804677cc',
				personName: 'Cicilan Yamaha Nmax Turbo Ultimate',
				remainingAmount: 5845000,
				dueDate: '2027-02-06',
				status: 'partially_paid'
			}
		],
		activeLoans: [
			{
				debtLoanId: 'f8b12720',
				personName: 'Nafkah Anak Oktober (pengganti Vitamin D)',
				remainingAmount: 302808,
				dueDate: '2026-10-31',
				status: 'unpaid'
			}
		]
	}
};

export const MOCK_CATEGORIES: CategoryRecord[] = [
	{ categoryId: 'cat_1', categoryName: 'Makan & Minum', categoryType: 'expense' },
	{ categoryId: 'cat_2', categoryName: 'Tagihan & Utilitas', categoryType: 'expense' },
	{ categoryId: 'cat_3', categoryName: 'Nafkah Istri', categoryType: 'expense' },
	{ categoryId: 'cat_4', categoryName: 'Nafkah Anak', categoryType: 'expense' },
	{ categoryId: 'cat_5', categoryName: 'Cicilan Motor', categoryType: 'expense' },
	{ categoryId: 'cat_6', categoryName: 'Gaji & Pendapatan', categoryType: 'income' }
];
