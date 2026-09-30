<script lang="ts">
	import { DownloadSimple, UploadSimple } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';

	let open = $state(false);
	let importing = $state(false);
	let importResult = $state<{ imported: number; skipped: number } | null>(null);
	let error = $state<string | null>(null);
	let fileInputEl = $state<HTMLInputElement | undefined>(undefined);

	async function handleImport(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		importing = true;
		error = null;
		try {
			importResult = await chatStore.importConversations(file);
		} catch (err) {
			error = 'Format file tidak valid';
		} finally {
			importing = false;
		}
	}
</script>

<div class="relative">
	<button
		onclick={() => (open = !open)}
		class="rounded p-1 text-[#787774] transition-colors hover:bg-[#eaeaea]"
		aria-label="Export/Import"
	>
		<DownloadSimple size={14} weight="bold" />
	</button>

	{#if open}
		<div
			class="absolute top-full right-0 z-50 mt-1 flex min-w-[160px] flex-col gap-2 rounded border border-[#eaeaea] bg-white px-3 py-2 shadow-sm"
			role="menu"
		>
			<button
				class="flex items-center gap-2 text-[12px] text-[#111111] transition-colors hover:text-[#787774]"
				onclick={async () => {
					await chatStore.exportConversations();
					open = false;
				}}
			>
				<DownloadSimple size={12} weight="bold" /> Export semua
			</button>
			<button
				class="flex items-center gap-2 text-[12px] text-[#111111] transition-colors hover:text-[#787774]"
				onclick={() => fileInputEl?.click()}
			>
				<UploadSimple size={12} weight="bold" /> Import JSON
			</button>
			{#if importResult}
				<p class="text-[11px] text-[#346538]">Imported: {importResult.imported}</p>
			{/if}
			{#if error}
				<p class="text-[11px] text-[#9f2f2d]">{error}</p>
			{/if}
		</div>
		<div class="fixed inset-0 z-40" role="presentation" onclick={() => (open = false)}></div>
	{/if}

	<input
		bind:this={fileInputEl}
		type="file"
		accept=".json"
		class="hidden"
		onchange={handleImport}
		disabled={importing}
	/>
</div>
