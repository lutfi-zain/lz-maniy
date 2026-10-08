import { describe, expect, it } from 'vitest';
import {
	buildOpenInferenceLlmAttributes,
	buildOpenInferenceRetrieverAttributes,
	buildOpenInferenceToolAttributes,
	sanitizeTracePayload
} from '../../observability/tracer.js';
import {
	buildDatasetSplits,
	buildEvaluatorRegistry,
	buildExperimentSpecs,
	buildJudgeCalibrationDataset,
	buildPromptRepositories,
	computeJudgeCalibrationMetrics,
	evaluateAcceptanceCriteria,
	resolveSplitsForTestCase
} from '../../../eval/phoenix-suite.js';
import { EVAL_DATASET } from '../../../eval/dataset.js';

describe('Phoenix LLMOps Suite & OpenInference Enhancements', () => {
	describe('1. PII & Credential Redaction Guard (sanitizeTracePayload)', () => {
		it('redacts Bearer tokens, API keys, 16-digit NIK, and bank card numbers', () => {
			const raw =
				'Auth: Bearer eyJhbGciOiJIUzI1NiJ9.secret key=rd_live_987654321abcd NIK=3201234567890001 Card=4111-2222-3333-4444';
			const sanitized = sanitizeTracePayload(raw);

			expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
			expect(sanitized).toContain('[REDACTED_API_KEY]');
			expect(sanitized).toContain('[REDACTED_NIK]');
			expect(sanitized).toContain('[REDACTED_ACCOUNT]');
			expect(sanitized).not.toContain('rd_live_987654321abcd');
			expect(sanitized).not.toContain('3201234567890001');
		});

		it('honors hideInputs and hideOutputs flags', () => {
			expect(sanitizeTracePayload('Saldo saya Rp 10.000.000', { hideInputs: true })).toBe(
				'[REDACTED]'
			);
			expect(
				sanitizeTracePayload('Saldo Anda Rp 10.000.000', { isOutput: true, hideOutputs: true })
			).toBe('[REDACTED]');
		});
	});

	describe('2. Deep OpenInference Flattened Span Attribute Builders', () => {
		it('builds flattened LLM attributes for Chat Message Bubbles and Tool Schemas', () => {
			const attrs = buildOpenInferenceLlmAttributes({
				modelName: 'google-antigravity/gemini-3.8-flash',
				provider: 'google',
				invocationParameters: { temperature: 0.1, max_steps: 10 },
				inputMessages: [
					{ role: 'system', content: 'System instruction' },
					{ role: 'user', content: 'Makan 85k dari huz' }
				],
				outputContent: 'Transaksi Rp 85.000 dicatat.',
				toolCalls: [{ name: 'create_transaction', arguments: { amount: 85000, wallet: 'HUZ' } }],
				tools: [{ name: 'create_transaction', description: 'Record atomic transaction' }],
				promptTokens: 820,
				completionTokens: 140
			});

			expect(attrs['openinference.span.kind']).toBe('LLM');
			expect(attrs['llm.model_name']).toBe('gemini-3.8-flash');
			expect(attrs['llm.input_messages.0.message.role']).toBe('system');
			expect(attrs['llm.input_messages.1.message.content']).toBe('Makan 85k dari huz');
			expect(attrs['llm.output_messages.0.message.content']).toBe('Transaksi Rp 85.000 dicatat.');
			expect(attrs['llm.output_messages.0.message.tool_calls.0.tool_call.function.name']).toBe(
				'create_transaction'
			);
			expect(String(attrs['llm.tools.0.tool.json_schema'])).toContain('create_transaction');
			expect(attrs['llm.token_count.total']).toBe(960);
		});

		it('builds flattened RETRIEVER document attributes for Phoenix Document Cards', () => {
			const attrs = buildOpenInferenceRetrieverAttributes({
				query: 'Saldo HUZ berapa?',
				documents: [
					{
						id: 'doc-1',
						content: 'Jago HUZ alias wallet_huz_01',
						score: 0.96,
						metadata: { source: 'agent_memory' }
					}
				]
			});

			expect(attrs['openinference.span.kind']).toBe('RETRIEVER');
			expect(attrs['retrieval.documents.0.document.id']).toBe('doc-1');
			expect(attrs['retrieval.documents.0.document.score']).toBe(0.96);
			expect(String(attrs['retrieval.documents.0.document.metadata'])).toContain('agent_memory');
		});

		it('builds structured TOOL attributes with JSON schema and MIME types', () => {
			const attrs = buildOpenInferenceToolAttributes({
				name: 'create_transaction',
				description: 'Catat mutasi baru',
				parametersSchema: { type: 'object', required: ['amount'] },
				args: { amount: 63000, description: 'Bensin motor' }
			});

			expect(attrs['openinference.span.kind']).toBe('TOOL');
			expect(attrs['tool.name']).toBe('create_transaction');
			expect(attrs['input.mime_type']).toBe('application/json');
			expect(attrs['output.mime_type']).toBe('application/json');
			expect(String(attrs['tool.parameters'])).toContain('amount');
		});
	});

	describe('3. Prompts Hub, Evaluators, Datasets, and Experiments Builders', () => {
		it('builds 4 Prompt Repositories with 3 sequential versions on maniyy-agent-system', () => {
			const repos = buildPromptRepositories();
			expect(repos).toHaveLength(4);
			const mainRepo = repos.find((r) => r.name === 'maniyy-agent-system');
			expect(mainRepo).toBeDefined();
			expect(mainRepo?.versions).toHaveLength(3);
			expect(mainRepo?.versions.map((v) => v.versionTag)).toEqual([
				'baseline',
				'staging',
				'production'
			]);
		});

		it('builds 3 LLM Evaluators and 3 deterministic Python Code Evaluators', () => {
			const { llmEvaluators, codeEvaluators } = buildEvaluatorRegistry();
			expect(llmEvaluators).toHaveLength(3);
			expect(codeEvaluators).toHaveLength(3);
			expect(codeEvaluators.every((c) => c.sourceCode.includes('def evaluate'))).toBe(true);
		});

		it('builds 10 Dataset Splits including high_risk_mutation and production_regression', () => {
			const splits = buildDatasetSplits();
			expect(splits).toHaveLength(10);
			const names = splits.map((s) => s.name);
			expect(names).toContain('high_risk_mutation');
			expect(names).toContain('production_regression');

			const compoundCase = EVAL_DATASET.find((tc) => tc.id === 'TC-33')!;
			const assigned = resolveSplitsForTestCase(compoundCase);
			expect(assigned).toContain('transaction_record');
			expect(assigned).toContain('high_risk_mutation');
			expect(assigned).toContain('production_regression');
		});

		it('builds 5 side-by-side Experiment specifications across Prompt Variants and Gemini Models', () => {
			const experiments = buildExperimentSpecs();
			expect(experiments).toHaveLength(5);
			expect(experiments[4].name).toBe('exp-05-fewshot-v3-gemini-3.8-flash');
		});
	});

	describe('4. Two-Tier Gate (Invariants vs. Signals) & Judge Calibration', () => {
		it('fails the suite immediately if a single Hard Invariant fails even when Quality Signals pass', () => {
			const runs = [
				{
					exampleId: 'TC-01',
					annotations: {
						idr_currency_compliance: { score: 1.0 },
						tool_dispatch_accuracy: { score: 1.0 },
						financial_grounding_judge: { score: 1.0 },
						advisory_rubric_judge: { score: 0.95 },
						latency_ms: { score: 1200 }
					}
				},
				{
					exampleId: 'TC-02',
					annotations: {
						idr_currency_compliance: { score: 0.0 }, // 1 hard invariant violation
						tool_dispatch_accuracy: { score: 1.0 },
						financial_grounding_judge: { score: 1.0 },
						advisory_rubric_judge: { score: 0.95 },
						latency_ms: { score: 1300 }
					}
				}
			];

			const summary = evaluateAcceptanceCriteria(runs);
			expect(summary.invariantsPassed).toBe(false);
			expect(summary.signalsPassed).toBe(true);
			expect(summary.passed).toBe(false);
		});

		it('passes the suite when Hard Invariants are 100% and aggregate Quality Signals meet thresholds', () => {
			const runs = Array.from({ length: 15 }, (_, idx) => ({
				exampleId: `TC-${idx + 1}`,
				annotations: {
					idr_currency_compliance: { score: 1.0 },
					tool_dispatch_accuracy: { score: 1.0 },
					financial_grounding_judge: { score: idx === 0 ? 0.0 : 1.0 }, // 14/15 = 93.3% >= 92%
					advisory_rubric_judge: { score: 0.92 },
					latency_ms: { score: 1450 }
				}
			}));

			const summary = evaluateAcceptanceCriteria(runs);
			expect(summary.invariantsPassed).toBe(true);
			expect(summary.signalsPassed).toBe(true);
			expect(summary.passed).toBe(true);
		});

		it('computes Judge Calibration TPR >= 0.85, TNR >= 0.85, and Cohens Kappa >= 0.80', () => {
			const cases = buildJudgeCalibrationDataset();
			expect(cases).toHaveLength(20);
			const metrics = computeJudgeCalibrationMetrics(cases);
			expect(metrics.tpr).toBeGreaterThanOrEqual(0.85);
			expect(metrics.tnr).toBeGreaterThanOrEqual(0.85);
			expect(metrics.cohensKappa).toBeGreaterThanOrEqual(0.8);
			expect(metrics.meetsThresholds).toBe(true);
		});
	});
});
