import { BaseResource, FormBuilder, TextInput, Section, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';
import { Setting } from '../entities/Setting';
import { settingHooks } from '../hooks/settingHooks';

export class SettingResource extends BaseResource {
	static slug = 'settings';

	static entity = Setting;

	static label = 'Paramètres';
	static pluralLabel = 'Paramètres';
	static icon = 'Settings';

	// Exactly one row (id 1, seeded by seedSettings.ts) — configuration only.
	static canCreate = false;
	static canDelete = false;
	// No standalone nav entry — embedded as a FormBlock in ParametresPage
	// (alongside Taux de Change) instead. Still fully routable: the page's
	// FormBlock talks to /settings/1 and /settings/update/1 directly.
	static hidden = true;

	static recordTitleAttribute = () => 'Configuration';

	static form() {
		return FormBuilder.make().schema([
			Section.make('Sécurité')
				.collapsed(false)
				.schema([
					TextInput.make('sessionTimeoutMinutes')
						.label('Timeout de session (minutes)')
						.helperText("Déconnexion automatique après cette durée d'inactivité.")
						.type('number')
						.required()
						.minValue(1)
						.maxValue(240),
				]),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('sessionTimeoutMinutes').label('Timeout (min)'),
			TextColumn.make('updatedAt').label('Mis à jour').dateTime(),
		]);
	}

	static hooks() {
		return settingHooks;
	}
}
