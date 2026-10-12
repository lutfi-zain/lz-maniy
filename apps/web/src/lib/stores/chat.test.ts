import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatStore } from './chat.svelte.js';
import { authStore } from './auth.svelte.js';
describe('ChatStore', () => {
	let store: ChatStore;

	beforeEach(() => {
		store = new ChatStore();
	});

	it('initializes with default values', () => {
		expect(store.panelOpen).toBe(false);
		expect(store.panelWidth).toBe(360);
		expect(store.isStreaming).toBe(false);
		expect(store.messages).toEqual([]);
		expect(store.selectedModel.model).toBe('google-antigravity/gemini-3.7-flash');
	});
	it('has 12 OMP Gemini models in default models', () => {
		expect(store.availableModels.length).toBe(12);
		const models = store.availableModels.map((m) => m.model);
		expect(models).toContain('google-antigravity/gemini-2.5-flash-lite');
		expect(models).toContain('google-antigravity/gemini-3.7-flash');
		expect(models).toContain('google-antigravity/gemini-2.5-pro');
	});


	it('toggles panel visibility', () => {
		store.togglePanel();
		expect(store.panelOpen).toBe(true);
		store.togglePanel();
		expect(store.panelOpen).toBe(false);
		store.togglePanel(true);
		expect(store.panelOpen).toBe(true);
	});

	it('clamps panel width between 280px and max', () => {
		store.setPanelWidth(100);
		expect(store.panelWidth).toBe(280);
	});

	it('toggles maximized state with docked width memory', () => {
		expect(store.maximized).toBe(false);
		store.setPanelWidth(420);
		store.toggleMaximize();
		expect(store.maximized).toBe(true);
		expect(store.lastDockedWidth).toBe(420);
		store.toggleMaximize();
		expect(store.maximized).toBe(false);
		expect(store.panelWidth).toBe(420);
	});

	it('ignores width changes while maximized', () => {
		store.toggleMaximize(true);
		store.setPanelWidth(500);
		expect(store.panelWidth).toBe(360);
	});

	it('resets conversation state on newConversation', () => {
		store.activeConversationId = 'conv-123';
		store.messages = [
			{ id: '1', conversationId: 'conv-123', role: 'user', content: 'test', timestamp: 0 }
		];
		store.newConversation();
		expect(store.activeConversationId).toBeNull();
		expect(store.messages).toEqual([]);
	});

	it('switches model', () => {
		store.setModel({
			provider: 'groq',
			model: 'openai/gpt-oss-20b',
			displayName: 'GPT-OSS 20B (Groq Fast)',
			capabilities: { vision: false, tool_calling: true }
		});
		expect(store.selectedModel.provider).toBe('groq');
		expect(store.selectedModel.model).toBe('openai/gpt-oss-20b');
	});

	it('configures and updates thinking level', () => {
		expect(store.thinkingLevel).toBe('medium');
		store.setThinkingLevel('high');
		expect(store.thinkingLevel).toBe('high');
		store.setThinkingLevel('off');
		expect(store.thinkingLevel).toBe('off');
	});

	it('switches assistant message variant correctly', () => {
		store.messages = [
			{
				id: 'user-1',
				conversationId: 'c1',
				role: 'user',
				content: 'Hitung saldo',
				timestamp: 1000
			},
			{
				id: 'asst-1',
				conversationId: 'c1',
				role: 'assistant',
				content: 'Saldo Anda 10 juta (Versi 2)',
				variants: [
					{ content: 'Saldo Anda 5 juta (Versi 1)', toolInvocations: [], timestamp: 1001 },
					{ content: 'Saldo Anda 10 juta (Versi 2)', toolInvocations: [], timestamp: 1002 }
				],
				activeVariantIndex: 1,
				timestamp: 1002
			}
		];

		// Switch to version 1 (index 0)
		store.switchMessageVariant('asst-1', 0);
		expect(store.messages[1].activeVariantIndex).toBe(0);
		expect(store.messages[1].content).toBe('Saldo Anda 5 juta (Versi 1)');

		// Switch back to version 2 (index 1)
		store.switchMessageVariant('asst-1', 1);
		expect(store.messages[1].activeVariantIndex).toBe(1);
		expect(store.messages[1].content).toBe('Saldo Anda 10 juta (Versi 2)');

		// Out of range index should be ignored
		store.switchMessageVariant('asst-1', 99);
		expect(store.messages[1].activeVariantIndex).toBe(1);
	});

	describe('resumeLastConversationIfFresh', () => {
		it('auto-resumes most recent conversation when fresh', async () => {
			store.conversations = [
				{ id: 'conv-recent', title: 'Percakapan Kemarin', createdAt: 100, updatedAt: 200, messageCount: 2, model: 'google-antigravity/gemini-3.7-flash', provider: 'omp' },
				{ id: 'conv-older', title: 'Percakapan Lama', createdAt: 50, updatedAt: 60, messageCount: 4, model: 'google-antigravity/gemini-3.7-flash', provider: 'omp' }
			];

			let loadedId: string | null = null;
			store.loadConversation = async (id: string) => {
				loadedId = id;
				store.activeConversationId = id;
				store.messages = [{ id: 'm1', conversationId: id, role: 'user', content: 'Halo', timestamp: 1 }];
			};

			await store.resumeLastConversationIfFresh();
			expect(loadedId).toBe('conv-recent');
			expect(store.activeConversationId).toBe('conv-recent');
		});

		it('does not resume if conversation already active', async () => {
			store.conversations = [
				{ id: 'conv-recent', title: 'Percakapan Kemarin', createdAt: 100, updatedAt: 200, messageCount: 2, model: 'google-antigravity/gemini-3.7-flash', provider: 'omp' }
			];
			store.activeConversationId = 'conv-current';

			let called = false;
			store.loadConversation = async () => {
				called = true;
			};

			await store.resumeLastConversationIfFresh();
			expect(called).toBe(false);
			expect(store.activeConversationId).toBe('conv-current');
		});

		it('does not resume if user explicitly started newConversation', async () => {
			store.conversations = [
				{ id: 'conv-recent', title: 'Percakapan Kemarin', createdAt: 100, updatedAt: 200, messageCount: 2, model: 'google-antigravity/gemini-3.7-flash', provider: 'omp' }
			];
			store.newConversation(); // sets hasAttemptedAutoResume = true

			let called = false;
			store.loadConversation = async () => {
				called = true;
			};

			await store.resumeLastConversationIfFresh();
			expect(called).toBe(false);
			expect(store.activeConversationId).toBeNull();
		});
	});

	describe('executeStream resilience and error surfacing', () => {
		const originalFetch = globalThis.fetch;

		afterEach(() => {
			globalThis.fetch = originalFetch;
			vi.restoreAllMocks();
		});

		it('surfaces generic agent error directly in assistant message content', async () => {
			authStore.accessToken = 'test_token';
			vi.spyOn(authStore, 'isDemo', 'get').mockReturnValue(false);
			vi.spyOn(authStore, 'getValidToken').mockResolvedValue('test_token');

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				headers: new Headers()
			});

			await store.sendMessage('Halo');

			expect(store.isStreaming).toBe(false);
			const assistantMsg = store.messages.find((m) => m.role === 'assistant');
			expect(assistantMsg).toBeDefined();
			expect(assistantMsg?.content).toContain('⚠️ Agent error: 500');
		});

		it('surfaces credit exhaustion 402 error clearly in message content', async () => {
			authStore.accessToken = 'test_token';
			vi.spyOn(authStore, 'isDemo', 'get').mockReturnValue(false);
			vi.spyOn(authStore, 'getValidToken').mockResolvedValue('test_token');

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 402,
				headers: new Headers()
			});

			await store.sendMessage('Cek saldo');

			expect(store.isStreaming).toBe(false);
			const assistantMsg = store.messages.find((m) => m.role === 'assistant');
			expect(assistantMsg?.content).toContain('Saldo kredit Anda habis (HTTP 402)');
		});

		it('retries request once after successful 401 token refresh', async () => {
			authStore.accessToken = 'expired_token';
			authStore.refreshToken = 'valid_refresh';
			vi.spyOn(authStore, 'isDemo', 'get').mockReturnValue(false);
			vi.spyOn(authStore, 'getValidToken').mockResolvedValue('expired_token');
			const refreshSpy = vi.spyOn(authStore, 'refreshSession').mockImplementation(async () => {
				authStore.accessToken = 'new_fresh_token';
				return true;
			});

			const ssePayload = '0:"Halo dari agen!"\n';
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(ssePayload));
					controller.close();
				}
			});

			const mockFetch = vi.fn()
				.mockResolvedValueOnce({
					ok: false,
					status: 401,
					headers: new Headers()
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					headers: new Headers({ 'X-Conversation-Id': 'conv_123' }),
					body: stream
				});

			globalThis.fetch = mockFetch;

			await store.sendMessage('Tes 401');

			expect(refreshSpy).toHaveBeenCalledTimes(1);
			const chatCalls = mockFetch.mock.calls.filter(([url]) => String(url).includes('/api/chat'));
			expect(chatCalls.length).toBe(2);
			expect(chatCalls[0][1]?.method).toBe('POST');
			expect(chatCalls[1][1]?.method).toBe('POST');
			expect(store.isStreaming).toBe(false);
			const assistantMsg = store.messages.find((m) => m.role === 'assistant');
			expect(assistantMsg?.content).toBe('Halo dari agen!');
		});
	});
});
