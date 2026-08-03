import {
	BaseResource,
	FormBuilder,
	TextInput,
	Textarea,
	HiddenInput,
	TableBuilder,
	TextColumn,
	StatsWidget,
	type Widget,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { ClientPayment } from '../entities/ClientPayment';
import { clientPaymentHooks } from '../hooks/clientPaymentHooks';

function personName(value: any): string {
	if (!value) return '—';
	return `${value.firstname ?? ''} ${value.lastname ?? ''}`.trim() || value.email || '—';
}

export class ClientPaymentResource extends BaseResource {
	static slug = 'client-payments';

	static entity = ClientPayment;

	static label = 'Paiement Client';
	static pluralLabel = 'Paiements Clients';
	static icon = 'HandCoins';
	static navigationGroup = 'Opérations';
	static navigationSort = 3;

	static canDelete = false;

	static recordTitleAttribute = 'clientName';
	static globallySearchableAttributes = ['clientName', 'clientPhone'];

	static form() {
		const isAdmin = this.getContext()?.user?.role === 'admin';
		// Editable freely on create (by whoever pays the client); once saved the
		// record is immutable for non-admins (enforced again in clientPaymentHooks).
		const lockedOnEdit = (c: FormContext) => c?.operation === 'edit' && !isAdmin;

		return FormBuilder.make().schema([
			TextInput.make('clientName').label('Nom du client').required().min(2).max(120).disabled(lockedOnEdit),
			TextInput.make('clientPhone').label('Téléphone du client').required().disabled(lockedOnEdit),
			TextInput.make('amountAED').label('Montant (AED)').type('number').required().minValue(1).disabled(lockedOnEdit),
			Textarea.make('note').label('Note').rows(3).disabled(lockedOnEdit),
			// Set from the logged-in user in beforeCreate — declared here only so
			// the schema whitelist doesn't drop it.
			HiddenInput.make('agent'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('clientName').label('Client').sortable().searchable(),
				TextColumn.make('clientPhone').label('Téléphone').searchable(),
				TextColumn.make('amountAED').label('Montant').money('AED').sortable(),
				TextColumn.make('agent').label('Agent').formatStateUsing((v: any) => personName(v)),
				TextColumn.make('createdAt').label('Date').sortable().dateTime(),
			])
			.populate([{ path: 'agent' }])
			.exportable()
			.searchable()
			.paginate(20)
			.defaultSort('createdAt', 'desc');
	}

	static hooks() {
		return clientPaymentHooks;
	}

	static widgets(): Widget[] {
		return [
			StatsWidget.make('clientPayments.total')
				.label('Total Payé aux Clients')
				.icon('HandCoins')
				.currency('AED')
				.format('currency')
				.render(async em => {
					const rows = await em.find(ClientPayment, {} as any);
					return rows.reduce((sum: number, p: any) => sum + p.amountAED, 0);
				}),
		];
	}
}
