import {
	BaseResource,
	FormBuilder,
	TextInput,
	Textarea,
	HiddenInput,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	StatsWidget,
	t,
	type Widget,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { ClientPayment } from '../entities/ClientPayment';
import { clientPaymentHooks } from '../hooks/clientPaymentHooks';
import { clientPaymentRowActions, clientPaymentActionHandlers } from '../actions/clientPaymentActions';
import { isAdminLike } from '../utils/roles';

// Locale-dependent, so this must stay a function called fresh per request —
// a module-level const would be frozen at import time.
function statusLabels(): Record<string, string> {
	return {
		pending: t('app:clientPayments.status.pending'),
		validated: t('app:clientPayments.status.validated'),
		refused: t('app:clientPayments.status.refused'),
		cancelled: t('app:clientPayments.status.cancelled'),
	};
}

const STATUS_COLOR_BY_VALUE: Record<string, string> = {
	pending: 'warning',
	validated: 'success',
	refused: 'danger',
	cancelled: 'secondary',
};

// The `status` BadgeColumn's own formatStateUsing overwrites `row.status` in
// the served payload with the translated label (not the raw enum) — the
// client-side badge-color lookup matches against that same overwritten
// value, so the color map has to be keyed by the translated label too, not
// the raw 'pending'/'validated'/etc. Both this and statusLabels() resolve
// t() at the same request, so the keys always agree.
function statusColors(): Record<string, string> {
	const labels = statusLabels();
	const result: Record<string, string> = {};
	for (const [value, color] of Object.entries(STATUS_COLOR_BY_VALUE)) {
		result[labels[value]] = color;
	}
	return result;
}

function personName(value: any): string {
	if (!value) return '—';
	return `${value.firstname ?? ''} ${value.lastname ?? ''}`.trim() || value.email || '—';
}

export class ClientPaymentResource extends BaseResource {
	static slug = 'client-payments';

	static entity = ClientPayment;

	static getLabel() {
		return t('app:clientPayments.label');
	}
	static getPluralLabel() {
		return t('app:clientPayments.pluralLabel');
	}
	static icon = 'HandCoins';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
	static navigationSort = 3;

	static canDelete = false;

	static recordTitleAttribute = 'code';
	static globallySearchableAttributes = ['clientName', 'code', 'senderName'];

	static form() {
		// Only ever editable while pending (enforced server-side in
		// clientPaymentHooks) — locked visually the same way once past that,
		// mirroring the pattern UserResource/WithdrawalCycleResource use.
		const isAdmin = isAdminLike(this.getContext()?.user?.role);
		const lockedOnEdit = (c: FormContext) => c?.operation === 'edit' && !isAdmin;

		return FormBuilder.make().schema([
			TextInput.make('senderName').label(t('app:clientPayments.fields.senderName')).required().min(2).max(120).disabled(lockedOnEdit),
			TextInput.make('clientName').label(t('app:clientPayments.fields.clientName')).required().min(2).max(120).disabled(lockedOnEdit),
			TextInput.make('recipientPhone').label(t('app:clientPayments.fields.recipientPhone')).disabled(lockedOnEdit),
			TextInput.make('amountAED').label(t('app:common.amountAED')).type('number').required().minValue(1).disabled(lockedOnEdit),
			Textarea.make('note').label(t('app:common.note')).rows(3).disabled(lockedOnEdit),
			// System-generated in clientPaymentHooks (env-0001, ...) — never
			// user-entered. Declared hidden only so the schema whitelist
			// doesn't drop the hook-set value (same reason as `agent` below).
			HiddenInput.make('code'),
			HiddenInput.make('agent'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('code').label(t('app:clientPayments.columns.code')).sortable().searchable(),
				TextColumn.make('senderName')
					.label(t('app:clientPayments.columns.sender'))
					.formatStateUsing((v: string) => v || '—')
					.sortable()
					.searchable(),
				TextColumn.make('clientName').label(t('app:clientPayments.fields.clientName')).sortable().searchable(),
				TextColumn.make('recipientPhone')
					.label(t('app:clientPayments.columns.recipientPhone'))
					.formatStateUsing((v: string) => v || '—'),
				TextColumn.make('amountAED').label(t('app:common.amountAED')).money('AED').sortable(),
				BadgeColumn.make('status')
					.label(t('app:clientPayments.columns.status'))
					.formatStateUsing((v: string) => statusLabels()[v] ?? v)
					.colors(statusColors())
					.sortable(),
				TextColumn.make('agent').label(t('app:common.agent')).formatStateUsing((v: any) => personName(v)),
				TextColumn.make('createdAt').label(t('app:common.createdAt')).sortable().dateTime(),
			])
			.populate([{ path: 'agent' }])
			.actions(clientPaymentRowActions())
			.exportable()
			.searchable()
			.paginate(20)
			.defaultSort('createdAt', 'desc');
	}

	static hooks() {
		return clientPaymentHooks;
	}

	static actions() {
		return clientPaymentActionHandlers(this);
	}

	static widgets(): Widget[] {
		return [
			// Only what's actually been paid out (validated) — a pending
			// request hasn't touched the treasury yet, and refused/cancelled
			// never will. Matches ShiftResource's treasury widgets, which
			// apply the same status: 'validated' filter.
			StatsWidget.make('clientPayments.total')
				.label(t('app:clientPayments.widgets.total'))
				.icon('HandCoins')
				.currency('AED')
				.format('currency')
				.render(async em => {
					const rows = await em.find(ClientPayment, { status: 'validated' } as any);
					return rows.reduce((sum: number, p: any) => sum + p.amountAED, 0);
				}),
		];
	}
}
