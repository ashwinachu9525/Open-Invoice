const fs = require('fs');
let c = fs.readFileSync('src/components/forms/quotation-form.tsx', 'utf8');

c = c.replace(/InvoiceFormProps/g, 'QuotationFormProps');
c = c.replace(/InvoiceForm/g, 'QuotationForm');
c = c.replace(/invoiceId/g, 'quotationId');
c = c.replace(/defaultInvoiceNumber/g, 'defaultQuotationNumber');
c = c.replace(/createInvoice/g, 'createQuotation');
c = c.replace(/updateInvoice/g, 'updateQuotation');
c = c.replace(/invoiceNumber/g, 'quotationNumber');
c = c.replace(/\/invoices\//g, '/quotations/');
c = c.replace(/Invoice Details/g, 'Quotation Details');
c = c.replace(/Invoice #/g, 'Quotation #');
c = c.replace(/Invoice Design/g, 'Quotation Design');
c = c.replace(/Creating Invoice/g, 'Creating Quotation');
c = c.replace(/Create Invoice/g, 'Create Quotation');

fs.writeFileSync('src/components/forms/quotation-form.tsx', c);
