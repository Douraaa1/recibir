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
	t,
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

// Outstanding (not yet refunded) — shown for visibility on the shift row,
// but no longer subtracted from treasury (see wrongfulDebitRefundedForShift):
// a reported-but-unresolved debit isn't a confirmed loss, it's a problem
// being chased (tracked by the "Débits à Tort" widget instead).
async function wrongfulDebitOutstandingForShift(em: any, shiftId: number): Promise<number> {
	const rows = await em.find(WrongfulDebit, { shift: shiftId, status: { $ne: 'refunded' } } as any);
	return rows.reduce((sum: number, d: any) => sum + d.amountAED, 0);
}

// Once the bank actually refunds a wrongful debit, that's confirmed money
// back — it adds to the shift's treasury contribution on top of what was
// withdrawn, rather than merely stopping a subtraction.
async function wrongfulDebitRefundedForShift(em: any, shiftId: number): Promise<number> {
	const rows = await em.find(WrongfulDebit, { shift: shiftId, status: 'refunded' } as any);
	return rows.reduce((sum: number, d: any) => sum + d.amountAED, 0);
}

export class ShiftResource extends BaseResource {
	static slug = 'shifts';

	static entity = Shift;

	static getLabel() {
		return t('app:shifts.label');
	}
	static getPluralLabel() {
		return t('app:shifts.pluralLabel');
	}
	static icon = 'Layers';
	static getNavigationGroup() {
		return t('app:pages.operations');
	}
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
			SelectInput.make('agent')
				.label(t('app:shifts.fields.agent'))
				.relationship('agent', 'email', 'users')
				.required()
				.disabled(!isAdmin),
			TextInput.make('shiftNumber').label(t('app:shifts.fields.shiftNumber')).type('number').disabled(),
			TextInput.make('withdrawnAED').label(t('app:shifts.fields.withdrawnAED')).type('number').required().minValue(0),
			// Declared hidden only so the schema whitelist doesn't drop the
			// hook-set value (shiftHooks stamps it on every withdrawnAED edit).
			HiddenInput.make('date'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('cycleGroup')
					.label(t('app:common.group'))
					.formatStateUsing((_: any, row: any) => row.cycle?.group?.name ?? '—'),
				TextColumn.make('cycleRef')
					.label(t('app:shifts.columns.cycle'))
					.formatStateUsing((_: any, row: any) => (row.cycle ? `#${row.cycle.id}` : '—')),
				TextColumn.make('agent').label(t('app:common.agent')).formatStateUsing((v: any) => personName(v)),
				BadgeColumn.make('shiftNumber')
					.label(t('app:shifts.columns.shift'))
					.formatStateUsing((v: number) => t('app:shifts.shiftBadge', { n: v }))
					.sortable(),
				TextColumn.make('date').label(t('app:common.date')).sortable().date(),
				TextColumn.make('withdrawnAED').label(t('app:shifts.columns.withdrawn')).money('AED').sortable(),
				TextColumn.make('wrongfulDebitTotal')
					.label(t('app:shifts.columns.wrongfulDebit'))
					.formatStateUsing(async (_: any, row: any) => {
						const em = ShiftResource.getPanel().getEm().fork();
						const total = await wrongfulDebitOutstandingForShift(em, row.id);
						return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(total);
					}),
				TextColumn.make('treasury')
					.label(t('app:shifts.columns.treasury'))
					.formatStateUsing(async (_: any, row: any) => {
						const em = ShiftResource.getPanel().getEm().fork();
						const refunded = await wrongfulDebitRefundedForShift(em, row.id);
						return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(
							(row.withdrawnAED ?? 0) + refunded,
						);
					}),
			])
			.populate([{ path: 'cycle', populate: { path: 'group' } }, { path: 'agent' }])
			.filters([DateFilter.make('date').label(t('app:shifts.filters.period'))])
			.exportable()
			.paginate(20)
			.defaultSort('date', 'desc');
	}

	static hooks() {
		return shiftHooks;
	}

	static widgets(): Widget[] {
		return [
			// Net available treasury: withdrawn across all shifts, plus wrongful
			// debits the bank has actually refunded (a reported-but-unresolved
			// debit isn't a confirmed loss, so it doesn't touch this figure — see
			// the "Débits à Tort" widget for that), minus what's already been
			// paid out to clients. A plain agent only sees their own share; every
			// other role sees the whole team's (admin/superviseur company-wide,
			// chef_equipe Dubai-team-wide — same number here since this data is
			// all Dubai-side anyway).
			StatsWidget.make('shifts.treasuryTotal')
				.label(t('app:shifts.widgets.treasuryTotal'))
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
						? ({ agent: agentId, status: 'refunded' } as any)
						: ({ status: 'refunded' } as any);
					const debits = await em.find(WrongfulDebit, debitFilter);
					const wrongfulRefunded = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);

					// Only validated payments have actually left the treasury — a
					// pending request or a refused/cancelled one never did (see
					// ClientPaymentResource/clientPaymentActions.ts).
					const paymentFilter = scopeToSelf
						? ({ agent: agentId, status: 'validated' } as any)
						: ({ status: 'validated' } as any);
					const payments = await em.find(ClientPayment, paymentFilter);
					const paidOut = payments.reduce((sum: number, p: any) => sum + p.amountAED, 0);

					return withdrawn + wrongfulRefunded - paidOut;
				}),

			// Same net-treasury formula as shifts.treasuryTotal, split by agent.
			// StatsWidget cards have no native click-through to a detail view in
			// this framework, so this sits alongside the total as a chart instead
			// of behind a click.
			ChartWidget.make('shifts.treasuryByAgent')
				.label(t('app:shifts.widgets.treasuryByAgent'))
				.icon('Wallet')
				.type('pie')
				.showLegend()
				.render(async em => {
					const agents = await em.find(User, { role: 'agent' } as any);
					const results: { label: string; value: number }[] = [];
					for (const agent of agents) {
						const shifts = await em.find(Shift, { agent: agent.id } as any);
						const withdrawn = shifts.reduce((sum: number, s: any) => sum + s.withdrawnAED, 0);
						const debits = await em.find(WrongfulDebit, { agent: agent.id, status: 'refunded' } as any);
						const wrongfulRefunded = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);
						const payments = await em.find(ClientPayment, { agent: agent.id, status: 'validated' } as any);
						const paidOut = payments.reduce((sum: number, p: any) => sum + p.amountAED, 0);
						results.push({ label: personName(agent), value: withdrawn + wrongfulRefunded - paidOut });
					}
					return results;
				}),

			StatsWidget.make('shifts.activeGroups')
				.label(t('app:shifts.widgets.activeGroups'))
				.icon('Layers')
				.render(async em => {
					const shifts = await em.find(Shift, {} as any, { populate: ['cycle', 'cycle.group'] });
					const groupIds = shifts.map((s: any) => String(s.cycle?.group?.id ?? s.cycle?.group));
					return new Set(groupIds).size;
				}),
		];
	}
}
