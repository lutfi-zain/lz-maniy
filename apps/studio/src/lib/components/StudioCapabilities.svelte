<script lang="ts">
	let activeIndex = $state(0);

	function selectItem(index: number) {
		activeIndex = activeIndex === index ? -1 : index;
	}

	const capabilities = [
		{
			title: 'Deterministic Accounting',
			tag: 'Math Integrity',
			image: '/images/capabilities/01-deterministic.jpg',
			description:
				'A brand is more than just a logo. For Membran, financial truth is more than an estimation. Zero-hallucination ledgers where balances, daily runways, and currency conversions are computed by verified ACID relational queries on PostgreSQL 16 and D1, never inferred by stochastic model weights.'
		},
		{
			title: 'Digital Products',
			tag: 'Executive Cockpits',
			image: '/images/capabilities/02-digital-products.jpg',
			description:
				'At Membran, we focus on creating real connections. We combine smart design with behavioral science to make digital products that feel human. Our senior architects craft software that is not just beautiful, but meaningful. Home of Maniy v2 Executive Cockpit and AI Financial Reasoning Agent.'
		},
		{
			title: 'Websites',
			tag: 'Editorial Design',
			image: '/images/capabilities/03-websites.jpg',
			description:
				'Your digital presence starts with your website. That’s where your brand comes to life. We design sites that clearly show who you are and what you stand for, all while giving users a smooth, engaging experience. Radical editorial aesthetics, zero AI-slop, and sub-50ms first contentful paint.'
		},
		{
			title: 'Development',
			tag: 'Edge Runtimes',
			image: '/images/capabilities/04-development.jpg',
			description:
				'Our app and web developers care about both looks and performance. We build fast, reliable products that work great on every device. Deployed worldwide across Cloudflare Workers and Pages, with Hyperdrive connection pooling eliminating cold starts and database lag.'
		},
		{
			title: 'Content & Observability',
			tag: 'Open Telemetry',
			image: '/images/capabilities/05-content.jpg',
			description:
				'Great content and rigorous system observability are foundational to trust. Zero black-box AI behavior: every tool invocation, LLM span latency, and memory retrieval step is streamed live to Arize Phoenix using open OpenTelemetry (OTLP) protocols.'
		},
		{
			title: 'Generative AI & Quantitative Systems',
			tag: 'Applied Intelligence',
			image: '/images/capabilities/06-generative-ai.jpg',
			description:
				'We use AI to work smarter and build better products. Our team leads the way in AI-powered UX, creating new ways for people to interact with digital tools and setting the standard for what’s next. Home of Quant Membran Bitcoin Intelligence Platform unifying 10 Statistical Families.'
		}
	];
</script>

<section id="capabilities" class="py-20 sm:py-28 lg:py-36 bg-white border-b border-[#e6e8eb]">
	<div class="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
		<!-- Section Lead Statement -->
		<div class="max-w-[1100px] mb-16 sm:mb-24">
			<p class="text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-bold text-[#06070a] leading-[1.15] tracking-tightest">
				We build transformative digital experiences for the world's leading brands by blending AI, design, and technology.
			</p>
		</div>

		<!-- Desktop & Tablet Interactive Capabilities Grid -->
		<div class="hidden lg:grid grid-cols-12 gap-12 items-start">
			<!-- Left List (6 items) -->
			<div class="col-span-7 divide-y divide-[#e6e8eb]">
				{#each capabilities as item, i}
					<div class="py-6 transition-colors">
						<button
							type="button"
							onclick={() => (activeIndex = i)}
							class="w-full text-left flex items-center justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] rounded-lg py-2"
						>
							<div class="flex items-center gap-6">
								<span class="font-mono text-xs text-[#989fab]">
									0{i + 1}
								</span>
								<h3
									class="text-2xl xl:text-3xl font-bold tracking-tight transition-colors {activeIndex === i
										? 'text-[#06070a]'
										: 'text-[#666c7a] group-hover:text-[#06070a]'}"
								>
									{item.title}
								</h3>
							</div>

							<svg
								class="size-5 transition-transform duration-300 {activeIndex === i
									? 'rotate-180 text-[#007aff]'
									: 'text-[#989fab] group-hover:text-[#06070a]'}"
								viewBox="0 0 21 13"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m1.467 1.732 9.018 8.852 8.684-8.524" />
							</svg>
						</button>

						{#if activeIndex === i}
							<div class="mt-4 pl-12 pr-6 text-base text-[#4e5361] font-normal leading-relaxed animate-entrance-1">
								<p class="mb-4">
									{item.description}
								</p>
								<span class="inline-block font-mono text-[11px] uppercase tracking-wider text-[#007aff] border border-[#007aff]/20 bg-[#007aff]/5 px-2.5 py-1 rounded">
									{item.tag}
								</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Right Sticky Visual Display -->
			<div class="col-span-5 sticky top-32">
				<div class="border border-[#e6e8eb] rounded-2xl overflow-hidden bg-[#f3f4f6] shadow-xl">
					<div class="relative w-full aspect-square overflow-hidden bg-[#f3f4f6]">
						{#each capabilities as item, idx}
							<img
								src={item.image}
								alt={item.title}
								class="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out {activeIndex === idx
									? 'opacity-100 scale-100 z-10'
									: 'opacity-0 scale-95 pointer-events-none z-0'}"
								loading="eager"
							/>
						{/each}
					</div>
					{#if activeIndex >= 0}
						<div class="p-6 bg-white border-t border-[#e6e8eb] transition-all">
							<div class="font-mono text-xs text-[#989fab] uppercase tracking-wider mb-1">
								Membran Pillar 0{activeIndex + 1}
							</div>
							<div class="font-sans font-bold text-xl text-[#06070a]">
								{capabilities[activeIndex].title}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Mobile & Tablet Accordion View -->
		<div class="lg:hidden divide-y divide-[#e6e8eb]">
			{#each capabilities as item, i}
				<div class="py-5">
					<button
						type="button"
						onclick={() => selectItem(i)}
						class="w-full text-left flex items-center justify-between py-2 focus-visible:outline-none"
						aria-expanded={activeIndex === i}
					>
						<div class="flex items-center gap-4">
							<span class="font-mono text-xs text-[#989fab]">
								0{i + 1}
							</span>
							<h3 class="text-xl sm:text-2xl font-bold tracking-tight text-[#06070a]">
								{item.title}
							</h3>
						</div>

						<svg
							class="size-4 transition-transform duration-300 {activeIndex === i ? 'rotate-180 text-[#007aff]' : 'text-[#989fab]'}"
							viewBox="0 0 21 13"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							aria-hidden="true"
						>
							<path d="m1.467 1.732 9.018 8.852 8.684-8.524" />
						</svg>
					</button>

					{#if activeIndex === i}
						<div class="mt-4 space-y-4 animate-entrance-1">
							<div class="rounded-xl overflow-hidden border border-[#e6e8eb] bg-[#f3f4f6]">
								<img
									src={item.image}
									alt={item.title}
									class="w-full aspect-square object-cover"
									loading="lazy"
								/>
							</div>
							<p class="text-sm sm:text-base text-[#4e5361] leading-relaxed">
								{item.description}
							</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
