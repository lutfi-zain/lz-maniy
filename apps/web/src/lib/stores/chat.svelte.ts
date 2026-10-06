import { goto } from '$app/navigation';
import { page } from '$app/state';
import { PUBLIC_AGENT_URL, PUBLIC_API_URL } from '$env/static/public';
import {
	DEFAULT_MODELS,
	type AssistantVariant,
	type ChatMessage,
	type ConversationMeta,
	type ModelConfig,
	type PageContext,
	type ThinkingLevel,
	type UICommand,
	type ContextUsage,
	type CreditBalance
} from '@maniyy/shared';
import { authStore } from './auth.svelte.js';
import { reedrichStore } from './reedrich.svelte.js';
import { transactionFormStore } from './transaction-form.svelte.js';
import { dateFilterStore } from './date-filter.svelte.js';

function delay(ms: number): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
}

export class ChatStore {
	conversations = $state<ConversationMeta[]>([]);
	activeConversationId = $state<string | null>(null);
	messages = $state<ChatMessage[]>([]);
	isLoadingHistory = $state<boolean>(false);
	isStreaming = $state<boolean>(false);
	panelOpen = $state<boolean>(false);
	panelWidth = $state<number>(360);
	maximized = $state<boolean>(false);
	lastDockedWidth = $state<number>(360);
	availableModels = $state<ModelConfig[]>([...DEFAULT_MODELS]);
	showConversationList = $state<boolean>(false);
	thinkingLevel = $state<ThinkingLevel>('medium');
	creditsRemaining = $state<number | null>(null);
	lastCreditsUsed = $state<number | null>(null);
	contextUsage = $state<ContextUsage | null>(null);
	selectedModel = $state<ModelConfig>({
		provider: 'omp',
		model: 'google-antigravity/gemini-3.7-flash',
		displayName: 'Gemini 3.7 Flash',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high'],
		contextWindow: 1_000_000
	});

	private abortController: AbortController | null = null;
	private readonly STORAGE_WIDTH_KEY = 'maniyy_chat_panel_width';

	private hasAttemptedAutoResume = false;

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem(this.STORAGE_WIDTH_KEY);
			if (saved) {
				this.panelWidth = Math.max(280, Math.min(window.innerWidth * 0.5, Number(saved)));
			}
			const savedModel = localStorage.getItem('maniyy_selected_model');
			if (savedModel) {
				try {
					const parsed = JSON.parse(savedModel) as ModelConfig;
					if (parsed?.model) {
						this.selectedModel = parsed;
					}
				} catch {}
			}
		}
	}

	activeConversation = $derived(
		this.conversations.find((c) => c.id === this.activeConversationId) ?? null
	);

	hasMessages = $derived(this.messages.length > 0);

	togglePanel = (force?: boolean) => {
		this.panelOpen = force !== undefined ? force : !this.panelOpen;
		if (this.panelOpen) {
			this.loadCredits();
			this.resumeLastConversationIfFresh();
		}
	};

	resumeLastConversationIfFresh = async () => {
		if (this.hasAttemptedAutoResume) return;
		this.hasAttemptedAutoResume = true;

		// Only auto-resume if currently on a fresh/empty chat
		if (this.activeConversationId || this.messages.length > 0) return;

		this.isLoadingHistory = true;
		try {
			if (this.conversations.length === 0) {
				await this.loadConversations();
			}
			if (!this.activeConversationId && this.messages.length === 0 && this.conversations.length > 0) {
				const latest = this.conversations[0];
				if (latest?.id) {
					await this.loadConversation(latest.id);
				}
			}
		} finally {
			this.isLoadingHistory = false;
		}
	};

	loadCredits = async () => {
		if (!authStore.accessToken) return;
		try {
			const res = await this.authFetch(`${PUBLIC_AGENT_URL}/api/credits`);
			if (res.ok) {
				const data = (await res.json()) as CreditBalance;
				this.creditsRemaining = data.balance;
			}
		} catch {
			/* ignore */
		}
	};

	private authFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
		const validToken = await authStore.getValidToken(PUBLIC_API_URL);
		const headers = new Headers(init.headers || {});
		if (validToken) {
			headers.set('Authorization', `Bearer ${validToken}`);
		}
		let res = await fetch(url, { ...init, headers });
		if (res.status === 401 && authStore.refreshToken) {
			const refreshed = await authStore.refreshSession(PUBLIC_API_URL);
			if (refreshed && authStore.accessToken) {
				headers.set('Authorization', `Bearer ${authStore.accessToken}`);
				res = await fetch(url, { ...init, headers });
			}
		}
		return res;
	};

	setPanelWidth = (widthPx: number) => {
		if (this.maximized) return;
		const max = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 900;
		const clamped = Math.max(280, Math.min(max, widthPx));
		this.panelWidth = clamped;
		if (typeof window !== 'undefined') {
			localStorage.setItem(this.STORAGE_WIDTH_KEY, clamped.toString());
		}
	};

	toggleMaximize = (force?: boolean) => {
		const next = force !== undefined ? force : !this.maximized;
		if (next === this.maximized) return;
		if (next) {
			this.lastDockedWidth = this.panelWidth;
			this.maximized = true;
		} else {
			this.maximized = false;
			this.setPanelWidth(this.lastDockedWidth);
		}
	};

	setModel = (model: ModelConfig) => {
		this.selectedModel = model;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('maniyy_selected_model', JSON.stringify(model));
			} catch {}
		}
		if (model.capabilities.thinking && this.thinkingLevel === 'off') {
			this.thinkingLevel = 'low';
		} else if (!model.capabilities.thinking) {
			this.thinkingLevel = 'off';
		}
	};

	setThinkingLevel = (level: ThinkingLevel) => {
		this.thinkingLevel = level;
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
		this.hasAttemptedAutoResume = true;
	};

	loadConversations = async () => {
		if (!authStore.accessToken) return;
		try {
			const res = await this.authFetch(`${PUBLIC_AGENT_URL}/api/conversations`);
			if (res.ok) this.conversations = await res.json();
		} catch {
			/* ignore */
		}
	};

	loadConversation = async (id: string) => {
		if (!authStore.accessToken) return;
		this.isLoadingHistory = true;
		try {
			const res = await this.authFetch(`${PUBLIC_AGENT_URL}/api/conversations/${id}`);
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
		await this.authFetch(`${PUBLIC_AGENT_URL}/api/conversations/${id}`, {
			method: 'DELETE'
		});
		this.conversations = this.conversations.filter((c) => c.id !== id);
		if (this.activeConversationId === id) this.newConversation();
	};

	exportConversations = async (ids?: string[]) => {
		if (!authStore.accessToken) return;
		const res = await this.authFetch(`${PUBLIC_AGENT_URL}/api/conversations/export`, {
			method: 'POST',
			headers: {
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
		const res = await this.authFetch(`${PUBLIC_AGENT_URL}/api/conversations/import`, {
			method: 'POST',
			headers: {
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
				const remoteModels = (await res.json()) as ModelConfig[];
				if (Array.isArray(remoteModels) && remoteModels.length > 0) {
					const merged = [...remoteModels];
					for (const def of DEFAULT_MODELS) {
						const idx = merged.findIndex(
							(m) => m.model === def.model && m.provider === def.provider
						);
						if (idx !== -1) {
							merged[idx] = {
								...merged[idx],
								capabilities: { ...merged[idx].capabilities, ...def.capabilities },
								thinkingLevels: def.thinkingLevels ?? merged[idx].thinkingLevels
							};
						} else {
							merged.push(def);
						}
					}
					this.availableModels = merged;
					const current = merged.find((m) => m.model === this.selectedModel.model);
					if (current) {
						this.selectedModel = current;
					}
				}
			}
		} catch {
			/* fallback to DEFAULT_MODELS */
		}
	};

	private syncActiveVariant = (msg: ChatMessage): ChatMessage => {
		if (msg.role !== 'assistant') return msg;
		const variants: AssistantVariant[] =
			msg.variants && msg.variants.length > 0
				? [...msg.variants]
				: [
						{
							content: msg.content,
							toolInvocations: msg.toolInvocations,
							thinking: msg.thinking,
							timestamp: msg.timestamp
						}
					];
		const activeIndex = msg.activeVariantIndex ?? variants.length - 1;
		variants[activeIndex] = {
			content: msg.content,
			toolInvocations: msg.toolInvocations ? [...msg.toolInvocations] : [],
			thinking: msg.thinking,
			timestamp: Date.now()
		};
		return {
			...msg,
			variants,
			activeVariantIndex: activeIndex
		};
	};

	switchMessageVariant = (messageId: string, index: number) => {
		this.messages = this.messages.map((m) => {
			if (m.id !== messageId || m.role !== 'assistant' || !m.variants) return m;
			if (index < 0 || index >= m.variants.length) return m;
			const targetVariant = m.variants[index];
			return {
				...m,
				activeVariantIndex: index,
				content: targetVariant.content,
				thinking: targetVariant.thinking,
				toolInvocations: targetVariant.toolInvocations ? [...targetVariant.toolInvocations] : []
			};
		});
	};

	retryMessage = async (messageId: string) => {
		if (this.isStreaming) return;
		const target = this.messages.find((m) => m.id === messageId);
		if (!target || target.role !== 'assistant') return;

		const targetIdx = this.messages.findIndex((m) => m.id === messageId);
		const userMsg = this.messages
			.slice(0, targetIdx)
			.filter((m) => m.role === 'user')
			.at(-1);
		if (!userMsg) return;

		const currentVariants: AssistantVariant[] =
			target.variants && target.variants.length > 0
				? [...target.variants]
				: [
						{
							content: target.content,
							toolInvocations: target.toolInvocations ? [...target.toolInvocations] : [],
							timestamp: target.timestamp
						}
					];

		const newVariant: AssistantVariant = {
			content: '',
			toolInvocations: [],
			timestamp: Date.now()
		};
		const updatedVariants = [...currentVariants, newVariant];
		const nextIndex = updatedVariants.length - 1;

		this.messages = this.messages.map((m) =>
			m.id === messageId
				? {
						...m,
						variants: updatedVariants,
						activeVariantIndex: nextIndex,
						content: '',
						toolInvocations: []
					}
				: m
		);

		await this.executeStream(userMsg.content, target.id);
	};

	sendMessage = async (
		text: string,
		image?: { data: string; mimeType: string },
		statementSessionId?: string
	) => {
		if (!text.trim() && !image && !statementSessionId) return;

		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			conversationId: this.activeConversationId ?? '',
			role: 'user',
			content: text,
			timestamp: Date.now()
		};
		this.messages = [...this.messages, userMsg];

		const assistantId = crypto.randomUUID();
		const initialVariant: AssistantVariant = {
			content: '',
			toolInvocations: [],
			timestamp: Date.now()
		};
		const assistantMsg: ChatMessage = {
			id: assistantId,
			conversationId: this.activeConversationId ?? '',
			role: 'assistant',
			content: '',
			toolInvocations: [],
			variants: [initialVariant],
			activeVariantIndex: 0,
			timestamp: Date.now()
		};
		this.messages = [...this.messages, assistantMsg];

		await this.executeStream(text, assistantId, image, statementSessionId);
	};

	private executeStream = async (
		text: string,
		assistantId: string,
		image?: { data: string; mimeType: string },
		statementSessionId?: string
	) => {
		this.isStreaming = true;
		this.abortController = new AbortController();

		let creditsUpdatedFromStream = false;
		try {
			const body = {
				message: text,
				conversationId: this.activeConversationId ?? undefined,
				pageContext: this.buildPageContext(),
				model: { provider: this.selectedModel.provider, model: this.selectedModel.model },
				thinkingLevel: this.thinkingLevel,
				image,
				statementSessionId
			};
			const token = (await authStore.getValidToken(PUBLIC_API_URL)) || authStore.accessToken;
			const res = await fetch(`${PUBLIC_AGENT_URL}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(body),
				signal: this.abortController.signal
			});

			if (!res.ok) throw new Error(`Agent error: ${res.status}`);

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

			// Read SSE stream
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

					if (prefix === 'g') {
						// Thinking delta
						try {
							const thinkingDelta = JSON.parse(payloadStr) as string;
							this.messages = this.messages.map((m) =>
								m.id === assistantId
									? this.syncActiveVariant({
											...m,
											thinking: (m.thinking ?? '') + thinkingDelta
										})
									: m
							);
						} catch {
							/* ignore */
						}
					} else if (prefix === '0') {
						// Text delta
						try {
							const delta = JSON.parse(payloadStr) as string;
							this.messages = this.messages.map((m) =>
								m.id === assistantId
									? this.syncActiveVariant({ ...m, content: m.content + delta })
									: m
							);
						} catch {
							/* ignore */
						}
					} else if (prefix === 'd') {
						// Finish metadata event: { finishReason, usage, creditsUsed, creditsRemaining, contextUsage }
						try {
							const finishData = JSON.parse(payloadStr) as {
								creditsUsed?: number;
								creditsRemaining?: number;
								contextUsage?: ContextUsage;
							};
							if (typeof finishData.creditsRemaining === 'number') {
								this.creditsRemaining = finishData.creditsRemaining;
								creditsUpdatedFromStream = true;
							}
							if (typeof finishData.creditsUsed === 'number') {
								this.lastCreditsUsed = finishData.creditsUsed;
								setTimeout(() => {
									this.lastCreditsUsed = null;
								}, 3000);
							}
							if (finishData.contextUsage) {
								this.contextUsage = finishData.contextUsage;
							}
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
									toolInvocations: [...current, { ...toolCall, state: 'call' as const }]
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
								const updated = {
									...m,
									toolInvocations: current.map((t) =>
										t.toolCallId === toolRes.toolCallId
											? { ...t, result: toolRes.result, state: 'result' as const }
											: t
									)
								};
								return this.syncActiveVariant(updated);
							});
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
									? this.syncActiveVariant({
											...m,
											content: m.content ? `${m.content}\n\n⚠️ ${errMsg}` : `⚠️ ${errMsg}`
										})
									: m
							);
						} catch {
							/* ignore */
						}
					}
				}
			}

			// Clean up trailing buffer if any
			if (buffer.trim()) {
				const raw = buffer.startsWith('data: ') ? buffer.slice(6) : buffer;
				const colonIndex = raw.indexOf(':');
				if (colonIndex !== -1 && raw.slice(0, colonIndex) === '0') {
					try {
						const delta = JSON.parse(raw.slice(colonIndex + 1)) as string;
						this.messages = this.messages.map((m) =>
							m.id === assistantId ? { ...m, content: m.content + delta } : m
						);
					} catch {
						/* ignore */
					}
				}
			}

			// Post-stream check: if assistant message has no content, fetch from D1
			const currentAssistant = this.messages.find((m) => m.id === assistantId);
			if (currentAssistant && !currentAssistant.content && this.activeConversationId) {
				try {
					await delay(600);
					const convRes = await fetch(
						`${PUBLIC_AGENT_URL}/api/conversations/${this.activeConversationId}`,
						{
							headers: { Authorization: `Bearer ${authStore.accessToken}` }
						}
					);
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
						? this.syncActiveVariant({
								...m,
								content: m.content || 'Koneksi terputus saat menerima jawaban. Silakan coba lagi.'
							})
						: m
				);
			}
		} finally {
			this.isStreaming = false;
			this.abortController = null;
			this.messages = this.messages.map((m) =>
				m.id === assistantId ? this.syncActiveVariant(m) : m
			);
			if (!creditsUpdatedFromStream) {
				this.loadCredits().catch(() => {});
			}
		}
	};
}

export const chatStore = new ChatStore();
