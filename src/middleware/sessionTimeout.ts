import jwt from 'jsonwebtoken';
import type { KratosMiddleware, Panel } from '@maxal_studio/kratosjs';
import { Setting } from '../entities/Setting';

const ACCESS_TOKEN_COOKIE = 'kratosjs_access_token';
const ACTIVITY_COOKIE = 'recibir_last_activity';
const DEFAULT_TIMEOUT_MINUTES = 30;
// Deliberately much longer than any realistic session-timeout setting: the
// server-side comparison against Setting.sessionTimeoutMinutes is what
// actually decides expiry. If this cookie's own maxAge instead matched
// timeoutMs, the browser would silently drop it right as the idle window
// closed, so the very request meant to trigger the timeout would arrive
// with no activity cookie at all — read as "first activity ever" below and
// just reset the clock, so the session would never really expire.
const ACTIVITY_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

/**
 * Idle-session timeout, independent of the JWT's own (fixed, boot-time)
 * expiry. The admin-configurable duration (Settings → Sécurité) is enforced
 * here via a sliding-window activity cookie rather than by trying to change
 * accessTokenExpiry at runtime, which the auth config doesn't support.
 *
 * Registered as panel-level middleware, so it runs before the framework's
 * own per-route auth check — it independently decodes the access-token
 * cookie (same secret) purely to read `id`/confirm validity; it never
 * trusts anything from the client beyond that cookie.
 */
export function sessionTimeoutMiddleware(panel: Panel, jwtSecret: string): KratosMiddleware {
	// kratosjs-react's AuthContext proactively calls this endpoint on a timer
	// (~1min before the access token's 15min expiry, so roughly every 14min)
	// to keep the tab's JWT alive — completely independent of whether the
	// person at the keyboard has done anything. Letting that silent call
	// slide the activity window forward defeated the whole feature: an
	// abandoned tab would refresh itself forever and never time out. It still
	// passes through the timeout *check* below (so a session idle past the
	// configured duration is still correctly rejected here and logged out
	// client-side), it just never *extends* the window on success.
	const passiveRefreshPath = `${panel.getBasePath()}/auth/refresh`;

	return async (req, reply, next) => {
		if (!req.path.startsWith(panel.getBasePath())) {
			return next();
		}

		const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
		if (!token) {
			return next();
		}

		try {
			jwt.verify(token, jwtSecret);
		} catch {
			// Invalid/expired JWT — let the framework's own auth middleware 401 it.
			return next();
		}

		const now = Date.now();
		const lastActivityRaw = req.cookies?.[ACTIVITY_COOKIE];
		const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : now;

		const em = panel.getEm().fork();
		const setting = await em.findOne(Setting, { id: 1 });
		const timeoutMs = (setting?.sessionTimeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES) * 60_000;

		if (lastActivityRaw && now - lastActivity > timeoutMs) {
			reply.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
			reply.clearCookie('kratosjs_refresh_token', { path: `${panel.getBasePath()}/auth/refresh` });
			reply.clearCookie(ACTIVITY_COOKIE, { path: '/' });
			reply.status(401).json({ error: "Session expirée par inactivité." });
			return;
		}

		if (req.path !== passiveRefreshPath) {
			reply.cookie(ACTIVITY_COOKIE, String(now), {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
				maxAge: ACTIVITY_COOKIE_MAX_AGE_MS,
			});
		}
		return next();
	};
}
