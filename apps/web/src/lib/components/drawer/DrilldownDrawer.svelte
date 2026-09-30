<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import X from 'phosphor-svelte/lib/X';
	import WalletDrawerContent from './WalletDrawerContent.svelte';
	import CategoryDrawerContent from './CategoryDrawerContent.svelte';
	import BudgetDrawerContent from './BudgetDrawerContent.svelte';
	import GoalDrawerContent from './GoalDrawerContent.svelte';
	import ObligationDrawerContent from './ObligationDrawerContent.svelte';
	import NetWorthDrawerContent from './NetWorthDrawerContent.svelte';
	import WalletFormContent from './WalletFormContent.svelte';
	import CategoryFormContent from './CategoryFormContent.svelte';
	import BudgetFormContent from './BudgetFormContent.svelte';
	import GoalFormContent from './GoalFormContent.svelte';
	import RecurringDetailContent from './RecurringDetailContent.svelte';
	import RecurringFormContent from './RecurringFormContent.svelte';
	import ProfileFormContent from './ProfileFormContent.svelte';
	import type {
		WalletItem,
		CategoryBreakdownItem,
		BudgetSnapshot,
		GoalSnapshot,
		RecurringTemplate,
		ActiveDebt,
		ActiveLoan,
		NetWorthSnapshot
	} from '$lib/types/account-detail';

	const activeDrawer = $derived(reedrichStore.activeDrawer);
	const isOpen = $derived(activeDrawer !== null);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			reedrichStore.closeDrawer();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-black/25 backdrop-blur-xs transition-opacity duration-200 {isOpen
		? 'pointer-events-auto opacity-100'
		: 'pointer-events-none opacity-0'}"
	onclick={() => reedrichStore.closeDrawer()}
></div>

<!-- Slide-Over Drawer Container -->
<div
	class="shadow-minimal fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[620px] flex-col border-l border-[#EAEAEA] bg-white transition-all duration-300 ease-out {isOpen
		? 'translate-x-0 opacity-100'
		: 'pointer-events-none invisible translate-x-full opacity-0'}"
	aria-labelledby="drawer-title"
	role="dialog"
	aria-modal="true"
>
	{#if activeDrawer}
		<!-- Drawer Header -->
		<div class="flex items-start justify-between border-b border-[#EAEAEA] bg-[#F9F9F8] px-6 py-4">
			<div>
				<span
					class="rounded-full bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#111111] uppercase"
				>
					{activeDrawer.badge}
				</span>
				<h2 id="drawer-title" class="serif mt-1 text-2xl font-medium text-[#111111]">
					{activeDrawer.title}
				</h2>
				<p class="mt-0.5 text-xs text-[#787774]">
					{activeDrawer.subtitle}
				</p>
			</div>

			<button
				type="button"
				onclick={() => reedrichStore.closeDrawer()}
				class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#787774] transition-all hover:border-[#111111] hover:bg-[#111111] hover:text-white"
			>
				<kbd class="text-[10px]">ESC</kbd>
				<X class="size-3.5" weight="bold" />
			</button>
		</div>

		<!-- Drawer Body Content -->
		<div class="flex-1 overflow-y-auto px-6 py-5">
			{#if activeDrawer.type === 'wallet'}
				<WalletDrawerContent wallet={activeDrawer.data.wallet as WalletItem} />
			{:else if activeDrawer.type === 'wallet-form'}
				<WalletFormContent />
			{:else if activeDrawer.type === 'category'}
				<CategoryDrawerContent item={activeDrawer.data.item as CategoryBreakdownItem} />
			{:else if activeDrawer.type === 'category-form'}
				<CategoryFormContent />
			{:else if activeDrawer.type === 'budget'}
				<BudgetDrawerContent budget={activeDrawer.data.budget as BudgetSnapshot} />
			{:else if activeDrawer.type === 'budget-form'}
				<BudgetFormContent />
			{:else if activeDrawer.type === 'goal'}
				<GoalDrawerContent goal={activeDrawer.data.goal as GoalSnapshot} />
			{:else if activeDrawer.type === 'goal-form'}
				<GoalFormContent />
			{:else if activeDrawer.type === 'recurring-detail'}
				<RecurringDetailContent template={activeDrawer.data.template as RecurringTemplate} />
			{:else if activeDrawer.type === 'recurring-form'}
				<RecurringFormContent />
			{:else if activeDrawer.type === 'profile-form'}
				<ProfileFormContent />
			{:else if activeDrawer.type === 'obligation'}
				<ObligationDrawerContent
					item={activeDrawer.data.item as ActiveDebt | ActiveLoan}
					type={activeDrawer.data.type as 'debt' | 'loan'}
				/>
			{:else if activeDrawer.type === 'networth'}
				<NetWorthDrawerContent netWorth={activeDrawer.data.netWorth as NetWorthSnapshot} />
			{/if}
		</div>
	{/if}
</div>
