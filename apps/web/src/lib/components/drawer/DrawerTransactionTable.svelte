<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtCurrency } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	let { currency = 'IDR' }: { currency?: string } = $props();

	const txs = $derived(reedrichStore.filteredDrawerTransactions);
	const isLoading = $derived(reedrichStore.isDrawerLoading);
	const pagination = $derived(reedrichStore.drawerPagination);

	const currentPage = $derived(
		pagination.limit > 0 ? Math.floor(pagination.offset / pagination.limit) + 1 : 1
	);
	const totalPages = $derived(pagination.totalPages || 1);

	function goToPage(page: number) {
		if (!reedrichStore.drawerCurrentParams) return;
		const limit = pagination.limit || 50;
		const offset = (page - 1) * limit;
		reedrichStore.fetchTransactionsForDrawer({
			...reedrichStore.drawerCurrentParams,
			limit,
			offset
		});
	}
</script>
<div class="mt-4">
	<div class="mb-3 flex items-center gap-2">
		<div class="relative flex-1">
			<MagnifyingGlass
				class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787774]"
				weight="bold"
			/>
			<input
				type="search"
				bind:value={reedrichStore.drawerSearch}
				placeholder="Cari transaksi dalam tampilan ini..."
				class="w-full rounded-md border border-[#EAEAEA] bg-[#F9F9F8] py-1.5 pr-3 pl-8 text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden"
			/>
		</div>
		<span class="font-mono text-[11px] whitespace-nowrap text-[#787774]">
			{txs.length} transaksi
		</span>
	</div>

	{#if isLoading}
		<div class="space-y-3 py-3">
			{#each [0, 1, 2, 3] as i (i)}
				<div class="flex items-center justify-between gap-4 border-b border-[#EAEAEA] py-2">
					<Skeleton class="h-3 w-16 shrink-0" />
					<Skeleton class="h-3 w-40 flex-1" />
					<Skeleton class="h-3 w-14 shrink-0" />
					<Skeleton class="h-3 w-20 shrink-0 text-right" />
				</div>
			{/each}
		</div>
	{:else if txs.length === 0}
		<div
			class="rounded-lg border border-dashed border-[#EAEAEA] py-12 text-center font-mono text-xs text-[#787774]"
		>
			Tidak ada transaksi tercatat.
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-[#EAEAEA]">
			<table class="w-full border-collapse text-left text-xs">
				<thead
					class="border-b border-[#EAEAEA] bg-[#F9F9F8] text-[10px] tracking-wider text-[#787774] uppercase"
				>
					<tr>
						<th class="px-3 py-2 font-medium">Tanggal</th>
						<th class="px-3 py-2 font-medium">Deskripsi</th>
						<th class="px-3 py-2 font-medium">Tipe</th>
						<th class="px-3 py-2 font-medium">Status</th>
						<th class="px-3 py-2 text-right font-medium">Nominal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#EAEAEA]">
					{#each txs as t (t.transactionId)}
						{@const isInc = t.transactionType === 'income'}
						{@const isPlan = t.transactionIsPlanned === 1}
						<tr class="transition-colors hover:bg-[#FBFBFA]">
							<td class="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap text-[#787774]">
								{dFmt(t.transactionDate)}
							</td>
							<td class="max-w-[200px] px-3 py-2.5">
								<div
									class="truncate font-medium text-[#111111]"
									title={t.transactionDescription || ''}
								>
									{t.transactionDescription || '(tanpa deskripsi)'}
								</div>
							</td>
							<td class="px-3 py-2.5 whitespace-nowrap">
								<span
									class="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase {t.transactionType ===
									'income'
										? 'bg-[#EDF3EC] text-[#346538]'
										: t.transactionType === 'expense'
											? 'bg-[#FDEBEC] text-[#9F2F2D]'
											: 'bg-[#E1F3FE] text-[#1F6C9F]'}"
								>
									{t.transactionType}
								</span>
							</td>
							<td class="px-3 py-2.5 whitespace-nowrap">
								<span
									class="rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wider uppercase {isPlan
										? 'bg-[#FBF3DB] text-[#956400]'
										: 'bg-[#EFEFED] text-[#111111]'}"
								>
									{isPlan ? 'planned' : 'realized'}
								</span>
							</td>
							<td
								class="px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap {isInc
									? 'text-[#346538]'
									: 'text-[#111111]'}"
							>
								{isInc ? '+' : '−'}{fmtCurrency(t.transactionAmount, currency)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Controls -->
		{#if totalPages > 1}
			<div class="mt-3 flex items-center justify-between border-t border-[#EAEAEA] pt-2 text-xs">
				<span class="font-mono text-[11px] text-[#787774]">
					Halaman {currentPage} dari {totalPages} ({pagination.total} transaksi)
				</span>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						disabled={currentPage <= 1 || isLoading}
						onclick={() => goToPage(currentPage - 1)}
						class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1 text-[11px] font-medium text-[#111111] transition-colors hover:border-[#111111] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
					>
						Sebelumnya
					</button>
					<button
						type="button"
						disabled={currentPage >= totalPages || isLoading}
						onclick={() => goToPage(currentPage + 1)}
						class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-1 text-[11px] font-medium text-[#111111] transition-colors hover:border-[#111111] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
					>
						Selanjutnya
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>
