<script lang="ts">
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { planningFilterStore } from '$lib/stores/planning-filter.svelte';
	import { settingsStore, getDefaultActivePeriods } from '$lib/stores/settings.svelte.js';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import { fmtIDR, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { mLabel, getPeriodDateBounds } from '$lib/utils/dates';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import CornersOut from 'phosphor-svelte/lib/CornersOut';
	import Trash from 'phosphor-svelte/lib/Trash';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import AddPeriodCard from '$lib/components/ledger/AddPeriodCard.svelte';
	import type { GoalSnapshot, HorizonBoardDTO } from '$lib/types/account-detail';

	// Ordered active periods (ascending chronological)
	const orderedPeriods = $derived.by(() => {
		const raw = settingsStore.settings.activePeriods;
		if (!raw || raw.length === 0) {
			return getDefaultActivePeriods();
		}
		return [...raw].sort((a, b) => {
			return getPeriodDateBounds(a).startDate.localeCompare(getPeriodDateBounds(b).startDate);
		});
	});

	let isHorizonLoading = $state<boolean>(true);
	let horizonData = $state<HorizonBoardDTO | null>(null);

	$effect(() => {
		const periods = orderedPeriods;
		const controller = new AbortController();
		isHorizonLoading = true;

		reedrichStore
			.fetchHorizonProjections(periods, undefined, controller.signal)
			.then((data) => {
				if (controller.signal.aborted) return;
				horizonData = data;
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				console.warn('Horizon goals projections API error, using local fallback:', err);
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					isHorizonLoading = false;
				}
			});

		return () => {
			controller.abort();
		};
	});

	const allWallets = $derived(reedrichStore.allWallets);
	const activeGoals = $derived(reedrichStore.activeGoals);

	interface GoalColumnItem {
		goal: GoalSnapshot;
		currentAmount: number;
		progressPercentage: number;
		isReached: boolean;
		isMilestone: boolean;
		isOverdue: boolean;
		monthlyPacing: number | null;
	}

	// Precompute point-in-time state per period
	const periodData = $derived.by(() => {
		const achievedGoalSet = new SvelteSet<string>();

		return orderedPeriods.map((periodKey) => {
			const { startDate, endDate } = getPeriodDateBounds(periodKey);
			const srvPeriod = horizonData?.periods.find((p) => p.periodKey === periodKey);

			// Build point-in-time balances map
			const balances = new SvelteMap<string, number>();
			if (srvPeriod) {
				for (const wb of srvPeriod.walletBalances) {
					balances.set(wb.walletId, wb.balance);
				}
			} else {
				console.warn(
					`[GoalsHorizonBoard] No server horizon data for period ${periodKey}, falling back to current wallet balances`
				);
				for (const w of allWallets) {
					balances.set(w.walletId, w.balance);
				}
			}
			// Map each goal to its point-in-time progress
			const mappedGoals: GoalColumnItem[] = activeGoals.map((g) => {
				let currentAmount = 0;
				if (g.linkedWalletsBreakdown && g.linkedWalletsBreakdown.length > 0) {
					for (const lw of g.linkedWalletsBreakdown) {
						const rawBal = balances.get(lw.walletId) ?? lw.balance;
						currentAmount += getConvertedBalanceInIDR(rawBal, lw.currency);
					}
				} else {
					currentAmount = g.currentAmount;
				}

				const progressPercentage = g.targetAmount > 0 ? (currentAmount / g.targetAmount) * 100 : 0;
				const isReached = currentAmount >= g.targetAmount && g.targetAmount > 0;
				let isMilestone = false;
				if (isReached && !achievedGoalSet.has(g.goalId)) {
					isMilestone = true;
					achievedGoalSet.add(g.goalId);
				}

				// Check overdue status at this horizon
				let isOverdue = false;
				if (g.targetDate && endDate > g.targetDate && !isReached) {
					isOverdue = true;
				}

				// Calculate pacing if not reached
				let monthlyPacing: number | null = null;
				if (g.targetDate && !isReached && endDate <= g.targetDate) {
					const remainingNominal = Math.max(0, g.targetAmount - currentAmount);
					const horizonDate = new Date(endDate);
					const targetDate = new Date(g.targetDate);
					const monthsDiff = Math.max(
						1,
						(targetDate.getFullYear() - horizonDate.getFullYear()) * 12 +
							(targetDate.getMonth() - horizonDate.getMonth())
					);
					monthlyPacing = Math.round(remainingNominal / monthsDiff);
				}

				return {
					goal: g,
					currentAmount,
					progressPercentage,
					isReached,
					isMilestone,
					isOverdue,
					monthlyPacing
				};
			});

			// Filter based on planningFilterStore.goalFilter
			const filter = planningFilterStore.goalFilter;
			const filteredGoals = mappedGoals.filter((item) => {
				if (filter === 'all') return true;
				if (filter === 'completed') return item.isReached;
				if (filter === 'overdue') return item.isOverdue;
				if (filter === 'in_progress') return !item.isReached && !item.isOverdue;
				return true;
			});

			return {
				periodKey,
				startDate,
				endDate,
				periodTitle: mLabel(periodKey, i18nStore.locale),
				goals: filteredGoals
			};
		});
	});

	function handleMaximize(startDate: string, endDate: string) {
		dateFilterStore.setFilter('custom', startDate, endDate);
		planningFilterStore.goalsViewMode = 'list';
	}

	function handleGoalClick(g: GoalSnapshot) {
		reedrichStore.openDrawer({
			type: 'goal',
			title: g.goalName,
			subtitle: `Target: ${fmtIDR(g.targetAmount)}`,
			badge: 'TARGET TABUNGAN',
			data: { goal: g }
		});
	}
</script>

{#if isHorizonLoading && !horizonData && activeGoals.length === 0}
	<!-- Skeleton loading grid -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
		{#each [0, 1, 2] as i (i)}
			<div class="flex flex-col rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
				<div
					class="flex items-center justify-between border-b border-[#EAEAEA] bg-[#FDFCFB] px-3.5 py-2.5"
				>
					<Skeleton class="h-3.5 w-24" />
					<Skeleton class="size-6 rounded" />
				</div>
				<div class="h-[320px] space-y-3 p-3">
					{#each [0, 1, 2] as r (r)}
						<Skeleton class="h-20 w-full rounded" />
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Multi-Period Wrapping Grid -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
		{#each periodData as col (col.periodKey)}
			<div class="flex flex-col rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
				<!-- Header -->
				<div
					class="flex items-center justify-between border-b border-[#EAEAEA] bg-[#FDFCFB] px-3.5 py-2.5"
				>
					<div>
						<h2 class="text-xs font-semibold text-[#111111]">{col.periodTitle}</h2>
						<span class="font-mono text-[10px] text-[#787774]">
							{col.goals.length}
							{i18nStore.locale === 'id' ? 'target' : 'goals'}
						</span>
					</div>

					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => handleMaximize(col.startDate, col.endDate)}
							class="flex size-6 cursor-pointer items-center justify-center rounded text-[#787774] transition-colors hover:bg-[#F0EFEC] hover:text-[#111111] active:scale-95"
							title={i18nStore.locale === 'id'
								? 'Maksimalkan periode ke tampilan List'
								: 'Maximize period to List view'}
							aria-label={i18nStore.locale === 'id'
								? 'Maksimalkan periode ke tampilan List'
								: 'Maximize period to List view'}
						>
							<CornersOut class="size-3.5" weight="bold" />
						</button>

						{#if orderedPeriods.length > 1}
							<button
								type="button"
								onclick={() => settingsStore.removePeriod(col.periodKey)}
								class="flex size-6 cursor-pointer items-center justify-center rounded text-[#787774] transition-colors hover:bg-[#F0EFEC] hover:text-[#9F2F2D] active:scale-95"
								title={i18nStore.locale === 'id'
									? 'Hapus periode dari board'
									: 'Remove period from board'}
								aria-label={i18nStore.locale === 'id'
									? 'Hapus periode dari board'
									: 'Remove period from board'}
							>
								<Trash class="size-3.5" weight="bold" />
							</button>
						{/if}
					</div>
				</div>

				<!-- Goals List in this Period -->
				<div class="h-[360px] space-y-2.5 overflow-y-auto p-3 text-xs">
					{#if col.goals.length === 0}
						<div class="flex h-full flex-col items-center justify-center p-4 text-center">
							<p class="text-[11px] text-[#787774]">{t('ledger.summary.noGoals')}</p>
						</div>
					{:else}
						{#each col.goals as item (item.goal.goalId)}
							{@const pct = Math.min(100, Math.round(item.progressPercentage))}
							<button
								type="button"
								onclick={() => handleGoalClick(item.goal)}
								class="flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-[#EAEAEA] bg-white p-2.5 text-left transition-colors hover:border-[#111111]"
							>
								<div class="flex items-center justify-between gap-1">
									<span class="truncate font-medium text-[#111111]">{item.goal.goalName}</span>
									{#if item.isMilestone}
										<span
											class="shrink-0 rounded bg-[#EDF3EC] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#346538]"
										>
											{i18nStore.locale === 'id' ? '✓ Tercapai!' : '✓ Reached!'}
										</span>
									{:else if item.isOverdue}
										<span
											class="shrink-0 rounded bg-[#FDEBEC] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#9F2F2D]"
										>
											{i18nStore.locale === 'id' ? 'Lewat Tenggat' : 'Overdue'}
										</span>
									{:else}
										<span class="shrink-0 font-mono text-[10px] font-semibold text-[#787774]">
											{pct}%
										</span>
									{/if}
								</div>

								<!-- Progress Bar -->
								<div class="h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
									<div
										class="h-full rounded-full transition-all duration-300 {item.isReached
											? 'bg-[#346538]'
											: item.isOverdue
												? 'bg-[#9F2F2D]'
												: 'bg-[#956400]'}"
										style="width: {pct}%"
									></div>
								</div>

								<!-- Balances -->
								<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
									<span>{fmtIDR(item.currentAmount)}</span>
									<span>{fmtIDR(item.goal.targetAmount)}</span>
								</div>

								<!-- Pacing Info -->
								{#if item.monthlyPacing && !item.isReached}
									<div class="border-t border-[#F0EFEC] pt-1 text-[10px] text-[#787774]">
										<span>Pacing:</span>
										<strong class="font-mono text-[#111111]">+{fmtIDR(item.monthlyPacing)}</strong
										>/bln
									</div>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/each}

		<!-- Add Period Action Card -->
		<AddPeriodCard />
	</div>
{/if}
