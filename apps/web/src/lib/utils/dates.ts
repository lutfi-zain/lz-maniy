/**
 * Formats an ISO date string into standard Indonesian day, short month, year format.
 * Example: "2026-09-22T10:00:00+07:00" -> "22 Sep 2026"
 */
export function dFmt(dateStr: string | null | undefined): string {
	if (!dateStr) return '—';
	try {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	} catch {
		return String(dateStr);
	}
}

/**
 * Formats an ISO date string with time in Indonesian format.
 * Example: "2026-09-22T10:00:00+07:00" -> "22 Sep 2026, 10.00"
 */
export function dFmtTime(dateStr: string | null | undefined): string {
	if (!dateStr) return '—';
	try {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return String(dateStr);
	}
}

/**
 * Formats a year-month key ("2026-09") into localized month name and year ("September 2026").
 */
export function mLabel(monthKey: string | null | undefined): string {
	if (!monthKey) return '—';
	try {
		const parts = monthKey.split('-');
		const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
		return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
	} catch {
		return String(monthKey);
	}
}
