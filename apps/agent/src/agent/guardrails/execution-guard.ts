/**
 * Tier 3: Tool Execution & Sandboxing Guardrails
 * Enforces tenant boundary isolation and runtime schema bounds.
 */

export interface TenantContext {
	userId: string;
	sessionId: string;
}

export interface ExecutionSafetyResult {
	safe: boolean;
	violationReason?: string;
}

/**
 * Validates that an executed tool operation belongs strictly to the authenticated user.
 */
export function validateTenantBoundary(
	authContext: TenantContext,
	requestedUserId?: string
): ExecutionSafetyResult {
	if (requestedUserId && requestedUserId !== authContext.userId) {
		return {
			safe: false,
			violationReason: `Cross-tenant violation: attempted to access user '${requestedUserId}' from authenticated context '${authContext.userId}'.`
		};
	}
	return { safe: true };
}

/**
 * Validates date parameters ensuring they conform to valid ISO-8601 or YYYY-MM-DD bounds.
 */
export function validateDateBounds(dateStr: string): boolean {
	if (!dateStr) return false;
	const isStandardDate = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(dateStr);
	if (!isStandardDate) return false;
	const timestamp = Date.parse(dateStr);
	return !Number.isNaN(timestamp);
}
