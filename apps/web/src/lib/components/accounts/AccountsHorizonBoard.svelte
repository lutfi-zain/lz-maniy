<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { accountsFilterStore } from '$lib/stores/accounts-filter.svelte';
	import { settingsStore, getDefaultActivePeriods } from '$lib/stores/settings.svelte.js';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { mLabel } from '$lib/utils/dates';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import CornersOut from 'phosphor-svelte/lib/CornersOut';
	import Trash from 'phosphor-svelte/lib/Trash';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import AddPeriodCard from '$lib/components/ledger/AddPeriodCard.svelte';
	import type { WalletItem, HorizonBoardDTO } from '$lib/types/account-detail';

	// Ordered active periods (ascending chronological)
	const orderedPeriods = $derived.by(() => {
		const raw = settingsStore.settings.activePeriods;
		if (!raw || raw.length === 0) {
			return getDefaultActivePeriods();
		}
		return [...raw].sort();
	});

	function getMonthDateBounds(yearMonth: string) {
		const [yStr, mStr] = yearMonth.split('-');
		const y = parseInt(yStr, 10);
		const m = parseInt(mStr, 10);
		const startDate = `${yearMonth}-01`;
		const lastDay = new Date(y, m, 0).getDate();
		const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
		return { startDate, endDate };
	}

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
				console.warn('Horizon projections API error, using local fallback:', err);
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
	const currentNetWorth = $derived(reedrichStore.snapshot?.netWorth?.consolidated?.total ?? 0);
	const currentSpendable = $derived(reedrichStore.snapshot?.wallets.spendable.total ?? 0);
	const currentLocked = $derived(reedrichStore.snapshot?.wallets.locked.total ?? 0);

	// Precompute point-in-time state per period
	const periodData = $derived.by(() => {
		return orderedPeriods.map((periodKey) => {
			const { startDate, endDate } = getMonthDateBounds(periodKey);
			const srvPeriod = horizonData?.periods.find((p) => p.periodKey === periodKey);

			// Build point-in-time balances map
			// Build point-in-time balances map
			const balances = new SvelteMap<string, number>();
			if (srvPeriod) {
				for (const wb of srvPeriod.walletBalances) {
					balances.set(wb.walletId, wb.balance);
				}
			} else {
				console.warn(
					`[AccountsHorizonBoard] No server horizon data for period ${periodKey}, falling back to current wallet balances`
				);
				for (const w of allWallets) {
					balances.set(w.walletId, w.balance);
				}
			}

			// Portfolio point-in-time aggregates
			let netWorth = srvPeriod?.netWorth.total ?? currentNetWorth;
			let spendable = srvPeriod?.netWorth.spendable ?? currentSpendable;
			let locked = srvPeriod?.netWorth.locked ?? currentLocked;
			// Filter and sort wallets based on accountsFilterStore
			const q = accountsFilterStore.searchQuery.trim().toLowerCase();
			let filtered = allWallets.filter((w) => {
				// Status filter
				if (accountsFilterStore.statusFilter === 'spendable' && w.isLocked) return false;
				if (accountsFilterStore.statusFilter === 'locked' && !w.isLocked) return false;

				// Search filter
				if (q) {
					const name = (w.walletName || '').toLowerCase();
					const inst = (w.institution || '').toLowerCase();
					const curr = (w.currency || '').toLowerCase();
					if (!name.includes(q) && !inst.includes(q) && !curr.includes(q)) return false;
				}

				return true;
			});

			// Sort
			filtered = [...filtered].sort((a, b) => {
				const balA = balances.get(a.walletId) ?? a.balance;
				const balB = balances.get(b.walletId) ?? b.balance;
				const balA_IDR = getConvertedBalanceInIDR(balA, a.currency);
				const balB_IDR = getConvertedBalanceInIDR(balB, b.currency);

				if (accountsFilterStore.sortBy === 'balance_desc') return balB_IDR - balA_IDR;
				if (accountsFilterStore.sortBy === 'balance_asc') return balA_IDR - balB_IDR;
				if (accountsFilterStore.sortBy === 'name') return a.walletName.localeCompare(b.walletName);
				return 0;
			});

			// Recalculate column subtotals if filtered
			if (accountsFilterStore.hasActiveFilters) {
				let fSpendable = 0;
				let fLocked = 0;
				for (const w of filtered) {
					const rawB = balances.get(w.walletId) ?? w.balance;
					const bIDR = getConvertedBalanceInIDR(rawB, w.currency);
					if (w.isLocked) {
						fLocked += bIDR;
					} else {
						fSpendable += bIDR;
					}
				}
				spendable = fSpendable;
				locked = fLocked;
				netWorth = fSpendable + fLocked;
			}

			return {
				periodKey,
				startDate,
				endDate,
				periodTitle: mLabel(periodKey, i18nStore.locale),
				balances,
				wallets: filtered,
				netWorth,
				spendable,
				locked,
				label: 'PROYEKSI NET WORTH'
			};
		});
	});

	function handleMaximize(startDate: string, endDate: string) {
		dateFilterStore.setFilter('custom', startDate, endDate);
		accountsFilterStore.viewMode = 'list';
	}
	function handleWalletClick(w: WalletItem) {
		reedrichStore.openDrawer({
			type: 'wallet',
			title: w.walletName,
			subtitle: `${w.institution} · Tipe: ${w.type} · Mata Uang: ${w.currency}`,
			badge: w.isLocked === 1 ? 'DOMPET TERKUNCI' : 'DOMPET SPENDABLE',
			data: { wallet: w }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: w.walletId, limit: 50 });
	}
</script>

{#if isHorizonLoading && !horizonData && allWallets.length === 0}
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
					{#each [0, 1, 2, 3] as r (r)}
						<div class="flex items-center justify-between">
							<Skeleton class="h-3 w-20" />
							<Skeleton class="h-3 w-16" />
						</div>
					{/each}
				</div>
				<div class="space-y-2 border-t border-[#EAEAEA] bg-[#FDFCFB] p-3">
					<Skeleton class="h-3 w-full" />
					<Skeleton class="h-3 w-full" />
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
							{col.wallets.length}
							{i18nStore.locale === 'id' ? 'akun' : 'accounts'}
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

				<!-- Wallet List -->
				<div class="h-[320px] divide-y divide-[#EAEAEA] overflow-y-auto text-xs">
					{#if col.wallets.length === 0}
						<div class="flex h-full flex-col items-center justify-center p-4 text-center">
							<p class="text-[11px] text-[#787774]">
								{i18nStore.locale === 'id' ? 'Tidak ada akun' : 'No accounts'}
							</p>
						</div>
					{:else}
						{#each col.wallets as w (w.walletId)}
							{@const rawBal = col.balances.get(w.walletId) ?? w.balance}
							{@const balIDR = getConvertedBalanceInIDR(rawBal, w.currency)}
							<button
								type="button"
								onclick={() => handleWalletClick(w)}
								class="w-full cursor-pointer p-2.5 text-left transition-colors hover:bg-[#F9F9F8]"
							>
								<div class="flex items-center justify-between gap-1.5">
									<div class="flex min-w-0 items-center gap-1.5">
										{#if w.isLocked}
											<LockKey class="size-3 shrink-0 text-[#956400]" weight="bold" />
										{:else}
											<Wallet class="size-3 shrink-0 text-[#787774]" weight="bold" />
										{/if}
										<span class="truncate text-[11px] font-medium text-[#111111]">
											{w.walletName}
										</span>
									</div>

									<span
										class="shrink-0 font-mono text-xs font-semibold text-[#111111] tabular-nums"
									>
										{fmtIDR(balIDR)}
									</span>
								</div>

								<div
									class="mt-1 flex items-center justify-between gap-1 text-[10px] text-[#787774]"
								>
									<span class="truncate">
										{w.institution || 'Dompet'}
									</span>
									{#if w.currency !== 'IDR'}
										<span class="font-mono text-[9px] text-[#787774]">
											{fmtCurrency(rawBal, w.currency)}
										</span>
									{/if}
								</div>
							</button>
						{/each}
					{/if}
				</div>

				<!-- Period Summary Card -->
				<div class="space-y-2 rounded-b-lg border-t border-[#EAEAEA] bg-[#FDFCFB] p-3 text-xs">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-semibold tracking-wider text-[#787774] uppercase">
							{col.label || 'PROYEKSI NET WORTH'}
						</span>
						<span class="font-mono text-xs font-bold text-[#111111] tabular-nums">
							{fmtIDR(col.netWorth)}
						</span>
					</div>

					<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
						<span class="flex items-center gap-1.5">
							<span class="size-1.5 rounded-full bg-[#346538]"></span>
							<span>{t('ledger.summary.spendable')}</span>
						</span>
						<span class="font-medium text-[#346538] tabular-nums">{fmtIDR(col.spendable)}</span>
					</div>

					<div class="flex items-center justify-between font-mono text-[10px] text-[#787774]">
						<span class="flex items-center gap-1.5">
							<span class="size-1.5 rounded-full bg-[#956400]"></span>
							<span>{t('ledger.summary.locked')}</span>
						</span>
						<span class="font-medium text-[#956400] tabular-nums">{fmtIDR(col.locked)}</span>
					</div>
				</div>
			</div>
		{/each}

		<!-- Add Period Action Card -->
		<AddPeriodCard />
	</div>
{/if}
