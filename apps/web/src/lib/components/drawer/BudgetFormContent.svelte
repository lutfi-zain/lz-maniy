<script lang="ts">
	import { budgetFormStore } from '$lib/stores/budget-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import SingleDatePicker from '$lib/components/ui/SingleDatePicker.svelte';
	import Check from 'phosphor-svelte/lib/Check';

	let isSubmitting = $state(false);
	let localError = $state<string | null>(null);

	const mode = $derived(budgetFormStore.mode);
	const isValid = $derived(budgetFormStore.isValid);
	const existingBudget = $derived(budgetFormStore.existingBudget);

	// Expense categories available for budget limit
	const expenseCategories = $derived(
		reedrichStore.categories.filter((c) => c.categoryType === 'expense')
	);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		localError = null;

		try {
			if (mode === 'create') {
				await reedrichStore.createBudget({
					name: budgetFormStore.name.trim(),
					amount: budgetFormStore.amount ?? 0,
					periodStart: new Date(budgetFormStore.periodStart).toISOString(),
					periodEnd: new Date(budgetFormStore.periodEnd).toISOString(),
					categoryId: budgetFormStore.categoryId || null
				});
			} else if (existingBudget) {
				await reedrichStore.updateBudget(existingBudget.budgetId, {
					name: budgetFormStore.name.trim(),
					amount: budgetFormStore.amount ?? 0,
					periodStart: new Date(budgetFormStore.periodStart).toISOString(),
					periodEnd: new Date(budgetFormStore.periodEnd).toISOString(),
					categoryId: budgetFormStore.categoryId || null
				});
			}
			budgetFormStore.close();
		} catch (err: unknown) {
			localError = err instanceof Error ? err.message : 'Gagal menyimpan pagu anggaran';
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
		<label for="budget-name" class="mb-1 block font-medium text-[#111111]">
			Nama Pagu Anggaran <span class="text-[#9F2F2D]">*</span>
		</label>
		<input
			id="budget-name"
			type="text"
			required
			bind:value={budgetFormStore.name}
			placeholder="Contoh: Belanja Bulanan, Transportasi, Makan Siang"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
	</div>

	<!-- Amount -->
	<div>
		<label for="budget-amount" class="mb-1 block font-medium text-[#111111]">
			Batas Nominal (IDR) <span class="text-[#9F2F2D]">*</span>
		</label>
		<input
			id="budget-amount"
			type="number"
			required
			min="1"
			step="any"
			bind:value={budgetFormStore.amount}
			placeholder="Contoh: 2500000"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
	</div>

	<!-- Category Association -->
	<div>
		<label for="budget-cat" class="mb-1 block font-medium text-[#111111]">
			Kategori Pengeluaran (Opsional)
		</label>
		<select
			id="budget-cat"
			bind:value={budgetFormStore.categoryId}
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		>
			<option value="">Semua Kategori (Pagu Umum)</option>
			{#each expenseCategories as c (c.categoryId)}
				<option value={c.categoryId}>{c.categoryIcon || '🏷️'} {c.categoryName}</option>
			{/each}
		</select>
	</div>

	<!-- Period Date Range -->
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="budget-start" class="mb-1 block font-medium text-[#111111]">
				Mulai Periode <span class="text-[#9F2F2D]">*</span>
			</label>
			<SingleDatePicker
				bind:value={budgetFormStore.periodStart}
				placeholder="Pilih tanggal awal..."
			/>
		</div>

		<div>
			<label for="budget-end" class="mb-1 block font-medium text-[#111111]">
				Akhir Periode <span class="text-[#9F2F2D]">*</span>
			</label>
			<SingleDatePicker
				bind:value={budgetFormStore.periodEnd}
				placeholder="Pilih tanggal akhir..."
			/>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="mt-2 flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => budgetFormStore.close()}
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
			<span>{isSubmitting ? 'Menyimpan...' : mode === 'edit' ? 'Perbarui Pagu' : 'Simpan Pagu'}</span>
		</button>
	</div>
</form>
