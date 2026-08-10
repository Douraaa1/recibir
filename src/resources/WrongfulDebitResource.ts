import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Textarea,
	DateTimePicker,
	HiddenInput,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	DateFilter,
	StatsWidget,
	t,
	type Widget,
} from '@maxal_studio/kratosjs';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { wrongfulDebitHooks } from '../hooks/wrongfulDebitHooks';
import { wrongfulDebitRowActions, wrongfulDebitActionHandlers } from '../actions/wrongfulDebitActions';

// Locale-dependent, so this must stay a function called fresh per request —
// a module-level const would be frozen at import time (see appFr.ts/appEn.ts
// for the underlying strings).
function statusLabels(): Record<string, string> {
	return {
		reported: t('app:wrongfulDebits.status.reported'),
		refund_requested: t('app:wrongfulDebits.status.refundRequested'),
		refunded: t('app:wrongfulDebits.status.refunded'),
		refused: t('app:wrongfulDebits.status.refused'),
	};
}

const STATUS_COLOR_BY_VALUE: Record<string, string> = {
	reported: 'gray',
	refund_requested: 'warning',
	refunded: 'success',
	refused: 'danger',
};

// The `status` BadgeColumn's own formatStateUsing overwrites `row.status` in
// the served payload with the translated label (not the raw enum) — the
// client-side badge-color lookup matches against that same overwritten
// value, so the color map has to be keyed by the translated label too, not
// the raw 'reported'/'refunded'/etc. Both this and statusLabels() resolve
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

export class WrongfulDebitResource extends BaseResource {
	static slug = 'wrongful-debits';

	static entity = WrongfulDebit;

	static getLabel() {
		return t('app:wrongfulDebits.label');
	}
	static getPluralLabel() {
		return t('app:wrongfulDebits.pluralLabel');
	}
	static icon = 'TriangleAlert';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
	static navigationSort = 5;

	static canDelete = false;

	static globallySearchableAttributes = [];

	static form() {
		return FormBuilder.make().schema([
			SelectInput.make('shift')
				.label(t('app:wrongfulDebits.fields.shift'))
				.relationship('shift', 'shiftNumber', 'shifts')
				.required()
				// Plain shiftNumber alone renders as an indistinguishable "Shift
				// 1"/"Shift 2" repeated for every cycle — pull in the group/cycle/
				// date so each option is actually identifiable.
				.formatOptionLabelUsing((_value: any, record: any) => {
					const groupName = record?.cycle?.group?.name;
					const cycleId = record?.cycle?.id ?? record?.cycle;
					const dateStr = record?.date ? new Date(record.date).toLocaleDateString('fr-FR') : null;
					// record.shiftNumber arrives already formatted as "Shift 1"/"Shift
					// 2" (the options fetch reuses the table's own BadgeColumn
					// formatting) — don't re-prefix it with "Shift" again here.
					const parts = [groupName ?? (cycleId ? `Cycle #${cycleId}` : null), record?.shiftNumber, dateStr];
					return parts.filter(Boolean).join(' — ');
				}),
			SelectInput.make('card').label(t('app:wrongfulDebits.fields.card')).relationship('card', 'identifier', 'cards').required().searchable(),
			TextInput.make('amountAED').label(t('app:wrongfulDebits.fields.amountAED')).type('number').required().minValue(0.01),
			DateTimePicker.make('date').label(t('app:common.date')).required().default(() => new Date().toISOString()),
			Textarea.make('note')
				.label(t('app:wrongfulDebits.fields.details'))
				.placeholder(t('app:wrongfulDebits.form.note.placeholder'))
				.rows(3),
			// Set from the shift's own agent in beforeCreate — declared here only
			// so the schema whitelist doesn't drop it.
			HiddenInput.make('agent'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('shiftGroup')
					.label(t('app:common.group'))
					.formatStateUsing((_: any, row: any) => row.shift?.cycle?.group?.name ?? '—'),
				TextColumn.make('shiftCycle')
					.label(t('app:shifts.columns.cycle'))
					.formatStateUsing((_: any, row: any) => (row.shift?.cycle ? `#${row.shift.cycle.id}` : '—')),
				BadgeColumn.make('shiftRef')
					.label(t('app:shifts.columns.shift'))
					.formatStateUsing((_: any, row: any) => (row.shift ? t('app:shifts.shiftBadge', { n: row.shift.shiftNumber }) : '—')),
				TextColumn.make('card').label(t('app:wrongfulDebits.columns.card')).formatStateUsing((v: any) => v?.identifier ?? '—'),
				TextColumn.make('agent').label(t('app:common.agent')).formatStateUsing((v: any) => personName(v)),
				TextColumn.make('amountAED').label(t('app:wrongfulDebits.columns.amount')).money('AED').sortable(),
				BadgeColumn.make('status')
					.label(t('app:wrongfulDebits.columns.status'))
					.formatStateUsing((v: string) => statusLabels()[v] ?? v)
					.colors(statusColors())
					.sortable(),
				TextColumn.make('date').label(t('app:common.date')).sortable().date(),
				TextColumn.make('note').label(t('app:common.note')).limit(60),
			])
			.populate([
				{ path: 'shift', populate: { path: 'cycle', populate: { path: 'group' } } },
				{ path: 'card' },
				{ path: 'agent' },
			])
			.filters([DateFilter.make('date').label(t('app:shifts.filters.period'))])
			.actions(wrongfulDebitRowActions())
			.exportable()
			.paginate(20)
			.defaultSort('date', 'desc');
	}

	static hooks() {
		return wrongfulDebitHooks;
	}

	static actions() {
		return wrongfulDebitActionHandlers(this);
	}

	static widgets(): Widget[] {
		return [
			// Outstanding only — once refunded, the money's back, so it no
			// longer counts against the "problem size" the admin needs to chase.
			StatsWidget.make('wrongfulDebits.total')
				.label(t('app:wrongfulDebits.widgets.total'))
				.icon('TriangleAlert')
				.currency('AED')
				.format('currency')
				.render(async (em, entity) => {
					const rows = await em.find(entity, { status: { $ne: 'refunded' } } as any);
					return rows.reduce((sum: number, d: any) => sum + d.amountAED, 0);
				}),
		];
	}
}
