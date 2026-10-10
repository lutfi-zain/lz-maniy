<script lang="ts">
	import StudioHeader from '$lib/components/StudioHeader.svelte';
	import StudioHero from '$lib/components/StudioHero.svelte';
	import StudioShowcase from '$lib/components/StudioShowcase.svelte';
	import StudioDossier from '$lib/components/StudioDossier.svelte';
	import StudioFoundations from '$lib/components/StudioFoundations.svelte';
	import StudioFooter from '$lib/components/StudioFooter.svelte';
</script>

<div class="min-h-screen flex flex-col bg-[#0A0D12] text-[#F8FAFC]">
	<StudioHeader />
	<main class="flex-1">
		<StudioHero />
		<StudioShowcase />
		<StudioDossier />
		<StudioFoundations />
	</main>
	<StudioFooter />
</div>
