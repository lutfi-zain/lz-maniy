<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { dFmt } from '$lib/utils/dates';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import type { ActiveDebt, ActiveLoan } from '$lib/types/account-detail';

	let {
		item,
		type
	}: {
		item: ActiveDebt | ActiveLoan;
		type: 'debt' | 'loan';
	} = $props();

	const isDebt = $derived(type === 'debt');

	function handleClick() {
		reedrichStore.openDrawer({
			type: 'obligation',
			title: item.personName,
			subtitle: `${i18nStore.locale === 'id' ? 'Jatuh tempo' : 'Due'}: ${dFmt(item.dueDate)} · Status: ${item.status}`,
			badge: isDebt
				? i18nStore.locale === 'id'
					? 'KEWAJIBAN UTANG'
					: 'DEBT / PAYABLE'
				: i18nStore.locale === 'id'
					? 'PIUTANG / TALANGAN'
					: 'LOAN / RECEIVABLE',
			data: { item, type }
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group mb-2 flex cursor-pointer items-center justify-between rounded-lg border border-[#EAEAEA] bg-white p-3.5 transition-all duration-150 last:mb-0 hover:border-[#C8C6BF] hover:shadow-xs"
	onclick={handleClick}
>
	<div>
		<div class="text-xs font-semibold text-[#111111] sm:text-sm">
			{item.personName}
		</div>
		<div class="mt-0.5 text-xs text-[#787774]">
			{i18nStore.locale === 'id' ? 'Jatuh tempo' : 'Due'}: {dFmt(item.dueDate)} ·
			<span class="capitalize">{item.status}</span>
		</div>
	</div>

	<div class="text-right">
		<div class="font-mono text-sm font-semibold {isDebt ? 'text-[#9F2F2D]' : 'text-[#346538]'}">
			{isDebt ? '−' : '+'}{fmtIDR(item.remainingAmount)}
		</div>
		<div
			class="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-[#787774] transition-colors group-hover:text-[#111111]"
		>
			<ArrowRight class="size-3" weight="bold" />
			<span>Detail</span>
		</div>
	</div>
</div>
