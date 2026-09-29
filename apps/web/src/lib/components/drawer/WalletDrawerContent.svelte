<script lang="ts">
	import { fmtCurrency, fmtIDR } from '$lib/utils/currency';
	import { dFmtTime } from '$lib/utils/dates';
	import DrawerTransactionTable from './DrawerTransactionTable.svelte';
	import { walletFormStore } from '$lib/stores/wallet-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import type { WalletItem } from '$lib/types/account-detail';

	let { wallet }: { wallet: WalletItem } = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	const isLocked = $derived(wallet.isLocked === 1);
	const lt = $derived(wallet.lastTransaction);
	const canDelete = $derived(wallet.balance === 0);

	function handleEdit() {
		walletFormStore.openEdit(wallet);
	}

	async function handleDelete() {
		if (!canDelete) return;
		isDeleting = true;
		deleteError = null;
		try {
			await reedrichStore.deleteWallet(wallet.walletId);
			reedrichStore.closeDrawer();
		} catch (err: unknown) {
			deleteError = err instanceof Error ? err.message : 'Gagal menghapus dompet';
			isDeleting = false;
		}
	}

</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Saldo Saat Ini</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtCurrency(wallet.balance, wallet.currency)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Status Akses</span
			>
			<span class="text-xs font-semibold {isLocked ? 'text-[#956400]' : 'text-[#346538]'}">
				{isLocked ? 'Dana Cadangan / Terkunci' : 'Siap Dibelanjakan'}
			</span>
		</div>
	</div>

	<!-- Last Transaction preview -->
	{#if lt}
		<div class="rounded-lg border border-black/5 bg-[#F9F9F8] p-3 text-xs">
			<span class="mb-1 block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Transaksi Terakhir Tercatat
			</span>
			<div class="flex items-center justify-between gap-2">
				<div>
					<div class="font-medium text-[#111111]">{lt.description || lt.category}</div>
					<div class="text-[11px] text-[#787774]">{dFmtTime(lt.date)} · {lt.category}</div>
				</div>
				<div
					class="font-mono font-semibold {lt.direction === 'in'
						? 'text-[#346538]'
						: 'text-[#111111]'}"
				>
					{lt.direction === 'in' ? '+' : '−'}{fmtIDR(lt.amount)}
				</div>
			</div>
		</div>
	{/if}

	<!-- Transactions List Table -->
	<div>
		<div class="mb-1 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
			{t('accounts.historyTitle')}
		</div>
		<DrawerTransactionTable currency={wallet.currency} />
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
				<span>{t('accounts.editAccount')}</span>
			</button>

			<button
				type="button"
				onclick={() => (showDeleteConfirm = true)}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#9F2F2D] transition-colors hover:bg-[#FDF2F2]"
			>
				<Trash class="size-3.5" weight="bold" />
				<span>{t('common.delete')}</span>
			</button>
		</div>

		<!-- Inline Delete Confirmation -->
		{#if showDeleteConfirm}
			<div class="rounded-lg border border-[#FDEBEC] bg-[#FDF2F2] p-3">
				{#if !canDelete}
					<p class="text-xs font-medium text-[#9F2F2D]">
						{t('accounts.deleteZeroBalanceWarning')} ({fmtCurrency(wallet.balance, wallet.currency)})
					</p>
					<p class="mt-0.5 text-[11px] text-[#787774]">
						Pindahkan atau sesuaikan saldo menjadi 0 terlebih dahulu sebelum menghapus dompet ini.
					</p>
					<div class="mt-2.5 flex justify-end">
						<button
							type="button"
							onclick={() => (showDeleteConfirm = false)}
							class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs text-[#787774] hover:bg-[#F9F9F8]"
						>
							{t('common.close')}
						</button>
					</div>
				{:else}
					<p class="text-xs font-medium text-[#9F2F2D]">
						{i18nStore.locale === 'id' ? `Yakin ingin menghapus dompet "${wallet.walletName}"?` : `Are you sure you want to delete "${wallet.walletName}"?`}
					</p>
					<p class="mt-0.5 text-[11px] text-[#787774]">
						{i18nStore.locale === 'id' ? 'Tindakan ini permanen.' : 'This action is permanent and cannot be undone.'}
					</p>
					<div class="mt-2.5 flex items-center justify-end gap-2">
						<button
							type="button"
							onclick={() => (showDeleteConfirm = false)}
							class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs text-[#787774] hover:bg-[#F9F9F8]"
						>
							{t('common.cancel')}
						</button>
						<button
							type="button"
							onclick={handleDelete}
							disabled={isDeleting}
							class="cursor-pointer rounded-md bg-[#9F2F2D] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{isDeleting ? t('common.deleting') : t('common.yesDelete')}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
