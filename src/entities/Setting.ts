import { EntitySchema } from '@mikro-orm/core';

export interface ISetting {
	id: number;
	sessionTimeoutMinutes: number;
	updatedAt: Date;
}

/**
 * Single-row configuration table (id 1, seeded by seedSettings.ts). Read by
 * the session-timeout middleware.
 */
export const Setting = new EntitySchema<ISetting>({
	name: 'Setting',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		sessionTimeoutMinutes: { type: 'number', default: 30 },
		updatedAt: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() },
	} as any,
});
