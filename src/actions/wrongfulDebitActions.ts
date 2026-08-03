import { Action, type Panel } from '@maxal_studio/kratosjs';

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
			.label('Demande envoyée à la banque')
			.icon('Send')
			.color('warning')
			.requiresConfirmation()
			.modalHeading('Marquer la demande de remboursement comme envoyée ?'),
		Action.make('markRefunded')
			.label('Marquer comme remboursé')
			.icon('CheckCircle2')
			.color('success')
			.requiresConfirmation()
			.modalHeading('Confirmer le remboursement ?')
			.modalDescription('Ce montant ne comptera plus contre la trésorerie disponible.'),
	];
}

export function wrongfulDebitActionHandlers(resource: WrongfulDebitResourceLike): Record<string, ActionHandler> {
	return {
		requestRefund: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: 'Débit à tort introuvable.' };
			if (record.status !== 'reported') {
				return { success: false, message: 'Une demande de remboursement a déjà été envoyée pour ce débit.' };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'refund_requested', refundRequestedAt: new Date() } as any);
			return { success: true, message: 'Demande de remboursement enregistrée.', refreshBadges: true };
		},
		markRefunded: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: 'Débit à tort introuvable.' };
			if (record.status === 'refunded') {
				return { success: false, message: 'Ce débit est déjà marqué comme remboursé.' };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'refunded', refundedAt: new Date() } as any);
			return { success: true, message: 'Remboursement confirmé.', refreshBadges: true };
		},
	};
}
