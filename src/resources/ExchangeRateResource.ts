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

// Only the currencies actually in use — a 4th can be added later with a
// one-line change here, no schema migration needed.
function currencyOptions() {
	return {
		GNF: t('app:exchangeRates.currency.GNF'),
		USD: t('app:exchangeRates.currency.USD'),
		AED: t('app:exchangeRates.currency.AED'),
	};
}

export class ExchangeRateResource extends BaseResource {
	static slug = 'exchange-rates';

	static entity = ExchangeRate;

	static getLabel() {
		return t('app:exchangeRates.label');
	}
	static getPluralLabel() {
		return t('app:exchangeRates.pluralLabel');
	}
	static icon = 'ArrowRightLeft';
	// A real nav entry, not embedded via TableBlock in ParametresPage — a
	// table embedded that way never gets KratosJS's row-action resource-slug
	// resolution (the same framework gap that broke Users' password-setup
	// link; see index.ts's comment on ADMIN_ONLY_RESOURCE_SLUGS), so
	// "Modifier" silently no-op'd (navigated to a bogus /admin/list/:id/edit
	// URL) for every row here. Grouped next to Paramètres/Collaborateurs
	// rather than under Opérations since it's back-office configuration, not
	// day-to-day activity.
	static getNavigationGroup() {
		return t('app:pages.system');
	}
	static navigationSort = 3;

	static canDelete = true;

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
				.disabled((c: FormContext) => c?.get('code') === 'GNF' || c?.get('code') === 'AED'),
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
