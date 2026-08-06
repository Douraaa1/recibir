import { BaseResource, FormBuilder, TextInput, SelectInput, Toggle, TableBuilder, TextColumn, ToggleColumn, t } from '@maxal_studio/kratosjs';
import { Card } from '../entities/Card';
import { cardHooks } from '../hooks/cardHooks';

export class CardResource extends BaseResource {
	static slug = 'cards';

	static entity = Card;

	static getLabel() {
		return t('app:cards.label');
	}
	static getPluralLabel() {
		return t('app:cards.pluralLabel');
	}
	static icon = 'CreditCard';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
	static navigationSort = 2;

	static recordTitleAttribute = 'identifier';
	static globallySearchableAttributes = ['identifier'];

	static form() {
		return FormBuilder.make().schema([
			SelectInput.make('group').label(t('app:common.group')).relationship('group', 'name', 'card-groups').required(),
			TextInput.make('identifier').label(t('app:cards.fields.identifier')).required().max(60),
			Toggle.make('active').label(t('app:common.active')).default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('identifier').label(t('app:cards.columns.identifier')).sortable().searchable(),
				TextColumn.make('group').label(t('app:common.group')).formatStateUsing((v: any) => v?.name ?? '—'),
				ToggleColumn.make('active').label(t('app:common.active')).sortable(),
				TextColumn.make('createdAt').label(t('app:common.createdAt')).sortable().dateTime(),
			])
			.populate([{ path: 'group' }])
			.searchable()
			.paginate(20)
			.defaultSort('identifier', 'asc');
	}

	static hooks() {
		return cardHooks;
	}
}
