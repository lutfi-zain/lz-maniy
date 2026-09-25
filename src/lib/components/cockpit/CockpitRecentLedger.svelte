<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { DEFAULT_API_URL } from '$lib/stores/mock-data';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import Table from 'phosphor-svelte/lib/Table';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import type { TransactionRecord } from '$lib/types/account-detail';

	let recentTransactions = $state<TransactionRecord[]>([]);
	let isLoading = $state(false);
	let filterStartDate = $state<string>('');
	let filterEndDate = $state<string>('');
	let datePreset = $state<'this_month' | 'next_month' | 'last_month' | 'today' | 'all' | 'custom'>(
		'this_month'
	);

	$effect(() => {
		// Load transactions when dates or preset change
		loadRecent();
	});

	async function loadRecent() {
		isLoading = true;
		const queryParts = ['limit=30'];
		if (filterStartDate) queryParts.push(`startDate=${filterStartDate}`);
		if (filterEndDate) queryParts.push(`endDate=${filterEndDate}`);

		try {
			const res = await fetch(`${DEFAULT_API_URL}/api/v1/transactions?${queryParts.join('&')}`, {
				headers: {
					'X-API-Key': reedrichStore.apiToken,
					Authorization: 'Bearer ' + reedrichStore.apiToken
				}
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

<div class="rounded-lg border border-[#EAEAEA] bg-white p-4 shadow-2xs">
	<!-- Card Header with Date Range Filter -->
	<div
		class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] pb-2.5"
	>
		<div class="flex items-center gap-1.5">
			<Table class="size-4 text-[#111111]" weight="bold" />
			<h3 class="text-xs font-semibold text-[#111111]">Mutasi Terkini</h3>
		</div>

		<div class="flex items-center gap-2">
			<DateRangePicker
				bind:start={filterStartDate}
				bind:end={filterEndDate}
				bind:preset={datePreset}
				onchange={loadRecent}
			/>

			<a
				href="/ledger"
				class="flex items-center gap-1 text-[11px] font-medium text-[#787774] no-underline transition-colors hover:text-[#111111]"
			>
				<span>Semua</span>
				<ArrowRight class="size-3" weight="bold" />
			</a>
		</div>
	</div>

	{#if isLoading && recentTransactions.length === 0}
		<div class="animate-pulse py-12 text-center font-mono text-xs text-[#787774]">
			Memuat riwayat mutasi terkini...
		</div>
	{:else}
		{#if recentTransactions.length === 0}
			<div class="py-8 text-center font-mono text-xs text-[#787774]">
				Tidak ada transaksi pada rentang tanggal ini.
			</div>
		{:else}
			<!-- Desktop: Tabular Grid (>= 768px) -->
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full border-collapse text-left text-xs">
					<thead
						class="border-b border-[#EAEAEA] text-[10px] font-medium tracking-wider text-[#787774] uppercase"
					>
						<tr>
							<th class="pb-2 font-medium">Tanggal</th>
							<th class="pb-2 font-medium">Deskripsi</th>
							<th class="pb-2 font-medium">Akun</th>
							<th class="pb-2 text-right font-medium">Nominal</th>
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
