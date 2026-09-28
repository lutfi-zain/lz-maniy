<script lang="ts">
	import { tick } from 'svelte';
	import { ArrowUp, Stop, PaperclipHorizontal } from 'phosphor-svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import ImageAttachmentPreview from './ImageAttachmentPreview.svelte';

	let inputText = $state('');
	let stagedImage = $state<{ data: string; mimeType: string; previewUrl: string } | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);
	let fileInputEl = $state<HTMLInputElement | undefined>(undefined);

	$effect(() => {
		if (chatStore.panelOpen && !chatStore.showConversationList && textareaEl) {
			const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
			if (isDesktop) {
				tick().then(() => {
					textareaEl?.focus();
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

	async function send() {
		if (chatStore.isStreaming || (!inputText.trim() && !stagedImage)) return;
		const text = inputText;
		const img = stagedImage ? { data: stagedImage.data, mimeType: stagedImage.mimeType } : undefined;
		inputText = '';
		stagedImage = null;
		if (textareaEl) textareaEl.style.height = 'auto';
		await chatStore.sendMessage(text, img);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="border-t border-[#eaeaea] bg-white px-3 py-2 shrink-0">
	{#if stagedImage}
		<ImageAttachmentPreview previewUrl={stagedImage.previewUrl} onremove={() => (stagedImage = null)} />
	{/if}
	<div class="flex items-end gap-2">
		<textarea
			bind:this={textareaEl}
			bind:value={inputText}
			onkeydown={onKeydown}
			oninput={autoResize}
			placeholder="Tulis pesan..."
			disabled={chatStore.isStreaming}
			rows={1}
			data-chat-input
			class="flex-1 resize-none bg-transparent text-[13px] font-sans text-[#111111] placeholder-[#787774] outline-none py-1 max-h-36 overflow-y-auto disabled:opacity-50"
		></textarea>

		<button
			onclick={() => fileInputEl?.click()}
			disabled={chatStore.isStreaming}
			class="p-1 text-[#787774] hover:text-[#111111] transition-colors disabled:opacity-30"
			aria-label="Lampirkan gambar"
		>
			<PaperclipHorizontal size={16} weight="bold" />
		</button>

		{#if chatStore.isStreaming}
			<button
				onclick={() => chatStore.abortStream()}
				class="p-1.5 rounded bg-[#111111] text-white hover:bg-[#333] transition-colors"
				aria-label="Hentikan"
			>
				<Stop size={14} weight="fill" />
			</button>
		{:else}
			<button
				onclick={send}
				disabled={!inputText.trim() && !stagedImage}
				class="p-1.5 rounded bg-[#111111] text-white hover:bg-[#333] transition-colors disabled:opacity-30"
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
</div>
