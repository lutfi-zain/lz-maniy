/// <reference types="@cloudflare/workers-types" />
import { tool } from 'ai';
import { z } from 'zod';
import { createApiClient, extractErrorMessage } from './http.js';

export function createFeedbackTools(reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const { request } = createApiClient(reedrichUrl, token, fetcher);

	return {
		submit_feedback: tool({
			description: 'Kirim masukan, laporan bug, atau usulan fitur baru ke tim pengembang Reedrich.',
			parameters: z.object({
				title: z.string().min(5).max(200).describe('Judul ringkas masukan/bug/fitur'),
				content: z.string().min(10).max(4000).describe('Penjelasan rincian masukan atau kendala'),
				type: z.enum(['feedback', 'bug', 'feature_request', 'question']).default('feedback')
			}),
			execute: async (params) => {
				const res = await request('/api/v1/feedback', {
					method: 'POST',
					body: JSON.stringify(params)
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(`submit_feedback failed: ${extractErrorMessage(err, res.status)}`);
				}
				return await res.json();
			}
		})
	};
}
