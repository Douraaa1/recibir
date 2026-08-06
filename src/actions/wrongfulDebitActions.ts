import { Action, t, type Panel } from '@maxal_studio/kratosjs';

type ActionHandler = (data: { records?: any[]; formData?: any }) => Promise<{
	success: boolean;
	message?: string;
	data?: any;
	redirect?: string;
	refreshBadges?: boolean;
}>;

interface WrongfulDebitResourceLike {
	getPanel(): Panel;
	entity: any;
}

export function wrongfulDebitRowActions(): Action[] {
	return [
		Action.make('requestRefund')
			.label(t('app:wrongfulDebits.actions.requestRefund.label'))
			.icon('Send')
			.color('warning')
			.requiresConfirmation()
			.modalHeading(t('app:wrongfulDebits.actions.requestRefund.modalHeading')),
		Action.make('markRefunded')
			.label(t('app:wrongfulDebits.actions.markRefunded.label'))
			.icon('CheckCircle2')
			.color('success')
			.requiresConfirmation()
			.modalHeading(t('app:wrongfulDebits.actions.markRefunded.modalHeading'))
			.modalDescription(t('app:wrongfulDebits.actions.markRefunded.modalDescription')),
		Action.make('markRefused')
			.label(t('app:wrongfulDebits.actions.markRefused.label'))
			.icon('XCircle')
			.color('danger')
			.requiresConfirmation()
			.modalHeading(t('app:wrongfulDebits.actions.markRefused.modalHeading'))
			.modalDescription(t('app:wrongfulDebits.actions.markRefused.modalDescription')),
	];
}

export function wrongfulDebitActionHandlers(resource: WrongfulDebitResourceLike): Record<string, ActionHandler> {
	return {
		requestRefund: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:wrongfulDebits.errors.notFound') };
			if (record.status !== 'reported') {
				return { success: false, message: t('app:wrongfulDebits.errors.refundAlreadyRequested') };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'refund_requested', refundRequestedAt: new Date() } as any);
			return { success: true, message: t('app:wrongfulDebits.actions.requestRefund.successMessage'), refreshBadges: true };
		},
		markRefunded: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:wrongfulDebits.errors.notFound') };
			if (record.status === 'refunded' || record.status === 'refused') {
				return { success: false, message: t('app:wrongfulDebits.errors.alreadyResolved') };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'refunded', refundedAt: new Date() } as any);
			return { success: true, message: t('app:wrongfulDebits.actions.markRefunded.successMessage'), refreshBadges: true };
		},
		markRefused: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:wrongfulDebits.errors.notFound') };
			if (record.status === 'refunded' || record.status === 'refused') {
				return { success: false, message: t('app:wrongfulDebits.errors.alreadyResolved') };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'refused', refusedAt: new Date() } as any);
			return { success: true, message: t('app:wrongfulDebits.actions.markRefused.successMessage'), refreshBadges: true };
		},
	};
}
