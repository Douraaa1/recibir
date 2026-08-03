import type { Exporter } from '@maxal_studio/kratosjs';

// Overrides the csv-export plugin's default exporter (registered under the same
// 'csv' key in src/index.ts — last registerExporter() call wins). Excel's French/EU
// build reads ',' as the decimal separator, so a comma-delimited file opens with
// every column crammed into A; ';' is the delimiter it expects there instead. The
// leading UTF-8 BOM stops Excel from mis-guessing the encoding and mangling accents.
function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	let str: string;
	if (value instanceof Date) {
		str = value.toISOString();
	} else if (typeof value === 'object') {
		str = JSON.stringify(value);
	} else {
		str = String(value);
	}
	if (/[";\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function formatDate(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

export const frenchCsvExporter: Exporter = (rows, columns, ctx) => {
	const header = columns.map(col => escapeCsvField(col.label ?? col.name)).join(';');
	const body = rows.map(row => columns.map(col => escapeCsvField(row[col.name])).join(';')).join('\n');
	const bom = String.fromCharCode(0xfeff);
	const content = bom + (body ? `${header}\n${body}\n` : `${header}\n`);
	return {
		content,
		contentType: 'text/csv;charset=utf-8',
		filename: `${ctx.resourceSlug}-${formatDate()}.csv`,
	};
};
