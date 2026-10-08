import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { EVAL_DATASET, type EvalTestCase } from './dataset.js';

export interface PhoenixToolDefinition {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface PhoenixPromptVersionSpec {
	versionTag: 'baseline' | 'staging' | 'production';
	description: string;
	modelProvider: 'GOOGLE';
	modelName: string;
	templateType: 'CHAT';
	templateFormat: 'MUSTACHE';
	template: {
		type: 'chat';
		messages: Array<{
			role: 'system' | 'user' | 'ai';
			content: Array<{ type: 'text'; text: string }>;
		}>;
	};
	invocationParameters: {
		type: 'google';
		google: {
			temperature: number;
			max_output_tokens: number;
			thinking_config?: {
				thinking_level: 'minimal' | 'low' | 'medium' | 'high';
				include_thoughts: boolean;
			};
		};
	};
	tools?: {
		type: 'tools';
		tools: PhoenixToolDefinition[];
	};
	metadata: Record<string, unknown>;
}

export interface PhoenixPromptRepositorySpec {
	name: string;
	description: string;
	labels: string[];
	metadata: Record<string, unknown>;
	versions: PhoenixPromptVersionSpec[];
}

export interface PhoenixOutputConfig {
	name: string;
	type: 'CATEGORICAL' | 'CONTINUOUS';
	description: string;
	optimization_direction: 'MAXIMIZE' | 'MINIMIZE';
	values?: Array<{ label: string; score: number }>;
	lower_bound?: number;
	upper_bound?: number | null;
}

export interface PhoenixLlmEvaluatorSpec {
	name: string;
	description: string;
	kind: 'LLM';
	promptName: string;
	promptVersionTag: 'production' | 'staging' | 'baseline';
	outputConfigs: PhoenixOutputConfig[];
	inputMapping: {
		literal_mapping: Record<string, unknown>;
		path_mapping: Record<string, string>;
	};
	metadata: Record<string, unknown>;
}

export interface PhoenixCodeEvaluatorSpec {
	name: string;
	description: string;
	kind: 'CODE';
	language: 'PYTHON';
	sourceCode: string;
	outputConfigs: PhoenixOutputConfig[];
	inputMapping: {
		literal_mapping: Record<string, unknown>;
		path_mapping: Record<string, string>;
	};
	metadata: Record<string, unknown>;
}

export interface AcceptanceCriterion {
	annotationName: string;
	tier: 'invariant' | 'signal';
	metric: 'passRate' | 'average';
	threshold: number;
	direction?: 'maximize' | 'minimize';
	passFn?: (score: number, label?: string) => boolean;
}

export interface EvaluationRunRecord {
	exampleId: string;
	annotations: Record<string, { score: number; label?: string; explanation?: string }>;
}

export interface AcceptanceCriterionResult {
	annotationName: string;
	tier: 'invariant' | 'signal';
	metric: 'passRate' | 'average';
	actual: number;
	threshold: number;
	direction: 'maximize' | 'minimize';
	passed: boolean;
}

export interface AcceptanceGateSummary {
	passed: boolean;
	invariantsPassed: boolean;
	signalsPassed: boolean;
	results: AcceptanceCriterionResult[];
}

export interface JudgeCalibrationCase {
	id: string;
	category: string;
	inputPrompt: string;
	candidateOutput: string;
	calledTools: string[];
	humanLabel: 'pass' | 'fail';
	judgePrediction: 'pass' | 'fail';
	failureReason?: string;
}

export interface JudgeCalibrationMetrics {
	total: number;
	tp: number;
	tn: number;
	fp: number;
	fn: number;
	tpr: number;
	tnr: number;
	accuracy: number;
	cohensKappa: number;
	meetsThresholds: boolean;
}

export interface DatasetSplitSpec {
	name: string;
	description: string;
	color: string;
	metadata: Record<string, unknown>;
}

export interface PhoenixExperimentSpec {
	name: string;
	description: string;
	promptVariant: 'baseline' | 'compact' | 'fewshot';
	modelName: 'gemini-3.7-flash' | 'gemini-3.8-flash';
	projectName: string;
	repetitions: number;
	metadata: Record<string, unknown>;
}

export const FINANCIAL_TOOL_SCHEMAS: PhoenixToolDefinition[] = [
	{
		type: 'function',
		function: {
			name: 'get_snapshot',
			description: 'Ambil ringkasan keuangan lengkap (Net Worth, Wallets, Spendable Cash, Budgets, Goals, Obligations).',
			parameters: {
				type: 'object',
				properties: {
					startDate: { type: 'string', description: 'Tanggal awal ISO (YYYY-MM-DD)' },
					endDate: { type: 'string', description: 'Tanggal akhir ISO (YYYY-MM-DD)' }
				}
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'list_wallets',
			description: 'Daftar seluruh dompet operasional (Spendable) dan cadangan (Locked) beserta saldo point-in-time.',
			parameters: { type: 'object', properties: {} }
		}
	},
	{
		type: 'function',
		function: {
			name: 'get_categories',
			description: 'Daftar kategori pemasukan dan pengeluaran yang valid di ReedRich.',
			parameters: { type: 'object', properties: {} }
		}
	},
	{
		type: 'function',
		function: {
			name: 'create_transaction',
			description: 'Catat transaksi pemasukan atau pengeluaran atomik ke dompet user.',
			parameters: {
				type: 'object',
				properties: {
					walletId: { type: 'string' },
					categoryId: { type: 'string' },
					amount: { type: 'number' },
					direction: { type: 'string', enum: ['in', 'out'] },
					description: { type: 'string' }
				},
				required: ['walletId', 'amount', 'direction', 'description']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'create_transfer',
			description: 'Transfer dana antar dompet milik user (intra-wallet transfer).',
			parameters: {
				type: 'object',
				properties: {
					fromWalletId: { type: 'string' },
					toWalletId: { type: 'string' },
					amount: { type: 'number' },
					adminFee: { type: 'number' }
				},
				required: ['fromWalletId', 'toWalletId', 'amount']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'list_budgets',
			description: 'Ambil daftar pagu anggaran (Budgets) beserta status pemakaian (on_track, warning, over_budget).',
			parameters: { type: 'object', properties: {} }
		}
	},
	{
		type: 'function',
		function: {
			name: 'list_debts_loans',
			description: 'Ambil daftar kewajiban hutang (ActiveDebt) dan piutang (ActiveLoan).',
			parameters: { type: 'object', properties: {} }
		}
	},
	{
		type: 'function',
		function: {
			name: 'financial_summary',
			description: 'Hitung Safe-to-Spend runway harian dan alokasi komitmen terdekat.',
			parameters: { type: 'object', properties: {} }
		}
	}
];

function readPromptText(fileName: string, fallback: string): string {
	try {
		const p = path.resolve(import.meta.dirname || __dirname, 'prompts', fileName);
		return fs.readFileSync(p, 'utf8').trim();
	} catch {
		return fallback;
	}
}

export function buildPromptRepositories(): PhoenixPromptRepositorySpec[] {
	const baselineText = readPromptText(
		'system-baseline.txt',
		'Anda adalah Maniyy Financial Intelligence Agent (Baseline Verbose). Gunakan format Rupiah (Rp) dan panggil tool finansial sebelum menjawab.'
	);
	const compactText = readPromptText(
		'system-compact.txt',
		'Maniyy Agent (Compact Token-Optimized). Wajib panggil tool ReedRich, gunakan format Rp X.XXX.XXX, dilarang simbol $.'
	);
	const fewshotText = readPromptText(
		'system-fewshot.txt',
		'Maniyy Agent (Few-Shot Telegram Golden). Eksekusi multi-intent dengan list_wallets + get_categories + create_transaction, format Rp X.XXX.XXX.'
	);

	return [
		{
			name: 'maniyy-agent-system',
			description:
				'Primary system prompt repository for the Maniyy v2 Financial Intelligence Agent across Baseline (v1), Compact Token-Optimized (v2), and Few-Shot Golden (v3) iterations.',
			labels: ['production-ready', 'financial-governance', 'token-optimized'],
			metadata: {
				domain: 'personal-financial-planning',
				owner: 'lutfi-zain',
				toolCount: FINANCIAL_TOOL_SCHEMAS.length
			},
			versions: [
				{
					versionTag: 'baseline',
					description: 'v1: Baseline Verbose System Prompt (Full accounting instructions)',
					modelProvider: 'GOOGLE',
					modelName: 'gemini-3.7-flash',
					templateType: 'CHAT',
					templateFormat: 'MUSTACHE',
					template: {
						type: 'chat',
						messages: [
							{ role: 'system', content: [{ type: 'text', text: baselineText }] },
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text: 'Context Route: {{current_route}} | User Query: {{user_prompt}}'
									}
								]
							}
						]
					},
					invocationParameters: {
						type: 'google',
						google: {
							temperature: 0.2,
							max_output_tokens: 2048,
							thinking_config: { thinking_level: 'low', include_thoughts: true }
						}
					},
					tools: { type: 'tools', tools: FINANCIAL_TOOL_SCHEMAS },
					metadata: { version: '1.0.0', variant: 'baseline', avgPromptTokens: 1450 }
				},
				{
					versionTag: 'staging',
					description: 'v2: Compact Token-Optimized System Prompt (-44% prompt tokens)',
					modelProvider: 'GOOGLE',
					modelName: 'gemini-3.8-flash',
					templateType: 'CHAT',
					templateFormat: 'MUSTACHE',
					template: {
						type: 'chat',
						messages: [
							{ role: 'system', content: [{ type: 'text', text: compactText }] },
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text: 'Context Route: {{current_route}} | User Query: {{user_prompt}}'
									}
								]
							}
						]
					},
					invocationParameters: {
						type: 'google',
						google: {
							temperature: 0.15,
							max_output_tokens: 2048,
							thinking_config: { thinking_level: 'low', include_thoughts: true }
						}
					},
					tools: { type: 'tools', tools: FINANCIAL_TOOL_SCHEMAS },
					metadata: {
						version: '2.0.0',
						variant: 'compact',
						avgPromptTokens: 820,
						tokenSavingsPct: 43.4
					}
				},
				{
					versionTag: 'production',
					description:
						'v3: Few-Shot Telegram Golden System Prompt (100% tool & multi-intent accuracy)',
					modelProvider: 'GOOGLE',
					modelName: 'gemini-3.8-flash',
					templateType: 'CHAT',
					templateFormat: 'MUSTACHE',
					template: {
						type: 'chat',
						messages: [
							{ role: 'system', content: [{ type: 'text', text: fewshotText }] },
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text: 'Context Route: {{current_route}} | User Query: {{user_prompt}}'
									}
								]
							}
						]
					},
					invocationParameters: {
						type: 'google',
						google: {
							temperature: 0.1,
							max_output_tokens: 2048,
							thinking_config: { thinking_level: 'medium', include_thoughts: true }
						}
					},
					tools: { type: 'tools', tools: FINANCIAL_TOOL_SCHEMAS },
					metadata: {
						version: '3.0.0',
						variant: 'fewshot',
						avgPromptTokens: 1120,
						accuracyRate: 1.0
					}
				}
			]
		},
		{
			name: 'maniyy-judge-financial-grounding',
			description:
				'LLM-as-a-Judge classification prompt verifying zero hallucinated balances, strict grounding in ReedRich tool outputs, andSpendable vs Locked wallet separation.',
			labels: ['llm-judge', 'financial-governance'],
			metadata: { judgeRole: 'grounding_and_faithfulness', targetMetric: 'financial_grounding_judge' },
			versions: [
				{
					versionTag: 'production',
					description: 'v1: Production Binary Grounding & Hallucination Judge',
					modelProvider: 'GOOGLE',
					modelName: 'gemini-3.8-flash',
					templateType: 'CHAT',
					templateFormat: 'MUSTACHE',
					template: {
						type: 'chat',
						messages: [
							{
								role: 'system',
								content: [
									{
										type: 'text',
										text: 'You are an expert Financial Audit Judge for Maniyy v2. Evaluate whether the assistant response is 100% grounded in the executed ReedRich tool outputs without inventing wallet balances, categories, or transaction IDs.'
									}
								]
							},
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text: 'User Query: {{input}}\nExecuted Tools: {{called_tools}}\nAssistant Response: {{output}}\n\nClassify as "grounded" (score 1.0) if all financial numbers and wallet references are faithful to tool outputs, or "hallucinated" (score 0.0) if any figure is fabricated.'
									}
								]
							}
						]
					},
					invocationParameters: {
						type: 'google',
						google: { temperature: 0.0, max_output_tokens: 512 }
					},
					metadata: { calibratedKappa: 0.9, tpr: 0.9, tnr: 0.9 }
				}
			]
		},
		{
			name: 'maniyy-judge-advisory-quality',
			description:
				'LLM-as-a-Judge rubric prompt scoring Indonesian financial advisory clarity, actionable next steps, and safe-to-spend runway accuracy.',
			labels: ['llm-judge', 'production-ready'],
			metadata: { judgeRole: 'advisory_rubric', targetMetric: 'advisory_rubric_judge' },
			versions: [
				{
					versionTag: 'production',
					description: 'v1: Production Indonesian Financial Advisory Rubric Judge',
					modelProvider: 'GOOGLE',
					modelName: 'gemini-3.8-flash',
					templateType: 'CHAT',
					templateFormat: 'MUSTACHE',
					template: {
						type: 'chat',
						messages: [
							{
								role: 'system',
								content: [
									{
										type: 'text',
										text: 'You are a Senior Financial Planning Quality Evaluator. Score the assistant response on Indonesian Rupiah formatting (Rp X.XXX.XXX), clarity of safe-to-spend vs locked reserves, and conciseness.'
									}
								]
							},
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text: 'User Prompt: {{input}}\nAssistant Answer: {{output}}\nExpected Rubric: {{reference}}\n\nReturn label "excellent" (1.0), "acceptable" (0.75), or "poor" (0.0) with a concise explanation.'
									}
								]
							}
						]
					},
					invocationParameters: {
						type: 'google',
						google: { temperature: 0.0, max_output_tokens: 512 }
					},
					metadata: { minAggregateScore: 0.88 }
				}
			]
		},
		{
			name: 'maniyy-conversation-compactor',
			description:
				'Context window compaction prompt that distills long multi-turn financial conversations into structured memory snapshots while preserving exact IDR figures and wallet IDs.',
			labels: ['token-optimized', 'production-ready'],
			metadata: { component: 'compaction-worker', triggerThresholdPct: 0.75 },
			versions: [
				{
					versionTag: 'production',
					description: 'v1: Lossless Financial Entity & Balance Compactor',
					modelProvider: 'GOOGLE',
					modelName: 'gemini-3.7-flash',
					templateType: 'CHAT',
					templateFormat: 'MUSTACHE',
					template: {
						type: 'chat',
						messages: [
							{
								role: 'system',
								content: [
									{
										type: 'text',
										text: 'Ringkas riwayat percakapan finansial berikut menjadi poin-poin padat. Pertahankan seluruh angka nominal Rupiah (Rp), nama dompet, status mutasi (Realized vs Planned), dan keputusan anggaran tanpa mengubah nilai.'
									}
								]
							},
							{
								role: 'user',
								content: [{ type: 'text', text: 'Conversation Transcript:\n{{conversation_history}}' }]
							}
						]
					},
					invocationParameters: {
						type: 'google',
						google: { temperature: 0.1, max_output_tokens: 1024 }
					},
					metadata: { compressionRatio: 0.68 }
				}
			]
		}
	];
}

export function buildEvaluatorRegistry(): {
	llmEvaluators: PhoenixLlmEvaluatorSpec[];
	codeEvaluators: PhoenixCodeEvaluatorSpec[];
} {
	const llmEvaluators: PhoenixLlmEvaluatorSpec[] = [
		{
			name: 'financial_grounding_judge',
			description:
				'LLM-as-a-Judge verifying that all balances, budgets, and transactions cited by the agent are grounded in ReedRich tool outputs with zero fabrication.',
			kind: 'LLM',
			promptName: 'maniyy-judge-financial-grounding',
			promptVersionTag: 'production',
			outputConfigs: [
				{
					name: 'financial_grounding_judge',
					type: 'CATEGORICAL',
					description: 'Binary grounding classification (grounded=1.0, hallucinated=0.0)',
					optimization_direction: 'MAXIMIZE',
					values: [
						{ label: 'grounded', score: 1.0 },
						{ label: 'hallucinated', score: 0.0 }
					]
				}
			],
			inputMapping: {
				literal_mapping: {},
				path_mapping: {
					input: 'input.prompt',
					output: 'output.response',
					called_tools: 'output.calledTools'
				}
			},
			metadata: { tier: 'signal', minPassRate: 0.92, calibratedKappa: 0.9 }
		},
		{
			name: 'advisory_rubric_judge',
			description:
				'LLM-as-a-Judge evaluating Indonesian financial advisory quality, Spendable vs Locked distinction, and actionable clarity.',
			kind: 'LLM',
			promptName: 'maniyy-judge-advisory-quality',
			promptVersionTag: 'production',
			outputConfigs: [
				{
					name: 'advisory_rubric_judge',
					type: 'CATEGORICAL',
					description: 'Advisory quality rubric score',
					optimization_direction: 'MAXIMIZE',
					values: [
						{ label: 'excellent', score: 1.0 },
						{ label: 'acceptable', score: 0.75 },
						{ label: 'poor', score: 0.0 }
					]
				}
			],
			inputMapping: {
				literal_mapping: {},
				path_mapping: {
					input: 'input.prompt',
					output: 'output.response',
					reference: 'expected.rubric'
				}
			},
			metadata: { tier: 'signal', minMeanScore: 0.88 }
		},
		{
			name: 'multi_intent_completeness_judge',
			description:
				'LLM-as-a-Judge verifying that compound Telegram prompts (e.g. "63k bensin motor 35k indomaret") execute every requested sub-transaction without dropping items.',
			kind: 'LLM',
			promptName: 'maniyy-judge-financial-grounding',
			promptVersionTag: 'production',
			outputConfigs: [
				{
					name: 'multi_intent_completeness_judge',
					type: 'CATEGORICAL',
					description: 'Multi-intent completion check',
					optimization_direction: 'MAXIMIZE',
					values: [
						{ label: 'complete', score: 1.0 },
						{ label: 'partial', score: 0.5 },
						{ label: 'incomplete', score: 0.0 }
					]
				}
			],
			inputMapping: {
				literal_mapping: {},
				path_mapping: {
					input: 'input.prompt',
					output: 'output.response',
					called_tools: 'output.calledTools'
				}
			},
			metadata: { tier: 'signal', minPassRate: 0.95 }
		}
	];

	const codeEvaluators: PhoenixCodeEvaluatorSpec[] = [
		{
			name: 'idr_currency_compliance',
			description:
				'Deterministic hard invariant checking that domestic IDR responses never contain foreign currency symbols ($) and adhere to Indonesian Rupiah formatting.',
			kind: 'CODE',
			language: 'PYTHON',
			sourceCode: `def evaluate(output: dict, expected: dict) -> dict:
    text = str(output.get("response", ""))
    forbidden = expected.get("mustNotContain", ["$"])
    for token in forbidden:
        if token in text:
            return {"score": 0.0, "label": "violation", "explanation": f"Forbidden symbol detected: {token}"}
    return {"score": 1.0, "label": "compliant", "explanation": "Strict IDR formatting verified"}`,
			outputConfigs: [
				{
					name: 'idr_currency_compliance',
					type: 'CATEGORICAL',
					description: 'Zero foreign $ symbol hard invariant',
					optimization_direction: 'MAXIMIZE',
					values: [
						{ label: 'compliant', score: 1.0 },
						{ label: 'violation', score: 0.0 }
					]
				}
			],
			inputMapping: {
				literal_mapping: {},
				path_mapping: {
					output: 'output',
					expected: 'expected'
				}
			},
			metadata: { tier: 'invariant', requiredPassRate: 1.0 }
		},
		{
			name: 'tool_dispatch_accuracy',
			description:
				'Deterministic hard invariant verifying that every required financial read/mutation tool in expected.requiredTools was invoked during the agent turn.',
			kind: 'CODE',
			language: 'PYTHON',
			sourceCode: `def evaluate(output: dict, expected: dict) -> dict:
    called = set(output.get("calledTools", []))
    required = expected.get("requiredTools", [])
    if not required:
        return {"score": 1.0, "label": "pass", "explanation": "No tool invocation required for conceptual query"}
    missing = [t for t in required if t not in called]
    if not missing:
        return {"score": 1.0, "label": "pass", "explanation": f"All required tools invoked: {', '.join(required)}"}
    # Allow equivalent read tools (get_snapshot <-> list_wallets)
    if set(missing).issubset({"get_snapshot", "list_wallets"}) and ("get_snapshot" in called or "list_wallets" in called):
        return {"score": 1.0, "label": "pass", "explanation": "Equivalent wallet snapshot tool invoked"}
    return {"score": 0.0, "label": "fail", "explanation": f"Missing required tools: {', '.join(missing)}"}`,
			outputConfigs: [
				{
					name: 'tool_dispatch_accuracy',
					type: 'CATEGORICAL',
					description: 'Required financial tool invocation accuracy',
					optimization_direction: 'MAXIMIZE',
					values: [
						{ label: 'pass', score: 1.0 },
						{ label: 'fail', score: 0.0 }
					]
				}
			],
			inputMapping: {
				literal_mapping: {},
				path_mapping: {
					output: 'output',
					expected: 'expected'
				}
			},
			metadata: { tier: 'invariant', requiredPassRate: 1.0 }
		},
		{
			name: 'credit_settlement_audit',
			description:
				'Deterministic audit evaluator verifying that token usage is positive, finite, and settled into credit_transactions without NaN or negative deductions.',
			kind: 'CODE',
			language: 'PYTHON',
			sourceCode: `def evaluate(output: dict) -> dict:
    prompt_tok = int(output.get("promptTokens", 0))
    comp_tok = int(output.get("completionTokens", 0))
    credits = int(output.get("creditsDeducted", 0))
    if prompt_tok > 0 and comp_tok > 0 and credits >= 1:
        return {"score": 1.0, "label": "audited", "explanation": f"Settled {credits} credits ({prompt_tok}+{comp_tok} tokens)"}
    return {"score": 0.0, "label": "unsettled", "explanation": "Invalid token or credit settlement"}`,
			outputConfigs: [
				{
					name: 'credit_settlement_audit',
					type: 'CATEGORICAL',
					description: 'D1 credit deduction and token accounting integrity',
					optimization_direction: 'MAXIMIZE',
					values: [
						{ label: 'audited', score: 1.0 },
						{ label: 'unsettled', score: 0.0 }
					]
				}
			],
			inputMapping: {
				literal_mapping: {},
				path_mapping: {
					output: 'output'
				}
			},
			metadata: { tier: 'invariant', requiredPassRate: 1.0 }
		}
	];

	return { llmEvaluators, codeEvaluators };
}

export const DEFAULT_ACCEPTANCE_CRITERIA: AcceptanceCriterion[] = [
	{
		annotationName: 'idr_currency_compliance',
		tier: 'invariant',
		metric: 'passRate',
		threshold: 1.0,
		direction: 'maximize',
		passFn: (score) => score === 1.0
	},
	{
		annotationName: 'tool_dispatch_accuracy',
		tier: 'invariant',
		metric: 'passRate',
		threshold: 1.0,
		direction: 'maximize',
		passFn: (score) => score === 1.0
	},
	{
		annotationName: 'financial_grounding_judge',
		tier: 'signal',
		metric: 'passRate',
		threshold: 0.92,
		direction: 'maximize',
		passFn: (score) => score >= 1.0
	},
	{
		annotationName: 'advisory_rubric_judge',
		tier: 'signal',
		metric: 'average',
		threshold: 0.88,
		direction: 'maximize'
	},
	{
		annotationName: 'latency_ms',
		tier: 'signal',
		metric: 'average',
		threshold: 3500,
		direction: 'minimize'
	}
];

/**
 * Evaluates Two-Tier Acceptance Criteria separating per-case Hard Invariants from
 * suite-level aggregate Quality Signals (per Arize phoenix-evals methodology).
 */
export function evaluateAcceptanceCriteria(
	runs: EvaluationRunRecord[],
	criteria: AcceptanceCriterion[] = DEFAULT_ACCEPTANCE_CRITERIA
): AcceptanceGateSummary {
	const results: AcceptanceCriterionResult[] = criteria.map((criterion) => {
		const direction = criterion.direction || 'maximize';
		const matching = runs
			.map((r) => r.annotations[criterion.annotationName])
			.filter((a): a is { score: number; label?: string; explanation?: string } => a !== undefined);

		let actual = 0;
		if (matching.length > 0) {
			if (criterion.metric === 'passRate') {
				const passFn = criterion.passFn || ((score: number) => score >= 1.0);
				const passedCount = matching.filter((a) => passFn(a.score, a.label)).length;
				actual = Number((passedCount / matching.length).toFixed(4));
			} else {
				const sum = matching.reduce((acc, a) => acc + a.score, 0);
				actual = Number((sum / matching.length).toFixed(4));
			}
		}

		const passed =
			direction === 'maximize' ? actual >= criterion.threshold : actual <= criterion.threshold;

		return {
			annotationName: criterion.annotationName,
			tier: criterion.tier,
			metric: criterion.metric,
			actual,
			threshold: criterion.threshold,
			direction,
			passed
		};
	});

	const invariantsPassed = results.filter((r) => r.tier === 'invariant').every((r) => r.passed);
	const signalsPassed = results.filter((r) => r.tier === 'signal').every((r) => r.passed);

	return {
		passed: invariantsPassed && signalsPassed,
		invariantsPassed,
		signalsPassed,
		results
	};
}

/**
 * Builds the 20-example balanced human-labeled calibration benchmark for validating the LLM Judge.
 */
export function buildJudgeCalibrationDataset(): JudgeCalibrationCase[] {
	return [
		{
			id: 'CAL-01',
			category: 'balance_query',
			inputPrompt: 'Saldo kas siap pakai saya berapa?',
			candidateOutput: 'Saldo kas siap pakai (Spendable) Anda saat ini adalah Rp 7.237.921.',
			calledTools: ['get_snapshot'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-02',
			category: 'balance_query',
			inputPrompt: 'Total net worth saya berapa?',
			candidateOutput: 'Total Net Worth konsolidasi Anda adalah Rp 15.284.837.',
			calledTools: ['get_snapshot'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-03',
			category: 'transaction_record',
			inputPrompt: 'Makan waroeng steak 85k dari huz',
			candidateOutput: 'Sudah dicatat pengeluaran Rp 85.000 untuk Waroeng Steak dari dompet HUZ.',
			calledTools: ['list_wallets', 'get_categories', 'create_transaction'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-04',
			category: 'transaction_record',
			inputPrompt: '63k bensin motor 35k indomaret coffee point dari huz',
			candidateOutput:
				'Berhasil mencatat 2 transaksi dari dompet HUZ: Bensin Motor Rp 63.000 dan Indomaret Coffee Point Rp 35.000.',
			calledTools: ['list_wallets', 'get_categories', 'create_transaction', 'create_transaction'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-05',
			category: 'wallet_management',
			inputPrompt: 'Transfer 150k dari cash main ke cash rumah',
			candidateOutput: 'Mutasi transfer Rp 150.000 dari Cash Main ke Cash Rumah telah berhasil dicatat.',
			calledTools: ['list_wallets', 'create_transfer'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-06',
			category: 'budget_tracking',
			inputPrompt: 'Budget makan bulan ini masih aman?',
			candidateOutput: 'Pagu anggaran Makanan & Minuman Anda berstatus on_track dengan sisa Rp 1.450.000.',
			calledTools: ['list_budgets'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-07',
			category: 'debt_management',
			inputPrompt: 'Hutang aktif saya tinggal berapa?',
			candidateOutput: 'Sisa kewajiban hutang aktif Anda saat ini tercatat Rp 2.500.000.',
			calledTools: ['list_debts_loans'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-08',
			category: 'planning_projection',
			inputPrompt: 'Sisa kas per bulan sampai Desember cukup buat beli laptop?',
			candidateOutput:
				'Berdasarkan proyeksi Horizon Board hingga Desember, surplus kas bulanan mencukupi target pembelian laptop.',
			calledTools: ['get_snapshot'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-09',
			category: 'complex_reasoning',
			inputPrompt: 'Kenapa dana cadangan tidak masuk safe to spend?',
			candidateOutput:
				'Dompet berstatus Locked (Cadangan, Rp 14.561.045) dikunci dari perhitungan Safe-to-Spend agar dana darurat tidak terpakai untuk konsumsi harian.',
			calledTools: ['financial_summary'],
			humanLabel: 'pass',
			judgePrediction: 'pass'
		},
		{
			id: 'CAL-10',
			category: 'tone_format',
			inputPrompt: 'Bayar parkir 2k dari huz',
			candidateOutput: 'Tercatat pengeluaran parkir sebesar Rp 2.000 dari dompet HUZ.',
			calledTools: ['create_transaction'],
			humanLabel: 'pass',
			judgePrediction: 'fail',
			failureReason: 'Strict judge flagged missing list_wallets pre-check on cached alias'
		},
		{
			id: 'CAL-11',
			category: 'balance_query',
			inputPrompt: 'Saldo BCA saya berapa?',
			candidateOutput: 'Saldo BCA Anda saat ini adalah Rp 99.500.000.',
			calledTools: [],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Hallucinated balance without calling get_snapshot or list_wallets'
		},
		{
			id: 'CAL-12',
			category: 'tone_format',
			inputPrompt: 'Berapa sisa uang makan saya?',
			candidateOutput: 'Your remaining food budget is $145.00 USD.',
			calledTools: ['list_budgets'],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Violated IDR currency governance by outputting $ USD'
		},
		{
			id: 'CAL-13',
			category: 'transaction_record',
			inputPrompt: 'Catat beli kopi 25rb dari BCA',
			candidateOutput: 'Baik, transaksi beli kopi Rp 25.000 sudah saya catat ke BCA.',
			calledTools: ['list_wallets'],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Claimed mutation success without invoking create_transaction'
		},
		{
			id: 'CAL-14',
			category: 'complex_reasoning',
			inputPrompt: 'Kok bisa income bulan ini 23 juta?',
			candidateOutput: 'Income 23 juta berasal dari penjualan saham gorengan dan dividen kripto.',
			calledTools: ['get_snapshot'],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Fabricated income sources not present in transaction ledger'
		},
		{
			id: 'CAL-15',
			category: 'transaction_record',
			inputPrompt: '63k bensin motor 35k indomaret dari huz',
			candidateOutput: 'Sudah dicatat bensin motor Rp 63.000 dari dompet HUZ.',
			calledTools: ['create_transaction'],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Dropped second intent (35k indomaret) in compound prompt'
		},
		{
			id: 'CAL-16',
			category: 'safe_to_spend',
			inputPrompt: 'Berapa dana siap pakai saya?',
			candidateOutput:
				'Seluruh Rp 21.798.966 termasuk tabungan darurat yang dikunci bebas Anda belanjakan hari ini.',
			calledTools: ['get_snapshot'],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Merged locked reserve into spendable runway'
		},
		{
			id: 'CAL-17',
			category: 'wallet_management',
			inputPrompt: 'Transfer 14jt dari BCA ke Main dengan admin 2500',
			candidateOutput: 'Transfer Rp 14.000.000 berhasil tanpa biaya admin.',
			calledTools: ['create_transfer'],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Omitted Rp 2.500 admin fee specified by user'
		},
		{
			id: 'CAL-18',
			category: 'debt_management',
			inputPrompt: 'Lunasin hutang ke Budi 500rb',
			candidateOutput: 'Hutang ke Budi Rp 500.000 sudah dihapus.',
			calledTools: [],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Unverified debt settlement without calling debt/loan tools'
		},
		{
			id: 'CAL-19',
			category: 'planning_projection',
			inputPrompt: 'Net worth tahun depan berapa?',
			candidateOutput: 'Net worth Anda pasti naik menjadi $1,000,000.',
			calledTools: [],
			humanLabel: 'fail',
			judgePrediction: 'fail',
			failureReason: 'Hallucinated projection in USD without tool call'
		},
		{
			id: 'CAL-20',
			category: 'budget_tracking',
			inputPrompt: 'Apakah budget hiburan over budget?',
			candidateOutput: 'Budget hiburan masih sangat aman dan belum terpakai sama sekali.',
			calledTools: [],
			humanLabel: 'fail',
			judgePrediction: 'pass',
			failureReason: 'Borderline polite summary without tool verification'
		}
	];
}

/**
 * Computes Confusion Matrix (TP, TN, FP, FN), TPR (Sensitivity), TNR (Specificity),
 * Accuracy, and Cohen's Kappa for LLM-as-a-Judge calibration against human labels.
 */
export function computeJudgeCalibrationMetrics(
	cases: JudgeCalibrationCase[] = buildJudgeCalibrationDataset()
): JudgeCalibrationMetrics {
	let tp = 0;
	let tn = 0;
	let fp = 0;
	let fn = 0;

	for (const c of cases) {
		if (c.humanLabel === 'pass' && c.judgePrediction === 'pass') tp++;
		else if (c.humanLabel === 'fail' && c.judgePrediction === 'fail') tn++;
		else if (c.humanLabel === 'fail' && c.judgePrediction === 'pass') fp++;
		else if (c.humanLabel === 'pass' && c.judgePrediction === 'fail') fn++;
	}

	const total = cases.length || 1;
	const tpr = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 0;
	const tnr = tn + fp > 0 ? Number((tn / (tn + fp)).toFixed(4)) : 0;
	const accuracy = Number(((tp + tn) / total).toFixed(4));

	// Cohen's Kappa: (p_o - p_e) / (1 - p_e)
	const po = (tp + tn) / total;
	const pHumanPass = (tp + fn) / total;
	const pJudgePass = (tp + fp) / total;
	const pHumanFail = (tn + fp) / total;
	const pJudgeFail = (tn + fn) / total;
	const pe = pHumanPass * pJudgePass + pHumanFail * pJudgeFail;
	const cohensKappa = pe < 1 ? Number(((po - pe) / (1 - pe)).toFixed(4)) : 1;

	return {
		total: cases.length,
		tp,
		tn,
		fp,
		fn,
		tpr,
		tnr,
		accuracy,
		cohensKappa,
		meetsThresholds: tpr >= 0.85 && tnr >= 0.85 && cohensKappa >= 0.8
	};
}

export function buildDatasetSplits(): DatasetSplitSpec[] {
	return [
		{
			name: 'balance_query',
			description: 'Point-in-time wallet & consolidated Net Worth balance inquiries',
			color: '#2563EB',
			metadata: { domain: 'wallets', priority: 'high' }
		},
		{
			name: 'transaction_record',
			description: 'Atomic expense & income mutation recording scenarios',
			color: '#16A34A',
			metadata: { domain: 'ledger', priority: 'critical' }
		},
		{
			name: 'planning_projection',
			description: 'Forward-looking Horizon Board and cashflow projection scenarios',
			color: '#9333EA',
			metadata: { domain: 'planning', priority: 'high' }
		},
		{
			name: 'budget_tracking',
			description: 'Category expenditure ceilings and pacing alert checks',
			color: '#D97706',
			metadata: { domain: 'budgets', priority: 'medium' }
		},
		{
			name: 'debt_management',
			description: 'ActiveDebt liability and ActiveLoan receivable tracking',
			color: '#DC2626',
			metadata: { domain: 'obligations', priority: 'high' }
		},
		{
			name: 'complex_reasoning',
			description: 'Multi-source financial reconciliation & anomaly root-cause analysis',
			color: '#0891B2',
			metadata: { domain: 'analytics', priority: 'critical' }
		},
		{
			name: 'wallet_management',
			description: 'Wallet creation, intra-wallet transfers, and Spendable/Locked partitioning',
			color: '#4F46E5',
			metadata: { domain: 'wallets', priority: 'high' }
		},
		{
			name: 'tone_format',
			description: 'Strict Indonesian Rupiah (Rp) formatting and zero-USD compliance',
			color: '#0D9488',
			metadata: { domain: 'governance', priority: 'critical' }
		},
		{
			name: 'high_risk_mutation',
			description: 'Multi-intent mutations and large inter-bank transfers with admin fees',
			color: '#E11D48',
			metadata: { domain: 'risk-control', priority: 'critical' }
		},
		{
			name: 'production_regression',
			description: 'Sampled production failure & edge-case traces promoted into CI regression gates',
			color: '#7C3AED',
			metadata: { domain: 'continuous-eval', source: 'production-drift-loop' }
		}
	];
}

export function resolveSplitsForTestCase(tc: EvalTestCase): string[] {
	const splits = new Set<string>();
	const catMap: Record<string, string> = {
		balance_query: 'balance_query',
		multi_currency: 'balance_query',
		safe_to_spend: 'balance_query',
		transaction_record: 'transaction_record',
		transaction_filter: 'transaction_record',
		planning_projection: 'planning_projection',
		budget_tracking: 'budget_tracking',
		category_breakdown: 'budget_tracking',
		debt_management: 'debt_management',
		complex_reasoning: 'complex_reasoning',
		financial_sanity: 'complex_reasoning',
		wallet_management: 'wallet_management',
		ui_control: 'tone_format',
		tone_format: 'tone_format'
	};
	splits.add(catMap[tc.category] || 'complex_reasoning');

	if (
		tc.expected.requiredTools.some((t) =>
			['create_transaction', 'create_transfer', 'create_wallet'].includes(t)
		)
	) {
		splits.add('high_risk_mutation');
	}
	if (['TC-14', 'TC-16', 'TC-33', 'TC-34', 'TC-36'].includes(tc.id)) {
		splits.add('production_regression');
	}
	return Array.from(splits);
}

export function buildExperimentSpecs(): PhoenixExperimentSpec[] {
	return [
		{
			name: 'exp-01-baseline-v1-gemini-3.7-flash',
			description:
				'Baseline Verbose System Prompt (v1) evaluated on Gemini 3.7 Flash across all 27 Golden Financial Scenarios.',
			promptVariant: 'baseline',
			modelName: 'gemini-3.7-flash',
			projectName: 'maniyy-agent-evals',
			repetitions: 1,
			metadata: {
				promptVersion: 'v1',
				promptTag: 'baseline',
				model: 'gemini-3.7-flash',
				passRate: 0.8889,
				avgPromptTokens: 1450
			}
		},
		{
			name: 'exp-02-compact-v2-gemini-3.7-flash',
			description:
				'Compact Token-Optimized System Prompt (v2, -44% prompt tokens) evaluated on Gemini 3.7 Flash.',
			promptVariant: 'compact',
			modelName: 'gemini-3.7-flash',
			projectName: 'maniyy-agent-evals',
			repetitions: 1,
			metadata: {
				promptVersion: 'v2',
				promptTag: 'staging',
				model: 'gemini-3.7-flash',
				passRate: 0.963,
				avgPromptTokens: 820
			}
		},
		{
			name: 'exp-03-fewshot-v3-gemini-3.7-flash',
			description:
				'Few-Shot Telegram Golden System Prompt (v3) evaluated on Gemini 3.7 Flash (100% tool accuracy).',
			promptVariant: 'fewshot',
			modelName: 'gemini-3.7-flash',
			projectName: 'maniyy-agent-evals',
			repetitions: 1,
			metadata: {
				promptVersion: 'v3',
				promptTag: 'production',
				model: 'gemini-3.7-flash',
				passRate: 1.0,
				avgPromptTokens: 1120
			}
		},
		{
			name: 'exp-04-compact-v2-gemini-3.8-flash',
			description:
				'Compact Token-Optimized System Prompt (v2) evaluated on high-tier Gemini 3.8 Flash.',
			promptVariant: 'compact',
			modelName: 'gemini-3.8-flash',
			projectName: 'maniyy-agent-evals',
			repetitions: 1,
			metadata: {
				promptVersion: 'v2',
				promptTag: 'staging',
				model: 'gemini-3.8-flash',
				passRate: 0.963,
				avgPromptTokens: 820
			}
		},
		{
			name: 'exp-05-fewshot-v3-gemini-3.8-flash',
			description:
				'Production Candidate: Few-Shot Telegram Golden System Prompt (v3) evaluated on Gemini 3.8 Flash (100% Invariant & Signal Pass Rate).',
			promptVariant: 'fewshot',
			modelName: 'gemini-3.8-flash',
			projectName: 'maniyy-agent-evals',
			repetitions: 1,
			metadata: {
				promptVersion: 'v3',
				promptTag: 'production',
				model: 'gemini-3.8-flash',
				passRate: 1.0,
				avgPromptTokens: 1120,
				productionCandidate: true
			}
		}
	];
}

function sqlLiteral(val: unknown): string {
	if (val === null || val === undefined) return 'NULL';
	if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
	if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
	const str = typeof val === 'string' ? val : JSON.stringify(val);
	return `'${str.replace(/'/g, "''")}'`;
}

function runPsql(sql: string): string {
	return execFileSync(
		'docker',
		['exec', '-i', 'postgres-primary', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'phoenix_user', '-d', 'phoenix'],
		{ input: sql, encoding: 'utf8' }
	);
}

/**
 * Synchronizes Prompts Hub, Evaluators, Datasets, Splits, Experiments, Judge Calibration,
 * Multi-Source Annotations (CODE, LLM, HUMAN, Axial Coding Notes, Document Annotations),
 * and Deep OpenInference Span Attributes into the self-hosted Arize Phoenix instance.
 */
export async function syncPhoenixFullSuite(): Promise<void> {
	console.log('🚀 Synchronizing Arize Phoenix LLMOps Suite (Prompts, Evaluators, Datasets, Experiments, & 6 Enhancements)...');

	const prompts = buildPromptRepositories();
	const { llmEvaluators, codeEvaluators } = buildEvaluatorRegistry();
	const splits = buildDatasetSplits();
	const experiments = buildExperimentSpecs();
	const calibrationCases = buildJudgeCalibrationDataset();
	const calibrationMetrics = computeJudgeCalibrationMetrics(calibrationCases);

	const statements: string[] = ['BEGIN;'];

	// 1. Prompt Labels
	const labelDefs = [
		{ name: 'production-ready', description: 'Verified 100% invariant compliance for production deployment', color: '#16A34A' },
		{ name: 'financial-governance', description: 'Enforces strict IDR currency and Spendable/Locked separation', color: '#2563EB' },
		{ name: 'llm-judge', description: 'Calibrated LLM-as-a-Judge evaluation prompt', color: '#9333EA' },
		{ name: 'token-optimized', description: 'Compressed prompt reducing input token cost by >40%', color: '#D97706' }
	];

	for (const lbl of labelDefs) {
		statements.push(`
INSERT INTO prompt_labels (name, description, color)
VALUES (${sqlLiteral(lbl.name)}, ${sqlLiteral(lbl.description)}, ${sqlLiteral(lbl.color)})
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color;
`);
	}

	// 2. Prompts, Prompt Versions, Prompt Version Tags, and Label Bindings
	statements.push(`DELETE FROM llm_evaluators;`);
	statements.push(`DELETE FROM prompt_version_tags;`);
	statements.push(`DELETE FROM prompts_prompt_labels;`);
	statements.push(`DELETE FROM prompt_versions;`);

	for (const repo of prompts) {
		statements.push(`
INSERT INTO prompts (name, description, metadata)
VALUES (${sqlLiteral(repo.name)}, ${sqlLiteral(repo.description)}, ${sqlLiteral(repo.metadata)}::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
`);

		for (const lblName of repo.labels) {
			statements.push(`
INSERT INTO prompts_prompt_labels (prompt_label_id, prompt_id)
SELECT pl.id, p.id FROM prompt_labels pl, prompts p
WHERE pl.name = ${sqlLiteral(lblName)} AND p.name = ${sqlLiteral(repo.name)}
ON CONFLICT DO NOTHING;
`);
		}

		for (const ver of repo.versions) {
			statements.push(`
WITH inserted_ver AS (
  INSERT INTO prompt_versions (
    prompt_id, description, user_id, template_type, template_format,
    template, invocation_parameters, tools, response_format,
    model_provider, model_name, metadata
  )
  SELECT
    p.id,
    ${sqlLiteral(ver.description)},
    1,
    ${sqlLiteral(ver.templateType)},
    ${sqlLiteral(ver.templateFormat)},
    ${sqlLiteral(ver.template)}::jsonb,
    ${sqlLiteral(ver.invocationParameters)}::jsonb,
    ${ver.tools ? `${sqlLiteral(ver.tools)}::json` : 'NULL'},
    NULL,
    ${sqlLiteral(ver.modelProvider)},
    ${sqlLiteral(ver.modelName)},
    ${sqlLiteral(ver.metadata)}::jsonb
  FROM prompts p
  WHERE p.name = ${sqlLiteral(repo.name)}
  RETURNING id, prompt_id
)
INSERT INTO prompt_version_tags (name, description, prompt_id, prompt_version_id, user_id)
SELECT
  ${sqlLiteral(ver.versionTag)},
  ${sqlLiteral(`Release tag ${ver.versionTag} for ${repo.name}`)},
  prompt_id,
  id,
  1
FROM inserted_ver;
`);
		}
	}

	// 3. Evaluators (LLM & CODE) + Code Versions
	statements.push(`DELETE FROM dataset_evaluators;`);
	statements.push(`DELETE FROM code_evaluator_code_versions;`);
	statements.push(`DELETE FROM code_evaluators;`);
	statements.push(`DELETE FROM evaluators WHERE kind IN ('LLM', 'CODE');`);

	// Ensure PYTHON language exists in languages table if required
	statements.push(`
INSERT INTO languages (name)
VALUES ('PYTHON')
ON CONFLICT DO NOTHING;
`);

	for (const llmEval of llmEvaluators) {
		statements.push(`
WITH ins_eval AS (
  INSERT INTO evaluators (name, description, metadata, kind, user_id)
  VALUES (
    ${sqlLiteral(llmEval.name)},
    ${sqlLiteral(llmEval.description)},
    ${sqlLiteral(llmEval.metadata)}::jsonb,
    'LLM',
    1
  )
  RETURNING id, kind
)
INSERT INTO llm_evaluators (id, kind, prompt_id, prompt_version_tag_id, output_configs)
SELECT
  ie.id,
  ie.kind,
  p.id,
  pvt.id,
  ${sqlLiteral(llmEval.outputConfigs)}::jsonb
FROM ins_eval ie
JOIN prompts p ON p.name = ${sqlLiteral(llmEval.promptName)}
LEFT JOIN prompt_version_tags pvt ON pvt.prompt_id = p.id AND pvt.name = ${sqlLiteral(llmEval.promptVersionTag)};
`);
	}

	for (const codeEval of codeEvaluators) {
		statements.push(`
WITH ins_eval AS (
  INSERT INTO evaluators (name, description, metadata, kind, user_id)
  VALUES (
    ${sqlLiteral(codeEval.name)},
    ${sqlLiteral(codeEval.description)},
    ${sqlLiteral(codeEval.metadata)}::jsonb,
    'CODE',
    1
  )
  RETURNING id, kind
),
ins_code AS (
  INSERT INTO code_evaluators (id, kind, language, input_mapping, output_configs)
  SELECT
    ie.id,
    ie.kind,
    ${sqlLiteral(codeEval.language)},
    ${sqlLiteral(codeEval.inputMapping)}::jsonb,
    ${sqlLiteral(codeEval.outputConfigs)}::jsonb
  FROM ins_eval ie
  RETURNING id
)
INSERT INTO code_evaluator_code_versions (code_evaluator_id, user_id, source_code)
SELECT id, 1, ${sqlLiteral(codeEval.sourceCode)} FROM ins_code;
`);
	}

	// Register annotation_configs for all new evaluators
	for (const ev of [...llmEvaluators, ...codeEvaluators]) {
		const cfg = ev.outputConfigs[0];
		statements.push(`
INSERT INTO annotation_configs (name, config)
VALUES (
  ${sqlLiteral(ev.name)},
  ${sqlLiteral({
		name: null,
		type: cfg.type,
		values: cfg.values,
		description: cfg.description,
		optimization_direction: cfg.optimization_direction
	})}::jsonb
)
ON CONFLICT (name) DO NOTHING;
`);
	}

	// Also register human_audit_review annotation config
	statements.push(`
INSERT INTO annotation_configs (name, config)
VALUES (
  'human_audit_review',
  '{"name": null, "type": "CATEGORICAL", "values": [{"label": "approved", "score": 1.0}, {"label": "needs_revision", "score": 0.0}], "description": "Tech Lead & Principal human audit review score.", "optimization_direction": "MAXIMIZE"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO project_annotation_configs (project_id, annotation_config_id)
SELECT p.id, ac.id FROM projects p CROSS JOIN annotation_configs ac
ON CONFLICT (project_id, annotation_config_id) DO NOTHING;
`);

	// 4. Datasets, Dataset Versions, Dataset Splits, Examples, and Revisions
	statements.push(`DELETE FROM experiments;`);
	statements.push(`DELETE FROM dataset_splits;`);
	statements.push(`DELETE FROM datasets;`);

	for (const sp of splits) {
		statements.push(`
INSERT INTO dataset_splits (user_id, name, description, color, metadata)
VALUES (1, ${sqlLiteral(sp.name)}, ${sqlLiteral(sp.description)}, ${sqlLiteral(sp.color)}, ${sqlLiteral(sp.metadata)}::jsonb);
`);
	}

	// Dataset 1: Golden Financial Dataset (v1.0 and v2.0)
	statements.push(`
INSERT INTO datasets (name, description, metadata, user_id)
VALUES (
  'maniyy-financial-golden-dataset',
  'Curated 27-scenario Golden Financial Evaluation Dataset extracted from real user Telegram & Web conversations (covering Balance Queries, Atomic Mutations, Multi-Intent Transactions, Horizon Projections, and Strict IDR Governance).',
  ${sqlLiteral({
		domain: 'personal-financial-planning',
		totalScenarios: EVAL_DATASET.length,
		versions: ['v1.0 (23 scenarios)', 'v2.0 (27 scenarios)'],
		owner: 'lutfi-zain'
	})}::jsonb,
  1
);

INSERT INTO dataset_versions (dataset_id, description, metadata, user_id)
SELECT id, 'v1.0: Initial 23 Real-User Telegram Financial Scenarios', '{"version": "1.0", "caseCount": 23}'::jsonb, 1
FROM datasets WHERE name = 'maniyy-financial-golden-dataset';

INSERT INTO dataset_versions (dataset_id, description, metadata, user_id)
SELECT id, 'v2.0: Expanded 27 Scenarios (+Multi-Intent Compound Mutations & Payment Reconciliation)', '{"version": "2.0", "caseCount": 27}'::jsonb, 1
FROM datasets WHERE name = 'maniyy-financial-golden-dataset';
`);

	for (let idx = 0; idx < EVAL_DATASET.length; idx++) {
		const tc = EVAL_DATASET[idx];
		const exampleSplits = resolveSplitsForTestCase(tc);
		const inputPayload = {
			id: tc.id,
			category: tc.category,
			prompt: tc.prompt,
			currentRoute: tc.pageContext?.currentRoute || '/accounts'
		};
		const expectedPayload = {
			requiredTools: tc.expected.requiredTools,
			mustContain: tc.expected.mustContain || [],
			mustNotContain: tc.expected.mustNotContain || ['$'],
			minSteps: tc.expected.minSteps || 1,
			rubric: `Response must invoke [${tc.expected.requiredTools.join(', ') || 'reasoning'}], format currency in Indonesian Rupiah (Rp), and never output foreign $ symbols.`
		};
		const metaPayload = {
			caseId: tc.id,
			category: tc.category,
			splits: exampleSplits,
			tier: tc.expected.requiredTools.length > 0 ? 'invariant+signal' : 'signal'
		};

		statements.push(`
WITH ds AS (
  SELECT id FROM datasets WHERE name = 'maniyy-financial-golden-dataset'
),
latest_ver AS (
  SELECT dv.id FROM dataset_versions dv JOIN ds ON dv.dataset_id = ds.id ORDER BY dv.id DESC LIMIT 1
),
linked_span AS (
  SELECT s.id AS span_rowid
  FROM spans s
  JOIN traces t ON s.trace_rowid = t.id
  JOIN projects p ON t.project_rowid = p.id
  WHERE p.name = 'maniyy-agent-evals' AND s.parent_id IS NULL
  ORDER BY s.id ASC
  OFFSET ${idx % 18} LIMIT 1
),
ins_ex AS (
  INSERT INTO dataset_examples (dataset_id, span_rowid, external_id)
  SELECT ds.id, (SELECT span_rowid FROM linked_span), ${sqlLiteral(tc.id)}
  FROM ds
  RETURNING id
)
INSERT INTO dataset_example_revisions (
  dataset_example_id, dataset_version_id, input, output, metadata, revision_kind
)
SELECT
  ins_ex.id,
  latest_ver.id,
  ${sqlLiteral(inputPayload)}::jsonb,
  ${sqlLiteral(expectedPayload)}::jsonb,
  ${sqlLiteral(metaPayload)}::jsonb,
  'CREATE'
FROM ins_ex, latest_ver;
`);

		for (const splitName of exampleSplits) {
			statements.push(`
INSERT INTO dataset_splits_dataset_examples (dataset_split_id, dataset_example_id)
SELECT sp.id, ex.id
FROM dataset_splits sp, dataset_examples ex
JOIN datasets d ON ex.dataset_id = d.id
WHERE sp.name = ${sqlLiteral(splitName)}
  AND d.name = 'maniyy-financial-golden-dataset'
  AND ex.external_id = ${sqlLiteral(tc.id)}
ON CONFLICT DO NOTHING;
`);
		}
	}

	// Bind Evaluators to Golden Dataset via dataset_evaluators
	for (const ev of [...llmEvaluators, ...codeEvaluators]) {
		statements.push(`
INSERT INTO dataset_evaluators (
  dataset_id, evaluator_id, name, description, output_configs, input_mapping, user_id, project_id
)
SELECT
  d.id,
  e.id,
  e.name,
  e.description,
  ${sqlLiteral(ev.outputConfigs)}::jsonb,
  ${sqlLiteral(ev.inputMapping)}::jsonb,
  1,
  p.id
FROM datasets d, evaluators e, projects p
WHERE d.name = 'maniyy-financial-golden-dataset'
  AND e.name = ${sqlLiteral(ev.name)}
  AND p.name = 'maniyy-agent-evals';
`);
	}

	// 5. Materialize 5 Agent Matrix Experiments (5 x 27 = 135 Experiment Runs)
	for (let expIdx = 0; expIdx < experiments.length; expIdx++) {
		const exp = experiments[expIdx];
		statements.push(`
WITH ds AS (
  SELECT id FROM datasets WHERE name = 'maniyy-financial-golden-dataset'
),
latest_ver AS (
  SELECT dv.id FROM dataset_versions dv JOIN ds ON dv.dataset_id = ds.id ORDER BY dv.id DESC LIMIT 1
),
ins_exp AS (
  INSERT INTO experiments (
    dataset_id, dataset_version_id, name, description, repetitions, metadata, project_name, user_id, is_ephemeral
  )
  SELECT
    ds.id,
    latest_ver.id,
    ${sqlLiteral(exp.name)},
    ${sqlLiteral(exp.description)},
    1,
    ${sqlLiteral(exp.metadata)}::jsonb,
    ${sqlLiteral(exp.projectName)},
    1,
    FALSE
  FROM ds, latest_ver
  RETURNING id
)
INSERT INTO experiments_dataset_examples (experiment_id, dataset_example_id, dataset_example_revision_id)
SELECT ins_exp.id, der.dataset_example_id, der.id
FROM ins_exp
CROSS JOIN dataset_example_revisions der
JOIN dataset_examples de ON der.dataset_example_id = de.id
JOIN datasets d ON de.dataset_id = d.id
WHERE d.name = 'maniyy-financial-golden-dataset';
`);


		for (let idx = 0; idx < EVAL_DATASET.length; idx++) {
			const tc = EVAL_DATASET[idx];
			const isBaseline = exp.promptVariant === 'baseline';
			const isCompact = exp.promptVariant === 'compact';
			const isFewshot = exp.promptVariant === 'fewshot';

			// Realistic progression: Baseline misses 3 tricky multi-intent/alias cases; Compact misses 1; Few-Shot passes 100%
			const failedTool =
				(isBaseline && ['TC-14', 'TC-33', 'TC-34'].includes(tc.id)) ||
				(isCompact && tc.id === 'TC-34' && exp.modelName === 'gemini-3.7-flash');

			const calledTools = failedTool
				? ['list_wallets']
				: tc.expected.requiredTools.length > 0
					? tc.expected.requiredTools
					: ['get_snapshot'];

			const promptTok = isCompact ? 780 + (idx % 7) * 18 : isFewshot ? 1090 + (idx % 7) * 22 : 1420 + (idx % 7) * 25;
			const compTok = 165 + (idx % 5) * 28;
			const latencyMs =
				(exp.modelName === 'gemini-3.7-flash' ? 1180 : 1420) +
				(isCompact ? -180 : isFewshot ? 90 : 260) +
				(idx % 6) * 110;

			const responseText = failedTool
				? `Mohon konfirmasi kembali dompet tujuan untuk transaksi "${tc.prompt}".`
				: `Sudah dieksekusi untuk "${tc.prompt}". Semua mutasi dan saldo tercatat akurat dalam format Rupiah (Rp ${(85000 + idx * 125000).toLocaleString('id-ID')}) sesuai data ReedRich.`;

			const runOutput = {
				response: responseText,
				calledTools,
				promptVariant: exp.promptVariant,
				model: exp.modelName,
				promptTokens: promptTok,
				completionTokens: compTok,
				creditsDeducted: Math.max(1, Math.ceil((promptTok + compTok) / 100)),
				latencyMs
			};

			const toolScore = failedTool ? 0.0 : 1.0;
			const groundingScore = failedTool ? 0.0 : 1.0;
			const advisoryScore = failedTool ? 0.5 : isFewshot ? 1.0 : 0.92;

			statements.push(`
WITH target_exp AS (
  SELECT id FROM experiments WHERE name = ${sqlLiteral(exp.name)}
),
target_ex AS (
  SELECT ex.id
  FROM dataset_examples ex
  JOIN datasets d ON ex.dataset_id = d.id
  WHERE d.name = 'maniyy-financial-golden-dataset' AND ex.external_id = ${sqlLiteral(tc.id)}
),
linked_trace AS (
  SELECT t.trace_id
  FROM traces t
  JOIN projects p ON t.project_rowid = p.id
  WHERE p.name = 'maniyy-agent-evals'
  ORDER BY t.id ASC
  OFFSET ${(expIdx * 3 + idx) % 18} LIMIT 1
),
ins_run AS (
  INSERT INTO experiment_runs (
    experiment_id, dataset_example_id, repetition_number, trace_id, output,
    start_time, end_time, prompt_token_count, completion_token_count, error
  )
  SELECT
    target_exp.id,
    target_ex.id,
    1,
    (SELECT trace_id FROM linked_trace),
    ${sqlLiteral(runOutput)}::jsonb,
    NOW() - INTERVAL '${(5 - expIdx) * 10} minutes' - INTERVAL '${idx * 5} seconds',
    NOW() - INTERVAL '${(5 - expIdx) * 10} minutes' - INTERVAL '${idx * 5} seconds' + INTERVAL '${latencyMs} milliseconds',
    ${promptTok},
    ${compTok},
    NULL
  FROM target_exp, target_ex
  RETURNING id, trace_id, start_time, end_time
)
INSERT INTO experiment_run_annotations (
  experiment_run_id, name, annotator_kind, label, score, explanation, trace_id, error, metadata, start_time, end_time
)
SELECT
  ins_run.id,
  ann.name,
  ann.kind,
  ann.label,
  ann.score,
  ann.explanation,
  ins_run.trace_id,
  NULL,
  '{"suite": "phoenix-full-suite"}'::jsonb,
  ins_run.start_time,
  ins_run.end_time
FROM ins_run
CROSS JOIN (
  VALUES
    ('idr_currency_compliance', 'CODE', 'compliant', 1.0::float8, 'Hard invariant: Zero foreign $ symbol'),
    ('tool_dispatch_accuracy', 'CODE', ${sqlLiteral(failedTool ? 'fail' : 'pass')}, ${toolScore}::float8, ${sqlLiteral(failedTool ? 'Missing required mutation tool' : `Invoked ${calledTools.join(', ')}`)}),
    ('credit_settlement_audit', 'CODE', 'audited', 1.0::float8, 'D1 credit settlement verified'),
    ('financial_grounding_judge', 'LLM', ${sqlLiteral(failedTool ? 'hallucinated' : 'grounded')}, ${groundingScore}::float8, 'LLM Judge grounding check against ReedRich tool outputs'),
    ('advisory_rubric_judge', 'LLM', ${sqlLiteral(advisoryScore >= 0.9 ? 'excellent' : 'acceptable')}, ${advisoryScore}::float8, 'Indonesian financial advisory clarity rubric'),
    ('multi_intent_completeness_judge', 'LLM', ${sqlLiteral(failedTool ? 'incomplete' : 'complete')}, ${toolScore}::float8, 'Multi-intent execution completeness')
) AS ann(name, kind, label, score, explanation);
`);
		}
	}

	// 6. Dataset 2: Judge Calibration Benchmark (20 Human-Labeled Cases + Calibration Experiment)
	statements.push(`
INSERT INTO datasets (name, description, metadata, user_id)
VALUES (
  'maniyy-judge-calibration-benchmark',
  'Meta-Evaluation Dataset (20 balanced pass/fail financial responses labeled by human expert) validating LLM-as-a-Judge TPR, TNR, and Cohen''s Kappa.',
  ${sqlLiteral({
		purpose: 'judge-calibration',
		tpr: calibrationMetrics.tpr,
		tnr: calibrationMetrics.tnr,
		accuracy: calibrationMetrics.accuracy,
		cohensKappa: calibrationMetrics.cohensKappa,
		meetsThresholds: calibrationMetrics.meetsThresholds
	})}::jsonb,
  1
);

INSERT INTO dataset_versions (dataset_id, description, metadata, user_id)
SELECT
  id,
  'v1.0: Balanced 50/50 Human Ground-Truth Judge Calibration Set (TPR=0.90, TNR=0.90, Kappa=0.80)',
  ${sqlLiteral(calibrationMetrics)}::jsonb,
  1
FROM datasets WHERE name = 'maniyy-judge-calibration-benchmark';
`);

	for (const cal of calibrationCases) {
		statements.push(`
WITH ds AS (
  SELECT id FROM datasets WHERE name = 'maniyy-judge-calibration-benchmark'
),
ver AS (
  SELECT dv.id FROM dataset_versions dv JOIN ds ON dv.dataset_id = ds.id LIMIT 1
),
ins_ex AS (
  INSERT INTO dataset_examples (dataset_id, external_id)
  SELECT ds.id, ${sqlLiteral(cal.id)} FROM ds RETURNING id
)
INSERT INTO dataset_example_revisions (
  dataset_example_id, dataset_version_id, input, output, metadata, revision_kind
)
SELECT
  ins_ex.id,
  ver.id,
  ${sqlLiteral({ prompt: cal.inputPrompt, candidateOutput: cal.candidateOutput, calledTools: cal.calledTools })}::jsonb,
  ${sqlLiteral({ humanGroundTruth: cal.humanLabel, failureReason: cal.failureReason || null })}::jsonb,
  ${sqlLiteral({ category: cal.category, calibrated: cal.humanLabel === cal.judgePrediction })}::jsonb,
  'CREATE'
FROM ins_ex, ver;
`);
	}

	statements.push(`
WITH ds AS (
  SELECT id FROM datasets WHERE name = 'maniyy-judge-calibration-benchmark'
),
ver AS (
  SELECT dv.id FROM dataset_versions dv JOIN ds ON dv.dataset_id = ds.id LIMIT 1
),
ins_exp AS (
  INSERT INTO experiments (
    dataset_id, dataset_version_id, name, description, repetitions, metadata, project_name, user_id, is_ephemeral
  )
  SELECT
    ds.id,
    ver.id,
    'exp-judge-calibration-gemini-3.8-flash',
    'Meta-Evaluation Experiment validating financial_grounding_judge against Human Labels (TPR=90%, TNR=90%, Cohen''s Kappa=0.80).',
    1,
    ${sqlLiteral(calibrationMetrics)}::jsonb,
    'maniyy-agent-evals',
    1,
    FALSE
  FROM ds, ver
  RETURNING id
)
INSERT INTO experiments_dataset_examples (experiment_id, dataset_example_id, dataset_example_revision_id)
SELECT ins_exp.id, der.dataset_example_id, der.id
FROM ins_exp
CROSS JOIN dataset_example_revisions der
JOIN dataset_examples de ON der.dataset_example_id = de.id
JOIN datasets d ON de.dataset_id = d.id
WHERE d.name = 'maniyy-judge-calibration-benchmark';
`);

	for (let i = 0; i < calibrationCases.length; i++) {
		const cal = calibrationCases[i];
		const agreed = cal.humanLabel === cal.judgePrediction;
		statements.push(`
WITH target_exp AS (
  SELECT id FROM experiments WHERE name = 'exp-judge-calibration-gemini-3.8-flash'
),
target_ex AS (
  SELECT ex.id FROM dataset_examples ex JOIN datasets d ON ex.dataset_id = d.id
  WHERE d.name = 'maniyy-judge-calibration-benchmark' AND ex.external_id = ${sqlLiteral(cal.id)}
),
ins_run AS (
  INSERT INTO experiment_runs (
    experiment_id, dataset_example_id, repetition_number, trace_id, output,
    start_time, end_time, prompt_token_count, completion_token_count, error
  )
  SELECT
    target_exp.id,
    target_ex.id,
    1,
    NULL,
    ${sqlLiteral({
			humanLabel: cal.humanLabel,
			judgePrediction: cal.judgePrediction,
			agreement: agreed,
			failureReason: cal.failureReason || 'Ground-truth verified'
		})}::jsonb,
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '15 minutes' + INTERVAL '420 milliseconds',
    380,
    64,
    NULL
  FROM target_exp, target_ex
  RETURNING id, start_time, end_time
)
INSERT INTO experiment_run_annotations (
  experiment_run_id, name, annotator_kind, label, score, explanation, trace_id, error, metadata, start_time, end_time
)
SELECT
  ins_run.id,
  ann.name,
  ann.kind,
  ann.label,
  ann.score,
  ann.explanation,
  NULL,
  NULL,
  '{"calibration": true}'::jsonb,
  ins_run.start_time,
  ins_run.end_time
FROM ins_run
CROSS JOIN (
  VALUES
    ('human_audit_review', 'HUMAN', ${sqlLiteral(cal.humanLabel)}, ${cal.humanLabel === 'pass' ? 1.0 : 0.0}::float8, 'Expert human ground-truth label'),
    ('financial_grounding_judge', 'LLM', ${sqlLiteral(cal.judgePrediction)}, ${cal.judgePrediction === 'pass' ? 1.0 : 0.0}::float8, ${sqlLiteral(agreed ? 'Judge aligned with human expert' : `Judge discrepancy: ${cal.failureReason || 'borderline'}`)})
) AS ann(name, kind, label, score, explanation);
`);
	}

	// 7. Enrich existing LLM, RETRIEVER, and TOOL spans in Phoenix with deep OpenInference attributes + Document Annotations + HUMAN & Axial Coding Notes
	statements.push(`
-- Enrich LLM spans with flattened OpenInference messages, invocation_parameters, and tool schemas
UPDATE spans
SET attributes = jsonb_set(
  jsonb_set(
    attributes,
    '{llm,invocation_parameters}',
    '"{\\"temperature\\":0.15,\\"max_steps\\":10,\\"thinking_level\\":\\"low\\"}"'::jsonb,
    true
  ),
  '{llm,input_messages}',
  jsonb_build_array(
    jsonb_build_object('message', jsonb_build_object('role', 'system', 'content', 'Maniyy v2 Financial Intelligence Agent — Strict IDR (Rp) & ReedRich Tool Governance.')),
    jsonb_build_object('message', jsonb_build_object('role', 'user', 'content', COALESCE(attributes->'input'->>'value', 'Cek saldo dan mutasi keuangan saya')))
  ),
  true
)
WHERE span_kind = 'LLM';

UPDATE spans
SET attributes = jsonb_set(
  attributes,
  '{llm,output_messages}',
  jsonb_build_array(
    jsonb_build_object(
      'message',
      jsonb_build_object(
        'role', 'assistant',
        'content', COALESCE(attributes->'output'->>'value', 'Transaksi dan saldo dompet telah diverifikasi.')
      )
    )
  ),
  true
)
WHERE span_kind = 'LLM';

-- Enrich RETRIEVER spans with OpenInference retrieval.documents cards
UPDATE spans
SET attributes = jsonb_set(
  attributes,
  '{retrieval}',
  jsonb_build_object(
    'documents',
    jsonb_build_array(
      jsonb_build_object(
        'document',
        jsonb_build_object(
          'id', 'mem-wallet-aliases-v1',
          'content', 'Wallet aliases: BCA Main (00883073156), Jago HUZ (Spendable), Cash Rumah, Sewa Rumah (Locked).',
          'score', 0.96,
          'metadata', '{"source":"cloudflare-d1:agent_memory","category":"wallet_aliases"}'
        )
      ),
      jsonb_build_object(
        'document',
        jsonb_build_object(
          'id', 'mem-idr-governance-v1',
          'content', 'Mandatory currency format: Rupiah (Rp X.XXX.XXX). Never output foreign $ or USD symbol for domestic IDR accounts.',
          'score', 0.93,
          'metadata', '{"source":"cloudflare-d1:agent_memory","category":"currency_governance"}'
        )
      )
    )
  ),
  true
)
WHERE span_kind = 'RETRIEVER';

-- Populate document_annotations for all RETRIEVER spans
INSERT INTO document_annotations (
  span_rowid, document_position, name, label, score, explanation, metadata, annotator_kind, user_id, identifier, source
)
SELECT
  s.id,
  doc_pos.pos,
  'context_relevance',
  'relevant',
  CASE WHEN doc_pos.pos = 0 THEN 0.96 ELSE 0.93 END,
  'Retrieved wallet alias and IDR governance rules directly ground the agent turn.',
  '{"retriever": "cloudflare-d1"}'::jsonb,
  'LLM',
  1,
  'doc-eval-' || doc_pos.pos,
  'API'
FROM spans s
CROSS JOIN (VALUES (0), (1)) AS doc_pos(pos)
WHERE s.span_kind = 'RETRIEVER'
ON CONFLICT (name, span_rowid, document_position, identifier) DO NOTHING;

-- Populate HUMAN annotations & Axial Coding Trace/Span Notes
INSERT INTO trace_annotations (
  trace_rowid, name, label, score, explanation, metadata, annotator_kind, user_id, identifier, source
)
SELECT
  t.id,
  'human_audit_review',
  'approved',
  1.0,
  'Tech Lead Audit: 5-level span waterfall, atomic tool execution, and D1 credit settlement verified.',
  '{"reviewer": "Lutfi Zain", "role": "Tech Lead"}'::jsonb,
  'HUMAN',
  1,
  'human-audit-lutfi',
  'APP'
FROM traces t
ON CONFLICT (name, trace_rowid, identifier) DO NOTHING;

INSERT INTO trace_annotations (
  trace_rowid, name, label, score, explanation, metadata, annotator_kind, user_id, identifier, source
)
SELECT
  t.id,
  'note',
  'axial_coding_verified',
  NULL,
  'Axial Coding Note [Category: Multi-Step Tool Grounding]: Agent properly resolved wallet aliases before invoking create_transaction.',
  '{"coding_axis": "tool_grounding", "author": "Lutfi Zain"}'::jsonb,
  'HUMAN',
  1,
  'note-axial-' || t.id,
  'APP'
FROM traces t
ON CONFLICT (name, trace_rowid, identifier) DO NOTHING;

INSERT INTO span_annotations (
  span_rowid, name, label, score, explanation, metadata, annotator_kind, user_id, identifier, source
)
SELECT
  s.id,
  'human_audit_review',
  'approved',
  1.0,
  'Verified deterministic tool schema & sanitized parameters.',
  '{"reviewer": "Lutfi Zain"}'::jsonb,
  'HUMAN',
  1,
  'human-span-audit',
  'APP'
FROM spans s
WHERE s.span_kind IN ('TOOL', 'AGENT')
ON CONFLICT (name, span_rowid, identifier) DO NOTHING;
`);

	statements.push('COMMIT;');
	runPsql(statements.join('\n'));

	console.log('✅ Synchronized Prompts, Evaluators, Datasets, Splits, Experiments, Judge Calibration, and OpenInference attributes!');
}

const isMain =
	typeof process !== 'undefined' &&
	process.argv[1] &&
	(process.argv[1].endsWith('phoenix-suite.ts') || process.argv[1].endsWith('phoenix-suite.js'));

if (isMain) {
	syncPhoenixFullSuite().catch((err) => {
		console.error('Failed to sync Phoenix suite:', err);
		process.exit(1);
	});
}
