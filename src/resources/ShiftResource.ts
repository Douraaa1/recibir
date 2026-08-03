import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	DateTimePicker,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	DateFilter,
	StatsWidget,
	type Widget,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { ClientPayment } from '../entities/ClientPayment';
import { shiftHooks } from '../hooks/shiftHooks';

function personName(value: any): string {
	if (!value) return '—';
	return `${value.firstname ?? ''} ${value.lastname ?? ''}`.trim() || value.email || '—';
}

// Outstanding (not yet refunded) only — once the bank refunds a wrongful
// debit, it stops counting against this shift's treasury contribution.
async function wrongfulDebitOutstandingForShift(em: any, shiftId: number): Promise<number> {
	const rows = await em.find(WrongfulDebit, { shift: shiftId, status: { $ne: 'refunded' } } as any);
	return rows.reduce((sum: number, d: any) => sum + d.amountAED, 0);
}

export class ShiftResource extends BaseResource {
	static slug = 'shifts';

	static entity = Shift;

	static label = 'Shift';
	static pluralLabel = 'Suivi des Shifts';
	static icon = 'Layers';
	static navigationGroup = 'Opérations';
	static navigationSort = 4;

	// Always created in pairs by WithdrawalCycleResource — never standalone.
	static canCreate = false;
	static canDelete = false;

	static globallySearchableAttributes = [];

	static form() {
		// Admin may reassign agent/date; an agent may only report what they
		// withdrew on their own shift (mirrored server-side in shiftHooks).
		const isAdmin = this.getContext()?.user?.role === 'admin';

		return FormBuilder.make().schema([
			SelectInput.make('agent').label('Agent (Dubaï)').relationship('agent', 'email', 'users').required().disabled(!isAdmin),
			TextInput.make('shiftNumber').label('Shift (1 ou 2)').type('number').disabled(),
			DateTimePicker.make('date').label('Date').required().disabled(!isAdmin),
			TextInput.make('withdrawnAED').label('Montant retiré (AED)').type('number').required().minValue(0),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('cycleGroup')
					.label('Groupe')
					.formatStateUsing((_: any, row: any) => row.cycle?.group?.name ?? '—'),
				TextColumn.make('cycleRef')
					.label('Cycle')
					.formatStateUsing((_: any, row: any) => (row.cycle ? `#${row.cycle.id}` : '—')),
				TextColumn.make('agent').label('Agent').formatStateUsing((v: any) => personName(v)),
				BadgeColumn.make('shiftNumber')
					.label('Shift')
					.formatStateUsing((v: number) => `Shift ${v}`)
					.sortable(),
				TextColumn.make('date').label('Date').sortable().date(),
				TextColumn.make('withdrawnAED').label('Retiré').money('AED').sortable(),
				TextColumn.make('wrongfulDebitTotal')
					.label('Débit à tort')
					.formatStateUsing(async (_: any, row: any) => {
						const em = ShiftResource.getPanel().getEm().fork();
						const total = await wrongfulDebitOutstandingForShift(em, row.id);
						return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(total);
					}),
				TextColumn.make('treasury')
					.label('Trésorerie')
					.formatStateUsing(async (_: any, row: any) => {
						const em = ShiftResource.getPanel().getEm().fork();
						const debit = await wrongfulDebitOutstandingForShift(em, row.id);
						return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(
							(row.withdrawnAED ?? 0) - debit,
						);
					}),
			])
			.populate([{ path: 'cycle', populate: { path: 'group' } }, { path: 'agent' }])
			.filters([DateFilter.make('date').label('Mois / période')])
			.exportable()
			.paginate(20)
			.defaultSort('date', 'desc');
	}

	static hooks() {
		return shiftHooks;
	}

	static widgets(): Widget[] {
		return [
			// Net available treasury: withdrawn across all shifts, minus wrongful
			// debits, minus what's already been paid out to clients.
			StatsWidget.make('shifts.treasuryTotal')
				.label('Trésorerie Disponible')
				.icon('Wallet')
				.currency('AED')
				.format('currency')
				.render(async em => {
					const shifts = await em.find(Shift, {} as any);
					const withdrawn = shifts.reduce((sum: number, s: any) => sum + s.withdrawnAED, 0);
					const debits = await em.find(WrongfulDebit, { status: { $ne: 'refunded' } } as any);
					const wrongfulTotal = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);
					const payments = await em.find(ClientPayment, {} as any);
					const paidOut = payments.reduce((sum: number, p: any) => sum + p.amountAED, 0);
					return withdrawn - wrongfulTotal - paidOut;
				}),

			StatsWidget.make('shifts.activeGroups')
				.label('Groupes Actifs')
				.icon('Layers')
				.render(async em => {
					const shifts = await em.find(Shift, {} as any, { populate: ['cycle', 'cycle.group'] });
					const groupIds = shifts.map((s: any) => String(s.cycle?.group?.id ?? s.cycle?.group));
					return new Set(groupIds).size;
				}),
		];
	}
}
