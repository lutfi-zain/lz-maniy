<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import DrawerTransactionTable from './DrawerTransactionTable.svelte';
	import { categoryFormStore } from '$lib/stores/category-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import type { CategoryBreakdownItem } from '$lib/types/account-detail';

	let { item }: { item: CategoryBreakdownItem } = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	const matchedCategory = $derived(
		reedrichStore.categories.find((c) => c.categoryName === item.categoryName)
	);
	const isProtected = $derived(matchedCategory?.categoryName === 'Adjustment');

	function handleEdit() {
		if (matchedCategory) {
			categoryFormStore.openEdit(matchedCategory);
		}
	}

	async function handleDelete() {
		if (!matchedCategory || isProtected) return;
		isDeleting = true;
		deleteError = null;
		try {
			await reedrichStore.deleteCategory(matchedCategory.categoryId);
			reedrichStore.closeDrawer();
		} catch (err: unknown) {
			deleteError = err instanceof Error ? err.message : 'Gagal menghapus kategori';
			isDeleting = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Total ({dateFilterStore.preset === 'this_month'
					? 'Bulan Ini'
					: dateFilterStore.preset === 'today'
						? 'Hari Ini'
						: dateFilterStore.preset === 'last_month'
							? 'Bulan Lalu'
							: dateFilterStore.preset === 'next_month'
								? 'Bulan Depan'
								: 'Periode Terpilih'})
			</span>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(item.amount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Porsi Pengeluaran</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{typeof item.percentage === 'number' ? item.percentage.toFixed(1) : item.percentage}%
			</span>
		</div>
	</div>

	<!-- Progress Track -->
	<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
		<div class="h-full bg-[#111111]" style="width: {Math.min(100, item.percentage * 2.8)}%"></div>
	</div>

	<!-- Transactions List Table -->
	<div>
		<div class="mb-1 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Daftar Transaksi Kategori "{item.categoryName}"
		</div>
		<DrawerTransactionTable currency="IDR" />
	</div>
	<!-- Action Toolbar -->
	{#if matchedCategory}
		<div class="space-y-2 border-t border-[#EAEAEA] pt-3 text-xs">
			{#if deleteError}
				<div class="rounded-md border border-[#FDEBEC] bg-[#FDF2F2] p-2.5 text-xs text-[#9F2F2D]">
					{deleteError}
				</div>
			{/if}

			<div class="flex items-center justify-between gap-2">
				<a
					href="/ledger?categoryId={encodeURIComponent(matchedCategory.categoryId)}"
					onclick={() => reedrichStore.closeDrawer()}
					class="flex cursor-pointer items-center gap-1 font-mono text-[11px] text-[#787774] hover:text-[#111111]"
				>
					Buka di Ledger &rarr;
				</a>

				<div class="flex items-center gap-2">
					<button
						type="button"
					onclick={handleEdit}
					class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8]"
				>
					<PencilSimple class="size-3.5" weight="bold" />
					<span>Edit Kategori</span>
				</button>

				{#if !isProtected}
					<button
						type="button"
						onclick={() => (showDeleteConfirm = true)}
						class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#9F2F2D] transition-colors hover:bg-[#FDF2F2]"
					>
						<Trash class="size-3.5" weight="bold" />
						<span>Hapus</span>
					</button>
				{/if}
				</div>
			</div>

			<!-- Inline Delete Confirmation -->
			{#if showDeleteConfirm}
				<div class="rounded-lg border border-[#FDEBEC] bg-[#FDF2F2] p-3">
					<p class="text-xs font-medium text-[#9F2F2D]">
						Yakin ingin menghapus kategori "{matchedCategory.categoryName}"?
					</p>
					<p class="mt-0.5 text-[11px] text-[#787774]">
						Transaksi lama yang menggunakan kategori ini akan tetap tersimpan tanpa tautan kategori.
					</p>
					<div class="mt-2.5 flex items-center justify-end gap-2">
						<button
							type="button"
							onclick={() => (showDeleteConfirm = false)}
							class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs text-[#787774] hover:bg-[#F9F9F8]"
						>
							Batal
						</button>
						<button
							type="button"
							onclick={handleDelete}
							disabled={isDeleting}
							class="cursor-pointer rounded-md bg-[#9F2F2D] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{isDeleting ? 'Menghapus...' : 'Ya, Hapus Kategori'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
