/**
 * MikroORM enforces the declared column type on assignment for some types
 * (throws on `number` given a string) but not others — SQLite is loosely
 * typed, so a `float` column silently *stores* a string like "500" instead
 * of coercing it. Number-typed form inputs submit strings over JSON, so
 * every numeric field needs this run explicitly in a beforeCreate/beforeUpdate
 * hook; there's no framework-level auto-coercion to rely on.
 */
export function coerceNumericFields(data: Record<string, any>, fields: string[]): void {
	for (const field of fields) {
		if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
			data[field] = Number(data[field]);
		}
	}
}
