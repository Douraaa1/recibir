import { EntitySchema } from '@mikro-orm/core';
import { CardGroup } from './CardGroup';

export interface ICard {
	id: number;
	group: any;
	identifier: string;
	active: boolean;
	createdAt: Date;
}

/** One physical prepaid card, belonging to exactly one CardGroup. */
export const Card = new EntitySchema<ICard>({
	name: 'Card',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		group: { kind: 'm:1', entity: () => CardGroup },
		identifier: { type: 'string', unique: true },
		active: { type: 'boolean', default: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
