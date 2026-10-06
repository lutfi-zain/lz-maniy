<script lang="ts">
	import { tick } from 'svelte';
	import { ArrowUp, Stop, PaperclipHorizontal, FileText } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { PUBLIC_AGENT_URL, PUBLIC_API_URL } from '$env/static/public';
	import type { StatementParseResult, StatementFileStatus } from '@maniyy/shared';
	import ImageAttachmentPreview from './ImageAttachmentPreview.svelte';
	import StatementAttachmentPreview from './StatementAttachmentPreview.svelte';

	let inputText = $state('');
	let stagedImage = $state<{ data: string; mimeType: string; previewUrl: string } | null>(null);
	let stagedPdfs = $state<
		Array<{
			file: File;
			status: 'queued' | 'parsing' | 'ready' | 'error';
			result?: StatementFileStatus;
		}>
	>([]);
	let statementSessionId = $state<string | null>(null);
	let statementTotals = $state<{ files: number; pages: number; rows: number } | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);
	let fileInputEl = $state<HTMLInputElement | undefined>(undefined);
	let pdfInputEl = $state<HTMLInputElement | undefined>(undefined);

	$effect(() => {
		if (chatStore.panelOpen && !chatStore.showConversationList && textareaEl) {
			const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
			if (isDesktop) {
				tick().then(() => {
					const active = typeof document !== 'undefined' ? document.activeElement : null;
					const isInOtherInput =
						active &&
						active !== document.body &&
						active !== textareaEl &&
						(active.tagName === 'INPUT' ||
							active.tagName === 'TEXTAREA' ||
							active.getAttribute('contenteditable') === 'true');
					if (!isInOtherInput) {
						textareaEl?.focus();
					}
				});
			}
		}
	});
	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		const maxHeight = parseInt(getComputedStyle(textareaEl).lineHeight) * 6;
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, maxHeight) + 'px';
	}

	async function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			const base64 = dataUrl.split(',')[1];
			stagedImage = { data: base64, mimeType: file.type, previewUrl: dataUrl };
		};
		reader.readAsDataURL(file);
	}

	async function handlePdfChange(e: Event) {
		const picked = Array.from((e.target as HTMLInputElement).files ?? []);
		if (picked.length === 0) return;
		for (const file of picked) {
			stagedPdfs.push({ file, status: 'queued' });
		}
		if (pdfInputEl) pdfInputEl.value = '';
		await parseQueuedPdfs();
	}

	async function parseQueuedPdfs() {
		const pending = stagedPdfs
			.map((entry, index) => ({ entry, index }))
			.filter(({ entry }) => entry.status === 'queued');
		if (pending.length === 0) return;
		const form = new FormData();
		for (const { entry, index } of pending) {
			entry.status = 'parsing';
			stagedPdfs[index] = entry;
			form.append('files', entry.file);
		}
		try {
			const token = (await authStore.getValidToken(PUBLIC_API_URL)) || authStore.accessToken;
			const res = await fetch(`${PUBLIC_AGENT_URL}/api/statements/parse`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: form
			});
			if (!res.ok) throw new Error(`Parse gagal: HTTP ${res.status}`);
			const result = (await res.json()) as StatementParseResult;
			statementSessionId = result.sessionId;
			const byName = new Map(result.files.map((f) => [f.fileName, f]));
			for (const { entry, index } of pending) {
				const match = byName.get(entry.file.name);
				entry.status = match?.status === 'ready' ? 'ready' : 'error';
				entry.result = match;
				stagedPdfs[index] = entry;
			}
			statementTotals = {
				files: result.files.length,
				pages: result.totalPages,
				rows: result.totalRows
			};
		} catch {
			for (const { entry, index } of pending) {
				entry.status = 'error';
				entry.result = { fileName: entry.file.name, status: 'error', error: 'Gagal menghubungi layanan parse.' };
				stagedPdfs[index] = entry;
			}
		}
	}

	function removeStagedPdf(index: number) {
		stagedPdfs.splice(index, 1);
		if (stagedPdfs.length === 0) {
			statementSessionId = null;
			statementTotals = null;
		}
	}

	async function send() {
		const hasStatement = statementSessionId !== null && stagedPdfs.some((e) => e.status === 'ready');
		if (chatStore.isStreaming || (!inputText.trim() && !stagedImage && !hasStatement)) return;
		const text = inputText;
		const img = stagedImage
			? { data: stagedImage.data, mimeType: stagedImage.mimeType }
			: undefined;
		const sessionId = hasStatement ? statementSessionId : undefined;
		inputText = '';
		stagedImage = null;
		stagedPdfs = [];
		statementSessionId = null;
		statementTotals = null;
		if (textareaEl) textareaEl.style.height = 'auto';
		await chatStore.sendMessage(text, img, sessionId ?? undefined);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="shrink-0 border-t border-[#eaeaea] bg-white px-3 py-2">
	{#if stagedImage}
		<ImageAttachmentPreview
			previewUrl={stagedImage.previewUrl}
			onremove={() => (stagedImage = null)}
		/>
	{/if}
	{#if stagedPdfs.length > 0}
		<StatementAttachmentPreview files={stagedPdfs} onremove={removeStagedPdf} />
		{#if statementTotals}
			<div class="mb-2 font-mono text-[10px] text-[#787774]">
				{statementTotals.files} file · {statementTotals.pages} hlm · {statementTotals.rows} baris siap dianalisis
			</div>
		{/if}
	{/if}
	<div class="flex items-end gap-2">
		<textarea
			bind:this={textareaEl}
			bind:value={inputText}
			onkeydown={onKeydown}
			oninput={autoResize}
			placeholder={chatStore.creditsRemaining !== null && chatStore.creditsRemaining <= 0
				? 'Kredit habis. Hubungi admin untuk top-up.'
				: 'Tulis pesan...'}
			disabled={chatStore.isStreaming ||
				(chatStore.creditsRemaining !== null && chatStore.creditsRemaining <= 0)}
			rows={1}
			data-chat-input
			class="max-h-36 flex-1 resize-none overflow-y-auto bg-transparent py-1 font-sans text-[13px] text-[#111111] placeholder-[#787774] outline-none disabled:opacity-50"
		></textarea>

		<button
			onclick={() => fileInputEl?.click()}
			disabled={chatStore.isStreaming}
			class="p-1 text-[#787774] transition-colors hover:text-[#111111] disabled:opacity-30"
			aria-label="Lampirkan gambar"
		>
			<PaperclipHorizontal size={16} weight="bold" />
		</button>

		<button
			onclick={() => pdfInputEl?.click()}
			disabled={chatStore.isStreaming}
			class="p-1 text-[#787774] transition-colors hover:text-[#111111] disabled:opacity-30"
			aria-label="Lampirkan rekening koran (PDF)"
			title="Lampirkan rekening koran (PDF)"
		>
			<FileText size={16} weight="bold" />
		</button>

		{#if chatStore.isStreaming}
			<button
				onclick={() => chatStore.abortStream()}
				class="rounded bg-[#111111] p-1.5 text-white transition-colors hover:bg-[#333]"
				aria-label="Hentikan"
			>
				<Stop size={14} weight="fill" />
			</button>
		{:else}
			<button
				onclick={send}
				disabled={(!inputText.trim() && !stagedImage && stagedPdfs.filter((e) => e.status === 'ready').length === 0) ||
					(chatStore.creditsRemaining !== null && chatStore.creditsRemaining <= 0)}
				class="rounded bg-[#111111] p-1.5 text-white transition-colors hover:bg-[#333] disabled:opacity-30"
				aria-label="Kirim pesan"
			>
				<ArrowUp size={14} weight="bold" />
			</button>
		{/if}
	</div>

	<input
		bind:this={fileInputEl}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={handleFileChange}
	/>
	<input
		bind:this={pdfInputEl}
		type="file"
		accept="application/pdf,.pdf"
		multiple
		class="hidden"
		onchange={handlePdfChange}
	/>
</div>
