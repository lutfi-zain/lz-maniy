<script lang="ts">
	import { transactionFormStore } from '$lib/stores/transaction-form.svelte';
	import { reedrichStore } from '$lib/stores/reedrich.svelte';
	import { categoryFormStore } from '$lib/stores/category-form.svelte';
	import { fmtIDR } from '$lib/utils/currency';
	import { t, i18nStore } from '$lib/i18n/index.svelte';
	import X from 'phosphor-svelte/lib/X';
	import Check from 'phosphor-svelte/lib/Check';
	import TransactionDetailView from './TransactionDetailView.svelte';
	import ComboboxSingleSelect, {
		type ComboboxOption
	} from '$lib/components/ui/ComboboxSingleSelect.svelte';
	import SingleDatePicker from '$lib/components/ui/SingleDatePicker.svelte';
	import type {
		CreateTransactionPayload,
		CreateTransferPayload,
		TransactionType,
		UpdateTransactionPayload
	} from '$lib/types/account-detail';

	const isOpen = $derived(transactionFormStore.isOpen);
	const mode = $derived(transactionFormStore.mode);
	const transactionType = $derived(transactionFormStore.transactionType);
	const existingTxn = $derived(transactionFormStore.existingTransaction);

	// Filter categories by transaction type
	const availableCategories = $derived.by(() => {
		if (transactionType === 'transfer') return [];
		return reedrichStore.categories.filter((c) => c.categoryType === transactionType);
	});

	// Target wallets available (must exclude selected source wallet)
	const availableTargetWallets = $derived.by(() => {
		return reedrichStore.allWallets.filter((w) => w.walletId !== transactionFormStore.walletId);
	});

	// Options formatted for custom ComboboxSingleSelect
	const sourceWalletOptions = $derived<ComboboxOption[]>(
		reedrichStore.allWallets.map((w) => ({
			value: w.walletId,
			label: w.walletName,
			group: w.institution || 'Lainnya',
			subtext: fmtIDR(w.balance)
		}))
	);

	const targetWalletOptions = $derived<ComboboxOption[]>(
		availableTargetWallets.map((w) => ({
			value: w.walletId,
			label: w.walletName,
			group: w.institution || 'Lainnya',
			subtext: fmtIDR(w.balance)
		}))
	);

	const categoryOptions = $derived<ComboboxOption[]>(
		availableCategories.map((c) => ({
			value: c.categoryId,
			label: c.categoryName
		}))
	);

	const budgetOptions = $derived<ComboboxOption[]>(
		reedrichStore.activeBudgets.map((b) => ({
			value: b.budgetId,
			label: b.budgetName,
			subtext: `Sisa: ${fmtIDR(b.remaining)}`
		}))
	);
	// Validation errors map
	let touched = $state(false);

	const fieldErrors = $derived.by(() => {
		if (!touched) return {};
		const errors: Record<string, string> = {};

		if (!transactionFormStore.walletId) {
			errors.walletId = 'Pilih akun sumber.';
		}

		if (transactionType === 'transfer') {
			if (!transactionFormStore.targetWalletId) {
				errors.targetWalletId = 'Pilih akun tujuan.';
			} else if (transactionFormStore.targetWalletId === transactionFormStore.walletId) {
				errors.targetWalletId = 'Akun tujuan harus berbeda dengan akun sumber.';
			}
		} else {
			if (!transactionFormStore.categoryId) {
				errors.categoryId = 'Pilih kategori transaksi.';
			}
		}

		if (
			transactionFormStore.amount === null ||
			transactionFormStore.amount <= 0 ||
			isNaN(transactionFormStore.amount)
		) {
			errors.amount = 'Nominal harus lebih dari 0.';
		}

		if (!transactionFormStore.date) {
			errors.date = 'Pilih tanggal transaksi.';
		}

		return errors;
	});

	const hasErrors = $derived(Object.keys(fieldErrors).length > 0);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			if (mode === 'edit' && existingTxn) {
				// Revert to view mode
				transactionFormStore.openView(existingTxn);
			} else {
				transactionFormStore.close();
			}
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		touched = true;

		if (!transactionFormStore.isValid || hasErrors) {
			return;
		}

		transactionFormStore.isSaving = true;
		transactionFormStore.error = null;

		try {
			if (mode === 'create') {
				if (transactionType === 'transfer') {
					const payload: CreateTransferPayload = {
						sourceWalletId: transactionFormStore.walletId,
						targetWalletId: transactionFormStore.targetWalletId,
						amount: transactionFormStore.amount!,
						adminFee: transactionFormStore.adminFee || 0,
						description: transactionFormStore.description.trim() || null,
						date: transactionFormStore.date,
						isPlanned: transactionFormStore.isPlanned
					};
					await reedrichStore.createTransfer(payload);
				} else {
					const payload: CreateTransactionPayload = {
						walletId: transactionFormStore.walletId,
						categoryId: transactionFormStore.categoryId,
						amount: transactionFormStore.amount!,
						type: transactionType as 'expense' | 'income',
						date: transactionFormStore.date,
						adminFee: transactionFormStore.adminFee || 0,
						description: transactionFormStore.description.trim() || null,
						budgetId: transactionFormStore.budgetId || null,
						isPlanned: transactionFormStore.isPlanned
					};
					await reedrichStore.createTransaction(payload);
				}
				transactionFormStore.close();
			} else if (mode === 'edit' && existingTxn) {
				const delta: UpdateTransactionPayload = {
					amount: transactionFormStore.amount!,
					adminFee: transactionFormStore.adminFee || 0,
					description: transactionFormStore.description.trim() || null,
					date: transactionFormStore.date,
					isPlanned: transactionFormStore.isPlanned
				};

				delta.walletId = transactionFormStore.walletId;
				if (existingTxn.transactionType === 'transfer') {
					delta.targetWalletId = transactionFormStore.targetWalletId;
				} else {
					delta.categoryId = transactionFormStore.categoryId || null;
					delta.budgetId = transactionFormStore.budgetId || null;
				}

				const updated = await reedrichStore.updateTransaction(existingTxn.transactionId, delta);
				// Revert to view mode with updated record
				transactionFormStore.openView({
					...existingTxn,
					...updated,
					transactionAmount: transactionFormStore.amount!,
					transactionWalletId: transactionFormStore.walletId,
					transactionTargetWalletId:
						existingTxn.transactionType === 'transfer'
							? transactionFormStore.targetWalletId
							: existingTxn.transactionTargetWalletId,
					transactionDescription: transactionFormStore.description.trim() || null,
					transactionDate: transactionFormStore.date,
					transactionIsPlanned: transactionFormStore.isPlanned ? 1 : 0
				});
			}
		} catch (err: unknown) {
			transactionFormStore.error =
				err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan transaksi.';
		} finally {
			transactionFormStore.isSaving = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-black/25 backdrop-blur-xs transition-opacity duration-200 {isOpen
		? 'pointer-events-auto opacity-100'
		: 'pointer-events-none opacity-0'}"
	onclick={() => transactionFormStore.close()}
></div>

<!-- Slide-Over Drawer Container -->
<div
	class="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[620px] flex-col border-l border-[#EAEAEA] bg-white shadow-xl transition-all duration-300 ease-out {isOpen
		? 'translate-x-0 opacity-100'
		: 'pointer-events-none invisible translate-x-full opacity-0'}"
	aria-labelledby="transaction-drawer-title"
	role="dialog"
	aria-modal="true"
>
	<!-- Drawer Header -->
	<div class="flex items-start justify-between border-b border-[#EAEAEA] bg-[#F9F9F8] px-6 py-4">
		<div>
			<span
				class="rounded-full bg-[#EFEFED] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#111111] uppercase"
			>
				{mode === 'view'
					? (i18nStore.locale === 'id' ? 'Detail Transaksi' : 'Transaction Details')
					: mode === 'edit'
						? t('forms.transaction.titleEdit')
						: t('forms.transaction.titleCreate')}
			</span>
			<h2 id="transaction-drawer-title" class="serif mt-1 text-2xl font-medium text-[#111111]">
				{mode === 'view'
					? existingTxn?.transactionDescription || (i18nStore.locale === 'id' ? 'Rincian Transaksi' : 'Transaction Details')
					: mode === 'edit'
						? t('forms.transaction.titleEdit')
						: t('forms.transaction.titleCreate')}
			</h2>
			<p class="mt-0.5 text-xs text-[#787774]">
				{mode === 'view'
					? (i18nStore.locale === 'id' ? 'Lihat metadata dan riwayat perubahan transaksi' : 'View transaction metadata and audit trail')
					: (i18nStore.locale === 'id' ? 'Isi informasi transaksi untuk sinkronisasi live' : 'Enter transaction details for live sync')}
			</p>
		</div>

		<button
			type="button"
			onclick={() => transactionFormStore.close()}
			class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs text-[#787774] transition-all hover:border-[#111111] hover:bg-[#111111] hover:text-white"
			title="Tutup (ESC)"
		>
			<kbd class="font-mono text-[10px]">ESC</kbd>
			<X class="size-3.5" weight="bold" />
		</button>
	</div>

	<!-- Drawer Body Content -->
	<div class="flex-1 overflow-y-auto px-6 py-5">
		{#if mode === 'view' && existingTxn}
			<TransactionDetailView transaction={existingTxn} />
		{:else}
			<!-- Create or Edit Form -->
			<form onsubmit={handleSubmit} class="flex flex-col gap-4 text-xs">
				<!-- Three-Way Type Switcher (ToggleGroup pattern) -->
				<div>
					<label for="txn-type-label" class="mb-1.5 block font-medium text-[#111111]">
						{t('common.type')}
					</label>
					<div
						id="txn-type-label"
						class="grid grid-cols-3 gap-1 rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-1"
					>
						{#each [{ id: 'expense', label: t('forms.transaction.typeExpense') }, { id: 'income', label: t('forms.transaction.typeIncome') }, { id: 'transfer', label: t('forms.transaction.typeTransfer') }] as tab (tab.id)}
							{@const isSelected = transactionType === tab.id}
							{@const isLocked =
								mode === 'edit' &&
								existingTxn?.transactionType === 'transfer' &&
								tab.id !== 'transfer'}
							<button
								type="button"
								disabled={isLocked}
								onclick={() => {
									touched = false;
									transactionFormStore.setType(tab.id as TransactionType);
								}}
								class="flex cursor-pointer items-center justify-center rounded-md py-1.5 font-medium transition-all {isSelected
									? 'bg-[#111111] text-white shadow-xs'
									: 'text-[#787774] hover:text-[#111111]'} {isLocked
									? 'cursor-not-allowed opacity-40'
									: ''}"
							>
								{tab.label}
							</button>
						{/each}
					</div>
					{#if mode === 'edit' && existingTxn?.transactionType === 'transfer'}
						<p class="mt-1 font-mono text-[10px] text-[#787774]">
							* Tipe transaksi transfer tidak dapat diubah menjadi pemasukan/pengeluaran.
						</p>
					{/if}
				</div>

				<!-- Wallet Selection -->
				{#if transactionType === 'transfer'}
					<!-- Dual Wallet (Transfer): Source & Target -->
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label for="sourceWalletId" class="mb-1 block font-medium text-[#111111]">
								{t('forms.transaction.sourceAccount')} <span class="text-[#9F2F2D]">*</span>
							</label>
							<ComboboxSingleSelect
								options={sourceWalletOptions}
								bind:value={transactionFormStore.walletId}
								placeholder="Pilih akun sumber..."
								searchPlaceholder="Cari akun/bank..."
								hasError={Boolean(fieldErrors.walletId)}
							/>
							{#if fieldErrors.walletId}
								<p class="mt-1 text-[11px] text-[#9F2F2D]">{fieldErrors.walletId}</p>
							{/if}
						</div>

						<div>
							<label for="targetWalletId" class="mb-1 block font-medium text-[#111111]">
								{t('forms.transaction.targetAccount')} <span class="text-[#9F2F2D]">*</span>
							</label>
							<ComboboxSingleSelect
								options={targetWalletOptions}
								bind:value={transactionFormStore.targetWalletId}
								placeholder="Pilih akun tujuan..."
								searchPlaceholder="Cari akun tujuan..."
								hasError={Boolean(fieldErrors.targetWalletId)}
							/>
							{#if fieldErrors.targetWalletId}
								<p class="mt-1 text-[11px] text-[#9F2F2D]">{fieldErrors.targetWalletId}</p>
							{/if}
						</div>
					</div>
				{:else}
					<!-- Single Wallet (Expense or Income) -->
					<div>
						<label for="walletId" class="mb-1 block font-medium text-[#111111]">
							{transactionType === 'income' ? t('forms.transaction.targetAccount') : t('forms.transaction.sourceAccount')}
							<span class="text-[#9F2F2D]">*</span>
						</label>
						<ComboboxSingleSelect
							options={sourceWalletOptions}
							bind:value={transactionFormStore.walletId}
							placeholder="Pilih akun..."
							searchPlaceholder="Cari akun/bank..."
							hasError={Boolean(fieldErrors.walletId)}
						/>
						{#if fieldErrors.walletId}
							<p class="mt-1 text-[11px] text-[#9F2F2D]">{fieldErrors.walletId}</p>
						{/if}
					</div>
				{/if}

				<!-- Category (Hidden for transfer) -->
				{#if transactionType !== 'transfer'}
					<div>
						<div class="mb-1 flex items-center justify-between">
							<label for="categoryId" class="block font-medium text-[#111111]">
								{t('common.category')} <span class="text-[#9F2F2D]">*</span>
							</label>
							<button
								type="button"
								onclick={() =>
									categoryFormStore.openCreate(
										transactionType === 'income' ? 'income' : 'expense'
									)}
								class="cursor-pointer text-[11px] font-medium text-[#787774] underline hover:text-[#111111]"
							>
								{t('forms.transaction.addCategoryQuick')}
							</button>
						</div>
						<ComboboxSingleSelect
							options={categoryOptions}
							bind:value={transactionFormStore.categoryId}
							placeholder={`Pilih kategori ${transactionType === 'income' ? 'pemasukan' : 'pengeluaran'}...`}
							searchPlaceholder="Cari kategori..."
							hasError={Boolean(fieldErrors.categoryId)}
						/>
						{#if fieldErrors.categoryId}
							<p class="mt-1 text-[11px] text-[#9F2F2D]">{fieldErrors.categoryId}</p>
						{/if}
					</div>
				{/if}

				<!-- Amount & Admin Fee -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<label for="amount" class="mb-1 block font-medium text-[#111111]">
							{t('forms.transaction.amountLabel')} (IDR) <span class="text-[#9F2F2D]">*</span>
						</label>
						<div class="relative">
							<span
								class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-xs text-[#787774]"
							>
								Rp
							</span>
							<input
								id="amount"
								type="number"
								min="1"
								step="any"
								placeholder="0"
								bind:value={transactionFormStore.amount}
								class="w-full rounded-md border bg-white py-2 pr-3 pl-9 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none {fieldErrors.amount
									? 'border-[#9F2F2D]'
									: 'border-[#EAEAEA]'}"
							/>
						</div>
						{#if fieldErrors.amount}
							<p class="mt-1 text-[11px] text-[#9F2F2D]">{fieldErrors.amount}</p>
						{/if}
					</div>

					<div>
						<label for="adminFee" class="mb-1 block font-medium text-[#111111]">
							{i18nStore.locale === 'id' ? 'Biaya Admin (Opsional)' : 'Admin Fee (Optional)'}
						</label>
						<div class="relative">
							<span
								class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-xs text-[#787774]"
							>
								Rp
							</span>
							<input
								id="adminFee"
								type="number"
								min="0"
								step="any"
								placeholder="0"
								bind:value={transactionFormStore.adminFee}
								class="w-full rounded-md border border-[#EAEAEA] bg-white py-2 pr-3 pl-9 font-mono text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
							/>
						</div>
					</div>
				</div>

				<!-- Tanggal Transaksi -->
				<div>
					<label for="date" class="mb-1 block font-medium text-[#111111]">
						{t('forms.transaction.dateLabel')} <span class="text-[#9F2F2D]">*</span>
					</label>
					<SingleDatePicker
						bind:value={transactionFormStore.date}
						placeholder="Pilih tanggal transaksi..."
						hasError={Boolean(fieldErrors.date)}
					/>
					{#if fieldErrors.date}
						<p class="mt-1 text-[11px] text-[#9F2F2D]">{fieldErrors.date}</p>
					{/if}
				</div>

				<!-- Description Textarea -->
				<div>
					<label for="description" class="mb-1 block font-medium text-[#111111]">
						{t('forms.transaction.descriptionLabel')}
					</label>
					<textarea
						id="description"
						rows="2"
						placeholder="Misal: Makan siang, bayar wifi, dll."
						bind:value={transactionFormStore.description}
						class="w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-xs text-[#111111] transition-colors focus:border-[#111111] focus:outline-none"
					></textarea>
				</div>

				<!-- Planned Checkbox -->
					<div class="rounded-lg border border-[#EAEAEA] bg-[#F9F9F8] p-3">
						<label class="flex cursor-pointer items-center gap-2.5">
							<input
								type="checkbox"
								bind:checked={transactionFormStore.isPlanned}
								class="size-4 cursor-pointer rounded border-[#EAEAEA] text-[#111111] accent-[#111111]"
							/>
							<div class="flex flex-col">
								<span class="font-medium text-[#111111]">{t('forms.transaction.plannedLabel')}</span>
								<span class="text-[11px] text-[#787774]">
									{t('forms.transaction.plannedDescription')}
								</span>
							</div>
						</label>
					</div>

				<!-- Budget Linked (Visible only for Expense if budgets exist) -->
				{#if transactionType === 'expense' && reedrichStore.activeBudgets.length > 0}
					<div>
						<label for="budgetId" class="mb-1 block font-medium text-[#111111]">
							{t('forms.transaction.budgetLabel')}
						</label>
						<ComboboxSingleSelect
							options={budgetOptions}
							bind:value={transactionFormStore.budgetId}
							placeholder="Pilih budget (opsional)..."
							searchPlaceholder="Cari budget..."
						/>
					</div>
				{/if}

				<!-- Error Banner -->
				{#if transactionFormStore.error}
					<div class="rounded-lg border border-[#FDEBEC] bg-[#FDEBEC] p-3 text-xs text-[#9F2F2D]">
						{transactionFormStore.error}
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="mt-4 flex items-center justify-end gap-3 border-t border-[#EAEAEA] pt-4">
					<button
						type="button"
						onclick={() => {
							if (mode === 'edit' && existingTxn) {
								transactionFormStore.openView(existingTxn);
							} else {
								transactionFormStore.close();
							}
						}}
						disabled={transactionFormStore.isSaving}
						class="cursor-pointer rounded-md border border-[#EAEAEA] bg-white px-4 py-2 font-medium text-[#787774] transition-colors hover:bg-[#F9F9F8] disabled:opacity-50"
					>
						{t('common.cancel')}
					</button>

					<button
						type="submit"
						disabled={transactionFormStore.isSaving}
						class="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#111111] px-5 py-2 font-medium text-white transition-all hover:bg-[#333333] active:scale-98 disabled:opacity-50"
					>
						{#if transactionFormStore.isSaving}
							<span
								class="size-3 animate-spin rounded-full border-2 border-white border-t-transparent"
							></span>
							<span>{t('common.saving')}</span>
						{:else}
							<Check class="size-3.5" weight="bold" />
							<span>{mode === 'edit' ? t('forms.transaction.submitEdit') : t('forms.transaction.submitCreate')}</span>
						{/if}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
