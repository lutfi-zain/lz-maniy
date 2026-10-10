<script lang="ts">
	let activeIndex = $state<number | null>(0);

	function toggle(index: number) {
		activeIndex = activeIndex === index ? null : index;
	}

	const faqs = [
		{
			q: 'What are your core services as a UX design and software atelier?',
			a: 'At Membran, user experience and engineering integrity are interconnected. We take full-stack ownership: from product strategy, mathematical modeling, and brand design to frontend execution on Svelte 5 and edge deployment on Cloudflare. We specialize in building deterministic digital products that embody precision and deliver unforgettable experiences.'
		},
		{
			q: 'How does Membran guarantee zero-hallucination accounting in AI systems?',
			a: 'We enforce an absolute architectural boundary between probabilistic language understanding and deterministic relational computation. Large language models in our architecture (such as Eve in Maniy) are strictly forbidden from performing mental math or guessing balances. All accounting arithmetic, temporal Horizon Board projections, and currency conversions are executed by ACID relational engines on PostgreSQL 16 and D1.'
		},
		{
			q: 'What separates Membran from other software studios and design agencies?',
			a: 'We eliminate intermediary account managers, slide decks, and body-shopping practices. When you partner with us, you collaborate directly with senior systems architects who write production code and design interfaces side-by-side. Our agility stems from founder-led execution, ensuring future-proof scalability and sub-100ms response times worldwide.'
		},
		{
			q: 'How do you work with clients across different timezones?',
			a: 'Based in Jakarta (UTC+07), we operate with a remote-first, asynchronous-heavy workflow that seamlessly bridges North American, European, and Asia-Pacific timezones. We communicate transparently via concise written artifacts, continuous telemetry tracing on Arize Phoenix, and automated GitHub CI/CD pipelines.'
		},
		{
			q: 'Do you collaborate with early-stage startups as well as enterprise ventures?',
			a: 'Yes. We work with select founders and engineering teams on foundational systems architecture, AI reasoning engines, and complex financial or quantitative platforms. We focus exclusively on engagements where mathematical certainty, performance, and out-of-distribution craft are non-negotiable.'
		}
	];
</script>

<section id="faq" class="py-20 sm:py-28 lg:py-36 bg-[#06070a] text-white border-b border-[#252833]">
	<div class="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
		<div class="mb-12 sm:mb-16 pb-6 border-b border-[#252833] flex items-center justify-between">
			<h2 class="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tightest">
				FAQ
			</h2>
			<span class="font-mono text-xs text-[#989fab] uppercase tracking-wider">
				Atelier Answers
			</span>
		</div>

		<div class="divide-y divide-[#252833] border-b border-[#252833]">
			{#each faqs as item, i}
				<div class="py-8 transition-colors">
					<button
						type="button"
						onclick={() => toggle(i)}
						class="w-full text-left flex items-center justify-between gap-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] rounded-lg py-1"
						aria-expanded={activeIndex === i}
						aria-controls={'faq-desc-' + i}
						id={'faq-btn-' + i}
					>
						<span class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white group-hover:text-[#cbd0d6] transition-colors">
							{item.q}
						</span>

						<svg
							class="size-5 shrink-0 transition-transform duration-300 {activeIndex === i
								? 'rotate-180 text-[#007aff]'
								: 'text-[#989fab] group-hover:text-white'}"
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
						<div
							id={'faq-desc-' + i}
							role="region"
							aria-labelledby={'faq-btn-' + i}
							class="mt-6 max-w-[960px] text-base sm:text-lg text-[#989fab] font-normal leading-relaxed animate-entrance-1"
						>
							<p>
								{item.a}
							</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
