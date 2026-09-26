<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';

	const suggestions = [
		'Saldo saya berapa?',
		'Transaksi terakhir apa saja?',
		'Buka halaman planning',
		'Tampilkan budget bulan ini',
		'Ada pengeluaran yang tidak biasa?'
	];
</script>

<div class="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-8 text-center">
	<p class="text-[13px] text-[#787774]">
		Tanya apa saja tentang keuanganmu
	</p>
	<div class="flex flex-col gap-2 w-full max-w-xs">
		{#each suggestions as suggestion}
			<button
				class="text-left text-[12px] text-[#111111] px-3 py-2 rounded border border-[#eaeaea] bg-[#f7f6f3] hover:bg-white transition-colors w-full"
				onclick={() => chatStore.sendMessage(suggestion)}
			>
				{suggestion}
			</button>
		{/each}
	</div>
</div>
