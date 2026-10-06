<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';

	let dragging = $state(false);
	let startX = $state(0);
	let startWidth = $state(0);

	function onPointerDown(e: PointerEvent) {
		if (chatStore.maximized) return;
		dragging = true;
		startX = e.clientX;
		startWidth = chatStore.panelWidth;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging || chatStore.maximized) return;
		const delta = startX - e.clientX;
		chatStore.setPanelWidth(startWidth + delta);
	}

	function onPointerUp() {
		dragging = false;
	}

	function onDoubleClick() {
		if (chatStore.maximized) return;
		chatStore.setPanelWidth(360);
	}
</script>

<div
	class="absolute top-0 left-0 z-10 h-full w-2 -translate-x-1 cursor-col-resize transition-colors hover:bg-[#eaeaea] active:bg-[#111111] {dragging
		? 'bg-[#111111]'
		: ''}"
	role="separator"
	aria-label="Ubah lebar panel"
	aria-orientation="vertical"
	title="Seret untuk ubah lebar, klik ganda untuk reset"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	ondblclick={onDoubleClick}
></div>
