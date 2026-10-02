export interface EvalTestCase {
	id: string;
	category:
		| 'balance_query'
		| 'planning_projection'
		| 'transaction_filter'
		| 'ui_control'
		| 'financial_sanity'
		| 'multi_currency'
		| 'category_breakdown'
		| 'wallet_management'
		| 'debt_management'
		| 'safe_to_spend';
	prompt: string;
	pageContext?: {
		currentRoute: string;
		activeTab: 'all' | 'spendable' | 'locked';
		drawerOpen: boolean;
		selectedInstitution: string | null;
		summary: { totalNetWorth?: number; totalSpendable?: number; totalLocked?: number; walletCount: number; hasCashFlow: boolean };
	};
	expected: {
		requiredTools: string[];
		mustContain?: string[];
		mathCheck?: (text: string) => boolean;
		mustNotContain?: string[];
		minSteps?: number;
	};
}

export const EVAL_DATASET: EvalTestCase[] = [
	{
		id: 'TC-01',
		category: 'balance_query',
		prompt: 'Saldo kas siap pakai saya ada berapa saat ini?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['705', 'kas siap pakai'],
			minSteps: 2
		}
	},
	{
		id: 'TC-02',
		category: 'planning_projection',
		prompt: 'networth bulan depan berapa kalau semua planned terealisasi?',
		expected: {
			requiredTools: ['get_snapshot', 'list_transactions'],
			mustContain: ['5.3', 'Oktober'],
			mathCheck: (text: string) => text.includes('5.3') || text.includes('5 303') || text.includes('5.303'),
			minSteps: 2
		}
	},
	{
		id: 'TC-03',
		category: 'multi_currency',
		prompt: 'Berapa saldo aset saya yang dalam bentuk USDT atau valas asing?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['USDT', '115'],
			minSteps: 2
		}
	},
	{
		id: 'TC-04',
		category: 'category_breakdown',
		prompt: 'Pengeluaran terbesar saya bulan ini dialokasikan ke kategori apa?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['kategori'],
			minSteps: 2
		}
	},
	{
		id: 'TC-05',
		category: 'ui_control',
		prompt: 'Tolong buka halaman planning',
		expected: {
			requiredTools: ['navigate_page'],
			mustContain: ['/planning'],
			minSteps: 1
		}
	},
	{
		id: 'TC-06',
		category: 'financial_sanity',
		prompt: 'Kalau saya transfer 5 juta dari BCA ke Jago, apakah networth saya berkurang?',
		expected: {
			requiredTools: [],
			mustContain: ['tidak', 'berkurang'],
			minSteps: 1
		}
	},
	{
		id: 'TC-07',
		category: 'wallet_management',
		prompt: 'Tolong buatkan dompet baru di Bank Jago namanya Dompet Belanja saldo awal nol',
		expected: {
			requiredTools: ['create_wallet'],
			mustContain: ['Dompet Belanja'],
			minSteps: 1
		}
	},
	{
		id: 'TC-08',
		category: 'debt_management',
		prompt: 'Saya punya catatan hutang atau piutang apa saja saat ini?',
		expected: {
			requiredTools: ['list_debts_loans'],
			minSteps: 1
		}
	},
	{
		id: 'TC-09',
		category: 'safe_to_spend',
		prompt: 'Berapa dana aman yang bisa saya belanjakan (safe to spend) saat ini?',
		expected: {
			requiredTools: ['financial_summary'],
			minSteps: 1
		}
	}
];
