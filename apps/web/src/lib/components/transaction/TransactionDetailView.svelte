<script lang="ts">
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency, getConvertedBalanceInIDR } from '$lib/utils/currency';
	import { dFmt, dFmtTime } from '$lib/utils/dates';
	import { t } from '$lib/i18n/index.svelte';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import type { TransactionRecord } from '$lib/types/account-detail';

	let { transaction }: { transaction: TransactionRecord } = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	const isIncome = $derived(transaction.transactionType === 'income');
	const isExpense = $derived(transaction.transactionType === 'expense');
	const isTransfer = $derived(transaction.transactionType === 'transfer');
	const isPlanned = $derived(transaction.transactionIsPlanned === 1);

	// Helpers to resolve names
	function getWallet(id: string | null | undefined) {
		if (!id) return null;
		return reedrichStore.allWallets.find((w) => w.walletId === id) ?? null;
	}

	function getCategoryName(id: string | null | undefined): string {
		if (!id) return 'Uncategorized';
		const c = reedrichStore.categories.find((cat) => cat.categoryId === id);
		return c?.categoryName || 'Kategori';
	}

	function getBudgetName(id: string | null | undefined): string | null {
		if (!id) return null;
		const b = reedrichStore.activeBudgets.find((bg) => bg.budgetId === id);
		return b?.budgetName || null;
	}

	const sourceWallet = $derived(getWallet(transaction.transactionWalletId));
	const targetWallet = $derived(getWallet(transaction.transactionTargetWalletId));
	const currency = $derived(sourceWallet?.currency || 'IDR');
	const amountIDR = $derived(getConvertedBalanceInIDR(transaction.transactionAmount, currency));

	async function handleDelete() {
		isDeleting = true;
		deleteError = null;
		try {
			await reedrichStore.deleteTransaction(transaction.transactionId);
			showDeleteConfirm = false;
			transactionFormStore.close();
		} catch (err: unknown) {
			deleteError = err instanceof Error ? err.message : 'Gagal menghapus transaksi.';
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="flex flex-col gap-5">
	<!-- Hero Nominal Card -->
	<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-5">
		<div class="flex items-center justify-between gap-3">
			<span
				class="rounded px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase {isIncome
					? 'bg-[#EDF3EC] text-[#346538]'
					: isExpense
						? 'bg-[#FDEBEC] text-[#9F2F2D]'
						: 'bg-[#E1F3FE] text-[#1F6C9F]'}"
			>
				{transaction.transactionType}
			</span>

			<span
				class="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase {isPlanned
					? 'bg-[#FBF3DB] text-[#956400]'
					: 'bg-[#F0EFEC] text-[#787774]'}"
			>
				{isPlanned ? 'Rencana (Planned)' : 'Terealisasi'}
			</span>
		</div>

		<!-- Big Amount -->
		<div class="mt-3">
			<div
				class="font-mono text-3xl font-semibold tracking-tight {isIncome
					? 'text-[#346538]'
					: 'text-[#111111]'}"
			>
				{isIncome ? '+' : '−'}{fmtIDR(amountIDR)}
			</div>
			{#if currency !== 'IDR'}
				<div class="mt-1 font-mono text-xs text-[#787774]">
					Nominal Asli: {fmtCurrency(transaction.transactionAmount, currency)}
				</div>
			{/if}
			{#if (transaction.transactionAdminFee ?? 0) > 0}
				<div class="mt-0.5 font-mono text-[11px] text-[#787774]">
					Biaya Admin: {fmtIDR(transaction.transactionAdminFee)}
				</div>
			{/if}
		</div>
	</div>

	<!-- Metadata Key-Value List -->
	<div class="divide-y divide-[#EAEAEA] rounded-lg border border-[#EAEAEA] bg-white text-xs">
		<!-- Deskripsi -->
		<div class="flex items-start justify-between gap-4 p-3.5">
			<span class="text-[#787774]">Deskripsi</span>
			<span class="text-right font-medium text-[#111111]">
				{transaction.transactionDescription || '(tanpa deskripsi)'}
			</span>
		</div>

		<!-- Tanggal Transaksi -->
		<div class="flex items-center justify-between gap-4 p-3.5">
			<span class="text-[#787774]">Tanggal</span>
			<span class="font-mono text-[#111111]">
				{dFmt(transaction.transactionDate)}
			</span>
		</div>

		<!-- Kategori -->
		{#if !isTransfer}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Kategori</span>
				<span class="rounded bg-[#F0EFEC] px-2 py-0.5 font-medium text-[#111111]">
					{getCategoryName(transaction.transactionCategoryId)}
				</span>
			</div>
		{/if}

		<!-- Wallet Routing -->
		{#if isTransfer}
			<div class="flex flex-col gap-2 p-3.5">
				<span class="text-[#787774]">Alur Transfer</span>
				<div class="flex items-center gap-2 font-medium text-[#111111]">
					<span class="rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1">
						{sourceWallet ? `${sourceWallet.walletName} (${sourceWallet.institution})` : 'Sumber'}
					</span>
					<ArrowRight class="size-3.5 text-[#787774]" weight="bold" />
					<span class="rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1">
						{targetWallet ? `${targetWallet.walletName} (${targetWallet.institution})` : 'Tujuan'}
					</span>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">{isIncome ? 'Ke Akun' : 'Dari Akun'}</span>
				<span class="font-medium text-[#111111]">
					{sourceWallet ? `${sourceWallet.walletName} (${sourceWallet.institution})` : '—'}
				</span>
			</div>
		{/if}

		<!-- Budget Linked -->
		{#if isExpense && getBudgetName(transaction.transactionBudgetId)}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Terhubung Budget</span>
				<span
					class="rounded bg-[#FBF3DB] px-2 py-0.5 font-mono text-[10px] font-medium text-[#956400]"
				>
					{getBudgetName(transaction.transactionBudgetId)}
				</span>
			</div>
		{/if}

		<!-- Asal Recurring Template -->
		{#if transaction.transactionTemplateId}
			{@const tpl = reedrichStore.recurringTemplates.find(
				(r) => r.templateId === transaction.transactionTemplateId
			)}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Asal Tagihan Rutin</span>
				<span
					class="rounded bg-[#E1F3FE] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#1F6C9F] uppercase"
				>
					{tpl ? tpl.templateName : 'Template Berulang'}
				</span>
			</div>
		{/if}

		<!-- Scheduled Occurrence Date -->
		{#if transaction.transactionOccurrenceDate}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Jadwal Rencana</span>
				<span class="font-mono text-[11px] text-[#111111]">
					{dFmt(transaction.transactionOccurrenceDate)}
				</span>
			</div>
		{/if}

		<!-- Realized Timestamp -->
		{#if transaction.transactionRealizedAt}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Terealisasi Pada</span>
				<span class="font-mono text-[11px] text-[#346538]">
					{dFmtTime(transaction.transactionRealizedAt)}
				</span>
			</div>
		{/if}

		<!-- Nominal Rencana Semula -->
		{#if transaction.transactionPlannedAmount !== null && transaction.transactionPlannedAmount !== undefined && transaction.transactionPlannedAmount !== transaction.transactionAmount}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Nominal Rencana Semula</span>
				<span class="font-mono text-[11px] text-[#787774]">
					{fmtCurrency(transaction.transactionPlannedAmount, currency)}
				</span>
			</div>
		{/if}

		<!-- ID & Timestamp Meta -->
		{#if transaction.transactionCreatedAt}
			<div class="flex items-center justify-between gap-4 p-3.5">
				<span class="text-[#787774]">Dibuat Pada</span>
				<span class="font-mono text-[11px] text-[#787774]">
					{dFmtTime(transaction.transactionCreatedAt)}
				</span>
			</div>
		{/if}
	</div>

	<!-- Action Bar (Edit & Hapus) -->
	<div class="mt-2 flex items-center justify-between gap-3 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => (showDeleteConfirm = true)}
			class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#FDEBEC] bg-white px-3 py-2 text-xs font-medium text-[#9F2F2D] transition-colors hover:bg-[#FDEBEC] active:scale-98"
		>
			<Trash class="size-3.5" weight="bold" />
			<span>{t('common.delete')}</span>
		</button>

		<button
			type="button"
			onclick={() => transactionFormStore.openEdit(transaction)}
			class="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#333333] active:scale-98"
		>
			<PencilSimple class="size-3.5" weight="bold" />
			<span>{t('common.edit')}</span>
		</button>
	</div>
</div>

<!-- Delete Confirmation Modal Overlay -->
{#if showDeleteConfirm}
	<div
		class="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-dialog-title"
	>
		<div
			class="shadow-minimal w-full max-w-[400px] rounded-lg border border-[#EAEAEA] bg-white p-5 transition-all"
		>
			<div class="flex items-center gap-2 text-[#9F2F2D]">
				<WarningCircle class="size-5" weight="bold" />
				<h3 id="delete-dialog-title" class="text-sm font-semibold text-[#111111]">
					{t('common.delete')}?
				</h3>
			</div>

			<p class="mt-2 text-xs leading-relaxed text-[#787774]">
				Transaksi <strong class="text-[#111111]"
					>"{transaction.transactionDescription || 'Tanpa deskripsi'}"</strong
				>
				sebesar <strong class="text-[#111111]">{fmtIDR(amountIDR)}</strong> akan dihapus permanen. Saldo
				akun akan disesuaikan secara otomatis.
			</p>

			{#if deleteError}
				<div class="mt-3 rounded border border-[#FDEBEC] bg-[#FDEBEC] p-2 text-xs text-[#9F2F2D]">
					{deleteError}
				</div>
			{/if}

			<div class="mt-5 flex items-center justify-end gap-2.5">
				<button
					type="button"
					onclick={() => (showDeleteConfirm = false)}
					disabled={isDeleting}
					class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#787774] transition-colors hover:bg-[#F9F9F8] disabled:opacity-50"
				>
					{t('common.cancel')}
				</button>

				<button
					type="button"
					onclick={handleDelete}
					disabled={isDeleting}
					class="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#9F2F2D] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#802524] disabled:opacity-50"
				>
					{#if isDeleting}
						<span
							class="size-3 animate-spin rounded-full border-2 border-white border-t-transparent"
						></span>
						<span>{t('common.deleting')}</span>
					{:else}
						<span>{t('common.yesDelete')}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
