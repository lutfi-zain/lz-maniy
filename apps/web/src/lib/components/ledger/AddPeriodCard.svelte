<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte.js';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import { getPeriodDateBounds } from '$lib/utils/dates.js';
	import Plus from 'phosphor-svelte/lib/Plus';
	import CalendarPlus from 'phosphor-svelte/lib/CalendarPlus';
	import X from 'phosphor-svelte/lib/X';

	let isOpen = $state(false);
	let mode = $state<'month' | 'custom'>('month');
	let customStartDate = $state('');
	let customEndDate = $state('');
	let customError = $state<string | null>(null);

	const monthNames = $derived.by(() => {
		return Array.from({ length: 12 }, (_, i) => {
			const d = new Date(2026, i, 1);
			return d.toLocaleDateString(i18nStore.locale === 'id' ? 'id-ID' : 'en-US', { month: 'long' });
		});
	});

	// Current date defaults
	const now = new Date();
	let selectedYear = $state(now.getFullYear());
	let selectedMonth = $state(now.getMonth() + 1);

	// Quick add next month
	function addNextMonth() {
		const existing = settingsStore.settings.activePeriods;
		if (existing.length === 0) {
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, '0');
			settingsStore.addPeriod(`${y}-${m}`);
			return;
		}

		// Sort periods chronologically by their start date
		const sorted = [...existing].sort((a, b) => {
			return getPeriodDateBounds(a).startDate.localeCompare(getPeriodDateBounds(b).startDate);
		});
		const latest = sorted[sorted.length - 1];
		const latestEnd = getPeriodDateBounds(latest).endDate;
		const [latestYearStr, latestMonthStr] = latestEnd.split('-');
		const latestYear = parseInt(latestYearStr, 10);
		const latestMonth = parseInt(latestMonthStr, 10);

		let nextYear = latestYear;
		let nextMonth = latestMonth + 1;
		if (nextMonth > 12) {
			nextYear += 1;
			nextMonth = 1;
		}

		const nextPeriodStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
		settingsStore.addPeriod(nextPeriodStr);
	}

	function handleAddCustom() {
		customError = null;
		if (mode === 'month') {
			const periodStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
			settingsStore.addPeriod(periodStr);
			isOpen = false;
			return;
		}

		if (!customStartDate || !customEndDate) {
			customError =
				i18nStore.locale === 'id'
					? 'Silakan isi tanggal mulai dan akhir'
					: 'Please enter start and end dates';
			return;
		}
		if (customStartDate > customEndDate) {
			customError =
				i18nStore.locale === 'id'
					? 'Tanggal mulai tidak boleh melebihi tanggal akhir'
					: 'Start date cannot be after end date';
			return;
		}

		settingsStore.addPeriod(`${customStartDate}_${customEndDate}`);
		isOpen = false;
		customStartDate = '';
		customEndDate = '';
	}
</script>

<div
	class="relative flex min-h-[380px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#EAEAEA] bg-[#FDFCFB] p-6 text-center transition-colors hover:border-[#C9C4B8]"
>
	{#if !isOpen}
		<div class="flex flex-col items-center gap-3">
			<div
				class="flex size-10 items-center justify-center rounded-full bg-[#F0EFEC] text-[#111111]"
			>
				<CalendarPlus class="size-5" weight="bold" />
			</div>

			<div>
				<h3 class="text-xs font-semibold text-[#111111]">{t('ledger.addPeriod')}</h3>
				<p class="mt-0.5 text-[11px] text-[#787774]">
					{i18nStore.locale === 'id'
						? 'Perluas horizon perencanaan ke bulan lain.'
						: 'Extend horizon board to another month.'}
				</p>
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<button
					type="button"
					onclick={addNextMonth}
					class="flex cursor-pointer items-center justify-center gap-1.5 rounded bg-[#111111] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#333333] active:scale-98"
				>
					<Plus class="size-3.5" weight="bold" />
					<span>{i18nStore.locale === 'id' ? '+1 Bulan Berikutnya' : '+1 Next Month'}</span>
				</button>

				<button
					type="button"
					onclick={() => (isOpen = true)}
					class="cursor-pointer rounded border border-[#EAEAEA] bg-white px-3 py-1 text-xs text-[#787774] transition-colors hover:border-[#111111] hover:text-[#111111]"
				>
					{i18nStore.locale === 'id' ? 'Pilih Bulan Spesifik...' : 'Select Specific Month...'}
				</button>
			</div>
		</div>
	{:else}
		<!-- Custom Month/Year Selector Form -->
		<div
			class="w-full max-w-[280px] space-y-3 rounded-lg border border-[#EAEAEA] bg-white p-4 text-left shadow-xs"
		>
			<div class="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
				<span class="text-xs font-semibold text-[#111111]"
					>{i18nStore.locale === 'id' ? 'Pilih Periode' : 'Select Period'}</span
				>
				<button
					type="button"
					onclick={() => {
						isOpen = false;
						customError = null;
					}}
					class="cursor-pointer text-[#787774] hover:text-[#111111]"
					aria-label="Tutup"
				>
					<X class="size-3.5" weight="bold" />
				</button>
			</div>

			<!-- Mode tabs -->
			<div class="flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5 text-xs">
				<button
					type="button"
					onclick={() => {
						mode = 'month';
						customError = null;
					}}
					class="flex-1 cursor-pointer rounded py-1 text-center font-medium transition-colors {mode ===
					'month'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774] hover:text-[#111111]'}"
				>
					{i18nStore.locale === 'id' ? 'Bulan' : 'Month'}
				</button>
				<button
					type="button"
					onclick={() => {
						mode = 'custom';
						customError = null;
					}}
					class="flex-1 cursor-pointer rounded py-1 text-center font-medium transition-colors {mode ===
					'custom'
						? 'bg-white text-[#111111] shadow-2xs'
						: 'text-[#787774] hover:text-[#111111]'}"
				>
					{i18nStore.locale === 'id' ? 'Rentang Tanggal' : 'Date Range'}
				</button>
			</div>

			{#if mode === 'month'}
				<div class="space-y-2 text-xs">
					<div>
						<label for="selectYear" class="block text-[10px] font-medium text-[#787774] uppercase"
							>{i18nStore.locale === 'id' ? 'Tahun' : 'Year'}</label
						>
						<select
							id="selectYear"
							bind:value={selectedYear}
							class="mt-1 w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
						>
							{#each [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2] as yr}
								<option value={yr}>{yr}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="selectMonth" class="block text-[10px] font-medium text-[#787774] uppercase"
							>{i18nStore.locale === 'id' ? 'Bulan' : 'Month'}</label
						>
						<select
							id="selectMonth"
							bind:value={selectedMonth}
							class="mt-1 w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#111111]"
						>
							{#each monthNames as name, idx}
								<option value={idx + 1}>{name}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else}
				<div class="space-y-2 text-xs">
					<div>
						<label for="customStart" class="block text-[10px] font-medium text-[#787774] uppercase"
							>{i18nStore.locale === 'id' ? 'Tanggal Mulai' : 'Start Date'}</label
						>
						<input
							id="customStart"
							type="date"
							bind:value={customStartDate}
							class="mt-1 w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 font-mono text-xs text-[#111111]"
						/>
					</div>
					<div>
						<label for="customEnd" class="block text-[10px] font-medium text-[#787774] uppercase"
							>{i18nStore.locale === 'id' ? 'Tanggal Akhir' : 'End Date'}</label
						>
						<input
							id="customEnd"
							type="date"
							bind:value={customEndDate}
							class="mt-1 w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 font-mono text-xs text-[#111111]"
						/>
					</div>
					{#if customError}
						<p class="text-[10px] font-medium text-[#9F2F2D]">{customError}</p>
					{/if}
				</div>
			{/if}

			<div class="flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-2">
				<button
					type="button"
					onclick={() => {
						isOpen = false;
						customError = null;
					}}
					class="cursor-pointer rounded px-2.5 py-1 text-xs text-[#787774] hover:text-[#111111]"
				>
					{t('common.cancel')}
				</button>
				<button
					type="button"
					onclick={handleAddCustom}
					class="cursor-pointer rounded bg-[#111111] px-3 py-1 text-xs font-medium text-white hover:bg-[#333333]"
				>
					{i18nStore.locale === 'id' ? 'Tambahkan' : 'Add Period'}
				</button>
			</div>
		</div>
	{/if}
</div>
