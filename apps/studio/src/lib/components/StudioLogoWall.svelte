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

<section class="py-14 sm:py-20 bg-white border-b border-[#e6e8eb] overflow-hidden">
	<div class="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
		<div class="mb-8 flex items-center justify-between text-xs font-mono text-[#989fab] uppercase tracking-wider">
			<span>Ecosystem &amp; Technology Standards</span>
			<span>Production Runtimes</span>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-8 items-center justify-items-center">
			{#each logos as logo}
				<div class="flex items-center justify-center p-2 opacity-65 hover:opacity-100 transition-opacity">
					<img
						src={logo.src}
						alt={logo.name}
						class="max-h-8 sm:max-h-10 w-auto object-contain grayscale hover:grayscale-0 transition-all"
						loading="lazy"
					/>
				</div>
			{/each}
		</div>
	</div>
</section>
