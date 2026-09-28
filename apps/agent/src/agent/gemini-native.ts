import { GoogleGenAI, type FunctionDeclaration, ThinkingLevel as GeminiThinkingLevel, Type } from '@google/genai';
import type { PageContext, ThinkingLevel } from '@maniyy/shared';
import { createFinancialTools } from './tools/financial.js';
import { createMutationTools } from './tools/mutations.js';
import { createUICommandTools } from './tools/ui-commands.js';
import { buildSystemPrompt } from './system-prompt.js';

export function createGeminiRunner(apiKey: string, reedrichUrl: string, token: string, fetcher?: Fetcher) {
	const ai = new GoogleGenAI({ apiKey });
	const financialTools = createFinancialTools(reedrichUrl, token, fetcher);
	const mutationTools = createMutationTools(reedrichUrl, token, fetcher);
	const uiCommandTools = createUICommandTools();

	const toolDeclarations: FunctionDeclaration[] = [
		{
			name: 'get_snapshot',
			description: 'Ambil ringkasan portofolio: total net worth (beserta byCurrency), rincian saldo wallet (termasuk mata uang asing), dan top kategori pengeluaran.',
			parameters: {
				type: Type.OBJECT,
				properties: {}
			}
		},
		{
			name: 'list_transactions',
			description: 'Ambil transaksi terencana (planned) atau riwayat mutasi dalam rentang tanggal tertentu.',
			parameters: {
				type: Type.OBJECT,
				properties: {
					startDate: { type: Type.STRING, description: 'Tanggal mulai (YYYY-MM-DD)' },
					endDate: { type: Type.STRING, description: 'Tanggal akhir (YYYY-MM-DD)' },
					walletId: { type: Type.STRING, description: 'Filter ID wallet' },
					categoryId: { type: Type.STRING, description: 'Filter ID kategori' },
					limit: { type: Type.NUMBER, description: 'Batas jumlah' }
				}
			}
		},
		{
			name: 'create_transaction',
			description: 'Catat transaksi pengeluaran atau pemasukan baru ke dompet pengguna.',
			parameters: {
				type: Type.OBJECT,
				properties: {
					walletId: { type: Type.STRING, description: 'ID dompet' },
					categoryId: { type: Type.STRING, description: 'ID kategori' },
					amount: { type: Type.NUMBER, description: 'Nominal dalam Rupiah' },
					type: { type: Type.STRING, description: 'expense atau income' },
					date: { type: Type.STRING, description: 'Tanggal (YYYY-MM-DD)' },
					description: { type: Type.STRING, description: 'Keterangan transaksi' }
				},
				required: ['walletId', 'categoryId', 'amount', 'type', 'date']
			}
		},
		{
			name: 'create_transfer',
			description: 'Catat transfer uang antar dompet.',
			parameters: {
				type: Type.OBJECT,
				properties: {
					sourceWalletId: { type: Type.STRING, description: 'ID dompet asal' },
					targetWalletId: { type: Type.STRING, description: 'ID dompet tujuan' },
					amount: { type: Type.NUMBER, description: 'Nominal transfer' },
					description: { type: Type.STRING, description: 'Keterangan' },
					date: { type: Type.STRING, description: 'Tanggal transfer (YYYY-MM-DD)' }
				},
				required: ['sourceWalletId', 'targetWalletId', 'amount']
			}
		},
		{
			name: 'get_categories',
			description: 'Ambil daftar kategori transaksi.',
			parameters: {
				type: Type.OBJECT,
				properties: {}
			}
		},
		{
			name: 'navigate_page',
			description: 'Navigasi ke halaman lain di aplikasi (/planning, /ledger, /accounts, /).',
			parameters: {
				type: Type.OBJECT,
				properties: {
					route: { type: Type.STRING, description: 'Halaman tujuan' },
					message: { type: Type.STRING, description: 'Pesan ke pengguna' }
				},
				required: ['route', 'message']
			}
		},
		{
			name: 'change_tab',
			description: 'Ganti tab aktif di dashboard (all, spendable, locked).',
			parameters: {
				type: Type.OBJECT,
				properties: {
					tab: { type: Type.STRING, description: 'Tab tujuan (all, spendable, locked)' },
					message: { type: Type.STRING, description: 'Pesan ke pengguna' }
				},
				required: ['tab', 'message']
			}
		},
		{
			name: 'open_transaction_form',
			description: 'Buka popup modal form pencatatan transaksi baru di layar.',
			parameters: {
				type: Type.OBJECT,
				properties: {
					message: { type: Type.STRING, description: 'Pesan konfirmasi' }
				}
			}
		}
	];

	async function executeTool(name: string, args: Record<string, unknown>, toolCallId: string): Promise<unknown> {
		switch (name) {
			case 'get_snapshot':
				return await financialTools.get_snapshot.execute({}, { toolCallId, messages: [] });
			case 'list_transactions':
				return await financialTools.list_transactions.execute(
					{
						startDate: typeof args.startDate === 'string' ? args.startDate : undefined,
						endDate: typeof args.endDate === 'string' ? args.endDate : undefined,
						walletId: typeof args.walletId === 'string' ? args.walletId : undefined,
						categoryId: typeof args.categoryId === 'string' ? args.categoryId : undefined,
						limit: typeof args.limit === 'number' ? args.limit : 30
					},
					{ toolCallId, messages: [] }
				);
			case 'create_transaction':
				return await mutationTools.create_transaction.execute(
					{
						walletId: String(args.walletId),
						categoryId: String(args.categoryId),
						amount: Number(args.amount),
						type: args.type === 'income' ? 'income' : 'expense',
						date: String(args.date),
						description: typeof args.description === 'string' ? args.description : undefined
					},
					{ toolCallId, messages: [] }
				);
			case 'create_transfer':
				return await mutationTools.create_transfer.execute(
					{
						sourceWalletId: String(args.sourceWalletId),
						targetWalletId: String(args.targetWalletId),
						amount: Number(args.amount),
						description: typeof args.description === 'string' ? args.description : undefined,
						date: typeof args.date === 'string' ? args.date : undefined
					},
					{ toolCallId, messages: [] }
				);
			case 'get_categories':
				return await financialTools.get_categories.execute({}, { toolCallId, messages: [] });
			case 'navigate_page':
				return await uiCommandTools.navigate_page.execute(
					args as { route: '/' | '/planning' | '/ledger' | '/accounts'; message: string },
					{ toolCallId, messages: [] }
				);
			case 'change_tab':
				return await uiCommandTools.change_tab.execute(
					args as { tab: 'all' | 'spendable' | 'locked'; message: string },
					{ toolCallId, messages: [] }
				);
			case 'open_transaction_form':
				return await uiCommandTools.open_transaction_form.execute(
					{ message: typeof args.message === 'string' ? args.message : 'Membuka form transaksi' },
					{ toolCallId, messages: [] }
				);
			default:
				return { message: `Tool ${name} executed` };
		}
	}

	async function* runGeminiStream(
		modelName: string,
		userMessage: string,
		pageContext: PageContext,
		userName: string,
		priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [],
		thinkingLevel?: ThinkingLevel
	): AsyncGenerator<string> {
		yield `f:{"messageId":"msg-${crypto.randomUUID()}"}\n`;

		const systemInstruction = buildSystemPrompt(pageContext, userName);

		const thinkingConfig = (() => {
			if (!thinkingLevel || thinkingLevel === 'off') {
				return { thinkingBudget: 0 };
			}
			switch (thinkingLevel) {
				case 'minimal':
					return { thinkingLevel: GeminiThinkingLevel.MINIMAL };
				case 'low':
					return { thinkingLevel: GeminiThinkingLevel.LOW };
				case 'medium':
					return { thinkingLevel: GeminiThinkingLevel.MEDIUM };
				case 'high':
				case 'xhigh':
					return { thinkingLevel: GeminiThinkingLevel.HIGH };
				default:
					return undefined;
			}
		})();

		const history = priorMessages
			.filter((m) => m.content?.trim())
			.map((m) => ({
				role: m.role === 'user' ? 'user' : 'model',
				parts: [{ text: m.content }]
			}));

		const chat = ai.chats.create({
			model: modelName,
			history,
			config: {
				systemInstruction,
				tools: [{ functionDeclarations: toolDeclarations }],
				...(thinkingConfig ? { thinkingConfig } : {})
			}
		});

		let response = await chat.sendMessage({ message: userMessage });
		let loops = 8;
		while (loops-- > 0 && response.functionCalls && response.functionCalls.length > 0) {
			const fCalls = response.functionCalls;
			const parts = [];

			for (const fc of fCalls) {
				const toolName = fc.name || '';
				const toolCallId = fc.id || `call_${crypto.randomUUID().slice(0, 8)}`;
				yield `9:${JSON.stringify({ toolCallId, toolName, args: fc.args || {} })}\n`;

				const toolResult = await executeTool(toolName, fc.args || {}, toolCallId);

				yield `a:${JSON.stringify({ toolCallId, toolName, result: toolResult })}\n`;

				parts.push({
					functionResponse: {
						name: toolName,
						response: { output: toolResult }
					}
				});
			}

			const stream = await chat.sendMessageStream({ message: parts });
			let nextFunctionCalls: typeof response.functionCalls | undefined;

			for await (const chunk of stream) {
				if (chunk.text) {
					yield `0:${JSON.stringify(chunk.text)}\n`;
				}
				if (chunk.functionCalls && chunk.functionCalls.length > 0) {
					nextFunctionCalls = chunk.functionCalls;
					response = chunk;
				}
			}

			if (!nextFunctionCalls || nextFunctionCalls.length === 0) {
				yield `e:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100},"isContinued":false}\n`;
				yield `d:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100}}\n`;
				return;
			}
		}

		if (response.text) {
			yield `0:${JSON.stringify(response.text)}\n`;
		}

		yield `e:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100},"isContinued":false}\n`;
		yield `d:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":100}}\n`;
	}

	return { runGeminiStream };
}
