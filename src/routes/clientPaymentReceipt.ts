import path from 'path';
import PDFDocument from 'pdfkit';
import { adminRoute, getRequestContext, t, type Panel } from '@maxal_studio/kratosjs';
import { ClientPayment } from '../entities/ClientPayment';
import { isAdminLike, isTeamLead } from '../utils/roles';
import { formatCurrency } from '../utils/formatMoney';

// `assets/` lives at the project root, outside `src/` — it isn't part of the
// TypeScript build, so resolving it relative to __dirname (not process.cwd())
// is what makes this work identically in dev (tsx runs src/routes directly)
// and in prod (compiled to dist/routes): both sit two directories below the
// project root, so '../../assets/...' lands in the same place either way.
const ASSETS_DIR = path.resolve(__dirname, '../../assets/assets reçu');
const LOGO_PATH = path.join(ASSETS_DIR, 'enviar_transfert_logo-removebg-preview.png');
const WATERMARK_PATH = path.join(ASSETS_DIR, 'logo e enviar.png');
const QR_PATH = path.join(ASSETS_DIR, 'enviar-transfert-qr-code.png');

// As given, with only the one unambiguous spelling fix ('raod' -> 'Road') —
// not otherwise reinterpreting the place names.
const COMPANY_ADDRESS_LINE1 = 'Sabkha Road, AYAL Nasser, Al Hello Bldg';
const COMPANY_ADDRESS_LINE2 = '+971 56 780 3061';

function statusLabel(status: string): string {
	const labels: Record<string, string> = {
		pending: t('app:clientPayments.status.pending'),
		validated: t('app:clientPayments.status.validated'),
		refused: t('app:clientPayments.status.refused'),
		cancelled: t('app:clientPayments.status.cancelled'),
	};
	return labels[status] ?? status;
}

function buildReceiptPdf(payment: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A5', margin: 40 });
		const chunks: Buffer[] = [];
		doc.on('data', chunk => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		const margin = 40;
		const pageWidth = doc.page.width;
		const pageHeight = doc.page.height;
		const contentWidth = pageWidth - margin * 2;

		// Watermark first — everything else draws on top of it. Full opacity is
		// restored right after so it doesn't bleed into the real content.
		const wmSize = 260;
		doc.opacity(0.06).image(WATERMARK_PATH, (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2, { width: wmSize });
		doc.opacity(1);

		// Header: logo top-left, company address top-right, on the same row.
		const logoWidth = 130;
		doc.image(LOGO_PATH, margin, margin, { width: logoWidth });
		doc
			.fontSize(8)
			.fillColor('#555')
			.text(COMPANY_ADDRESS_LINE1, margin, margin + 4, { width: contentWidth, align: 'right' })
			.text(COMPANY_ADDRESS_LINE2, { width: contentWidth, align: 'right' });

		// Logo is a square canvas but only ~2/3 of it is actually glyphs —
		// fixed offset clears it without leaving a huge gap.
		doc.y = margin + 95;

		doc.fillColor('#000').fontSize(12).text(t('app:clientPayments.receipt.title'), { align: 'center' });
		doc.moveDown(0.6);
		doc.fontSize(15).text(payment.code, { align: 'center' });
		doc.moveDown(1);

		const row = (label: string, value: string) => {
			doc.fontSize(10).fillColor('#555').text(label, margin, doc.y, { width: contentWidth });
			doc.fontSize(13).fillColor('#000').text(value, margin, doc.y, { width: contentWidth });
			doc.moveDown(0.45);
		};

		row(t('app:clientPayments.receipt.sender'), payment.senderName || '—');
		row(t('app:clientPayments.receipt.recipient'), payment.clientName);
		row(t('app:clientPayments.receipt.recipientPhone'), payment.recipientPhone || '—');
		row(t('app:common.amountAED'), formatCurrency(payment.amountAED, 'AED'));
		row(t('app:clientPayments.receipt.status'), statusLabel(payment.status));
		row(t('app:clientPayments.receipt.date'), new Date(payment.createdAt).toLocaleDateString('fr-FR'));

		// QR + footer anchored below whatever content ended up above (a long
		// note can push this down) rather than pinned to a fixed page
		// coordinate, so they never overlap.
		doc.moveDown(0.8);
		const qrSize = 75;
		const qrX = (pageWidth - qrSize) / 2;
		const qrY = doc.y;
		doc.image(QR_PATH, qrX, qrY, { width: qrSize });
		doc.fontSize(8).fillColor('#888').text(t('app:clientPayments.receipt.qrCaption'), margin, qrY + qrSize + 4, {
			width: contentWidth,
			align: 'center',
		});

		doc.moveDown(1.2);
		doc.fontSize(9).fillColor('#888').text(t('app:clientPayments.receipt.footer'), { align: 'center' });

		doc.end();
	});
}

// Public-URL PDF download, not a JSON API response — see
// clientPaymentActions.ts's downloadReceipt handler for why this has to be
// a real route (browsers only trigger a Content-Disposition download on an
// actual navigation, not a fetch()). adminRoute(panel) still requires auth;
// the role check below is the real gate (mirrors every other resource's
// server-side backstop — never trust that the row action was hidden).
export function registerClientPaymentReceiptRoute(panel: Panel): void {
	panel.route('get', '/client-payments/:id/receipt.pdf', adminRoute(panel), async (req, reply) => {
		const role = getRequestContext()?.user?.role;
		if (!isAdminLike(role) && !isTeamLead(role)) {
			reply.status(403).json({ message: t('app:clientPayments.errors.receiptForbidden') });
			return;
		}

		const id = Number(req.params.id);
		const em = panel.getEm().fork();
		const payment = await em.findOne(ClientPayment, { id } as any);
		if (!payment) {
			reply.status(404).json({ message: t('app:clientPayments.errors.notFound') });
			return;
		}

		const pdf = await buildReceiptPdf(payment);
		reply
			.header('Content-Type', 'application/pdf')
			.header('Content-Disposition', `attachment; filename="recu-${payment.code}.pdf"`)
			.send(pdf);
	});
}
