import { Page, WidgetBlock, TableBlock, type Widget } from '@maxal_studio/kratosjs';
import { TransactionResource } from '../resources/TransactionResource';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Tableau de bord';
	static icon = 'LayoutDashboard';
	static navigationSort = -100;

	static async blocks() {
		const context = this.getContext();
		const isAdmin = context?.user?.role === 'admin';

		const widgets: Widget[] = TransactionResource.widgets();
		const w = (name: string) => widgets.find(x => x.getName() === name)!;

		const statBlocks = isAdmin
			? [
					WidgetBlock.make(w('transactions.caisseDuJour')).columns(4),
					WidgetBlock.make(w('transactions.fraisGeneres')).columns(4),
					WidgetBlock.make(w('transactions.bloques')).columns(4),
				]
			: [WidgetBlock.make(w('transactions.myCaisse')).columns(12)];

		const chartBlocks = isAdmin
			? [
					WidgetBlock.make(w('transactions.volume24h')).columns(8),
					WidgetBlock.make(w('transactions.topAgents')).columns(4),
				]
			: [];

		return [
			...statBlocks,
			...chartBlocks,
			TableBlock.make(TransactionResource.table())
				.columns(12)
				.title('Transactions Récentes')
				.subtitle(isAdmin ? 'Toutes les transactions de l’équipe' : 'Mes transactions'),
		];
	}
}