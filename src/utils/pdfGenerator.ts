import { jsPDF } from 'jspdf';
import { BillItem, StoreProfile } from '../types';

export interface BillPrintData {
  store: StoreProfile;
  invoiceNo: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Generates and downloads a clean, professional PDF Invoice using jsPDF
 */
export function generateBillPDF(data: BillPrintData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = 18;

  // Header background banner
  doc.setFillColor(24, 24, 27); // neutral-900
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  // Store Name in Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(data.store.name.toUpperCase(), margin + 6, currentY + 10);

  // Tagline / Store Type
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 212, 216);
  doc.text(data.store.tagline || 'Retail Grocery & Kirana Store', margin + 6, currentY + 16);

  // TAX INVOICE tag on top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // Emerald
  doc.text('TAX INVOICE / CASH BILL', pageWidth - margin - 6, currentY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Ph: ${data.store.phone || '+91 98765 43210'}`, pageWidth - margin - 6, currentY + 16, { align: 'right' });

  currentY += 30;

  // Invoice Meta Section (Two columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('INVOICE DETAILS:', margin, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS:', margin + 90, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);

  doc.text(`Invoice No: ${data.invoiceNo}`, margin, currentY);
  doc.text(`Billed To: ${data.customerName || 'Walk-in Customer'}`, margin + 90, currentY);

  currentY += 4.5;
  doc.text(`Date & Time: ${data.date}`, margin, currentY);
  if (data.customerPhone) {
    doc.text(`Mobile: ${data.customerPhone}`, margin + 90, currentY);
  } else {
    doc.text('Payment: Cash / UPI', margin + 90, currentY);
  }

  currentY += 4.5;
  doc.text(`Store Address: ${data.store.address || 'Market Road, Main Bazar'}`, margin, currentY);
  if (data.store.gstin) {
    doc.text(`GSTIN: ${data.store.gstin}`, margin + 90, currentY);
  }

  currentY += 10;

  // Table Headers
  const colX = {
    sno: margin + 3,
    item: margin + 14,
    qty: margin + 95,
    rate: margin + 125,
    amount: pageWidth - margin - 5
  };

  doc.setFillColor(243, 244, 246);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);

  doc.text('#', colX.sno, currentY + 5.5);
  doc.text('ITEM DESCRIPTION', colX.item, currentY + 5.5);
  doc.text('QTY / UNIT', colX.qty, currentY + 5.5);
  doc.text('RATE (Rs.)', colX.rate, currentY + 5.5);
  doc.text('AMOUNT (Rs.)', colX.amount, currentY + 5.5, { align: 'right' });

  currentY += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  data.items.forEach((item, index) => {
    // Check if new page is needed
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    const rowHeight = 7.5;
    
    // Light alternate background
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    doc.setTextColor(75, 85, 99);
    doc.text(`${index + 1}`, colX.sno, currentY + 5);

    // Item name
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    const itemName = item.name.length > 38 ? item.name.substring(0, 36) + '...' : item.name;
    doc.text(itemName, colX.item, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const qtyText = item.type === 'item' ? `${item.quantity} ${item.unit}` : '1 entry';
    doc.text(qtyText, colX.qty, currentY + 5);

    const rateText = item.type === 'item' ? `${item.unitPrice.toFixed(2)}/${item.unit}` : '-';
    doc.text(rateText, colX.rate, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`${item.amount.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right' });

    currentY += rowHeight;
  });

  // Bottom table line
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // Totals & Summary Box on right side
  const summaryBoxWidth = 75;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);

  // Subtotal
  doc.text('Subtotal:', summaryX, currentY);
  doc.text(`Rs. ${data.subtotal.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });
  currentY += 5;

  // Discount (if any)
  if (data.discountAmount > 0) {
    doc.setTextColor(185, 28, 28);
    const discLabel = data.discountPercent > 0 ? `Discount (${data.discountPercent}%):` : 'Discount:';
    doc.text(discLabel, summaryX, currentY);
    doc.text(`- Rs. ${data.discountAmount.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });
    currentY += 5;
  }

  // Tax (if any)
  if (data.taxAmount > 0) {
    doc.setTextColor(75, 85, 99);
    const taxLabel = data.taxPercent > 0 ? `GST / Tax (${data.taxPercent}%):` : 'GST / Tax:';
    doc.text(taxLabel, summaryX, currentY);
    doc.text(`+ Rs. ${data.taxAmount.toFixed(2)}`, pageWidth - margin - 2, currentY, { align: 'right' });
    currentY += 5;
  }

  // Grand Total Highlight Bar
  currentY += 2;
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(summaryX - 4, currentY, summaryBoxWidth + 4, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', summaryX, currentY + 7);
  doc.text(`Rs. ${data.grandTotal.toFixed(2)}`, pageWidth - margin - 2, currentY + 7, { align: 'right' });

  // Items count note on left side
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Total Items: ${data.items.length}`, margin, currentY - 5);
  doc.text('Thank you for your business! Visit again.', margin, currentY);

  // Footer separator
  currentY += 20;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('This is a computer generated bill created with WriteCalc Smart POS.', margin, currentY);
  doc.text('Authorized Signatory: _________________', pageWidth - margin, currentY, { align: 'right' });

  // Save the PDF
  doc.save(`Invoice_${data.invoiceNo}.pdf`);
}
