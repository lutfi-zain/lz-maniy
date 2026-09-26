import { goto } from '$app/navigation';
import { page } from '$app/state';
import { PUBLIC_AGENT_URL } from '$env/static/public';
import type {
	ChatMessage,
	ConversationMeta,
	ModelConfig,
	PageContext,
	UICommand
} from '@maniyy/shared';
import { authStore } from './auth.svelte.js';
import { reedrichStore } from './reedrich.svelte.js';
import { transactionFormStore } from './transaction-form.svelte.js';
import { dateFilterStore } from './date-filter.svelte.js';

export class ChatStore {
	conversations = $state<ConversationMeta[]>([]);
	activeConversationId = $state<string | null>(null);
	messages = $state<ChatMessage[]>([]);
	isLoadingHistory = $state<boolean>(false);
	isStreaming = $state<boolean>(false);
	panelOpen = $state<boolean>(false);
	panelWidth = $state<number>(360);
	availableModels = $state<ModelConfig[]>([]);
	showConversationList = $state<boolean>(false);
	selectedModel = $state<ModelConfig>({
		provider: 'groq',
		model: 'openai/gpt-oss-20b',
		displayName: 'GPT-OSS 20B (Groq Fast)',
		capabilities: { vision: false, tool_calling: true }
	});

	private abortController: AbortController | null = null;
	private readonly STORAGE_WIDTH_KEY = 'maniyy_chat_panel_width';

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem(this.STORAGE_WIDTH_KEY);
			if (saved) {
				this.panelWidth = Math.max(280, Math.min(window.innerWidth * 0.5, Number(saved)));
			}
		}
	}

	activeConversation = $derived(
		this.conversations.find((c) => c.id === this.activeConversationId) ?? null
	);

	hasMessages = $derived(this.messages.length > 0);

	togglePanel = (force?: boolean) => {
		this.panelOpen = force !== undefined ? force : !this.panelOpen;
	};

	setPanelWidth = (widthPx: number) => {
		const max = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 900;
		const clamped = Math.max(280, Math.min(max, widthPx));
		this.panelWidth = clamped;
		if (typeof window !== 'undefined') {
			localStorage.setItem(this.STORAGE_WIDTH_KEY, clamped.toString());
		}
	};

	setModel = (model: ModelConfig) => {
		this.selectedModel = model;
	};

	buildPageContext = (): PageContext => ({
		currentRoute: page.url.pathname,
		activeTab: reedrichStore.activeTab,
		selectedInstitution: reedrichStore.selectedInstitution,
		drawerOpen: reedrichStore.activeDrawer !== null,
		drawerType: reedrichStore.activeDrawer?.type,
		summary: {
			totalNetWorth: reedrichStore.snapshot?.netWorth.consolidated.total,
			totalSpendable: reedrichStore.snapshot?.wallets.spendable.total,
			totalLocked: reedrichStore.snapshot?.wallets.locked.total,
			walletCount: reedrichStore.allWallets.length,
			hasCashFlow: Boolean(reedrichStore.snapshot?.monthlyCashFlow)
		}
	});

	executeUICommand = (cmd: UICommand) => {
		switch (cmd.command) {
			case 'navigate':
				goto(cmd.payload.route);
				break;
			case 'filter':
				reedrichStore.filterByInstitution(cmd.payload.institution);
				break;
			case 'tab':
				reedrichStore.setTab(cmd.payload.tab);
				break;
			case 'date_range':
				dateFilterStore.setFilter('custom', cmd.payload.start, cmd.payload.end);
				break;
			case 'drawer':
				reedrichStore.openDrawer({
					type: cmd.payload.type as import('@maniyy/shared').DrawerType,
					title: cmd.payload.title,
					subtitle: cmd.payload.subtitle,
					badge: cmd.payload.badge,
					data: cmd.payload.data
				});
				break;
			case 'transaction_form':
				transactionFormStore.openCreate();
				break;
			case 'focus':
				document.querySelector(cmd.payload.selector)?.scrollIntoView({ behavior: 'smooth' });
				break;
		}
	};

	abortStream = () => {
		this.abortController?.abort();
		this.abortController = null;
		this.isStreaming = false;
	};

	newConversation = () => {
		this.activeConversationId = null;
		this.messages = [];
	};

	loadConversations = async () => {
		if (!authStore.accessToken) return;
		try {
			const res = await fetch(`${PUBLIC_AGENT_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${authStore.accessToken}` }
			});
			if (res.ok) this.conversations = await res.json();
		} catch {
			/* ignore */
		}
	};

	loadConversation = async (id: string) => {
		if (!authStore.accessToken) return;
		this.isLoadingHistory = true;
		try {
			const res = await fetch(`${PUBLIC_AGENT_URL}/api/conversations/${id}`, {
				headers: { Authorization: `Bearer ${authStore.accessToken}` }
			});
			if (res.ok) {
				const data = (await res.json()) as { messages: ChatMessage[] };
				this.messages = data.messages;
				this.activeConversationId = id;
			}
		} finally {
			this.isLoadingHistory = false;
		}
	};

	deleteConversation = async (id: string) => {
		if (!authStore.accessToken) return;
		await fetch(`${PUBLIC_AGENT_URL}/api/conversations/${id}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${authStore.accessToken}` }
		});
		this.conversations = this.conversations.filter((c) => c.id !== id);
		if (this.activeConversationId === id) this.newConversation();
	};

	exportConversations = async (ids?: string[]) => {
		if (!authStore.accessToken) return;
		const res = await fetch(`${PUBLIC_AGENT_URL}/api/conversations/export`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${authStore.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ids ? { conversationIds: ids } : {})
		});
		const data = await res.json();
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `maniyy-chat-export-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	importConversations = async (file: File): Promise<{ imported: number; skipped: number }> => {
		if (!authStore.accessToken) return { imported: 0, skipped: 0 };
		const text = await file.text();
		const data = JSON.parse(text);
		const res = await fetch(`${PUBLIC_AGENT_URL}/api/conversations/import`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${authStore.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		const result = (await res.json()) as { imported: number; skipped: number };
		await this.loadConversations();
		return result;
	};

	loadModels = async () => {
		try {
			const res = await fetch(`${PUBLIC_AGENT_URL}/api/models`);
			if (res.ok) {
				const models = (await res.json()) as ModelConfig[];
				this.availableModels = models;
				const qwen = models.find((m) => m.model === 'qwen/qwen3.8-27b');
				if (qwen) {
					this.selectedModel = qwen;
				} else if (models.length > 0) {
					this.selectedModel = models[0];
				}
			}
		} catch {
			/* ignore */
		}
	};

	sendMessage = async (text: string, image?: { data: string; mimeType: string }) => {
		if (!text.trim() && !image) return;
		if (!authStore.accessToken) throw new Error('Unauthenticated');

		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			conversationId: this.activeConversationId ?? '',
			role: 'user',
			content: text,
			timestamp: Date.now()
		};
		this.messages = [...this.messages, userMsg];
		this.isStreaming = true;

		// Placeholder for streaming assistant message
		const assistantId = crypto.randomUUID();
		const assistantMsg: ChatMessage = {
			id: assistantId,
			conversationId: this.activeConversationId ?? '',
			role: 'assistant',
			content: '',
			toolInvocations: [],
			timestamp: Date.now()
		};
		this.messages = [...this.messages, assistantMsg];

		this.abortController = new AbortController();

		try {
			const body = {
				message: text,
				conversationId: this.activeConversationId ?? undefined,
				pageContext: this.buildPageContext(),
				model: { provider: this.selectedModel.provider, model: this.selectedModel.model },
				image
			};
			const res = await fetch(`${PUBLIC_AGENT_URL}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authStore.accessToken}`
				},
				body: JSON.stringify(body),
				signal: this.abortController.signal
			});

			if (!res.ok) throw new Error(`Agent error: ${res.status}`);

			// Update conversation ID from response header if new
			const newConvId = res.headers.get('X-Conversation-Id');
			if (newConvId) {
				this.activeConversationId = newConvId;
				this.messages = this.messages.map((m) =>
					m.conversationId === '' ? { ...m, conversationId: newConvId } : m
				);
				if (res.headers.get('X-Is-New-Conversation') === '1') {
					await this.loadConversations();
				}
			}

			// Stream AI SDK data stream protocol
			const reader = res.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.trim()) continue;
					const raw = line.startsWith('data: ') ? line.slice(6) : line;
					if (!raw || raw === '[DONE]') continue;

					const colonIndex = raw.indexOf(':');
					if (colonIndex === -1) continue;
					const prefix = raw.slice(0, colonIndex);
					const payloadStr = raw.slice(colonIndex + 1);

					if (prefix === '0') {
						// Text delta
						try {
							const delta = JSON.parse(payloadStr) as string;
							this.messages = this.messages.map((m) =>
								m.id === assistantId ? { ...m, content: m.content + delta } : m
							);
						} catch {
							/* ignore */
						}
					} else if (prefix === '9') {
						// Tool call: { toolCallId, toolName, args }
						try {
							const toolCall = JSON.parse(payloadStr) as {
								toolCallId: string;
								toolName: string;
								args: Record<string, unknown>;
							};
							this.messages = this.messages.map((m) => {
								if (m.id !== assistantId) return m;
								const current = m.toolInvocations ?? [];
								const exists = current.find((t) => t.toolCallId === toolCall.toolCallId);
								if (exists) return m;
								return {
									...m,
									toolInvocations: [
										...current,
										{ ...toolCall, state: 'call' as const }
									]
								};
							});
						} catch {
							/* ignore */
						}
					} else if (prefix === 'a') {
						// Tool result: { toolCallId, toolName, result }
						try {
							const toolRes = JSON.parse(payloadStr) as {
								toolCallId: string;
								toolName?: string;
								result: unknown;
							};
							this.messages = this.messages.map((m) => {
								if (m.id !== assistantId) return m;
								const current = m.toolInvocations ?? [];
								return {
									...m,
									toolInvocations: current.map((t) =>
										t.toolCallId === toolRes.toolCallId
											? { ...t, result: toolRes.result, state: 'result' as const }
											: t
									)
								};
							});
							// Check if result is a UI command
							if ((toolRes.result as { type?: string })?.type === 'ui_command') {
								this.executeUICommand(toolRes.result as UICommand);
							}
						} catch {
							/* ignore */
						}
					} else if (prefix === '3') {
						// Error message from server
						try {
							const errMsg = JSON.parse(payloadStr) as string;
							this.messages = this.messages.map((m) =>
								m.id === assistantId
									? { ...m, content: m.content ? `${m.content}\n\n⚠️ ${errMsg}` : `⚠️ ${errMsg}` }
									: m
							);
						} catch {
							/* ignore */
						}
					}
				}
			}

			// If after stream finishes the assistant content is still empty (e.g. stream buffering),
			// fetch the saved message from D1 to ensure complete display
			const currentAssistant = this.messages.find((m) => m.id === assistantId);
			if (currentAssistant && !currentAssistant.content && this.activeConversationId) {
				try {
					const convRes = await fetch(`${PUBLIC_AGENT_URL}/api/conversations/${this.activeConversationId}`, {
						headers: { Authorization: `Bearer ${authStore.accessToken}` }
					});
					if (convRes.ok) {
						const convData = (await convRes.json()) as { messages: ChatMessage[] };
						const lastDbAssistant = convData.messages.filter((m) => m.role === 'assistant').at(-1);
						if (lastDbAssistant?.content) {
							this.messages = this.messages.map((m) =>
								m.id === assistantId ? { ...m, content: lastDbAssistant.content } : m
							);
						}
					}
				} catch {
					/* ignore */
				}
			}
		} catch (err) {
			if ((err as Error)?.name === 'AbortError') {
				// User aborted
			} else {
				this.messages = this.messages.map((m) =>
					m.id === assistantId
						? {
								...m,
								content:
									m.content ||
									'Koneksi terputus saat menerima jawaban. Silakan coba lagi.'
							}
						: m
				);
			}
		} finally {
			this.isStreaming = false;
			this.abortController = null;
		}
	};
}

export const chatStore = new ChatStore();
