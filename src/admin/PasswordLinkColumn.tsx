import type { MouseEvent } from 'react';
import { TextColumnComponent, Icon, IconButton, useToast, useTranslation } from '@maxal_studio/kratosjs-react';

interface ColumnProps {
	column: any;
	record: any;
	rowIndex: number;
}

// Registered for the 'password-link' column type (see UserResource.ts, which
// overrides TextColumn's default columnType so only this one column picks up
// this renderer — every other TextColumn in the app keeps the built-in one).
// The link itself is long and awkward to select/copy by hand, so this just
// adds a copy-to-clipboard button next to the same text the built-in
// TextColumnComponent would already render.
export function PasswordLinkColumn(props: ColumnProps) {
	const { column, record } = props;
	const { t } = useTranslation();
	const { success } = useToast();
	const value = record[column.name];

	if (!value || value === '—') {
		return <TextColumnComponent {...props} />;
	}

	const handleCopy = async (e: MouseEvent) => {
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(value);
			success(t('app:users.columns.passwordSetupLink.copied'));
		} catch {
			// Clipboard API can fail (permissions, non-secure context) — the link
			// text itself stays visible/selectable as a fallback either way.
		}
	};

	return (
		<span className="flex items-center gap-1.5">
			<TextColumnComponent {...props} />
			<IconButton
				aria-label={t('app:users.columns.passwordSetupLink.copy')}
				size="sm"
				variant="ghost"
				onClick={handleCopy}>
				<Icon name="Copy" className="h-3.5 w-3.5" />
			</IconButton>
		</span>
	);
}
