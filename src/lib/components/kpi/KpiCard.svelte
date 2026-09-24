<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		value,
		subtext,
		valueColor = 'text-[#111111]',
		onclick,
		icon,
		children
	}: {
		label: string;
		value: string;
		subtext?: string;
		valueColor?: string;
		onclick?: () => void;
		icon?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative rounded-xl border border-[#EAEAEA] bg-white p-5 transition-all duration-150 hover:shadow-xs {onclick
		? 'cursor-pointer hover:border-[#D0CFCB]'
		: ''}"
	{onclick}
>
	<div
		class="flex items-center gap-2 text-[11px] font-medium tracking-wider text-[#787774] uppercase"
	>
		{#if icon}
			{@render icon()}
		{/if}
		<span>{label}</span>
	</div>

	<div class="serif my-1.5 text-2xl font-medium tracking-tight {valueColor} sm:text-[26px]">
		{value}
	</div>

	{#if subtext}
		<div class="text-xs text-[#787774]">
			{subtext}
		</div>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
