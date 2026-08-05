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
	password?: string | null;
	phone?: string;
	role: UserRole;
	profileMediaImage?: { key: string; bucket: string; url?: string } | null;
	active: boolean;
	// Self-service first-login / SuperAdmin-forced-reset flow (see
	// src/actions/userActions.ts + src/routes/passwordSetup.ts): SuperAdmin
	// never sets a collaborator's password directly. Generating a setup link
	// clears `password` and stamps a fresh token+expiry here; visiting that
	// link and choosing a password clears them again. A user with no
	// password AND no live token simply can't log in — there's no path that
	// leaves an account silently unreachable.
	passwordSetupToken?: string | null;
	passwordSetupExpiresAt?: Date | null;
	createdAt: Date;
}

/**
 * User entity (SQLite).
 * `role` drives the four-way access split throughout the panel (see
 * src/index.ts metadata/data/action filter hooks and src/utils/roles.ts).
 */
export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		firstname: { type: 'string' },
		lastname: { type: 'string', nullable: true },
		email: { type: 'string', unique: true },
		password: { type: 'string', hidden: true, nullable: true },
		phone: { type: 'string', nullable: true },
		role: { type: 'string', default: 'agent' },
		profileMediaImage: { type: 'json', nullable: true },
		active: { type: 'boolean', default: true },
		passwordSetupToken: { type: 'string', hidden: true, nullable: true },
		passwordSetupExpiresAt: { type: 'Date', hidden: true, nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
