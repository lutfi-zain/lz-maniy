import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Type } from '@google/genai';
import { buildGeminiDeclarations, zodToGeminiSchema } from '../gemini-declarations.js';

describe('Gemini Declarations Generator', () => {
	it('converts basic zod types accurately', () => {
		const schema = z.object({
			name: z.string().describe('Name'),
			amount: z.number(),
			active: z.boolean().default(true),
			tag: z.enum(['a', 'b']).optional()
		});

		const geminiSchema = zodToGeminiSchema(schema);
		expect(geminiSchema.type).toBe(Type.OBJECT);
		expect(geminiSchema.properties?.name?.type).toBe(Type.STRING);
		expect(geminiSchema.properties?.amount?.type).toBe(Type.NUMBER);
		expect(geminiSchema.properties?.active?.type).toBe(Type.BOOLEAN);
		expect(geminiSchema.properties?.tag?.type).toBe(Type.STRING);
		expect(geminiSchema.required).toEqual(['name', 'amount']);
	});

	it('builds function declarations for tool map', () => {
		const mockTools = {
			test_tool: {
				description: 'A test tool description',
				parameters: z.object({
					id: z.string().describe('The ID')
				}),
				execute: async () => 'done'
			}
		};

		const declarations = buildGeminiDeclarations(mockTools);
		expect(declarations.length).toBe(1);
		expect(declarations[0].name).toBe('test_tool');
		expect(declarations[0].description).toBe('A test tool description');
		expect(declarations[0].parameters?.properties?.id?.type).toBe(Type.STRING);
	});
});
