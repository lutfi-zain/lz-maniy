<script lang="ts">
	import StudioHeader from '$lib/components/StudioHeader.svelte';
	import StudioHero from '$lib/components/StudioHero.svelte';
	import StudioCapabilities from '$lib/components/StudioCapabilities.svelte';
	import StudioShowcase from '$lib/components/StudioShowcase.svelte';
	import StudioManifesto from '$lib/components/StudioManifesto.svelte';
	import StudioDossier from '$lib/components/StudioDossier.svelte';
	import StudioFaq from '$lib/components/StudioFaq.svelte';
	import StudioFooter from '$lib/components/StudioFooter.svelte';
</script>

<svelte:head>
	<title>Membran — Independent Software Atelier & Applied AI Lab</title>
	<meta
		name="description"
		content="Membran is an independent software atelier and applied AI lab engineering deterministic instruments. Production home of Maniy and Quant Membran."
	/>
</svelte:head>

<div class="min-h-screen flex flex-col bg-[#0A0D12] text-[#F8FAFC]">
	<StudioHeader />
	<main class="flex-1">
		<StudioHero />
		<StudioCapabilities />
		<StudioShowcase />
		<StudioManifesto />
		<StudioDossier />
		<StudioFaq />
	</main>
	<StudioFooter />
</div>
