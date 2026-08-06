import { Page, WidgetBlock, TableBlock, t, type Widget } from '@maxal_studio/kratosjs';
import { ShiftResource } from '../resources/ShiftResource';
import { ClientPaymentResource } from '../resources/ClientPaymentResource';
import { WrongfulDebitResource } from '../resources/WrongfulDebitResource';
import { seesTeamWideData } from '../utils/roles';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	// See ParametresPage's `static get label()` for why this is a getter,
	// not a plain field.
	static get label() {
		return t('app:pages.dashboard.label');
	}
	static icon = 'LayoutDashboard';
	static navigationSort = -100;

	static async blocks() {
		const context = this.getContext();
		// admin/superviseur/chef_equipe get the full team-wide dashboard; a
		// plain agent gets just their own scoped treasury figure (see
		// shifts.treasuryTotal's own role check) and shift list.
		const isTeamView = seesTeamWideData(context?.user?.role);

		const shiftWidgets: Widget[] = ShiftResource.widgets();
		const paymentWidgets: Widget[] = ClientPaymentResource.widgets();
		const debitWidgets: Widget[] = WrongfulDebitResource.widgets();
		const w = (widgets: Widget[], name: string) => widgets.find(x => x.getName() === name)!;

		const statBlocks = [
			WidgetBlock.make(w(shiftWidgets, 'shifts.treasuryTotal')).columns(isTeamView ? 4 : 12),
			...(isTeamView
				? [
						WidgetBlock.make(w(debitWidgets, 'wrongfulDebits.total')).columns(4),
						WidgetBlock.make(w(shiftWidgets, 'shifts.activeGroups')).columns(4),
						WidgetBlock.make(w(paymentWidgets, 'clientPayments.total')).columns(6),
						// Same figure as Trésorerie Disponible above, split by agent —
						// stat cards can't link through to a detail view, so this sits
						// right below it instead.
						WidgetBlock.make(w(shiftWidgets, 'shifts.treasuryByAgent')).columns(6),
					]
				: []),
		];

		return [
			...statBlocks,
			// Envoyé / Attendu live on the cycle now — this is the shift-level
			// execution detail (Retiré / Débit à tort / Trésorerie), sortable by
			// date and exportable to CSV. Team-wide roles see every group and
			// agent; a plain agent sees only the shifts assigned to them
			// (server-scoped).
			TableBlock.make(ShiftResource.table())
				.dataUrl('shifts/list')
				.columns(12)
				.title(t('app:pages.dashboard.shifts.title'))
				.subtitle(isTeamView ? t('app:pages.dashboard.shifts.subtitleTeam') : t('app:pages.dashboard.shifts.subtitleSelf')),
			// There's no native click-through from a stat card to a filtered list
			// in this framework, so instead of a dead-end "Débits à Tort" number,
			// the detail (groupe, carte, shift, montant, date) sits right below it.
			...(isTeamView
				? [
						TableBlock.make(WrongfulDebitResource.table())
							.dataUrl('wrongful-debits/list')
							.columns(12)
							.title(t('app:pages.dashboard.wrongfulDebits.title')),
					]
				: []),
		];
	}
}
