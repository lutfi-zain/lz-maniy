<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import TransactionFormDrawer from '$lib/components/transaction/TransactionFormDrawer.svelte';
	import DrilldownDrawer from '$lib/components/drawer/DrilldownDrawer.svelte';
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
	import { chatStore } from '$lib/stores/chat.svelte.js';
	import { settingsStore } from '$lib/stores/settings.svelte.js';
	import { PUBLIC_AGENT_URL } from '$env/static/public';

	let { children } = $props();

	// Public routes that do not require an active session
	const isPublicRoute = $derived<boolean>(
		page.url.pathname === '/login' || page.url.pathname.startsWith('/auth/callback')
	);

	onMount(() => {
		// Sync live snapshot and user profile on mount if authenticated
		if (authStore.isAuthenticated) {
			reedrichStore.fetchSnapshot();
			reedrichStore.fetchUserProfile();
			reedrichStore.fetchAllTransactions();
			if (authStore.accessToken) {
				settingsStore.load(PUBLIC_AGENT_URL, authStore.accessToken);
			}
		}
	});

	$effect(() => {
		// Wait until authStore has hydrated from localStorage
		if (!authStore.isInitialized) return;

		// If unauthenticated and trying to access a protected route
		if (!authStore.isAuthenticated && !isPublicRoute) {
			const target = page.url.pathname + page.url.search;
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('reedrich_auth_target', target);
			}
			goto('/login', { replaceState: true });
		}
		// If authenticated and visiting /login, redirect to cockpit
		else if (authStore.isAuthenticated && page.url.pathname === '/login') {
			goto('/', { replaceState: true });
		}

		if (authStore.isAuthenticated && authStore.accessToken && !settingsStore.isLoaded) {
			settingsStore.load(PUBLIC_AGENT_URL, authStore.accessToken);
		}
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (!authStore.isAuthenticated) return;
		// Ctrl+K / Cmd+K: toggle chat panel
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			chatStore.togglePanel();
			return;
		}
		// N: new transaction (skip if focus in any input or chat panel)
		if (e.key === 'n' || e.key === 'N') {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.tagName === 'SELECT' ||
					target.isContentEditable ||
					target.closest('[data-chat-input]'))
			) {
				return;
			}
			if (!transactionFormStore.isOpen) {
				e.preventDefault();
				transactionFormStore.openCreate();
			}
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<svelte:window onkeydown={handleGlobalKeydown} />

{#if !authStore.isInitialized}
	<!-- Minimalist Shield Loader to prevent Flash of Unauthenticated Content (FOUC) -->
	<div class="flex min-h-screen w-full items-center justify-center bg-[#F7F6F3]">
		<div class="flex items-center gap-2 font-mono text-xs text-[#787774]">
			<span class="size-1.5 animate-pulse rounded-full bg-[#111111]"></span>
			<span>Memverifikasi sesi...</span>
		</div>
	</div>
{:else if isPublicRoute}
	<!-- Standalone shell for Login and OAuth Callback (Clean, distraction-free) -->
	<main class="min-h-screen w-full bg-[#F7F6F3]">
		{@render children()}
	</main>
{:else}
	<!-- Full Protected App Shell -->
	<div
		class="flex min-h-screen w-full flex-col bg-[#F7F6F3] font-sans text-[#111111]"
		style={chatStore.panelOpen ? `padding-right: ${chatStore.panelWidth}px;` : undefined}
	>
		<Topbar />
		<main class="mx-auto w-full max-w-[1400px] flex-1 px-3.5 py-4 pb-20 sm:px-6 sm:py-5 sm:pb-6">
			{@render children()}
		</main>
		<footer
			class="mb-14 border-t border-[#EAEAEA] bg-white py-3 text-center font-mono text-[10px] text-[#787774] sm:text-[11px] md:mb-0 md:py-4"
		>
			Maniyy Cockpit · Svelte 5 + Tailwind · Status: {reedrichStore.isLive
				? 'Live Edge'
				: 'Mock Cache'}
		</footer>
		<BottomNav />
		<TransactionFormDrawer />
		<DrilldownDrawer />
		<ChatPanel />
	</div>
{/if}
