export type TransactionType = 'expense' | 'income' | 'transfer';

export interface LastTransaction {
	transactionId: string;
	date: string;
	type: TransactionType;
	direction: 'in' | 'out';
	amount: number;
	description: string;
	category: string;
}

export interface WalletItem {
	walletId: string;
	walletName: string;
	institution: string;
	type: 'bank' | 'e-wallet' | 'cash' | 'crypto' | 'credit' | 'investment';
	currency: string;
	balance: number;
	isLocked: 0 | 1;
	lastTransaction: LastTransaction | null;
}

export interface WalletPartition {
	total: number;
	items: WalletItem[];
}

export interface WalletsSnapshot {
	spendable: WalletPartition;
	locked: WalletPartition;
}

export interface ConsolidatedNetWorth {
	total: number;
	currency: string;
	isEstimated: boolean;
	fxSource: string;
}

export interface NetWorthSnapshot {
	consolidated: ConsolidatedNetWorth;
	byCurrency: Record<string, number>;
	byInstitution: Record<string, number>;
}

export interface CategoryBreakdownItem {
	categoryName: string;
	amount: number;
	percentage: number;
}

export interface CashFlowPeriod {
	start: string;
	end: string;
}

export interface MonthlyCashFlow {
	period: CashFlowPeriod;
	totalIncome: number;
	totalExpense: number;
	netSavings: number;
	categoryBreakdown: CategoryBreakdownItem[];
}

export interface BudgetSnapshot {
	budgetId: string;
	budgetName: string;
	categoryName: string;
	amount: number;
	spent: number;
	remaining: number;
	percentUsed: number;
	status: 'on_track' | 'warning' | 'over_budget';
}

export interface LinkedWalletBreakdown {
	walletId: string;
	walletName: string;
	balance: number;
	currency: string;
	convertedAmount: number;
	usedPeg: boolean;
}

export interface GoalSnapshot {
	goalId: string;
	goalName: string;
	targetAmount: number;
	currentAmount: number;
	progressPercentage: number;
	isDerived: boolean;
	daysRemaining: number | null;
	linkedWalletsBreakdown?: LinkedWalletBreakdown[];
}

export interface ActiveDebt {
	debtLoanId: string;
	personName: string;
	remainingAmount: number;
	dueDate: string | null;
	status: 'unpaid' | 'partially_paid' | 'paid';
}

export interface ActiveLoan {
	debtLoanId: string;
	personName: string;
	remainingAmount: number;
	dueDate: string | null;
	status: 'unpaid' | 'partially_paid' | 'paid';
}

export interface ObligationsSnapshot {
	totalDebt: number;
	totalReceivable: number;
	activeDebts: ActiveDebt[];
	activeLoans: ActiveLoan[];
}

export interface AccountDetail {
	netWorth: NetWorthSnapshot;
	wallets: WalletsSnapshot;
	monthlyCashFlow: MonthlyCashFlow;
	budgets: BudgetSnapshot[];
	goals: GoalSnapshot[];
	obligations: ObligationsSnapshot;
}

export interface TransactionRecord {
	transactionId: string;
	transactionUserId?: string;
	transactionWalletId: string;
	transactionTargetWalletId?: string | null;
	transactionCategoryId?: string | null;
	transactionBudgetId?: string | null;
	transactionAmount: number;
	transactionAdminFee?: number;
	transactionType: TransactionType;
	transactionDescription?: string | null;
	transactionIsPlanned: 0 | 1;
	transactionDate: string;
	transactionCreatedAt?: string;
}

export interface CategoryRecord {
	categoryId: string;
	categoryName: string;
	categoryType: 'expense' | 'income';
	categoryIcon?: string | null;
}

export type DrawerType = 'wallet' | 'category' | 'budget' | 'goal' | 'obligation' | 'networth';

export interface DrawerState {
	type: DrawerType;
	title: string;
	subtitle: string;
	badge: string;
	data: Record<string, unknown>;
}
