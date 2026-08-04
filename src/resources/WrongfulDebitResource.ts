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
	type Widget,
} from '@maxal_studio/kratosjs';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { wrongfulDebitHooks } from '../hooks/wrongfulDebitHooks';
import { wrongfulDebitRowActions, wrongfulDebitActionHandlers } from '../actions/wrongfulDebitActions';

const STATUS_LABELS: Record<string, string> = {
	reported: 'Signalé',
	refund_requested: 'Demande envoyée',
	refunded: 'Remboursé',
};

function personName(value: any): string {
	if (!value) return '—';
	return `${value.firstname ?? ''} ${value.lastname ?? ''}`.trim() || value.email || '—';
}

export class WrongfulDebitResource extends BaseResource {
	static slug = 'wrongful-debits';

	static entity = WrongfulDebit;

	static label = 'Débit à Tort';
	static pluralLabel = 'Débits à Tort';
	static icon = 'TriangleAlert';
	static navigationGroup = 'Opérations';
	static navigationSort = 5;

	static canDelete = false;

	static globallySearchableAttributes = [];

	static form() {
		return FormBuilder.make().schema([
			SelectInput.make('shift')
				.label('Shift')
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
			SelectInput.make('card').label('Carte').relationship('card', 'identifier', 'cards').required().searchable(),
			TextInput.make('amountAED').label('Montant débité à tort (AED)').type('number').required().minValue(0.01),
			DateTimePicker.make('date').label('Date').required().default(() => new Date().toISOString()),
			Textarea.make('note').label('Détails').placeholder('Circonstances, ticket ATM, etc.').rows(3),
			// Set from the shift's own agent in beforeCreate — declared here only
			// so the schema whitelist doesn't drop it.
			HiddenInput.make('agent'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('shiftGroup')
					.label('Groupe')
					.formatStateUsing((_: any, row: any) => row.shift?.cycle?.group?.name ?? '—'),
				TextColumn.make('shiftCycle')
					.label('Cycle')
					.formatStateUsing((_: any, row: any) => (row.shift?.cycle ? `#${row.shift.cycle.id}` : '—')),
				BadgeColumn.make('shiftRef')
					.label('Shift')
					.formatStateUsing((_: any, row: any) => (row.shift ? `Shift ${row.shift.shiftNumber}` : '—')),
				TextColumn.make('card').label('Carte').formatStateUsing((v: any) => v?.identifier ?? '—'),
				TextColumn.make('agent').label('Agent').formatStateUsing((v: any) => personName(v)),
				TextColumn.make('amountAED').label('Montant').money('AED').sortable(),
				BadgeColumn.make('status')
					.label('Statut')
					.formatStateUsing((v: string) => STATUS_LABELS[v] ?? v)
					.sortable(),
				TextColumn.make('date').label('Date').sortable().date(),
				TextColumn.make('note').label('Note').limit(60),
			])
			.populate([
				{ path: 'shift', populate: { path: 'cycle', populate: { path: 'group' } } },
				{ path: 'card' },
				{ path: 'agent' },
			])
			.filters([DateFilter.make('date').label('Mois / période')])
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
				.label('Débits à Tort (en attente)')
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
