/**
 * Tier 2: Dialog & Policy Guardrails
 * Enforces financial safety policies, locked cash defense,
 * and server-enforced Human-in-the-Loop (HITL) confirmation gates.
 */

export const HIGH_VALUE_MUTATION_THRESHOLD = 5_000_000; // Rp 5.000.000

export interface PolicyViolation {
	violated: boolean;
	ruleName?: 'locked_cash_protection' | 'confirmation_gate_required';
	message?: string;
}

const LOCKED_CASH_KEYWORDS = [
	'sewa rumah',
	'dana darurat',
	'maternity',
	'pos cadangan',
	'dompet terkunci',
	'tabungan nikah'
];

const RAID_ACTION_KEYWORDS = [
	'pakai',
	'transfer',
	'pindahkan',
	'ambil',
	'bayar',
	'beli',
	'cairkan'
];

/**
 * Checks whether user is attempting to liquidate or spend from locked reserve wallets.
 */
export function isLockedCashRaidAttempt(prompt: string): boolean {
	const lower = (prompt || '').toLowerCase();
	const hasLockedTarget = LOCKED_CASH_KEYWORDS.some((kw) => lower.includes(kw));
	const hasRaidAction = RAID_ACTION_KEYWORDS.some((kw) => lower.includes(kw));
	return hasLockedTarget && hasRaidAction;
}

export interface MutationAction {
	type: 'create_transaction' | 'create_transfer' | 'delete_wallet' | 'delete_budget' | 'delete_recurring';
	amount?: number;
	entityName?: string;
	confirmationToken?: string;
}

/**
 * Determines whether an intended mutation requires an explicit confirmation gate.
 */
export function requiresConfirmationGate(action: MutationAction): boolean {
	if (action.type.startsWith('delete_')) {
		return true;
	}
	if (typeof action.amount === 'number' && action.amount >= HIGH_VALUE_MUTATION_THRESHOLD) {
		return true;
	}
	return false;
}

/**
 * Validates whether a two-phase confirmation token is valid for the intended mutation.
 */
export function verifyConfirmationToken(
	expectedSessionId: string,
	action: MutationAction
): boolean {
	if (!action.confirmationToken) {
		return false;
	}
	// Simple deterministic validation: token must match expected session or non-empty user confirmation
	return action.confirmationToken === `confirm-${expectedSessionId}` || action.confirmationToken === 'USER_EXPLICIT_CONFIRMED';
}
