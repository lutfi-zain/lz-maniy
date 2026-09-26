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
		class="max-w-full rounded border border-[#eaeaea] max-h-48 object-contain"
		onerror={() => (failed = true)}
	/>
{/if}
