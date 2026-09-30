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

<div class="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
	<p class="text-[13px] text-[#787774]">Tanya apa saja tentang keuanganmu</p>
	<div class="flex w-full max-w-xs flex-col gap-2">
		{#each suggestions as suggestion}
			<button
				class="w-full rounded border border-[#eaeaea] bg-[#f7f6f3] px-3 py-2 text-left text-[12px] text-[#111111] transition-colors hover:bg-white"
				onclick={() => chatStore.sendMessage(suggestion)}
			>
				{suggestion}
			</button>
		{/each}
	</div>
</div>
