<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import CockpitKpiStrip from '$lib/components/cockpit/CockpitKpiStrip.svelte';
	import CockpitAlertBanner from '$lib/components/cockpit/CockpitAlertBanner.svelte';
	import CockpitBankWidget from '$lib/components/cockpit/CockpitBankWidget.svelte';
	import CockpitRecentLedger from '$lib/components/cockpit/CockpitRecentLedger.svelte';
	import CockpitAllocationWidget from '$lib/components/cockpit/CockpitAllocationWidget.svelte';

	let activeController: AbortController | null = null;

	// Synchronize account detail snapshot reactively with dateFilterStore
	$effect(() => {
		const start = dateFilterStore.startDate;
		const end = dateFilterStore.endDate;
		const preset = dateFilterStore.preset;

		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;

		// Call fetchSnapshot passing temporal bounds when set
		reedrichStore.fetchSnapshot(
			{
				startDate: start || undefined,
				endDate: end || undefined
			}
		);

		return () => {
			controller.abort();
		};
	});
</script>

<div class="max-w-full space-y-4">
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

		<!-- Right: Monthly Expense Breakdown & Active Budgets -->
		<div class="min-w-0 lg:col-span-2 xl:col-span-1">
			<CockpitAllocationWidget />
		</div>
	</div>
</div>
