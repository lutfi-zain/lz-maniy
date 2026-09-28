<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import DrawerTransactionTable from './DrawerTransactionTable.svelte';
	import { budgetFormStore } from '$lib/stores/budget-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import type { BudgetSnapshot } from '$lib/types/account-detail';

	let { budget }: { budget: BudgetSnapshot } = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	const p = $derived(budget.percentUsed || 0);

	function handleEdit() {
		budgetFormStore.openEdit(budget);
	}

	async function handleDelete() {
		isDeleting = true;
		deleteError = null;
		try {
			await reedrichStore.deleteBudget(budget.budgetId);
			reedrichStore.closeDrawer();
		} catch (err: unknown) {
			deleteError = err instanceof Error ? err.message : 'Gagal menghapus budget';
			isDeleting = false;
		}
	}

</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Pagu Batas Belanja</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(budget.amount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Sisa Pagu Belanja</span
			>
			<span class="font-mono text-base font-semibold text-[#346538]">
				{fmtIDR(budget.remaining)}
			</span>
		</div>
	</div>

	<!-- Status Card -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5">
		<div class="mb-2 flex items-center justify-between text-xs">
			<span class="text-[#787774]">Terpakai {p}% ({fmtIDR(budget.spent)})</span>
			<span class="font-mono text-xs font-semibold uppercase">{budget.status}</span>
		</div>
		<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div class="h-full bg-[#111111]" style="width: {Math.min(100, p)}%"></div>
		</div>
	</div>

	<!-- Transactions List Table -->
	<div>
		<div class="mb-1 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Transaksi Di Bawah Budget Ini
		</div>
		<DrawerTransactionTable currency="IDR" />
	</div>
	<!-- Action Toolbar -->
	<div class="space-y-2 border-t border-[#EAEAEA] pt-3 text-xs">
		{#if deleteError}
			<div class="rounded-md border border-[#FDEBEC] bg-[#FDF2F2] p-2.5 text-xs text-[#9F2F2D]">
				{deleteError}
			</div>
		{/if}

		<div class="flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={handleEdit}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8]"
			>
				<PencilSimple class="size-3.5" weight="bold" />
				<span>Edit Pagu</span>
			</button>

			<button
				type="button"
				onclick={() => (showDeleteConfirm = true)}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#9F2F2D] transition-colors hover:bg-[#FDF2F2]"
			>
				<Trash class="size-3.5" weight="bold" />
				<span>Hapus</span>
			</button>
		</div>

		<!-- Inline Delete Confirmation -->
		{#if showDeleteConfirm}
			<div class="rounded-lg border border-[#FDEBEC] bg-[#FDF2F2] p-3">
				<p class="text-xs font-medium text-[#9F2F2D]">
					Yakin ingin menghapus pagu anggaran "{budget.budgetName}"?
				</p>
				<p class="mt-0.5 text-[11px] text-[#787774]">
					Transaksi yang sudah tercatat akan tetap tersimpan di buku besar.
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
						{isDeleting ? 'Menghapus...' : 'Ya, Hapus Pagu'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
