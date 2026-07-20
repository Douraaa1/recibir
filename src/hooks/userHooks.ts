import { hashPassword, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';

const capitalize = (str: string | undefined): string => {
	if (!str || typeof str !== 'string') return str || '';
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const userHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;

			if (data.firstname) {
				data.firstname = capitalize(data.firstname);
			}
			if (data.lastname) {
				data.lastname = capitalize(data.lastname);
			}
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;

			if (data.firstname) {
				data.firstname = capitalize(data.firstname);
			}
			if (data.lastname) {
				data.lastname = capitalize(data.lastname);
			}
		},
	],
	// Hash the password AFTER validation, so length rules (e.g. min/max) check the
	// raw password the user typed — not the 60-char bcrypt hash. This handler runs
	// for both create and update. On update, an empty password is dropped so it
	// doesn't overwrite the stored hash.
	afterValidate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;

			if (data.password) {
				data.password = await hashPassword(data.password);
			} else {
				delete data.password;
			}
		},
	],
};
