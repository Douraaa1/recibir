import { Page, FormBlock, TableBlock, type Block } from '@maxal_studio/kratosjs';
import { TwoFactorSetupBlock } from '@maxal_studio/kratosjs-plugin-2fa';
import { SettingResource } from '../resources/SettingResource';
import { ExchangeRateResource } from '../resources/ExchangeRateResource';
import { isAdminLike } from '../utils/roles';

// Open to every logged-in user (not admin-only) so every role can still
// reach two-factor setup — the 2FA plugin's own standalone page is hidden
// from nav (see src/index.ts) in favor of embedding TwoFactorSetupBlock
// here, and self-service 2FA has to stay reachable for everyone. The
// session-timeout and exchange-rate blocks below are still business-wide
// config, so those stay admin/superviseur-only via the role check in
// blocks().
export class ParametresPage extends Page {
	static slug = 'parametres';
	static label = 'Paramètres';
	static icon = 'Settings';
	static navigationGroup = 'Système';
	static navigationSort = 1;

	static async blocks() {
		const isAdmin = isAdminLike(this.getContext()?.user?.role);

		// No .title()/.subtitle() here — the block's own card already renders a
		// heading + description (translated via the '2fa' catalog in src/index.ts).
		const blocks: Block[] = [TwoFactorSetupBlock.make().columns(12)];

		if (isAdmin) {
			blocks.push(
				FormBlock.make(SettingResource.form())
					.dataUrl('settings/1')
					.submitUrl('settings/update/1')
					.columns(12)
					.title('Sécurité')
					.subtitle('Timeout de session avant déconnexion automatique.'),
				TableBlock.make(ExchangeRateResource.table())
					.dataUrl('exchange-rates/list')
					.columns(12)
					.title('Taux de Change')
					.subtitle('1 unité de devise = X GNF. GNF reste fixé à 1 (devise pivot).'),
			);
		}

		return blocks;
	}
}
