<script lang="ts">
	import { CaretDown, CaretRight, Wrench, CheckCircle } from 'phosphor-svelte';
	import type { ToolInvocationItem } from '@maniyy/shared';

	let { invocation }: { invocation: ToolInvocationItem } = $props();
	let open = $state(false);

	const isCompleted = $derived(invocation.state === 'result');

	function formatToolName(name: string): string {
		switch (name) {
			case 'get_snapshot':
				return 'Mengambil data keuangan & portofolio';
			case 'list_transactions':
				return 'Mencari daftar transaksi';
			case 'get_categories':
				return 'Melihat kategori transaksi';
			case 'get_user_profile':
				return 'Membaca profil akun';
			case 'create_transaction':
				return 'Mencatat transaksi baru';
			case 'create_transfer':
				return 'Mencatat transfer antar dompet';
			case 'update_transaction':
				return 'Memperbarui transaksi';
			case 'delete_transaction':
				return 'Menghapus transaksi';
			case 'navigate_page':
				return 'Navigasi halaman';
			case 'change_filter':
				return 'Mengubah filter akun';
			case 'change_tab':
				return 'Mengganti tab tampilan';
			case 'change_date_range':
				return 'Mengatur rentang tanggal';
			case 'open_drawer':
				return 'Membuka panel drawer';
			case 'open_transaction_form':
				return 'Membuka form transaksi';
			case 'focus_element':
				return 'Mengarahkan fokus elemen';
			default:
				return `Menjalankan ${name}`;
		}
	}
</script>

<div class="my-1.5 overflow-hidden rounded border border-[#EAEAEA] bg-[#F9F9F8] text-[11px] font-sans">
	<button
		type="button"
		class="flex w-full cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[#787774] transition-colors hover:bg-white hover:text-[#111111]"
		onclick={() => (open = !open)}
	>
		<div class="flex items-center gap-1.5 min-w-0">
			{#if isCompleted}
				<CheckCircle size={13} weight="bold" class="text-[#346538] shrink-0" />
			{:else}
				<span class="inline-block size-2 rounded-full bg-[#1F6C9F] animate-pulse shrink-0"></span>
			{/if}
			<span class="font-medium truncate text-[#111111]">{formatToolName(invocation.toolName)}</span>
			<span class="font-mono text-[10px] text-[#A8A29E]">({invocation.toolName})</span>
		</div>
		<div class="shrink-0 text-[#787774]">
			{#if open}
				<CaretDown size={12} weight="bold" />
			{:else}
				<CaretRight size={12} weight="bold" />
			{/if}
		</div>
	</button>

	{#if open}
		<div class="border-t border-[#EAEAEA] bg-white p-2.5 font-mono text-[10px] text-[#787774] overflow-x-auto max-h-48">
			{#if Object.keys(invocation.args || {}).length > 0}
				<div class="mb-1.5">
					<span class="font-semibold text-[#111111]">Parameter:</span>
					<pre class="mt-0.5 whitespace-pre-wrap">{JSON.stringify(invocation.args, null, 2)}</pre>
				</div>
			{/if}
			{#if invocation.result !== undefined}
				<div>
					<span class="font-semibold text-[#111111]">Hasil:</span>
					<pre class="mt-0.5 whitespace-pre-wrap">{JSON.stringify(invocation.result, null, 2)}</pre>
				</div>
			{:else}
				<span class="italic text-[#A8A29E]">Sedang memproses...</span>
			{/if}
		</div>
	{/if}
</div>
