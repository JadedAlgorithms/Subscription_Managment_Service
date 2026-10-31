import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceModel, UserSafe, InvoiceStatus } from '../types';

/**
 * Generates and downloads a branded, high-fidelity PDF invoice for Brightloop Software.
 */
export function generateInvoicePdf(invoice: InvoiceModel, customerFallback?: UserSafe | null): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // --------------------------------------------------------------------------
  // Header Banner / Branding
  // --------------------------------------------------------------------------
  // Top decorative brand bar
  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Company Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('BRIGHTLOOP', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Enterprise Subscription Engine & Recurring Revenue', margin, 25);
  doc.text('Brightloop Technologies HQ • support@brightloop.io • www.brightloop.io', margin, 29);

  // Invoice Title & Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

  // Invoice Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(14, 165, 233);
  doc.text(invoice.invoiceNumber, pageWidth - margin, 26, { align: 'right' });

  // Status Badge Pill
  const statusColors: Record<InvoiceStatus, [number, number, number]> = {
    [InvoiceStatus.PAID]: [16, 185, 129], // emerald-500
    [InvoiceStatus.CONFIRMED]: [245, 158, 11], // amber-500
    [InvoiceStatus.DRAFT]: [100, 116, 139], // slate-500
    [InvoiceStatus.CANCELLED]: [244, 63, 94], // rose-500
  };
  const [r, g, b] = statusColors[invoice.status] || [100, 116, 139];
  doc.setFillColor(r, g, b);
  doc.roundedRect(pageWidth - margin - 28, 29, 28, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.status, pageWidth - margin - 14, 33.2, { align: 'center' });

  // Thin separator rule
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, 38, pageWidth - margin, 38);

  // --------------------------------------------------------------------------
  // Metadata & Customer Information Box
  // --------------------------------------------------------------------------
  const clientObj = invoice.customer || customerFallback;
  const customerName = clientObj
    ? `${clientObj.firstName} ${clientObj.lastName}`
    : 'Valued Customer';
  const companyName = clientObj?.companyName || '';
  const customerEmail = clientObj?.email || '';

  // Left Column: Billed To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO', margin, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName, margin, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let billToY = 57;
  if (companyName) {
    doc.text(companyName, margin, billToY);
    billToY += 4.5;
  }
  if (customerEmail) {
    doc.text(customerEmail, margin, billToY);
    billToY += 4.5;
  }

  // Right Column: Dates & References
  const metaX = pageWidth - margin - 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  doc.text('Issue Date:', metaX, 46);
  doc.text('Due Date:', metaX, 51);
  doc.text('Billing Period:', metaX, 56);
  if (invoice.subscription?.subscriptionNumber) {
    doc.text('Subscription Ref:', metaX, 61);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const issueDateFormatted = invoice.issueDate
    ? new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';
  const dueDateFormatted = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';
  const periodFormatted = `${new Date(invoice.billingPeriodStart).toLocaleDateString()} - ${new Date(invoice.billingPeriodEnd).toLocaleDateString()}`;

  doc.text(issueDateFormatted, pageWidth - margin, 46, { align: 'right' });
  doc.text(dueDateFormatted, pageWidth - margin, 51, { align: 'right' });
  doc.text(periodFormatted, pageWidth - margin, 56, { align: 'right' });
  if (invoice.subscription?.subscriptionNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.subscription.subscriptionNumber, pageWidth - margin, 61, { align: 'right' });
  }

  // --------------------------------------------------------------------------
  // Line Items Table
  // --------------------------------------------------------------------------
  const startY = Math.max(billToY + 6, 68);

  const tableBody =
    invoice.lineItems && invoice.lineItems.length > 0
      ? invoice.lineItems.map((item, index) => [
          String(index + 1),
          item.description || 'Subscription Line Item',
          String(item.quantity),
          `$${Number(item.unitPrice).toFixed(2)}`,
          Number(item.taxAmount) > 0 ? `$${Number(item.taxAmount).toFixed(2)}` : '$0.00',
          `$${Number(item.totalAmount).toFixed(2)}`,
        ])
      : [
          [
            '1',
            `Recurring Subscription Service (${periodFormatted})`,
            '1',
            `$${Number(invoice.subtotal).toFixed(2)}`,
            `$${Number(invoice.taxAmount).toFixed(2)}`,
            `$${Number(invoice.totalAmount).toFixed(2)}`,
          ],
        ];

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Tax', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
  });

  // --------------------------------------------------------------------------
  // Financial Summary Block
  // --------------------------------------------------------------------------
  // @ts-expect-error autoTable plugin mutates doc with lastAutoTable
  const finalY = (doc.lastAutoTable?.finalY || startY + 40) + 6;

  const totalsBoxWidth = 80;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, finalY, totalsBoxWidth, 42, 2, 2, 'FD');

  const subtotal = Number(invoice.subtotal || 0).toFixed(2);
  const tax = Number(invoice.taxAmount || 0).toFixed(2);
  const discount = Number(invoice.discountAmount || 0).toFixed(2);
  const total = Number(invoice.totalAmount || 0).toFixed(2);
  const paid = Number(invoice.amountPaid || 0).toFixed(2);
  const balance = Number(invoice.balanceDue || 0).toFixed(2);

  let currentTotalY = finalY + 6;

  const renderSummaryRow = (label: string, value: string, isBold = false, isAccent = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, totalsBoxX + 4, currentTotalY);

    if (isAccent) {
      doc.setTextColor(Number(balance) <= 0 ? 16 : 217, Number(balance) <= 0 ? 185 : 119, Number(balance) <= 0 ? 129 : 6);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(value, totalsBoxX + totalsBoxWidth - 4, currentTotalY, { align: 'right' });
    currentTotalY += 5.5;
  };

  renderSummaryRow('Subtotal:', `$${subtotal}`);
  renderSummaryRow('Tax Amount:', `$${tax}`);
  if (Number(discount) > 0) {
    renderSummaryRow('Discount Applied:', `-$${discount}`);
  }
  renderSummaryRow('Total Invoice Amount:', `$${total}`, true);
  renderSummaryRow('Amount Paid:', `$${paid}`);

  // Divider inside summary
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsBoxX + 4, currentTotalY - 1.5, totalsBoxX + totalsBoxWidth - 4, currentTotalY - 1.5);
  currentTotalY += 2;

  renderSummaryRow('Balance Due:', `$${balance}`, true, true);

  // --------------------------------------------------------------------------
  // Payment Reconciliation Notes (Left of Totals)
  // --------------------------------------------------------------------------
  if (invoice.payments && invoice.payments.length > 0) {
    const payX = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Reconciliation Log', payX, finalY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    let payY = finalY + 10;
    invoice.payments.forEach((p) => {
      const pDate = new Date(p.paidAt || invoice.issueDate).toLocaleDateString();
      const pText = `• ${pDate} - ${p.paymentMethod} (Ref: ${p.transactionReference || 'N/A'}): $${Number(p.amount).toFixed(2)}`;
      doc.text(pText, payX, payY);
      payY += 4.5;
    });
  }

  // --------------------------------------------------------------------------
  // Footer & Remit Information
  // --------------------------------------------------------------------------
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    'Thank you for your business. For any questions regarding this invoice, contact support@brightloop.io.',
    margin,
    footerY + 5
  );
  doc.text(
    `Brightloop Subscription Management System • Generated on ${new Date().toLocaleString()}`,
    margin,
    footerY + 9
  );

  // Trigger browser download
  const cleanFilename = `${invoice.invoiceNumber || 'Invoice'}.pdf`;
  doc.save(cleanFilename);
}
