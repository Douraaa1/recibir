import { Icon, cn } from '@maxal_studio/kratosjs-react';
import { formatAmount, formatCurrency } from '../utils/formatMoney';

// Drop-in replacement for kratosjs-react's built-in StatsWidget, registered
// in main.tsx (`mountAdminPanel({ widgets: { stats: CustomStatsWidget } })`).
// Identical markup/classes to the original (WidgetShell isn't part of the
// package's public export, so it's inlined here) — the only real change is
// the number formatting: the built-in version always calls
// `Intl.NumberFormat(undefined, ...)` (the visitor's own browser locale, not
// even our app's fr/en switcher), which can't be made to use a thousands dot
// from application code. See src/utils/formatMoney.ts.
interface StatsWidgetProps {
	widget: {
		label?: string;
		icon?: string;
		color?: string;
		format?: 'number' | 'currency' | 'percentage';
		currency?: string;
		precision?: number;
		suffix?: string;
		prefix?: string;
	};
	data: number | null;
}

export function CustomStatsWidget({ widget, data }: StatsWidgetProps) {
	const formatValue = (value: number | null): string => {
		if (value === null || value === undefined) return '—';

		const { format, currency, precision = 0, prefix, suffix } = widget;
		let formatted: string;

		switch (format) {
			case 'currency':
				formatted = formatCurrency(value, currency || 'USD', precision);
				break;
			case 'percentage':
				formatted = `${value.toFixed(precision)}%`;
				break;
			case 'number':
			default:
				formatted = formatAmount(value, precision);
				break;
		}

		if (prefix && format !== 'currency') formatted = `${prefix}${formatted}`;
		if (suffix) formatted = `${formatted} ${suffix}`;
		return formatted;
	};

	return (
		<div
			className={cn(
				'flex h-[10.5rem] flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-hover/20',
				widget.color,
			)}>
			{(widget.label || widget.icon) && (
				<div className="mb-3 flex items-start justify-between gap-2">
					{widget.label ? (
						<p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">{widget.label}</p>
					) : (
						<span />
					)}
					{widget.icon && (
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-fg-secondary shadow-soft-sm">
							<Icon name={widget.icon as any} className="h-4 w-4" />
						</div>
					)}
				</div>
			)}
			<div className="flex min-h-0 flex-1 flex-col">
				<div className="mt-auto">
					<p className="text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">{formatValue(data)}</p>
				</div>
			</div>
		</div>
	);
}
