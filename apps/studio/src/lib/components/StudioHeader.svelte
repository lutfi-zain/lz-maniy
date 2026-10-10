<script lang="ts">
	let mobileOpen = $state(false);

	function toggleMobile() {
		mobileOpen = !mobileOpen;
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<header class="sticky top-0 z-50 w-full px-3 sm:px-6 pt-2.5 sm:pt-4">
	<div class="max-w-[1120px] mx-auto border border-[#1E2638] bg-[#0A0D12]/90 backdrop-blur-md rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-2xl shadow-black/60 transition-all">
		<!-- Brand Monogram & Wordmark -->
		<a href="/" class="min-h-[44px] flex items-center gap-2.5 sm:gap-3 text-[#F8FAFC] no-underline group focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-lg" aria-label="Membran Homepage">
			<span class="font-mono font-bold text-xs sm:text-sm border border-[#1E2638] px-2 py-0.5 rounded bg-[#121721] group-hover:border-[#334155] group-hover:text-[#10B981] transition-colors">
				M
			</span>
			<div class="flex flex-col">
				<span class="font-sans font-bold tracking-tight text-xs sm:text-sm text-[#F8FAFC]">
					MEMBRAN
				</span>
				<span class="font-mono text-[9px] text-[#475569] hidden sm:block">
					SOFTWARE ATELIER
				</span>
			</div>
		</a>

		<!-- Live Telemetry Pill -->
		<a
			href="https://phoenix.membran.app"
			target="_blank"
			rel="noopener"
			class="hidden lg:inline-flex min-h-[38px] items-center gap-2.5 font-mono text-[11px] text-[#94A3B8] border border-[#1E2638] px-3.5 py-1 rounded-full bg-[#121721]/70 hover:border-[#334155] hover:text-[#F8FAFC] transition-colors"
			aria-label="Open live telemetry tracing on Arize Phoenix"
		>
			<span class="relative flex size-2">
				<span class="telemetry-beacon-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
				<span class="relative inline-flex size-2 rounded-full bg-[#10B981]"></span>
			</span>
			<span>Arize Phoenix: OTLP Live</span>
		</a>

		<!-- Desktop Navigation Links -->
		<nav class="hidden md:flex items-center gap-1 sm:gap-2 font-mono text-xs" aria-label="Main Navigation">
			<a
				href="#capabilities"
				class="min-h-[40px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors no-underline rounded-md"
			>
				Capabilities
			</a>
			<a
				href="#works"
				class="min-h-[40px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors no-underline rounded-md"
			>
				Selected Works
			</a>
			<a
				href="#atelier"
				class="min-h-[40px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors no-underline rounded-md"
			>
				Atelier
			</a>
			<a
				href="#faq"
				class="min-h-[40px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors no-underline rounded-md"
			>
				FAQ
			</a>
		</nav>

		<!-- Right Action & Mobile Toggle -->
		<div class="flex items-center gap-2">
			<a
				href="mailto:lutfi@membran.app"
				class="min-h-[40px] inline-flex items-center justify-center font-sans font-semibold text-xs px-4 py-2 rounded-lg bg-[#F8FAFC] text-[#0A0D12] hover:bg-white hover:shadow-md hover:shadow-white/10 active:bg-[#E2E8F0] transition-all no-underline"
			>
				<span>Let's Talk</span>
			</a>

			<button
				type="button"
				onclick={toggleMobile}
				class="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E2638] rounded-lg bg-[#121721] transition-colors"
				aria-expanded={mobileOpen}
				aria-label="Toggle navigation menu"
			>
				{#if mobileOpen}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="3" y1="12" x2="21" y2="12"></line>
						<line x1="3" y1="6" x2="21" y2="6"></line>
						<line x1="3" y1="18" x2="21" y2="18"></line>
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile Drawer Menu -->
	{#if mobileOpen}
		<div class="md:hidden max-w-[1120px] mx-auto mt-2 border border-[#1E2638] bg-[#0A0D12]/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl flex flex-col gap-2 font-mono text-xs animate-entrance-1">
			<a
				href="#capabilities"
				onclick={closeMobile}
				class="min-h-[44px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] border-b border-[#1E2638]/40 no-underline"
			>
				[01] Capabilities
			</a>
			<a
				href="#works"
				onclick={closeMobile}
				class="min-h-[44px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] border-b border-[#1E2638]/40 no-underline"
			>
				[02] Selected Works (Maniy & Quant)
			</a>
			<a
				href="#atelier"
				onclick={closeMobile}
				class="min-h-[44px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] border-b border-[#1E2638]/40 no-underline"
			>
				[03] Atelier Dossier
			</a>
			<a
				href="#faq"
				onclick={closeMobile}
				class="min-h-[44px] px-3 flex items-center text-[#94A3B8] hover:text-[#F8FAFC] border-b border-[#1E2638]/40 no-underline"
			>
				[04] Interactive FAQ
			</a>
			<a
				href="https://phoenix.membran.app"
				target="_blank"
				rel="noopener"
				onclick={closeMobile}
				class="min-h-[44px] px-3 flex items-center justify-between text-[#10B981] pt-1 no-underline"
			>
				<span>Telemetry: phoenix.membran.app</span>
				<span class="size-2 rounded-full bg-[#10B981]"></span>
			</a>
		</div>
	{/if}
</header>
