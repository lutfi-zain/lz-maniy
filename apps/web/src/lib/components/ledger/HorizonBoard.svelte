<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte.js';
	import { settingsStore, getDefaultActivePeriods } from '$lib/stores/settings.svelte.js';
	import { calculatePointInTimeNetWorth } from '$lib/utils/networth-timeline.js';
	import { getConvertedBalanceInIDR } from '$lib/utils/currency.js';
	import HorizonPeriodColumn, { type GlobalFilters } from './HorizonPeriodColumn.svelte';
	import AddPeriodCard from './AddPeriodCard.svelte';
	import type { PeriodSummary, GoalProjection } from './PeriodSummaryCard.svelte';

	let { globalFilters }: { globalFilters: GlobalFilters } = $props();

	// Ordered active periods (ascending chronological)
	const orderedPeriods = $derived.by(() => {
		const raw = settingsStore.settings.activePeriods;
		if (!raw || raw.length === 0) {
			return getDefaultActivePeriods();
		}
		return [...raw].sort();
	});

	// Helper to calculate start and end dates for any YYYY-MM
	function getMonthDateBounds(yearMonth: string) {
		const [yStr, mStr] = yearMonth.split('-');
		const y = parseInt(yStr, 10);
		const m = parseInt(mStr, 10);
		const startDate = `${yearMonth}-01`;
		// Day 0 of next month is the last day of current month
		const lastDay = new Date(y, m, 0).getDate();
		const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
		return { startDate, endDate };
	}

	const allTxs = $derived(reedrichStore.allTransactions);
	const allWallets = $derived(reedrichStore.allWallets);
	const activeGoals = $derived(reedrichStore.activeGoals);
	const currentNetWorth = $derived(reedrichStore.snapshot?.netWorth?.consolidated?.total ?? 0);
	const currentSpendable = $derived(reedrichStore.snapshot?.wallets.spendable.total ?? 0);
	const currentLocked = $derived(reedrichStore.snapshot?.wallets.locked.total ?? 0);

	function getWalletCurrency(id?: string | null): string {
		if (!id) return 'IDR';
		const w = allWallets.find((x) => x.walletId === id);
		return w?.currency ?? 'IDR';
	}

	// Goal wallet mapping: Set of wallet IDs associated with each goal
	const goalWalletMap = $derived.by(() => {
		const map = new Map<string, string[]>();
		for (const g of activeGoals) {
			const linkedIds = (g.linkedWalletsBreakdown ?? []).map((w) => w.walletId);
			map.set(g.goalId, linkedIds);
		}
		return map;
	});

	// Cascading Period Summaries Computation
	const periodSummaries = $derived.by(() => {
		const summaries: PeriodSummary[] = [];
		let runningNetWorth = currentNetWorth;
		let runningSpendable = currentSpendable;
		let runningLocked = currentLocked;

		// Running accumulated balances for each goal
		const runningGoalAmounts = new Map<string, number>();
		for (const g of activeGoals) {
			runningGoalAmounts.set(g.goalId, g.currentAmount);
		}

		// Milestone tracking so a goal only badges "Tercapai!" the first time it crosses 100%
		const achievedGoals = new Set<string>();

		for (let i = 0; i < orderedPeriods.length; i++) {
			const periodKey = orderedPeriods[i];
			const { startDate, endDate } = getMonthDateBounds(periodKey);

			// Filter transactions for this period to compute cashflow
			let inSum = 0;
			let outSum = 0;
			let plannedGoalTransfers = 0;

			// Goal-specific planned contributions in this period
			const periodGoalDelta = new Map<string, number>();

			for (const t of allTxs) {
				const txDate = t.transactionDate.slice(0, 10);
				if (txDate >= startDate && txDate <= endDate) {
					const curr = getWalletCurrency(t.transactionWalletId);
					const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr);

					if (t.transactionType === 'income') {
						inSum += amtIDR;
					} else if (t.transactionType === 'expense') {
						outSum += amtIDR;
					} else if (t.transactionType === 'transfer' && t.transactionTargetWalletId) {
						// Check if transfer targets a goal-linked wallet
						for (const [goalId, walletIds] of goalWalletMap.entries()) {
							if (walletIds.includes(t.transactionTargetWalletId)) {
								const curVal = periodGoalDelta.get(goalId) ?? 0;
								periodGoalDelta.set(goalId, curVal + amtIDR);
								plannedGoalTransfers += amtIDR;
							}
						}
					}
				}
			}

			const net = inSum - outSum;

			let closingNetWorth = 0;
			let spendable = 0;
			let locked = 0;
			let label = 'PROYEKSI NET WORTH';

			if (i === 0) {
				// Anchor period 0 to existing robust calculatePointInTimeNetWorth
				const baseResult = calculatePointInTimeNetWorth({
					currentNetWorth,
					allTransactions: allTxs,
					endDate,
					wallets: allWallets,
					currentSpendable,
					currentLocked
				});
				closingNetWorth = baseResult.amount;
				spendable = baseResult.spendableAmount;
				locked = baseResult.lockedAmount;
				label = baseResult.label;

				runningNetWorth = closingNetWorth;
				runningSpendable = spendable;
				runningLocked = locked;
			} else {
				// Cascading accumulation for subsequent periods
				runningNetWorth += net;
				// Transfers into goals/locked increase locked and reduce spendable
				runningSpendable = Math.max(0, runningSpendable + net - plannedGoalTransfers);
				runningLocked += plannedGoalTransfers;

				closingNetWorth = runningNetWorth;
				spendable = runningSpendable;
				locked = runningLocked;
				label = 'PROYEKSI NET WORTH';
			}

			// Compute Goal Snapshots at this horizon
			const goalSnapshots: GoalProjection[] = activeGoals.map((g) => {
				const prevAmt = runningGoalAmounts.get(g.goalId) ?? g.currentAmount;
				const addition = periodGoalDelta.get(g.goalId) ?? 0;
				const currentAmount = prevAmt + addition;
				runningGoalAmounts.set(g.goalId, currentAmount);

				const progressPercentage = g.targetAmount > 0 ? (currentAmount / g.targetAmount) * 100 : 0;
				const reached = currentAmount >= g.targetAmount && g.targetAmount > 0;
				let isMilestone = false;
				if (reached && !achievedGoals.has(g.goalId)) {
					isMilestone = true;
					achievedGoals.add(g.goalId);
				}

				return {
					goalId: g.goalId,
					goalName: g.goalName,
					targetAmount: g.targetAmount,
					currentAmount,
					progressPercentage,
					isMilestone
				};
			});

			summaries.push({
				periodKey,
				startDate,
				endDate,
				income: inSum,
				expense: outSum,
				net,
				closingNetWorth,
				spendable,
				locked,
				goalSnapshots,
				label
			});
		}

		return summaries;
	});
</script>

<!-- Multi-Period Wrapping Grid -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
	{#each orderedPeriods as periodKey, i (periodKey)}
		{@const { startDate, endDate } = getMonthDateBounds(periodKey)}
		<HorizonPeriodColumn
			{periodKey}
			{startDate}
			{endDate}
			periodSummary={periodSummaries[i]}
			{globalFilters}
			canRemove={orderedPeriods.length > 1}
		/>
	{/each}

	<!-- Add Period Action Card -->
	<AddPeriodCard />
</div>
