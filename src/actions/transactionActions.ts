import { Action, FormBuilder, Textarea, getRequestContext, type Panel } from '@maxal_studio/kratosjs';
import type { TransactionStatus } from '../entities/Transaction';

type ActionHandler = (data: { records?: any[]; formData?: any }) => Promise<{
	success: boolean;
	message?: string;
	data?: any;
	redirect?: string;
	refreshBadges?: boolean;
}>;

interface TransactionResourceLike {
	getPanel(): Panel;
	entity: any;
}

const OPEN_STATUSES: TransactionStatus[] = ['pending', 'blocked'];

export function transactionRowActions(): Action[] {
	return [
		Action.make('validate')
			.label('Valider le Décaissement')
			.icon('CheckCircle2')
			.color('success')
			.requiresConfirmation()
			.modalHeading('Valider ce transfert ?')
			.modalDescription('Le décaissement sera marqué comme complété. Cette action est irréversible.'),
		Action.make('cancel')
			.label('Annuler la Transaction')
			.icon('XCircle')
			.color('danger')
			.form(
				FormBuilder.make().schema([
					Textarea.make('cancelReason').label('Motif d’annulation').required().rows(3),
				]),
			),
	];
}

export function transactionActionHandlers(resource: TransactionResourceLike): Record<string, ActionHandler> {
	return {
		validate: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: 'Transfert introuvable.' };
			if (!OPEN_STATUSES.includes(record.status)) {
				return { success: false, message: 'Ce transfert a déjà été traité.' };
			}
			const adminId = getRequestContext()?.user?.id;
			await em.nativeUpdate(
				resource.entity,
				{ id },
				{ status: 'completed', validatedBy: adminId, validatedAt: new Date() } as any,
			);
			return { success: true, message: 'Transfert validé.', refreshBadges: true };
		},
		cancel: async ({ records = [], formData = {} }) => {
			const reason = String(formData.cancelReason ?? '').trim();
			if (!reason) return { success: false, message: 'Le motif d’annulation est requis.' };

			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: 'Transfert introuvable.' };
			if (!OPEN_STATUSES.includes(record.status)) {
				return { success: false, message: 'Ce transfert a déjà été traité.' };
			}
			const adminId = getRequestContext()?.user?.id;
			await em.nativeUpdate(
				resource.entity,
				{ id },
				{ status: 'cancelled', cancelReason: reason, validatedBy: adminId, validatedAt: new Date() } as any,
			);
			return { success: true, message: 'Transfert annulé.', refreshBadges: true };
		},
	};
}