import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	DateTimePicker,
	TableBuilder,
	TextColumn,
	type FormContext,
} from '@maxal_studio/kratosjs';
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
			SelectInput.make('group').label('Groupe').relationship('group', 'name', 'card-groups').required().disabled(!isAdmin),
			TextInput.make('sentGNF').label('Envoyé (GNF)').type('number').required().minValue(1).disabled(!isAdmin),
			TextInput.make('expectedAED').label('Attendu (AED)').type('number').disabled(),
			DateTimePicker.make('date').label('Date').required().disabled(!isAdmin),
			// Assigns both auto-created shifts up front — the same agent usually
			// runs both, so one field covers it (reassign shift 2 individually
			// afterwards from the Shift itself if it's ever split between two
			// people). Consumed by withdrawalCycleHooks, never persisted here.
			SelectInput.make('agent')
				.label('Agent (Dubaï)')
				.relationship('agent', 'email', 'users')
				.required((c: FormContext) => c?.operation === 'create')
				.hidden((c: FormContext) => c?.operation !== 'create')
				.disabled(!isAdmin),
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
