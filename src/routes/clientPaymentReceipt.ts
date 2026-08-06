import PDFDocument from 'pdfkit';
import { adminRoute, getRequestContext, t, type Panel } from '@maxal_studio/kratosjs';
import { ClientPayment } from '../entities/ClientPayment';
import { isAdminLike, isTeamLead } from '../utils/roles';

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

		doc.fontSize(18).text('RECIBIR', { align: 'center' });
		doc.fontSize(12).fillColor('#555').text(t('app:clientPayments.receipt.title'), { align: 'center' });
		doc.moveDown(1.5);
		doc.fillColor('#000').fontSize(14).text(payment.code, { align: 'center' });
		doc.moveDown(1.5);

		const row = (label: string, value: string) => {
			doc.fontSize(10).fillColor('#555').text(label);
			doc.fontSize(13).fillColor('#000').text(value);
			doc.moveDown(0.8);
		};

		row(t('app:clientPayments.receipt.sender'), `${payment.senderFirstname} ${payment.senderLastname}`);
		row(t('app:clientPayments.receipt.recipient'), payment.clientName);
		row(t('app:clientPayments.receipt.recipientPhone'), payment.recipientPhone);
		row(t('app:common.amountAED'), new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'AED' }).format(payment.amountAED));
		row(t('app:clientPayments.receipt.status'), statusLabel(payment.status));
		row(t('app:clientPayments.receipt.date'), new Date(payment.createdAt).toLocaleDateString('fr-FR'));
		if (payment.note) row(t('app:common.note'), payment.note);

		doc.moveDown(1);
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
