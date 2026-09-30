<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte.js';
	import { settingsStore, getDefaultActivePeriods } from '$lib/stores/settings.svelte.js';
	import {
		calculatePointInTimeNetWorth,
		calculatePointInTimeWalletBalances
	} from '$lib/utils/networth-timeline.js';
	import { getConvertedBalanceInIDR } from '$lib/utils/currency.js';
	import HorizonPeriodColumn, { type GlobalFilters } from './HorizonPeriodColumn.svelte';
	import AddPeriodCard from './AddPeriodCard.svelte';
	import type { PeriodSummary, GoalProjection } from './PeriodSummaryCard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

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

	// Cascading Period Summaries Computation
	const periodSummaries = $derived.by(() => {
		const summaries: PeriodSummary[] = [];

		// Milestone tracking so a goal only badges "Tercapai!" the first period it crosses 100%
		const achievedGoals = new Set<string>();

		for (let i = 0; i < orderedPeriods.length; i++) {
			const periodKey = orderedPeriods[i];
			const { startDate, endDate } = getMonthDateBounds(periodKey);

			// Filter transactions for this period to compute cashflow
			let inSum = 0;
			let outSum = 0;

			for (const t of allTxs) {
				const txDate = t.transactionDate.slice(0, 10);
				if (txDate >= startDate && txDate <= endDate) {
					const curr = getWalletCurrency(t.transactionWalletId);
					const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr);

					if (t.transactionType === 'income') {
						inSum += amtIDR;
					} else if (t.transactionType === 'expense') {
						outSum += amtIDR;
					}
				}
			}

			const net = inSum - outSum;

			// Deterministic portfolio Net Worth and Spendable/Locked breakdown at this period's horizon
			const nwResult = calculatePointInTimeNetWorth({
				currentNetWorth,
				allTransactions: allTxs,
				endDate,
				wallets: allWallets,
				currentSpendable,
				currentLocked
			});

			// Deterministic point-in-time balances for every individual wallet at this period's horizon
			const walletBalancesAtHorizon = calculatePointInTimeWalletBalances({
				wallets: allWallets,
				allTransactions: allTxs,
				endDate
			});

			// Compute Goal Snapshots derived from linked wallet balances at this horizon
			const goalSnapshots: GoalProjection[] = activeGoals.map((g) => {
				let currentAmount = 0;
				if (g.linkedWalletsBreakdown && g.linkedWalletsBreakdown.length > 0) {
					for (const lw of g.linkedWalletsBreakdown) {
						const rawBal = walletBalancesAtHorizon.get(lw.walletId) ?? lw.balance;
						currentAmount += getConvertedBalanceInIDR(rawBal, lw.currency);
					}
				} else {
					currentAmount = g.currentAmount;
				}

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
				closingNetWorth: nwResult.amount,
				spendable: nwResult.spendableAmount,
				locked: nwResult.lockedAmount,
				goalSnapshots,
				label: nwResult.label
			});
		}

		return summaries;
	});
</script>

{#if reedrichStore.isLedgerLoading && reedrichStore.allTransactions.length === 0}
	<!-- Skeleton Loading Board -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
		{#each [0, 1, 2] as i (i)}
			<div class="flex flex-col rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
				<!-- Header skeleton -->
				<div
					class="flex items-center justify-between border-b border-[#EAEAEA] bg-[#FDFCFB] px-3.5 py-2.5"
				>
					<div class="space-y-1">
						<Skeleton class="h-3.5 w-24" />
						<Skeleton class="h-2.5 w-16" />
					</div>
					<Skeleton class="size-6 rounded" />
				</div>
				<!-- Table rows skeleton -->
				<div class="h-[320px] space-y-3 divide-y divide-[#EAEAEA] p-3">
					{#each [0, 1, 2, 3, 4] as r (r)}
						<div class="space-y-1.5 py-1">
							<div class="flex items-center justify-between gap-2">
								<Skeleton class="h-3 w-14 shrink-0" />
								<Skeleton class="h-3 max-w-[140px] flex-1" />
								<Skeleton class="h-3 w-20 shrink-0 text-right" />
							</div>
							<div class="flex items-center justify-between">
								<Skeleton class="h-2.5 w-16" />
								<Skeleton class="h-2.5 w-12" />
							</div>
						</div>
					{/each}
				</div>
				<!-- Summary card skeleton -->
				<div class="space-y-3 rounded-b-lg border-t border-[#EAEAEA] bg-[#FDFCFB] p-3">
					<div class="space-y-1 border-b border-[#EAEAEA] pb-2">
						<div class="flex justify-between">
							<Skeleton class="h-2.5 w-20" />
							<Skeleton class="h-3 w-16" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-2.5 w-16" />
							<Skeleton class="h-2.5 w-24" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-2.5 w-16" />
							<Skeleton class="h-2.5 w-24" />
						</div>
					</div>
					<div class="space-y-1">
						<div class="flex justify-between">
							<Skeleton class="h-2.5 w-28" />
							<Skeleton class="h-3 w-24" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-2.5 w-24" />
							<Skeleton class="h-2.5 w-20" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-2.5 w-24" />
							<Skeleton class="h-2.5 w-20" />
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
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
{/if}
