import { Type, type FunctionDeclaration, type Schema } from '@google/genai';
import { z } from 'zod';

export function zodToGeminiSchema(zodType: z.ZodTypeAny): Schema {
	let current: z.ZodTypeAny = zodType;
	let description: string | undefined = current.description;

	while (
		current instanceof z.ZodOptional ||
		current instanceof z.ZodNullable ||
		current instanceof z.ZodDefault
	) {
		if (!description && current.description) {
			description = current.description;
		}
		if (current instanceof z.ZodOptional) current = current.unwrap();
		else if (current instanceof z.ZodNullable) current = current.unwrap();
		else if (current instanceof z.ZodDefault) current = current.removeDefault();
	}

	if (!description && current.description) {
		description = current.description;
	}

	const typeDef = current._def as { typeName?: string; values?: string[]; options?: z.ZodTypeAny[] };
	const typeName = typeDef?.typeName;

	switch (typeName) {
		case 'ZodString':
			return { type: Type.STRING, ...(description ? { description } : {}) };
		case 'ZodNumber':
			return { type: Type.NUMBER, ...(description ? { description } : {}) };
		case 'ZodBoolean':
			return { type: Type.BOOLEAN, ...(description ? { description } : {}) };
		case 'ZodEnum': {
			return {
				type: Type.STRING,
				enum: typeDef.values,
				...(description ? { description } : {})
			};
		}
		case 'ZodArray': {
			const arrDef = current as z.ZodArray<z.ZodTypeAny>;
			return {
				type: Type.ARRAY,
				items: zodToGeminiSchema(arrDef.element),
				...(description ? { description } : {})
			};
		}
		case 'ZodObject': {
			const objDef = current as z.ZodObject<z.ZodRawShape>;
			const shape = objDef.shape;
			const properties: Record<string, Schema> = {};
			const required: string[] = [];

			for (const [key, propType] of Object.entries(shape)) {
				const typedProp = propType as z.ZodTypeAny;
				properties[key] = zodToGeminiSchema(typedProp);
				const isOptional =
					typedProp instanceof z.ZodOptional ||
					typedProp instanceof z.ZodDefault ||
					(typeof (typedProp as { isOptional?: () => boolean }).isOptional === 'function' &&
						(typedProp as { isOptional: () => boolean }).isOptional());
				if (!isOptional) {
					required.push(key);
				}
			}

			return {
				type: Type.OBJECT,
				properties,
				...(required.length > 0 ? { required } : {}),
				...(description ? { description } : {})
			};
		}
		case 'ZodUnion': {
			const options = typeDef.options || [];
			const first = options[0];
			if (first) {
				return { ...zodToGeminiSchema(first), ...(description ? { description } : {}) };
			}
			return { type: Type.STRING, ...(description ? { description } : {}) };
		}
		default:
			return { type: Type.STRING, ...(description ? { description } : {}) };
	}
}

export interface ToolDefinitionLike {
	description?: string;
	parameters?: z.ZodTypeAny;
	execute?: unknown;
}

export function buildGeminiDeclarations(
	tools: Record<string, ToolDefinitionLike>
): FunctionDeclaration[] {
	const declarations: FunctionDeclaration[] = [];

	for (const [name, toolDef] of Object.entries(tools)) {
		const description = toolDef.description || `Tool ${name}`;
		let parameters: Schema | undefined;

		if (toolDef.parameters && toolDef.parameters instanceof z.ZodType) {
			parameters = zodToGeminiSchema(toolDef.parameters);
		} else {
			parameters = {
				type: Type.OBJECT,
				properties: {}
			};
		}

		declarations.push({
			name,
			description,
			parameters
		});
	}

	return declarations;
}
