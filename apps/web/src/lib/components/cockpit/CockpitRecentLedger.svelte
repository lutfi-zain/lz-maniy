<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import { DEFAULT_API_URL } from '$lib/stores/mock-data';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import { t } from '$lib/i18n/index.svelte';
	import Table from 'phosphor-svelte/lib/Table';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import type { TransactionRecord } from '$lib/types/account-detail';
	let recentTransactions = $state<TransactionRecord[]>([]);
	let isLoading = $state(false);
	// Reactive synchronization with dateFilterStore
	$effect(() => {
		// Track reactive dependencies
		const _s = dateFilterStore.startDate;
		const _e = dateFilterStore.endDate;
		const _p = dateFilterStore.preset;
		if (_p || _s || _e) {
			loadRecent();
		}
	});

	async function loadRecent() {
		isLoading = true;
		const queryParts = ['limit=30'];
		if (dateFilterStore.startDate) queryParts.push(`startDate=${dateFilterStore.startDate}`);
		if (dateFilterStore.endDate) queryParts.push(`endDate=${dateFilterStore.endDate}`);

		try {
			const token = (authStore.accessToken || reedrichStore.apiToken).trim();
			const headers: Record<string, string> = {};
			if (token) {
				headers['X-API-Key'] = token;
				headers['Authorization'] = 'Bearer ' + token;
			}
			const res = await fetch(`${DEFAULT_API_URL}/api/v1/transactions?${queryParts.join('&')}`, {
				headers
			});
			if (res.ok) {
				const data = await res.json();
				recentTransactions = Array.isArray(data) ? data : (data.items ?? []);
			}
		} catch (e) {
			console.warn('Gagal memuat feed mutasi terkini:', e);
		} finally {
			isLoading = false;
		}
	}

	function getWalletName(walletId: string): string {
		const w = reedrichStore.allWallets.find((x) => x.walletId === walletId);
		return w?.walletName ?? 'Akun';
	}

	function getWalletCurrency(walletId: string): string {
		const w = reedrichStore.allWallets.find((x) => x.walletId === walletId);
		return w?.currency ?? 'IDR';
	}
</script>

<div class="rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs overflow-hidden max-w-full">
	<!-- Card Header with Date Range Filter -->
	<div
		class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] pb-2.5"
	>
		<div class="flex items-center gap-1.5">
			<Table class="size-4 text-[#111111]" weight="bold" />
			<h3 class="text-xs font-semibold text-[#111111]">{t('cockpit.recentTransactions')}</h3>
		</div>

		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1.5">
				<DateRangePicker
					bind:start={dateFilterStore.startDate}
					bind:end={dateFilterStore.endDate}
					bind:preset={dateFilterStore.preset}
					onchange={({ preset, start, end }) => {
						dateFilterStore.setFilter(preset as DatePreset, start, end);
						loadRecent();
					}}
				/>
				{#if dateFilterStore.preset !== 'this_month'}
					<button
						type="button"
						onclick={() => {
							dateFilterStore.reset();
							loadRecent();
						}}
						class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-[11px] font-medium text-[#787774] transition-colors hover:border-[#111111] hover:text-[#111111]"
						title="Reset ke Bulan Ini"
					>
						{t('common.reset')}
					</button>
				{/if}
			</div>

			<a
				href="/ledger"
				class="flex items-center gap-1 text-[11px] font-medium text-[#787774] no-underline transition-colors hover:text-[#111111]"
			>
				<span>{t('common.viewAll')}</span>
				<ArrowRight class="size-3" weight="bold" />
			</a>
		</div>
	</div>

	{#if isLoading && recentTransactions.length === 0}
		<!-- Structured Skeleton Table Feed -->
		<div class="space-y-3 py-2">
			{#each [0, 1, 2, 3, 4] as i (i)}
				<div class="flex items-center justify-between py-1.5">
					<div class="space-y-1.5">
						<Skeleton class="h-3 w-36 sm:w-48" />
						<Skeleton class="h-2.5 w-20" />
					</div>
					<Skeleton class="h-3.5 w-24" />
				</div>
			{/each}
		</div>
	{:else}
		{#if recentTransactions.length === 0}
			<div class="py-8 text-center font-mono text-xs text-[#787774]">
				{t('common.empty')}
			</div>
		{:else}
			<!-- Desktop: Tabular Grid (>= 768px) -->
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full border-collapse text-left text-xs">
					<thead
						class="border-b border-[#EAEAEA] text-[10px] font-medium tracking-wider text-[#787774] uppercase"
					>
						<tr>
							<th class="pb-2 font-medium">{t('common.date')}</th>
							<th class="pb-2 font-medium">{t('common.description')}</th>
							<th class="pb-2 font-medium">{t('common.account')}</th>
							<th class="pb-2 text-right font-medium">{t('common.amount')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#EAEAEA]">
						{#each recentTransactions as tx (tx.transactionId)}
							{@const isInc = tx.transactionType === 'income'}
							{@const isPlan = tx.transactionIsPlanned === 1}
							{@const curr = getWalletCurrency(tx.transactionWalletId)}
							{@const amtIDR = getConvertedBalanceInIDR(tx.transactionAmount, curr)}
							<tr class="transition-colors hover:bg-[#F9F9F8]">
								<td class="py-2 font-mono text-[11px] whitespace-nowrap text-[#787774]">
									{dFmt(tx.transactionDate)}
								</td>
								<td class="max-w-[220px] py-2 pr-2">
									<div
										class="truncate font-medium text-[#111111]"
										title={tx.transactionDescription || ''}
									>
										{tx.transactionDescription || '(tanpa deskripsi)'}
									</div>
									{#if isPlan}
										<span class="inline-block font-mono text-[9px] text-[#956400] uppercase">
											Planned
										</span>
									{/if}
								</td>
								<td class="max-w-[110px] truncate py-2 text-[11px] text-[#787774]">
									{getWalletName(tx.transactionWalletId)}
								</td>
								<td
									class="py-2 text-right font-mono font-semibold whitespace-nowrap tabular-nums {isInc
										? 'text-[#346538]'
										: 'text-[#111111]'}"
								>
									<div>{isInc ? '+' : '−'}{fmtIDR(amtIDR)}</div>
									{#if curr !== 'IDR'}
										<div class="font-mono text-[9px] font-normal text-[#787774]">
											({fmtCurrency(tx.transactionAmount, curr)})
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile: Dense Document Feed (< 768px, Zero Horizontal Scroll) -->
			<div class="divide-y divide-[#EAEAEA] md:hidden">
				{#each recentTransactions as tx (tx.transactionId)}
					{@const isInc = tx.transactionType === 'income'}
					{@const isPlan = tx.transactionIsPlanned === 1}
					{@const curr = getWalletCurrency(tx.transactionWalletId)}
					{@const amtIDR = getConvertedBalanceInIDR(tx.transactionAmount, curr)}
					<div class="py-2.5 transition-colors hover:bg-[#FBFBFA]">
						<div class="flex items-start justify-between gap-2">
							<div
								class="line-clamp-1 text-xs font-medium text-[#111111]"
								title={tx.transactionDescription || ''}
							>
								{tx.transactionDescription || '(tanpa deskripsi)'}
							</div>
							<div
								class="text-right font-mono text-xs font-bold whitespace-nowrap tabular-nums {isInc
									? 'text-[#346538]'
									: 'text-[#111111]'}"
							>
								<div>{isInc ? '+' : '−'}{fmtIDR(amtIDR)}</div>
								{#if curr !== 'IDR'}
									<div class="font-mono text-[9px] font-normal text-[#787774]">
										({fmtCurrency(tx.transactionAmount, curr)})
									</div>
								{/if}
							</div>
						</div>
						<div class="mt-1 flex items-center justify-between text-[11px] text-[#787774]">
							<div class="flex items-center gap-1.5 truncate">
								<span class="font-mono text-[10px]">{dFmt(tx.transactionDate)}</span>
								<span>·</span>
								<span class="truncate">{getWalletName(tx.transactionWalletId)}</span>
							</div>
							{#if isPlan}
								<span class="font-mono text-[9px] font-semibold text-[#956400] uppercase">
									Planned
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
