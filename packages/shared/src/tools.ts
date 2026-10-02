export type WalletType = 'bank' | 'cash' | 'e-wallet' | 'credit' | 'crypto' | 'investment';

export interface WalletCreateParams {
	name: string;
	institution?: string;
	type?: WalletType;
	balance?: number;
	currency?: string;
	isLocked?: boolean | number;
}

export interface WalletUpdateParams {
	walletId: string;
	name?: string;
	institution?: string;
	type?: WalletType;
	balance?: number;
	currency?: string;
	isLocked?: boolean | number;
}

export interface BudgetCreateParams {
	name: string;
	amount: number;
	periodStart?: string;
	periodEnd?: string;
	categoryId?: string;
}

export interface BudgetUpdateParams {
	budgetId: string;
	name?: string;
	amount?: number;
	periodStart?: string;
	periodEnd?: string;
	categoryId?: string;
}

export interface DebtLoanCreateParams {
	personName: string;
	amount: number;
	type?: 'debt' | 'loan';
	walletId?: string;
	dueDate?: string;
	notes?: string;
	adjustWalletBalance?: boolean;
}

export interface DebtLoanRepayParams {
	debtLoanId: string;
	amount: number;
	walletId?: string;
	adjustWalletBalance?: boolean;
}

export interface DebtLoanUpdateParams {
	debtLoanId: string;
	personName?: string;
	dueDate?: string;
	notes?: string;
}

export interface GoalCreateParams {
	name: string;
	targetAmount: number;
	currentAmount?: number;
	currency?: string;
	targetDate?: string;
	walletId?: string;
	walletIds?: string[];
	categoryId?: string;
	notes?: string;
}

export interface GoalUpdateParams {
	goalId: string;
	name?: string;
	targetAmount?: number;
	currentAmount?: number;
	currency?: string;
	targetDate?: string;
	status?: 'in_progress' | 'completed' | 'cancelled';
	notes?: string;
}

export interface GoalWalletLinkParams {
	goalId: string;
	walletId: string;
}

export interface RecurringTemplateCreateParams {
	name: string;
	walletId: string;
	targetWalletId?: string;
	categoryId?: string;
	amount: number;
	adminFee?: number;
	type?: 'expense' | 'income' | 'transfer';
	frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval?: number;
	startDate: string;
	nextRunDate?: string;
	endDate?: string;
	isActive?: boolean;
	notes?: string;
}

export interface RecurringTemplateUpdateParams {
	templateId: string;
	name?: string;
	amount?: number;
	frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
	nextRunDate?: string;
	walletId?: string;
	categoryId?: string;
	type?: 'expense' | 'income' | 'transfer';
	description?: string;
	isActive?: boolean;
	adminFee?: number;
}

export interface FeedbackParams {
	title: string;
	content: string;
	type?: 'feedback' | 'bug' | 'feature_request' | 'question';
	name?: string;
	email?: string;
}

export interface HorizonParams {
	months?: number;
	periods?: Array<[string, string]>;
	filter?: 'realized' | 'planned' | 'all';
	baseCurrency?: string;
}

export interface FinancialSummaryParams {
	startDate?: string;
	endDate?: string;
	baseCurrency?: string;
}

export interface ProfileUpdateParams {
	firstName?: string;
	lastName?: string;
	whatsappNumber?: string;
}
