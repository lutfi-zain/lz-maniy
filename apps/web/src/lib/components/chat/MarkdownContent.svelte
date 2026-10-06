<script lang="ts">
	import { marked } from 'marked';

	let { content }: { content: string } = $props();

	// Configure marked options
	marked.setOptions({
		gfm: true,
		breaks: true
	});

	const renderedHtml = $derived.by(() => {
		if (!content) return '';
		try {
			const raw = marked.parse(content) as string;
			return raw.replace(
				/<table>([\s\S]*?)<\/table>/g,
				'<div class="table-scroll"><table>$1</table></div>'
			);
		} catch {
			return content;
		}
	});
</script>

<div class="markdown-body text-[13px] leading-relaxed text-[#111111]">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html renderedHtml}
</div>

<style>
	:global(.markdown-body) {
		color: #111111;
		font-family: inherit;
		line-height: 1.6;
	}

	:global(.markdown-body h1, .markdown-body h2, .markdown-body h3) {
		font-weight: 600;
		color: #111111;
		margin-top: 0.75rem;
		margin-bottom: 0.25rem;
		line-height: 1.3;
	}

	:global(.markdown-body h2) {
		font-size: 14px;
	}

	:global(.markdown-body h3) {
		font-size: 13px;
	}

	:global(.markdown-body p) {
		margin-bottom: 0.5rem;
	}

	:global(.markdown-body p:last-child) {
		margin-bottom: 0;
	}

	:global(.markdown-body ul, .markdown-body ol) {
		margin-left: 1.25rem;
		margin-bottom: 0.5rem;
		list-style-type: disc;
	}

	:global(.markdown-body li) {
		margin-bottom: 0.2rem;
	}

	:global(.markdown-body strong) {
		font-weight: 600;
		color: #111111;
	}

	:global(.markdown-body .table-scroll) {
		overflow-x: auto;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	:global(.markdown-body .table-scroll table) {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	:global(.markdown-body th, .markdown-body td) {
		border: 1px solid #eaeaea;
		padding: 4px 8px;
		text-align: left;
	}

	:global(.markdown-body th) {
		background-color: #f7f6f3;
		font-weight: 600;
		color: #787774;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.markdown-body tr:hover td) {
		background-color: #fcfbf9;
	}

	:global(.markdown-body code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		background: #f7f6f3;
		border: 1px solid #eaeaea;
		border-radius: 3px;
		padding: 1px 4px;
	}

	:global(.markdown-body pre) {
		background: #f7f6f3;
		border: 1px solid #eaeaea;
		border-radius: 6px;
		padding: 8px;
		overflow-x: auto;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	:global(.markdown-body pre code) {
		background: transparent;
		border: none;
		padding: 0;
	}
</style>
