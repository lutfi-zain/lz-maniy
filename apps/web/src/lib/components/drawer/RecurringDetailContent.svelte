<script lang="ts">
	import { fmtCurrency, fmtIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import { t } from '$lib/i18n/index.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { recurringFormStore } from '$lib/stores/recurring-form.svelte';
	import type { RecurringTemplate } from '$lib/types/account-detail';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import CheckCircle from 'phosphor-svelte/lib/CheckCircle';

	let { template }: { template: RecurringTemplate } = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let isApplying = $state(false);
	let actionError = $state<string | null>(null);
	let actionSuccess = $state<string | null>(null);

	const wallet = $derived(
		reedrichStore.allWallets.find((w) => w.walletId === template.templateWalletId)
	);
	const targetWallet = $derived(
		template.templateTargetWalletId
			? reedrichStore.allWallets.find((w) => w.walletId === template.templateTargetWalletId)
			: null
	);
	const category = $derived(
		template.templateCategoryId
			? reedrichStore.categories.find((c) => c.categoryId === template.templateCategoryId)
			: null
	);

	const freqLabels: Record<string, string> = {
		daily: 'Harian',
		weekly: 'Mingguan',
		monthly: 'Bulanan',
		yearly: 'Tahunan'
	};

	function handleEdit() {
		recurringFormStore.openEdit(template);
	}

	async function handleDelete() {
		isDeleting = true;
		actionError = null;
		try {
			await reedrichStore.deleteRecurringTemplate(template.templateId);
			reedrichStore.closeDrawer();
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal menghapus template';
			isDeleting = false;
		}
	}

	async function handleApply() {
		isApplying = true;
		actionError = null;
		actionSuccess = null;
		try {
			await reedrichStore.applyRecurringTemplate(template.templateId);
			actionSuccess = 'Transaksi tagihan berhasil diterapkan dan dibukukan ke buku besar!';
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal menerapkan tagihan';
		} finally {
			isApplying = false;
		}
	}
</script>

<div class="space-y-4 text-xs">
	{#if actionError}
		<div class="rounded-md border border-[#FDEBEC] bg-[#FDF2F2] p-2.5 text-xs text-[#9F2F2D]">
			{actionError}
		</div>
	{/if}

	{#if actionSuccess}
		<div class="rounded-md border border-[#EDF3EC] bg-[#F3FAF2] p-2.5 text-xs text-[#346538]">
			{actionSuccess}
		</div>
	{/if}

	<!-- Header Stat Card -->
	<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-4">
		<div class="flex items-center justify-between">
			<span class="text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Nominal Per Periode
			</span>
			<span
				class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {template.templateType ===
				'income'
					? 'bg-[#EDF3EC] text-[#346538]'
					: 'bg-[#EFEFED] text-[#111111]'}"
			>
				{template.templateType}
			</span>
		</div>
		<div class="mt-1 font-mono text-2xl font-bold text-[#111111]">
			{fmtIDR(template.templateAmount)}
		</div>
		<div class="mt-1 flex items-center gap-2 text-[11px] text-[#787774]">
			<span>Frekuensi: {freqLabels[template.templateFrequency] || template.templateFrequency}</span>
			{#if template.templateInterval && template.templateInterval > 1}
				<span>(Setiap {template.templateInterval} siklus)</span>
			{/if}
		</div>
	</div>

	<!-- Schedule & Run Date -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Jadwal Eksekusi Berikutnya
			</span>
			<span class="font-mono text-sm font-semibold text-[#111111]">
				{template.templateNextRunDate ? dFmt(template.templateNextRunDate) : 'Sesuai Siklus'}
			</span>
		</div>

		<div class="rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Status Template
			</span>
			<span
				class="text-xs font-semibold {template.templateIsActive
					? 'text-[#346538]'
					: 'text-[#787774]'}"
			>
				{template.templateIsActive ? 'Aktif' : 'Nonaktif / Jeda'}
			</span>
		</div>
	</div>

	<!-- Associated Accounts -->
	<div class="space-y-2 rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3.5">
		<div class="text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			Account & Category Details
		</div>

		<div class="flex items-center justify-between border-b border-[#EAEAEA] py-1">
			<span class="text-[#787774]">{t('forms.transaction.sourceAccount')}</span>
			<span class="font-medium text-[#111111]"
				>{wallet?.walletName || template.templateWalletId}</span
			>
		</div>

		{#if targetWallet}
			<div class="flex items-center justify-between border-b border-[#EAEAEA] py-1">
				<span class="text-[#787774]">{t('forms.transaction.targetAccount')}</span>
				<span class="font-medium text-[#111111]">{targetWallet.walletName}</span>
			</div>
		{/if}

		{#if category}
			<div class="flex items-center justify-between border-b border-[#EAEAEA] py-1">
				<span class="text-[#787774]">{t('common.category')}</span>
				<span class="font-medium text-[#111111]"
					>{category.categoryIcon || '🏷️'} {category.categoryName}</span
				>
			</div>
		{/if}

		<div class="flex items-center justify-between py-1">
			<span class="text-[#787774]">{t('forms.recurring.startDateLabel')}</span>
			<span class="font-mono text-[#111111]">{dFmt(template.templateStartDate)}</span>
		</div>
	</div>

	{#if template.templateNotes}
		<div class="rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3">
			<span class="mb-1 block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Notes
			</span>
			<p class="text-xs text-[#111111]">{template.templateNotes}</p>
		</div>
	{/if}

	<!-- Action Toolbar -->
	<div class="space-y-2 border-t border-[#EAEAEA] pt-2">
		<div class="flex items-center gap-2">
			<!-- Apply button -->
			<button
				type="button"
				onclick={handleApply}
				disabled={isApplying || !template.templateIsActive}
				class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#111111] py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<CheckCircle class="size-3.5" weight="bold" />
				<span>{isApplying ? 'Menerapkan...' : 'Terapkan Sekarang'}</span>
			</button>

			<!-- Edit button -->
			<button
				type="button"
				onclick={handleEdit}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8]"
			>
				<PencilSimple class="size-3.5" weight="bold" />
				<span>Edit</span>
			</button>

			<!-- Delete button -->
			<button
				type="button"
				onclick={() => (showDeleteConfirm = true)}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs font-medium text-[#9F2F2D] transition-colors hover:bg-[#FDF2F2]"
			>
				<Trash class="size-3.5" weight="bold" />
				<span>Hapus</span>
			</button>
		</div>

		<!-- Inline Delete Confirmation -->
		{#if showDeleteConfirm}
			<div class="rounded-lg border border-[#FDEBEC] bg-[#FDF2F2] p-3">
				<p class="text-xs font-medium text-[#9F2F2D]">
					Yakin ingin menghapus tagihan rutin "{template.templateName}"?
				</p>
				<p class="mt-0.5 text-[11px] text-[#787774]">
					Transaksi yang sudah terealisasi sebelumnya tidak akan terhapus.
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
						{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
