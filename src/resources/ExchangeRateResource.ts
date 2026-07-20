import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Toggle,
	TableBuilder,
	TextColumn,
	ToggleColumn,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { ExchangeRate } from '../entities/ExchangeRate';
import { exchangeRateHooks } from '../hooks/exchangeRateHooks';

// Starting set (per the current business requirement). Adding a 6th currency
// later is a one-line change here — no schema migration needed.
const CURRENCY_OPTIONS = {
	GNF: 'GNF — Franc Guinéen',
	USD: 'USD — Dollar Américain',
	EUR: 'EUR — Euro',
	XOF: 'XOF — Franc CFA (BCEAO)',
	CAD: 'CAD — Dollar Canadien',
};

export class ExchangeRateResource extends BaseResource {
	static slug = 'exchange-rates';

	static entity = ExchangeRate;

	static label = 'Taux de Change';
	static pluralLabel = 'Taux de Change';
	static icon = 'ArrowRightLeft';
	static navigationGroup = 'Système';
	static navigationSort = 2;

	static canDelete = true;

	static recordTitleAttribute = 'label';
	static globallySearchableAttributes = ['code', 'label'];

	static form() {
		return FormBuilder.make().schema([
			SelectInput.make('code')
				.label('Devise')
				.options(CURRENCY_OPTIONS)
				.required()
				.disabled((c: FormContext) => c?.operation === 'edit'),
			TextInput.make('label').label('Libellé').required().max(60),
			TextInput.make('rateToGNF')
				.label('Taux (1 unité = X GNF)')
				.helperText('GNF est la devise pivot : son taux reste fixé à 1.')
				.type('number')
				.required()
				.minValue(0.0001)
				.step(0.0001)
				.disabled((c: FormContext) => c?.get('code') === 'GNF'),
			Toggle.make('active').label('Actif').default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('code').label('Code').sortable().searchable(),
				TextColumn.make('label').label('Libellé').sortable().searchable(),
				TextColumn.make('rateToGNF').label('Taux vers GNF').sortable(),
				ToggleColumn.make('active').label('Actif').sortable(),
				TextColumn.make('updatedAt').label('Mis à jour').sortable().dateTime(),
			])
			.searchable()
			.defaultSort('code', 'asc');
	}

	static hooks() {
		return exchangeRateHooks;
	}
}
