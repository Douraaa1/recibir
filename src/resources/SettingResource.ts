import { BaseResource, FormBuilder, TextInput, Section, TableBuilder, TextColumn, t } from '@maxal_studio/kratosjs';
import { Setting } from '../entities/Setting';
import { settingHooks } from '../hooks/settingHooks';

export class SettingResource extends BaseResource {
	static slug = 'settings';

	static entity = Setting;

	// Never shown in the sidebar (`hidden` below) — its FormBlock embed in
	// ParametresPage sets its own title/subtitle directly, so getLabel()
	// never actually surfaces. Left as a plain field for that reason.
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

	static recordTitleAttribute = () => t('app:settings.recordTitle');

	static form() {
		return FormBuilder.make().schema([
			Section.make(t('app:settings.section.security'))
				.collapsed(false)
				.schema([
					TextInput.make('sessionTimeoutMinutes')
						.label(t('app:settings.fields.sessionTimeoutMinutes'))
						.helperText(t('app:settings.form.sessionTimeoutMinutes.helperText'))
						.type('number')
						.required()
						.minValue(1)
						.maxValue(240),
				]),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('sessionTimeoutMinutes').label(t('app:settings.columns.timeout')),
			TextColumn.make('updatedAt').label(t('app:common.updatedAt')).dateTime(),
		]);
	}

	static hooks() {
		return settingHooks;
	}
}
