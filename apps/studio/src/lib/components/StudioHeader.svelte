<script lang="ts">
	let mobileOpen = $state(false);
	let scrolled = $state(false);

	function toggleMobile() {
		mobileOpen = !mobileOpen;
	}

	function closeMobile() {
		mobileOpen = false;
	}

	function handleScroll() {
		scrolled = window.scrollY > 20;
	}
</script>

<svelte:window onscroll={handleScroll} />

<header
	class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {scrolled
		? 'bg-white/90 backdrop-blur-md border-b border-[#e6e8eb] shadow-xs'
		: 'bg-transparent'}"
>
	<div class="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-5 sm:py-6 flex items-center justify-between">
		<!-- Brand Logo -->
		<a href="/" class="flex items-center gap-3 no-underline group" aria-label="Membran Homepage">
			<span class="size-8 rounded-sm bg-[#06070a] text-white font-mono font-bold text-xs flex items-center justify-center transition-transform group-hover:scale-105">
				M
			</span>
			<span class="font-sans font-bold text-lg sm:text-xl tracking-tight text-[#06070a]">
				MEMBRAN
			</span>
		</a>


		<!-- Desktop Navigation Menu -->
		<nav class="hidden md:flex items-center gap-8 font-sans text-[15px] font-medium text-[#06070a]" aria-label="Main Navigation">
			<a href="#capabilities" class="hover:text-[#666c7a] transition-colors no-underline">
				Capabilities
			</a>
			<a href="#works" class="hover:text-[#666c7a] transition-colors no-underline">
				Work
			</a>
			<a href="#manifesto" class="hover:text-[#666c7a] transition-colors no-underline">
				Atelier
			</a>
			<a href="#faq" class="hover:text-[#666c7a] transition-colors no-underline">
				FAQ
			</a>
		</nav>

		<!-- Right Action & Mobile Toggle -->
		<div class="flex items-center gap-3">
			<a
				href="mailto:lutfi@membran.app"
				class="min-h-[42px] inline-flex items-center justify-center font-sans font-medium text-sm px-6 py-2.5 rounded-full bg-[#06070a] text-white hover:bg-[#353945] active:bg-[#06070a] transition-colors no-underline shadow-xs"
			>
				<span>Contact</span>
			</a>

			<button
				type="button"
				onclick={toggleMobile}
				class="md:hidden min-h-[42px] min-w-[42px] flex items-center justify-center text-[#06070a] border border-[#e6e8eb] rounded-full bg-[#f3f4f6] transition-colors"
				aria-expanded={mobileOpen}
				aria-label="Toggle navigation menu"
			>
				{#if mobileOpen}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
		<div class="md:hidden border-t border-[#e6e8eb] bg-white/95 backdrop-blur-xl px-6 py-6 shadow-xl flex flex-col gap-4 font-sans text-base font-medium text-[#06070a] animate-entrance-1">
			<a href="#capabilities" onclick={closeMobile} class="py-2 border-b border-[#f3f4f6] no-underline">
				Capabilities
			</a>
			<a href="#works" onclick={closeMobile} class="py-2 border-b border-[#f3f4f6] no-underline">
				Selected Works
			</a>
			<a href="#manifesto" onclick={closeMobile} class="py-2 border-b border-[#f3f4f6] no-underline">
				Atelier Manifesto
			</a>
			<a href="#faq" onclick={closeMobile} class="py-2 border-b border-[#f3f4f6] no-underline">
				FAQ
			</a>
		</div>
	{/if}
</header>
