import { t } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { WrongfulDebit } from '../entities/WrongfulDebit';
import { WithdrawalCycle } from '../entities/WithdrawalCycle';

/**
 * What a cycle's two shifts have accounted for so far, against its
 * `expectedAED` ceiling. Every wrongful debit counts here regardless of
 * refund status — a bank refund is a separate compensating transaction, it
 * doesn't undo the fact that the card was drained by that amount at the ATM.
 * (Contrast with Trésorerie, which only counts *outstanding* — not yet
 * refunded — wrongful debits, since that's about cash on hand right now.)
 */
export async function getCycleUsage(
	em: any,
	cycleId: number,
): Promise<{ expectedAED: number; withdrawn: number; wrongfulTotal: number; total: number }> {
	const cycle = await em.findOne(WithdrawalCycle, { id: cycleId });
	const shifts = await em.find(Shift, { cycle: cycleId } as any);
	const withdrawn = shifts.reduce((sum: number, s: any) => sum + s.withdrawnAED, 0);
	const shiftIds = shifts.map((s: any) => s.id);
	const debits = shiftIds.length ? await em.find(WrongfulDebit, { shift: { $in: shiftIds } } as any) : [];
	const wrongfulTotal = debits.reduce((sum: number, d: any) => sum + d.amountAED, 0);
	return {
		expectedAED: cycle?.expectedAED ?? 0,
		withdrawn,
		wrongfulTotal,
		total: withdrawn + wrongfulTotal,
	};
}

/** Throws if `withdrawn + wrongfulDebits` (with the given deltas applied) would exceed the cycle's Attendu. */
export async function assertWithinExpected(
	em: any,
	cycleId: number,
	deltas: { withdrawnDelta?: number; wrongfulDebitDelta?: number },
): Promise<void> {
	const usage = await getCycleUsage(em, cycleId);
	const projected = usage.total + (deltas.withdrawnDelta ?? 0) + (deltas.wrongfulDebitDelta ?? 0);
	if (projected > usage.expectedAED + 0.01) {
		throw new Error(
			t('app:withdrawalCycles.errors.exceedsExpected', {
				projected: projected.toFixed(2),
				expected: usage.expectedAED.toFixed(2),
			}),
		);
	}
}
