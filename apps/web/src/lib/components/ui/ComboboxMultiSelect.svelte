<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import Funnel from 'phosphor-svelte/lib/Funnel';
	import Check from 'phosphor-svelte/lib/Check';
	import X from 'phosphor-svelte/lib/X';

	export interface ComboboxOption {
		value: string;
		label: string;
		group?: string;
		subtext?: string;
	}

	let {
		options = [],
		selected = $bindable([]),
		placeholder = 'Pilih item...',
		searchPlaceholder = 'Cari...',
		onchange
	}: {
		options: ComboboxOption[];
		selected?: string[];
		placeholder?: string;
		searchPlaceholder?: string;
		onchange?: (selected: string[]) => void;
	} = $props();

	let isOpen = $state(false);
	let query = $state('');

	// Focus input when opened
	function handleOpen() {
		isOpen = !isOpen;
		query = '';
		if (isOpen) {
			setTimeout(() => {
				const el = document.getElementById('comboboxSearchInput');
				if (el) el.focus();
			}, 50);
		}
	}

	// Filtered options based on query
	const filteredOptions = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(q) ||
				(o.group && o.group.toLowerCase().includes(q)) ||
				(o.subtext && o.subtext.toLowerCase().includes(q))
		);
	});

	// Grouped filtered options
	const groupedOptions = $derived.by(() => {
		const map = new SvelteMap<string, ComboboxOption[]>();
		for (const opt of filteredOptions) {
			const g = opt.group || '';
			if (!map.has(g)) map.set(g, []);
			map.get(g)!.push(opt);
		}
		return Array.from(map.entries());
	});

	function toggleOption(val: string) {
		if (selected.includes(val)) {
			selected = selected.filter((v) => v !== val);
		} else {
			selected = [...selected, val];
		}
		onchange?.(selected);
	}

	function selectAll() {
		selected = options.map((o) => o.value);
		onchange?.(selected);
	}

	function clearAll() {
		selected = [];
		onchange?.(selected);
	}

	const triggerLabel = $derived.by(() => {
		if (selected.length === 0) return placeholder;
		if (selected.length === 1) {
			const found = options.find((o) => o.value === selected[0]);
			return found ? found.label : placeholder;
		}
		return `${placeholder.split(' ')[0]} (${selected.length} dipilih)`;
	});
</script>

<div class="relative inline-block text-xs">
	<!-- Trigger Button -->
	<button
		type="button"
		onclick={handleOpen}
		class="flex cursor-pointer items-center gap-1.5 rounded border border-[#EAEAEA] bg-white px-2.5 py-1.5 font-medium text-[#111111] shadow-2xs transition-colors hover:border-[#C8C6BF]"
	>
		<Funnel class="size-3 text-[#787774]" weight="bold" />
		<span class="max-w-[180px] truncate">{triggerLabel}</span>
		{#if selected.length > 0}
			<span
				role="button"
				tabindex="0"
				onclick={(e) => {
					e.stopPropagation();
					clearAll();
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.stopPropagation();
						clearAll();
					}
				}}
				class="ml-1 cursor-pointer rounded-full p-0.5 text-[#787774] hover:bg-[#EFEFED] hover:text-[#111111]"
			>
				<X class="size-2.5" />
			</span>
		{/if}
	</button>

	<!-- Popover Container -->
	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-30" onclick={() => (isOpen = false)}></div>

		<div
			class="absolute top-full left-0 z-40 mt-1.5 flex max-h-[360px] w-[280px] flex-col overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-lg"
		>
			<!-- Search Header Input -->
			<div class="flex items-center gap-1.5 border-b border-[#EAEAEA] bg-[#F9F9F8] p-2">
				<MagnifyingGlass class="size-3.5 shrink-0 text-[#787774]" weight="bold" />
				<input
					id="comboboxSearchInput"
					type="search"
					bind:value={query}
					placeholder={searchPlaceholder}
					class="w-full bg-transparent text-xs text-[#111111] placeholder:text-[#787774] focus:outline-hidden"
				/>
			</div>

			<!-- Select All / Clear toolbar -->
			<div
				class="flex items-center justify-between border-b border-[#EAEAEA] bg-white px-3 py-1.5 text-[10px] text-[#787774]"
			>
				<button
					type="button"
					onclick={selectAll}
					class="cursor-pointer hover:text-[#111111] hover:underline"
				>
					Pilih Semua ({options.length})
				</button>
				{#if selected.length > 0}
					<button
						type="button"
						onclick={clearAll}
						class="cursor-pointer hover:text-[#9F2F2D] hover:underline"
					>
						Reset
					</button>
				{/if}
			</div>

			<!-- Scrollable Options List -->
			<div class="flex-1 divide-y divide-[#F0EFEC] overflow-y-auto p-1">
				{#each groupedOptions as [groupName, groupOpts] (groupName)}
					<div class="py-1">
						{#if groupName}
							<div
								class="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#787774] uppercase"
							>
								{groupName}
							</div>
						{/if}

						<div class="space-y-0.5">
							{#each groupOpts as opt (opt.value)}
								{@const isSelected = selected.includes(opt.value)}
								<button
									type="button"
									onclick={() => toggleOption(opt.value)}
									class="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-[#F9F9F8] {isSelected
										? 'bg-[#F9F9F8]'
										: ''}"
								>
									<div class="flex items-center gap-2 truncate pr-2">
										<div
											class="flex size-3.5 items-center justify-center rounded border transition-colors {isSelected
												? 'border-[#111111] bg-[#111111] text-white'
												: 'border-[#C8C6BF] bg-white'}"
										>
											{#if isSelected}
												<Check class="size-2.5" weight="bold" />
											{/if}
										</div>
										<span
											class="truncate text-xs {isSelected
												? 'font-medium text-[#111111]'
												: 'text-[#2F3437]'}"
										>
											{opt.label}
										</span>
									</div>

									{#if opt.subtext}
										<span class="shrink-0 font-mono text-[10px] text-[#787774]">
											{opt.subtext}
										</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="py-6 text-center font-mono text-xs text-[#787774]">
						Tidak ada hasil "{query}".
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
