import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Toggle,
	FileUpload,
	TableBuilder,
	TextColumn,
	ToggleColumn,
	BadgeColumn,
	ImageColumn,
	StatsWidget,
	Widget,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { User } from '../entities/User';
import { Shift } from '../entities/Shift';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { userHooks } from '../hooks/userHooks';

const ROLE_LABELS = {
	admin: 'Administrateur',
	superviseur: 'Superviseur (Conakry)',
	chef_equipe: "Chef d'équipe (Dubaï)",
	agent: 'Agent (Dubaï)',
};

// What this agent has actually netted across their own shifts (withdrawn
// minus their own outstanding — not yet refunded — wrongful debits) — not
// the shared treasury balance (that also nets out client payments; see
// ShiftResource's 'shifts.treasuryTotal').
async function netGeneratedByAgent(em: any, agentId: number): Promise<number> {
	const shifts = await em.find(Shift, { agent: agentId } as any);
	const withdrawn = shifts.reduce((sum: number, s: any) => sum + s.withdrawnAED, 0);
	const debits = await em.find(WrongfulDebit, { agent: agentId, status: { $ne: 'refunded' } } as any);
	const wrongfulTotal = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);
	return withdrawn - wrongfulTotal;
}

export class UserResource extends BaseResource {
	static slug = 'users';

	static entity = User;

	static label = 'Collaborateur';
	static pluralLabel = 'Collaborateurs';
	static icon = 'Users';
	static navigationGroup = 'Équipe';
	static navigationSort = 1;

	static recordTitleAttribute = (record: any) =>
		record.lastname ? `${record.firstname} ${record.lastname}` : record.firstname;
	static recordFeaturedImageAttribute = 'profileMediaImage';
	static globallySearchableAttributes = ['firstname', 'lastname', 'email'];

	static form() {
		return FormBuilder.make().schema([
			FileUpload.make('profileMediaImage').label('Profile Image').image(),
			TextInput.make('password')
				.label('Password')
				.password()
				.required((context: FormContext) => context?.operation === 'create')
				.min(8)
				.max(50)
				.hidden((context: FormContext) => context?.operation === 'view'),
			TextInput.make('firstname').label('First name').required().min(2).max(50),
			TextInput.make('lastname').label('Last name').max(50),
			TextInput.make('email').label('Email').email().required(),
			TextInput.make('phone').label('Phone Number').placeholder('Enter phone number...'),
			SelectInput.make('role').label('Rôle').options(ROLE_LABELS).default('agent').required(),
			Toggle.make('active').label('Active').default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				ImageColumn.make('profileMediaImage').label('Profile').circular(),
				TextColumn.make('firstname').label('First name').sortable().searchable(),
				TextColumn.make('lastname').label('Last name').sortable().searchable(),
				TextColumn.make('email').label('Email').sortable().searchable(),
				BadgeColumn.make('role')
					.label('Rôle')
					.formatStateUsing((value: string) => ROLE_LABELS[value as keyof typeof ROLE_LABELS] ?? value)
					.sortable(),
				TextColumn.make('netGenerated')
					.label('Net généré (AED)')
					.formatStateUsing(async (_value: any, row: any) => {
						if (row.role !== 'agent') return '—';
						const em = UserResource.getPanel().getEm().fork();
						const total = await netGeneratedByAgent(em, row.id);
						return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(total);
					}),
				ToggleColumn.make('active').label('Active').sortable(),
				TextColumn.make('createdAt').label('Created').sortable().dateTime(),
			])
			.searchable()
			.paginate(10)
			.defaultSort('createdAt', 'desc');
	}

	static hooks() {
		return userHooks;
	}

	static widgets(): Widget[] {
		return [
			StatsWidget.make('users.totalUsers')
				.label('Total Utilisateurs')
				.icon('Users')
				.render(async (em, entity) => em.count(entity, {})),

			StatsWidget.make('users.activeAgents')
				.label('Collaborateurs Actifs')
				.icon('UserCheck')
				.render(async em => em.count(User, { active: true } as any)),
		];
	}
}
