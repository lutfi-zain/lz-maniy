export interface UserProfileDTO {
	userId: string;
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	whatsappNumber?: string;
	createdAt: string;
}

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
	categoryName?: string;
	categoryId?: string | null;
	amount: number;
	periodStart?: string;
	periodEnd?: string;
	notes?: string | null;
	spent: number;
	remaining: number;
	percentUsed: number;
	status?: 'on_track' | 'warning' | 'over_budget';
}

export interface LinkedWalletBreakdown {
	walletId: string;
	walletName: string;
	balance: number;
	currency: string;
	convertedAmount: number;
	usedPeg: boolean;
}

export interface GoalPacingDTO {
	progressPercentage?: number;
	remainingAmount?: number;
	isCompleted?: boolean;
	daysRemaining?: number | null;
	requiredDailySavings?: number | null;
	requiredMonthlySavings?: number | null;
}

export interface GoalSnapshot {
	goalId: string;
	goalName: string;
	targetAmount: number;
	currentAmount: number;
	currency?: string;
	targetDate?: string | null;
	categoryId?: string | null;
	notes?: string | null;
	status?: 'in_progress' | 'completed' | 'cancelled';
	progressPercentage: number;
	isDerived: boolean;
	daysRemaining: number | null;
	pacing?: GoalPacingDTO;
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
	transactionOccurrenceDate?: string | null;
	transactionRealizedAt?: string | null;
	transactionPlannedAmount?: number | null;
	transactionTemplateId?: string | null;
	transactionDate: string;
	transactionCreatedAt?: string;
}

export interface CreateTransactionPayload {
	walletId: string;
	categoryId: string;
	amount: number;
	type: 'expense' | 'income';
	date: string;
	transactionDate?: string;
	budgetId?: string | null;
	adminFee?: number;
	description?: string | null;
	isPlanned?: boolean;
}

export interface CreateTransferPayload {
	sourceWalletId: string;
	targetWalletId: string;
	amount: number;
	adminFee?: number;
	description?: string | null;
	categoryId?: string | null;
	date?: string;
	transactionDate?: string;
	isPlanned?: boolean;
}

export interface UpdateTransactionPayload {
	amount?: number;
	adminFee?: number;
	walletId?: string;
	targetWalletId?: string | null;
	categoryId?: string | null;
	budgetId?: string | null;
	description?: string | null;
	date?: string;
	transactionDate?: string;
	isPlanned?: boolean;
}

export interface CategoryRecord {
	categoryId: string;
	categoryName: string;
	categoryType: 'expense' | 'income';
	categoryIcon?: string | null;
}

export type DrawerType =
	| 'wallet'
	| 'category'
	| 'budget'
	| 'goal'
	| 'obligation'
	| 'networth'
	| 'wallet-form'
	| 'category-form'
	| 'budget-form'
	| 'goal-form'
	| 'recurring-detail'
	| 'recurring-form'
	| 'profile-form';

export interface DrawerState {
	type: DrawerType;
	title: string;
	subtitle: string;
	badge: string;
	data: Record<string, unknown>;
}
export interface UserSettings {
	ledgerViewMode: 'single' | 'calendar_board';
	activePeriods: string[];
	dateStartOfMonth?: number;
	language?: 'id' | 'en';
	mainCurrency?: 'IDR' | 'USD';
}
export interface CreateWalletPayload {
	name: string;
	institution?: string;
	type?: 'bank' | 'cash' | 'e-wallet' | 'credit' | 'crypto' | 'investment';
	balance?: number;
	currency?: string;
	isLocked?: boolean;
}

export interface UpdateWalletPayload {
	name?: string;
	institution?: string;
	type?: 'bank' | 'cash' | 'e-wallet' | 'credit' | 'crypto' | 'investment';
	balance?: number;
	currency?: string;
	isLocked?: boolean;
}

export interface CreateCategoryPayload {
	name: string;
	type?: 'expense' | 'income';
	icon?: string | null;
}

export interface UpdateCategoryPayload {
	name?: string;
	icon?: string | null;
}

export interface CreateBudgetPayload {
	name: string;
	amount: number;
	periodStart: string;
	periodEnd: string;
	categoryId?: string | null;
}

export interface UpdateBudgetPayload {
	name?: string;
	amount?: number;
	periodStart?: string;
	periodEnd?: string;
	categoryId?: string | null;
}

export interface CreateGoalPayload {
	name: string;
	targetAmount: number;
	currentAmount?: number;
	currency?: string;
	targetDate?: string | null;
	walletId?: string | null;
	walletIds?: string[];
	categoryId?: string | null;
	notes?: string | null;
}

export interface UpdateGoalPayload {
	name?: string;
	targetAmount?: number;
	currentAmount?: number;
	currency?: string;
	targetDate?: string | null;
	status?: 'in_progress' | 'completed' | 'cancelled';
	notes?: string | null;
}

export interface ContributeGoalPayload {
	amount: number;
	walletId?: string | null;
}

export interface RecurringTemplate {
	templateId: string;
	templateUserId?: string;
	templateName: string;
	templateWalletId: string;
	templateTargetWalletId?: string | null;
	templateCategoryId?: string | null;
	templateAmount: number;
	templateAdminFee?: number;
	templateType: 'expense' | 'income' | 'transfer';
	templateFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	templateInterval?: number;
	templateStartDate: string;
	templateNextRunDate?: string;
	templateEndDate?: string | null;
	templateIsActive: number | boolean;
	templateNotes?: string | null;
	templateCreatedAt?: string;
}

export interface CreateRecurringTemplatePayload {
	name: string;
	walletId: string;
	targetWalletId?: string | null;
	categoryId?: string | null;
	amount: number;
	adminFee?: number;
	type?: 'expense' | 'income' | 'transfer';
	frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval?: number;
	startDate: string;
	nextRunDate?: string;
	endDate?: string | null;
	isActive?: boolean;
	notes?: string | null;
}

export interface UpdateRecurringTemplatePayload {
	name?: string;
	walletId?: string;
	categoryId?: string | null;
	amount?: number;
	adminFee?: number;
	type?: 'expense' | 'income' | 'transfer';
	frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval?: number;
	nextRunDate?: string;
	endDate?: string | null;
	isActive?: boolean;
	notes?: string | null;
}

export interface ApplyRecurringTemplatePayload {
	transactionId?: string;
	executionDate?: string;
	actualAmount?: number;
}

export interface UpdateProfilePayload {
	firstName?: string;
	lastName?: string;
	whatsappNumber?: string;
}

export interface PaginationMetadata {
	total: number;
	limit: number;
	offset: number;
	hasNext: boolean;
	totalPages: number;
}

export interface TransactionEnvelope {
	items: TransactionRecord[];
	pagination: PaginationMetadata;
}

export interface TransactionQueryParams {
	walletId?: string | string[];
	targetWalletId?: string | string[];
	categoryId?: string | string[];
	budgetId?: string | string[];
	type?: 'expense' | 'income' | 'transfer' | 'all';
	status?: 'realized' | 'planned' | 'all';
	isPlanned?: boolean;
	q?: string;
	search?: string;
	startDate?: string;
	endDate?: string;
	envelope?: boolean;
	limit?: number;
	offset?: number;
}

export interface HorizonPeriodSummary {
	periodKey: string;
	startDate: string;
	endDate: string;
	cashflow: {
		income: number;
		expense: number;
		net: number;
	};
	netWorth: {
		total: number;
		spendable: number;
		locked: number;
	};
	walletBalances: Array<{
		walletId: string;
		walletName: string;
		balance: number;
		currency: string;
		isLocked: number;
	}>;
	goals: Array<{
		goalId: string;
		name: string;
		currentAmount: number;
		targetAmount: number;
		progressPercentage: number;
		isReached: boolean;
	}>;
}

export interface HorizonBoardDTO {
	baseCurrency: string;
	generatedAt: string;
	startingNetWorth: {
		total: number;
		spendable: number;
		locked: number;
	};
	periods: HorizonPeriodSummary[];
}
