<script lang="ts">
	const logos = [
		{ name: 'Google', src: '/images/logos/google.png' },
		{ name: 'Stripe', src: '/images/logos/stripe.png' },
		{ name: 'Coinbase', src: '/images/logos/coinbase.png' },
		{ name: 'Slack', src: '/images/logos/slack.png' },
		{ name: 'Uber', src: '/images/logos/uber.png' },
		{ name: 'Sony', src: '/images/logos/sony.png' },
		{ name: 'Amazon', src: '/images/logos/amazon.png' },
		{ name: 'Cloudflare', src: '/images/logos/cloudflare.png' }
	];
</script>

<section class="py-12 sm:py-16 bg-white border-b border-[#e6e8eb] overflow-hidden">
	<div class="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 mb-6">
		<div class="flex items-center justify-between text-xs font-mono text-[#989fab] uppercase tracking-wider">
			<span>Production Runtimes &amp; Ecosystem Standards</span>
			<span>Verified Integrations</span>
		</div>
	</div>

	<!-- Infinite Smooth Scrolling Marquee Track -->
	<div class="relative w-full overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
		<div class="animate-marquee flex items-center gap-12 sm:gap-20">
			<!-- First set of logos -->
			{#each logos as logo}
				<div class="flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-opacity">
					<img
						src={logo.src}
						alt={logo.name}
						class="h-7 sm:h-9 w-auto object-contain grayscale hover:grayscale-0 transition-all"
						loading="lazy"
					/>
				</div>
			{/each}
			<!-- Duplicate set for seamless infinite loop -->
			{#each logos as logo}
				<div class="flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-opacity">
					<img
						src={logo.src}
						alt={logo.name}
						class="h-7 sm:h-9 w-auto object-contain grayscale hover:grayscale-0 transition-all"
						loading="lazy"
					/>
				</div>
			{/each}
		</div>
	</div>
</section>
