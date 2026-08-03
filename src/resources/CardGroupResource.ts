import { BaseResource, FormBuilder, TextInput, Textarea, Toggle, TableBuilder, TextColumn, ToggleColumn } from '@maxal_studio/kratosjs';
import { CardGroup } from '../entities/CardGroup';
import { Card } from '../entities/Card';

export class CardGroupResource extends BaseResource {
	static slug = 'card-groups';

	static entity = CardGroup;

	static label = 'Groupe de Cartes';
	static pluralLabel = 'Groupes de Cartes';
	static icon = 'CreditCard';
	static navigationGroup = 'Opérations';
	static navigationSort = 2;

	static recordTitleAttribute = 'name';
	static globallySearchableAttributes = ['name'];

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('name').label('Nom du groupe').required().min(2).max(60),
			Toggle.make('active').label('Actif').default(true),
			Textarea.make('note').label('Note').rows(3),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('name').label('Nom').sortable().searchable(),
				TextColumn.make('cardCount')
					.label('Nb. cartes')
					.formatStateUsing(async (_: any, row: any) => {
						const em = CardGroupResource.getPanel().getEm().fork();
						return em.count(Card, { group: row.id } as any);
					}),
				ToggleColumn.make('active').label('Actif').sortable(),
				TextColumn.make('createdAt').label('Créé le').sortable().dateTime(),
			])
			.searchable()
			.paginate(20)
			.defaultSort('name', 'asc');
	}
}
