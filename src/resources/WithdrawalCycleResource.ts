import { BaseResource, FormBuilder, TextInput, SelectInput, HiddenInput, TableBuilder, TextColumn, t } from '@maxal_studio/kratosjs';
import { WithdrawalCycle } from '../entities/WithdrawalCycle';
import { withdrawalCycleHooks } from '../hooks/withdrawalCycleHooks';
import { isAdminLike } from '../utils/roles';

export class WithdrawalCycleResource extends BaseResource {
	static slug = 'withdrawal-cycles';

	static entity = WithdrawalCycle;

	static getLabel() {
		return t('app:withdrawalCycles.label');
	}
	static getPluralLabel() {
		return t('app:withdrawalCycles.pluralLabel');
	}
	static icon = 'RefreshCw';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
	static navigationSort = 3;

	static canDelete = false;

	static recordTitleAttribute = (record: any) => t('app:withdrawalCycles.recordTitle', { id: record.id, group: record.group?.name ?? '' });

	static form() {
		const isAdmin = isAdminLike(this.getContext()?.user?.role);

		return FormBuilder.make().schema([
			// No agent picker here — each group carries its own standing agent
			// assignment (CardGroup.agent), which withdrawalCycleHooks reads to
			// assign both auto-created shifts. No date picker either — it's
			// always today (creation date), set in withdrawalCycleHooks. Declared
			// hidden only so the schema whitelist doesn't drop the hook-set value.
			SelectInput.make('group').label(t('app:common.group')).relationship('group', 'name', 'card-groups').required().disabled(!isAdmin),
			TextInput.make('sentGNF').label(t('app:withdrawalCycles.fields.sentGNF')).type('number').required().minValue(1).disabled(!isAdmin),
			TextInput.make('expectedAED')
				.label(t('app:withdrawalCycles.fields.expectedAED'))
				.type('number')
				.required()
				.integer()
				.minValue(1)
				.disabled(!isAdmin),
			HiddenInput.make('date'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('group').label(t('app:common.group')).formatStateUsing((v: any) => v?.name ?? '—'),
				TextColumn.make('sentGNF').label(t('app:withdrawalCycles.columns.sentGNF')).money('GNF').sortable(),
				TextColumn.make('expectedAED').label(t('app:withdrawalCycles.columns.expectedAED')).money('AED').sortable(),
				TextColumn.make('date').label(t('app:common.date')).sortable().date(),
				TextColumn.make('createdAt').label(t('app:common.createdAt')).sortable().dateTime(),
			])
			.populate([{ path: 'group' }])
			.paginate(20)
			.defaultSort('date', 'desc');
	}

	static hooks() {
		return withdrawalCycleHooks;
	}
}
