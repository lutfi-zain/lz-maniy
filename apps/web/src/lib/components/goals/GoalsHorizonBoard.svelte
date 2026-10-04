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
	import Plus from 'phosphor-svelte/lib/Plus';
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
	let showAddPeriodCard = $state(false);

	interface MatrixCell {
		periodKey: string;
		periodTitle: string;
		startDate: string;
		endDate: string;
		currentAmount: number;
		progressPercentage: number;
		isReached: boolean;
		isMilestone: boolean;
		isOverdue: boolean;
		monthlyPacing: number | null;
	}

	interface MatrixRow {
		goal: GoalSnapshot;
		cells: MatrixCell[];
		isVisible: boolean;
	}

	const matrixRows = $derived.by(() => {
		const filter = planningFilterStore.goalFilter;

		return activeGoals
			.map((g) => {
				const cells: MatrixCell[] = periodData.map((col) => {
					const item = col.goals.find((cg) => cg.goal.goalId === g.goalId);
					return {
						periodKey: col.periodKey,
						periodTitle: col.periodTitle,
						startDate: col.startDate,
						endDate: col.endDate,
						currentAmount: item?.currentAmount ?? g.currentAmount,
						progressPercentage: item?.progressPercentage ?? 0,
						isReached: item?.isReached ?? false,
						isMilestone: item?.isMilestone ?? false,
						isOverdue: item?.isOverdue ?? false,
						monthlyPacing: item?.monthlyPacing ?? null
					};
				});

				let isVisible = filter === 'all';
				if (!isVisible) {
					const firstCell = cells[0];
					if (firstCell) {
						if (filter === 'completed') isVisible = firstCell.isReached;
						else if (filter === 'overdue') isVisible = firstCell.isOverdue;
						else if (filter === 'in_progress')
							isVisible = !firstCell.isReached && !firstCell.isOverdue;
					}
				}

				return {
					goal: g,
					cells,
					isVisible
				};
			})
			.filter((r) => r.isVisible);
	});

	const sortedMatrixRows = $derived.by(() => {
		const list = [...matrixRows];
		list.sort((a, b) => {
			const aAmt = a.cells[0]?.currentAmount ?? a.goal.currentAmount;
			const bAmt = b.cells[0]?.currentAmount ?? b.goal.currentAmount;
			return bAmt - aAmt || b.goal.targetAmount - a.goal.targetAmount;
		});
		return list;
	});

	function addNextMonth() {
		const existing = settingsStore.settings.activePeriods;
		const now = new Date();
		if (existing.length === 0) {
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, '0');
			settingsStore.addPeriod(`${y}-${m}`);
			return;
		}

		const sorted = [...existing].sort((a, b) => {
			return getPeriodDateBounds(a).startDate.localeCompare(getPeriodDateBounds(b).startDate);
		});
		const latest = sorted[sorted.length - 1];
		const latestEnd = getPeriodDateBounds(latest).endDate;
		const [latestYearStr, latestMonthStr] = latestEnd.split('-');
		const latestYear = parseInt(latestYearStr, 10);
		const latestMonth = parseInt(latestMonthStr, 10);

		let nextYear = latestYear;
		let nextMonth = latestMonth + 1;
		if (nextMonth > 12) {
			nextYear += 1;
			nextMonth = 1;
		}

		const nextPeriodStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
		settingsStore.addPeriod(nextPeriodStr);
	}
</script>

{#if isHorizonLoading && !horizonData && activeGoals.length === 0}
	<!-- Skeleton loading -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-2xs">
		<Skeleton class="mb-4 h-5 w-48" />
		<div class="space-y-3">
			{#each [0, 1, 2, 3] as i (i)}
				<Skeleton class="h-10 w-full rounded" />
			{/each}
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<!-- Unified Ultra-Compact Horizon Matrix Table -->
		<div class="overflow-x-auto rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
			<table class="w-full border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-[#EAEAEA] bg-[#FDFCFB]">
						<!-- Sticky frozen column header for Goals -->
						<th
							scope="col"
							class="sticky left-0 z-20 min-w-[200px] border-r border-[#EAEAEA] bg-[#FDFCFB] px-4 py-3 font-semibold text-[#111111] sm:min-w-[240px]"
						>
							<div class="flex items-center justify-between">
								<span class="text-[11px] font-semibold tracking-wider text-[#787774] uppercase">
									{t('planning.tabs.goals')} ({sortedMatrixRows.length})
								</span>
							</div>
						</th>

						<!-- Period Columns Headers -->
						{#each orderedPeriods as periodKey (periodKey)}
							{@const bounds = getPeriodDateBounds(periodKey)}
							<th
								scope="col"
								class="min-w-[140px] px-3.5 py-2.5 text-right font-medium text-[#111111] sm:min-w-[160px]"
							>
								<div class="flex items-center justify-end gap-1.5">
									<span class="text-xs font-semibold text-[#111111]">
										{mLabel(periodKey, i18nStore.locale)}
									</span>
									<div class="flex items-center">
										<button
											type="button"
											onclick={() => handleMaximize(bounds.startDate, bounds.endDate)}
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
												onclick={() => settingsStore.removePeriod(periodKey)}
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
							</th>
						{/each}

						<!-- Quick Add Next Month Button Header -->
						<th scope="col" class="min-w-[110px] px-3 py-2 text-right">
							<button
								type="button"
								onclick={addNextMonth}
								class="inline-flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-[11px] font-medium text-[#111111] transition-colors hover:border-[#111111] hover:bg-white"
								title="Tambah 1 Bulan Berikutnya"
							>
								<Plus class="size-3" weight="bold" />
								<span>+1 Bln</span>
							</button>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#EAEAEA]">
					{#if sortedMatrixRows.length === 0}
						<tr>
							<td
								colspan={orderedPeriods.length + 2}
								class="py-12 text-center font-mono text-xs text-[#787774]"
							>
								{t('common.empty')}
							</td>
						</tr>
					{:else}
						{#each sortedMatrixRows as row (row.goal.goalId)}
							{@const g = row.goal}
							<tr
								onclick={() => handleGoalClick(g)}
								class="group cursor-pointer transition-colors hover:bg-[#F9F9F8]"
							>
								<!-- Sticky Frozen Column: Goal Name & Target -->
								<td
									class="sticky left-0 z-10 border-r border-[#EAEAEA] bg-white px-4 py-2.5 transition-colors group-hover:bg-[#F9F9F8]"
								>
									<div class="truncate text-xs font-semibold text-[#111111] group-hover:underline">
										{g.goalName}
									</div>
									<div class="mt-0.5 font-mono text-[10px] text-[#787774] tabular-nums">
										Target: {fmtIDR(g.targetAmount)}
									</div>
								</td>

								<!-- Horizon Period Cells -->
								{#each row.cells as cell (cell.periodKey)}
									{@const pct = Math.min(100, Math.round(cell.progressPercentage))}
									<td class="px-3.5 py-2.5 text-right font-mono tabular-nums">
										<div class="flex items-baseline justify-end gap-1">
											{#if cell.isMilestone || cell.isReached}
												<span
													class="rounded bg-[#EDF3EC] px-1.5 py-0.2 text-[10px] font-bold text-[#346538]"
												>
													✓ {pct}%
												</span>
											{:else if cell.isOverdue}
												<span
													class="rounded bg-[#FDEBEC] px-1.5 py-0.2 text-[10px] font-bold text-[#9F2F2D]"
												>
													⚠️ {pct}%
												</span>
											{:else}
												<span class="text-xs font-semibold text-[#111111]">
													{pct}%
												</span>
											{/if}
										</div>
										<div class="mt-0.5 text-[11px] text-[#787774]">
											{fmtIDR(cell.currentAmount)}
										</div>
									</td>
								{/each}

								<!-- Empty trailing cell to align with add button column -->
								<td class="px-3 py-2.5"></td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Expandable / Additional Period Manager -->
		<div class="flex items-center justify-between text-xs text-[#787774]">
			<span class="font-mono text-[11px]">
				{orderedPeriods.length} periode aktif · Geser tabel untuk melihat horizon masa depan
			</span>
			<button
				type="button"
				onclick={() => (showAddPeriodCard = !showAddPeriodCard)}
				class="cursor-pointer text-xs font-medium text-[#111111] underline hover:text-[#787774]"
			>
				{showAddPeriodCard ? 'Sembunyikan Pengaturan Periode' : 'Atur Periode Kustom / Hapus'}
			</button>
		</div>

		{#if showAddPeriodCard}
			<div class="max-w-md pt-2">
				<AddPeriodCard />
			</div>
		{/if}
	</div>
{/if}
