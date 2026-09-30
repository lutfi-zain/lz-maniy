<script lang="ts">
	import { categoryFormStore } from '$lib/stores/category-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import Check from 'phosphor-svelte/lib/Check';
	import Tag from 'phosphor-svelte/lib/Tag';
	import ForkKnife from 'phosphor-svelte/lib/ForkKnife';
	import Coffee from 'phosphor-svelte/lib/Coffee';
	import Car from 'phosphor-svelte/lib/Car';
	import ShoppingCart from 'phosphor-svelte/lib/ShoppingCart';
	import Lightning from 'phosphor-svelte/lib/Lightning';
	import Pill from 'phosphor-svelte/lib/Pill';
	import FilmStrip from 'phosphor-svelte/lib/FilmStrip';
	import Book from 'phosphor-svelte/lib/Book';
	import Briefcase from 'phosphor-svelte/lib/Briefcase';
	import Gift from 'phosphor-svelte/lib/Gift';
	import Airplane from 'phosphor-svelte/lib/Airplane';
	import House from 'phosphor-svelte/lib/House';
	import CategoryIcon from '$lib/components/category/CategoryIcon.svelte';

	let isSubmitting = $state(false);
	let localError = $state<string | null>(null);

	const mode = $derived(categoryFormStore.mode);
	const isValid = $derived(categoryFormStore.isValid);
	const existingCategory = $derived(categoryFormStore.existingCategory);

	const commonIcons = [
		{ id: 'Tag', component: Tag, label: 'Tag' },
		{ id: 'ForkKnife', component: ForkKnife, label: 'Makanan' },
		{ id: 'Coffee', component: Coffee, label: 'Kopi & Minuman' },
		{ id: 'Car', component: Car, label: 'Transportasi' },
		{ id: 'ShoppingCart', component: ShoppingCart, label: 'Belanja' },
		{ id: 'Lightning', component: Lightning, label: 'Tagihan & Utilitas' },
		{ id: 'Pill', component: Pill, label: 'Kesehatan' },
		{ id: 'FilmStrip', component: FilmStrip, label: 'Hiburan' },
		{ id: 'Book', component: Book, label: 'Pendidikan' },
		{ id: 'Briefcase', component: Briefcase, label: 'Pekerjaan' },
		{ id: 'Gift', component: Gift, label: 'Hadiah' },
		{ id: 'Airplane', component: Airplane, label: 'Liburan' },
		{ id: 'House', component: House, label: 'Tempat Tinggal' }
	];

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		localError = null;

		try {
			if (mode === 'create') {
				await reedrichStore.createCategory({
					name: categoryFormStore.name.trim(),
					type: categoryFormStore.type,
					icon: categoryFormStore.icon.trim() || null
				});
			} else if (existingCategory) {
				await reedrichStore.updateCategory(existingCategory.categoryId, {
					name: categoryFormStore.name.trim(),
					icon: categoryFormStore.icon.trim() || null
				});
			}
			categoryFormStore.close();
		} catch (err: unknown) {
			localError = err instanceof Error ? err.message : 'Gagal menyimpan kategori';
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
		<label for="cat-name" class="mb-1 block font-medium text-[#111111]">
			{t('forms.category.nameLabel')} <span class="text-[#9F2F2D]">*</span>
		</label>
		<input
			id="cat-name"
			type="text"
			required
			bind:value={categoryFormStore.name}
			placeholder="Contoh: Makanan, Transportasi, Langganan"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
	</div>

	<!-- Type (disabled if edit mode) -->
	<div>
		<label for="cat-type" class="mb-1 block font-medium text-[#111111]"> Tipe Kategori </label>
		{#if mode === 'edit'}
			<div
				class="rounded-md border border-[#EAEAEA] bg-[#F9F9F8] px-3 py-2 font-mono text-xs text-[#787774]"
			>
				{categoryFormStore.type === 'expense'
					? t('forms.transaction.typeExpense')
					: t('forms.transaction.typeIncome')}
				<span class="ml-2 text-[10px] text-[#787774]">({t('forms.category.typeNotice')})</span>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={() => (categoryFormStore.type = 'expense')}
					class="cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-all {categoryFormStore.type ===
					'expense'
						? 'border-[#111111] bg-[#111111] text-white'
						: 'border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#F9F9F8]'}"
				>
					{t('forms.transaction.typeExpense')}
				</button>
				<button
					type="button"
					onclick={() => (categoryFormStore.type = 'income')}
					class="cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-all {categoryFormStore.type ===
					'income'
						? 'border-[#111111] bg-[#111111] text-white'
						: 'border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#F9F9F8]'}"
				>
					{t('forms.transaction.typeIncome')}
				</button>
			</div>
		{/if}
	</div>

	<!-- Icon -->
	<div>
		<span class="mb-1.5 block font-medium text-[#111111]"> Ikon Kategori </span>
		<div class="flex items-center gap-3">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] text-[#111111]"
			>
				<CategoryIcon icon={categoryFormStore.icon} class="size-5" />
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#each commonIcons as item (item.id)}
					{@const IconComp = item.component}
					<button
						type="button"
						onclick={() => (categoryFormStore.icon = item.id)}
						class="flex size-8 cursor-pointer items-center justify-center rounded-md border transition-all {categoryFormStore.icon ===
						item.id
							? 'border-[#111111] bg-[#111111] text-white'
							: 'border-[#EAEAEA] bg-white text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
						title={item.label}
						aria-label={item.label}
					>
						<IconComp class="size-4" weight="bold" />
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="mt-2 flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => categoryFormStore.close()}
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
						? t('forms.category.submitEdit')
						: t('forms.category.submitCreate')}</span
			>
		</button>
	</div>
</form>
