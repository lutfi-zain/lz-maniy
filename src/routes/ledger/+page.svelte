<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import Table from 'phosphor-svelte/lib/Table';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import Funnel from 'phosphor-svelte/lib/Funnel';
	import Calendar from 'phosphor-svelte/lib/Calendar';
	import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';

	// Filters
	let datePreset = $state<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'custom'>('all');
	let customStartDate = $state<string>('');
	let customEndDate = $state<string>('');
	let selectedWalletId = $state<string>('');
	let selectedCategory = $state<string>('');
	let selectedType = $state<'all' | 'expense' | 'income' | 'transfer'>('all');
	let selectedStatus = $state<'all' | 'realized' | 'planned'>('all');
	let searchKeyword = $state<string>('');

	// Pagination
	let currentPage = $state<number>(1);
	const pageSize = 50;

	onMount(() => {
		// Read initial query params
		const qWallet = page.url.searchParams.get('walletId');
		const qCat = page.url.searchParams.get('category');
		const qType = page.url.searchParams.get('type');

		if (qWallet) selectedWalletId = qWallet;
		if (qCat) selectedCategory = qCat;
		if (qType && ['expense', 'income', 'transfer'].includes(qType)) {
			selectedType = qType as typeof selectedType;
		}

		// Ensure all transactions are loaded
		reedrichStore.fetchAllTransactions();
	});

	// Quick search shortcut: pressing '/' focuses search input
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
			e.preventDefault();
			const el = document.getElementById('ledgerSearch');
			if (el) el.focus();
		}
	}

	const allTxs = $derived(reedrichStore.allTransactions);
	const allWallets = $derived(reedrichStore.allWallets);
	const categories = $derived(
		Array.from(new Set(reedrichStore.categories.map((c) => c.categoryName))).sort()
	);

	// Date preset range bounds calculation
	const dateRange = $derived.by(() => {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();

		if (datePreset === 'this_month') {
			const start = new Date(year, month, 1).toISOString().slice(0, 10);
			const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
			return { start, end };
		}
		if (datePreset === 'last_month') {
			const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
			const end = new Date(year, month, 0).toISOString().slice(0, 10);
			return { start, end };
		}
		if (datePreset === 'last_3_months') {
			const start = new Date(year, month - 2, 1).toISOString().slice(0, 10);
			const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
			return { start, end };
		}
		if (datePreset === 'custom') {
			return { start: customStartDate, end: customEndDate };
		}
		return { start: '', end: '' };
	});

	// Filtered transactions
	const filteredTransactions = $derived.by(() => {
		const q = searchKeyword.trim().toLowerCase();
		const { start, end } = dateRange;

		return allTxs.filter((t) => {
			// Type filter
			if (selectedType !== 'all' && t.transactionType !== selectedType) return false;

			// Status filter
			if (selectedStatus === 'realized' && t.transactionIsPlanned !== 0) return false;
			if (selectedStatus === 'planned' && t.transactionIsPlanned !== 1) return false;

			// Wallet filter
			if (
				selectedWalletId &&
				t.transactionWalletId !== selectedWalletId &&
				t.transactionTargetWalletId !== selectedWalletId
			) {
				return false;
			}

			// Date range filter
			if (start && t.transactionDate.slice(0, 10) < start) return false;
			if (end && t.transactionDate.slice(0, 10) > end) return false;
			if (
				selectedCategory &&
				!(t.transactionDescription || '').toLowerCase().includes(selectedCategory.toLowerCase())
			) {
				return false;
			}

			// Search keyword filter
			if (q) {
				const desc = (t.transactionDescription || '').toLowerCase();
				const id = (t.transactionId || '').toLowerCase();
				if (!desc.includes(q) && !id.includes(q)) return false;
			}

			return true;
		});
	});

	// Aggregates computed from filtered transactions
	const aggregateStats = $derived.by(() => {
		let inSum = 0;
		let outSum = 0;
		for (const t of filteredTransactions) {
			if (t.transactionType === 'income') {
				inSum += t.transactionAmount;
			} else if (t.transactionType === 'expense') {
				outSum += t.transactionAmount;
			}
		}
		return {
			count: filteredTransactions.length,
			income: inSum,
			expense: outSum,
			net: inSum - outSum
		};
	});

	// Pagination slice
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTransactions.length / pageSize)));
	const pagedTransactions = $derived(
		filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function resetFilters() {
		datePreset = 'all';
		customStartDate = '';
		customEndDate = '';
		selectedWalletId = '';
		selectedCategory = '';
		selectedType = 'all';
		selectedStatus = 'all';
		searchKeyword = '';
		currentPage = 1;
	}

	function getWalletName(id?: string | null): string {
		if (!id) return '—';
		const w = allWallets.find((x) => x.walletId === id);
		return w?.walletName ?? 'Akun';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-4">
	<!-- Studio Header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3">
		<div>
			<h1 class="flex items-center gap-2 text-xl font-semibold text-[#111111]">
				<Table class="size-5 text-[#111111]" weight="bold" />
				<span>Ledger Studio</span>
			</h1>
			<p class="mt-0.5 text-xs text-[#787774]">
				Tabel transaksi lengkap dengan mesin filter multi-parameter real-time dan kalkulasi agregat
				langsung.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={resetFilters}
				class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
			>
				Reset Filter
			</button>
		</div>
	</div>

	<!-- Super Dynamic Filter Bar -->
	<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
		<!-- Row 1: Search + Date Range Presets -->
		<div class="flex flex-wrap items-center gap-3">
			<!-- Instant Search with Keyboard Shortcut -->
			<div class="relative min-w-[240px] flex-1">
				<MagnifyingGlass
					class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787774]"
					weight="bold"
				/>
				<input
					id="ledgerSearch"
					type="search"
					bind:value={searchKeyword}
					placeholder="Cari transaksi... (tekan '/' untuk fokus)"
					class="w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] py-1.5 pr-12 pl-8 text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden"
				/>
				<kbd class="absolute top-1/2 right-2 -translate-y-1/2 text-[9px]">/</kbd>
			</div>

			<!-- Date Range Presets -->
			<div class="flex items-center gap-1 text-xs">
				<Calendar class="mr-1 size-3.5 text-[#787774]" weight="bold" />
				<select
					bind:value={datePreset}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-hidden"
				>
					<option value="all">Semua Waktu</option>
					<option value="this_month">Bulan Ini</option>
					<option value="last_month">Bulan Lalu</option>
					<option value="last_3_months">3 Bulan Terakhir</option>
					<option value="custom">Rentang Khusus...</option>
				</select>
			</div>

			<!-- Custom Date Inputs when Custom is selected -->
			{#if datePreset === 'custom'}
				<div class="flex items-center gap-1.5 text-xs">
					<input
						type="date"
						bind:value={customStartDate}
						class="rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
					/>
					<span class="text-[#787774]">→</span>
					<input
						type="date"
						bind:value={customEndDate}
						class="rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
					/>
				</div>
			{/if}
		</div>

		<!-- Row 2: Entity & Status Filters -->
		<div class="flex flex-wrap items-center gap-2.5 border-t border-[#EAEAEA] pt-2 text-xs">
			<div class="flex items-center gap-1 text-[#787774]">
				<Funnel class="size-3.5 text-[#787774]" weight="bold" />
				<span>Filter:</span>
			</div>

			<!-- Wallet Filter (Grouped by Bank) -->
			<select
				bind:value={selectedWalletId}
				class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1 text-xs text-[#111111]"
			>
				<option value="">Semua Dompet & Akun ({allWallets.length})</option>
				{#each Array.from(new Set(allWallets.map((w) => w.institution))) as inst (inst)}
					<optgroup label={inst}>
						{#each allWallets.filter((w) => w.institution === inst) as w (w.walletId)}
							<option value={w.walletId}>
								{w.walletName} ({w.isLocked === 1 ? 'Locked' : 'Open'})
							</option>
						{/each}
					</optgroup>
				{/each}
			</select>

			<!-- Category Filter -->
			<select
				bind:value={selectedCategory}
				class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1 text-xs text-[#111111]"
			>
				<option value="">Semua Kategori ({categories.length})</option>
				{#each categories as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<!-- Type Buttons -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => (selectedType = 'all')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'all'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Semua Tipe
				</button>
				<button
					type="button"
					onclick={() => (selectedType = 'expense')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'expense'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Pengeluaran
				</button>
				<button
					type="button"
					onclick={() => (selectedType = 'income')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'income'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Pemasukan
				</button>
				<button
					type="button"
					onclick={() => (selectedType = 'transfer')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedType ===
					'transfer'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Transfer
				</button>
			</div>

			<!-- Status Buttons -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => (selectedStatus = 'all')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedStatus ===
					'all'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Semua Status
				</button>
				<button
					type="button"
					onclick={() => (selectedStatus = 'realized')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedStatus ===
					'realized'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Realized
				</button>
				<button
					type="button"
					onclick={() => (selectedStatus = 'planned')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {selectedStatus ===
					'planned'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Planned
				</button>
			</div>
		</div>
	</div>

	<!-- Live Filtered Aggregate Summary Strip -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EAEAEA] bg-white px-4 py-2.5 text-xs shadow-2xs"
	>
		<div class="flex items-center gap-2">
			<span class="font-mono text-xs font-semibold text-[#111111]">
				{aggregateStats.count} transaksi
			</span>
			<span class="text-[#787774]">dalam filter aktif</span>
		</div>

		<div class="flex items-center gap-4 font-mono text-xs tabular-nums">
			<div>
				<span class="text-[10px] text-[#787774] uppercase">Masuk:</span>
				<span class="ml-1 font-semibold text-[#346538]">+{fmtIDR(aggregateStats.income)}</span>
			</div>
			<div>
				<span class="text-[10px] text-[#787774] uppercase">Keluar:</span>
				<span class="ml-1 font-semibold text-[#111111]">−{fmtIDR(aggregateStats.expense)}</span>
			</div>
			<div class="border-l border-[#EAEAEA] pl-3">
				<span class="text-[10px] text-[#787774] uppercase">Net Arus Kas:</span>
				<span
					class="ml-1 font-semibold {aggregateStats.net >= 0 ? 'text-[#346538]' : 'text-[#9F2F2D]'}"
				>
					{aggregateStats.net >= 0 ? '+' : '−'}{fmtIDR(Math.abs(aggregateStats.net))}
				</span>
			</div>
		</div>
	</div>

	<!-- Full-Width Tabular Transaction Grid -->
	<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
		{#if reedrichStore.isLedgerLoading}
			<div class="animate-pulse py-16 text-center font-mono text-xs text-[#787774]">
				Mengunduh 359+ riwayat transaksi...
			</div>
		{:else if pagedTransactions.length === 0}
			<div class="py-16 text-center font-mono text-xs text-[#787774]">
				Tidak ada transaksi yang cocok dengan kriteria filter Anda.
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left text-xs">
					<thead
						class="border-b border-[#EAEAEA] bg-[#F9F9F8] text-[10px] font-medium tracking-wider text-[#787774] uppercase"
					>
						<tr>
							<th class="px-4 py-2.5 font-medium">Tanggal</th>
							<th class="px-4 py-2.5 font-medium">Deskripsi</th>
							<th class="px-4 py-2.5 font-medium">Tipe</th>
							<th class="px-4 py-2.5 font-medium">Dari Akun</th>
							<th class="px-4 py-2.5 font-medium">Ke Akun</th>
							<th class="px-4 py-2.5 font-medium">Status</th>
							<th class="px-4 py-2.5 text-right font-medium">Nominal</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#EAEAEA]">
						{#each pagedTransactions as t (t.transactionId)}
							{@const isInc = t.transactionType === 'income'}
							{@const isPlan = t.transactionIsPlanned === 1}
							<tr class="transition-colors hover:bg-[#F9F9F8]">
								<td class="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap text-[#787774]">
									{dFmt(t.transactionDate)}
								</td>
								<td class="max-w-[280px] px-4 py-2.5">
									<div
										class="truncate font-medium text-[#111111]"
										title={t.transactionDescription || ''}
									>
										{t.transactionDescription || '(tanpa deskripsi)'}
									</div>
								</td>
								<td class="px-4 py-2.5 whitespace-nowrap">
									<span
										class="rounded px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase {t.transactionType ===
										'income'
											? 'bg-[#EDF3EC] text-[#346538]'
											: t.transactionType === 'expense'
												? 'bg-[#FDEBEC] text-[#9F2F2D]'
												: 'bg-[#E1F3FE] text-[#1F6C9F]'}"
									>
										{t.transactionType}
									</span>
								</td>
								<td class="max-w-[130px] truncate px-4 py-2.5 text-[#787774]">
									{getWalletName(t.transactionWalletId)}
								</td>
								<td class="max-w-[130px] truncate px-4 py-2.5 text-[#787774]">
									{getWalletName(t.transactionTargetWalletId)}
								</td>
								<td class="px-4 py-2.5 whitespace-nowrap">
									<span
										class="font-mono text-[10px] font-medium uppercase {isPlan
											? 'text-[#956400]'
											: 'text-[#787774]'}"
									>
										{isPlan ? 'Planned' : 'Realized'}
									</span>
								</td>
								<td
									class="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap tabular-nums {isInc
										? 'text-[#346538]'
										: 'text-[#111111]'}"
								>
									{isInc ? '+' : '−'}{fmtIDR(t.transactionAmount)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination Footer -->
			<div
				class="flex items-center justify-between border-t border-[#EAEAEA] bg-[#F9F9F8] px-4 py-2.5 text-xs text-[#787774]"
			>
				<div>
					Halaman <strong class="font-mono text-[#111111]">{currentPage}</strong> dari
					<span class="font-mono">{totalPages}</span> ({filteredTransactions.length} total baris)
				</div>

				<div class="flex items-center gap-1.5">
					<button
						type="button"
						disabled={currentPage <= 1}
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#111111] hover:bg-[#F9F9F8] disabled:cursor-not-allowed disabled:opacity-40"
					>
						<ArrowLeft class="size-3" weight="bold" />
						<span>Sebelumnya</span>
					</button>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2 py-1 text-xs text-[#111111] hover:bg-[#F9F9F8] disabled:cursor-not-allowed disabled:opacity-40"
					>
						<span>Berikutnya</span>
						<ArrowRight class="size-3" weight="bold" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
