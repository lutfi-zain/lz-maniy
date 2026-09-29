<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { budgetFormStore } from '$lib/stores/budget-form.svelte';
	import { goalFormStore } from '$lib/stores/goal-form.svelte';
	import { recurringFormStore } from '$lib/stores/recurring-form.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
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
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import type { RecurringTemplate, GoalSnapshot, BudgetSnapshot } from '$lib/types/account-detail';

	let activeSubTab = $state<'budgets' | 'goals' | 'obligations' | 'categories'>('goals');

	onMount(() => {
		reedrichStore.fetchRecurringTemplates();
		reedrichStore.fetchAllTransactions();
	});

	const budgets = $derived(reedrichStore.activeBudgets);
	const goals = $derived(reedrichStore.activeGoals);
	const ob = $derived(reedrichStore.snapshot?.obligations);
	const debts = $derived(ob?.activeDebts ?? []);
	const loans = $derived(ob?.activeLoans ?? []);
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
	function openGoalDrawer(goal: GoalSnapshot) {
		reedrichStore.openDrawer({
			type: 'goal',
			title: goal.goalName,
			subtitle: `${goal.daysRemaining !== null ? t('planning.goals.remainingDays', { days: goal.daysRemaining }) : (i18nStore.locale === 'id' ? 'Jangka panjang' : 'Long term')} ${goal.isDerived ? '· Derived' : ''}`,
			badge: i18nStore.locale === 'id' ? 'TARGET TABUNGAN' : 'SAVINGS GOAL',
			data: { goal }
		});
	}

	function openBudgetDrawer(budget: BudgetSnapshot) {
		reedrichStore.openDrawer({
			type: 'budget',
			title: budget.budgetName,
			subtitle: `Kategori: ${budget.categoryName || 'General'} · Status: ${budget.status}`,
			badge: i18nStore.locale === 'id' ? 'BUDGET & PAGU' : 'BUDGET',
			data: { budget }
		});
		reedrichStore.fetchTransactionsForDrawer({ budgetId: budget.budgetId, limit: 50 });
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
		{#if activeSubTab !== 'categories'}
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
					class="flex cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
				>
					<Plus class="size-3.5" weight="bold" />
					<span>{t('planning.goals.addGoal')}</span>
				</button>
			{:else if activeSubTab === 'budgets'}
				<button
					type="button"
					onclick={() => budgetFormStore.openCreate()}
					class="flex cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
				>
					<Plus class="size-3.5" weight="bold" />
					<span>{t('planning.budgets.addBudget')}</span>
				</button>
			{:else if activeSubTab === 'obligations'}
				<button
					type="button"
					onclick={() => recurringFormStore.openCreate()}
					class="flex cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
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
		<div class="space-y-4">
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
		<div class="space-y-4">
			{#each goals as g (g.goalId)}
				{@const liveCurrent =
					g.linkedWalletsBreakdown && g.linkedWalletsBreakdown.length > 0
						? g.linkedWalletsBreakdown.reduce((sum, lw) => sum + lw.convertedAmount, 0)
						: g.currentAmount}
				{@const p = Math.round((liveCurrent / g.targetAmount) * 100)}
				{@const linked = g.linkedWalletsBreakdown ?? []}
				{@const remainingToTarget = Math.max(0, g.targetAmount - liveCurrent)}
				{@const isTargetReached = liveCurrent >= g.targetAmount}
				<div class="group relative space-y-4 rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-2xs transition-all hover:border-[#111111]">
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
							</div>
							<p class="mt-0.5 text-xs text-[#787774]">
								{g.daysRemaining !== null
									? `${g.daysRemaining} hari tersisa ke tenggat`
									: 'Target jangka panjang'}
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
										<span class="text-[#787774]">{i18nStore.locale === 'id' ? 'Kurang' : 'Short'}</span>
										<span class="text-[#111111]">{fmtIDR(remainingToTarget)}</span>
										<span class="text-[#787774]">{i18nStore.locale === 'id' ? 'lagi' : 'left'}</span>
									{/if}
								</div>
							</div>

							<!-- Pencil button on card hover only -->
							<button
								type="button"
								onclick={() => openGoalDrawer(g)}
								class="flex size-7 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100 group-hover:opacity-100"
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
							class="h-full {p >= 100 ? 'bg-[#346538]' : 'bg-[#111111]'} transition-all"
							style="width: {Math.min(100, p)}%"
						></div>
					</div>

					<!-- Goal Headroom & Pacing Metrics -->
					<div class="flex flex-wrap items-baseline justify-between gap-y-1.5 text-xs">
						<div class="space-y-0.5">
							<div class="text-[10px] font-semibold uppercase tracking-wider text-[#787774]">
								{t('planning.goals.remainingHeadroom')}
							</div>
							<div class="font-mono text-xs font-bold tabular-nums {isTargetReached ? 'text-[#346538]' : 'text-[#111111]'}">
								{#if isTargetReached}
									<span class="text-[#346538]">{t('planning.goals.targetReached')} ✓</span>
								{:else}
									{t('planning.goals.remainingToTarget', { amount: fmtIDR(remainingToTarget) })} <span class="font-normal text-[#787774]">({100 - p}%)</span>
								{/if}
							</div>
						</div>

						<div class="space-y-0.5 text-right font-mono tabular-nums">
							<div class="text-[10px] font-semibold uppercase tracking-wider text-[#787774]">
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
													>{fmtCurrency(lw.balance, lw.currency)} ≈
												</span>
											{/if}
											<strong class="font-semibold">{fmtIDR(lw.convertedAmount)}</strong>
										</div>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- SUB-WORKSPACE 2: BUDGETS -->
	{#if activeSubTab === 'budgets'}
		<div class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each budgets as b (b.budgetId)}
					{@const p = b.percentUsed || 0}
					{@const isOver = p > 100}
					{@const isWarning = p >= 80 && p <= 100}
					<a
						href="/ledger?budgetId={b.budgetId}&budget={encodeURIComponent(b.budgetName)}"
						class="group relative block space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-5 no-underline shadow-2xs transition-all hover:border-[#111111] hover:shadow-xs"
						title="Buka mutasi anggaran {b.budgetName} di Ledger"
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<h2
									class="text-sm font-semibold text-[#111111] transition-colors group-hover:text-[#111111]"
								>
									{b.budgetName}
								</h2>
								<p class="mt-0.5 text-xs text-[#787774]">Kategori: {b.categoryName || 'General'}</p>
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										openBudgetDrawer(b);
									}}
									class="flex size-7 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100 group-hover:opacity-100"
									title="Ubah pagu anggaran"
									aria-label="Ubah pagu anggaran {b.budgetName}"
								>
									<PencilSimple class="size-3.5" weight="bold" />
								</button>
								<span
									class="rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase {isOver
										? 'bg-[#FDEBEC] text-[#9F2F2D]'
										: isWarning
											? 'bg-[#FBF3DB] text-[#956400]'
											: 'bg-[#EDF3EC] text-[#346538]'}"
								>
									{b.status}
								</span>
							</div>
						</div>

						<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
							<div
								class="h-full transition-all {isOver
									? 'bg-[#9F2F2D]'
									: isWarning
										? 'bg-[#956400]'
										: 'bg-[#111111]'}"
								style="width: {Math.min(100, p)}%"
							></div>
						</div>

						<div class="flex items-center justify-between font-mono text-xs tabular-nums">
							<span class="text-[#787774]">Terpakai {p}% ({fmtIDR(b.spent)})</span>
							<span class="font-semibold text-[#111111]">Pagu {fmtIDR(b.amount)}</span>
						</div>

						<div class="flex items-center justify-between border-t border-[#EAEAEA] pt-2 text-xs">
							<span class="text-[#787774]">Sisa Anggaran:</span>
							<span
								class="font-mono font-semibold {b.remaining >= 0
									? 'text-[#346538]'
									: 'text-[#9F2F2D]'}"
							>
								{fmtIDR(b.remaining)}
							</span>
						</div>
					</a>
				{:else}
					<div class="col-span-2 py-12 text-center font-mono text-xs text-[#787774]">
						Belum ada pagu anggaran aktif tercatat.
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
													class="flex size-6 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100 group-hover:opacity-100"
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
