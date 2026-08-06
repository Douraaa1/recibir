import { Action, getRequestContext, t, type Panel } from '@maxal_studio/kratosjs';
import { getPublicUrl } from '../utils/publicUrl';
import { isAdminLike } from '../utils/roles';

type ActionHandler = (data: { records?: any[]; formData?: any }) => Promise<{
	success: boolean;
	message?: string;
	data?: any;
	redirect?: string;
	refreshBadges?: boolean;
}>;

interface ClientPaymentResourceLike {
	getPanel(): Panel;
	entity: any;
}

export function clientPaymentRowActions(): Action[] {
	return [
		Action.make('validatePayment')
			.label(t('app:clientPayments.actions.validatePayment.label'))
			.icon('CheckCircle2')
			.color('success')
			.requiresConfirmation()
			.modalHeading(t('app:clientPayments.actions.validatePayment.modalHeading'))
			.modalDescription(t('app:clientPayments.actions.validatePayment.modalDescription')),
		Action.make('refusePayment')
			.label(t('app:clientPayments.actions.refusePayment.label'))
			.icon('XCircle')
			.color('danger')
			.requiresConfirmation()
			.modalHeading(t('app:clientPayments.actions.refusePayment.modalHeading')),
		Action.make('cancelPayment')
			.label(t('app:clientPayments.actions.cancelPayment.label'))
			.icon('Ban')
			.color('danger')
			.requiresConfirmation()
			.modalHeading(t('app:clientPayments.actions.cancelPayment.modalHeading'))
			.modalDescription(t('app:clientPayments.actions.cancelPayment.modalDescription')),
		Action.make('downloadReceipt')
			.label(t('app:clientPayments.actions.downloadReceipt.label'))
			.icon('FileText'),
	];
}

export function clientPaymentActionHandlers(resource: ClientPaymentResourceLike): Record<string, ActionHandler> {
	return {
		validatePayment: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:clientPayments.errors.notFound') };
			if (record.status !== 'pending') {
				return { success: false, message: t('app:clientPayments.errors.notPending') };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'validated', validatedAt: new Date() } as any);
			return { success: true, message: t('app:clientPayments.actions.validatePayment.successMessage'), refreshBadges: true };
		},
		refusePayment: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:clientPayments.errors.notFound') };
			if (record.status !== 'pending') {
				return { success: false, message: t('app:clientPayments.errors.notPending') };
			}
			await em.nativeUpdate(resource.entity, { id }, { status: 'refused', refusedAt: new Date() } as any);
			return { success: true, message: t('app:clientPayments.actions.refusePayment.successMessage'), refreshBadges: true };
		},
		// A cancelled payment is simply excluded from the treasury sum going
		// forward (see ShiftResource's treasury widgets, which only count
		// status: 'validated') — no separate reversal entry needed, the
		// exclusion is the reversal.
		cancelPayment: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const record: any = await em.findOne(resource.entity, { id });
			if (!record) return { success: false, message: t('app:clientPayments.errors.notFound') };

			// No user in the handler's args (the framework only passes
			// {records, formData} — see CrudController.handleAction); the
			// per-record status tiering below needs the caller's role, which
			// getRequestContext() carries (same async-context mechanism used
			// throughout this codebase for role checks in hooks).
			const role = getRequestContext()?.user?.role;
			if (record.status === 'pending') {
				if (!isAdminLike(role)) {
					return { success: false, message: t('app:clientPayments.errors.cancelPendingAdminLikeOnly') };
				}
			} else if (record.status === 'validated') {
				if (role !== 'admin') {
					return { success: false, message: t('app:clientPayments.errors.cancelValidatedAdminOnly') };
				}
			} else {
				return { success: false, message: t('app:clientPayments.errors.updateTerminal') };
			}

			await em.nativeUpdate(resource.entity, { id }, { status: 'cancelled', cancelledAt: new Date() } as any);
			return { success: true, message: t('app:clientPayments.actions.cancelPayment.successMessage'), refreshBadges: true };
		},
		// Handled as a redirect (not a direct download) because the browser
		// needs a real navigation to the PDF route to trigger the
		// Content-Disposition: attachment download — an absolute URL here
		// gets a window.location.href nav from the client (see
		// redirectHandler.ts), a relative one would be misrouted through
		// React Router instead and 404.
		downloadReceipt: async ({ records = [] }) => {
			const id = records[0]?.id;
			if (!id) return { success: false, message: t('app:clientPayments.errors.notFound') };
			const basePath = resource.getPanel().getBasePath();
			return { success: true, redirect: `${getPublicUrl()}${basePath}/client-payments/${id}/receipt.pdf` };
		},
	};
}
