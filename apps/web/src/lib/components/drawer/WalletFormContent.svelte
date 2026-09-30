<script lang="ts">
	import { walletFormStore } from '$lib/stores/wallet-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import Check from 'phosphor-svelte/lib/Check';

	let isSubmitting = $state(false);
	let localError = $state<string | null>(null);

	const mode = $derived(walletFormStore.mode);
	const isValid = $derived(walletFormStore.isValid);
	const existingWallet = $derived(walletFormStore.existingWallet);

	const walletTypes = [
		{ value: 'bank', label: 'Bank (Rekening)' },
		{ value: 'cash', label: 'Tunai (Cash)' },
		{ value: 'e-wallet', label: 'E-Wallet' },
		{ value: 'credit', label: 'Kartu Kredit' },
		{ value: 'crypto', label: 'Kripto' },
		{ value: 'investment', label: 'Investasi' }
	] as const;

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		localError = null;

		try {
			if (mode === 'create') {
				await reedrichStore.createWallet({
					name: walletFormStore.name.trim(),
					institution: walletFormStore.institution.trim() || 'General',
					type: walletFormStore.type,
					balance: walletFormStore.balance ?? 0,
					currency: walletFormStore.currency.trim().toUpperCase() || 'IDR',
					isLocked: walletFormStore.isLocked
				});
			} else if (existingWallet) {
				await reedrichStore.updateWallet(existingWallet.walletId, {
					name: walletFormStore.name.trim(),
					institution: walletFormStore.institution.trim() || 'General',
					type: walletFormStore.type,
					balance: walletFormStore.balance ?? 0,
					currency: walletFormStore.currency.trim().toUpperCase() || 'IDR',
					isLocked: walletFormStore.isLocked
				});
			}
			walletFormStore.close();
		} catch (err: unknown) {
			localError = err instanceof Error ? err.message : 'Gagal menyimpan dompet';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4 text-xs">
	{#if localError}
		<div class="rounded-md border border-[#FDEBEC] bg-[#FDF2F2] p-2.5 text-xs text-[#9F2F2D]">
			{localError}
		</div>
	{/if}

	<!-- Name -->
	<div>
		<label for="wallet-name" class="mb-1 block font-medium text-[#111111]">
			{t('forms.wallet.nameLabel')} <span class="text-[#9F2F2D]">*</span>
		</label>
		<input
			id="wallet-name"
			type="text"
			required
			bind:value={walletFormStore.name}
			placeholder="Contoh: BCA Utama, Jago Tabungan, Kas Tunai"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
	</div>

	<!-- Institution & Type -->
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="wallet-inst" class="mb-1 block font-medium text-[#111111]">
				Institusi / Platform
			</label>
			<input
				id="wallet-inst"
				type="text"
				bind:value={walletFormStore.institution}
				placeholder="Contoh: BCA, Mandiri, GoPay"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>

		<div>
			<label for="wallet-type" class="mb-1 block font-medium text-[#111111]"> Tipe Akun </label>
			<select
				id="wallet-type"
				bind:value={walletFormStore.type}
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			>
				{#each walletTypes as t (t.value)}
					<option value={t.value}>{t.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Balance & Currency -->
	<div class="grid grid-cols-3 gap-3">
		<div class="col-span-2">
			<label for="wallet-balance" class="mb-1 block font-medium text-[#111111]">
				{t('forms.wallet.balanceLabel')}
			</label>
			<input
				id="wallet-balance"
				type="number"
				step="any"
				bind:value={walletFormStore.balance}
				placeholder="0"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>

		<div>
			<label for="wallet-curr" class="mb-1 block font-medium text-[#111111]">
				{t('forms.wallet.currencyLabel')}
			</label>
			<input
				id="wallet-curr"
				type="text"
				maxlength="5"
				bind:value={walletFormStore.currency}
				placeholder="IDR"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] uppercase transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Is Locked Toggle -->
	<div class="rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3">
		<label class="flex cursor-pointer items-start gap-2.5">
			<input
				type="checkbox"
				bind:checked={walletFormStore.isLocked}
				class="mt-0.5 size-4 rounded border-[#EAEAEA] text-[#111111] focus:ring-0"
			/>
			<div>
				<span class="block font-medium text-[#111111]"
					>{i18nStore.locale === 'id'
						? 'Kunci sebagai Dana Cadangan (Locked)'
						: 'Lock as Committed / Reserve Capital'}</span
				>
				<span class="block text-[11px] text-[#787774]">
					{i18nStore.locale === 'id'
						? 'Saldo dompet ini tidak akan dihitung ke dalam Safe-to-Spend runway harian.'
						: 'Account balance will be excluded from daily spendable cash runway.'}
				</span>
			</div>
		</label>
	</div>

	<!-- Action Buttons -->
	<div class="mt-2 flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => walletFormStore.close()}
			class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-4 py-2 text-xs font-medium text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
		>
			{t('common.cancel')}
		</button>
		<button
			type="submit"
			disabled={!isValid || isSubmitting}
			class="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Check class="size-3.5" weight="bold" />
			<span
				>{isSubmitting
					? t('common.saving')
					: mode === 'edit'
						? t('forms.wallet.submitEdit')
						: t('forms.wallet.submitCreate')}</span
			>
		</button>
	</div>
</form>
