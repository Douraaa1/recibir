import { Page, WidgetBlock, type Widget } from '@maxal_studio/kratosjs';
import { TransactionResource } from '../resources/TransactionResource';

// Admin-only — enforced in src/index.ts (metadata + page-access-check hooks),
// since financial reporting shouldn't be visible to agents.
export class ReportsPage extends Page {
	static slug = 'reports';
	static label = 'Rapports';
	static icon = 'BarChart3';
	static navigationGroup = 'Opérations';
	static navigationSort = 2;

	static async blocks() {
		const widgets: Widget[] = TransactionResource.widgets();
		const w = (name: string) => widgets.find(x => x.getName() === name)!;

		return [
			WidgetBlock.make(w('transactions.revenueTotal')).columns(4),
			WidgetBlock.make(w('transactions.volumeTotal')).columns(4),
			WidgetBlock.make(w('transactions.countPeriod')).columns(4),
			WidgetBlock.make(w('transactions.feesPerDay')).columns(6),
			WidgetBlock.make(w('transactions.volumePerDay')).columns(6),
		];
	}
}
