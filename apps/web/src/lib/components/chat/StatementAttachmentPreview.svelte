<script lang="ts">
	import { X, FileText, CircleNotch, CheckCircle, WarningCircle } from 'phosphor-svelte';
	import type { StatementFileStatus } from '@maniy/shared';

	let {
		files,
		onremove
	}: {
		files: Array<{ file: File; status: 'queued' | 'parsing' | 'ready' | 'error'; result?: StatementFileStatus }>;
		onremove: (index: number) => void;
	} = $props();
</script>

<div class="mb-2 flex flex-col gap-1.5">
	{#each files as entry, i (entry.file.name + i)}
		<div
			class="flex items-center gap-2 rounded border border-[#eaeaea] bg-[#F9F9F8] px-2 py-1.5 text-[12px]"
		>
			<FileText size={14} weight="bold" class="shrink-0 text-[#787774]" />
			<div class="min-w-0 flex-1">
				<div class="truncate font-medium text-[#111111]">{entry.file.name}</div>
				<div class="font-mono text-[10px] text-[#787774]">
					{#if entry.status === 'queued'}
						Menunggu antrean...
					{:else if entry.status === 'parsing'}
						Mengekstrak teks...
					{:else if entry.status === 'ready' && entry.result}
						{entry.result.pageCount ?? '?'} hlm · {entry.result.rowCount ?? 0} baris{entry.result
							.bank
							? ` · ${entry.result.bank}`
							: ''}
					{:else if entry.status === 'error'}
						<span class="text-[#9F2F2D]">{entry.result?.error ?? 'Gagal mem-parse.'}</span>
					{/if}
				</div>
			</div>
			{#if entry.status === 'parsing' || entry.status === 'queued'}
				<CircleNotch size={14} class="shrink-0 animate-spin text-[#787774]" />
			{:else if entry.status === 'ready'}
				<CheckCircle size={14} weight="fill" class="shrink-0 text-[#346538]" />
			{:else}
				<WarningCircle size={14} weight="fill" class="shrink-0 text-[#9F2F2D]" />
			{/if}
			<button
				type="button"
				onclick={() => onremove(i)}
				class="shrink-0 rounded p-0.5 text-[#787774] transition-colors hover:bg-white hover:text-[#111111]"
				aria-label="Hapus {entry.file.name}"
			>
				<X size={12} weight="bold" />
			</button>
		</div>
	{/each}
</div>
