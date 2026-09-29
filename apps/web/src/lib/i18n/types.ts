export type Locale = 'en' | 'id';

export type TranslationValue = string;

export interface TranslationDictionary {
	[key: string]: TranslationValue | TranslationDictionary;
}

/**
 * Recursive type that infers all dot-notated paths to leaf string values in a dictionary.
 */
export type NestedKeyOf<ObjectType extends object> = {
	[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
		? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
		: `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationParams = Record<string, string | number>;
