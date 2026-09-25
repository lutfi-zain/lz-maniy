<script lang="ts">
	import { goto } from '$app/navigation';
	import { DEFAULT_API_URL } from '$lib/stores/mock-data';
	import { authStore } from '$lib/stores/auth.svelte';
	import {
		generateVerifier,
		generateChallenge,
		generateState,
		buildGoogleAuthorizeUrl
	} from '$lib/utils/pkce';
	import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck';
	import CaretDown from 'phosphor-svelte/lib/CaretDown';
	import CaretUp from 'phosphor-svelte/lib/CaretUp';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import LockKey from 'phosphor-svelte/lib/LockKey';

	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);
	let showDevToken = $state(false);
	let manualApiKey = $state('');

	async function loginWithGoogle() {
		isLoading = true;
		errorMessage = null;

		try {
			const verifier = generateVerifier();
			const challenge = await generateChallenge(verifier);
			const state = generateState();

			sessionStorage.setItem('reedrich_pkce_verifier', verifier);
			sessionStorage.setItem('reedrich_oauth_state', state);

			const redirectUri = `${window.location.origin}/auth/callback`;

			const authUrl = buildGoogleAuthorizeUrl({
				baseUrl: DEFAULT_API_URL,
				clientId: 'maniyy-web',
				redirectUri,
				challenge,
				state,
				scope: 'mcp'
			});

			window.location.href = authUrl;
		} catch (err) {
			console.error('Failed to initiate Google OAuth:', err);
			errorMessage = 'Gagal menyiapkan autentikasi Google. Silakan coba lagi.';
			isLoading = false;
		}
	}

	function handleManualApiKeyLogin(e: Event) {
		e.preventDefault();
		const key = manualApiKey.trim();
		if (!key) {
			errorMessage = 'Masukkan API Key yang valid.';
			return;
		}

		authStore.setSession(
			{
				access_token: key,
				expires_in: 86400 * 30
			},
			{
				email: 'dev@reedrich.local',
				name: 'Developer Sandbox',
				userId: 'usr_dev_sandbox'
			}
		);

		const target = sessionStorage.getItem('reedrich_auth_target') || '/';
		sessionStorage.removeItem('reedrich_auth_target');
		goto(target);
	}
</script>

<svelte:head>
	<title>Masuk · Maniyy Workspace</title>
</svelte:head>

<div
	class="flex min-h-screen w-full flex-col items-center justify-center bg-[#F7F6F3] p-4 text-[#111111]"
>
	<!-- Login Card Container -->
	<div class="w-full max-w-md rounded-xl border border-[#EAEAEA] bg-white p-7 shadow-2xs sm:p-9">
		<!-- Brand & Header -->
		<div class="text-center">
			<div
				class="mx-auto mb-3.5 flex size-10 items-center justify-center rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]"
			>
				<LockKey class="size-5 text-[#111111]" weight="bold" />
			</div>
			<h1 class="font-serif text-2xl font-semibold tracking-tight text-[#111111]">
				Maniyy Workspace
			</h1>
			<p class="mt-1.5 text-xs leading-relaxed text-[#787774]">
				Perencanaan keuangan, neraca saldo multi-rekening, dan analitik arus kas terintegrasi
				Reedrich Engine.
			</p>
		</div>

		<!-- Error Alert if present -->
		{#if errorMessage}
			<div
				class="mt-5 flex items-start gap-2 rounded-lg border border-[#FDEBEC] bg-[#FDEBEC]/50 p-3 text-xs text-[#9F2F2D]"
			>
				<span class="font-medium">{errorMessage}</span>
			</div>
		{/if}

		<!-- Primary Action: Google OAuth -->
		<div class="mt-6 space-y-3">
			<button
				type="button"
				onclick={loginWithGoogle}
				disabled={isLoading}
				class="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-[#111111] px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-[#2F3437] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if isLoading}
					<span class="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
					></span>
					<span>Menyiapkan Google Sign-In...</span>
				{:else}
					<!-- Google Icon SVG (Standard Multi-color) -->
					<svg class="size-4 shrink-0" viewBox="0 0 24 24">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
						/>
					</svg>
					<span>Lanjutkan dengan Google</span>
				{/if}
			</button>

			<div class="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-[#787774]">
				<ShieldCheck class="size-3.5 text-[#346538]" weight="bold" />
				<span>Zero-Click Direct Redirect · PKCE S256 TLS 1.3</span>
			</div>
		</div>

		<!-- Divider -->
		<div class="relative my-6 flex items-center justify-center border-t border-[#EAEAEA]">
			<span class="bg-white px-2 font-mono text-[10px] text-[#787774] uppercase">atau</span>
		</div>

		<!-- Developer Sandbox Accordion -->
		<div>
			<button
				type="button"
				onclick={() => (showDevToken = !showDevToken)}
				class="flex w-full cursor-pointer items-center justify-between text-[11px] font-medium text-[#787774] transition-colors hover:text-[#111111]"
			>
				<span>Mode Pengembang / API Key Manual</span>
				{#if showDevToken}
					<CaretUp class="size-3" weight="bold" />
				{:else}
					<CaretDown class="size-3" weight="bold" />
				{/if}
			</button>

			{#if showDevToken}
				<form onsubmit={handleManualApiKeyLogin} class="mt-3 space-y-2.5">
					<input
						type="password"
						bind:value={manualApiKey}
						placeholder="fp_live_... atau rd_live_..."
						class="w-full rounded border border-[#EAEAEA] bg-[#F9F9F8] px-3 py-2 font-mono text-xs text-[#111111] placeholder:text-[#787774] focus:border-[#111111] focus:outline-hidden"
					/>
					<button
						type="submit"
						class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8]"
					>
						<span>Gunakan Token Manual</span>
						<ArrowRight class="size-3" weight="bold" />
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Footer Metadata -->
	<footer class="mt-6 text-center font-mono text-[10px] text-[#787774]">
		Maniyy Cockpit · Reedrich Edge Intelligence · End-to-End Encrypted
	</footer>
</div>
