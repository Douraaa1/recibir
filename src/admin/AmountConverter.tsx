import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button, Card, Input, Label, Select, TableApiClient, useTranslation } from '@maxal_studio/kratosjs-react';
import { formatCurrency } from '../utils/formatMoney';

const SOURCE_CURRENCIES = ['USD', 'GNF'] as const;
type SourceCurrency = (typeof SOURCE_CURRENCIES)[number];

// Mirrors how kratosjs-react's own app.js resolves the panel's API base path
// client-side — see node_modules/@maxal_studio/kratosjs-react/dist/app.js.
function getApiBaseUrl(): string {
	return (window as any).__VALAJS_API_BASE_PATH__ || '/api';
}

interface Props {
	resourceSlug?: string;
}

// Contributed to the 'form.header' slot (see main.tsx), which renders above
// every resource's create/edit form — this only actually shows its UI on
// Paiements Clients. An agent receives the transfer amount in USD or GNF but
// has to key it in as AED, so this converts it right there using the same
// exchange rates as the "Taux de Change" screen, instead of doing the math
// in a separate app.
export function AmountConverter({ resourceSlug }: Props) {
	const { t } = useTranslation();
	const { setValue } = useFormContext();
	const isClientPayments = resourceSlug === 'client-payments';

	const [rates, setRates] = useState<Record<string, number> | null>(null);
	const [currency, setCurrency] = useState<SourceCurrency>('USD');
	const [amount, setAmount] = useState('');

	useEffect(() => {
		if (!isClientPayments) return;
		const apiBaseUrl = getApiBaseUrl();
		const client = new TableApiClient(apiBaseUrl, `${apiBaseUrl}/exchange-rates`, '/list');
		client
			.fetchData({ perPage: 50 })
			.then(result => {
				const map: Record<string, number> = {};
				for (const row of result.data as any[]) {
					if (row.active) map[row.code] = row.rateToGNF;
				}
				setRates(map);
			})
			.catch(() => setRates({}));
	}, [isClientPayments]);

	// Hooks above must run unconditionally on every form — bail out of
	// rendering only after they've all been called.
	if (!isClientPayments) return null;

	const parsedAmount = parseFloat(amount.replace(',', '.'));
	const aedRate = rates?.AED;
	const sourceRate = rates ? rates[currency] : undefined;
	const canConvert = !!aedRate && !!sourceRate && !Number.isNaN(parsedAmount) && parsedAmount > 0;
	// rateToGNF is "GNF per 1 unit of that currency" (GNF is the pivot) — so
	// converting X of `currency` into AED is X * rate(currency) / rate(AED).
	const converted = canConvert ? (parsedAmount * (sourceRate as number)) / (aedRate as number) : null;
	const roundedConverted = converted !== null ? Math.round(converted * 100) / 100 : null;

	const resultText =
		rates === null
			? t('app:clientPayments.converter.loading')
			: !aedRate || !sourceRate
				? t('app:clientPayments.converter.unavailable')
				: roundedConverted !== null
					? formatCurrency(roundedConverted, 'AED')
					: '—';

	return (
		<Card className="border-dashed">
			<div className="flex flex-wrap items-end gap-3">
				<div>
					<Label htmlFor="amount-converter-currency">{t('app:clientPayments.converter.currency')}</Label>
					<Select
						id="amount-converter-currency"
						value={currency}
						onChange={e => setCurrency(e.target.value as SourceCurrency)}
						className="w-28">
						{SOURCE_CURRENCIES.map(code => (
							<option key={code} value={code}>
								{code}
							</option>
						))}
					</Select>
				</div>
				<div>
					<Label htmlFor="amount-converter-amount">{t('app:clientPayments.converter.amount')}</Label>
					<Input
						id="amount-converter-amount"
						type="number"
						min="0"
						step="any"
						value={amount}
						onChange={e => setAmount(e.target.value)}
						placeholder="0"
						className="w-36"
					/>
				</div>
				<div className="min-w-36 flex-1">
					<p className="mb-1.5 text-sm font-medium text-fg-secondary">{t('app:clientPayments.converter.result')}</p>
					<p className="text-lg font-semibold text-fg">{resultText}</p>
				</div>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={roundedConverted === null}
					onClick={() => {
						if (roundedConverted === null) return;
						setValue('amountAED', roundedConverted, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
					}}>
					{t('app:clientPayments.converter.insert')}
				</Button>
			</div>
		</Card>
	);
}
