import { EntitySchema } from '@mikro-orm/core';

// admin: full access, incl. managing Collaborateurs (the only thing superviseur lacks).
// superviseur (Conakry): seconds the admin — same access everywhere except user mgmt.
// chef_equipe (Dubaï): team lead — sees the whole Dubai team's shifts/debits/treasury
// (not just their own, like a plain agent) and is the only non-admin role allowed to
// pay clients. agent (Dubaï): scoped to their own shifts/debits/treasury.
export type UserRole = 'admin' | 'superviseur' | 'chef_equipe' | 'agent';

export interface IUser {
	id: number;
	firstname: string;
	lastname?: string;
	email: string;
	password?: string;
	phone?: string;
	role: UserRole;
	profileMediaImage?: { key: string; bucket: string; url?: string } | null;
	active: boolean;
	createdAt: Date;
}

/**
 * User entity (SQLite).
 * `role` drives the Admin/Agent split throughout the panel (see src/index.ts
 * metadata/data/action filter hooks).
 */
export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		firstname: { type: 'string' },
		lastname: { type: 'string', nullable: true },
		email: { type: 'string', unique: true },
		password: { type: 'string', hidden: true },
		phone: { type: 'string', nullable: true },
		role: { type: 'string', default: 'agent' },
		profileMediaImage: { type: 'json', nullable: true },
		active: { type: 'boolean', default: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
