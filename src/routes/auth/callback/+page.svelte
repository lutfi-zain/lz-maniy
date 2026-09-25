<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { DEFAULT_API_URL } from '$lib/stores/mock-data';
	import { authStore, type TokenResponse } from '$lib/stores/auth.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';

	let status = $state<'processing' | 'error'>('processing');
	let errorMessage = $state<string>('');

	onMount(async () => {
		const code = page.url.searchParams.get('code');
		const state = page.url.searchParams.get('state');
		const err = page.url.searchParams.get('error');
		const errDesc = page.url.searchParams.get('error_description');

		if (err) {
			status = 'error';
			errorMessage = errDesc || `Otorisasi gagal: ${err}`;
			return;
		}

		if (!code) {
			goto('/login', { replaceState: true });
			return;
		}

		// Verify state matching anti-CSRF token
		const savedState = sessionStorage.getItem('reedrich_oauth_state');
		if (!savedState || (state && savedState !== state)) {
			status = 'error';
			errorMessage = 'Verifikasi keamanan (CSRF state) tidak cocok atau sesi telah kedaluwarsa.';
			sessionStorage.removeItem('reedrich_oauth_state');
			sessionStorage.removeItem('reedrich_pkce_verifier');
			return;
		}

		// Retrieve PKCE verifier
		const codeVerifier = sessionStorage.getItem('reedrich_pkce_verifier');
		if (!codeVerifier) {
			status = 'error';
			errorMessage = 'Kode verifikasi PKCE tidak ditemukan. Silakan login kembali.';
			return;
		}

		// Purge temporary handshake tokens
		sessionStorage.removeItem('reedrich_oauth_state');
		sessionStorage.removeItem('reedrich_pkce_verifier');

		try {
			const redirectUri = `${window.location.origin}/auth/callback`;
			const res = await fetch(`${DEFAULT_API_URL}/oauth/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					grant_type: 'authorization_code',
					client_id: 'maniyy-web',
					code,
					redirect_uri: redirectUri,
					code_verifier: codeVerifier
				})
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => ({}))) as { error_description?: string };
				status = 'error';
				errorMessage =
					errData.error_description || `Gagal menukar kode otorisasi (HTTP ${res.status}).`;
				return;
			}

			const data = (await res.json()) as TokenResponse;
			if (data.access_token) {
				authStore.setSession(data);
				await reedrichStore.fetchSnapshot();

				const target = sessionStorage.getItem('reedrich_auth_target') || '/';
				sessionStorage.removeItem('reedrich_auth_target');
				goto(target, { replaceState: true });
			} else {
				status = 'error';
				errorMessage = 'Token tidak valid dari server otorisasi.';
			}
		} catch (err: unknown) {
			status = 'error';
			errorMessage =
				'Terjadi kesalahan jaringan saat menukar token: ' +
				(err instanceof Error ? err.message : String(err));
		}
	});
</script>

<svelte:head>
	<title>Menyelesaikan Autentikasi · Maniyy</title>
</svelte:head>

<div class="flex min-h-screen w-full items-center justify-center bg-[#F7F6F3] p-4 text-[#111111]">
	<div
		class="w-full max-w-sm rounded-xl border border-[#EAEAEA] bg-white p-7 text-center shadow-2xs"
	>
		{#if status === 'processing'}
			<div
				class="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg border border-[#EAEAEA] bg-[#F9F9F8]"
			>
				<span
					class="size-4 animate-spin rounded-full border-2 border-[#111111]/20 border-t-[#111111]"
				></span>
			</div>
			<h1 class="font-serif text-lg font-semibold tracking-tight text-[#111111]">
				Menyelesaikan Autentikasi
			</h1>
			<p class="mt-1.5 text-xs leading-relaxed text-[#787774]">
				Memverifikasi kredensial Google Anda dengan Reedrich Engine...
			</p>
		{:else}
			<div
				class="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg border border-[#FDEBEC] bg-[#FDEBEC]"
			>
				<WarningCircle class="size-5 text-[#9F2F2D]" weight="bold" />
			</div>
			<h1 class="font-serif text-lg font-semibold tracking-tight text-[#9F2F2D]">
				Autentikasi Gagal
			</h1>
			<p class="mt-2 text-xs leading-relaxed text-[#787774]">
				{errorMessage}
			</p>
			<div class="mt-5">
				<a
					href="/login"
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2F3437]"
				>
					<ArrowLeft class="size-3.5" weight="bold" />
					<span>Kembali ke Login</span>
				</a>
			</div>
		{/if}
	</div>
</div>
