import {
	BaseResource,
	FormBuilder,
	TextInput,
	Section,
	TableBuilder,
	TextColumn,
} from '@maxal_studio/kratosjs';
import { Setting } from '../entities/Setting';

export class SettingResource extends BaseResource {
	static slug = 'settings';

	static entity = Setting;

	static label = 'Paramètres';
	static pluralLabel = 'Paramètres';
	static icon = 'Settings';
	static navigationGroup = 'Système';
	static navigationSort = 1;

	// Exactly one row (id 1, seeded by seedSettings.ts) — configuration only.
	static canCreate = false;
	static canDelete = false;

	static recordTitleAttribute = () => 'Configuration';

	static form() {
		return FormBuilder.make().schema([
			Section.make('Configuration des Frais')
				.collapsed(false)
				.schema([
					TextInput.make('feeRate')
						.label('Taux par défaut')
						.helperText('Ex: 0.01 = 1% du montant envoyé')
						.type('number')
						.required()
						.minValue(0.001)
						.maxValue(0.05)
						.step(0.001),
					TextInput.make('minFee').label('Frais Minimum (GNF)').type('number').required().minValue(0),
					TextInput.make('maxFee').label('Frais Maximum (GNF)').type('number').required().minValue(0),
				]),
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
			TextColumn.make('feeRate').label('Taux'),
			TextColumn.make('minFee').label('Frais Min').money('GNF'),
			TextColumn.make('maxFee').label('Frais Max').money('GNF'),
			TextColumn.make('sessionTimeoutMinutes').label('Timeout (min)'),
			TextColumn.make('updatedAt').label('Mis à jour').dateTime(),
		]);
	}
}
