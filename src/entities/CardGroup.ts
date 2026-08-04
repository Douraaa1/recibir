import { EntitySchema } from '@mikro-orm/core';
import { User } from './User';

export interface ICardGroup {
	id: number;
	name: string;
	agent: any;
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
 * `agent` is the group's standing assignment — the agent who works every
 * cycle run against it. WithdrawalCycle creation derives its shifts' agent
 * from here instead of asking the admin to pick one each time (see
 * withdrawalCycleHooks.ts). Nullable so existing groups created before this
 * field existed don't break schema sync; the resource form requires it for
 * new/edited groups going forward.
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
		agent: { kind: 'm:1', entity: () => User, nullable: true },
		active: { type: 'boolean', default: true },
		note: { type: 'text', nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
