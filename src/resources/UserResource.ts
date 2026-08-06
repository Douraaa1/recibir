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
	t,
} from '@maxal_studio/kratosjs';
import { User } from '../entities/User';
import { Shift } from '../entities/Shift';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { userHooks } from '../hooks/userHooks';
import { userRowActions, userActionHandlers } from '../actions/userActions';
import { getPublicUrl } from '../utils/publicUrl';

// Display labels only — the underlying role values stored in the DB and
// used throughout the permission logic (see src/utils/roles.ts) stay
// 'admin'/'superviseur'/'chef_equipe'/'agent' for stability. These are
// role codenames the user chose deliberately (not ordinary UI text), so
// unlike everything else in this file they stay identical across locales —
// no t() lookup, a plain module-level object is fine.
const ROLE_LABELS = {
	admin: 'SuperAdmin',
	superviseur: 'adminGN',
	chef_equipe: 'adminEAU',
	agent: 'agent',
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

	// `label`/`pluralLabel` overridden as methods (not static fields) so they
	// resolve t() against the current request's locale — a static field is
	// frozen at class-definition time, before any request/locale exists.
	static getLabel() {
		return t('app:users.label');
	}
	static getPluralLabel() {
		return t('app:users.pluralLabel');
	}
	static icon = 'Users';
	// Grouped with Paramètres (not a standalone top-level section) so it
	// reads as part of "settings" in the sidebar — a TableBlock embed inside
	// ParametresPage itself was tried first, but KratosJS only enriches row
	// actions with the `hasHandler` flag (and resolves edit/delete resource
	// slugs) via a resource's own schema route; a table embedded in a Page
	// via TableBlock never gets that, so every row action (including "Lien
	// de configuration du mot de passe") silently no-ops. Keeping this as
	// the resource's real route is what makes those actions work at all.
	static getNavigationGroup() {
		return t('app:pages.system');
	}
	static navigationSort = 2;

	static recordTitleAttribute = (record: any) =>
		record.lastname ? `${record.firstname} ${record.lastname}` : record.firstname;
	static recordFeaturedImageAttribute = 'profileMediaImage';
	static globallySearchableAttributes = ['firstname', 'lastname', 'email'];

	static form() {
		// No password field — SuperAdmin never sets one directly. A brand-new
		// account (or one being reset) gets a password only via the "Lien de
		// configuration du mot de passe" row action (src/actions/userActions.ts),
		// which the collaborator uses to choose their own.
		return FormBuilder.make().schema([
			FileUpload.make('profileMediaImage').label(t('app:users.form.profileMediaImage.label')).image(),
			TextInput.make('firstname').label(t('app:users.fields.firstname')).required().min(2).max(50),
			TextInput.make('lastname').label(t('app:users.fields.lastname')).max(50),
			TextInput.make('email').label(t('app:users.fields.email')).email().required(),
			TextInput.make('phone').label(t('app:users.fields.phone')).placeholder(t('app:users.form.phone.placeholder')),
			SelectInput.make('role').label(t('app:users.fields.role')).options(ROLE_LABELS).default('agent').required(),
			Toggle.make('active').label(t('app:common.active')).default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				ImageColumn.make('profileMediaImage').label(t('app:users.columns.photo')).circular(),
				TextColumn.make('firstname').label(t('app:users.fields.firstname')).sortable().searchable(),
				TextColumn.make('lastname').label(t('app:users.fields.lastname')).sortable().searchable(),
				TextColumn.make('email').label(t('app:users.fields.email')).sortable().searchable(),
				BadgeColumn.make('role')
					.label(t('app:users.fields.role'))
					.formatStateUsing((value: string) => ROLE_LABELS[value as keyof typeof ROLE_LABELS] ?? value)
					.sortable(),
				TextColumn.make('netGenerated')
					.label(t('app:users.columns.netGenerated'))
					.formatStateUsing(async (_value: any, row: any) => {
						if (row.role !== 'agent') return '—';
						const em = UserResource.getPanel().getEm().fork();
						const total = await netGeneratedByAgent(em, row.id);
						return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(total);
					}),
				TextColumn.make('passwordStatus')
					.label(t('app:users.columns.passwordStatus'))
					.formatStateUsing(async (_value: any, row: any) => {
						// Raw query, not the already-serialized `row` — `password`/
						// `passwordSetupToken` are `hidden: true` on the entity (never
						// sent to the client), so they aren't on `row` at all.
						const em = UserResource.getPanel().getEm().fork();
						const user: any = await em.findOne(User, { id: row.id });
						if (user?.password) return t('app:users.status.configured');
						if (user?.passwordSetupToken && user.passwordSetupExpiresAt && user.passwordSetupExpiresAt.getTime() > Date.now()) {
							return t('app:users.status.linkSent');
						}
						return t('app:users.status.toConfigure');
					}),
				// Toasts vanish after a few seconds with no way to copy the link —
				// this makes the current link durably visible/selectable for as
				// long as it's valid (48h), instead of only right after clicking
				// "Générer un lien" (see userActions.ts's generatePasswordLink).
				TextColumn.make('passwordSetupLink')
					.label(t('app:users.columns.passwordSetupLink'))
					.formatStateUsing(async (_value: any, row: any) => {
						const em = UserResource.getPanel().getEm().fork();
						const user: any = await em.findOne(User, { id: row.id });
						const valid =
							user?.passwordSetupToken && user.passwordSetupExpiresAt && user.passwordSetupExpiresAt.getTime() > Date.now();
						if (!valid) return '—';
						return `${getPublicUrl()}/set-password?token=${user.passwordSetupToken}`;
					}),
				ToggleColumn.make('active').label(t('app:common.active')).sortable(),
				TextColumn.make('createdAt').label(t('app:common.createdAt')).sortable().dateTime(),
			])
			.actions(userRowActions())
			.searchable()
			.paginate(10)
			.defaultSort('createdAt', 'desc');
	}

	static hooks() {
		return userHooks;
	}

	static actions() {
		return userActionHandlers(this);
	}

	static widgets(): Widget[] {
		return [
			StatsWidget.make('users.totalUsers')
				.label(t('app:users.widgets.totalUsers'))
				.icon('Users')
				.render(async (em, entity) => em.count(entity, {})),

			StatsWidget.make('users.activeAgents')
				.label(t('app:users.widgets.activeAgents'))
				.icon('UserCheck')
				.render(async em => em.count(User, { active: true } as any)),
		];
	}
}
