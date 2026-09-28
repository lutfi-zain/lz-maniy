<script lang="ts">
	import { goalFormStore } from '$lib/stores/goal-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import SingleDatePicker from '$lib/components/ui/SingleDatePicker.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import Check from 'phosphor-svelte/lib/Check';

	let isSubmitting = $state(false);
	let localError = $state<string | null>(null);

	const mode = $derived(goalFormStore.mode);
	const isValid = $derived(goalFormStore.isValid);
	const isDerived = $derived(goalFormStore.isDerived);
	const existingGoal = $derived(goalFormStore.existingGoal);
	const allWallets = $derived(reedrichStore.allWallets);

	function toggleWallet(walletId: string) {
		const idx = goalFormStore.walletIds.indexOf(walletId);
		if (idx >= 0) {
			goalFormStore.walletIds = goalFormStore.walletIds.filter((id) => id !== walletId);
		} else {
			goalFormStore.walletIds = [...goalFormStore.walletIds, walletId];
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		localError = null;

		try {
			if (mode === 'create') {
				await reedrichStore.createGoal({
					name: goalFormStore.name.trim(),
					targetAmount: goalFormStore.targetAmount ?? 0,
					currentAmount: isDerived ? 0 : (goalFormStore.currentAmount ?? 0),
					currency: goalFormStore.currency.trim().toUpperCase() || 'IDR',
					targetDate: goalFormStore.targetDate || null,
					walletIds: goalFormStore.walletIds.length > 0 ? goalFormStore.walletIds : undefined,
					categoryId: goalFormStore.categoryId || null,
					notes: goalFormStore.notes.trim() || null
				});
			} else if (existingGoal) {
				await reedrichStore.updateGoal(existingGoal.goalId, {
					name: goalFormStore.name.trim(),
					targetAmount: goalFormStore.targetAmount ?? 0,
					currentAmount: isDerived ? undefined : (goalFormStore.currentAmount ?? 0),
					currency: goalFormStore.currency.trim().toUpperCase() || 'IDR',
					targetDate: goalFormStore.targetDate || null,
					status: goalFormStore.status,
					notes: goalFormStore.notes.trim() || null
				});
			}
			goalFormStore.close();
		} catch (err: unknown) {
			localError = err instanceof Error ? err.message : 'Gagal menyimpan target tabungan';
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
		<label for="goal-name" class="mb-1 block font-medium text-[#111111]">
			Nama Target Sasaran <span class="text-[#9F2F2D]">*</span>
		</label>
		<input
			id="goal-name"
			type="text"
			required
			bind:value={goalFormStore.name}
			placeholder="Contoh: Dana Darurat 6 Bulan, Beli Laptop, DP Rumah"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
	</div>

	<!-- Target Amount & Currency -->
	<div class="grid grid-cols-3 gap-3">
		<div class="col-span-2">
			<label for="goal-target" class="mb-1 block font-medium text-[#111111]">
				Jumlah Sasaran Target <span class="text-[#9F2F2D]">*</span>
			</label>
			<input
				id="goal-target"
				type="number"
				required
				min="1"
				step="any"
				bind:value={goalFormStore.targetAmount}
				placeholder="Contoh: 50000000"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>

		<div>
			<label for="goal-curr" class="mb-1 block font-medium text-[#111111]"> Mata Uang </label>
			<input
				id="goal-curr"
				type="text"
				maxlength="5"
				bind:value={goalFormStore.currency}
				placeholder="IDR"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs uppercase text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Target Date -->
	<div>
		<label for="goal-date" class="mb-1 block font-medium text-[#111111]">
			Tenggat Waktu Sasaran (Opsional)
		</label>
		<SingleDatePicker
			bind:value={goalFormStore.targetDate}
			placeholder="Pilih batas tanggal target..."
		/>
	</div>

	<!-- Linked Wallets (for Derived Balance Calculation) -->
	<div>
		<div class="mb-1.5 flex items-center justify-between">
			<span class="font-medium text-[#111111]">Dompet Terhubung (Derived Goal)</span>
			{#if isDerived}
				<span class="rounded bg-[#EDF3EC] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#346538]">
					Saldo Otomatis Terhitung
				</span>
			{/if}
		</div>
		<p class="mb-2 text-[11px] text-[#787774]">
			Pilih satu atau lebih dompet khusus simpanan. Saldo target akan otomatis dihitung dari total saldo dompet terpilih.
		</p>

		<div class="max-h-36 overflow-y-auto divide-y divide-[#EAEAEA] rounded-md border border-[#EAEAEA] bg-[#FDFCFB]">
			{#each allWallets as w (w.walletId)}
				{@const checked = goalFormStore.walletIds.includes(w.walletId)}
				<label class="flex cursor-pointer items-center justify-between p-2.5 hover:bg-[#F0EFEC]">
					<div class="flex items-center gap-2 min-w-0">
						<input
							type="checkbox"
							{checked}
							onchange={() => toggleWallet(w.walletId)}
							class="size-3.5 rounded border-[#EAEAEA] text-[#111111] focus:ring-0"
						/>
						<span class="truncate font-medium text-[#111111]">{w.walletName}</span>
						<span class="text-[10px] text-[#787774]">({w.institution})</span>
					</div>
					<span class="font-mono text-[11px] tabular-nums text-[#787774] shrink-0">
						{fmtIDR(w.balance)}
					</span>
				</label>
			{/each}
		</div>
	</div>

	<!-- Initial / Manual Starting Balance (only if no linked wallets) -->
	{#if !isDerived}
		<div>
			<label for="goal-current" class="mb-1 block font-medium text-[#111111]">
				Saldo Awal Terkumpul (Tracking Manual)
			</label>
			<input
				id="goal-current"
				type="number"
				min="0"
				step="any"
				bind:value={goalFormStore.currentAmount}
				placeholder="0"
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>
	{/if}

	<!-- Status (only in edit mode) -->
	{#if mode === 'edit'}
		<div>
			<label for="goal-status" class="mb-1 block font-medium text-[#111111]"> Status Target </label>
			<select
				id="goal-status"
				bind:value={goalFormStore.status}
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			>
				<option value="in_progress">Sedang Berjalan (In Progress)</option>
				<option value="completed">Tercapai (Completed)</option>
				<option value="cancelled">Dibatalkan (Cancelled)</option>
			</select>
		</div>
	{/if}

	<!-- Notes -->
	<div>
		<label for="goal-notes" class="mb-1 block font-medium text-[#111111]">
			Catatan / Keterangan
		</label>
		<textarea
			id="goal-notes"
			rows="2"
			bind:value={goalFormStore.notes}
			placeholder="Catatan tambahan mengenai target ini..."
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		></textarea>
	</div>

	<!-- Action Buttons -->
	<div class="mt-2 flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => goalFormStore.close()}
			class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-4 py-2 text-xs font-medium text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
		>
			Batal
		</button>
		<button
			type="submit"
			disabled={!isValid || isSubmitting}
			class="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Check class="size-3.5" weight="bold" />
			<span>{isSubmitting ? 'Menyimpan...' : mode === 'edit' ? 'Perbarui Target' : 'Simpan Target'}</span>
		</button>
	</div>
</form>
