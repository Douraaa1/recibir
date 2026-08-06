import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Toggle,
	TableBuilder,
	TextColumn,
	ToggleColumn,
	t,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { ExchangeRate } from '../entities/ExchangeRate';
import { exchangeRateHooks } from '../hooks/exchangeRateHooks';

// Starting set (per the current business requirement). Adding a 6th currency
// later is a one-line change here — no schema migration needed.
function currencyOptions() {
	return {
		GNF: t('app:exchangeRates.currency.GNF'),
		USD: t('app:exchangeRates.currency.USD'),
		EUR: t('app:exchangeRates.currency.EUR'),
		XOF: t('app:exchangeRates.currency.XOF'),
		CAD: t('app:exchangeRates.currency.CAD'),
		AED: t('app:exchangeRates.currency.AED'),
	};
}

export class ExchangeRateResource extends BaseResource {
	static slug = 'exchange-rates';

	static entity = ExchangeRate;

	// Never shown in the sidebar (`hidden` below) — its TableBlock embed in
	// ParametresPage sets its own title/subtitle directly, so getLabel()
	// never actually surfaces. Left as a plain field for that reason.
	static label = 'Taux de Change';
	static pluralLabel = 'Taux de Change';
	static icon = 'ArrowRightLeft';

	static canDelete = true;
	// No standalone nav entry — embedded as a TableBlock in ParametresPage
	// (alongside Sécurité) instead. Still fully routable via /exchange-rates/*.
	static hidden = true;

	static recordTitleAttribute = 'label';
	static globallySearchableAttributes = ['code', 'label'];

	static form() {
		return FormBuilder.make().schema([
			SelectInput.make('code')
				.label(t('app:exchangeRates.fields.code'))
				.options(currencyOptions())
				.required()
				.disabled((c: FormContext) => c?.operation === 'edit'),
			TextInput.make('label').label(t('app:exchangeRates.fields.label')).required().max(60),
			TextInput.make('rateToGNF')
				.label(t('app:exchangeRates.fields.rateToGNF'))
				.helperText(t('app:exchangeRates.form.rateToGNF.helperText'))
				.type('number')
				.required()
				.minValue(0.0001)
				.step(0.0001)
				.disabled((c: FormContext) => c?.get('code') === 'GNF'),
			Toggle.make('active').label(t('app:common.active')).default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('code').label(t('app:exchangeRates.columns.code')).sortable().searchable(),
				TextColumn.make('label').label(t('app:exchangeRates.fields.label')).sortable().searchable(),
				TextColumn.make('rateToGNF').label(t('app:exchangeRates.columns.rateToGNF')).sortable(),
				ToggleColumn.make('active').label(t('app:common.active')).sortable(),
				TextColumn.make('updatedAt').label(t('app:common.updatedAt')).sortable().dateTime(),
			])
			.searchable()
			.defaultSort('code', 'asc');
	}

	static hooks() {
		return exchangeRateHooks;
	}
}
