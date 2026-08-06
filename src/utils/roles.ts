// Centralizes the role checks scattered across hooks/resources/index.ts so the
// four-role split (see User.ts) stays consistent everywhere it's enforced.

/** Full admin-equivalent access everywhere except managing Collaborateurs (users). */
export function isAdminLike(role?: string): boolean {
	return role === 'admin' || role === 'superviseur';
}

/** Dubai team lead — sees/manages the whole Dubai team's data and is the only
 * non-admin role allowed to validate/refuse a client payment initiated by
 * AdminGN (see clientPaymentActions.ts) — they don't initiate payments
 * themselves. */
export function isTeamLead(role?: string): boolean {
	return role === 'chef_equipe';
}

/** True for every role except a plain agent — whoever should see Dubai-team-wide
 * shifts/wrongful debits/treasury instead of just their own. */
export function seesTeamWideData(role?: string): boolean {
	return isAdminLike(role) || isTeamLead(role);
}
