import type { TransactionRecord, BudgetSnapshot } from '$lib/types/account-detail';

/**
 * Checks if a transaction matches any of the selected budget IDs.
 * Matches directly via transactionBudgetId, or falls back to category matching.
 */
export function matchesBudgetFilter(
	transaction: TransactionRecord,
	selectedBudgetIds: string[],
	budgetMap: Map<string, BudgetSnapshot>,
	categoryResolver: (categoryId?: string | null) => string
): boolean {
	if (selectedBudgetIds.length === 0) return true;

	const bId = transaction.transactionBudgetId;
	if (bId && selectedBudgetIds.includes(bId)) {
		return true;
	}

	// Fallback matching: if transaction lacks transactionBudgetId, match by linked budget category
	return selectedBudgetIds.some((sbId) => {
		const b = budgetMap.get(sbId);
		if (!b || !b.categoryName) return false;

		const resolvedCategory = categoryResolver(transaction.transactionCategoryId).toLowerCase();
		const budgetCategory = b.categoryName.toLowerCase();

		return (
			resolvedCategory === budgetCategory || transaction.transactionCategoryId === b.categoryName
		);
	});
}
