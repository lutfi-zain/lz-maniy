<script lang="ts">
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import SortAscending from 'phosphor-svelte/lib/SortAscending';
	import Plus from 'phosphor-svelte/lib/Plus';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import { dateFilterStore, type DatePreset } from '$lib/stores/date-filter.svelte';
	import { categoryFormStore } from '$lib/stores/category-form.svelte';
	import type { CategorySortOption } from '$lib/utils/category-metrics';

	interface Props {
		searchQuery: string;
		typeFilter: 'all' | 'expense' | 'income';
		sortBy: CategorySortOption;
		viewMode: 'grouped' | 'flat';
	}

	let {
		searchQuery = $bindable(''),
		typeFilter = $bindable('all'),
		sortBy = $bindable('balance_desc'),
		viewMode = $bindable('grouped')
	}: Props = $props();
</script>

<!-- Controls Bar: Search, DateRangePicker, Type Filter, Sort, View Toggle -->
<div
	class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EAEAEA] bg-white p-3 text-xs shadow-2xs"
>
	<!-- Row 1: Search input + DateRangePicker + Add Category Button -->
	<div class="flex w-full flex-wrap items-center gap-2.5">
		<div class="relative w-full flex-1 sm:min-w-[200px]">
			<MagnifyingGlass
				class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787774]"
				weight="bold"
			/>
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Cari nama kategori..."
				class="w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] py-2 pr-3 pl-8 text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden sm:py-1.5"
			/>
		</div>

		<div class="flex items-center gap-1.5 shrink-0">
			<DateRangePicker
				bind:start={dateFilterStore.startDate}
				bind:end={dateFilterStore.endDate}
				bind:preset={dateFilterStore.preset}
				onchange={({ preset, start, end }) => {
					dateFilterStore.setFilter(preset as DatePreset, start, end);
				}}
			/>
			<button
				type="button"
				onclick={() => categoryFormStore.openCreate(typeFilter === 'income' ? 'income' : 'expense')}
				class="flex cursor-pointer items-center gap-1.5 rounded bg-[#111111] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
			>
				<Plus class="size-3.5" weight="bold" />
				<span>Tambah Kategori</span>
			</button>
			{#if dateFilterStore.preset !== 'this_month'}
				<button
					type="button"
					onclick={() => dateFilterStore.reset()}
					class="flex cursor-pointer items-center gap-1 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1.5 text-[11px] font-medium text-[#787774] transition-colors hover:border-[#111111] hover:text-[#111111]"
					title="Reset ke Bulan Ini"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	<!-- Row 2: Type Filter (Left) + Sort & View Controls (Right) -->
	<div
		class="flex w-full flex-wrap items-center justify-between gap-2.5 border-t border-[#EAEAEA] pt-2 sm:border-t-0 sm:pt-0"
	>
		<!-- Type Filter Toggle -->
		<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
			<button
				type="button"
				onclick={() => (typeFilter = 'all')}
				class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {typeFilter ===
				'all'
					? 'bg-white text-[#111111] shadow-2xs'
					: 'text-[#787774]'}"
			>
				Semua
			</button>
			<button
				type="button"
				onclick={() => (typeFilter = 'expense')}
				class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {typeFilter ===
				'expense'
					? 'bg-white text-[#111111] shadow-2xs'
					: 'text-[#787774]'}"
			>
				Pengeluaran
			</button>
			<button
				type="button"
				onclick={() => (typeFilter = 'income')}
				class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {typeFilter ===
				'income'
					? 'bg-white text-[#111111] shadow-2xs'
					: 'text-[#787774]'}"
			>
				Pemasukan
			</button>
		</div>

		<!-- Right: Sort Dropdown & View Mode Toggle -->
		<div class="flex items-center gap-2.5">
			<!-- Sort dropdown -->
			<div class="flex items-center gap-1.5">
				<SortAscending class="size-3.5 text-[#787774]" weight="bold" />
				<select
					bind:value={sortBy}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
				>
					<option value="balance_desc">Nominal Terbesar</option>
					<option value="balance_asc">Nominal Terkecil</option>
					<option value="count_desc">Frekuensi Transaksi</option>
					<option value="name_asc">Nama A-Z</option>
				</select>
			</div>

			<!-- View mode toggle -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
				<button
					type="button"
					onclick={() => (viewMode = 'grouped')}
					class="cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors {viewMode ===
					'grouped'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Grup
				</button>
				<button
					type="button"
					onclick={() => (viewMode = 'flat')}
					class="cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors {viewMode ===
					'flat'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774]'}"
				>
					Flat
				</button>
			</div>
		</div>
	</div>
</div>
