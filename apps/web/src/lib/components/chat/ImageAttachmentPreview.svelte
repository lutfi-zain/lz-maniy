<script lang="ts">
	import { X } from 'phosphor-svelte';
	let { previewUrl, onremove }: { previewUrl: string; onremove: () => void } = $props();
</script>

<div class="relative inline-block mb-2">
	<img src={previewUrl} alt="Pratinjau" class="h-16 w-16 rounded object-cover border border-[#eaeaea]" />
	<button
		onclick={onremove}
		class="absolute -top-1.5 -right-1.5 bg-white border border-[#eaeaea] rounded-full p-0.5 text-[#787774] hover:text-[#111111] transition-colors"
		aria-label="Hapus gambar"
	>
		<X size={10} weight="bold" />
	</button>
</div>
