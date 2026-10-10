<script lang="ts">
	let activeIndex = $state<number | null>(0);

	function toggle(index: number) {
		activeIndex = activeIndex === index ? null : index;
	}

	const faqs = [
		{
			q: "What defines Membran as an independent software atelier?",
			a: "An atelier is a focused workshop where senior systems architects work directly on the final product without layers of non-technical management. At Membran, we reject the conventional IT outsourcing model that sells developer hours. Instead, we take end-to-end architectural ownership: from mathematical modeling and database topology to custom design systems and edge deployment."
		},
		{
			q: "How does Membran guarantee zero-hallucination accounting in AI systems?",
			a: "We enforce an absolute architectural boundary between probabilistic language understanding and deterministic relational computation. Large language models in our architecture (such as Eve in Maniy) are strictly forbidden from performing mental math or guessing balances. All accounting arithmetic, temporal Horizon Board projections, and currency conversions are executed by ACID relational engines on PostgreSQL 16 and D1."
		},
		{
			q: "What is the role of Quant Membran in your studio portfolio?",
			a: "Quant Membran demonstrates our deep capabilities in quantitative analysis and statistical consensus. Built with Python 3.11, Bun, and Hono gateways, it unifies 10 Statistical Families into multi-layer market consensus. It serves as empirical proof of our capacity to architect resilient, mission-critical systems capable of operating under volatile risk constraints."
		},
		{
			q: "How do you maintain sub-100ms global latency without infrastructure bloat?",
			a: "Our frontend interfaces are authored in Svelte 5 and compiled into static, asset-optimized bundles deployed across Cloudflare global edge points. By pairing serverless edge workers with Cloudflare Hyperdrive connection pooling to our dedicated PostgreSQL clusters, we eliminate TCP/TLS handshake latency while maintaining near-zero cold starts."
		},
		{
			q: "Can early-stage startups or institutions partner with Membran?",
			a: "Yes. We collaborate with select technical leaders and founders on foundational architecture, AI reasoning engines, and complex data-intensive platforms. Because our capacity is intentionally focused on high-agency engineering, we only take on initiatives where mathematical certainty and exceptional craft are non-negotiable."
		}
	];
</script>

<section id="faq" class="py-16 sm:py-24 border-b border-[#1E2638]">
	<div class="max-w-[1120px] mx-auto px-4 sm:px-6">
		<!-- Section Header -->
		<div class="flex items-center justify-between mb-8 sm:mb-12 pb-3 sm:pb-4 border-b border-[#1E2638]">
			<span class="font-mono text-xs text-[#94A3B8] tracking-widest uppercase">
				[05] Inquiry &amp; Methodology
			</span>
			<span class="font-mono text-xs text-[#475569]">
				Frequently Asked Questions
			</span>
		</div>
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
			<!-- Left Column: Title & Subtitle -->
			<div class="lg:col-span-5">
				<h2 class="text-2xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC] mb-4 leading-tight">
					Clarity on our engineering discipline and operating model.
				</h2>
				<p class="text-base text-[#94A3B8] font-light leading-relaxed mb-6 sm:mb-8">
					Have a specific inquiry regarding technical collaboration or system architecture? Direct contact is open.
				</p>
				<a
					href="mailto:lutfi@membran.app"
					class="inline-flex items-center gap-2 font-mono text-xs text-[#10B981] hover:text-[#34D399] transition-colors no-underline"
				>
					<span>Inquire directly: lutfi@membran.app</span>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="7" y1="17" x2="17" y2="7"></line>
						<polyline points="7 7 17 7 17 17"></polyline>
					</svg>
				</a>
			</div>

			<!-- Right Column: Accordion Items -->
			<div class="lg:col-span-7 space-y-3">
				{#each faqs as item, i}
					<div class="border border-[#1E2638] rounded-xl bg-[#121721] overflow-hidden transition-colors hover:border-[#334155]">
						<button
							type="button"
							onclick={() => toggle(i)}
							class="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-colors"
							aria-expanded={activeIndex === i}
							aria-controls={"faq-panel-" + i}
							id={"faq-trigger-" + i}
						>
							<span class="font-sans font-semibold text-base sm:text-lg text-[#F8FAFC] tracking-tight">
								{item.q}
							</span>
							<span class="font-mono text-sm text-[#94A3B8] shrink-0 min-w-[24px] text-center">
								{#if activeIndex === i}
									<span class="text-[#10B981] font-bold">&minus;</span>
								{:else}
									<span class="text-[#475569] font-bold">&plus;</span>
								{/if}
							</span>
						</button>

						{#if activeIndex === i}
							<div
								id={"faq-panel-" + i}
								role="region"
								aria-labelledby={"faq-trigger-" + i}
								class="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-[#94A3B8] font-light leading-relaxed border-t border-[#1E2638]/50 animate-entrance-1"
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
	</div>
</section>
