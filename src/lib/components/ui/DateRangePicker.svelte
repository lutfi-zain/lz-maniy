<script lang="ts">
	import Calendar from 'phosphor-svelte/lib/Calendar';
	import CaretLeft from 'phosphor-svelte/lib/CaretLeft';
	import CaretRight from 'phosphor-svelte/lib/CaretRight';
	import CaretDown from 'phosphor-svelte/lib/CaretDown';
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
	let triggerBtn = $state<HTMLButtonElement | null>(null);
	let popoverStyle = $state<string>('left: 0px; right: auto;');

	function updatePopoverPosition() {
		if (!triggerBtn) return;
		const rect = triggerBtn.getBoundingClientRect();
		const popoverWidth = 590;
		const viewportWidth = window.innerWidth;
		const padding = 12;

		// Check if opening with left-0 overflows the right edge of viewport
		const overflowsRight = rect.left + popoverWidth > viewportWidth - padding;
		// Check if opening with right-0 overflows the left edge of viewport
		const overflowsLeft = rect.right - popoverWidth < padding;

		if (overflowsRight && !overflowsLeft) {
			// Align to the right edge of trigger button
			popoverStyle = 'right: 0px; left: auto;';
		} else if (!overflowsRight) {
			// Default: Align to the left edge of trigger button
			popoverStyle = 'left: 0px; right: auto;';
		} else {
			// Both would overflow (e.g. narrow screen or centered trigger):
			// Shift so it stays securely within [padding, viewportWidth - padding]
			const shift = Math.max(
				padding - rect.left,
				viewportWidth - padding - (rect.left + popoverWidth)
			);
			popoverStyle = `left: ${Math.round(shift)}px; right: auto; max-width: calc(100vw - 24px);`;
		}
	}

	function toggleOpen() {
		if (!isOpen) {
			updatePopoverPosition();
		}
		isOpen = !isOpen;
	}

	$effect(() => {
		if (isOpen) {
			updatePopoverPosition();
			window.addEventListener('resize', updatePopoverPosition);
			window.addEventListener('scroll', updatePopoverPosition, true);
			return () => {
				window.removeEventListener('resize', updatePopoverPosition);
				window.removeEventListener('scroll', updatePopoverPosition, true);
			};
		}
	});
	// Calendar viewing month/year for Month 1 (left)
	const now = new Date();
	let viewYear = $state(now.getFullYear());
	let viewMonth = $state(now.getMonth()); // 0-indexed

	// Month 2 (right) is always Month 1 + 1
	const nextMonthData = $derived.by(() => {
		if (viewMonth === 11) {
			return { year: viewYear + 1, month: 0 };
		}
		return { year: viewYear, month: viewMonth + 1 };
	});

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

	// Helper to generate calendar days for any given year & month
	function getDaysForMonth(y: number, m: number) {
		const firstDay = new Date(y, m, 1);
		const lastDay = new Date(y, m + 1, 0);
		const startingDayOfWeek = firstDay.getDay(); // 0 is Sun
		const totalDays = lastDay.getDate();

		const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

		// Leading days from prev month
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

		// Days of current month
		for (let d = 1; d <= totalDays; d++) {
			const currDate = new Date(y, m, d);
			days.push({
				dateStr: formatDate(currDate),
				dayNum: d,
				isCurrentMonth: true
			});
		}

		// Trailing days to fill 35 or 42 grid cells
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

	const month1Days = $derived(getDaysForMonth(viewYear, viewMonth));
	const month2Days = $derived(getDaysForMonth(nextMonthData.year, nextMonthData.month));

	function handleDayClick(dateStr: string) {
		preset = 'custom';
		if (!start || (start && end)) {
			// Click 1: set start, clear end
			start = dateStr;
			end = '';
		} else if (start && !end) {
			// Click 2: set end (swap if clicked earlier than start)
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

<!-- Outer Container with stable, non-resizing trigger -->
<div class="relative inline-block text-xs">
	<!-- Trigger Button (Fixed width w-[240px] to prevent shifting/resizing) -->
	<button
		bind:this={triggerBtn}
		type="button"
		onclick={toggleOpen}
		class="flex w-[240px] shrink-0 cursor-pointer items-center justify-between gap-2 rounded border border-[#EAEAEA] bg-white px-3 py-1.5 font-medium text-[#111111] shadow-2xs transition-colors hover:border-[#C8C6BF]"
		aria-haspopup="dialog"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-1.5 truncate">
			<Calendar class="size-3.5 shrink-0 text-[#787774]" weight="bold" />
			<span class="truncate">{triggerLabel}</span>
		</div>
		<CaretDown class="size-3 shrink-0 text-[#787774]" weight="bold" />
	</button>

	<!-- Popover 2-Month Dual Calendar Dropdown -->
	{#if isOpen}
		<!-- Backdrop to dismiss -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-30" onclick={() => (isOpen = false)}></div>

		<div
			class="absolute top-full z-40 mt-1.5 w-[590px] max-w-[95vw] rounded-lg border border-[#EAEAEA] bg-white p-3.5 shadow-xl transition-all"
			style={popoverStyle}
		>
			<!-- Presets Bar at Top -->
			<div
				class="mb-3 flex flex-wrap items-center justify-between gap-1 border-b border-[#EAEAEA] pb-2.5"
			>
				<div class="flex flex-wrap gap-1">
					<button
						type="button"
						onclick={() => applyPreset('this_month')}
						class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {preset ===
						'this_month'
							? 'bg-[#111111] font-semibold text-white'
							: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
					>
						Bulan Ini
					</button>
					<button
						type="button"
						onclick={() => applyPreset('next_month')}
						class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {preset ===
						'next_month'
							? 'bg-[#111111] font-semibold text-white'
							: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
					>
						Bulan Depan
					</button>
					<button
						type="button"
						onclick={() => applyPreset('last_month')}
						class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {preset ===
						'last_month'
							? 'bg-[#111111] font-semibold text-white'
							: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
					>
						Bulan Lalu
					</button>
					<button
						type="button"
						onclick={() => applyPreset('today')}
						class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {preset ===
						'today'
							? 'bg-[#111111] font-semibold text-white'
							: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
					>
						Hari Ini
					</button>
					<button
						type="button"
						onclick={() => applyPreset('all')}
						class="cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors {preset ===
						'all'
							? 'bg-[#111111] font-semibold text-white'
							: 'bg-[#F9F9F8] text-[#787774] hover:bg-[#EFEFED]'}"
					>
						Semua
					</button>
				</div>

				{#if start || end}
					<button
						type="button"
						onclick={() => {
							start = '';
							end = '';
							preset = 'all';
							onchange?.({ start, end, preset });
						}}
						class="flex cursor-pointer items-center gap-1 text-[11px] text-[#9F2F2D] hover:underline"
					>
						<X class="size-3" />
						<span>Reset</span>
					</button>
				{/if}
			</div>

			<!-- 2-Month Calendar Grid Container -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- MONTH 1 (Left) -->
				<div class="space-y-2">
					<div class="flex items-center justify-between px-1">
						<button
							type="button"
							onclick={prevMonth}
							class="cursor-pointer rounded p-1 text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]"
							title="Bulan sebelumnya"
						>
							<CaretLeft class="size-3.5" weight="bold" />
						</button>
						<span class="text-xs font-semibold text-[#111111]">
							{monthNames[viewMonth]}
							{viewYear}
						</span>
						<span class="size-5"></span>
						<!-- Spacer for alignment -->
					</div>

					<!-- Days of week -->
					<div class="grid grid-cols-7 text-center text-[10px] font-medium text-[#787774]">
						<span>Min</span>
						<span>Sen</span>
						<span>Sel</span>
						<span>Rab</span>
						<span>Kam</span>
						<span>Jum</span>
						<span>Sab</span>
					</div>

					<!-- Days grid -->
					<div class="grid grid-cols-7 gap-y-0.5 text-center">
						{#each month1Days as d (d.dateStr)}
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
				</div>

				<!-- MONTH 2 (Right) -->
				<div class="space-y-2">
					<div class="flex items-center justify-between px-1">
						<span class="size-5"></span>
						<!-- Spacer for alignment -->
						<span class="text-xs font-semibold text-[#111111]">
							{monthNames[nextMonthData.month]}
							{nextMonthData.year}
						</span>
						<button
							type="button"
							onclick={nextMonth}
							class="cursor-pointer rounded p-1 text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]"
							title="Bulan berikutnya"
						>
							<CaretRight class="size-3.5" weight="bold" />
						</button>
					</div>

					<!-- Days of week -->
					<div class="grid grid-cols-7 text-center text-[10px] font-medium text-[#787774]">
						<span>Min</span>
						<span>Sen</span>
						<span>Sel</span>
						<span>Rab</span>
						<span>Kam</span>
						<span>Jum</span>
						<span>Sab</span>
					</div>

					<!-- Days grid -->
					<div class="grid grid-cols-7 gap-y-0.5 text-center">
						{#each month2Days as d (d.dateStr)}
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
				</div>
			</div>

			<!-- Helper instructions at bottom -->
			<div
				class="mt-3 flex items-center justify-between border-t border-[#EAEAEA] pt-2 text-[11px] text-[#787774]"
			>
				<span>
					{#if !start}
						Pilih tanggal awal
					{:else if start && !end}
						Pilih tanggal akhir (rentang akan otomatis tersorot)
					{:else}
						Rentang: <strong class="font-mono text-[#111111]">{dFmt(start)}</strong> s/d
						<strong class="font-mono text-[#111111]">{dFmt(end)}</strong>
					{/if}
				</span>
				<span class="font-mono text-[10px] text-[#787774]">2-Click Range</span>
			</div>
		</div>
	{/if}
</div>
