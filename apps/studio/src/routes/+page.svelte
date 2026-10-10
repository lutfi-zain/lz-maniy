<script lang="ts">
	import StudioHeader from '$lib/components/StudioHeader.svelte';
	import StudioHero from '$lib/components/StudioHero.svelte';
	import StudioCapabilities from '$lib/components/StudioCapabilities.svelte';
	import StudioLogoWall from '$lib/components/StudioLogoWall.svelte';
	import StudioShowcase from '$lib/components/StudioShowcase.svelte';
	import StudioManifesto from '$lib/components/StudioManifesto.svelte';
	import StudioDossier from '$lib/components/StudioDossier.svelte';
	import StudioFaq from '$lib/components/StudioFaq.svelte';
	import StudioFooter from '$lib/components/StudioFooter.svelte';
</script>

<svelte:head>
	<title>Membran | UX Design &amp; Software Atelier</title>
	<meta
		name="description"
		content="Membran is a global UX design and software atelier headquartered in Jakarta. We create digital products, design systems, and deterministic AI instruments across industries."
	/>
</svelte:head>

<div class="min-h-screen flex flex-col bg-white text-[#06070a]">
	<StudioHeader />
	<main class="flex-1">
		<StudioHero />
		<StudioCapabilities />
		<StudioLogoWall />
		<StudioShowcase />
		<StudioManifesto />
		<StudioDossier />
		<StudioFaq />
	</main>
	<StudioFooter />
</div>
