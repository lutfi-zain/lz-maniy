<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import { resolveGoalLifecycle } from '$lib/utils/lifecycle';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import X from 'phosphor-svelte/lib/X';
	import Plus from 'phosphor-svelte/lib/Plus';
	import Check from 'phosphor-svelte/lib/Check';
	import { goalFormStore } from '$lib/stores/goal-form.svelte';
	import type { GoalSnapshot } from '$lib/types/account-detail';

	let { goal }: { goal: GoalSnapshot } = $props();

	let fetchedGoal = $state<GoalSnapshot | null>(null);

	$effect(() => {
		fetchedGoal = null;
		reedrichStore
			.fetchGoalById(goal.goalId)
			.then((fresh) => {
				fetchedGoal = fresh;
			})
			.catch((err) => {
				console.warn('Gagal memuat detail goal dari server:', err);
			});
	});

	const currentGoal = $derived(fetchedGoal ?? goal);

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let showLinkWallet = $state(false);
	let linkWalletId = $state('');
	let isLinking = $state(false);
	let actionError = $state<string | null>(null);
	const p = $derived(Math.round(currentGoal.progressPercentage || 0));
	const linked = $derived(currentGoal.linkedWalletsBreakdown ?? []);
	const lifecycle = $derived(resolveGoalLifecycle(currentGoal));
	const availableWalletsToLink = $derived(
		reedrichStore.allWallets.filter(
			(w) => !linked.some((lw) => lw.walletId === w.walletId)
		)
	);

	function openWallet(walletId: string) {
		const wallet = reedrichStore.allWallets.find((w) => w.walletId === walletId);
		if (!wallet) return;
		reedrichStore.openDrawer({
			type: 'wallet',
			title: wallet.walletName,
			subtitle: `${wallet.institution} · Tipe: ${wallet.type} · Mata Uang: ${wallet.currency}`,
			badge:
				wallet.isLocked === 1
					? i18nStore.locale === 'id'
						? 'DOMPET TERKUNCI'
						: 'COMMITTED ACCOUNT'
					: i18nStore.locale === 'id'
						? 'DOMPET SPENDABLE'
						: 'SPENDABLE ACCOUNT',
			data: { wallet }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: wallet.walletId, limit: 50 });
	}

	function handleEdit() {
		goalFormStore.openEditWithHydration(currentGoal.goalId, currentGoal);
	}

	async function handleDelete() {
		isDeleting = true;
		actionError = null;
		try {
			await reedrichStore.deleteGoal(currentGoal.goalId);
			reedrichStore.closeDrawer();
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal menghapus target';
			isDeleting = false;
		}
	}

	async function handleUnlinkWallet(walletId: string) {
		actionError = null;
		try {
			await reedrichStore.unlinkGoalWallet(currentGoal.goalId, walletId);
			const fresh = await reedrichStore.fetchGoalById(currentGoal.goalId);
			fetchedGoal = fresh;
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal memutuskan dompet dari target';
		}
	}

	async function handleLinkWallet() {
		if (!linkWalletId || isLinking) return;
		isLinking = true;
		actionError = null;
		try {
			await reedrichStore.linkGoalWallet(currentGoal.goalId, linkWalletId);
			linkWalletId = '';
			showLinkWallet = false;
			const fresh = await reedrichStore.fetchGoalById(currentGoal.goalId);
			fetchedGoal = fresh;
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal menghubungkan dompet';
		} finally {
			isLinking = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Target Sasaran
			</span>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(currentGoal.targetAmount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Terkumpul Saat Ini
			</span>
			<span class="font-mono text-base font-semibold text-[#346538]">
				{fmtIDR(currentGoal.currentAmount)}
			</span>
		</div>
	</div>

	<!-- Progress Track -->
	<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5">
		<div class="mb-2 flex items-center justify-between text-xs">
			<span class="text-[#787774]">Pencapaian Target</span>
			<span class="font-mono font-semibold">{p}%</span>
		</div>
		<div class="h-2 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
			<div
				class="h-full {lifecycle.status === 'completed'
					? 'bg-[#346538]'
					: lifecycle.status === 'overdue'
						? 'bg-[#9F2F2D]'
						: 'bg-[#111111]'} transition-all"
				style="width: {Math.min(100, p)}%"
			></div>
		</div>
	</div>

	<!-- Deadline & Pacing Information Card -->
	<div class="space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-4 text-xs">
		<div class="flex items-center justify-between">
			<span class="text-[#787774]">Status Target</span>
			<span
				class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase {lifecycle.status ===
				'completed'
					? 'bg-[#EDF3EC] text-[#346538]'
					: lifecycle.status === 'overdue'
						? 'bg-[#FDEBEC] text-[#9F2F2D]'
						: 'bg-[#F0EFEC] text-[#111111]'}"
			>
				{lifecycle.status === 'completed'
					? '✓ TERCAPAI'
					: lifecycle.status === 'overdue'
						? '⚠️ LEWAT TENGGAT'
						: lifecycle.status === 'long_term'
							? 'JANGKA PANJANG'
							: 'BERJALAN'}
			</span>
		</div>

		<div class="flex items-center justify-between border-t border-[#EAEAEA] pt-2.5">
			<span class="text-[#787774]">Tenggat Tanggal</span>
			<span class="font-medium text-[#111111]">
				{currentGoal.targetDate ? dFmt(currentGoal.targetDate) : 'Jangka Panjang (Tanpa Tenggat)'}
				{#if lifecycle.isOverdue}
					<span class="ml-1 text-[11px] font-semibold text-[#9F2F2D]"
						>({lifecycle.overdueDays} hari lewat)</span
					>
				{:else if lifecycle.daysRemaining !== null && !lifecycle.isCompleted}
					<span class="ml-1 text-[11px] text-[#787774]"
						>({lifecycle.daysRemaining} hari tersisa)</span
					>
				{/if}
			</span>
		</div>

		{#if currentGoal.pacing?.requiredDailySavings || currentGoal.pacing?.requiredMonthlySavings}
			<div class="grid grid-cols-2 gap-2 border-t border-[#EAEAEA] pt-2.5">
				{#if currentGoal.pacing?.requiredDailySavings}
					<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2">
						<span class="block text-[10px] text-[#787774] uppercase">Simpan / Hari</span>
						<span class="font-mono text-xs font-semibold text-[#111111]">
							{fmtIDR(currentGoal.pacing.requiredDailySavings)}
						</span>
					</div>
				{/if}
				{#if currentGoal.pacing?.requiredMonthlySavings}
					<div class="rounded border border-[#EAEAEA] bg-[#F9F9F8] p-2">
						<span class="block text-[10px] text-[#787774] uppercase">Simpan / Bulan</span>
						<span class="font-mono text-xs font-semibold text-[#111111]">
							{fmtIDR(currentGoal.pacing.requiredMonthlySavings)}
						</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Target Notes Card -->
	{#if currentGoal.notes}
		<div class="rounded-lg border border-[#EAEAEA] bg-white p-3.5 text-xs">
			<span class="mb-1 block text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Catatan Target
			</span>
			<p class="leading-relaxed whitespace-pre-wrap text-[#111111]">{currentGoal.notes}</p>
		</div>
	{/if}

	<!-- Linked Wallets Detail -->
	<div>
		<div class="mb-2 flex items-center justify-between">
			<span class="text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				{t('planning.goals.linkedAccounts')} ({linked.length})
			</span>
			{#if availableWalletsToLink.length > 0}
				<button
					type="button"
					onclick={() => (showLinkWallet = !showLinkWallet)}
					class="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#111111] hover:underline"
				>
					<Plus class="size-3" weight="bold" />
					<span>Hubungkan Dompet</span>
				</button>
			{/if}
		</div>

		{#if showLinkWallet}
			<div class="mb-3 space-y-2 rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
				<span class="block text-[11px] font-medium text-[#111111]">Pilih Rekening untuk Dihubungkan</span>
				<div class="flex items-center gap-2">
					<select
						bind:value={linkWalletId}
						class="flex-1 rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
					>
						<option value="">Pilih Dompet...</option>
						{#each availableWalletsToLink as w (w.walletId)}
							<option value={w.walletId}>{w.walletName} ({fmtIDR(w.balance)})</option>
						{/each}
					</select>
					<button
						type="button"
						onclick={handleLinkWallet}
						disabled={!linkWalletId || isLinking}
						class="cursor-pointer rounded bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLinking ? 'Menyimpan...' : 'Hubungkan'}
					</button>
				</div>
			</div>
		{/if}

		{#if linked.length > 0}
			<p class="mb-3 text-xs text-[#787774]">
				{t('planning.goals.derivedNotice')}
			</p>
			<div class="space-y-2">
				{#each linked as lw (lw.walletId)}
					<div
						class="flex items-center justify-between rounded-lg border border-[#EAEAEA] bg-white p-3 transition-all hover:border-[#C8C6BF]"
					>
						<button
							type="button"
							class="flex-1 cursor-pointer text-left"
							onclick={() => openWallet(lw.walletId)}
						>
							<div class="text-xs font-semibold text-[#111111]">{lw.walletName}</div>
							<div class="text-[11px] text-[#787774]">
								{lw.currency}
								{lw.usedPeg ? '· Kurs live peg' : '· Saldo riil IDR'}
							</div>
						</button>

						<div class="flex items-center gap-3">
							<div class="text-right">
								<div class="font-mono text-xs font-semibold text-[#111111]">
									{#if lw.currency !== 'IDR'}
										<span class="text-[#787774]">{fmtCurrency(lw.balance, lw.currency)} ≈ </span>
									{/if}
									<span>{fmtIDR(lw.convertedAmount)}</span>
								</div>
								<div class="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#787774]">
									<ArrowRight class="size-2.5" weight="bold" />
									<span>Buka dompet</span>
								</div>
							</div>

							<!-- Unlink button -->
							<button
								type="button"
								onclick={() => handleUnlinkWallet(lw.walletId)}
								title="Putuskan dompet dari target ini"
								class="cursor-pointer rounded p-1 text-[#787774] hover:bg-[#FDF2F2] hover:text-[#9F2F2D]"
							>
								<X class="size-3.5" weight="bold" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-[#EAEAEA] p-4 text-center text-xs text-[#787774]">
				Belum ada dompet yang terhubung ke target ini.
			</div>
		{/if}
	</div>

	<!-- Action Toolbar -->
	<div class="space-y-3 border-t border-[#EAEAEA] pt-3 text-xs">
		{#if actionError}
			<div class="rounded-md border border-[#FDEBEC] bg-[#FDF2F2] p-2.5 text-xs text-[#9F2F2D]">
				{actionError}
			</div>
		{/if}

		<div class="flex items-center justify-end gap-2">
			<button
				type="button"
				onclick={handleEdit}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8]"
			>
				<PencilSimple class="size-3.5" weight="bold" />
				<span>{t('common.edit')}</span>
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
			<div class="rounded-lg border border-[#FDEBEC] bg-[#FDF2F2] p-3 text-xs text-[#9F2F2D]">
				<p class="font-medium">Hapus target "{currentGoal.goalName}"?</p>
				<p class="mt-1 text-[11px] text-[#787774]">
					Saldo dompet yang terhubung tidak akan terhapus, hanya asosiasi target yang dihapus.
				</p>
				<div class="mt-2.5 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => (showDeleteConfirm = false)}
						class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#787774]"
					>
						{t('common.cancel')}
					</button>
					<button
						type="button"
						onclick={handleDelete}
						disabled={isDeleting}
						class="flex cursor-pointer items-center gap-1 rounded bg-[#9F2F2D] px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
					>
						<Trash class="size-3" weight="bold" />
						<span>{isDeleting ? t('common.deleting') : t('common.delete')}</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
