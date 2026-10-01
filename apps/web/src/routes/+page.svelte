<script lang="ts">
	import CockpitKpiStrip from '$lib/components/cockpit/CockpitKpiStrip.svelte';
	import CockpitAlertBanner from '$lib/components/cockpit/CockpitAlertBanner.svelte';
	import CockpitBankWidget from '$lib/components/cockpit/CockpitBankWidget.svelte';
	import CockpitRecentLedger from '$lib/components/cockpit/CockpitRecentLedger.svelte';
	import CockpitAllocationWidget from '$lib/components/cockpit/CockpitAllocationWidget.svelte';
	import CockpitCashflowTimeline from '$lib/components/cockpit/CockpitCashflowTimeline.svelte';
</script>

<div class="max-w-full space-y-4 overflow-hidden">
	<!-- Top Executive KPI Strip -->
	<CockpitKpiStrip />

	<!-- Critical Pacing / Runway Alert -->
	<CockpitAlertBanner />

	<!-- 3-Column Operational Workbench with min-w-0 on each child to prevent grid blowout -->
	<div
		class="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.5fr] xl:grid-cols-[1fr_1.8fr_1fr]"
	>
		<!-- Left: Bank Accounts & Subtotals -->
		<div class="min-w-0">
			<CockpitBankWidget />
		</div>

		<!-- Center: Live Recent Transaction Feed -->
		<div class="min-w-0">
			<CockpitRecentLedger />
		</div>

		<!-- Right: Monthly Expense Breakdown & 30-Day Cashflow Timeline -->
		<div class="min-w-0 space-y-4 lg:col-span-2 xl:col-span-1">
			<CockpitAllocationWidget />
			<CockpitCashflowTimeline />
		</div>
	</div>
</div>
