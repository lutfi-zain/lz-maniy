<script lang="ts">
	import LockKey from 'phosphor-svelte/lib/LockKey';

	let {
		status
	}: {
		status: 0 | 1 | boolean | 'locked' | 'spendable';
	} = $props();

	const isLocked = $derived(status === 1 || status === true || status === 'locked');
</script>

<div
	class="inline-flex items-center gap-1.5 font-mono text-[11px] {isLocked
		? 'text-[#956400]'
		: 'text-[#346538]'}"
	title={isLocked ? 'Dana cadangan / pos darurat terikat' : 'Kas operasional siap dibelanjakan'}
>
	{#if isLocked}
		<LockKey class="size-3 shrink-0 text-[#956400]" weight="bold" />
		<span>Cadangan</span>
	{:else}
		<span class="size-1.5 shrink-0 rounded-full bg-[#346538]"></span>
		<span>Operasional</span>
	{/if}
</div>
