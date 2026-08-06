import { Page, FormBlock, TableBlock, t, type Block } from '@maxal_studio/kratosjs';
import { TwoFactorSetupBlock } from '@maxal_studio/kratosjs-plugin-2fa';
import { SettingResource } from '../resources/SettingResource';
import { ExchangeRateResource } from '../resources/ExchangeRateResource';
import { isAdminLike } from '../utils/roles';

export class ParametresPage extends Page {
	static slug = 'parametres';
	// `label`/`navigationGroup` as static *getters*, not plain fields: the
	// sidebar nav listing (`buildPanelMetadata` in the framework) reads
	// `PageClass.label`/`PageClass.navigationGroup` as direct property
	// access, not through a method — a plain field would be frozen at
	// class-definition time, before any request/locale exists. A getter
	// runs fresh on every access, so it resolves t() against the current
	// request's locale correctly (mirrors the getLabel()/getNavigationGroup()
	// method-override pattern used on BaseResource subclasses, which already
	// expose real methods for this).
	static get label() {
		return t('app:pages.parametres.label');
	}
	static icon = 'Settings';
	static get navigationGroup() {
		return t('app:pages.system');
	}
	static navigationSort = 1;

	static async blocks() {
		const role = this.getContext()?.user?.role;
		const isAdmin = isAdminLike(role);

		const blocks: Block[] = [TwoFactorSetupBlock.make().columns(12)];

		if (isAdmin) {
			blocks.push(
				FormBlock.make(SettingResource.form())
					.dataUrl('settings/1')
					.submitUrl('settings/update/1')
					.columns(12)
					.title(t('app:pages.parametres.security.title'))
					.subtitle(t('app:pages.parametres.security.subtitle')),
				TableBlock.make(ExchangeRateResource.table())
					.dataUrl('exchange-rates/list')
					.columns(12)
					.title(t('app:pages.parametres.exchangeRates.title'))
					.subtitle(t('app:pages.parametres.exchangeRates.subtitle')),
			);
		}

		return blocks;
	}
}
