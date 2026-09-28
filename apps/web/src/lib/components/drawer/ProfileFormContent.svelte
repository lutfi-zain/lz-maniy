<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import Check from 'phosphor-svelte/lib/Check';
	let firstName = $state(authStore.user?.firstName || '');
	let lastName = $state(authStore.user?.lastName || '');
	let whatsappNumber = $state(authStore.user?.whatsappNumber || '');
	let isSubmitting = $state(false);
	let localError = $state<string | null>(null);
	let localSuccess = $state<string | null>(null);

	const isValid = $derived(firstName.trim().length > 0);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		localError = null;
		localSuccess = null;

		try {
			await reedrichStore.updateProfile({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				whatsappNumber: whatsappNumber.trim()
			});
			localSuccess = 'Profil berhasil diperbarui!';
			setTimeout(() => {
				reedrichStore.closeDrawer();
			}, 800);
		} catch (err: unknown) {
			localError = err instanceof Error ? err.message : 'Gagal memperbarui profil pengguna';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4 text-xs">
	{#if localError}
		<div class="rounded-md border border-[#FDEBEC] bg-[#FDF2F2] p-2.5 text-xs text-[#9F2F2D]">
			{localError}
		</div>
	{/if}

	{#if localSuccess}
		<div class="rounded-md border border-[#EDF3EC] bg-[#F3FAF2] p-2.5 text-xs text-[#346538]">
			{localSuccess}
		</div>
	{/if}

	<div>
		<label for="prof-email" class="mb-1 block font-medium text-[#111111]">
			Alamat Email
		</label>
		<input
			id="prof-email"
			type="text"
			disabled
			value={authStore.user?.email || 'testbot@maniyy.dev'}
			class="w-full rounded-md border border-[#EAEAEA] bg-[#F9F9F8] px-3 py-2 text-xs text-[#787774] cursor-not-allowed"
		/>
	</div>

	<!-- First & Last Name -->
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="prof-first" class="mb-1 block font-medium text-[#111111]">
				Nama Depan <span class="text-[#9F2F2D]">*</span>
			</label>
			<input
				id="prof-first"
				type="text"
				required
				bind:value={firstName}
				placeholder="Nama depan..."
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>

		<div>
			<label for="prof-last" class="mb-1 block font-medium text-[#111111]">
				Nama Belakang
			</label>
			<input
				id="prof-last"
				type="text"
				bind:value={lastName}
				placeholder="Nama belakang..."
				class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
			/>
		</div>
	</div>

	<!-- WhatsApp Number -->
	<div>
		<label for="prof-wa" class="mb-1 block font-medium text-[#111111]">
			Nomor WhatsApp
		</label>
		<input
			id="prof-wa"
			type="tel"
			bind:value={whatsappNumber}
			placeholder="+6281234567890"
			class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
		/>
		<p class="mt-1 text-[11px] text-[#787774]">
			Digunakan untuk laporan rekap finansial otomatis dan notifikasi alert.
		</p>
	</div>

	<!-- Action Buttons -->
	<div class="mt-2 flex items-center justify-end gap-2 border-t border-[#EAEAEA] pt-4">
		<button
			type="button"
			onclick={() => reedrichStore.closeDrawer()}
			class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-4 py-2 text-xs font-medium text-[#787774] transition-colors hover:bg-[#F9F9F8] hover:text-[#111111]"
		>
			Batal
		</button>
		<button
			type="submit"
			disabled={!isValid || isSubmitting}
			class="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Check class="size-3.5" weight="bold" />
			<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}</span>
		</button>
	</div>
</form>
