<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte.js';
	import Table from 'phosphor-svelte/lib/Table';
	import CalendarBlank from 'phosphor-svelte/lib/CalendarBlank';

	const currentMode = $derived(settingsStore.settings.ledgerViewMode);

	function setMode(mode: 'single' | 'calendar_board') {
		settingsStore.setViewMode(mode);
	}
</script>

<!-- Only visible on desktop viewports (>= 1024px) -->
<div class="hidden items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5 lg:inline-flex">
	<button
		type="button"
		onclick={() => setMode('single')}
		class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors {currentMode ===
		'single'
			? 'bg-white text-[#111111] shadow-2xs'
			: 'text-[#787774] hover:text-[#111111]'}"
		title="Tampilan Tabel Standar"
		aria-pressed={currentMode === 'single'}
	>
		<Table class="size-3.5" weight={currentMode === 'single' ? 'bold' : 'regular'} />
		<span>Daftar</span>
	</button>

	<button
		type="button"
		onclick={() => setMode('calendar_board')}
		class="flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors {currentMode ===
		'calendar_board'
			? 'bg-white text-[#111111] shadow-2xs'
			: 'text-[#787774] hover:text-[#111111]'}"
		title="Tampilan Kalendar Multi-Periode"
		aria-pressed={currentMode === 'calendar_board'}
	>
		<CalendarBlank class="size-3.5" weight={currentMode === 'calendar_board' ? 'bold' : 'regular'} />
		<span>Horizon Board</span>
	</button>
</div>
