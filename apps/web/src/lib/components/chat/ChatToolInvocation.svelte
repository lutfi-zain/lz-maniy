<script lang="ts">
	let { toolName, status }: { toolName: string; status: 'pending' | 'success' | 'error' } = $props();
	let open = $state(false);
</script>

<button
	class="inline-flex items-center gap-1.5 text-[11px] text-[#787774] px-2 py-0.5 rounded border border-[#eaeaea] bg-[#f7f6f3] hover:bg-white transition-colors"
	onclick={() => (open = !open)}
>
	<span class="inline-block w-1.5 h-1.5 rounded-full {status === 'success' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-yellow-400'}"></span>
	{toolName}
</button>
