<script lang="ts">
	import CockpitKpiStrip from '$lib/components/cockpit/CockpitKpiStrip.svelte';
	import CockpitAlertBanner from '$lib/components/cockpit/CockpitAlertBanner.svelte';
	import CockpitBankWidget from '$lib/components/cockpit/CockpitBankWidget.svelte';
	import CockpitRecentLedger from '$lib/components/cockpit/CockpitRecentLedger.svelte';
	import CockpitAllocationWidget from '$lib/components/cockpit/CockpitAllocationWidget.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

	const greetingName = $derived(
		authStore.user?.firstName ||
			authStore.user?.fullName?.split(' ')[0] ||
			authStore.user?.name ||
			'Pengguna'
	);
</script>

<div class="space-y-4">
	<!-- Editorial Workspace Greeting -->
	<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAEAEA] pb-2.5">
		<div>
			<h1 class="font-serif text-xl font-semibold tracking-tight text-[#111111]">
				Ringkasan Portofolio · {greetingName}
			</h1>
			<p class="mt-0.5 text-xs text-[#787774]">
				Konsolidasi kekayaan bersih, likuiditas bebas, dan arus kas multi-rekening terintegrasi.
			</p>
		</div>
		{#if authStore.user?.email}
			<span class="font-mono text-[11px] text-[#787774]">
				{authStore.user.email}
			</span>
		{/if}
	</div>

	<!-- Top Executive KPI Strip -->
	<CockpitKpiStrip />

	<!-- Critical Pacing / Runway Alert -->
	<CockpitAlertBanner />

	<!-- 3-Column Operational Workbench -->
	<div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.8fr_1fr]">
		<!-- Left: Bank Accounts & Subtotals -->
		<CockpitBankWidget />

		<!-- Center: Live Recent Transaction Feed -->
		<CockpitRecentLedger />

		<!-- Right: Monthly Expense Breakdown & Active Budgets -->
		<CockpitAllocationWidget />
	</div>
</div>
