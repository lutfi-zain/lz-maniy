import type { CategoryRecord, TransactionRecord, BudgetSnapshot } from '$lib/types/account-detail';
import { getConvertedBalanceInIDR } from '$lib/utils/currency';

export interface CategoryMetricItem {
	category: CategoryRecord;
	totalAmountIDR: number;
	transactionCount: number;
	percentageOfTotal: number;
	linkedBudget?: BudgetSnapshot | null;
}

export interface CategoryStudioStats {
	items: CategoryMetricItem[];
	expenseItems: CategoryMetricItem[];
	incomeItems: CategoryMetricItem[];
	totalExpenseIDR: number;
	totalIncomeIDR: number;
	dominantExpenseCategory: CategoryMetricItem | null;
}

export type CategorySortOption = 'balance_desc' | 'balance_asc' | 'count_desc' | 'name_asc';

/**
 * Calculates aggregated financial metrics for all categories within a specified date window.
 */
export function calculateCategoryMetrics(options: {
	categories: CategoryRecord[];
	transactions: TransactionRecord[];
	budgets?: BudgetSnapshot[];
	walletCurrencyMap?: Map<string, string>;
	startDate?: string;
	endDate?: string;
}): CategoryStudioStats {
	const {
		categories = [],
		transactions = [],
		budgets = [],
		walletCurrencyMap = new Map<string, string>(),
		startDate,
		endDate
	} = options;

	// 1. Filter transactions by date range (ignoring transfers for category cashflow)
	const inScopeTransactions = transactions.filter((t) => {
		if (t.transactionType === 'transfer') return false;
		if (!t.transactionCategoryId) return false;

		const d = (t.transactionDate || '').slice(0, 10);
		if (startDate && d < startDate) return false;
		if (endDate && d > endDate) return false;

		return true;
	});

	// 2. Aggregate sums and counts per category ID
	const catAmountMap = new Map<string, number>();
	const catCountMap = new Map<string, number>();

	for (const t of inScopeTransactions) {
		const catId = t.transactionCategoryId!;
		const curr = walletCurrencyMap.get(t.transactionWalletId) || 'IDR';
		const amountIDR = getConvertedBalanceInIDR(t.transactionAmount, curr);

		catAmountMap.set(catId, (catAmountMap.get(catId) || 0) + amountIDR);
		catCountMap.set(catId, (catCountMap.get(catId) || 0) + 1);
	}

	// 3. Map budget lookup by category ID or category Name
	const budgetMap = new Map<string, BudgetSnapshot>();
	for (const b of budgets) {
		if (b.categoryId) {
			budgetMap.set(b.categoryId, b);
		} else if (b.categoryName) {
			budgetMap.set(b.categoryName.toLowerCase(), b);
		}
	}

	// 4. Calculate total expense and total income for percentage shares
	let totalExpenseIDR = 0;
	let totalIncomeIDR = 0;

	for (const cat of categories) {
		const amt = catAmountMap.get(cat.categoryId) || 0;
		if (cat.categoryType === 'expense') {
			totalExpenseIDR += amt;
		} else if (cat.categoryType === 'income') {
			totalIncomeIDR += amt;
		}
	}

	// 5. Build enriched CategoryMetricItem list
	const items: CategoryMetricItem[] = categories.map((cat) => {
		const totalAmountIDR = catAmountMap.get(cat.categoryId) || 0;
		const transactionCount = catCountMap.get(cat.categoryId) || 0;

		const totalBaseline = cat.categoryType === 'expense' ? totalExpenseIDR : totalIncomeIDR;
		const percentageOfTotal = totalBaseline > 0 ? (totalAmountIDR / totalBaseline) * 100 : 0;

		const linkedBudget =
			budgetMap.get(cat.categoryId) || budgetMap.get(cat.categoryName.toLowerCase()) || null;

		return {
			category: cat,
			totalAmountIDR,
			transactionCount,
			percentageOfTotal,
			linkedBudget
		};
	});

	const expenseItems = items.filter((i) => i.category.categoryType === 'expense');
	const incomeItems = items.filter((i) => i.category.categoryType === 'income');

	// 6. Determine dominant expense category
	let dominantExpenseCategory: CategoryMetricItem | null = null;
	if (expenseItems.length > 0) {
		const sorted = [...expenseItems].sort((a, b) => b.totalAmountIDR - a.totalAmountIDR);
		if (sorted[0].totalAmountIDR > 0) {
			dominantExpenseCategory = sorted[0];
		}
	}

	return {
		items,
		expenseItems,
		incomeItems,
		totalExpenseIDR,
		totalIncomeIDR,
		dominantExpenseCategory
	};
}

/**
 * Sorts category metric items based on chosen sorting criteria.
 */
export function sortCategoryMetrics(
	items: CategoryMetricItem[],
	sortBy: CategorySortOption
): CategoryMetricItem[] {
	const list = [...items];

	switch (sortBy) {
		case 'balance_desc':
			return list.sort((a, b) => b.totalAmountIDR - a.totalAmountIDR);
		case 'balance_asc':
			return list.sort((a, b) => a.totalAmountIDR - b.totalAmountIDR);
		case 'count_desc':
			return list.sort((a, b) => b.transactionCount - a.transactionCount);
		case 'name_asc':
			return list.sort((a, b) => a.category.categoryName.localeCompare(b.category.categoryName));
		default:
			return list;
	}
}
