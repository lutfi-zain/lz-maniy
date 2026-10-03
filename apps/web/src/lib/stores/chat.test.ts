import { describe, it, expect, beforeEach } from 'vitest';
import { ChatStore } from './chat.svelte.js';

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
	it('has 3 curated OMP default models', () => {
		expect(store.availableModels.length).toBe(3);
		const models = store.availableModels.map((m) => m.model);
		expect(models).toEqual([
			'google-antigravity/gemini-3.1-flash-lite',
			'google-antigravity/gemini-3.7-flash',
			'google-antigravity/gemini-3.8-flash'
		]);
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
});
