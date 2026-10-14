import type { Env } from '../types.js';

export interface TelegramAlertPayload {
	title: string;
	sessionId?: string;
	userId?: string;
	userMessage?: string;
	assistantOutput?: string;
	reason?: string;
	score?: number;
	phoenixTraceId?: string;
	latencyMs?: number;
	phoenixBaseUrl?: string;
	langfuseBaseUrl?: string;
}

/**
 * Dispatch structured incident notifications to Telegram via Bot API.
 * Never throws — failures are logged safely so caller's request is unblocked.
 */
export async function sendTelegramAlert(
	env: Env,
	alert: TelegramAlertPayload
): Promise<boolean> {
	const token = env.TELEGRAM_BOT_TOKEN;
	const chatId = env.TELEGRAM_ALERT_CHAT_ID || '8990169257';

	if (!token) {
		console.log('[Alerts] TELEGRAM_BOT_TOKEN not configured. Skipping Telegram notification.');
		return false;
	}

	const phoenixUrl = env.PHOENIX_ENDPOINT
		? env.PHOENIX_ENDPOINT.replace(/\/v1\/traces\/?$/, '')
		: 'https://phoenix.membran.app';
	const langfuseUrl = env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';

	const userPromptExcerpt = alert.userMessage ? alert.userMessage.slice(0, 200).replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&') : '-';
	const assistantExcerpt = alert.assistantOutput ? alert.assistantOutput.slice(0, 200).replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&') : '-';
	const reasonEscaped = alert.reason ? alert.reason.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&') : 'N/A';

	let text = `🚨 *[Maniy Observability Alert]*\n\n`;
	text += `*Event*: ${alert.title.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&')}\n`;
	text += `*Session*: \`${alert.sessionId || 'N/A'}\`\n`;
	if (alert.userId) text += `*User*: \`${alert.userId}\`\n`;
	if (alert.score !== undefined) text += `*Score*: \`${alert.score.toFixed(2)}\`\n`;
	if (alert.latencyMs !== undefined) text += `*Latency*: \`${(alert.latencyMs / 1000).toFixed(1)}s\`\n`;
	if (alert.reason) text += `*Detail*: ${reasonEscaped}\n`;
	text += `\n*Prompt Excerpt*:\n${userPromptExcerpt}\n`;
	if (alert.assistantOutput) {
		text += `\n*Output Excerpt*:\n${assistantExcerpt}\n`;
	}
	text += `\n*Dashboards*:\n`;
	text += `• [Arize Phoenix](${phoenixUrl})\n`;
	text += `• [Langfuse Cloud](${langfuseUrl})\n`;

	try {
		const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: 'MarkdownV2',
				disable_web_page_preview: true
			})
		});

		if (!res.ok) {
			const err = await res.text();
			console.warn(`[Alerts] Telegram API responded with status ${res.status}: ${err}`);
			return false;
		}

		return true;
	} catch (err) {
		console.warn('[Alerts] Failed to dispatch Telegram incident notification:', err);
		return false;
	}
}
