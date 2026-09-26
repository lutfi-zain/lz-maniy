<script lang="ts">
	import { goto } from '$app/navigation';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import Target from 'phosphor-svelte/lib/Target';
	import ChartPieSlice from 'phosphor-svelte/lib/ChartPieSlice';
	import Handshake from 'phosphor-svelte/lib/Handshake';
	import CalendarCheck from 'phosphor-svelte/lib/CalendarCheck';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	let activeSubTab = $state<'budgets' | 'goals' | 'obligations'>('goals');

	const budgets = $derived(reedrichStore.activeBudgets);
	const goals = $derived(reedrichStore.activeGoals);
	const ob = $derived(reedrichStore.snapshot?.obligations);
	const debts = $derived(ob?.activeDebts ?? []);
	const loans = $derived(ob?.activeLoans ?? []);

	// Mock recurring templates for comprehensive planning display
	const recurringTemplates = [
		{
			name: 'Gaji Siloam Bulanan',
			type: 'income',
			amount: 20475000,
			freq: 'Bulanan (tgl 5)',
			next: '2026-10-05',
			wallet: 'BCA Main'
		},
		{
			name: 'Sewa Rumah (Cicilan Simpanan)',
			type: 'expense',
			amount: 1500000,
			freq: 'Bulanan',
			next: '2026-10-01',
			wallet: 'BCA Pocket Sewa'
		},
		{
			name: 'Nafkah Istri Bulanan',
			type: 'expense',
			amount: 1500000,
			freq: 'Bulanan',
			next: '2026-10-05',
			wallet: 'Main Wallet Jago'
		},
		{
			name: 'Nafkah Anak Bulanan',
			type: 'expense',
			amount: 1500000,
			freq: 'Bulanan',
			next: '2026-10-05',
			wallet: 'Main Wallet Jago'
		},
		{
			name: 'Cicilan Motor Yamaha Nmax',
			type: 'expense',
			amount: 1300000,
			freq: 'Bulanan',
			next: '2026-10-06',
			wallet: 'BCA Main'
		},
		{
			name: 'Konsumsi Makan Keluarga',
			type: 'expense',
			amount: 2700000,
			freq: 'Bulanan',
			next: '2026-10-05',
			wallet: 'Main Wallet Jago'
		},
		{
			name: 'Nafkah Ibu Bulanan',
			type: 'expense',
			amount: 600000,
			freq: 'Bulanan',
			next: '2026-10-05',
			wallet: 'Main Wallet Jago'
		},
		{
			name: 'Tagihan BPJS Kesehatan',
			type: 'expense',
			amount: 452500,
			freq: 'Bulanan',
			next: '2026-10-10',
			wallet: 'BCA Main'
		},
		{
			name: 'Tagihan Internet Indihome',
			type: 'expense',
			amount: 336000,
			freq: 'Bulanan',
			next: '2026-10-15',
			wallet: 'BCA Main'
		},
		{
			name: 'Tagihan PAM Air',
			type: 'expense',
			amount: 208000,
			freq: 'Bulanan',
			next: '2026-10-20',
			wallet: 'BCA Main'
		},
		{
			name: 'Tagihan Telkomsel Halo',
			type: 'expense',
			amount: 169000,
			freq: 'Bulanan',
			next: '2026-10-20',
			wallet: 'BCA Main'
		},
		{
			name: 'Tagihan IPL Lingkungan',
			type: 'expense',
			amount: 95000,
			freq: 'Bulanan',
			next: '2026-10-15',
			wallet: 'BCA Main'
		},
		{
			name: 'Tagihan XL Prioritas',
			type: 'expense',
			amount: 88800,
			freq: 'Bulanan',
			next: '2026-10-22',
			wallet: 'BCA Main'
		}
	];
</script>

<div class="space-y-4">
	<!-- Studio Header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3">
		<div>
			<h1 class="flex items-center gap-2 text-xl font-semibold text-[#111111]">
				<Target class="size-5 text-[#111111]" weight="bold" />
				<span>Studio Perencanaan & Forecasting</span>
			</h1>
			<p class="mt-0.5 text-xs text-[#787774]">
				Pantau pagu anggaran bulanan, target tabungan berjenjang dari dompet terhubung, dan jadwal
				kewajiban utang/rutin.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Workspace Sub-tabs -->
			<div class="flex items-center rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-1 text-xs">
				<button
					type="button"
					onclick={() => (activeSubTab = 'goals')}
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
					'goals'
						? 'bg-white font-semibold text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					<Target class="size-3.5" weight="bold" />
					<span>Target Tabungan ({goals.length})</span>
				</button>

				<button
					type="button"
					onclick={() => (activeSubTab = 'budgets')}
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
					'budgets'
						? 'bg-white font-semibold text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					<ChartPieSlice class="size-3.5" weight="bold" />
					<span>Pagu Anggaran ({budgets.length})</span>
				</button>

				<button
					type="button"
					onclick={() => (activeSubTab = 'obligations')}
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors {activeSubTab ===
					'obligations'
						? 'bg-white font-semibold text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					<Handshake class="size-3.5" weight="bold" />
					<span>Kewajiban & Rutin ({debts.length + loans.length})</span>
				</button>
			</div>

			<!-- Synchronized Global Date Filter -->
			<div class="flex items-center gap-1.5">
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
						Reset
					</button>
				{/if}
			</div>
		</div>
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
				<div class="space-y-4 rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-2xs">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h2 class="text-base font-semibold text-[#111111]">{g.goalName}</h2>
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

						<div class="text-right font-mono tabular-nums">
							<span class="text-lg font-semibold text-[#346538]">{fmtIDR(liveCurrent)}</span>
							<span class="ml-1 text-xs text-[#787774]">/ {fmtIDR(g.targetAmount)} ({p}%)</span>
						</div>
					</div>

					<!-- Progress Track -->
					<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
						<div
							class="h-full bg-[#111111] transition-all"
							style="width: {Math.min(100, p)}%"
						></div>
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
						class="group block space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-5 no-underline shadow-2xs transition-all hover:border-[#111111] hover:shadow-xs"
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
							Jadwal Tagihan & Pemasukan Rutin (13 Template)
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
							{#each recurringTemplates as r (r.name)}
								{@const isInc = r.type === 'income'}
								<tr
									onclick={() => goto(`/ledger?search=${encodeURIComponent(r.name)}`)}
									class="cursor-pointer transition-colors hover:bg-[#F0EFEC]/60"
									title="Buka mutasi {r.name} di Ledger"
								>
									<td class="px-3 py-2.5 font-medium text-[#111111]">{r.name}</td>
									<td class="px-3 py-2.5 text-[#787774]">{r.freq}</td>
									<td class="px-3 py-2.5 font-mono text-[11px] text-[#787774]">{dFmt(r.next)}</td>
									<td class="px-3 py-2.5 text-[#787774]">{r.wallet}</td>
									<td
										class="px-3 py-2.5 text-right font-mono font-semibold tabular-nums {isInc
											? 'text-[#346538]'
											: 'text-[#111111]'}"
									>
										{isInc ? '+' : '−'}{fmtIDR(r.amount)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>
