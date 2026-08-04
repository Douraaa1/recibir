import { BaseResource, FormBuilder, TextInput, SelectInput, DateTimePicker, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';
import { WithdrawalCycle } from '../entities/WithdrawalCycle';
import { withdrawalCycleHooks } from '../hooks/withdrawalCycleHooks';

export class WithdrawalCycleResource extends BaseResource {
	static slug = 'withdrawal-cycles';

	static entity = WithdrawalCycle;

	static label = 'Cycle de Retrait';
	static pluralLabel = 'Cycles de Retrait';
	static icon = 'RefreshCw';
	static navigationGroup = 'Opérations';
	static navigationSort = 3;

	static canDelete = false;

	static recordTitleAttribute = (record: any) => `Cycle #${record.id} — ${record.group?.name ?? ''}`;

	static form() {
		const isAdmin = this.getContext()?.user?.role === 'admin';

		return FormBuilder.make().schema([
			// No agent picker here — each group carries its own standing agent
			// assignment (CardGroup.agent), which withdrawalCycleHooks reads to
			// assign both auto-created shifts.
			SelectInput.make('group').label('Groupe').relationship('group', 'name', 'card-groups').required().disabled(!isAdmin),
			TextInput.make('sentGNF').label('Envoyé (GNF)').type('number').required().minValue(1).disabled(!isAdmin),
			TextInput.make('expectedAED').label('Attendu (AED)').type('number').required().integer().minValue(1).disabled(!isAdmin),
			DateTimePicker.make('date').label('Date').required().disabled(!isAdmin),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('group').label('Groupe').formatStateUsing((v: any) => v?.name ?? '—'),
				TextColumn.make('sentGNF').label('Envoyé').money('GNF').sortable(),
				TextColumn.make('expectedAED').label('Attendu').money('AED').sortable(),
				TextColumn.make('date').label('Date').sortable().date(),
				TextColumn.make('createdAt').label('Créé le').sortable().dateTime(),
			])
			.populate([{ path: 'group' }])
			.paginate(20)
			.defaultSort('date', 'desc');
	}

	static hooks() {
		return withdrawalCycleHooks;
	}
}
