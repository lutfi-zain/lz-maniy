import { createOpenAI } from '@ai-sdk/openai';

export const OPENCODE_VERSION = '1.18.31';
export const OPENCODE_USER_AGENT = `opencode/${OPENCODE_VERSION} ai-sdk/provider-utils/4.0.40 runtime/bun/1.3.14`;
export const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1';

const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
let counter = 0;
let lastTimestamp = 0;

export function generateId(
	prefix: 'ses' | 'msg',
	descending: boolean,
	timestamp = Date.now()
): string {
	if (timestamp !== lastTimestamp) {
		lastTimestamp = timestamp;
		counter = 0;
	}
	counter++;

	const current = BigInt(timestamp) * 0x1000n + BigInt(counter);
	const value = descending ? ~current : current;
	const timeHex = Array.from({ length: 6 }, (_, index) =>
		Number((value >> BigInt(40 - 8 * index)) & 0xffn)
			.toString(16)
			.padStart(2, '0')
	).join('');

	const bytes = crypto.getRandomValues(new Uint8Array(14));
	const rand = Array.from(bytes, (b) => ID_CHARS[b % 62]).join('');
	return `${prefix}_${timeHex}${rand}`;
}

export function createOpenCodeFetch(
	apiKey = 'public',
	customFetch: typeof fetch = globalThis.fetch
): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

		const headers = new Headers(init?.headers);

		if (!headers.has('Authorization')) {
			headers.set('Authorization', `Bearer ${apiKey || 'public'}`);
		}

		if (typeof url === 'string' && url.includes('opencode.ai')) {
			const now = Date.now();
			headers.set('User-Agent', OPENCODE_USER_AGENT);
			headers.set('x-opencode-client', 'cli');
			headers.set('x-opencode-project', 'global');
			if (!headers.has('x-opencode-session')) {
				headers.set('x-opencode-session', generateId('ses', true, now - 3000));
			}
			headers.set('x-opencode-request', generateId('msg', false, now));
		}

		return customFetch(input, {
			...init,
			headers
		});
	};
}

export function createOpenCodeProvider(
	apiKey = 'public',
	customFetch?: typeof fetch
) {
	return createOpenAI({
		name: 'opencode',
		baseURL: OPENCODE_BASE_URL,
		apiKey: apiKey || 'public',
		fetch: createOpenCodeFetch(apiKey, customFetch)
	});
}
