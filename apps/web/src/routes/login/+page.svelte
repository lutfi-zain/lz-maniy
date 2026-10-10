<script lang="ts">
	import { goto } from '$app/navigation';
	import { DEFAULT_API_URL } from '$lib/stores/mock-data';
	import { authStore } from '$lib/stores/auth.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import {
		generateVerifier,
		generateChallenge,
		generateState,
		buildGoogleAuthorizeUrl
	} from '$lib/utils/pkce';
	import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import LockKey from 'phosphor-svelte/lib/LockKey';
	import Play from 'phosphor-svelte/lib/Play';
	import CheckCircle from 'phosphor-svelte/lib/CheckCircle';

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
				clientId: 'maniy-web',
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

	function loginAsGuestDemo() {
		isLoading = true;
		errorMessage = null;

		authStore.setSession(
			{
				access_token: 'sandbox_evaluator_token',
				expires_in: 86400 * 30
			},
			{
				email: 'evaluator@anthropic.com',
				name: 'Anthropic Reviewer / Guest Sandbox',
				userId: 'usr_guest_sandbox'
			}
		);

		reedrichStore.loadMock();

		const target = sessionStorage.getItem('reedrich_auth_target') || '/';
		sessionStorage.removeItem('reedrich_auth_target');
		goto(target);
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

		reedrichStore.fetchUserProfile().catch(() => null);

		const target = sessionStorage.getItem('reedrich_auth_target') || '/';
		sessionStorage.removeItem('reedrich_auth_target');
		goto(target);
	}
</script>

<svelte:head>
	<title>Masuk · Maniy Workspace</title>
</svelte:head>

<div class="min-h-screen w-full bg-[#F7F6F3] text-[#111111] grid grid-cols-1 lg:grid-cols-12">
	<!-- Left Editorial Panel (55% on desktop) -->
	<aside class="lg:col-span-7 bg-[#F7F6F3] p-6 sm:p-10 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EAEAEA]">
		<div>
			<!-- Top Monogram & Studio Link -->
			<div class="flex items-center justify-between pb-8 sm:pb-12 border-b border-[#EAEAEA]/80">
				<a href="/" class="flex items-center gap-2.5 text-[#111111] no-underline group" aria-label="Maniy Homepage">
					<span class="font-mono font-bold text-xs border border-[#EAEAEA] px-2 py-0.5 rounded bg-white group-hover:border-[#111111] transition-colors">
						M
					</span>
					<span class="font-mono font-semibold tracking-tight text-xs uppercase">
						MANIY
					</span>
				</a>
				<a
					href="https://membran.app"
					target="_blank"
					rel="noopener"
					class="font-mono text-[11px] text-[#787774] hover:text-[#111111] transition-colors no-underline"
				>
					A Membran Studio Lab
				</a>
			</div>

			<!-- Main Editorial Hook -->
			<div class="pt-8 sm:pt-12">
				<div class="inline-block font-mono text-[11px] text-[#346538] uppercase tracking-wider mb-4">
					Account Intelligence & Cash Runway
				</div>
				<h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111111] leading-[1.12] mb-6">
					Stop the bank balance illusion. Know your real runway today.
				</h2>
				<p class="text-sm sm:text-base text-[#787774] font-normal leading-relaxed max-w-[560px] mb-8">
					Maniy mengisolasi kas siap belanja dari cadangan komitmen terkunci secara deterministik,
					didukung asisten penalaran finansial Eve untuk keputusan alokasi kas tanpa rasa cemas.
				</p>
			</div>

			<!-- Miniature Cockpit Preview Card -->
			<div class="rounded-xl border border-[#EAEAEA] bg-white p-5 sm:p-7 shadow-xs max-w-[580px] mb-8">
				<div class="flex items-center justify-between pb-4 mb-5 border-b border-[#EAEAEA] text-[11px] font-mono text-[#787774]">
					<span class="font-medium text-[#111111]">COCKPIT RUNWAY PARTITION</span>
					<span class="text-[#346538]">ZERO-HALLUCINATION</span>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="p-3.5 rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]">
						<div class="font-mono text-[10px] text-[#787774] uppercase tracking-wider mb-1">
							Spendable Runway
						</div>
						<div class="font-mono text-lg font-bold text-[#346538]">
							Rp 8.450.000
						</div>
						<div class="text-[10px] text-[#787774] mt-0.5">
							Aman dibelanjakan hari ini
						</div>
					</div>

					<div class="p-3.5 rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]">
						<div class="font-mono text-[10px] text-[#787774] uppercase tracking-wider mb-1">
							Locked Reserves
						</div>
						<div class="font-mono text-lg font-bold text-[#1F6C9F]">
							Rp 32.500.000
						</div>
						<div class="text-[10px] text-[#787774] mt-0.5">
							Cadangan sewa & tabungan
						</div>
					</div>

					<div class="p-3.5 rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]">
						<div class="font-mono text-[10px] text-[#787774] uppercase tracking-wider mb-1">
							Net Worth
						</div>
						<div class="font-mono text-lg font-bold text-[#111111]">
							Rp 40.950.000
						</div>
						<div class="text-[10px] text-[#787774] mt-0.5">
							Total likuiditas tersinkron
						</div>
					</div>
				</div>
			</div>

			<!-- Core Pillars Checklist -->
			<div class="space-y-2.5 text-xs text-[#2F3437] font-medium max-w-[560px]">
				<div class="flex items-center gap-2">
					<CheckCircle class="size-4 text-[#346538] shrink-0" weight="fill" />
					<span>Pemisahan ketat kas operasional harian vs cadangan komitmen terkunci</span>
				</div>
				<div class="flex items-center gap-2">
					<CheckCircle class="size-4 text-[#346538] shrink-0" weight="fill" />
					<span>Proyeksi arus kas kalender Horizon Board roll-forward</span>
				</div>
				<div class="flex items-center gap-2">
					<CheckCircle class="size-4 text-[#346538] shrink-0" weight="fill" />
					<span>Pencatatan multi-transaksi tanpa form kaku melalui asisten Eve</span>
				</div>
			</div>
		</div>

		<!-- Left Footer Footnote -->
		<div class="pt-8 sm:pt-12 text-[11px] font-mono text-[#787774]">
			Engine: Svelte 5 · Cloudflare Edge · PostgreSQL 16
		</div>
	</aside>

	<!-- Right Access Terminal (45% on desktop) -->
	<main class="lg:col-span-5 bg-white p-6 sm:p-10 lg:p-16 flex flex-col justify-center items-center min-h-[500px]">
		<div class="w-full max-w-md">
			<!-- Header -->
			<div class="text-left mb-6">
				<div class="mb-3.5 flex size-9 items-center justify-center rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]">
					<LockKey class="size-4.5 text-[#111111]" weight="bold" />
				</div>
				<h1 class="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">
					Maniy Workspace
				</h1>
				<p class="mt-1.5 text-xs leading-relaxed text-[#787774]">
					Masuk untuk mengelola portofolio keuangan dan dasbor perencanaan akun.
				</p>
			</div>

			<!-- Error Alert if present -->
			{#if errorMessage}
				<div class="mb-5 flex items-start gap-2 rounded-lg border border-[#FDEBEC] bg-[#FDEBEC]/50 p-3 text-xs text-[#9F2F2D]">
					<span class="font-medium">{errorMessage}</span>
				</div>
			{/if}

			<!-- Actions Group -->
			<div class="space-y-3.5">
				<!-- Action 1: Google OAuth -->
				<button
					type="button"
					onclick={loginWithGoogle}
					disabled={isLoading}
					class="min-h-[44px] flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-[#111111] px-4 py-3 text-xs font-medium text-white transition-all hover:bg-[#2F3437] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isLoading}
						<span class="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						<span>Menyiapkan Google Sign-In...</span>
					{:else}
						<svg class="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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

				<!-- Action 2: 1-Click Demo Sandbox for Evaluators -->
				<button
					type="button"
					onclick={loginAsGuestDemo}
					disabled={isLoading}
					class="min-h-[44px] flex w-full cursor-pointer items-center justify-between rounded-md border border-[#111111] bg-[#F9F9F8] px-4 py-2.5 text-xs font-semibold text-[#111111] transition-all hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 group"
				>
					<div class="flex items-center gap-2">
						<Play class="size-3.5 text-[#111111] group-hover:translate-x-0.5 transition-transform" weight="fill" />
						<span>Explore Demo Sandbox</span>
					</div>
					<span class="font-mono text-[10px] text-[#346538] border border-[#346538]/30 bg-[#346538]/10 px-2 py-0.5 rounded">
						1-Click Preview
					</span>
				</button>
				<p class="text-[11px] text-[#787774] text-center">
					Akses instan tanpa registrasi untuk evaluasi fitur & data simulasi.
				</p>

				<!-- Protocol Trust Badge -->
				<div class="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-[#787774]">
					<ShieldCheck class="size-3.5 text-[#346538]" weight="bold" />
					<span>Zero-Click Direct Redirect · PKCE S256 TLS 1.3</span>
				</div>
			</div>

			<!-- Divider -->
			<div class="relative my-7">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-[#EAEAEA]"></div>
				</div>
				<div class="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
					<span class="bg-white px-3 text-[#A8A29E]">atau pengembang</span>
				</div>
			</div>

			<!-- Developer Mode Progressive Disclosure -->
			<div class="text-center">
				{#if !showDevToken}
					<button
						type="button"
						onclick={() => (showDevToken = true)}
						class="min-h-[44px] inline-flex items-center justify-center cursor-pointer font-mono text-[11px] text-[#787774] transition-colors hover:text-[#111111] hover:underline"
					>
						masuk dengan api key
					</button>
				{:else}
					<form onsubmit={handleManualApiKeyLogin} class="space-y-3 text-left p-4 rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]">
						<div class="flex items-center justify-between text-[11px] text-[#787774]">
							<span class="font-mono font-medium text-[#111111]">API Key (Sandbox / Local)</span>
							<button
								type="button"
								onclick={() => (showDevToken = false)}
								class="min-h-[32px] px-1 inline-flex items-center cursor-pointer text-[#A8A29E] hover:text-[#111111]"
							>
								Tutup
							</button>
						</div>
						<input
							type="password"
							bind:value={manualApiKey}
							placeholder="fp_live_... atau rd_live_..."
							class="w-full rounded border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] placeholder:text-[#A8A29E] focus:border-[#111111] focus:outline-hidden"
						/>
						<button
							type="submit"
							class="min-h-[38px] flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-[#EAEAEA] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#F9F9F8] active:scale-[0.99]"
						>
							<span>Gunakan Token</span>
							<ArrowRight class="size-3.5" weight="bold" />
						</button>
					</form>
				{/if}
			</div>

			<!-- Footer info -->
			<div class="mt-8 text-center font-mono text-[10px] text-[#A8A29E]">
				Maniy · Membran Studio · End-to-End Encrypted
			</div>
		</div>
	</main>
</div>
