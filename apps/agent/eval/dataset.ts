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
		| 'safe_to_spend'
		| 'transaction_record'
		| 'budget_tracking'
		| 'complex_reasoning'
		| 'tone_format';
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
	},

	// Real-User Telegram History Cases (TC-10 to TC-32)
	{
		id: 'TC-10',
		category: 'balance_query',
		prompt: 'Saldo bca saya berapa?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['BCA', 'Rp'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-11',
		category: 'balance_query',
		prompt: 'cek semua saldo semua dompet',
		expected: {
			requiredTools: ['list_wallets'],
			mustContain: ['saldo'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-12',
		category: 'balance_query',
		prompt: 'Apakah kita punya dompet cash dan kalau punya sekarang saldonya berapa ya?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['cash'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-13',
		category: 'balance_query',
		prompt: 'Berapa total kas siap pakai saya?',
		expected: {
			requiredTools: ['financial_summary'],
			mustContain: ['siap pakai', 'Rp'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-14',
		category: 'transaction_record',
		prompt: 'Makan "waroeng steak" take away with anak istri dari huz 85k',
		expected: {
			requiredTools: ['create_transaction'],
			mustContain: ['waroeng steak', '85'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-15',
		category: 'transaction_record',
		prompt: '2k dari huz untuk parkir',
		expected: {
			requiredTools: ['create_transaction'],
			mustContain: ['parkir'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-16',
		category: 'transaction_record',
		prompt: 'Lalu Saya barusan transfer 14jt dari bca ke main dengan admin 2500, catat ya',
		expected: {
			requiredTools: ['create_transfer'],
			mustContain: ['transfer', '14'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-17',
		category: 'transaction_record',
		prompt: 'beli pampers saada 50k dari huz',
		expected: {
			requiredTools: ['create_transaction'],
			mustContain: ['pampers', '50'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-18',
		category: 'planning_projection',
		prompt: 'Planning bulan ini gimana finnplan kita?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['plan'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-19',
		category: 'planning_projection',
		prompt: 'Kita bikin planning sampe januari tahun depan ya. Tagihan semuanya sama kecuali spp berubah tiap bulan.',
		expected: {
			requiredTools: ['list_recurring'],
			mustContain: ['plan'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-20',
		category: 'planning_projection',
		prompt: 'Bulan depan itu kita harus ke dokter anak buat vaksin cacar sekitar 1.5jt. Sekarang di dompet jago dokter anak ada 1185000',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['dokter'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-21',
		category: 'budget_tracking',
		prompt: 'bulan ini untuk tagihan rinciannya berapa?',
		expected: {
			requiredTools: ['list_budgets'],
			mustContain: ['tagihan', 'Rp'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-22',
		category: 'budget_tracking',
		prompt: 'cek semua budget kita, all data. ada apa aja?',
		expected: {
			requiredTools: ['list_budgets'],
			mustContain: ['budget'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-23',
		category: 'budget_tracking',
		prompt: 'ok gini deh, budget 1.5jt jenguk mertua itu hampir pasti dipakai, implikasi nya gimana untuk oktober?',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['oktober'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-24',
		category: 'debt_management',
		prompt: 'Kita punya hutang ke uang rumah berapa total?',
		expected: {
			requiredTools: ['list_debts_loans'],
			mustContain: ['sewa rumah', 'Rp'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-25',
		category: 'debt_management',
		prompt: 'jadi total uang sewa rumah yang harus diganti berapa? yang tabungan bulan ini berapa? total berapa?',
		expected: {
			requiredTools: ['list_debts_loans'],
			mustContain: ['sewa rumah'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-26',
		category: 'complex_reasoning',
		prompt: 'kok bisa income 23jt? darimana?',
		expected: {
			requiredTools: ['list_transactions'],
			mustContain: ['Rp'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-27',
		category: 'complex_reasoning',
		prompt: 'check planned kita bulan ini kok banyak banget ya? apakah redundant?',
		expected: {
			requiredTools: ['list_transactions'],
			mustContain: ['planned'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-28',
		category: 'complex_reasoning',
		prompt: 'tapi ada yang janggal juga, harusnya kan ngga 51 juta karena total pemasukkan saat ini baru 21jt',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['pemasukan'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-29',
		category: 'complex_reasoning',
		prompt: 'Oke sekarang coba pikirin saya harus transfer ke dompet sewa rumah berapa terus nanti bayar-bayar tagihan pake dompet mana',
		expected: {
			requiredTools: ['get_snapshot'],
			mustContain: ['dompet'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-30',
		category: 'wallet_management',
		prompt: 'Last transaction date of each my wallet',
		expected: {
			requiredTools: ['list_wallets'],
			mustContain: ['wallet'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-31',
		category: 'wallet_management',
		prompt: 'buat dalam format tabel rincian saldo dompet saya',
		expected: {
			requiredTools: ['list_wallets'],
			mustContain: ['|'],
			mustNotContain: ['$'],
			minSteps: 1
		}
	},
	{
		id: 'TC-32',
		category: 'tone_format',
		prompt: 'Coba tolong inget ini ya, kalo kamu jawab saya pake icon-icon itu saya gak suka. Better kamu bikinnya pake tabel aja jadi saya liatnya juga lebih enak',
		expected: {
			requiredTools: [],
			mustContain: ['tabel'],
			mustNotContain: ['😀', '🚀', '🔥', '🎉'],
			minSteps: 1
		}
	}
];
