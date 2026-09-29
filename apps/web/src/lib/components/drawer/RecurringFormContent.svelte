<script lang="ts">
	import { recurringFormStore } from '$lib/stores/recurring-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import SingleDatePicker from '$lib/components/ui/SingleDatePicker.svelte';
	import Check from 'phosphor-svelte/lib/Check';

	let isSubmitting = $state(false);
	let localError = $state<string | null>(null);

	const mode = $derived(recurringFormStore.mode);
	const isValid = $derived(recurringFormStore.isValid);
	const existingTemplate = $derived(recurringFormStore.existingTemplate);
	const allWallets = $derived(reedrichStore.allWallets);
	const categories = $derived(reedrichStore.categories);

	const availableTargetWallets = $derived(
		allWallets.filter((w) => w.walletId !== recurringFormStore.walletId)
	);

	const frequencies = [
		{ value: 'daily', label: 'Harian' },
		{ value: 'weekly', label: 'Mingguan' },
		{ value: 'monthly', label: 'Bulanan' },
		{ value: 'yearly', label: 'Tahunan' }
	] as const;

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		localError = null;

		try {
			if (mode === 'create') {
				await reedrichStore.createRecurringTemplate({
					name: recurringFormStore.name.trim(),
					walletId: recurringFormStore.walletId,
					targetWalletId:
						recurringFormStore.type === 'transfer'
							? recurringFormStore.targetWalletId || null
							: null,
					categoryId: recurringFormStore.categoryId || null,
					amount: recurringFormStore.amount ?? 0,
					adminFee: recurringFormStore.adminFee,
					type: recurringFormStore.type,
					frequency: recurringFormStore.frequency,
					interval: recurringFormStore.interval,
					startDate: recurringFormStore.startDate,
					endDate: recurringFormStore.endDate || null,
					notes: recurringFormStore.notes.trim() || null,
					isActive: recurringFormStore.isActive
				});
			} else if (existingTemplate) {
				await reedrichStore.updateRecurringTemplate(existingTemplate.templateId, {
					name: recurringFormStore.name.trim(),
					walletId: recurringFormStore.walletId,
					categoryId: recurringFormStore.categoryId || null,
					amount: recurringFormStore.amount ?? 0,
					adminFee: recurringFormStore.adminFee,
					type: recurringFormStore.type,
					frequency: recurringFormStore.frequency,
					interval: recurringFormStore.interval,
					endDate: recurringFormStore.endDate || null,
					notes: recurringFormStore.notes.trim() || null,
					isActive: recurringFormStore.isActive
				});
			}
			recurringFormStore.close();
		} catch (err: unknown) {
			localError = err instanceof Error ? err.message : 'Gagal menyimpan tagihan rutin';
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
		<label for="rec-name" class="mb-1 block font-medium text-[#111111]">
			{t('forms.recurring.nameLabel')} <span class="text-[#9F2F2D]">*</span>
		</label>
		<input
			id="rec-name"
			type="text"
			required
			bind:value={recurringFormStore.name}
			placeholder="Contoh: Gaji Bulanan, Sewa Rumah, Listrik PLN, Spotify"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
	</div>

	<!-- Type Switcher -->
	<div>
		<label for="rec-type" class="mb-1 block font-medium text-[#111111]"> {t('common.type')} </label>
		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				onclick={() => (recurringFormStore.type = 'expense')}
				class="cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-all {recurringFormStore.type ===
				'expense'
					? 'border-[#111111] bg-[#111111] text-white'
					: 'border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#F9F9F8]'}"
			>
				{t('forms.transaction.typeExpense')}
			</button>
			<button
				type="button"
				onclick={() => (recurringFormStore.type = 'income')}
				class="cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-all {recurringFormStore.type ===
				'income'
					? 'border-[#111111] bg-[#111111] text-white'
					: 'border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#F9F9F8]'}"
			>
				{t('forms.transaction.typeIncome')}
			</button>
			<button
				type="button"
				onclick={() => (recurringFormStore.type = 'transfer')}
				class="cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-all {recurringFormStore.type ===
				'transfer'
					? 'border-[#111111] bg-[#111111] text-white'
					: 'border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#F9F9F8]'}"
			>
				{t('forms.transaction.typeTransfer')}
			</button>
		</div>
	</div>

	<!-- Source Wallet -->
	<div>
		<label for="rec-wallet" class="mb-1 block font-medium text-[#111111]">
			{recurringFormStore.type === 'transfer' ? t('forms.transaction.sourceAccount') : t('common.account')} <span class="text-[#9F2F2D]">*</span>
		</label>
		<select
			id="rec-wallet"
			bind:value={recurringFormStore.walletId}
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		>
			<option value="">Pilih dompet...</option>
			{#each allWallets as w (w.walletId)}
				<option value={w.walletId}>{w.walletName} ({w.institution})</option>
			{/each}
		</select>
	</div>

	<!-- Target Wallet (for transfer) -->
	{#if recurringFormStore.type === 'transfer'}
		<div>
			<label for="rec-target-wallet" class="mb-1 block font-medium text-[#111111]">
				{t('forms.transaction.targetAccount')} <span class="text-[#9F2F2D]">*</span>
			</label>
			<select
				id="rec-target-wallet"
				bind:value={recurringFormStore.targetWalletId}
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			>
				<option value="">Pilih dompet tujuan...</option>
				{#each availableTargetWallets as w (w.walletId)}
					<option value={w.walletId}>{w.walletName} ({w.institution})</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Category -->
	{#if recurringFormStore.type !== 'transfer'}
		<div>
			<label for="rec-cat" class="mb-1 block font-medium text-[#111111]"> Kategori </label>
			<select
				id="rec-cat"
				bind:value={recurringFormStore.categoryId}
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			>
				<option value="">Pilih kategori (opsional)...</option>
				{#each categories as c (c.categoryId)}
					<option value={c.categoryId}>{c.categoryIcon || '🏷️'} {c.categoryName}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Amount & Admin Fee -->
	<div class="grid grid-cols-3 gap-3">
		<div class="col-span-2">
			<label for="rec-amount" class="mb-1 block font-medium text-[#111111]">
				Nominal (IDR) <span class="text-[#9F2F2D]">*</span>
			</label>
			<input
				id="rec-amount"
				type="number"
				required
				min="1"
				step="any"
				bind:value={recurringFormStore.amount}
				placeholder="Contoh: 150000"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>

		<div>
			<label for="rec-fee" class="mb-1 block font-medium text-[#111111]"> Biaya Admin </label>
			<input
				id="rec-fee"
				type="number"
				min="0"
				step="any"
				bind:value={recurringFormStore.adminFee}
				placeholder="0"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Frequency & Interval -->
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="rec-freq" class="mb-1 block font-medium text-[#111111]"> Frekuensi </label>
			<select
				id="rec-freq"
				bind:value={recurringFormStore.frequency}
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			>
				{#each frequencies as f (f.value)}
					<option value={f.value}>{f.label}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="rec-interval" class="mb-1 block font-medium text-[#111111]">
				Interval Siklus
			</label>
			<input
				id="rec-interval"
				type="number"
				min="1"
				bind:value={recurringFormStore.interval}
				placeholder="1"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Start Date & End Date -->
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="rec-start" class="mb-1 block font-medium text-[#111111]">
				Tanggal Mulai <span class="text-[#9F2F2D]">*</span>
			</label>
			<SingleDatePicker
				bind:value={recurringFormStore.startDate}
				placeholder="Pilih tanggal mulai..."
			/>
		</div>

		<div>
			<label for="rec-end" class="mb-1 block font-medium text-[#111111]">
				Berakhir Pada (Opsional)
			</label>
			<SingleDatePicker
				bind:value={recurringFormStore.endDate}
				placeholder="Tidak berakhir..."
			/>
		</div>
	</div>

	<!-- Active Toggle -->
	<div class="rounded-lg border border-[#EAEAEA] bg-[#FDFCFB] p-3">
		<label class="flex cursor-pointer items-start gap-2.5">
			<input
				type="checkbox"
				bind:checked={recurringFormStore.isActive}
				class="mt-0.5 size-4 rounded border-[#EAEAEA] text-[#111111] focus:ring-0"
			/>
			<div>
				<span class="block font-medium text-[#111111]">Status Aktif</span>
				<span class="block text-[11px] text-[#787774]">
					Tagihan aktif akan diproyeksikan secara otomatis pada jadwal perencanaan buku besar.
				</span>
			</div>
		</label>
	</div>

	<!-- Notes -->
	<div>
		<label for="rec-notes" class="mb-1 block font-medium text-[#111111]">
			Catatan Tambahan
		</label>
		<textarea
			id="rec-notes"
			rows="2"
			bind:value={recurringFormStore.notes}
			placeholder="Catatan mengenai tagihan ini..."
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		></textarea>
	</div>

	<!-- Action Buttons -->
	<div class="mt-2 flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => recurringFormStore.close()}
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
			<span>{isSubmitting ? t('common.saving') : mode === 'edit' ? t('forms.recurring.submitEdit') : t('forms.recurring.submitCreate')}</span>
		</button>
	</div>
</form>
