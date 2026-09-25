<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import CaretDown from 'phosphor-svelte/lib/CaretDown';
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
		value = $bindable(''),
		placeholder = 'Pilih item...',
		searchPlaceholder = 'Cari...',
		disabled = false,
		hasError = false,
		onchange
	}: {
		options: ComboboxOption[];
		value?: string;
		placeholder?: string;
		searchPlaceholder?: string;
		disabled?: boolean;
		hasError?: boolean;
		onchange?: (selected: string) => void;
	} = $props();

	let isOpen = $state(false);
	let query = $state('');

	function handleOpen() {
		if (disabled) return;
		isOpen = !isOpen;
		query = '';
		if (isOpen) {
			setTimeout(() => {
				const el = document.getElementById('singleComboboxSearchInput');
				if (el) el.focus();
			}, 50);
		}
	}

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

	const groupedOptions = $derived.by(() => {
		const map = new SvelteMap<string, ComboboxOption[]>();
		for (const opt of filteredOptions) {
			const g = opt.group || '';
			if (!map.has(g)) map.set(g, []);
			map.get(g)!.push(opt);
		}
		return Array.from(map.entries());
	});

	const selectedOption = $derived(options.find((o) => o.value === value));

	function handleSelect(val: string) {
		value = val;
		isOpen = false;
		query = '';
		onchange?.(val);
	}

	function handleClear(e: MouseEvent) {
		e.stopPropagation();
		value = '';
		isOpen = false;
		onchange?.('');
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
		onclick={handleOpen}
		{disabled}
		class="flex w-full cursor-pointer items-center justify-between rounded-md border bg-white px-3 py-2 text-left font-medium text-[#111111] shadow-2xs transition-colors hover:border-[#C8C6BF] focus:border-[#111111] focus:outline-hidden disabled:cursor-not-allowed disabled:bg-[#F9F9F8] disabled:opacity-50 {hasError
			? 'border-[#9F2F2D]'
			: 'border-[#EAEAEA]'}"
	>
		<div class="flex items-center gap-2 truncate pr-2">
			{#if selectedOption}
				<span class="truncate">{selectedOption.label}</span>
				{#if selectedOption.subtext}
					<span class="font-mono text-[11px] text-[#787774]">
						({selectedOption.subtext})
					</span>
				{/if}
			{:else}
				<span class="truncate text-[#787774]">{placeholder}</span>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-1.5 text-[#787774]">
			{#if value && !disabled}
				<span
					role="button"
					tabindex="0"
					onclick={handleClear}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as MouseEvent);
					}}
					class="cursor-pointer rounded-full p-0.5 hover:bg-[#EFEFED] hover:text-[#111111]"
					title="Hapus pilihan"
				>
					<X class="size-3" />
				</span>
			{/if}
			<CaretDown class="size-3.5 transition-transform {isOpen ? 'rotate-180' : ''}" />
		</div>
	</button>

	<!-- Popover Container -->
	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50" onclick={() => (isOpen = false)}></div>

		<div
			class="absolute top-full left-0 z-50 mt-1.5 flex max-h-[320px] w-full flex-col overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-xl"
		>
			<!-- Search Header Input -->
			<div class="flex items-center gap-1.5 border-b border-[#EAEAEA] bg-[#F9F9F8] p-2">
				<MagnifyingGlass class="size-3.5 shrink-0 text-[#787774]" weight="bold" />
				<input
					id="singleComboboxSearchInput"
					type="search"
					bind:value={query}
					placeholder={searchPlaceholder}
					class="w-full bg-transparent text-xs text-[#111111] placeholder:text-[#787774] focus:outline-hidden"
				/>
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
								{@const isSelected = value === opt.value}
								<button
									type="button"
									onclick={() => handleSelect(opt.value)}
									class="flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors hover:bg-[#F9F9F8] {isSelected
										? 'bg-[#F9F9F8]'
										: ''}"
								>
									<div class="flex items-center gap-2 truncate pr-2">
										<div
											class="flex size-3.5 shrink-0 items-center justify-center rounded border transition-colors {isSelected
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
										<span class="shrink-0 font-mono text-[11px] text-[#787774]">
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
