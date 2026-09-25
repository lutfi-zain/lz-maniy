<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmtTime } from '$lib/utils/dates';
	import Bank from 'phosphor-svelte/lib/Bank';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import CurrencyBtc from 'phosphor-svelte/lib/CurrencyBtc';
	import DeviceMobile from 'phosphor-svelte/lib/DeviceMobile';
	import Money from 'phosphor-svelte/lib/Money';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import SortAscending from 'phosphor-svelte/lib/SortAscending';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import {
		calculatePointInTimeNetWorth,
		calculatePointInTimeWalletBalances
	} from '$lib/utils/networth-timeline';
	import type { WalletItem } from '$lib/types/account-detail';

	// Filters, Date Range & Sorting state
	let datePreset = $state<'this_month' | 'next_month' | 'last_month' | 'today' | 'all' | 'custom'>(
		'this_month'
	);
	let filterStartDate = $state<string>('');
	let filterEndDate = $state<string>('');
	let searchQuery = $state('');
	let statusFilter = $state<'all' | 'spendable' | 'locked'>('all');
	let sortBy = $state<'balance_desc' | 'balance_asc' | 'name' | 'last_tx'>('balance_desc');
	let viewMode = $state<'grouped' | 'flat'>('grouped');

	onMount(() => {
		const qPreset = page.url.searchParams.get('datePreset');
		if (
			qPreset &&
			['this_month', 'next_month', 'last_month', 'today', 'all', 'custom'].includes(qPreset)
		) {
			datePreset = qPreset as typeof datePreset;
		}
		reedrichStore.fetchAllTransactions();
	});

	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const wl = $derived(reedrichStore.snapshot?.wallets);
	const allWallets = $derived(reedrichStore.allWallets);
	const allTxs = $derived(reedrichStore.allTransactions);

	// Wallet currency lookup map for fast O(1) resolution
	const walletCurrencyMap = $derived.by(() => {
		const map = new SvelteMap<string, string>();
		for (const w of allWallets) {
			map.set(w.walletId, w.currency || 'IDR');
		}
		return map;
	});

	// Dynamic point-in-time balances for every wallet at horizon T_akhir
	const pointInTimeBalances = $derived(
		calculatePointInTimeWalletBalances({
			wallets: allWallets,
			allTransactions: allTxs,
			endDate: filterEndDate
		})
	);

	function getWalletBalance(w: WalletItem): number {
		return pointInTimeBalances.get(w.walletId) ?? w.balance;
	}

	// Point-in-time portfolio summary tiles
	const currentNetWorth = $derived(nw?.consolidated.total ?? 0);
	const currentSpendable = $derived(wl?.spendable.total);
	const currentLocked = $derived(wl?.locked.total);
	const timelineNetWorth = $derived(
		calculatePointInTimeNetWorth({
			currentNetWorth,
			allTransactions: allTxs,
			endDate: filterEndDate,
			wallets: allWallets,
			walletCurrencyMap,
			currentSpendable,
			currentLocked
		})
	);
	// Filtered wallets
	const filteredWallets = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return allWallets.filter((w) => {
			if (statusFilter === 'spendable' && w.isLocked !== 0) return false;
			if (statusFilter === 'locked' && w.isLocked !== 1) return false;
			if (q) {
				const n = w.walletName.toLowerCase();
				const inst = (w.institution || '').toLowerCase();
				if (!n.includes(q) && !inst.includes(q)) return false;
			}
			return true;
		});
	});

	// Sorted wallets
	const sortedWallets = $derived.by(() => {
		const list = [...filteredWallets];
		if (sortBy === 'balance_desc') {
			list.sort((a, b) => {
				const aIDR = getConvertedBalanceInIDR(getWalletBalance(a), a.currency);
				const bIDR = getConvertedBalanceInIDR(getWalletBalance(b), b.currency);
				return bIDR - aIDR;
			});
		} else if (sortBy === 'balance_asc') {
			list.sort((a, b) => {
				const aIDR = getConvertedBalanceInIDR(getWalletBalance(a), a.currency);
				const bIDR = getConvertedBalanceInIDR(getWalletBalance(b), b.currency);
				return aIDR - bIDR;
			});
		} else if (sortBy === 'name') {
			list.sort((a, b) => a.walletName.localeCompare(b.walletName));
		} else if (sortBy === 'last_tx') {
			list.sort((a, b) => {
				const aD = a.lastTransaction?.date || '';
				const bD = b.lastTransaction?.date || '';
				return bD.localeCompare(aD);
			});
		}
		return list;
	});

	// Group wallets hierarchically with detailed subtotals
	const groupedInstitutions = $derived.by(() => {
		const map = new SvelteMap<
			string,
			{
				institution: string;
				total: number;
				currency: string;
				spendableTotal: number;
				lockedTotal: number;
				spendableCount: number;
				lockedCount: number;
				wallets: WalletItem[];
			}
		>();

		for (const w of sortedWallets) {
			const inst = w.institution || 'Lainnya';
			if (!map.has(inst)) {
				map.set(inst, {
					institution: inst,
					total: 0,
					currency: w.currency,
					spendableTotal: 0,
					lockedTotal: 0,
					spendableCount: 0,
					lockedCount: 0,
					wallets: []
				});
			}
			const group = map.get(inst)!;
			group.wallets.push(w);

			const wBal = getWalletBalance(w);
			const convertedIDR = getConvertedBalanceInIDR(wBal, w.currency);

			if (w.isLocked === 1) {
				group.lockedTotal += convertedIDR;
				group.lockedCount++;
			} else {
				group.spendableTotal += convertedIDR;
				group.spendableCount++;
			}

			// Subtotal in native currency or live peg
			if (inst === 'Bitget') {
				group.total += wBal;
			} else {
				group.total += convertedIDR;
			}
		}

		return Array.from(map.values()).sort((a, b) => {
			const aTotalIDR = getConvertedBalanceInIDR(a.total, a.currency);
			const bTotalIDR = getConvertedBalanceInIDR(b.total, b.currency);
			return bTotalIDR - aTotalIDR;
		});
	});
</script>

<div class="space-y-4">
	<!-- Studio Header -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3">
		<div>
			<h1 class="flex items-center gap-2 text-xl font-semibold text-[#111111]">
				<Bank class="size-5 text-[#111111]" weight="bold" />
				<span>Matriks Akun & Bank</span>
			</h1>
			<p class="mt-0.5 text-xs text-[#787774]">
				Hierarki rekening terdistribusi menurut institusi keuangan, subtotal saldo per bank, dan
				pemisahan dana operasional vs cadangan.
			</p>
		</div>
	</div>

	<!-- Macro Summary Tiles -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
					Total Seluruh Aset
				</span>
				<span
					class="py-0.2 rounded bg-[#F0EFEC] px-1.5 font-mono text-[9px] text-[#787774] uppercase"
				>
					{timelineNetWorth.label}
				</span>
			</div>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#111111] tabular-nums">
				{fmtIDR(timelineNetWorth.amount)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{allWallets.length} akun terdaftar di 6 institusi
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
					Kas Siap Pakai (Operasional)
				</span>
				<span class="size-1.5 rounded-full bg-[#346538]"></span>
			</div>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#346538] tabular-nums">
				{fmtIDR(timelineNetWorth.spendableAmount)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{wl?.spendable.items.length ?? 0} akun tanpa gembok
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
					Dana Cadangan & Sewa (Locked)
				</span>
				<span class="size-1.5 rounded-full bg-[#956400]"></span>
			</div>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#111111] tabular-nums">
				{fmtIDR(timelineNetWorth.lockedAmount)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{wl?.locked.items.length ?? 0} akun alokasi khusus
			</span>
		</div>
	</div>

	<!-- Controls Bar: Search, Status Filter, Sort, View Toggle -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EAEAEA] bg-white p-3 text-xs shadow-2xs"
	>
		<!-- Row 1: Search input + DateRangePicker -->
		<div class="flex w-full flex-wrap items-center gap-2.5">
			<div class="relative w-full flex-1 sm:min-w-[200px]">
				<MagnifyingGlass
					class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787774]"
					weight="bold"
				/>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Cari nama akun atau bank..."
					class="w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] py-2 pr-3 pl-8 text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden sm:py-1.5"
				/>
			</div>

			<DateRangePicker
				bind:start={filterStartDate}
				bind:end={filterEndDate}
				bind:preset={datePreset}
			/>
		</div>

		<!-- Row 2: Status Filter + Sort + View Toggle -->
		<div
			class="flex w-full flex-wrap items-center justify-between gap-2.5 border-t border-[#EAEAEA] pt-2 sm:border-t-0 sm:pt-0"
		>
			<!-- Status Filter Toggle -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => (statusFilter = 'all')}
					class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {statusFilter ===
					'all'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Semua
				</button>
				<button
					type="button"
					onclick={() => (statusFilter = 'spendable')}
					class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {statusFilter ===
					'spendable'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Operasional
				</button>
				<button
					type="button"
					onclick={() => (statusFilter = 'locked')}
					class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {statusFilter ===
					'locked'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Cadangan
				</button>
			</div>

			<!-- Sort dropdown -->
			<div class="flex items-center gap-1.5">
				<SortAscending class="size-3.5 text-[#787774]" weight="bold" />
				<select
					bind:value={sortBy}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
				>
					<option value="balance_desc">Saldo Terbesar</option>
					<option value="balance_asc">Saldo Terkecil</option>
					<option value="name">Nama A-Z</option>
					<option value="last_tx">Mutasi Terkini</option>
				</select>
			</div>

			<!-- View mode toggle -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => (viewMode = 'grouped')}
					class="cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors {viewMode ===
					'grouped'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Grup Bank
				</button>
				<button
					type="button"
					onclick={() => (viewMode = 'flat')}
					class="cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors {viewMode ===
					'flat'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Tabel Rata
				</button>
			</div>
		</div>
	</div>

	<!-- Accounts List / Tree -->
	{#if viewMode === 'grouped'}
		<div class="space-y-4">
			{#each groupedInstitutions as group (group.institution)}
				<div class="overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs">
					<!-- Bank Group Header with Subtotals -->
					<div
						class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-[#F9F9F8] px-4 py-3"
					>
						<div class="flex items-center gap-2">
							<Bank class="size-4 text-[#111111]" weight="bold" />
							<h2 class="text-sm font-semibold text-[#111111]">{group.institution}</h2>
							<span class="rounded bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] text-[#787774]">
								{group.wallets.length} akun
							</span>
						</div>

						<div class="flex items-center gap-4 font-mono text-xs tabular-nums">
							<div class="hidden text-[11px] text-[#787774] sm:block">
								Operasional: <span class="font-medium text-[#346538]"
									>{fmtCurrency(group.spendableTotal, group.currency)}</span
								>
								· Cadangan:
								<span class="font-medium text-[#956400]"
									>{fmtCurrency(group.lockedTotal, group.currency)}</span
								>
							</div>
							<div class="border-l border-[#EAEAEA] pl-3 text-sm font-semibold text-[#111111]">
								Subtotal: {fmtCurrency(
									group.total,
									group.institution === 'Bitget' ? 'USDT' : 'IDR'
								)}
							</div>
						</div>
					</div>

					<!-- Wallets List inside this bank -->
					<div class="divide-y divide-[#EAEAEA]">
						{#each group.wallets as w (w.walletId)}
							<div
								class="flex flex-wrap items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[#FBFBFA]"
							>
								<div class="flex items-center gap-3">
									<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2 text-[#787774]">
										{#if w.type === 'crypto'}
											<CurrencyBtc class="size-4" weight="bold" />
										{:else if w.type === 'e-wallet'}
											<DeviceMobile class="size-4" weight="bold" />
										{:else if w.type === 'cash'}
											<Money class="size-4" weight="bold" />
										{:else}
											<Wallet class="size-4" weight="bold" />
										{/if}
									</div>

									<div>
										<div class="flex items-center gap-2 text-xs font-semibold text-[#111111]">
											<span>{w.walletName}</span>
											<StatusBadge status={w.isLocked} />
											<span
												class="py-0.2 rounded bg-[#F0EFEC] px-1.5 font-mono text-[10px] font-medium text-[#787774]"
											>
												{w.currency}
											</span>
										</div>
										<div class="mt-0.5 text-[11px] text-[#787774]">
											{#if w.lastTransaction}
												Terakhir: {dFmtTime(w.lastTransaction.date)} · {w.lastTransaction
													.description || w.lastTransaction.category} ({w.lastTransaction
													.direction === 'in'
													? '+'
													: '−'}{fmtIDR(w.lastTransaction.amount)})
											{:else}
												Belum ada mutasi tercatat
											{/if}
										</div>
									</div>
								</div>

								<div class="flex items-center gap-4">
									<div
										class="text-right font-mono text-sm font-semibold text-[#111111] tabular-nums"
									>
										{fmtCurrency(getWalletBalance(w), w.currency)}
									</div>

									<a
										href="/ledger?walletId={encodeURIComponent(w.walletId)}"
										class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#111111] no-underline transition-colors hover:border-[#C8C6BF] hover:bg-[#F9F9F8]"
									>
										<span>Lihat Mutasi</span>
										<ArrowRight class="size-3" weight="bold" />
									</a>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="py-12 text-center font-mono text-xs text-[#787774]">
					Tidak ada akun yang sesuai dengan filter "{searchQuery}".
				</div>
			{/each}
		</div>
	{:else}
		<!-- Flat List View -->
		<div
			class="divide-y divide-[#EAEAEA] overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-2xs"
		>
			{#each sortedWallets as w (w.walletId)}
				<div
					class="flex flex-wrap items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[#FBFBFA]"
				>
					<div class="flex items-center gap-3">
						<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2 text-[#787774]">
							{#if w.type === 'crypto'}
								<CurrencyBtc class="size-4" weight="bold" />
							{:else if w.type === 'e-wallet'}
								<DeviceMobile class="size-4" weight="bold" />
							{:else if w.type === 'cash'}
								<Money class="size-4" weight="bold" />
							{:else}
								<Wallet class="size-4" weight="bold" />
							{/if}
						</div>

						<div>
							<div class="flex items-center gap-2 text-xs font-semibold text-[#111111]">
								<span>{w.walletName}</span>
								<span
									class="py-0.2 rounded bg-[#EFEFED] px-1.5 text-[10px] font-medium text-[#787774]"
								>
									{w.institution}
								</span>
								<StatusBadge status={w.isLocked} />
								<span
									class="py-0.2 rounded bg-[#F0EFEC] px-1.5 font-mono text-[10px] font-medium text-[#787774]"
								>
									{w.currency}
								</span>
							</div>
							<div class="mt-0.5 text-[11px] text-[#787774]">
								{#if w.lastTransaction}
									Terakhir: {dFmtTime(w.lastTransaction.date)} · {w.lastTransaction.description ||
										w.lastTransaction.category} ({w.lastTransaction.direction === 'in'
										? '+'
										: '−'}{fmtIDR(w.lastTransaction.amount)})
								{:else}
									Belum ada mutasi tercatat
								{/if}
							</div>
						</div>
					</div>

					<div class="flex items-center gap-4">
						<div class="text-right font-mono text-sm font-semibold text-[#111111] tabular-nums">
							{fmtCurrency(getWalletBalance(w), w.currency)}
						</div>

						<a
							href="/ledger?walletId={encodeURIComponent(w.walletId)}"
							class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#111111] no-underline transition-colors hover:border-[#C8C6BF] hover:bg-[#F9F9F8]"
						>
							<span>Lihat Mutasi</span>
							<ArrowRight class="size-3" weight="bold" />
						</a>
					</div>
				</div>
			{:else}
				<div class="py-12 text-center font-mono text-xs text-[#787774]">
					Tidak ada akun yang sesuai dengan filter "{searchQuery}".
				</div>
			{/each}
		</div>
	{/if}
</div>
