<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { dateFilterStore } from '$lib/stores/date-filter.svelte';
	import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import Table from 'phosphor-svelte/lib/Table';
	import Bank from 'phosphor-svelte/lib/Bank';
	import Compass from 'phosphor-svelte/lib/Compass';
	import Target from 'phosphor-svelte/lib/Target';
	import SignOut from 'phosphor-svelte/lib/SignOut';
	import UserCircle from 'phosphor-svelte/lib/UserCircle';
	import DeviceMobile from 'phosphor-svelte/lib/DeviceMobile';
	import Plus from 'phosphor-svelte/lib/Plus';
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte';
	import { dFmt } from '$lib/utils/dates';
	import ChatToggleButton from '$lib/components/chat/ChatToggleButton.svelte';
	const pathname = $derived(page.url.pathname);
	let isUserMenuOpen = $state(false);

	function isActive(path: string): boolean {
		if (path === '/') return pathname === '/';
		return pathname.startsWith(path);
	}

	function handleLogout() {
		isUserMenuOpen = false;
		authStore.logout();
		dateFilterStore.reset();
		reedrichStore.reset();
		goto('/login');
	}

	// Calculate user initials
	const userInitials = $derived.by(() => {
		if (authStore.user?.firstName && authStore.user?.lastName) {
			return (authStore.user.firstName[0] + authStore.user.lastName[0]).toUpperCase();
		}
		const name = authStore.user?.fullName || authStore.user?.name || authStore.user?.email || 'U';
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	});
</script>

<header class="sticky top-0 z-30 border-b border-[#EAEAEA] bg-white">
	<!-- Primary Navigation Bar -->
	<div
		class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2.5 px-3 py-2 sm:px-6"
	>
		<div class="flex items-center gap-3 sm:gap-6">
			<a
				href="/"
				class="flex shrink-0 items-center gap-1.5 font-semibold text-[#111111] no-underline"
			>
				<ShieldCheck class="size-5 text-[#111111]" weight="bold" />
				<span class="text-sm font-semibold tracking-tight">Maniyy</span>
			</a>

			<nav class="hidden shrink-0 items-center gap-1 md:flex">
				<a
					href="/"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Compass class="size-3.5" weight="bold" />
					<span>Cockpit</span>
				</a>

				<a
					href="/ledger"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/ledger'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Table class="size-3.5" weight="bold" />
					<span>Ledger</span>
					<span
						class="py-0.2 rounded-full px-1.5 font-mono text-[10px] {isActive('/ledger')
							? 'bg-white/20 text-white'
							: 'bg-[#F0EFEC] text-[#787774]'}"
					>
						359
					</span>
				</a>

				<a
					href="/accounts"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/accounts'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Bank class="size-3.5" weight="bold" />
					<span>Akun & Bank</span>
					<span
						class="py-0.2 rounded-full px-1.5 font-mono text-[10px] {isActive('/accounts')
							? 'bg-white/20 text-white'
							: 'bg-[#F0EFEC] text-[#787774]'}"
					>
						{reedrichStore.allWallets.length}
					</span>
				</a>

				<a
					href="/planning"
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium no-underline transition-colors {isActive(
						'/planning'
					)
						? 'bg-[#111111] text-white'
						: 'text-[#787774] hover:bg-[#F9F9F8] hover:text-[#111111]'}"
				>
					<Target class="size-3.5" weight="bold" />
					<span>Perencanaan</span>
				</a>
			</nav>
		</div>

		<!-- Right Connection & User Profile Bar -->
		<div class="flex items-center gap-2.5 sm:gap-3">
			<ChatToggleButton />
			<button
				type="button"
				onclick={() => reedrichStore.fetchSnapshot()}
				disabled={reedrichStore.isLoading}
				class="flex cursor-pointer items-center gap-1.5 rounded border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs font-medium text-[#111111] transition-transform hover:bg-[#EFEFED] active:scale-98 disabled:opacity-50"
				title="Sinkronkan data live"
			>
				<ArrowsClockwise
					class="size-3 {reedrichStore.isLoading ? 'animate-spin' : ''}"
					weight="bold"
				/>
				<span class="hidden sm:inline">Sync</span>
			</button>

			{#if authStore.isAuthenticated}
				<button
					type="button"
					onclick={() => transactionFormStore.openCreate()}
					class="hidden cursor-pointer items-center gap-1.5 rounded border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs font-medium text-[#111111] transition-transform hover:bg-[#F9F9F8] active:scale-98 md:flex"
					title="Catat transaksi baru (N)"
				>
					<Plus class="size-3.5" weight="bold" />
					<span>Catat</span>
				</button>
			{/if}

			<div class="flex items-center gap-1.5 border-l border-[#EAEAEA] pl-2 sm:pl-3">
				<span
					class="size-2 rounded-full {reedrichStore.isLive ? 'bg-[#346538]' : 'bg-[#C9C4B8]'}"
					title={reedrichStore.isLive ? 'Live API Connected' : 'Offline / Mock Cache'}
				></span>
				<span class="font-mono text-[11px] text-[#787774]">
					{reedrichStore.isLive ? 'LIVE' : 'MOCK'}
				</span>
			</div>

			<!-- User Profile & Dropdown -->
			<div class="relative">
				{#if authStore.isAuthenticated}
					<button
						type="button"
						onclick={() => (isUserMenuOpen = !isUserMenuOpen)}
						class="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#EAEAEA] bg-[#F9F9F8] p-1 text-xs font-medium text-[#111111] transition-colors hover:border-[#111111]"
						title={authStore.user?.email || 'Profil Pengguna'}
						aria-label="Profil Pengguna"
					>
						<span
							class="flex size-6 items-center justify-center rounded-full bg-[#111111] font-mono text-[10px] font-semibold text-white"
						>
							{userInitials}
						</span>
					</button>

					{#if isUserMenuOpen}
						<!-- Dropdown Menu -->
						<div
							class="absolute right-0 mt-2 w-56 rounded-lg border border-[#EAEAEA] bg-white p-2 text-xs shadow-lg"
						>
							<div class="border-b border-[#EAEAEA] px-2.5 py-2">
								<p class="font-semibold text-[#111111]">
									{authStore.user?.fullName || authStore.user?.name || 'Pengguna'}
								</p>
								<p class="truncate text-[11px] text-[#787774]">
									{authStore.user?.email || 'Akun Aktif'}
								</p>
								{#if authStore.user?.whatsappNumber}
									<p class="mt-1 flex items-center gap-1 font-mono text-[10px] text-[#787774]">
										<DeviceMobile class="size-3 text-[#346538]" weight="bold" />
										<span>{authStore.user.whatsappNumber}</span>
									</p>
								{/if}
								{#if authStore.user?.createdAt}
									<p class="mt-1 font-mono text-[9px] text-[#A8A29E]">
										Anggota sejak {dFmt(authStore.user.createdAt)}
									</p>
								{/if}
							</div>
							<div class="pt-1.5">
								<button
									type="button"
									onclick={handleLogout}
									class="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-[#9F2F2D] transition-colors hover:bg-[#FDEBEC]"
								>
									<SignOut class="size-3.5" weight="bold" />
									<span>Keluar (Logout)</span>
								</button>
							</div>
						</div>
					{/if}
				{:else}
					<a
						href="/login"
						class="flex items-center gap-1 rounded bg-[#111111] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#333333]"
					>
						<UserCircle class="size-3.5" weight="bold" />
						<span>Masuk</span>
					</a>
				{/if}
			</div>
		</div>
	</div>
</header>
