<script lang="ts">
	import { onMount } from 'svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import AmbientBackground from '$lib/components/layout/AmbientBackground.svelte';
	import BentoKpiGrid from '$lib/components/kpi/BentoKpiGrid.svelte';
	import WalletSection from '$lib/components/wallets/WalletSection.svelte';
	import CashflowSection from '$lib/components/cashflow/CashflowSection.svelte';
	import BudgetSection from '$lib/components/budgets/BudgetSection.svelte';
	import GoalSection from '$lib/components/goals/GoalSection.svelte';
	import ObligationSection from '$lib/components/obligations/ObligationSection.svelte';
	import DrilldownDrawer from '$lib/components/drawer/DrilldownDrawer.svelte';

	onMount(() => {
		// Attempt live API fetch on initial mount
		reedrichStore.fetchSnapshot();
	});
</script>

<AmbientBackground />

<div class="relative z-10 flex min-h-screen flex-col">
	<Topbar />

	<main class="mx-auto w-full max-w-[1320px] flex-1 px-6 py-8 md:px-8">
		<!-- Hero Section -->
		<section class="mb-6">
			<div class="font-mono text-[11px] tracking-wider text-[#787774] uppercase">
				Reedrich Financial Engine · snapshot atomik
			</div>
			<h1 class="serif my-2 text-3xl font-medium tracking-tight text-[#111111] md:text-4xl">
				Potret Keuangan Komprehensif.
			</h1>
			<p class="max-w-3xl text-xs leading-relaxed text-[#787774] md:text-sm">
				Seluruh metrik dan laporan di bawah ini diproduksi langsung dari rilis endpoint
				<code class="rounded bg-[#F0EFEC] px-1.5 py-0.5 font-mono text-xs text-[#111111]"
					>GET /api/v1/account-detail</code
				>. Klik pada dompet, kategori, budget, goal, atau kewajiban untuk membuka detail lengkap dan
				riwayat mutasi transaksi.
			</p>
		</section>

		<!-- Macro KPIs -->
		<BentoKpiGrid />

		<!-- Main Workspace (Desktop: 60/40 Split, Mobile: Stacked 1 Column) -->
		<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
			<!-- Left Column: Wallets, Budgets, Obligations -->
			<div class="space-y-6">
				<WalletSection />
				<BudgetSection />
				<ObligationSection />
			</div>

			<!-- Right Column: Cashflow Breakdown & Goals -->
			<div class="space-y-6">
				<CashflowSection />
				<GoalSection />
			</div>
		</div>
	</main>

	<!-- Minimalist Footer -->
	<footer
		class="border-t border-[#EAEAEA] bg-white py-6 text-center font-mono text-xs text-[#787774]"
	>
		<div class="mx-auto max-w-[1320px] px-6">
			MANIYY V2 · Svelte 5 & shadcn-svelte · Endpoint: <span class="text-[#111111]"
				>/api/v1/account-detail</span
			>
			· Mode: {reedrichStore.isLive ? 'Live Edge' : 'Mock Cache'}
		</div>
	</footer>
</div>

<!-- Slide-over Drawer -->
<DrilldownDrawer />
