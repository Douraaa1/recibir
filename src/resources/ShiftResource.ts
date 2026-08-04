import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	HiddenInput,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	DateFilter,
	StatsWidget,
	ChartWidget,
	getRequestContext,
	type Widget,
} from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { ClientPayment } from '../entities/ClientPayment';
import { User } from '../entities/User';
import { shiftHooks } from '../hooks/shiftHooks';
import { isAdminLike } from '../utils/roles';

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
		// Admin/superviseur may reassign agent; everyone else may only report
		// what they withdrew on their own shift (mirrored server-side in
		// shiftHooks). No date field — it tracks the last withdrawal edit
		// automatically (see shiftHooks).
		const isAdmin = isAdminLike(this.getContext()?.user?.role);

		return FormBuilder.make().schema([
			SelectInput.make('agent').label('Agent (Dubaï)').relationship('agent', 'email', 'users').required().disabled(!isAdmin),
			TextInput.make('shiftNumber').label('Shift (1 ou 2)').type('number').disabled(),
			TextInput.make('withdrawnAED').label('Montant retiré (AED)').type('number').required().minValue(0),
			// Declared hidden only so the schema whitelist doesn't drop the
			// hook-set value (shiftHooks stamps it on every withdrawnAED edit).
			HiddenInput.make('date'),
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
			// debits, minus what's already been paid out to clients. A plain agent
			// only sees their own share; every other role sees the whole team's
			// (admin/superviseur company-wide, chef_equipe Dubai-team-wide — same
			// number here since this data is all Dubai-side anyway).
			StatsWidget.make('shifts.treasuryTotal')
				.label('Trésorerie Disponible')
				.icon('Wallet')
				.currency('AED')
				.format('currency')
				.render(async em => {
					const role = getRequestContext()?.user?.role;
					const scopeToSelf = role === 'agent';
					const agentId = getRequestContext()?.user?.id;

					const shiftFilter = scopeToSelf ? ({ agent: agentId } as any) : ({} as any);
					const shifts = await em.find(Shift, shiftFilter);
					const withdrawn = shifts.reduce((sum: number, s: any) => sum + s.withdrawnAED, 0);

					const debitFilter = scopeToSelf
						? ({ agent: agentId, status: { $ne: 'refunded' } } as any)
						: ({ status: { $ne: 'refunded' } } as any);
					const debits = await em.find(WrongfulDebit, debitFilter);
					const wrongfulTotal = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);

					const paymentFilter = scopeToSelf ? ({ agent: agentId } as any) : ({} as any);
					const payments = await em.find(ClientPayment, paymentFilter);
					const paidOut = payments.reduce((sum: number, p: any) => sum + p.amountAED, 0);

					return withdrawn - wrongfulTotal - paidOut;
				}),

			// Same net-treasury formula as shifts.treasuryTotal, split by agent.
			// StatsWidget cards have no native click-through to a detail view in
			// this framework, so this sits alongside the total as a chart instead
			// of behind a click.
			ChartWidget.make('shifts.treasuryByAgent')
				.label('Trésorerie par Agent')
				.icon('Wallet')
				.type('bar')
				.render(async em => {
					const agents = await em.find(User, { role: 'agent' } as any);
					const results: { label: string; value: number }[] = [];
					for (const agent of agents) {
						const shifts = await em.find(Shift, { agent: agent.id } as any);
						const withdrawn = shifts.reduce((sum: number, s: any) => sum + s.withdrawnAED, 0);
						const debits = await em.find(WrongfulDebit, { agent: agent.id, status: { $ne: 'refunded' } } as any);
						const wrongfulTotal = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);
						const payments = await em.find(ClientPayment, { agent: agent.id } as any);
						const paidOut = payments.reduce((sum: number, p: any) => sum + p.amountAED, 0);
						results.push({ label: personName(agent), value: withdrawn - wrongfulTotal - paidOut });
					}
					return results;
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
