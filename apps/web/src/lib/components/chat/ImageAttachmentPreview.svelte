<script lang="ts">
	import { X } from 'phosphor-svelte';
	let { previewUrl, onremove }: { previewUrl: string; onremove: () => void } = $props();
</script>

<div class="relative mb-2 inline-block">
	<img
		src={previewUrl}
		alt="Pratinjau"
		class="h-16 w-16 rounded border border-[#eaeaea] object-cover"
	/>
	<button
		onclick={onremove}
		class="absolute -top-1.5 -right-1.5 rounded-full border border-[#eaeaea] bg-white p-0.5 text-[#787774] transition-colors hover:text-[#111111]"
		aria-label="Hapus gambar"
	>
		<X size={10} weight="bold" />
	</button>
</div>
