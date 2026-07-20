import jwt from 'jsonwebtoken';
import type { KratosMiddleware, Panel } from '@maxal_studio/kratosjs';
import { Setting } from '../entities/Setting';

const ACCESS_TOKEN_COOKIE = 'kratosjs_access_token';
const ACTIVITY_COOKIE = 'recibir_last_activity';
const DEFAULT_TIMEOUT_MINUTES = 30;

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

		reply.cookie(ACTIVITY_COOKIE, String(now), {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: timeoutMs,
		});
		return next();
	};
}
