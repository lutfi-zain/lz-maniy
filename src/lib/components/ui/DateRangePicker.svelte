<script lang="ts">
	import Calendar from 'phosphor-svelte/lib/Calendar';
	import CaretLeft from 'phosphor-svelte/lib/CaretLeft';
	import CaretRight from 'phosphor-svelte/lib/CaretRight';
	import X from 'phosphor-svelte/lib/X';
	import { dFmt } from '$lib/utils/dates';

	let {
		start = $bindable(''),
		end = $bindable(''),
		preset = $bindable<'this_month' | 'next_month' | 'last_month' | 'today' | 'all' | 'custom'>(
			'this_month'
		),
		onchange
	}: {
		start?: string;
		end?: string;
		preset?: 'this_month' | 'next_month' | 'last_month' | 'today' | 'all' | 'custom';
		onchange?: (range: { start: string; end: string; preset: string }) => void;
	} = $props();

	let isOpen = $state(false);

	// Calendar viewing month/year
	const now = new Date();
	let viewYear = $state(now.getFullYear());
	let viewMonth = $state(now.getMonth()); // 0-indexed

	// Initialize with default preset ("this_month")
	$effect(() => {
		if (preset === 'this_month' && !start && !end) {
			applyPreset('this_month', false);
		}
	});

	function applyPreset(
		p: 'this_month' | 'next_month' | 'last_month' | 'today' | 'all',
		close = true
	) {
		preset = p;
		const base = new Date();
		const y = base.getFullYear();
		const m = base.getMonth();

		if (p === 'this_month') {
			const s = new Date(y, m, 1);
			const e = new Date(y, m + 1, 0);
			start = formatDate(s);
			end = formatDate(e);
			viewYear = y;
			viewMonth = m;
		} else if (p === 'next_month') {
			const s = new Date(y, m + 1, 1);
			const e = new Date(y, m + 2, 0);
			start = formatDate(s);
			end = formatDate(e);
			viewYear = s.getFullYear();
			viewMonth = s.getMonth();
		} else if (p === 'last_month') {
			const s = new Date(y, m - 1, 1);
			const e = new Date(y, m, 0);
			start = formatDate(s);
			end = formatDate(e);
			viewYear = s.getFullYear();
			viewMonth = s.getMonth();
		} else if (p === 'today') {
			const t = formatDate(base);
			start = t;
			end = t;
			viewYear = y;
			viewMonth = m;
		} else if (p === 'all') {
			start = '';
			end = '';
		}

		if (close) isOpen = false;
		onchange?.({ start, end, preset });
	}

	function formatDate(d: Date): string {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Days generation for current calendar view
	const calendarDays = $derived.by(() => {
		const firstDay = new Date(viewYear, viewMonth, 1);
		const lastDay = new Date(viewYear, viewMonth + 1, 0);
		const startingDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
		const totalDays = lastDay.getDate();

		const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

		// Leading empty days from prev month
		const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
		for (let i = startingDayOfWeek - 1; i >= 0; i--) {
			const d = prevMonthLastDay - i;
			const prevDate = new Date(viewYear, viewMonth - 1, d);
			days.push({
				dateStr: formatDate(prevDate),
				dayNum: d,
				isCurrentMonth: false
			});
		}

		// Days of current month
		for (let d = 1; d <= totalDays; d++) {
			const currDate = new Date(viewYear, viewMonth, d);
			days.push({
				dateStr: formatDate(currDate),
				dayNum: d,
				isCurrentMonth: true
			});
		}

		// Trailing days to fill 35 or 42 grid cells
		const remaining = 35 - days.length;
		if (remaining > 0) {
			for (let d = 1; d <= remaining; d++) {
				const nextDate = new Date(viewYear, viewMonth + 1, d);
				days.push({
					dateStr: formatDate(nextDate),
					dayNum: d,
					isCurrentMonth: false
				});
			}
		}

		return days;
	});

	function handleDayClick(dateStr: string) {
		preset = 'custom';
		if (!start || (start && end)) {
			// Click 1: set start, clear end
			start = dateStr;
			end = '';
		} else if (start && !end) {
			// Click 2: set end (or swap if earlier than start)
			if (dateStr < start) {
				end = start;
				start = dateStr;
			} else {
				end = dateStr;
			}
			onchange?.({ start, end, preset });
			isOpen = false;
		}
	}

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

	const monthNames = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];

	const triggerLabel = $derived.by(() => {
		if (preset === 'this_month')
			return 'Bulan Ini' + (start && end ? ` (${dFmt(start)} - ${dFmt(end)})` : '');
		if (preset === 'next_month')
			return 'Bulan Depan' + (start && end ? ` (${dFmt(start)} - ${dFmt(end)})` : '');
		if (preset === 'last_month')
			return 'Bulan Lalu' + (start && end ? ` (${dFmt(start)} - ${dFmt(end)})` : '');
		if (preset === 'today') return 'Hari Ini' + (start ? ` (${dFmt(start)})` : '');
		if (preset === 'all') return 'Semua Waktu';
		if (start && end) return `${dFmt(start)} - ${dFmt(end)}`;
		if (start) return `Mulai ${dFmt(start)}...`;
		return 'Pilih Rentang Tanggal';
	});
</script>

<div class="relative inline-block text-xs">
	<!-- Trigger Button -->
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex cursor-pointer items-center gap-2 rounded border border-[#EAEAEA] bg-white px-3 py-1.5 font-medium text-[#111111] shadow-2xs transition-colors hover:border-[#C8C6BF]"
	>
		<Calendar class="size-3.5 text-[#787774]" weight="bold" />
		<span class="max-w-[220px] truncate">{triggerLabel}</span>
	</button>

	<!-- Popover Calendar Dropdown -->
	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-30" onclick={() => (isOpen = false)}></div>

		<div
			class="absolute top-full left-0 z-40 mt-1.5 w-[310px] rounded-lg border border-[#EAEAEA] bg-white p-3 shadow-lg"
		>
			<!-- Presets Bar -->
			<div class="mb-2.5 flex flex-wrap gap-1 border-b border-[#EAEAEA] pb-2.5">
				<button
					type="button"
					onclick={() => applyPreset('this_month')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {preset ===
					'this_month'
						? 'bg-[#111111] text-white'
						: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
				>
					Bulan Ini
				</button>
				<button
					type="button"
					onclick={() => applyPreset('next_month')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {preset ===
					'next_month'
						? 'bg-[#111111] text-white'
						: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
				>
					Bulan Depan
				</button>
				<button
					type="button"
					onclick={() => applyPreset('last_month')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {preset ===
					'last_month'
						? 'bg-[#111111] text-white'
						: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
				>
					Bulan Lalu
				</button>
				<button
					type="button"
					onclick={() => applyPreset('today')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {preset ===
					'today'
						? 'bg-[#111111] text-white'
						: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
				>
					Hari Ini
				</button>
				<button
					type="button"
					onclick={() => applyPreset('all')}
					class="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors {preset ===
					'all'
						? 'bg-[#111111] text-white'
						: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
				>
					Semua
				</button>
			</div>

			<!-- Calendar Month Header -->
			<div class="mb-2 flex items-center justify-between px-1">
				<button
					type="button"
					onclick={prevMonth}
					class="cursor-pointer rounded p-1 text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]"
				>
					<CaretLeft class="size-3.5" weight="bold" />
				</button>
				<span class="text-xs font-medium text-[#111111]">
					{monthNames[viewMonth]}
					{viewYear}
				</span>
				<button
					type="button"
					onclick={nextMonth}
					class="cursor-pointer rounded p-1 text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]"
				>
					<CaretRight class="size-3.5" weight="bold" />
				</button>
			</div>

			<!-- Calendar Grid Days Header -->
			<div class="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-[#787774]">
				<span>Min</span>
				<span>Sen</span>
				<span>Sel</span>
				<span>Rab</span>
				<span>Kam</span>
				<span>Jum</span>
				<span>Sab</span>
			</div>

			<!-- Calendar Grid -->
			<div class="grid grid-cols-7 gap-y-1">
				{#each calendarDays as d (d.dateStr)}
					{@const isStart = d.dateStr === start}
					{@const isEnd = d.dateStr === end}
					{@const inRange = start && end && d.dateStr >= start && d.dateStr <= end}
					{@const isSelected = isStart || isEnd}
					<button
						type="button"
						onclick={() => handleDayClick(d.dateStr)}
						class="flex size-8 cursor-pointer items-center justify-center text-center font-mono text-[11px] transition-colors {inRange &&
						!isSelected
							? 'bg-[#F0EFEC] text-[#111111]'
							: ''} {isSelected
							? 'rounded bg-[#111111] font-semibold text-white'
							: 'rounded hover:bg-[#F9F9F8]'} {!d.isCurrentMonth && !isSelected
							? 'text-[#C9C4B8]'
							: 'text-[#111111]'}"
					>
						{d.dayNum}
					</button>
				{/each}
			</div>

			<!-- Helper note -->
			<div
				class="mt-2.5 flex items-center justify-between border-t border-[#EAEAEA] pt-2 text-[10px] text-[#787774]"
			>
				<span>
					{start && !end ? 'Klik tanggal ke-2 untuk akhir' : 'Klik tanggal untuk pilih rentang'}
				</span>
				{#if start || end}
					<button
						type="button"
						onclick={() => {
							start = '';
							end = '';
							preset = 'all';
							onchange?.({ start, end, preset });
						}}
						class="flex cursor-pointer items-center gap-0.5 text-[#9F2F2D] hover:underline"
					>
						<X class="size-3" />
						<span>Hapus</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
