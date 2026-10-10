<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<meta name="description" content="Membran is an independent software atelier and applied AI lab building deterministic instruments and financial intelligence." />
	<meta property="og:title" content="Membran — Independent Software Atelier & Applied AI Lab" />
	<meta property="og:description" content="We engineer high-agency instruments & deterministic systems for the post-probabilistic era." />
	<meta property="og:url" content="https://membran.app" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Membran" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Membran — Independent Software Atelier & Applied AI Lab" />
	<meta name="twitter:description" content="We engineer high-agency instruments & deterministic systems for the post-probabilistic era." />
	<link rel="canonical" href="https://membran.app" />
</svelte:head>

{@render children()}
