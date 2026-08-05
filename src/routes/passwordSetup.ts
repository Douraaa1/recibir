import { csrfProtection, hashPassword, type Panel } from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

// Public (unauthenticated) first-login / SuperAdmin-forced-reset flow. A
// collaborator never gets a password from SuperAdmin — only a one-time link
// generated via src/actions/userActions.ts, which they follow here to choose
// their own. See User.ts for why `password`/`passwordSetupToken` being
// mutually exclusive means there's no state that leaves an account silently
// unreachable.
export function registerPasswordSetupRoutes(panel: Panel): void {
	panel.route('get', '/set-password', async (req, reply) => {
		const token = typeof req.query.token === 'string' ? req.query.token : '';
		const em = panel.getEm().fork();
		const user = token ? await em.findOne(User, { passwordSetupToken: token } as any) : null;
		const valid = !!user && !!user.passwordSetupExpiresAt && user.passwordSetupExpiresAt.getTime() > Date.now();

		await reply.view('SetPassword', {
			title: 'Configurer le mot de passe — RECIBIR',
			token,
			valid,
			firstname: valid ? user!.firstname : undefined,
		});
	});

	// csrfProtection(panel) checks the Views client's CSRF header on this
	// mutating route — useForm()/router.post() attach it automatically.
	panel.route('post', '/set-password', csrfProtection(panel), async (req, reply) => {
		const token = typeof req.body?.token === 'string' ? req.body.token : '';
		const password = typeof req.body?.password === 'string' ? req.body.password : '';

		const em = panel.getEm().fork();
		const user = token ? await em.findOne(User, { passwordSetupToken: token } as any) : null;
		const valid = !!user && !!user.passwordSetupExpiresAt && user.passwordSetupExpiresAt.getTime() > Date.now();

		if (!valid) {
			reply.status(422).json({ errors: { password: 'Ce lien est invalide ou a expiré. Demande à SuperAdmin de t’en générer un nouveau.' } });
			return;
		}
		if (password.length < 8) {
			reply.status(422).json({ errors: { password: 'Le mot de passe doit contenir au moins 8 caractères.' } });
			return;
		}

		user!.password = await hashPassword(password);
		user!.passwordSetupToken = null;
		user!.passwordSetupExpiresAt = null;
		await em.flush();

		await reply.view('SetPassword', { title: 'Configurer le mot de passe — RECIBIR', token, valid: true, done: true });
	});
}
