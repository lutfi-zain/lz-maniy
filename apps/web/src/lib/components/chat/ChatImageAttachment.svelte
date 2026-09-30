<script lang="ts">
	let { src, alt = 'Lampiran gambar' }: { src: string; alt?: string } = $props();
	let failed = $state(false);
</script>

{#if failed}
	<span class="text-[12px] text-[#787774] italic">Gambar tidak tersedia</span>
{:else}
	<img
		{src}
		{alt}
		class="max-h-48 max-w-full rounded border border-[#eaeaea] object-contain"
		onerror={() => (failed = true)}
	/>
{/if}
