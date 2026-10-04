<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { budgetFormStore } from '$lib/stores/budget-form.svelte';
	import { goalFormStore } from '$lib/stores/goal-form.svelte';
	import { recurringFormStore } from '$lib/stores/recurring-form.svelte';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import Target from 'phosphor-svelte/lib/Target';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import Handshake from 'phosphor-svelte/lib/Handshake';
	import Tag from 'phosphor-svelte/lib/Tag';
	import CategoryStudio from '$lib/components/category/CategoryStudio.svelte';
	import CalendarCheck from 'phosphor-svelte/lib/CalendarCheck';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Plus from 'phosphor-svelte/lib/Plus';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import Table from 'phosphor-svelte/lib/Table';
	import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank';
	import { planningFilterStore, type GoalSortOption } from '$lib/stores/planning-filter.svelte';
	import GoalsHorizonBoard from '$lib/components/goals/GoalsHorizonBoard.svelte';
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import BudgetCard from '$lib/components/budgets/BudgetCard.svelte';
	import type { RecurringTemplate, GoalSnapshot } from '$lib/types/account-detail';
	import { resolveGoalLifecycle, resolveBudgetPeriod } from '$lib/utils/lifecycle';

	let activeSubTab = $state<'budgets' | 'goals' | 'obligations' | 'categories'>(
		planningFilterStore.activeSubTab
	);
	let goalFilter = $state<'all' | 'in_progress' | 'overdue' | 'completed'>(
		planningFilterStore.goalFilter
	);
	let goalSortBy = $state<GoalSortOption>(planningFilterStore.goalSortBy);
	let budgetFilter = $state<'active' | 'past' | 'all'>(planningFilterStore.budgetFilter);
	const goalsViewMode = $derived(planningFilterStore.goalsViewMode);
	// Mobile (<1024px) always renders List view; Horizon Board is desktop-only
	let isMobile = $state(
		typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
	);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 1023px)');
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	$effect(() => {
		planningFilterStore.activeSubTab = activeSubTab;
	});
	$effect(() => {
		planningFilterStore.goalFilter = goalFilter;
	});
	$effect(() => {
		planningFilterStore.goalSortBy = goalSortBy;
	});
	$effect(() => {
		planningFilterStore.budgetFilter = budgetFilter;
	});

	const budgets = $derived(
		reedrichStore.allBudgets.length > 0 ? reedrichStore.allBudgets : reedrichStore.activeBudgets
	);
	// Server-driven point-in-time wallet balance synchronization for goals
	$effect(() => {
		if (activeSubTab !== 'goals') return;
		const start = dateFilterStore.startDate;
		const end = dateFilterStore.endDate;
		const controller = new AbortController();

		reedrichStore
			.fetchWallets(
				{
					startDate: start || undefined,
					endDate: end || undefined
				},
				controller.signal
			)
			.catch((err) => {
				if (!controller.signal.aborted) {
					console.warn('Failed to sync point-in-time wallets for goals:', err);
				}
			});

		return () => {
			controller.abort();
		};
	});

	const walletBalanceMap = $derived.by(() => {
		const map = new Map<string, number>();
		for (const w of reedrichStore.allWallets) {
			map.set(w.walletId, w.balance);
		}
		return map;
	});

	const goals = $derived(reedrichStore.activeGoals);

	const referenceDate = $derived(
		dateFilterStore.endDate ? new Date(dateFilterStore.endDate + 'T23:59:59') : new Date()
	);

	const goalsWithLifecycle = $derived(
		goals.map((g) => {
			let liveCurrent = g.currentAmount;
			if (g.linkedWalletsBreakdown && g.linkedWalletsBreakdown.length > 0) {
				liveCurrent = g.linkedWalletsBreakdown.reduce((sum, lw) => {
					const rawBal = walletBalanceMap.get(lw.walletId) ?? lw.balance;
					return sum + getConvertedBalanceInIDR(rawBal, lw.currency);
				}, 0);
			}
			return {
				goal: g,
				liveCurrent,
				lifecycle: resolveGoalLifecycle(g, referenceDate, liveCurrent)
			};
		})
	);

	const goalCounts = $derived({
		all: goalsWithLifecycle.length,
		in_progress: goalsWithLifecycle.filter(
			(x) => x.lifecycle.status === 'in_progress' || x.lifecycle.status === 'long_term'
		).length,
		overdue: goalsWithLifecycle.filter((x) => x.lifecycle.status === 'overdue').length,
		completed: goalsWithLifecycle.filter((x) => x.lifecycle.status === 'completed').length
	});

	const filteredGoals = $derived.by(() => {
		if (goalFilter === 'all') return goalsWithLifecycle;
		if (goalFilter === 'in_progress') {
			return goalsWithLifecycle.filter(
				(x) => x.lifecycle.status === 'in_progress' || x.lifecycle.status === 'long_term'
			);
		}
		if (goalFilter === 'overdue') {
			return goalsWithLifecycle.filter((x) => x.lifecycle.status === 'overdue');
		}
		if (goalFilter === 'completed') {
			return goalsWithLifecycle.filter((x) => x.lifecycle.status === 'completed');
		}
		return goalsWithLifecycle;
	});

	const sortedGoals = $derived.by(() => {
		const list = [...filteredGoals];
		if (goalSortBy === 'current_amount_desc') {
			list.sort(
				(a, b) => b.liveCurrent - a.liveCurrent || b.goal.targetAmount - a.goal.targetAmount
			);
		} else if (goalSortBy === 'target_amount_desc') {
			list.sort(
				(a, b) => b.goal.targetAmount - a.goal.targetAmount || b.liveCurrent - a.liveCurrent
			);
		} else if (goalSortBy === 'name') {
			list.sort((a, b) => a.goal.goalName.localeCompare(b.goal.goalName));
		}
		return list;
	});

	const budgetsWithPeriod = $derived(
		budgets.map((b) => ({
			budget: b,
			period: resolveBudgetPeriod(b)
		}))
	);

	const budgetCounts = $derived({
		active: budgetsWithPeriod.filter((x) => x.period.isActive).length,
		past: budgetsWithPeriod.filter((x) => x.period.isPast).length,
		all: budgetsWithPeriod.length
	});

	const filteredBudgets = $derived.by(() => {
		if (budgetFilter === 'active') return budgetsWithPeriod.filter((x) => x.period.isActive);
		if (budgetFilter === 'past') return budgetsWithPeriod.filter((x) => x.period.isPast);
		return budgetsWithPeriod;
	});

	onMount(() => {
		reedrichStore.fetchGoals();
		reedrichStore.fetchBudgets();
		reedrichStore.fetchDebtsLoans();
		reedrichStore.fetchRecurringTemplates();
	});

	$effect(() => {
		const tab = activeSubTab;
		if (tab === 'budgets') {
			reedrichStore.fetchBudgets();
		} else if (tab === 'goals') {
			reedrichStore.fetchGoals();
		} else if (tab === 'obligations') {
			reedrichStore.fetchDebtsLoans();
			reedrichStore.fetchRecurringTemplates();
		}
	});

	const ob = $derived(reedrichStore.snapshot?.obligations);
	const debts = $derived(reedrichStore.activeDebts);
	const loans = $derived(reedrichStore.activeLoans);
	const recurringTemplates = $derived(reedrichStore.recurringTemplates);
	const isRecurringLoading = $derived(reedrichStore.isRecurringLoading);
	const categories = $derived(reedrichStore.categories);

	function openRecurringDetail(t: RecurringTemplate) {
		reedrichStore.openDrawer({
			type: 'recurring-detail',
			title: t.templateName,
			subtitle: `${t.templateType.toUpperCase()} · ${t.templateFrequency}`,
			badge: 'RECURRING',
			data: { template: t }
		});
	}
	async function openGoalDrawer(goal: GoalSnapshot) {
		reedrichStore.openDrawer({
			type: 'goal',
			title: goal.goalName,
			subtitle: `${goal.daysRemaining !== null ? t('planning.goals.remainingDays', { days: goal.daysRemaining }) : i18nStore.locale === 'id' ? 'Jangka panjang' : 'Long term'} ${goal.isDerived ? '· Derived' : ''}`,
			badge: i18nStore.locale === 'id' ? 'TARGET TABUNGAN' : 'SAVINGS GOAL',
			data: { goal }
		});

		try {
			const freshGoal = await reedrichStore.fetchGoalById(goal.goalId);
			const currentActive = reedrichStore.activeDrawer;
			if (
				currentActive?.type === 'goal' &&
				(currentActive.data as { goal?: GoalSnapshot })?.goal?.goalId === goal.goalId
			) {
				reedrichStore.openDrawer({
					type: 'goal',
					title: freshGoal.goalName,
					subtitle: `${freshGoal.daysRemaining !== null ? t('planning.goals.remainingDays', { days: freshGoal.daysRemaining }) : i18nStore.locale === 'id' ? 'Jangka panjang' : 'Long term'} ${freshGoal.isDerived ? '· Derived' : ''}`,
					badge: i18nStore.locale === 'id' ? 'TARGET TABUNGAN' : 'SAVINGS GOAL',
					data: { goal: freshGoal }
				});
			}
		} catch (err) {
			console.warn('Gagal memuat detail target:', err);
		}
	}
</script>

<div class="space-y-4">
	<!-- Planning Utility Toolbar -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3">
		<!-- Workspace Sub-tabs -->
		<div class="flex items-center rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-1 text-xs">
			<button
				type="button"
				onclick={() => (activeSubTab = 'goals')}
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
				'goals'
					? 'bg-white font-semibold text-[#111111] shadow-2xs'
					: 'text-[#787774] hover:text-[#111111]'}"
			>
				<Target class="size-3.5" weight="bold" />
				<span>{t('planning.tabs.goals')} ({goals.length})</span>
			</button>

			<button
				type="button"
				onclick={() => (activeSubTab = 'budgets')}
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
				'budgets'
					? 'bg-white font-semibold text-[#111111] shadow-2xs'
					: 'text-[#787774] hover:text-[#111111]'}"
			>
				<ChartPieSlice class="size-3.5" weight="bold" />
				<span>{t('planning.tabs.budgets')} ({budgets.length})</span>
			</button>

			<button
				type="button"
				onclick={() => (activeSubTab = 'obligations')}
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
				'obligations'
					? 'bg-white font-semibold text-[#111111] shadow-2xs'
					: 'text-[#787774] hover:text-[#111111]'}"
			>
				<Handshake class="size-3.5" weight="bold" />
				<span>{t('planning.tabs.obligations')} ({debts.length + loans.length})</span>
			</button>
			<button
				type="button"
				onclick={() => (activeSubTab = 'categories')}
				class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
				'categories'
					? 'bg-white font-semibold text-[#111111] shadow-2xs'
					: 'text-[#787774] hover:text-[#111111]'}"
			>
				<Tag class="size-3.5" weight="bold" />
				<span>{t('planning.tabs.categories')} ({categories.length})</span>
			</button>
		</div>

		<!-- Right: Date Filter & Action Button -->
		{#if activeSubTab !== 'categories' && !(activeSubTab === 'goals' && goalsViewMode === 'horizon')}
			<div class="flex items-center gap-2">
				<DateRangePicker
					bind:start={dateFilterStore.startDate}
					bind:end={dateFilterStore.endDate}
					bind:preset={dateFilterStore.preset}
					onchange={({ preset, start, end }) => {
						dateFilterStore.setFilter(preset as DatePreset, start, end);
					}}
				/>
				{#if dateFilterStore.preset !== 'this_month'}
					<button
						type="button"
						onclick={() => dateFilterStore.reset()}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1.5 text-[11px] font-medium text-[#787774] transition-colors hover:border-[#111111] hover:text-[#111111]"
						title="Reset ke Bulan Ini"
					>
						{t('common.reset')}
					</button>
				{/if}

				{#if activeSubTab === 'goals'}
					<button
						type="button"
						onclick={() => goalFormStore.openCreate()}
						class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
					>
						<Plus class="size-3.5" weight="bold" />
						<span>{t('planning.goals.addGoal')}</span>
					</button>
				{:else if activeSubTab === 'budgets'}
					<button
						type="button"
						onclick={() => budgetFormStore.openCreate()}
						class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
					>
						<Plus class="size-3.5" weight="bold" />
						<span>{t('planning.budgets.addBudget')}</span>
					</button>
				{:else if activeSubTab === 'obligations'}
					<button
						type="button"
						onclick={() => recurringFormStore.openCreate()}
						class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
					>
						<Plus class="size-3.5" weight="bold" />
						<span>{t('planning.obligations.addRecurring')}</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- SUB-WORKSPACE 1: GOALS & DERIVED PACING -->
	{#if reedrichStore.isLoading && goals.length === 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each [0, 1] as i (i)}
				<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-2xs">
					<div class="flex items-center justify-between">
						<Skeleton class="h-4 w-40" />
						<Skeleton class="h-5 w-28" />
					</div>
					<Skeleton class="h-2 w-full rounded-full" />
					<Skeleton class="h-3 w-56" />
				</div>
			{/each}
		</div>
	{:else if activeSubTab === 'goals'}
		<!-- Goals Status Segmented Tabs -->
		<div
			class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] pb-3"
		>
			<div class="flex flex-wrap items-center gap-1.5">
				{#each [{ id: 'all', label: 'Semua', count: goalCounts.all }, { id: 'in_progress', label: 'Aktif Berjalan', count: goalCounts.in_progress }, { id: 'overdue', label: 'Lewat Tenggat', count: goalCounts.overdue }, { id: 'completed', label: 'Tercapai', count: goalCounts.completed }] as tab (tab.id)}
					<button
						type="button"
						onclick={() => (goalFilter = tab.id as typeof goalFilter)}
						class="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-medium transition-all {goalFilter ===
						tab.id
							? 'bg-[#111111] text-white'
							: 'bg-[#F0EFEC] text-[#787774] hover:bg-[#EAEAEA] hover:text-[#111111]'}"
					>
						<span>{tab.label}</span>
						<span
							class="py-0.2 rounded-full px-1.5 text-[10px] {goalFilter === tab.id
								? 'bg-white/20 text-white'
								: 'bg-black/5 text-[#787774]'}"
						>
							{tab.count}
						</span>
					</button>
				{/each}
			</div>

			<!-- View Mode Switcher: List vs Horizon Board & Sort Options -->
			<div class="flex items-center gap-2">
				{#if goalsViewMode === 'list'}
					<div class="flex items-center gap-1.5">
						<span class="hidden font-mono text-[11px] text-[#787774] sm:inline">Urut:</span>
						<select
							bind:value={goalSortBy}
							class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111] transition-colors hover:border-[#111111]"
							title="Urutkan Target"
						>
							<option value="current_amount_desc">Nominal Terkumpul Terbesar</option>
							<option value="target_amount_desc">Target Terbesar</option>
							<option value="name">Nama (A-Z)</option>
						</select>
					</div>
				{/if}

				<div
					class="inline-flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5"
				>
					<button
						type="button"
						onclick={() => (planningFilterStore.goalsViewMode = 'list')}
						class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors {goalsViewMode ===
						'list'
							? 'bg-white text-[#111111] shadow-2xs'
							: 'text-[#787774] hover:text-[#111111]'}"
						title="Tampilan List / Kartu"
						aria-pressed={goalsViewMode === 'list'}
					>
						<Table class="size-3.5" weight={goalsViewMode === 'list' ? 'bold' : 'regular'} />
						<span>List</span>
					</button>

					<button
						type="button"
						onclick={() => (planningFilterStore.goalsViewMode = 'horizon')}
						class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors {goalsViewMode ===
						'horizon'
							? 'bg-white text-[#111111] shadow-2xs'
							: 'text-[#787774] hover:text-[#111111]'}"
						title="Tampilan Kalendar Multi-Periode"
						aria-pressed={goalsViewMode === 'horizon'}
					>
						<CalendarBlank
							class="size-3.5"
							weight={goalsViewMode === 'horizon' ? 'bold' : 'regular'}
						/>
						<span>Horizon Board</span>
					</button>
				</div>
			</div>
		</div>

		{#if goalsViewMode === 'horizon'}
			<GoalsHorizonBoard />
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each sortedGoals as item (item.goal.goalId)}
					{@const g = item.goal}
					{@const lifecycle = item.lifecycle}
					{@const liveCurrent = item.liveCurrent}
					{@const p = Math.round((liveCurrent / g.targetAmount) * 100)}
					{@const linked = g.linkedWalletsBreakdown ?? []}
					{@const remainingToTarget = Math.max(0, g.targetAmount - liveCurrent)}
					{@const isTargetReached = liveCurrent >= g.targetAmount || lifecycle.isCompleted}
					<div
						class="group relative space-y-4 rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-2xs transition-all hover:border-[#111111]"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<div class="flex items-center gap-2">
									<a
										href="/ledger?search={encodeURIComponent(g.goalName)}"
										class="text-base font-semibold text-[#111111] no-underline hover:underline"
										title="Buka mutasi {g.goalName} di Ledger"
									>
										{g.goalName}
									</a>
									{#if g.isDerived}
										<span
											class="rounded bg-[#F0EFEC] px-2 py-0.5 font-mono text-[10px] text-[#787774] uppercase"
										>
											Derived ({linked.length} dompet)
										</span>
									{/if}
									{#if lifecycle.status === 'overdue'}
										<span
											class="rounded bg-[#FDEBEC] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#9F2F2D] uppercase"
										>
											⚠️ Lewat Tenggat
										</span>
									{:else if lifecycle.status === 'completed'}
										<span
											class="rounded bg-[#EDF3EC] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#346538] uppercase"
										>
											✓ Tercapai
										</span>
									{/if}
								</div>
								<p class="mt-0.5 text-xs text-[#787774]">
									{#if lifecycle.status === 'overdue'}
										<span class="font-semibold text-[#9F2F2D]"
											>Terlewat {lifecycle.overdueDays} hari yang lalu</span
										>
									{:else if g.targetDate}
										{lifecycle.daysRemaining} hari tersisa ke tenggat ({dFmt(g.targetDate)})
									{:else}
										Target jangka panjang
									{/if}
								</p>
							</div>

							<div class="flex items-center gap-3">
								<div class="text-right font-mono tabular-nums">
									<div class="flex items-baseline justify-end gap-1.5">
										<span class="text-lg font-semibold text-[#346538]">{fmtIDR(liveCurrent)}</span>
										<span class="text-xs text-[#787774]">/ {fmtIDR(g.targetAmount)} ({p}%)</span>
									</div>
									<div class="mt-0.5 text-xs font-semibold">
										{#if isTargetReached}
											<span class="text-[#346538]">✓ {t('planning.goals.targetReached')}</span>
										{:else}
											<span class="text-[#787774]"
												>{i18nStore.locale === 'id' ? 'Kurang' : 'Short'}</span
											>
											<span class="text-[#111111]">{fmtIDR(remainingToTarget)}</span>
											<span class="text-[#787774]"
												>{i18nStore.locale === 'id' ? 'lagi' : 'left'}</span
											>
										{/if}
									</div>
								</div>

								<!-- Pencil button on card hover only -->
								<button
									type="button"
									onclick={() => openGoalDrawer(g)}
									class="flex size-7 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all group-hover:opacity-100 hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100"
									title="Rincian & edit target"
									aria-label="Rincian & edit target {g.goalName}"
								>
									<PencilSimple class="size-3.5" weight="bold" />
								</button>
							</div>
						</div>

						<!-- Progress Track -->
						<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
							<div
								class="h-full {lifecycle.status === 'completed'
									? 'bg-[#346538]'
									: lifecycle.status === 'overdue'
										? 'bg-[#9F2F2D]'
										: 'bg-[#111111]'} transition-all"
								style="width: {Math.min(100, p)}%"
							></div>
						</div>

						<!-- Goal Headroom & Pacing Metrics -->
						<div class="flex flex-wrap items-baseline justify-between gap-y-1.5 text-xs">
							<div class="space-y-0.5">
								<div class="text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
									{t('planning.goals.remainingHeadroom')}
								</div>
								<div
									class="font-mono text-xs font-bold tabular-nums {isTargetReached
										? 'text-[#346538]'
										: 'text-[#111111]'}"
								>
									{#if isTargetReached}
										<span class="text-[#346538]">{t('planning.goals.targetReached')} ✓</span>
									{:else}
										{t('planning.goals.remainingToTarget', { amount: fmtIDR(remainingToTarget) })}
										<span class="font-normal text-[#787774]">({100 - p}%)</span>
									{/if}
								</div>
							</div>

							<div class="space-y-0.5 text-right font-mono tabular-nums">
								<div class="text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
									{t('planning.goals.target')}
								</div>
								<div class="text-xs font-semibold text-[#111111]">
									{fmtIDR(g.targetAmount)}
								</div>
							</div>
						</div>
						<!-- Derived Linked Wallets Matrix -->
						{#if linked.length > 0}
							<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-3 text-xs">
								<div class="mb-2 flex items-center justify-between font-medium text-[#111111]">
									<span>Rincian Dompet Penyusun Target:</span>
									<span class="font-mono text-[11px] text-[#787774]"
										>Total Live: {fmtIDR(liveCurrent)}</span
									>
								</div>

								<div class="divide-y divide-[#EAEAEA]">
									{#each linked as lw (lw.walletId)}
										{@const lwBal = walletBalanceMap.get(lw.walletId) ?? lw.balance}
										{@const lwConverted = getConvertedBalanceInIDR(lwBal, lw.currency)}
										<a
											href="/ledger?walletId={lw.walletId}"
											class="flex items-center justify-between rounded px-2 py-1.5 text-[11px] no-underline transition-colors hover:bg-white hover:shadow-2xs"
											title="Buka mutasi {lw.walletName} di Ledger"
										>
											<div class="flex items-center gap-2">
												<LockKey class="size-3 text-[#956400]" weight="bold" />
												<span class="font-medium text-[#111111]">{lw.walletName}</span>
												<span class="text-[#787774]">
													({lw.currency}
													{lw.usedPeg ? '· Kurs Live' : '· Nilai Pasti'})
												</span>
											</div>
											<div class="text-right font-mono text-[#111111] tabular-nums">
												{#if lw.currency !== 'IDR'}
													<span class="text-[#787774]"
														>{fmtCurrency(lwBal, lw.currency)} ≈
													</span>
												{/if}
												<strong class="font-semibold">{fmtIDR(lwConverted)}</strong>
											</div>
										</a>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="col-span-1 py-12 text-center font-mono text-xs text-[#787774] md:col-span-2">
						{t('common.empty')}
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- SUB-WORKSPACE 2: BUDGETS -->
	{#if activeSubTab === 'budgets'}
		<div class="space-y-4">
			<!-- Budgets Period Segmented Tabs -->
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] pb-3">
				<div class="flex flex-wrap items-center gap-1.5">
					{#each [{ id: 'active', label: 'Periode Berjalan (Bulan Ini)', count: budgetCounts.active }, { id: 'past', label: 'Riwayat Lampau', count: budgetCounts.past }, { id: 'all', label: 'Semua Anggaran', count: budgetCounts.all }] as tab (tab.id)}
						<button
							type="button"
							onclick={() => (budgetFilter = tab.id as typeof budgetFilter)}
							class="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-medium transition-all {budgetFilter ===
							tab.id
								? 'bg-[#111111] text-white'
								: 'bg-[#F0EFEC] text-[#787774] hover:bg-[#EAEAEA] hover:text-[#111111]'}"
						>
							<span>{tab.label}</span>
							<span
								class="py-0.2 rounded-full px-1.5 text-[10px] {budgetFilter === tab.id
									? 'bg-white/20 text-white'
									: 'bg-black/5 text-[#787774]'}"
							>
								{tab.count}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each filteredBudgets as item (item.budget.budgetId)}
					<BudgetCard budget={item.budget} />
				{:else}
					<div class="col-span-2 py-12 text-center font-mono text-xs text-[#787774]">
						{t('common.empty')}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- SUB-WORKSPACE 3: OBLIGATIONS & RECURRING TEMPLATES -->
	{#if activeSubTab === 'obligations'}
		<div class="space-y-6">
			<!-- Debts & Loans Section -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Debts -->
				<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
					<div class="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
						<span class="text-xs font-semibold text-[#111111]">Utang Wajib Dibayar</span>
						<span class="font-mono text-xs font-semibold text-[#9F2F2D] tabular-nums">
							Total {fmtIDR(ob?.totalDebt)}
						</span>
					</div>

					<div class="space-y-2">
						{#each debts as d (d.debtLoanId)}
							<a
								href="/ledger?search={encodeURIComponent(d.personName)}"
								class="block rounded border border-[#EAEAEA] bg-[#F9F9F8] p-3 text-xs no-underline transition-colors hover:border-[#111111] hover:bg-white"
								title="Buka mutasi {d.personName} di Ledger"
							>
								<div class="flex items-center justify-between font-medium text-[#111111]">
									<span>{d.personName}</span>
									<span class="font-mono font-semibold text-[#9F2F2D] tabular-nums">
										−{fmtIDR(d.remainingAmount)}
									</span>
								</div>
								<div class="mt-1 flex items-center justify-between text-[11px] text-[#787774]">
									<span>Jatuh tempo: {dFmt(d.dueDate)}</span>
									<span class="font-mono uppercase">{d.status}</span>
								</div>
							</a>
						{/each}
					</div>
				</div>

				<!-- Loans -->
				<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
					<div class="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
						<span class="text-xs font-semibold text-[#111111]">Piutang / Talangan Hak Terima</span>
						<span class="font-mono text-xs font-semibold text-[#346538] tabular-nums">
							Total {fmtIDR(ob?.totalReceivable)}
						</span>
					</div>

					<div class="space-y-2">
						{#each loans as l (l.debtLoanId)}
							<a
								href="/ledger?search={encodeURIComponent(l.personName)}"
								class="block rounded border border-[#EAEAEA] bg-[#F9F9F8] p-3 text-xs no-underline transition-colors hover:border-[#111111] hover:bg-white"
								title="Buka mutasi {l.personName} di Ledger"
							>
								<div class="flex items-center justify-between font-medium text-[#111111]">
									<span>{l.personName}</span>
									<span class="font-mono font-semibold text-[#346538] tabular-nums">
										+{fmtIDR(l.remainingAmount)}
									</span>
								</div>
								<div class="mt-1 flex items-center justify-between text-[11px] text-[#787774]">
									<span>Jatuh tempo: {dFmt(l.dueDate)}</span>
									<span class="font-mono uppercase">{l.status}</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</div>

			<!-- Recurring Bill Schedules -->
			<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-2xs">
				<div class="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
					<div class="flex items-center gap-2">
						<CalendarCheck class="size-4 text-[#111111]" weight="bold" />
						<h2 class="text-sm font-semibold text-[#111111]">
							Jadwal Tagihan & Pemasukan Rutin ({recurringTemplates.length} Template)
						</h2>
					</div>
					<span class="font-mono text-xs text-[#787774]">Dasar Perhitungan Safe-To-Spend</span>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-left text-xs">
						<thead
							class="border-b border-[#EAEAEA] bg-[#F9F9F8] text-[10px] font-medium tracking-wider text-[#787774] uppercase"
						>
							<tr>
								<th class="px-3 py-2 font-medium">Nama Tagihan / Rutin</th>
								<th class="px-3 py-2 font-medium">Frekuensi</th>
								<th class="px-3 py-2 font-medium">Jadwal Debet Berikutnya</th>
								<th class="px-3 py-2 font-medium">Akun Rekening</th>
								<th class="px-3 py-2 text-right font-medium">Nominal</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#EAEAEA]">
							{#if isRecurringLoading && recurringTemplates.length === 0}
								{#each [0, 1, 2] as i (i)}
									<tr>
										<td class="px-3 py-2.5"><Skeleton class="h-3 w-32" /></td>
										<td class="px-3 py-2.5"><Skeleton class="h-3 w-16" /></td>
										<td class="px-3 py-2.5"><Skeleton class="h-3 w-20" /></td>
										<td class="px-3 py-2.5"><Skeleton class="h-3 w-24" /></td>
										<td class="px-3 py-2.5 text-right"><Skeleton class="ml-auto h-3 w-20" /></td>
									</tr>
								{/each}
							{:else}
								{#each recurringTemplates as r (r.templateId)}
									{@const isInc = r.templateType === 'income'}
									{@const walletName =
										reedrichStore.allWallets.find((w) => w.walletId === r.templateWalletId)
											?.walletName || 'Dompet'}
									<tr
										onclick={() => goto(`/ledger?search=${encodeURIComponent(r.templateName)}`)}
										class="group cursor-pointer transition-colors hover:bg-[#F0EFEC]/60"
										title="Buka mutasi {r.templateName} di Ledger"
									>
										<td class="px-3 py-2.5 font-medium text-[#111111]">{r.templateName}</td>
										<td class="px-3 py-2.5 text-[#787774] capitalize">{r.templateFrequency}</td>
										<td class="px-3 py-2.5 font-mono text-[11px] text-[#787774]">
											{r.templateNextRunDate ? dFmt(r.templateNextRunDate) : 'Sesuai Siklus'}
										</td>
										<td class="px-3 py-2.5 text-[#787774]">{walletName}</td>
										<td class="px-3 py-2.5 text-right font-mono tabular-nums">
											<div class="flex items-center justify-end gap-2">
												<span class="font-semibold {isInc ? 'text-[#346538]' : 'text-[#111111]'}">
													{isInc ? '+' : '−'}{fmtIDR(r.templateAmount)}
												</span>
												<button
													type="button"
													onclick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														openRecurringDetail(r);
													}}
													class="flex size-6 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all group-hover:opacity-100 hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100"
													title="Rincian & ubah tagihan"
													aria-label="Rincian tagihan {r.templateName}"
												>
													<PencilSimple class="size-3" weight="bold" />
												</button>
											</div>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="5" class="py-8 text-center font-mono text-xs text-[#787774]">
											Belum ada tagihan atau pemasukan rutin tercatat.
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<!-- SUB-WORKSPACE 4: CATEGORY STUDIO -->
	{#if activeSubTab === 'categories'}
		<CategoryStudio />
	{/if}
</div>
