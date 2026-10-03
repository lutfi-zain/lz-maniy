<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmtTime } from '$lib/utils/dates';
	import { t } from '$lib/i18n/index.svelte';
	import Bank from 'phosphor-svelte/lib/Bank';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import CurrencyBtc from 'phosphor-svelte/lib/CurrencyBtc';
	import DeviceMobile from 'phosphor-svelte/lib/DeviceMobile';
	import Money from 'phosphor-svelte/lib/Money';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import SortAscending from 'phosphor-svelte/lib/SortAscending';
	import Plus from 'phosphor-svelte/lib/Plus';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import { walletFormStore } from '$lib/stores/wallet-form.svelte';
	import { accountsFilterStore } from '$lib/stores/accounts-filter.svelte';
	import AccountsHorizonBoard from '$lib/components/accounts/AccountsHorizonBoard.svelte';
	import Table from 'phosphor-svelte/lib/Table';
	import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank';
	import type { WalletItem } from '$lib/types/account-detail';
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	// Filters & Sorting state
	let searchQuery = $state(accountsFilterStore.searchQuery);
	let statusFilter = $state<'all' | 'spendable' | 'locked'>(accountsFilterStore.statusFilter);
	let sortBy = $state<'balance_desc' | 'balance_asc' | 'name' | 'last_tx'>(
		accountsFilterStore.sortBy
	);
	const viewMode = $derived(accountsFilterStore.viewMode);
	let listViewStyle = $state<'grouped' | 'flat'>(accountsFilterStore.listViewStyle);
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
		accountsFilterStore.searchQuery = searchQuery;
	});
	$effect(() => {
		accountsFilterStore.statusFilter = statusFilter;
	});
	$effect(() => {
		accountsFilterStore.sortBy = sortBy;
	});
	$effect(() => {
		accountsFilterStore.listViewStyle = listViewStyle;
	});

	let activeController: AbortController | null = null;

	onMount(() => {
		const qPreset = page.url.searchParams.get('datePreset');
		const qStart = page.url.searchParams.get('startDate');
		const qEnd = page.url.searchParams.get('endDate');

		if (qPreset && qStart && qEnd) {
			dateFilterStore.setFilter(qPreset as DatePreset, qStart, qEnd);
		}
	});

	// Server-driven point-in-time synchronization with dateFilterStore
	$effect(() => {
		const start = dateFilterStore.startDate;
		const end = dateFilterStore.endDate;
		const preset = dateFilterStore.preset;

		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;

		reedrichStore.fetchWallets(
			{
				startDate: start || undefined,
				endDate: end || undefined
			},
			controller.signal
		);

		return () => {
			controller.abort();
		};
	});

	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const wl = $derived(reedrichStore.snapshot?.wallets);
	const allWallets = $derived(reedrichStore.allWallets);

	// Wallet currency lookup map for fast O(1) resolution
	const walletCurrencyMap = $derived.by(() => {
		const map = new SvelteMap<string, string>();
		for (const w of allWallets) {
			map.set(w.walletId, w.currency || 'IDR');
		}
		return map;
	});

	function getWalletBalance(w: WalletItem): number {
		return w.balance;
	}

	// Point-in-time portfolio summary tiles derived directly from server-filtered wallets
	const timelineNetWorth = $derived.by(() => {
		let total = 0;
		let spendable = 0;
		let locked = 0;
		for (const w of allWallets) {
			const convertedIDR = getConvertedBalanceInIDR(w.balance, w.currency || 'IDR');
			total += convertedIDR;
			if (w.isLocked === 1) {
				locked += convertedIDR;
			} else {
				spendable += convertedIDR;
			}
		}
		const isFiltered = dateFilterStore.preset !== 'this_month' && dateFilterStore.preset !== 'all';
		return {
			label: isFiltered ? 'NET WORTH PENUTUPAN' : 'NET WORTH SAAT INI',
			amount: total,
			spendableAmount: spendable,
			lockedAmount: locked
		};
	});
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

	function openWalletDrawer(wallet: WalletItem) {
		reedrichStore.openDrawer({
			type: 'wallet',
			title: wallet.walletName,
			subtitle: `${wallet.institution} · Tipe: ${wallet.type} · Mata Uang: ${wallet.currency}`,
			badge: wallet.isLocked === 1 ? 'DOMPET TERKUNCI' : 'DOMPET SPENDABLE',
			data: { wallet }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: wallet.walletId, limit: 50 });
	}
</script>

<div class="space-y-4">
	<!-- Macro Summary Tiles -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
					{t('accounts.totalAssets')}
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
				{allWallets.length} accounts
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
					{t('accounts.spendableBalance')}
				</span>
				<span class="size-1.5 rounded-full bg-[#346538]"></span>
			</div>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#346538] tabular-nums">
				{fmtIDR(timelineNetWorth.spendableAmount)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{wl?.spendable.items.length ?? 0} active accounts
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-2xs">
			<div class="flex items-center justify-between">
				<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
					{t('accounts.committedCapital')}
				</span>
				<span class="size-1.5 rounded-full bg-[#956400]"></span>
			</div>
			<span class="mt-0.5 block font-mono text-xl font-semibold text-[#111111] tabular-nums">
				{fmtIDR(timelineNetWorth.lockedAmount)}
			</span>
			<span class="mt-1 block text-[11px] text-[#787774]">
				{wl?.locked.items.length ?? 0} committed accounts
			</span>
		</div>
	</div>

	<!-- Controls Bar: Search, Status Filter, Sort, View Toggle -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EAEAEA] bg-white p-3 text-xs shadow-2xs"
	>
		<!-- Row 1: Search input + DateRangePicker -->
		<div class="flex w-full flex-wrap items-center justify-between gap-2.5">
			<div class="relative w-full sm:w-[260px] sm:flex-none">
				<MagnifyingGlass
					class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787774]"
					weight="bold"
				/>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Search account or bank name..."
					class="w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] py-2 pr-3 pl-8 text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden sm:py-1.5"
				/>
			</div>

			<div class="flex items-center gap-1.5">
				<!-- View mode switcher: List vs Horizon Board -->
				<div
					class="hidden items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5 lg:inline-flex"
				>
					<button
						type="button"
						onclick={() => (accountsFilterStore.viewMode = 'list')}
						class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors {viewMode ===
						'list'
							? 'bg-white text-[#111111] shadow-2xs'
							: 'text-[#787774] hover:text-[#111111]'}"
						title="Tampilan List / Kartu"
						aria-pressed={viewMode === 'list'}
					>
						<Table class="size-3.5" weight={viewMode === 'list' ? 'bold' : 'regular'} />
						<span>List</span>
					</button>

					<button
						type="button"
						onclick={() => (accountsFilterStore.viewMode = 'horizon')}
						class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors {viewMode ===
						'horizon'
							? 'bg-white text-[#111111] shadow-2xs'
							: 'text-[#787774] hover:text-[#111111]'}"
						title="Tampilan Kalendar Multi-Periode"
						aria-pressed={viewMode === 'horizon'}
					>
						<CalendarBlank class="size-3.5" weight={viewMode === 'horizon' ? 'bold' : 'regular'} />
						<span>Horizon Board</span>
					</button>
				</div>

				{#if viewMode !== 'horizon'}
					<DateRangePicker
						bind:start={dateFilterStore.startDate}
						bind:end={dateFilterStore.endDate}
						bind:preset={dateFilterStore.preset}
						onchange={({ preset, start, end }) => {
							dateFilterStore.setFilter(preset as DatePreset, start, end);
						}}
					/>
				{/if}
				<button
					type="button"
					onclick={() => walletFormStore.openCreate()}
					class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
				>
					<Plus class="size-3.5" weight="bold" />
					<span>{t('accounts.addAccount')}</span>
				</button>
				{#if viewMode !== 'horizon' && dateFilterStore.preset !== 'this_month'}
					<button
						type="button"
						onclick={() => dateFilterStore.reset()}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1.5 text-[11px] font-medium text-[#787774] transition-colors hover:border-[#111111] hover:text-[#111111]"
						title="Reset ke Bulan Ini"
					>
						{t('common.reset')}
					</button>
				{/if}
			</div>
		</div>

		<!-- Row 2: Status Filter (Left) + Sort & View Controls (Right) -->
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
					{t('common.all')}
				</button>
				<button
					type="button"
					onclick={() => (statusFilter = 'spendable')}
					class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {statusFilter ===
					'spendable'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					{t('ledger.summary.spendable')}
				</button>
				<button
					type="button"
					onclick={() => (statusFilter = 'locked')}
					class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {statusFilter ===
					'locked'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					{t('ledger.summary.locked')}
				</button>
			</div>

			<!-- Right: Sort Dropdown & View Mode Toggle -->
			<div class="flex items-center gap-2.5">
				<!-- Sort dropdown -->
				<div class="flex items-center gap-1.5">
					<SortAscending class="size-3.5 text-[#787774]" weight="bold" />
					<select
						bind:value={sortBy}
						class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
					>
						<option value="balance_desc">{t('planning.categories.sortHighest')}</option>
						<option value="balance_asc">{t('planning.categories.sortLowest')}</option>
						<option value="name">{t('planning.categories.sortName')}</option>
						<option value="last_tx">{t('cockpit.recentTransactions')}</option>
					</select>
				</div>

				<!-- View style toggle for list mode -->
				{#if viewMode === 'list'}
					<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
						<button
							type="button"
							onclick={() => (listViewStyle = 'grouped')}
							class="cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors {listViewStyle ===
							'grouped'
								? 'bg-white text-[#111111] shadow-2xs'
								: 'text-[#787774]'}"
						>
							{t('planning.categories.viewGrouped')}
						</button>
						<button
							type="button"
							onclick={() => (listViewStyle = 'flat')}
							class="cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors {listViewStyle ===
							'flat'
								? 'bg-white text-[#111111] shadow-2xs'
								: 'text-[#787774]'}"
						>
							{t('planning.categories.viewFlat')}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Accounts Content: Horizon Board vs List Views -->
	{#if !isMobile && viewMode === 'horizon'}
		<AccountsHorizonBoard />
	{:else if (reedrichStore.isWalletsLoading || reedrichStore.isLoading) && allWallets.length === 0}
		<div class="space-y-4">
			{#each [0, 1, 2] as i (i)}
				<div class="space-y-3 overflow-hidden rounded-lg border border-[#EAEAEA] bg-white p-4">
					<div class="flex items-center justify-between">
						<Skeleton class="h-4 w-32" />
						<Skeleton class="h-4 w-24" />
					</div>
					<div class="space-y-2 border-t border-[#EAEAEA] pt-2">
						<Skeleton class="h-3 w-48" />
						<Skeleton class="h-3 w-36" />
					</div>
				</div>
			{/each}
		</div>
	{:else if listViewStyle === 'grouped'}
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
							<a
								href="/ledger?walletId={encodeURIComponent(w.walletId)}"
								class="group flex flex-wrap items-center justify-between gap-3 p-3.5 no-underline transition-colors hover:bg-[#FBFBFA]"
								title="Buka mutasi {w.walletName} di Ledger"
							>
								<div class="flex items-center gap-3">
									<div
										class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2 text-[#787774] transition-colors group-hover:border-[#111111] group-hover:text-[#111111]"
									>
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
											<span class="transition-colors group-hover:text-[#111111]"
												>{w.walletName}</span
											>
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

								<div class="flex items-center gap-3">
									<span class="font-mono text-sm font-semibold text-[#111111] tabular-nums">
										{fmtCurrency(getWalletBalance(w), w.currency)}
									</span>
									<button
										type="button"
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											openWalletDrawer(w);
										}}
										class="flex size-7 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all group-hover:opacity-100 hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100"
										title="Ubah & kelola akun"
										aria-label="Ubah akun {w.walletName}"
									>
										<PencilSimple class="size-3.5" weight="bold" />
									</button>
								</div>
							</a>
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
				<a
					href="/ledger?walletId={encodeURIComponent(w.walletId)}"
					class="group flex flex-wrap items-center justify-between gap-3 p-3.5 no-underline transition-colors hover:bg-[#FBFBFA]"
					title="Buka mutasi {w.walletName} di Ledger"
				>
					<div class="flex items-center gap-3">
						<div
							class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2 text-[#787774] transition-colors group-hover:border-[#111111] group-hover:text-[#111111]"
						>
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
								<span class="transition-colors group-hover:text-[#111111]">{w.walletName}</span>
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

					<div class="flex items-center gap-3">
						<span class="font-mono text-sm font-semibold text-[#111111] tabular-nums">
							{fmtCurrency(getWalletBalance(w), w.currency)}
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								openWalletDrawer(w);
							}}
							class="flex size-7 cursor-pointer items-center justify-center rounded border border-[#EAEAEA] bg-white text-[#787774] opacity-0 transition-all group-hover:opacity-100 hover:border-[#111111] hover:text-[#111111] hover:shadow-2xs focus-visible:opacity-100"
							title="Ubah & kelola akun"
							aria-label="Ubah akun {w.walletName}"
						>
							<PencilSimple class="size-3.5" weight="bold" />
						</button>
					</div>
				</a>
			{:else}
				<div class="py-12 text-center font-mono text-xs text-[#787774]">
					Tidak ada akun yang sesuai dengan filter "{searchQuery}".
				</div>
			{/each}
		</div>
	{/if}
</div>
