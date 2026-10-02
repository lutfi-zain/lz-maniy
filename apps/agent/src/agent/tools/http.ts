/// <reference types="@cloudflare/workers-types" />

export function extractErrorMessage(err: unknown, fallback: string | number): string {
	if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
		return err.message;
	}
	return String(fallback);
}

export function createApiClient(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const headers = {
		Authorization: `Bearer ${token}`,
		'X-Api-Key': token,
		'Content-Type': 'application/json'
	};

	const request = async (path: string, init?: RequestInit): Promise<Response> => {
		const url = `${reedrichUrl}${path}`;
		const mergedHeaders = { ...headers, ...init?.headers };
		if (fetcher) {
			return fetcher.fetch(new Request(url, { ...init, headers: mergedHeaders }));
		}
		return fetch(url, { ...init, headers: mergedHeaders });
	};

	return { request };
}
