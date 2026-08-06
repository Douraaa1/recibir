import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Textarea,
	Toggle,
	TableBuilder,
	TextColumn,
	ToggleColumn,
	t,
} from '@maxal_studio/kratosjs';
import { CardGroup } from '../entities/CardGroup';
import { Card } from '../entities/Card';
import { cardGroupHooks } from '../hooks/cardGroupHooks';

function personName(value: any): string {
	if (!value) return '—';
	return `${value.firstname ?? ''} ${value.lastname ?? ''}`.trim() || value.email || '—';
}

export class CardGroupResource extends BaseResource {
	static slug = 'card-groups';

	static entity = CardGroup;

	static getLabel() {
		return t('app:cardGroups.label');
	}
	static getPluralLabel() {
		return t('app:cardGroups.pluralLabel');
	}
	static icon = 'Boxes';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
	static navigationSort = 2;

	static recordTitleAttribute = 'name';
	static globallySearchableAttributes = ['name'];

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('name').label(t('app:cardGroups.fields.name')).required().min(2).max(60),
			SelectInput.make('agent')
				.label(t('app:cardGroups.fields.assignedAgent'))
				.relationship('agent', 'email', 'users')
				.required()
				.helperText(t('app:cardGroups.form.agent.helperText')),
			Toggle.make('active').label(t('app:common.active')).default(true),
			Textarea.make('note').label(t('app:common.note')).rows(3),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('name').label(t('app:cardGroups.columns.name')).sortable().searchable(),
				TextColumn.make('agent').label(t('app:common.agent')).formatStateUsing((v: any) => personName(v)),
				TextColumn.make('cardCount')
					.label(t('app:cardGroups.columns.cardCount'))
					.formatStateUsing(async (_: any, row: any) => {
						const em = CardGroupResource.getPanel().getEm().fork();
						return em.count(Card, { group: row.id } as any);
					}),
				ToggleColumn.make('active').label(t('app:common.active')).sortable(),
				TextColumn.make('createdAt').label(t('app:common.createdAt')).sortable().dateTime(),
			])
			.populate([{ path: 'agent' }])
			.searchable()
			.paginate(20)
			.defaultSort('name', 'asc');
	}

	static hooks() {
		return cardGroupHooks;
	}
}
