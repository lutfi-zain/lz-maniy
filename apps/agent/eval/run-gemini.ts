import { GoogleGenAI, type FunctionDeclaration, Type } from '@google/genai';
import type { PageContext } from '@maniyy/shared';
import { createFinancialTools } from '../src/agent/tools/financial.js';
import { createUICommandTools } from '../src/agent/tools/ui-commands.js';
import { buildSystemPrompt } from '../src/agent/system-prompt.js';
import { EVAL_DATASET } from './dataset.js';

const REEDRICH_URL = 'https://reedrich-mcp.lutfidmz.workers.dev';
const REEDRICH_TOKEN = 'fp_live_be1431dce4ec5d97dfcedef125984f6e';
const GEMINI_KEY = 'AQ.Ab8RN6IFl5OrBB_Skw_Z6J9FobRy-2EVmWoQdjSvF3cBYhu0Vg';

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
const financialTools = createFinancialTools(REEDRICH_URL, REEDRICH_TOKEN);
const uiCommandTools = createUICommandTools();

const toolDeclarations: FunctionDeclaration[] = [
	{
		name: 'get_snapshot',
		description: 'Ambil ringkasan portofolio: total net worth (beserta byCurrency), rincian saldo wallet, dan top alokasi kategori pengeluaran.',
		parameters: {
			type: Type.OBJECT,
			properties: {}
		}
	},
	{
		name: 'list_transactions',
		description: 'Ambil daftar transaksi dengan filter tanggal spesifik (misal rentang bulan tertentu), wallet, atau kategori.',
		parameters: {
			type: Type.OBJECT,
			properties: {
				startDate: { type: Type.STRING, description: 'Tanggal mulai format YYYY-MM-DD' },
				endDate: { type: Type.STRING, description: 'Tanggal akhir format YYYY-MM-DD' },
				limit: { type: Type.NUMBER, description: 'Batas jumlah' }
			}
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
					limit: typeof args.limit === 'number' ? args.limit : 30
				},
				{ toolCallId, messages: [] }
			);
		case 'navigate_page':
			return await uiCommandTools.navigate_page.execute(
				args as { route: '/' | '/planning' | '/ledger' | '/accounts'; message: string },
				{ toolCallId, messages: [] }
			);
		default:
			return { message: `Tool ${name} executed` };
	}
}

console.log('\n======================================================');
console.log('🚀 EVALUATING AGENT REASONING: Gemini 3.1 Flash Lite');
console.log('======================================================\n');

const results = [];

for (const tc of EVAL_DATASET) {
	console.log(`▶ Running [${tc.id}] ${tc.category}: "${tc.prompt}"...`);

	const pageContext: PageContext = {
		currentRoute: tc.pageContext?.currentRoute ?? '/',
		activeTab: tc.pageContext?.activeTab ?? 'all',
		selectedInstitution: tc.pageContext?.selectedInstitution ?? null,
		drawerOpen: false,
		summary: tc.pageContext?.summary ?? {
			totalNetWorth: 15266837.21,
			totalSpendable: 705792.15,
			totalLocked: 14561045.06,
			walletCount: 17,
			hasCashFlow: true
		}
	};

	const systemInstruction = buildSystemPrompt(pageContext, 'Lutfi Zain');

	const chat = ai.chats.create({
		model: 'gemini-3.1-flash-lite',
		config: {
			systemInstruction,
			tools: [{ functionDeclarations: toolDeclarations }]
		}
	});

	const calledTools: string[] = [];
	const failures: string[] = [];
	let finalContent = '';
	let steps = 1;

	try {
		let response = await chat.sendMessage({ message: tc.prompt });

		let loops = 6;
		while (loops-- > 0 && response.functionCalls && response.functionCalls.length > 0) {
			steps++;
			const fCalls = response.functionCalls;
			const parts = [];

			for (const fc of fCalls) {
				const toolName = fc.name || '';
				calledTools.push(toolName);
				const toolCallId = fc.id || `call_${crypto.randomUUID().slice(0, 8)}`;
				const output = await executeTool(toolName, fc.args || {}, toolCallId);
				parts.push({
					functionResponse: {
						name: toolName,
						response: { output }
					}
				});
			}

			response = await chat.sendMessage({ message: parts });
		}

		finalContent = response.text || '';

		let toolScore = 100;
		const missingTools = tc.expected.requiredTools.filter((t) => !calledTools.includes(t));
		if (missingTools.length > 0) {
			toolScore = Math.max(0, 100 - (missingTools.length * 50));
			failures.push(`Missing tools: ${missingTools.join(', ')}`);
		}

		let contentScore = 100;
		if (tc.expected.mustContain) {
			for (const keyword of tc.expected.mustContain) {
				if (!finalContent.toLowerCase().includes(keyword.toLowerCase())) {
					contentScore -= Math.round(100 / tc.expected.mustContain.length);
					failures.push(`Content missing keyword: "${keyword}"`);
				}
			}
		}

		let mathScore = 100;
		if (tc.expected.mathCheck && !tc.expected.mathCheck(finalContent)) {
			mathScore = 0;
			failures.push(`Math verification failed`);
		}

		const totalScore = Math.max(0, Math.round((toolScore * 0.4) + (contentScore * 0.3) + (mathScore * 0.3)));
		const passed = totalScore >= 70;

		results.push({
			id: tc.id,
			passed,
			toolCalls: calledTools,
			steps,
			score: totalScore,
			failures
		});

		console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'} | Score: ${totalScore}/100 | Steps: ${steps} | Tools: [${calledTools.join(', ')}]`);
		if (failures.length > 0) {
			console.log(`   Notes: ${failures.join('; ')}`);
		}
	} catch (err) {
		console.log(`   ❌ ERROR: ${(err as Error).message}`);
		results.push({
			id: tc.id,
			passed: false,
			toolCalls: [],
			steps: 0,
			score: 0,
			failures: [(err as Error).message]
		});
	}
}

const avgScore = Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);
const passRate = Math.round((results.filter((r) => r.passed).length / results.length) * 100);

console.log('\n------------------------------------------------------');
console.log('📊 REASONING BENCHMARK REPORT: Gemini 3.1 Flash Lite');
console.log(`- Average Reasoning Score: ${avgScore} / 100`);
console.log(`- Test Pass Rate: ${passRate}% (${results.filter(r => r.passed).length}/${results.length})`);
console.log('------------------------------------------------------\n');
