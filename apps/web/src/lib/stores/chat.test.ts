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
		expect(store.selectedModel.model).toBe('gemini-3.1-flash-lite');
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
		store.messages = [{ id: '1', conversationId: 'conv-123', role: 'user', content: 'test', timestamp: 0 }];
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
});
