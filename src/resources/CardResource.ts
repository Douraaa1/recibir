import { BaseResource, FormBuilder, TextInput, SelectInput, Toggle, TableBuilder, TextColumn, ToggleColumn } from '@maxal_studio/kratosjs';
import { Card } from '../entities/Card';
import { cardHooks } from '../hooks/cardHooks';

export class CardResource extends BaseResource {
	static slug = 'cards';

	static entity = Card;

	static label = 'Carte';
	static pluralLabel = 'Cartes';
	static icon = 'CreditCard';
	static navigationGroup = 'Opérations';
	static navigationSort = 2;

	static recordTitleAttribute = 'identifier';
	static globallySearchableAttributes = ['identifier'];

	static form() {
		return FormBuilder.make().schema([
			SelectInput.make('group').label('Groupe').relationship('group', 'name', 'card-groups').required(),
			TextInput.make('identifier').label('Identifiant de la carte').required().max(60),
			Toggle.make('active').label('Active').default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('identifier').label('Identifiant').sortable().searchable(),
				TextColumn.make('group').label('Groupe').formatStateUsing((v: any) => v?.name ?? '—'),
				ToggleColumn.make('active').label('Active').sortable(),
				TextColumn.make('createdAt').label('Créée le').sortable().dateTime(),
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
