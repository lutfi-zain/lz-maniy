<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Trash from 'phosphor-svelte/lib/Trash';
	import PlusCircle from 'phosphor-svelte/lib/PlusCircle';
	import X from 'phosphor-svelte/lib/X';
	import Check from 'phosphor-svelte/lib/Check';
	import { goalFormStore } from '$lib/stores/goal-form.svelte';
	import type { GoalSnapshot } from '$lib/types/account-detail';

	let { goal }: { goal: GoalSnapshot } = $props();

	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let showContribute = $state(false);
	let contributeAmount = $state<number | null>(null);
	let contributeWalletId = $state<string>('');
	let isContributing = $state(false);
	let actionError = $state<string | null>(null);
	let actionSuccess = $state<string | null>(null);

	const p = $derived(Math.round(goal.progressPercentage || 0));
	const linked = $derived(goal.linkedWalletsBreakdown ?? []);
	const allWallets = $derived(reedrichStore.allWallets);

	function openWallet(walletId: string) {
		const wallet = reedrichStore.allWallets.find((w) => w.walletId === walletId);
		if (!wallet) return;
		reedrichStore.openDrawer({
			type: 'wallet',
			title: wallet.walletName,
			subtitle: `${wallet.institution} · Tipe: ${wallet.type} · Mata Uang: ${wallet.currency}`,
			badge: wallet.isLocked === 1 ? 'DOMPET TERKUNCI' : 'DOMPET SPENDABLE',
			data: { wallet }
		});
		reedrichStore.fetchTransactionsForDrawer({ walletId: wallet.walletId, limit: 50 });
	}

	function handleEdit() {
		goalFormStore.openEdit(goal);
	}

	async function handleDelete() {
		isDeleting = true;
		actionError = null;
		try {
			await reedrichStore.deleteGoal(goal.goalId);
			reedrichStore.closeDrawer();
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal menghapus target';
			isDeleting = false;
		}
	}

	async function handleContribute(e: SubmitEvent) {
		e.preventDefault();
		if (!contributeAmount || contributeAmount <= 0 || isContributing) return;
		isContributing = true;
		actionError = null;
		actionSuccess = null;
		try {
			await reedrichStore.contributeToGoal(goal.goalId, {
				amount: contributeAmount,
				walletId: contributeWalletId || null
			});
			actionSuccess = `Berhasil menyetor ${fmtIDR(contributeAmount)} ke target!`;
			contributeAmount = null;
			showContribute = false;
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal menyetor dana ke target';
		} finally {
			isContributing = false;
		}
	}

	async function handleUnlinkWallet(walletId: string) {
		actionError = null;
		try {
			await reedrichStore.unlinkGoalWallet(goal.goalId, walletId);
		} catch (err: unknown) {
			actionError = err instanceof Error ? err.message : 'Gagal memutuskan dompet dari target';
		}
	}
</script>

<div class="space-y-4">
	<!-- Summary Stats Cards -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Target Sasaran</span
			>
			<span class="font-mono text-base font-semibold text-[#111111]">
				{fmtIDR(goal.targetAmount)}
			</span>
		</div>
		<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
			<span class="block text-[10px] font-medium tracking-wider text-[#787774] uppercase"
				>Terkumpul Saat Ini</span
			>
			<span class="font-mono text-base font-semibold text-[#346538]">
				{fmtIDR(goal.currentAmount)}
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
			<div class="h-full bg-[#111111]" style="width: {Math.min(100, p)}%"></div>
		</div>
	</div>

	<!-- Linked Wallets Detail -->
	{#if linked.length > 0}
		<div>
			<div class="mb-2 text-[10px] font-medium tracking-wider text-[#787774] uppercase">
				Dompet Terhubung (Derived Allocation)
			</div>
			<p class="mb-3 text-xs text-[#787774]">
				Nilai tabungan goal ini dikonsolidasikan otomatis secara live dari dompet di bawah ini:
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
		</div>
	{/if}
	<!-- Action Toolbar -->
	<div class="space-y-3 border-t border-[#EAEAEA] pt-3 text-xs">
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

		<div class="flex items-center justify-end gap-2">
			{#if !goal.isDerived}
				<button
					type="button"
					onclick={() => (showContribute = !showContribute)}
					class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#346538] transition-colors hover:bg-[#EDF3EC]"
				>
					<PlusCircle class="size-3.5" weight="bold" />
					<span>Setor Dana</span>
				</button>
			{/if}

			<button
				type="button"
				onclick={handleEdit}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8]"
			>
				<PencilSimple class="size-3.5" weight="bold" />
				<span>Edit Target</span>
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

		<!-- Contribute Inline Form -->
		{#if showContribute}
			<form onsubmit={handleContribute} class="rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3 space-y-2.5">
				<div class="font-medium text-[#111111]">Setor Tabungan ke "{goal.goalName}"</div>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="contrib-amt" class="mb-1 block text-[10px] text-[#787774]">Nominal (IDR) *</label>
						<input
							id="contrib-amt"
							type="number"
							required
							min="1"
							bind:value={contributeAmount}
							placeholder="Contoh: 500000"
							class="w-full rounded border border-[#EAEAEA] bg-white px-2.5 py-1.5 font-mono text-xs focus:border-[#111111] focus:outline-none"
						/>
					</div>
					<div>
						<label for="contrib-wallet" class="mb-1 block text-[10px] text-[#787774]">Dompet Sumber (Opsional)</label>
						<select
							id="contrib-wallet"
							bind:value={contributeWalletId}
							class="w-full rounded border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs focus:border-[#111111] focus:outline-none"
						>
							<option value="">Tanpa Dompet (Catat Saja)</option>
							{#each allWallets as w (w.walletId)}
								<option value={w.walletId}>{w.walletName} ({fmtIDR(w.balance)})</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="flex items-center justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (showContribute = false)}
						class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#787774]"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={!contributeAmount || contributeAmount <= 0 || isContributing}
						class="flex cursor-pointer items-center gap-1 rounded bg-[#111111] px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
					>
						<Check class="size-3" weight="bold" />
						<span>{isContributing ? 'Menyetor...' : 'Konfirmasi Setor'}</span>
					</button>
				</div>
			</form>
		{/if}

		<!-- Inline Delete Confirmation -->
		{#if showDeleteConfirm}
			<div class="rounded-lg border border-[#FDEBEC] bg-[#FDF2F2] p-3">
				<p class="text-xs font-medium text-[#9F2F2D]">
					Yakin ingin menghapus target tabungan "{goal.goalName}"?
				</p>
				<p class="mt-0.5 text-[11px] text-[#787774]">
					Saldo dan mutasi pada dompet yang terhubung tidak akan terhapus.
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
						{isDeleting ? 'Menghapus...' : 'Ya, Hapus Target'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
