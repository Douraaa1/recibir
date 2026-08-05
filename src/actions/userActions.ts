import crypto from 'crypto';
import { Action, type Panel } from '@maxal_studio/kratosjs';
import { getPublicUrl } from '../utils/publicUrl';

type ActionHandler = (data: { records?: any[]; formData?: any }) => Promise<{
	success: boolean;
	message?: string;
	data?: any;
	redirect?: string;
	refreshBadges?: boolean;
}>;

interface UserResourceLike {
	getPanel(): Panel;
	entity: any;
}

const SETUP_LINK_VALID_HOURS = 48;

export function userRowActions(): Action[] {
	return [
		Action.make('generatePasswordLink')
			.label('Lien de configuration du mot de passe')
			.icon('KeyRound')
			.requiresConfirmation()
			.modalHeading('Générer un lien de configuration du mot de passe ?')
			.modalDescription(
				"Le mot de passe actuel (s'il existe) sera immédiatement invalidé. Le collaborateur ne pourra plus se connecter tant qu'il n'aura pas suivi ce lien pour en choisir un nouveau — à toi de le lui partager (WhatsApp, SMS, en personne).",
			),
	];
}

export function userActionHandlers(resource: UserResourceLike): Record<string, ActionHandler> {
	return {
		generatePasswordLink: async ({ records = [] }) => {
			const id = records[0]?.id;
			if (!id) return { success: false, message: 'Aucun collaborateur sélectionné.' };

			const em = resource.getPanel().getEm().fork();
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: 'Collaborateur introuvable.' };

			const token = crypto.randomBytes(32).toString('hex');
			const expiresAt = new Date(Date.now() + SETUP_LINK_VALID_HOURS * 60 * 60 * 1000);
			await em.nativeUpdate(
				resource.entity,
				{ id },
				{ password: null, passwordSetupToken: token, passwordSetupExpiresAt: expiresAt } as any,
			);

			const link = `${getPublicUrl()}/set-password?token=${token}`;
			return {
				success: true,
				message: `Lien généré (valable ${SETUP_LINK_VALID_HOURS}h) — à partager toi-même avec ${record.firstname} : ${link}`,
				refreshBadges: false,
			};
		},
	};
}
