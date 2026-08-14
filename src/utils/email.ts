import { Resend } from 'resend';

// No RESEND_API_KEY is set anywhere yet — this degrades to a console warning
// instead of crashing so the rest of the app (and any deploy) keeps working
// before/without email configured. The from-address is services@enviar.cash
// by default (RESEND_FROM_EMAIL overrides it) — enviar.cash must be verified
// as a sending domain in the Resend dashboard, or sends will fail/bounce.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'RECIBIR <services@enviar.cash>';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Best-effort transactional email — never throws. A failed/unconfigured send
 * only logs; it must never break the business operation (e.g. creating a
 * payment) that triggered the notification.
 */
export async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
	const recipients = Array.isArray(to) ? to : [to];
	if (recipients.length === 0) return;

	if (!resend) {
		console.warn(`[email] RESEND_API_KEY non configurée — email "${subject}" non envoyé (destinataires : ${recipients.join(', ')}).`);
		return;
	}

	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: recipients, subject, html });
		if (error) {
			console.error(`[email] Échec de l'envoi ("${subject}") :`, error);
		}
	} catch (error) {
		console.error(`[email] Échec de l'envoi ("${subject}") :`, error);
	}
}
