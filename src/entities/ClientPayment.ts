import { EntitySchema } from '@mikro-orm/core';
import { User } from './User';

export type ClientPaymentStatus = 'pending' | 'validated' | 'refused' | 'cancelled';

export interface IClientPayment {
	id: number;
	agent: any;
	senderName: string;
	clientName: string;
	recipientPhone?: string;
	code: string;
	amountAED: number;
	note?: string;
	status: ClientPaymentStatus;
	validatedAt?: Date | null;
	refusedAt?: Date | null;
	cancelledAt?: Date | null;
	createdAt: Date;
}

/**
 * A payout to a client in Dubai, funded from the shared AED treasury (the
 * pool built up from Shift.expectedAED - Shift.wrongfulDebitAED across all
 * shifts, minus what's already validated here — see ShiftResource's
 * treasury widgets).
 *
 * Two-person control: AdminGN (superviseur) initiates a payment (`pending`),
 * entering the sender's identity (`senderName` — an external person, not a
 * system User) and the recipient's name (required) and phone (optional —
 * not every recipient's number is on hand when the payment is initiated).
 * AdminEAU (chef_equipe) then validates or refuses it (see
 * clientPaymentActions.ts) — only a `validated` payment counts against the
 * treasury. SuperAdmin can cancel a validated payment (excluding it from the
 * treasury sum again, same as refused) or edit one, but nobody else can
 * touch a payment once it's past `pending`.
 *
 * `code` is system-generated (`env-0001`, `env-0002`, ...) in
 * clientPaymentHooks — never entered by hand, unlike the 7-digit code this
 * field held in an earlier iteration of this feature.
 *
 * `senderName` defaults to '' purely so this migrates cleanly onto
 * production's existing rows (added by an earlier version of this feature,
 * before the field existed — `ALTER TABLE ... NOT NULL` with no default
 * fails against real data). `.required()` on the form
 * (ClientPaymentResource) is what actually enforces it's filled in for
 * every new payment; the empty-string default only ever shows up on
 * payments that predate this field existing.
 */
export const ClientPayment = new EntitySchema<IClientPayment>({
	name: 'ClientPayment',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		agent: { kind: 'm:1', entity: () => User },
		senderName: { type: 'string', default: '' },
		clientName: { type: 'string' },
		recipientPhone: { type: 'string', nullable: true },
		code: { type: 'string', unique: true },
		amountAED: { type: 'float' },
		note: { type: 'text', nullable: true },
		status: { type: 'string', default: 'pending' },
		validatedAt: { type: 'Date', nullable: true },
		refusedAt: { type: 'Date', nullable: true },
		cancelledAt: { type: 'Date', nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
