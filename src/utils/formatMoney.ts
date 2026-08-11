// Shared number/currency formatter used both server-side (formatStateUsing
// callbacks, the PDF receipt) and client-side (the custom StatsWidget in
// src/admin/CustomStatsWidget.tsx) — dependency-free plain TS so it bundles
// cleanly in both the Node server build and the Vite admin-client build.
//
// KratosJS's own money/number formatting (TextColumn.money(), StatsWidget's
// currency/number format) always runs through `Intl.NumberFormat` client-side
// with either the active app locale or the visitor's own browser locale —
// neither gives a French/African-style "9.300,00" thousands-dot grouping
// (Intl's 'fr' locale uses a space, not a dot). This formatter is the
// deliberate replacement everywhere that grouping matters.
export function formatAmount(value: number, decimals = 2): string {
	const negative = value < 0;
	const abs = Math.abs(value);
	const fixed = abs.toFixed(decimals);
	const [intPart, decPart] = fixed.split('.');
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return `${negative ? '-' : ''}${grouped}${decPart ? ',' + decPart : ''}`;
}

export function formatCurrency(value: number, currency: string, decimals = 2): string {
	return `${formatAmount(value, decimals)} ${currency}`;
}
