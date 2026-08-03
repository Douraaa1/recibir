import { EntitySchema } from '@mikro-orm/core';

export interface ICardGroup {
	id: number;
	name: string;
	active: boolean;
	note?: string;
	createdAt: Date;
}

/**
 * A named batch of prepaid cards (each capped at a low ceiling, hence the
 * need for several per group). Reused indefinitely: the same group is
 * recharged and fully withdrawn (over two shifts — see Shift) repeatedly
 * over time, each recharge being a new cycle tracked as a pair of Shifts.
 *
 * Card count isn't stored here — it's a live count of Card rows pointing at
 * this group (see CardGroupResource's table), so it can never drift from
 * what's actually been assigned.
 */
export const CardGroup = new EntitySchema<ICardGroup>({
	name: 'CardGroup',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		name: { type: 'string', unique: true },
		active: { type: 'boolean', default: true },
		note: { type: 'text', nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
