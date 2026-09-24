<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR, fmtCurrency } from '$lib/utils/currency';
	import KpiCard from './KpiCard.svelte';
	import Vault from 'phosphor-svelte/lib/Vault';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Scales from 'phosphor-svelte/lib/Scales';

	const nw = $derived(reedrichStore.snapshot?.netWorth);
	const wl = $derived(reedrichStore.snapshot?.wallets);
	const cf = $derived(reedrichStore.snapshot?.monthlyCashFlow);

	function openNetWorth() {
		if (!nw) return;
		reedrichStore.openDrawer({
			type: 'networth',
			title: 'Distribusi Portofolio Kekayaan',
			subtitle: 'Rincian saldo terdistribusi menurut mata uang dan institusi keuangan',
			badge: 'KONSOLIDASI',
			data: { netWorth: nw }
		});
	}

	function handleSpendableClick() {
		reedrichStore.setTab('spendable');
		const el = document.getElementById('sec-wallets');
		if (el) el.scrollIntoView({ behavior: 'smooth' });
	}

	function handleLockedClick() {
		reedrichStore.setTab('locked');
		const el = document.getElementById('sec-wallets');
		if (el) el.scrollIntoView({ behavior: 'smooth' });
	}

	function handleCashflowClick() {
		const el = document.getElementById('sec-cashflow');
		if (el) el.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<section id="kpis" class="my-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
	<!-- Net Worth Card -->
	<KpiCard
		label="Kekayaan Bersih Konsolidasi"
		value={fmtIDR(nw?.consolidated.total)}
		subtext={nw?.consolidated.isEstimated ? 'Valuasi kurs live (USDT/IDR)' : 'Nilai pasti'}
		onclick={openNetWorth}
	>
		{#snippet icon()}
			<Vault class="size-3.5" weight="bold" />
		{/snippet}

		{#if nw?.byInstitution}
			<div class="mt-3 flex flex-wrap gap-1.5 border-t border-[#EAEAEA] pt-2">
				{#each Object.entries(nw.byInstitution) as [inst, val] (inst)}
					<button
						type="button"
						class="pill cursor-pointer rounded-full border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-0.5 text-[11px] text-[#787774] transition-all hover:border-[#111111] hover:bg-[#111111] hover:text-white {reedrichStore.selectedInstitution ===
						inst
							? 'border-[#111111] bg-[#111111] text-white'
							: ''}"
						onclick={(e) => {
							e.stopPropagation();
							reedrichStore.filterByInstitution(inst);
						}}
					>
						{inst}: {fmtCurrency(val, inst === 'Bitget' ? 'USDT' : 'IDR')}
					</button>
				{/each}
			</div>
		{/if}
	</KpiCard>

	<!-- Spendable Cash Card -->
	<KpiCard
		label="Spendable (Tak Terkunci)"
		value={fmtIDR(wl?.spendable.total)}
		subtext="{wl?.spendable.items.length ?? 0} dompet aktif siap transaksi"
		onclick={handleSpendableClick}
	>
		{#snippet icon()}
			<Wallet class="size-3.5 text-[#346538]" weight="bold" />
		{/snippet}
	</KpiCard>

	<!-- Locked Cash Card -->
	<KpiCard
		label="Locked (Cadangan)"
		value={fmtIDR(wl?.locked.total)}
		subtext="{wl?.locked.items.length ?? 0} dompet sewa rumah & cadangan"
		onclick={handleLockedClick}
	>
		{#snippet icon()}
			<LockKey class="size-3.5 text-[#956400]" weight="bold" />
		{/snippet}
	</KpiCard>

	<!-- Net Savings Card -->
	<KpiCard
		label="Tabungan Bersih Bulan Ini"
		value={(cf?.netSavings ?? 0) >= 0
			? '+' + fmtIDR(cf?.netSavings)
			: '−' + fmtIDR(Math.abs(cf?.netSavings ?? 0))}
		subtext="Masuk {fmtIDR(cf?.totalIncome)} · Keluar {fmtIDR(cf?.totalExpense)}"
		valueColor={(cf?.netSavings ?? 0) >= 0 ? 'text-[#346538]' : 'text-[#9F2F2D]'}
		onclick={handleCashflowClick}
	>
		{#snippet icon()}
			<Scales class="size-3.5" weight="bold" />
		{/snippet}
	</KpiCard>
</section>
