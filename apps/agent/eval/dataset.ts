export interface EvalTestCase {
	id: string;
	category: 'balance_query' | 'planning_projection' | 'transaction_filter' | 'ui_control' | 'financial_sanity';
	prompt: string;
	pageContext?: {
		currentRoute: string;
		activeTab: 'all' | 'spendable' | 'locked';
		selectedInstitution: string | null;
		summary: { totalNetWorth?: number; totalSpendable?: number; totalLocked?: number; walletCount: number; hasCashFlow: boolean };
	};
	expected: {
		/** Tools yang diharapkan dipanggil */
		requiredTools: string[];
		/** Kata kunci atau fakta yang wajib muncul di jawaban */
		mustContain?: string[];
		/** Validasi matematis atau nilai kalkulasi */
		mathCheck?: (text: string) => boolean;
		/** Tidak boleh mengandung hal ini */
		mustNotContain?: string[];
		/** Apakah membutuhkan multi-step reasoning (> 1 step) */
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
			mustContain: ['723.792', 'kas siap pakai'],
			minSteps: 2
		}
	},
	{
		id: 'TC-02',
		category: 'planning_projection',
		prompt: 'networth bulan depan berapa kalau semua planned terealisasi?',
		expected: {
			requiredTools: ['get_snapshot', 'list_transactions'],
			mustContain: ['5.321.229', 'Oktober', 'sewa rumah'],
			mathCheck: (text: string) => text.includes('5.321') || text.includes('5,3') || text.includes('5.3'),
			minSteps: 2
		}
	},
	{
		id: 'TC-03',
		category: 'transaction_filter',
		prompt: 'Berapa total cicilan Nmax dan SPP anak yang harus dibayar bulan depan?',
		expected: {
			requiredTools: ['list_transactions'],
			mustContain: ['Nmax', 'SPP'],
			minSteps: 2
		}
	},
	{
		id: 'TC-04',
		category: 'ui_control',
		prompt: 'Tolong buka halaman planning dan arahkan saya ke anggaran',
		expected: {
			requiredTools: ['navigate_page'],
			mustContain: ['/planning'],
			minSteps: 1
		}
	},
	{
		id: 'TC-05',
		category: 'financial_sanity',
		prompt: 'Apakah transfer antar dompet sendiri mengurangi networth saya?',
		expected: {
			requiredTools: [],
			mustContain: ['tidak', 'berkurang'],
			minSteps: 1
		}
	}
];
