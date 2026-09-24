<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import Tag from 'phosphor-svelte/lib/Tag';
	import type { CategoryBreakdownItem } from '$lib/types/account-detail';

	let { item }: { item: CategoryBreakdownItem } = $props();

	function handleClick() {
		reedrichStore.openDrawer({
			type: 'category',
			title: item.categoryName,
			subtitle: `Total pengeluaran bulan ini: ${fmtIDR(item.amount)} (${item.percentage}% dari seluruh pengeluaran)`,
			badge: 'KATEGORI PENGELUARAN',
			data: { item }
		});

		// Find category ID from category map if possible
		const cat = reedrichStore.categories.find(
			(c) => c.categoryName.toLowerCase() === item.categoryName.toLowerCase()
		);
		reedrichStore.fetchTransactionsForDrawer({
			categoryId: cat?.categoryId,
			limit: 50
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="grid cursor-pointer grid-cols-[minmax(130px,1.2fr)_1fr_120px] items-center gap-3 rounded-md border-b border-[#EAEAEA] p-2.5 transition-colors last:border-b-0 hover:bg-[#F9F9F8]"
	onclick={handleClick}
>
	<div class="flex items-center gap-1.5 truncate text-xs font-medium text-[#111111]">
		<Tag class="size-3 shrink-0 text-[#787774]" weight="bold" />
		<span class="truncate">{item.categoryName}</span>
	</div>

	<div class="h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEC]">
		<div
			class="h-full bg-[#111111] transition-all"
			style="width: {Math.min(100, item.percentage * 2.8)}%"
		></div>
	</div>

	<div class="text-right font-mono text-xs whitespace-nowrap">
		<span class="font-semibold text-[#111111]">{fmtIDR(item.amount)}</span>
		<span class="ml-1 text-[11px] text-[#787774]">({item.percentage}%)</span>
	</div>
</div>
