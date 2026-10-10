<script lang="ts">
	const techStack = [
		{ name: 'Cloudflare Edge', tag: 'Workers & Pages', src: '/images/tech/cloudflare.svg' },
		{ name: 'PostgreSQL 16', tag: 'Relational ACID Core', src: '/images/tech/postgresql.svg' },
		{ name: 'Arize Phoenix', tag: 'OTLP Telemetry Live', src: '/images/tech/phoenix.svg' },
		{ name: 'Svelte 5', tag: 'Reactive Runes UI', src: '/images/tech/svelte.svg' },
		{ name: 'Python 3.11', tag: 'Quant Model Engine', src: '/images/tech/python.svg' },
		{ name: 'Bun Runtime', tag: 'High-Throughput I/O', src: '/images/tech/bun.svg' },
		{ name: 'TradingView', tag: 'Lightweight Charts v5', src: '/images/tech/tradingview.svg' },
		{ name: 'Anthropic Claude', tag: 'AI Reasoning Core', src: '/images/tech/anthropic.svg' }
	];
</script>

<section class="py-12 sm:py-16 bg-white border-b border-[#e6e8eb] overflow-hidden">
	<div class="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 mb-8">
		<div class="flex items-center justify-between text-xs font-mono text-[#989fab] uppercase tracking-wider">
			<span>Engineered on Proven Edge Infrastructure</span>
			<span>Production Runtimes</span>
		</div>
	</div>

	<!-- Infinite Smooth Scrolling Marquee Track -->
	<div class="relative w-full overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
		<div class="animate-marquee flex items-center gap-8 sm:gap-14">
			<!-- First set -->
			{#each techStack as tech}
				<div class="flex items-center gap-3 shrink-0 px-4 py-2 rounded-lg border border-[#e6e8eb] bg-[#f3f4f6]/60 hover:bg-[#f3f4f6] transition-colors group">
					<img
						src={tech.src}
						alt={tech.name}
						class="size-5 sm:size-6 text-[#06070a] object-contain opacity-70 group-hover:opacity-100 transition-opacity"
						loading="lazy"
					/>
					<div class="flex flex-col">
						<span class="font-sans font-bold text-xs sm:text-sm text-[#06070a]">
							{tech.name}
						</span>
						<span class="font-mono text-[10px] text-[#7f8694]">
							{tech.tag}
						</span>
					</div>
				</div>
			{/each}

			<!-- Duplicate set for seamless loop -->
			{#each techStack as tech}
				<div class="flex items-center gap-3 shrink-0 px-4 py-2 rounded-lg border border-[#e6e8eb] bg-[#f3f4f6]/60 hover:bg-[#f3f4f6] transition-colors group">
					<img
						src={tech.src}
						alt={tech.name}
						class="size-5 sm:size-6 text-[#06070a] object-contain opacity-70 group-hover:opacity-100 transition-opacity"
						loading="lazy"
					/>
					<div class="flex flex-col">
						<span class="font-sans font-bold text-xs sm:text-sm text-[#06070a]">
							{tech.name}
						</span>
						<span class="font-mono text-[10px] text-[#7f8694]">
							{tech.tag}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
