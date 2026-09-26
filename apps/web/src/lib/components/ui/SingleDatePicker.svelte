<script lang="ts">
	import Calendar from 'phosphor-svelte/lib/Calendar';
	import CaretLeft from 'phosphor-svelte/lib/CaretLeft';
	import CaretRight from 'phosphor-svelte/lib/CaretRight';
	import CaretDown from 'phosphor-svelte/lib/CaretDown';
	import { dFmt, mLabel } from '$lib/utils/dates';

	let {
		value = $bindable(''),
		placeholder = 'Pilih tanggal...',
		disabled = false,
		hasError = false,
		onchange
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		hasError?: boolean;
		onchange?: (date: string) => void;
	} = $props();

	let isOpen = $state(false);

	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth());

	$effect(() => {
		if (value) {
			const d = new Date(value);
			if (!isNaN(d.getTime())) {
				viewYear = d.getFullYear();
				viewMonth = d.getMonth();
			}
		}
	});

	function formatDate(d: Date): string {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getDaysForMonth(y: number, m: number) {
		const firstDay = new Date(y, m, 1);
		const lastDay = new Date(y, m + 1, 0);
		const startingDayOfWeek = firstDay.getDay(); // 0 is Sun
		const totalDays = lastDay.getDate();

		const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

		// Leading days
		const prevMonthLastDay = new Date(y, m, 0).getDate();
		for (let i = startingDayOfWeek - 1; i >= 0; i--) {
			const d = prevMonthLastDay - i;
			const prevDate = new Date(y, m - 1, d);
			days.push({
				dateStr: formatDate(prevDate),
				dayNum: d,
				isCurrentMonth: false
			});
		}

		// Current month days
		for (let d = 1; d <= totalDays; d++) {
			const currDate = new Date(y, m, d);
			days.push({
				dateStr: formatDate(currDate),
				dayNum: d,
				isCurrentMonth: true
			});
		}

		// Trailing days
		const needed = days.length <= 35 ? 35 : 42;
		const remaining = needed - days.length;
		for (let d = 1; d <= remaining; d++) {
			const nextDate = new Date(y, m + 1, d);
			days.push({
				dateStr: formatDate(nextDate),
				dayNum: d,
				isCurrentMonth: false
			});
		}

		return days;
	}

	const days = $derived(getDaysForMonth(viewYear, viewMonth));
	const currentMonthLabel = $derived(
		mLabel(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)
	);
	const todayStr = formatDate(new Date());

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear--;
		} else {
			viewMonth--;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear++;
		} else {
			viewMonth++;
		}
	}

	function handleDayClick(dateStr: string) {
		value = dateStr;
		isOpen = false;
		onchange?.(dateStr);
	}

	function selectToday() {
		const t = formatDate(new Date());
		value = t;
		isOpen = false;
		onchange?.(t);
	}

	function selectYesterday() {
		const now = new Date();
		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const y = formatDate(yesterday);
		value = y;
		isOpen = false;
		onchange?.(y);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative w-full text-xs">
	<!-- Trigger Button -->
	<button
		type="button"
		onclick={() => {
			if (!disabled) isOpen = !isOpen;
		}}
		{disabled}
		class="flex w-full cursor-pointer items-center justify-between rounded-md border bg-white px-3 py-2 text-left font-medium text-[#111111] shadow-2xs transition-colors hover:border-[#C8C6BF] focus:border-[#111111] focus:outline-hidden disabled:cursor-not-allowed disabled:bg-[#F9F9F8] disabled:opacity-50 {hasError
			? 'border-[#9F2F2D]'
			: 'border-[#EAEAEA]'}"
	>
		<div class="flex items-center gap-2 truncate">
			<Calendar class="size-3.5 shrink-0 text-[#787774]" weight="bold" />
			{#if value}
				<span class="font-mono text-xs">{dFmt(value)}</span>
			{:else}
				<span class="text-[#787774]">{placeholder}</span>
			{/if}
		</div>

		<CaretDown
			class="size-3.5 shrink-0 text-[#787774] transition-transform {isOpen ? 'rotate-180' : ''}"
		/>
	</button>

	<!-- Calendar Popover -->
	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50" onclick={() => (isOpen = false)}></div>

		<div
			class="absolute top-full left-0 z-50 mt-1.5 w-[280px] rounded-lg border border-[#EAEAEA] bg-white p-3 shadow-xl"
		>
			<!-- Month Header Navigation -->
			<div class="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
				<button
					type="button"
					onclick={prevMonth}
					class="cursor-pointer rounded p-1 text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
					title="Bulan sebelumnya"
				>
					<CaretLeft class="size-3.5" weight="bold" />
				</button>

				<span class="text-xs font-medium text-[#111111]">
					{currentMonthLabel}
				</span>

				<button
					type="button"
					onclick={nextMonth}
					class="cursor-pointer rounded p-1 text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
					title="Bulan berikutnya"
				>
					<CaretRight class="size-3.5" weight="bold" />
				</button>
			</div>

			<!-- Day of Week Header -->
			<div class="mt-2 grid grid-cols-7 text-center font-mono text-[10px] text-[#787774]">
				<span>Min</span>
				<span>Sen</span>
				<span>Sel</span>
				<span>Rab</span>
				<span>Kam</span>
				<span>Jum</span>
				<span>Sab</span>
			</div>

			<!-- Days Grid -->
			<div class="mt-1 grid grid-cols-7 gap-0.5">
				{#each days as d (d.dateStr)}
					{@const isSelected = value === d.dateStr}
					{@const isToday = todayStr === d.dateStr}
					<button
						type="button"
						onclick={() => handleDayClick(d.dateStr)}
						class="flex size-8 cursor-pointer items-center justify-center rounded font-mono text-xs transition-colors {isSelected
							? 'bg-[#111111] font-semibold text-white'
							: d.isCurrentMonth
								? 'text-[#111111] hover:bg-[#F0EFEC]'
								: 'text-[#C8C6BF] hover:bg-[#F9F9F8]'} {isToday && !isSelected
							? 'border border-[#111111]/30 font-bold'
							: ''}"
					>
						{d.dayNum}
					</button>
				{/each}
			</div>

			<!-- Presets Toolbar -->
			<div
				class="mt-3 flex items-center justify-between border-t border-[#EAEAEA] pt-2 text-[11px]"
			>
				<button
					type="button"
					onclick={selectYesterday}
					class="cursor-pointer text-[#787774] hover:text-[#111111] hover:underline"
				>
					Kemarin
				</button>
				<button
					type="button"
					onclick={selectToday}
					class="cursor-pointer font-medium text-[#111111] hover:underline"
				>
					Hari Ini
				</button>
			</div>
		</div>
	{/if}
</div>
