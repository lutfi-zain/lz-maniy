<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className = '', ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	class={cn('animate-pulse rounded-md bg-[#EFEFED]', className)}
	role="status"
	aria-label="Memuat..."
	{...restProps}
></div>
