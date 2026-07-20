import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Textarea,
	Section,
	HiddenInput,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	StatsWidget,
	ChartWidget,
	getRequestContext,
	type Widget,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { Transaction } from '../entities/Transaction';
import { transactionHooks } from '../hooks/transactionHooks';
import { transactionRowActions, transactionActionHandlers } from '../actions/transactionActions';

const WITHDRAWAL_METHODS = {
	orange_money: 'Orange Money',
	wave: 'Wave',
	cash: 'Espèces',
};

const STATUS_LABELS: Record<string, string> = {
	pending: 'En cours',
	completed: 'Complété',
	blocked: 'Bloqué',
	cancelled: 'Annulé',
};

function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

const REPORT_PERIOD_DAYS = 30;

function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export class TransactionResource extends BaseResource {
	static slug = 'transactions';

	static entity = Transaction;

	static label = 'Transaction';
	static pluralLabel = 'Transactions';
	static icon = 'ArrowLeftRight';
	static navigationGroup = 'Opérations';
	static navigationSort = 1;

	static canDelete = false;

	static recordTitleAttribute = 'reference';
	static globallySearchableAttributes = ['reference', 'senderName', 'beneficiaryName', 'senderPhone', 'beneficiaryPhone'];

	static form() {
		return FormBuilder.make().schema([
			Section.make('Client (Envoyeur)')
				.collapsed(false)
				.schema([
					TextInput.make('senderName').label('Nom complet').placeholder('ex: Amadou Diallo').required().min(2).max(120),
					TextInput.make('senderPhone').label('Téléphone').tel().required(),
					TextInput.make('amount')
						.label('Montant à envoyer (GNF)')
						.type('number')
						.required()
						.minValue(500),
				]),
			Section.make('Bénéficiaire')
				.collapsed(false)
				.schema([
					TextInput.make('beneficiaryName').label('Nom complet').placeholder('ex: Fatou Sy').required().min(2).max(120),
					TextInput.make('beneficiaryPhone').label('Téléphone').tel().required(),
					SelectInput.make('withdrawalMethod')
						.label('Méthode de réception')
						.options(WITHDRAWAL_METHODS)
						.required()
						.default('cash'),
				]),
			Textarea.make('internalNote')
				.label('Note interne')
				.placeholder('Informations complémentaires sur la transaction...')
				.rows(3),
			SelectInput.make('status')
				.label('Statut')
				.options(STATUS_LABELS)
				.disabled()
				.hidden((c: FormContext) => c?.operation === 'create'),
			// Computed entirely by transactionHooks.beforeCreate (reference, agent,
			// fee/feeRate, status default) — declared here only so the schema's
			// field whitelist (SchemaValidator.filterFields) doesn't drop them.
			HiddenInput.make('reference'),
			HiddenInput.make('agent'),
			HiddenInput.make('fee'),
			HiddenInput.make('feeRate'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('reference').label('ID').sortable().searchable(),
				TextColumn.make('agent')
					.label('Agent')
					.formatStateUsing((value: any) => (value ? `${value.firstname} ${value.lastname ?? ''}`.trim() : '—')),
				TextColumn.make('beneficiaryName').label('Bénéficiaire').sortable().searchable(),
				TextColumn.make('amount').label('Montant').money('GNF').sortable(),
				TextColumn.make('fee').label('Frais').money('GNF').sortable(),
				BadgeColumn.make('status')
					.label('Statut')
					.formatStateUsing((value: string) => STATUS_LABELS[value] ?? value)
					.sortable(),
				TextColumn.make('createdAt').label('Date').sortable().dateTime(),
			])
			.populate([{ path: 'agent' }])
			.actions(transactionRowActions())
			.searchable()
			.paginate(10)
			.defaultSort('createdAt', 'desc');
	}

	static hooks() {
		return transactionHooks;
	}

	static actions() {
		return transactionActionHandlers(this);
	}

	static widgets(): Widget[] {
		return [
			StatsWidget.make('transactions.caisseDuJour')
				.label('Caisse Totale Jour')
				.icon('Wallet')
				.currency('GNF')
				.format('currency')
				.render(async em => {
					const rows = await em.find(Transaction, {
						createdAt: { $gte: startOfToday() },
						status: { $ne: 'cancelled' },
					} as any);
					return rows.reduce((sum: number, t: any) => sum + t.amount, 0);
				}),

			StatsWidget.make('transactions.fraisGeneres')
				.label('Frais Générés')
				.icon('Percent')
				.currency('GNF')
				.format('currency')
				.render(async em => {
					const rows = await em.find(Transaction, {
						createdAt: { $gte: startOfToday() },
						status: 'completed',
					} as any);
					return rows.reduce((sum: number, t: any) => sum + t.fee, 0);
				}),

			StatsWidget.make('transactions.bloques')
				.label('Transferts Bloqués')
				.icon('Ban')
				.render(async em => em.count(Transaction, { status: 'blocked' } as any)),

			ChartWidget.make('transactions.volume24h')
				.label('Volume de Transactions (24h)')
				.type('bar')
				.render(async em => {
					const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
					const rows = await em.find(Transaction, { createdAt: { $gte: since } } as any);
					const buckets = new Map<string, number>();
					for (const t of rows as any[]) {
						const hour = `${new Date(t.createdAt).getHours()}h`;
						buckets.set(hour, (buckets.get(hour) ?? 0) + t.amount);
					}
					return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
				}),

			ChartWidget.make('transactions.topAgents')
				.label('Meilleurs Agents')
				.type('bar')
				.showLegend()
				.render(async em => {
					const rows = await em.find(Transaction, { status: { $ne: 'cancelled' } } as any, {
						populate: ['agent'],
					});
					const totals = new Map<string, number>();
					for (const t of rows as any[]) {
						const name = t.agent ? `${t.agent.firstname} ${t.agent.lastname ?? ''}`.trim() : 'Inconnu';
						totals.set(name, (totals.get(name) ?? 0) + t.amount);
					}
					return Array.from(totals.entries())
						.sort((a, b) => b[1] - a[1])
						.slice(0, 5)
						.map(([label, value]) => ({ label, value }));
				}),

			// Agent's own uncollected cash: what they've taken in but the admin
			// hasn't yet reconciled (validated or cancelled).
			StatsWidget.make('transactions.myCaisse')
				.label('Ma Caisse')
				.icon('Wallet')
				.currency('GNF')
				.format('currency')
				.render(async em => {
					const userId = getRequestContext()?.user?.id;
					if (!userId) return 0;
					const rows = await em.find(Transaction, {
						agent: userId,
						status: { $in: ['pending', 'blocked'] },
					} as any);
					return rows.reduce((sum: number, t: any) => sum + t.amount, 0);
				}),

			// --- Rapports d'Analyse (last 30 days) ------------------------
			StatsWidget.make('transactions.revenueTotal')
				.label('Revenus Totaux')
				.icon('TrendingUp')
				.currency('GNF')
				.format('currency')
				.render(async em => {
					const rows = await em.find(Transaction, {
						createdAt: { $gte: daysAgo(REPORT_PERIOD_DAYS) },
						status: 'completed',
					} as any);
					return rows.reduce((sum: number, t: any) => sum + t.fee, 0);
				}),

			StatsWidget.make('transactions.volumeTotal')
				.label('Volume Cash Traité')
				.icon('Banknote')
				.currency('GNF')
				.format('currency')
				.render(async em => {
					const rows = await em.find(Transaction, {
						createdAt: { $gte: daysAgo(REPORT_PERIOD_DAYS) },
						status: { $ne: 'cancelled' },
					} as any);
					return rows.reduce((sum: number, t: any) => sum + t.amount, 0);
				}),

			StatsWidget.make('transactions.countPeriod')
				.label('Transactions (30j)')
				.icon('Hash')
				.render(async em =>
					em.count(Transaction, {
						createdAt: { $gte: daysAgo(REPORT_PERIOD_DAYS) },
						status: { $ne: 'cancelled' },
					} as any),
				),

			ChartWidget.make('transactions.feesPerDay')
				.label('Frais Générés par Jour')
				.type('line')
				.render(async em => {
					const rows = await em.find(Transaction, {
						createdAt: { $gte: daysAgo(REPORT_PERIOD_DAYS) },
						status: 'completed',
					} as any);
					const buckets = new Map<string, number>();
					for (const t of rows as any[]) {
						const key = dayKey(new Date(t.createdAt));
						buckets.set(key, (buckets.get(key) ?? 0) + t.fee);
					}
					return Array.from(buckets.entries())
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([label, value]) => ({ label, value }));
				}),

			ChartWidget.make('transactions.volumePerDay')
				.label('Volume Cash par Jour')
				.type('bar')
				.render(async em => {
					const rows = await em.find(Transaction, {
						createdAt: { $gte: daysAgo(REPORT_PERIOD_DAYS) },
						status: { $ne: 'cancelled' },
					} as any);
					const buckets = new Map<string, number>();
					for (const t of rows as any[]) {
						const key = dayKey(new Date(t.createdAt));
						buckets.set(key, (buckets.get(key) ?? 0) + t.amount);
					}
					return Array.from(buckets.entries())
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([label, value]) => ({ label, value }));
				}),
		];
	}
}