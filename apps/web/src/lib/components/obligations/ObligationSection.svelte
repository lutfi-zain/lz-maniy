<script lang="ts">
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import ObligationCard from './ObligationCard.svelte';
	import Handshake from 'phosphor-svelte/lib/Handshake';

	const ob = $derived(reedrichStore.snapshot?.obligations);
	const debts = $derived(ob?.activeDebts ?? []);
	const loans = $derived(ob?.activeLoans ?? []);
	const totalCount = $derived(debts.length + loans.length);
</script>

<section id="sec-obligations" class="mb-5 rounded-xl border border-[#EAEAEA] bg-white p-5 md:p-6">
	<div
		class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAEAEA] pb-3"
	>
		<div>
			<h2 class="serif flex items-center gap-2 text-xl font-medium text-[#111111] md:text-2xl">
				<Handshake class="size-5 text-[#111111]" weight="bold" />
				<span>Kewajiban & Tagihan Aktif</span>
			</h2>
			<div class="mt-0.5 text-xs text-[#787774]">
				Utang yang wajib dilunasi dan piutang (talangan) yang diharapkan kembali.
			</div>
		</div>

		<span
			class="rounded-full border border-[#EAEAEA] bg-[#F9F9F8] px-2.5 py-0.5 font-mono text-[11px] text-[#787774] uppercase"
		>
			{totalCount} catatan
		</span>
	</div>

	<!-- Debts Subgroup -->
	{#if debts.length > 0}
		<div class="mb-4">
			<div
				class="mb-2 flex items-center justify-between text-[10px] font-medium tracking-wider text-[#787774] uppercase"
			>
				<span>Utang Wajib Dibayar</span>
				<span class="font-mono text-[#9F2F2D]">Total {fmtIDR(ob?.totalDebt)}</span>
			</div>
			<div>
				{#each debts as item (item.debtLoanId)}
					<ObligationCard {item} type="debt" />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Loans Subgroup -->
	{#if loans.length > 0}
		<div>
			<div
				class="mb-2 flex items-center justify-between text-[10px] font-medium tracking-wider text-[#787774] uppercase"
			>
				<span>Piutang / Talangan Berhak Diterima</span>
				<span class="font-mono text-[#346538]">Total {fmtIDR(ob?.totalReceivable)}</span>
			</div>
			<div>
				{#each loans as item (item.debtLoanId)}
					<ObligationCard {item} type="loan" />
				{/each}
			</div>
		</div>
	{/if}

	{#if totalCount === 0}
		<div class="py-6 text-center font-mono text-xs text-[#787774]">
			Tidak ada kewajiban atau piutang aktif.
		</div>
	{/if}
</section>
