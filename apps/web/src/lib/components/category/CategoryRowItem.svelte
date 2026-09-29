<script lang="ts">
	import { fmtIDR } from '$lib/utils/currency';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import Tag from 'phosphor-svelte/lib/Tag';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import { categoryFormStore } from '$lib/stores/category-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import type { CategoryMetricItem } from '$lib/utils/category-metrics';

	interface Props {
		item: CategoryMetricItem;
	}

	let { item }: Props = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	const isIncome = $derived(item.category.categoryType === 'income');
	const isProtected = $derived(item.category.categoryName === 'Adjustment');

	function handleRowClick(e: MouseEvent) {
		// Prevent opening drawer if user clicked action buttons
		const target = e.target as HTMLElement;
		if (target.closest('button')) return;

		reedrichStore.openDrawer({
			type: 'category',
			title: item.category.categoryName,
			subtitle: `${isIncome ? (i18nStore.locale === 'id' ? 'Pemasukan' : 'Income') : (i18nStore.locale === 'id' ? 'Pengeluaran' : 'Expense')} · ${item.transactionCount} ${i18nStore.locale === 'id' ? 'transaksi' : 'transactions'}`,
			badge: isProtected ? (i18nStore.locale === 'id' ? 'SISTEM' : 'SYSTEM') : (i18nStore.locale === 'id' ? 'KATEGORI' : 'CATEGORY'),
			data: {
				item: {
					categoryName: item.category.categoryName,
					amount: item.totalAmountIDR,
					percentage: item.percentageOfTotal,
					transactionCount: item.transactionCount
				}
			}
		});

		reedrichStore.fetchTransactionsForDrawer({
			categoryId: item.category.categoryId,
			startDate: dateFilterStore.startDate,
			endDate: dateFilterStore.endDate,
			limit: 50
		});
	}

	function handleEdit(e: MouseEvent) {
		e.stopPropagation();
		categoryFormStore.openEdit(item.category);
	}

	function promptDelete(e: MouseEvent) {
		e.stopPropagation();
		if (isProtected) return;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (isProtected || isDeleting) return;
		isDeleting = true;
		deleteError = null;

		try {
			await reedrichStore.deleteCategory(item.category.categoryId);
			showDeleteConfirm = false;
		} catch (err: unknown) {
			deleteError = err instanceof Error ? err.message : 'Gagal menghapus kategori';
			isDeleting = false;
		}
	}
</script>

<!-- Category Row Container -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={handleRowClick}
	class="group flex cursor-pointer flex-wrap items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[#FBFBFA]"
>
	<!-- Left: Icon & Info -->
	<div class="flex items-center gap-3 min-w-0">
		<div
			class="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#EAEAEA] bg-[#F9F9F8] text-[#787774] transition-colors group-hover:border-[#111111] group-hover:text-[#111111]"
		>
			{#if item.category.categoryIcon}
				<span class="text-sm">{item.category.categoryIcon}</span>
			{:else}
				<Tag class="size-4" weight="bold" />
			{/if}
		</div>

		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<span class="truncate text-xs font-semibold text-[#111111]" title={item.category.categoryName}>
					{item.category.categoryName}
				</span>
				{#if isProtected}
					<span class="rounded bg-[#FBF3DB] px-1.5 py-0.2 font-mono text-[9px] font-semibold text-[#956400]">
						Protected
					</span>
				{/if}
				{#if item.linkedBudget}
					<span
						class="hidden rounded bg-[#EFEFED] px-1.5 py-0.2 font-mono text-[9px] text-[#787774] sm:inline-block"
						title="Linked Budget"
					>
						{t('planning.categories.linkedBudget', { name: item.linkedBudget.budgetName })}
					</span>
				{/if}
			</div>

			<div class="mt-0.5 flex items-center gap-2 text-[11px] text-[#787774]">
				<span>{item.transactionCount} {i18nStore.locale === 'id' ? 'mutasi' : 'txns'}</span>
				{#if item.percentageOfTotal > 0}
					<span>·</span>
					<span class="font-mono text-[10px]">{item.percentageOfTotal.toFixed(1)}% {t('planning.categories.shareOfPeriod')}</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Center & Right: Progress Bar, Nominal & Action Buttons -->
	<div class="flex items-center gap-4">
		<!-- Micro Allocation Bar (Desktop only) -->
		{#if item.percentageOfTotal > 0}
			<div class="hidden items-center gap-1.5 md:flex">
				<div class="h-1.5 w-24 overflow-hidden rounded-full bg-[#F0EFEC] lg:w-32">
					<div
						class="h-full rounded-full transition-all {isIncome ? 'bg-[#346538]' : 'bg-[#111111]'}"
						style="width: {Math.min(100, Math.max(2, item.percentageOfTotal))}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Nominal in Monospace -->
		<div class="text-right">
			<span
				class="block font-mono text-xs font-semibold tabular-nums {isIncome
					? 'text-[#346538]'
					: item.totalAmountIDR > 0
						? 'text-[#111111]'
						: 'text-[#787774]'}"
			>
				{isIncome && item.totalAmountIDR > 0 ? '+' : ''}{fmtIDR(item.totalAmountIDR)}
			</span>
		</div>

		<!-- Action Toolbar -->
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={handleEdit}
				class="cursor-pointer rounded p-1.5 text-[#787774] transition-colors hover:bg-[#EFEFED] hover:text-[#111111]"
				title="Ubah Kategori"
			>
				<PencilSimple class="size-3.5" weight="bold" />
			</button>

			{#if !isProtected}
				<button
					type="button"
					onclick={promptDelete}
					class="cursor-pointer rounded p-1.5 text-[#787774] transition-colors hover:bg-[#FDEBEC] hover:text-[#9F2F2D]"
					title="Hapus Kategori"
				>
					<Trash class="size-3.5" weight="bold" />
				</button>
			{/if}
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div
		class="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-sm rounded-lg border border-[#EAEAEA] bg-white p-5 shadow-xl">
			<div class="flex items-center gap-2 text-[#9F2F2D]">
				<WarningCircle class="size-5" weight="bold" />
				<h3 class="text-sm font-semibold text-[#111111]">Hapus Kategori</h3>
			</div>

			<p class="mt-2 text-xs leading-relaxed text-[#787774]">
				Apakah Anda yakin ingin menghapus kategori <strong class="text-[#111111]">{item.category.categoryName}</strong>?
				{#if item.transactionCount > 0}
					<br /><br />
					<span class="rounded bg-[#FDEBEC] px-1.5 py-0.5 text-[11px] font-medium text-[#9F2F2D]">
						Perhatian: Kategori ini memiliki {item.transactionCount} mutasi terkait.
					</span>
				{/if}
			</p>

			{#if deleteError}
				<div class="mt-3 rounded border border-[#FDEBEC] bg-[#FDF2F2] p-2 text-xs text-[#9F2F2D]">
					{deleteError}
				</div>
			{/if}

			<div class="mt-4 flex items-center justify-end gap-2 text-xs">
				<button
					type="button"
					onclick={() => (showDeleteConfirm = false)}
					disabled={isDeleting}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-3 py-1.5 font-medium text-[#787774] transition-colors hover:bg-[#F9F9F8] disabled:opacity-50"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={confirmDelete}
					disabled={isDeleting}
					class="cursor-pointer rounded bg-[#9F2F2D] px-3 py-1.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{isDeleting ? 'Menghapus...' : 'Hapus Kategori'}
				</button>
			</div>
		</div>
	</div>
{/if}
