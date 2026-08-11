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
	t,
} from '@maxal_studio/kratosjs';
import { TreasuryDeposit } from '../entities/TreasuryDeposit';
import { treasuryDepositHooks } from '../hooks/treasuryDepositHooks';
import { formatCurrency } from '../utils/formatMoney';

// Locale-dependent, so this must stay a function called fresh per request —
// a module-level const would be frozen at import time.
function channelLabels(): Record<string, string> {
	return {
		bank_transfer: t('app:treasuryDeposits.channel.bankTransfer'),
		other: t('app:treasuryDeposits.channel.other'),
	};
}

const CHANNEL_COLOR_BY_VALUE: Record<string, string> = {
	bank_transfer: 'success',
	other: 'gray',
};

// The `channel` BadgeColumn's own formatStateUsing overwrites row.channel in
// the served payload with the translated label (not the raw enum) — the
// client-side badge-color lookup matches against that same overwritten
// value, so the color map has to be keyed by the translated label too (see
// the identical pattern in ClientPaymentResource/WrongfulDebitResource).
function channelColors(): Record<string, string> {
	const labels = channelLabels();
	const result: Record<string, string> = {};
	for (const [value, color] of Object.entries(CHANNEL_COLOR_BY_VALUE)) {
		result[labels[value]] = color;
	}
	return result;
}

function personName(value: any): string {
	if (!value) return '—';
	return `${value.firstname ?? ''} ${value.lastname ?? ''}`.trim() || value.email || '—';
}

export class TreasuryDepositResource extends BaseResource {
	static slug = 'treasury-deposits';

	static entity = TreasuryDeposit;

	static getLabel() {
		return t('app:treasuryDeposits.label');
	}
	static getPluralLabel() {
		return t('app:treasuryDeposits.pluralLabel');
	}
	static icon = 'Landmark';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
	static navigationSort = 6;

	// A financial ledger entry — editable (to fix a typo/amount) but never
	// deleted, same as Shift/ClientPayment/WrongfulDebit.
	static canDelete = false;

	static recordTitleAttribute = (record: any) => `#${record.id}`;
	static globallySearchableAttributes = ['reference', 'note'];

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('amountAED').label(t('app:common.amountAED')).type('number').required().minValue(0.01),
			SelectInput.make('channel')
				.label(t('app:treasuryDeposits.fields.channel'))
				.options(channelLabels())
				.default('bank_transfer')
				.required(),
			TextInput.make('reference').label(t('app:treasuryDeposits.fields.reference')).max(120),
			Textarea.make('note').label(t('app:common.note')).rows(3),
			DateTimePicker.make('date').label(t('app:treasuryDeposits.fields.date')).required().default(() => new Date().toISOString()),
			// Set from the authenticated user in treasuryDepositHooks — declared
			// hidden only so the schema whitelist doesn't drop the hook-set value.
			HiddenInput.make('createdBy'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('date').label(t('app:treasuryDeposits.fields.date')).sortable().date(),
				TextColumn.make('amountAED')
					.label(t('app:common.amountAED'))
					.formatStateUsing((v: number) => formatCurrency(v, 'AED'))
					.sortable(),
				BadgeColumn.make('channel')
					.label(t('app:treasuryDeposits.fields.channel'))
					.formatStateUsing((v: string) => channelLabels()[v] ?? v)
					.colors(channelColors())
					.sortable(),
				TextColumn.make('reference')
					.label(t('app:treasuryDeposits.fields.reference'))
					.formatStateUsing((v: string) => v || '—'),
				TextColumn.make('note').label(t('app:common.note')).limit(60),
				TextColumn.make('createdBy').label(t('app:treasuryDeposits.fields.createdBy')).formatStateUsing((v: any) => personName(v)),
				TextColumn.make('createdAt').label(t('app:common.createdAt')).sortable().dateTime(),
			])
			.populate([{ path: 'createdBy' }])
			.filters([DateFilter.make('date').label(t('app:shifts.filters.period'))])
			.exportable()
			.paginate(20)
			.defaultSort('date', 'desc');
	}

	static hooks() {
		return treasuryDepositHooks;
	}
}
