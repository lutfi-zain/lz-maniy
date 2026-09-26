<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte.js';

	let dragging = $state(false);
	let startX = $state(0);
	let startWidth = $state(0);

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		startX = e.clientX;
		startWidth = chatStore.panelWidth;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const delta = startX - e.clientX;
		chatStore.setPanelWidth(startWidth + delta);
	}

	function onPointerUp() {
		dragging = false;
	}
</script>

<div
	class="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#eaeaea] active:bg-[#111111] transition-colors z-10 {dragging ? 'bg-[#111111]' : ''}"
	role="separator"
	aria-label="Ubah lebar panel"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
></div>
