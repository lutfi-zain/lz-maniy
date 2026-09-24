<script lang="ts">
	import CockpitKpiStrip from '$lib/components/cockpit/CockpitKpiStrip.svelte';
	import CockpitAlertBanner from '$lib/components/cockpit/CockpitAlertBanner.svelte';
	import CockpitBankWidget from '$lib/components/cockpit/CockpitBankWidget.svelte';
	import CockpitRecentLedger from '$lib/components/cockpit/CockpitRecentLedger.svelte';
	import CockpitAllocationWidget from '$lib/components/cockpit/CockpitAllocationWidget.svelte';
</script>

<div class="space-y-4">
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
