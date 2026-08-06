import crypto from 'crypto';
import { Action, t, type Panel } from '@maxal_studio/kratosjs';

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
			.label(t('app:users.actions.generatePasswordLink.label'))
			.icon('KeyRound')
			.requiresConfirmation()
			.modalHeading(t('app:users.actions.generatePasswordLink.modalHeading'))
			.modalDescription(t('app:users.actions.generatePasswordLink.modalDescription')),
	];
}

export function userActionHandlers(resource: UserResourceLike): Record<string, ActionHandler> {
	return {
		generatePasswordLink: async ({ records = [] }) => {
			const id = records[0]?.id;
			if (!id) return { success: false, message: t('app:users.errors.noneSelected') };

			const em = resource.getPanel().getEm().fork();
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:users.errors.notFound') };

			const token = crypto.randomBytes(32).toString('hex');
			const expiresAt = new Date(Date.now() + SETUP_LINK_VALID_HOURS * 60 * 60 * 1000);
			await em.nativeUpdate(
				resource.entity,
				{ id },
				{ password: null, passwordSetupToken: token, passwordSetupExpiresAt: expiresAt } as any,
			);

			return {
				success: true,
				message: t('app:users.actions.generatePasswordLink.successMessage', {
					hours: SETUP_LINK_VALID_HOURS,
					firstname: record.firstname,
				}),
				refreshBadges: false,
			};
		},
	};
}
