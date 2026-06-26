import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Open-Invoice Developer API",
      version: "1.0.0",
      description: "Programmatic access to billing, invoices, quotations, and reports. Versioned APIs (`/api/v1/*`) are secured using an API Key. File PDF generators and report exports require session or specific query parameter configurations.",
      contact: {
        name: "Developer Support",
        email: "support@openinvoice.com"
      }
    },
    servers: [
      {
        url: "/",
        "description": "Current Environment Server"
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API Key for authorizing programmatic requests. Obtain this from the settings dashboard."
        }
      },
      schemas: {
        InvoiceItemInput: {
          type: "object",
          required: ["description", "quantity", "unitPrice"],
          properties: {
            description: { type: "string", example: "Professional consulting services" },
            hsnSac: { type: "string", example: "998311" },
            quantity: { type: "number", minimum: 0.01, example: 5 },
            unitPrice: { type: "number", minimum: 0, example: 1200 },
            discount: { type: "number", minimum: 0, default: 0, example: 50 },
            taxPercentage: { type: "number", minimum: 0, maximum: 100, default: 18, example: 18 }
          }
        },
        InvoiceItem: {
          type: "object",
          properties: {
            id: { type: "string" },
            invoiceId: { type: "string" },
            description: { type: "string" },
            hsnSac: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            discount: { type: "number" },
            taxPercentage: { type: "number" },
            taxableAmount: { type: "number" },
            taxAmount: { type: "number" },
            total: { type: "number" }
          }
        },
        InvoiceInput: {
          type: "object",
          required: ["customerId", "invoiceNumber", "date", "dueDate", "currency", "items"],
          properties: {
            customerId: { type: "string", example: "cly1234567890abcdef" },
            invoiceNumber: { type: "string", example: "INV-2026-001" },
            date: { type: "string", format: "date-time", example: "2026-06-26T00:00:00.000Z" },
            dueDate: { type: "string", format: "date-time", example: "2026-07-26T00:00:00.000Z" },
            currency: { type: "string", default: "INR", example: "INR" },
            exchangeRate: { type: "number", default: 1, example: 1 },
            taxJurisdiction: { type: "string", enum: ["INDIA_GST", "EU_VAT", "US_SALES_TAX", "NONE"], default: "INDIA_GST" },
            notes: { type: "string", example: "Thank you for your business!" },
            terms: { type: "string", example: "Net 30. Payment via bank transfer." },
            internalNotes: { type: "string", example: "Approved by Project Manager" },
            bankName: { type: "string", example: "HDFC Bank" },
            bankAccountName: { type: "string", example: "Open Source Corporation" },
            bankAccountNumber: { type: "string", example: "50200012345678" },
            bankIfscCode: { type: "string", example: "HDFC0000123" },
            bankAccountType: { type: "string", example: "Current" },
            themeColor: { type: "string", example: "#4f46e5" },
            themeFont: { type: "string", example: "Helvetica" },
            tdsPercentage: { type: "number", minimum: 0, maximum: 100, default: 0, example: 2 },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/InvoiceItemInput" }
            }
          }
        },
        Invoice: {
          type: "object",
          properties: {
            id: { type: "string" },
            companyId: { type: "string" },
            customerId: { type: "string" },
            invoiceNumber: { type: "string" },
            date: { type: "string", format: "date-time" },
            dueDate: { type: "string", format: "date-time" },
            currency: { type: "string" },
            notes: { type: "string" },
            terms: { type: "string" },
            internalNotes: { type: "string" },
            bankName: { type: "string" },
            bankAccountName: { type: "string" },
            bankAccountNumber: { type: "string" },
            bankIfscCode: { type: "string" },
            bankAccountType: { type: "string" },
            themeColor: { type: "string" },
            themeFont: { type: "string" },
            status: { type: "string", enum: ["DRAFT", "SENT", "VIEWED", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"] },
            exchangeRate: { type: "number" },
            subTotal: { type: "number" },
            totalDiscount: { type: "number" },
            totalTax: { type: "number" },
            taxJurisdiction: { type: "string" },
            cgstAmount: { type: "number" },
            sgstAmount: { type: "number" },
            igstAmount: { type: "number" },
            vatAmount: { type: "number" },
            tdsPercentage: { type: "number" },
            tdsAmount: { type: "number" },
            finalAmount: { type: "number" },
            amountPaid: { type: "number" },
            balanceDue: { type: "number" },
            pdfUrl: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            customer: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" }
              }
            },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/InvoiceItem" }
            }
          }
        },
        QuotationItemInput: {
          type: "object",
          required: ["description", "quantity", "unitPrice"],
          properties: {
            description: { type: "string", example: "Software development project estimate" },
            hsnSac: { type: "string", example: "998313" },
            quantity: { type: "number", minimum: 0.01, example: 1 },
            unitPrice: { type: "number", minimum: 0, example: 7500 },
            discount: { type: "number", minimum: 0, default: 0, example: 200 },
            taxPercentage: { type: "number", minimum: 0, maximum: 100, default: 18, example: 18 }
          }
        },
        QuotationItem: {
          type: "object",
          properties: {
            id: { type: "string" },
            quotationId: { type: "string" },
            description: { type: "string" },
            hsnSac: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            discount: { type: "number" },
            taxPercentage: { type: "number" },
            taxableAmount: { type: "number" },
            taxAmount: { type: "number" },
            total: { type: "number" }
          }
        },
        QuotationInput: {
          type: "object",
          required: ["customerId", "quotationNumber", "date", "currency", "items"],
          properties: {
            customerId: { type: "string", example: "cly1234567890abcdef" },
            quotationNumber: { type: "string", example: "QTN-2026-042" },
            date: { type: "string", format: "date-time", example: "2026-06-26T00:00:00.000Z" },
            expiryDate: { type: "string", format: "date-time", example: "2026-07-10T00:00:00.000Z" },
            currency: { type: "string", default: "INR", example: "INR" },
            exchangeRate: { type: "number", default: 1, example: 1 },
            notes: { type: "string", example: "Valid for 14 days." },
            terms: { type: "string", example: "50% advance, 50% on completion." },
            themeColor: { type: "string", example: "#4f46e5" },
            themeFont: { type: "string", example: "Helvetica" },
            tdsPercentage: { type: "number", minimum: 0, maximum: 100, default: 0, example: 0 },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/QuotationItemInput" }
            }
          }
        },
        Quotation: {
          type: "object",
          properties: {
            id: { type: "string" },
            companyId: { type: "string" },
            customerId: { type: "string" },
            quotationNumber: { type: "string" },
            date: { type: "string", format: "date-time" },
            expiryDate: { type: "string", format: "date-time", nullable: true },
            currency: { type: "string" },
            notes: { type: "string" },
            terms: { type: "string" },
            themeColor: { type: "string" },
            themeFont: { type: "string" },
            status: { type: "string", enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "INVOICED"] },
            exchangeRate: { type: "number" },
            subTotal: { type: "number" },
            totalDiscount: { type: "number" },
            totalTax: { type: "number" },
            taxJurisdiction: { type: "string" },
            cgstAmount: { type: "number" },
            sgstAmount: { type: "number" },
            igstAmount: { type: "number" },
            vatAmount: { type: "number" },
            tdsPercentage: { type: "number" },
            tdsAmount: { type: "number" },
            finalAmount: { type: "number" },
            pdfUrl: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            customer: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" }
              }
            },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/QuotationItem" }
            }
          }
        }
      }
    },
    paths: {
      "/api/v1/invoices": {
        get: {
          summary: "List invoices",
          description: "Retrieve a paginated list of active invoices for the authorized company.",
          tags: ["Invoices"],
          parameters: [
            {
              name: "page",
              in: "query",
              description: "Page number to retrieve",
              schema: { type: "integer", minimum: 1, default: 1 }
            },
            {
              name: "limit",
              in: "query",
              description: "Number of invoices to return per page (max 100)",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
            }
          ],
          responses: {
            "200": {
              description: "Successful response containing list of invoices",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Invoice" }
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          total: { type: "integer" },
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          totalPages: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "API key is missing, invalid or expired" },
            "500": { description: "Internal server error" }
          }
        },
        post: {
          summary: "Create invoice",
          description: "Programmatically generate a new invoice. Calculations for GST, CGST, SGST, IGST, final amounts, and TDS are processed automatically by the system tax engine.",
          tags: ["Invoices"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InvoiceInput" }
              }
            }
          },
          responses: {
            "201": {
              description: "Invoice created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      invoiceId: { type: "string" },
                      invoiceNumber: { type: "string" },
                      finalAmount: { type: "number" }
                    }
                  }
                }
              }
            },
            "400": { description: "Validation error or invalid inputs" },
            "401": { description: "Unauthorized" },
            "403": { description: "SaaS Free plan limits reached (max 5 invoices)" },
            "404": { description: "Customer not found" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/v1/invoices/{id}": {
        get: {
          summary: "Get invoice details",
          description: "Fetch all details and line items for a specific invoice by ID.",
          tags: ["Invoices"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique invoice UUID/cuid",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Invoice" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "404": { description: "Invoice not found" },
            "500": { description: "Internal server error" }
          }
        },
        put: {
          summary: "Update invoice",
          description: "Replace the details and line items of an existing invoice. Note: Invoices that have already been paid (PAID status) cannot be edited.",
          tags: ["Invoices"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique invoice UUID/cuid",
              schema: { type: "string" }
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InvoiceInput" }
              }
            }
          },
          responses: {
            "200": {
              description: "Invoice updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: { $ref: "#/components/schemas/Invoice" }
                    }
                  }
                }
              }
            },
            "400": { description: "Validation error or trying to update a paid invoice" },
            "401": { description: "Unauthorized" },
            "404": { description: "Invoice or customer not found" },
            "500": { description: "Internal server error" }
          }
        },
        delete: {
          summary: "Cancel/Delete invoice",
          description: "Soft-delete an invoice, marking it as CANCELLED and setting its deletion date.",
          tags: ["Invoices"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique invoice UUID/cuid",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Invoice deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "404": { description: "Invoice not found" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/v1/quotations": {
        get: {
          summary: "List quotations",
          description: "Retrieve a paginated list of active quotations for the authorized company.",
          tags: ["Quotations"],
          parameters: [
            {
              name: "page",
              in: "query",
              description: "Page number to retrieve",
              schema: { type: "integer", minimum: 1, default: 1 }
            },
            {
              name: "limit",
              in: "query",
              description: "Number of quotations to return per page (max 100)",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
            }
          ],
          responses: {
            "200": {
              description: "Successful response containing list of quotations",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Quotation" }
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          total: { type: "integer" },
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          totalPages: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "500": { description: "Internal server error" }
          }
        },
        post: {
          summary: "Create quotation",
          description: "Programmatically generate a new quotation. Calculates tax and totals automatically using the system tax engine.",
          tags: ["Quotations"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuotationInput" }
              }
            }
          },
          responses: {
            "201": {
              description: "Quotation created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      quotationId: { type: "string" },
                      quotationNumber: { type: "string" },
                      finalAmount: { type: "number" }
                    }
                  }
                }
              }
            },
            "400": { description: "Validation error or invalid inputs" },
            "401": { description: "Unauthorized" },
            "404": { description: "Customer not found" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/v1/quotations/{id}": {
        get: {
          summary: "Get quotation details",
          description: "Fetch all details and line items for a specific quotation by ID.",
          tags: ["Quotations"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique quotation UUID/cuid",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Quotation" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "404": { description: "Quotation not found" },
            "500": { description: "Internal server error" }
          }
        },
        put: {
          summary: "Update quotation",
          description: "Replace the details and line items of an existing quotation. Note: Quotations that have already been converted to invoices (INVOICED status) cannot be edited.",
          tags: ["Quotations"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique quotation UUID/cuid",
              schema: { type: "string" }
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuotationInput" }
              }
            }
          },
          responses: {
            "200": {
              description: "Quotation updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: { $ref: "#/components/schemas/Quotation" }
                    }
                  }
                }
              }
            },
            "400": { description: "Validation error or trying to update an invoiced quotation" },
            "401": { description: "Unauthorized" },
            "404": { description: "Quotation or customer not found" },
            "500": { description: "Internal server error" }
          }
        },
        delete: {
          summary: "Delete quotation",
          description: "Soft-delete an active quotation.",
          tags: ["Quotations"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique quotation UUID/cuid",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Quotation deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" }
                    }
                  }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "404": { description: "Quotation not found" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/invoices/{id}/pdf": {
        get: {
          summary: "Download invoice PDF",
          description: "Generate and download the compiled PDF binary file for a specific invoice.",
          tags: ["File Generation"],
          security: [],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique invoice CUID",
              schema: { type: "string" }
            },
            {
              name: "public",
              in: "query",
              description: "Set to 'true' to allow public download without requiring cookie-based session login.",
              schema: { type: "boolean", default: false }
            }
          ],
          responses: {
            "200": {
              description: "The generated PDF file binary stream",
              headers: {
                "Content-Type": { schema: { type: "string", example: "application/pdf" } },
                "Content-Disposition": { schema: { type: "string", example: "attachment; filename=\"INV-001.pdf\"" } }
              },
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { description: "Unauthorized (session missing and public is not set to true)" },
            "404": { description: "Invoice not found" },
            "500": { description: "Internal server error during PDF compilation" }
          }
        }
      },
      "/api/quotations/{id}/pdf": {
        get: {
          summary: "Download quotation PDF",
          description: "Generate and download the compiled PDF binary file for a specific quotation.",
          tags: ["File Generation"],
          security: [],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique quotation CUID",
              schema: { type: "string" }
            },
            {
              name: "public",
              in: "query",
              description: "Set to 'true' to allow public download without requiring cookie-based session login.",
              schema: { type: "boolean", default: false }
            }
          ],
          responses: {
            "200": {
              description: "The generated PDF file binary stream",
              headers: {
                "Content-Type": { schema: { type: "string", example: "application/pdf" } },
                "Content-Disposition": { schema: { type: "string", example: "attachment; filename=\"QTN-001.pdf\"" } }
              },
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "404": { description: "Quotation not found" },
            "500": { description: "Internal server error during PDF compilation" }
          }
        }
      },
      "/api/customers/{id}/statement": {
        get: {
          summary: "Download customer statement",
          description: "Generate and download the ledger/statement PDF file for a specific customer. Note: This endpoint requires a valid cookie session.",
          tags: ["File Generation"],
          security: [],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "The unique customer CUID",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "The generated PDF statement file binary stream",
              headers: {
                "Content-Type": { schema: { type: "string", example: "application/pdf" } },
                "Content-Disposition": { schema: { type: "string", example: "attachment; filename=\"Statement_John_Doe.pdf\"" } }
              },
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { description: "Unauthorized (requires active login session)" },
            "404": { description: "Customer not found" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/export/gstr1": {
        get: {
          summary: "GSTR-1 JSON export",
          description: "Export GSTR-1 formatted billing details for GST filing. Returns intra-state (B2CS) and inter-state (B2B) breakdown based on client GSTINs. Requires user session.",
          tags: ["Exports"],
          security: [],
          parameters: [
            {
              name: "from",
              in: "query",
              description: "Filter start date (YYYY-MM-DD)",
              schema: { type: "string", format: "date" }
            },
            {
              name: "to",
              in: "query",
              description: "Filter end date (YYYY-MM-DD)",
              schema: { type: "string", format: "date" }
            },
            {
              name: "customerId",
              in: "query",
              description: "Filter by a specific customer ID",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "GSTR-1 JSON file download",
              content: {
                "application/json": {
                  schema: { type: "object" }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/export/tally": {
        get: {
          summary: "Tally XML export",
          description: "Export sales and voucher data in Tally XML format for accounting imports. Requires user session.",
          tags: ["Exports"],
          security: [],
          parameters: [
            {
              name: "from",
              in: "query",
              description: "Filter start date (YYYY-MM-DD)",
              schema: { type: "string", format: "date" }
            },
            {
              name: "to",
              in: "query",
              description: "Filter end date (YYYY-MM-DD)",
              schema: { type: "string", format: "date" }
            },
            {
              name: "customerId",
              in: "query",
              description: "Filter by customer ID",
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Tally XML voucher file download",
              content: {
                "application/xml": {
                  schema: { type: "string" }
                }
              }
            },
            "401": { description: "Unauthorized" },
            "500": { description: "Internal server error" }
          }
        }
      },
      "/api/reports/{type}": {
        get: {
          summary: "Generate report data",
          description: "Fetch financial and billing reports. Available types are `gst`, `tds`, and `outstanding`. Supports multiple download formats (JSON, PDF, CSV). Requires user session.",
          tags: ["Reports"],
          security: [],
          parameters: [
            {
              name: "type",
              in: "path",
              required: true,
              description: "The report category",
              schema: { type: "string", enum: ["gst", "tds", "outstanding"] }
            },
            {
              name: "from",
              in: "query",
              description: "Report start date (defaults to Jan 1st of current year)",
              schema: { type: "string", format: "date" }
            },
            {
              name: "to",
              in: "query",
              description: "Report end date (defaults to current date)",
              schema: { type: "string", format: "date" }
            },
            {
              name: "format",
              in: "query",
              description: "Response format (JSON, CSV file download, or PDF report download)",
              schema: { type: "string", enum: ["json", "csv", "pdf"], default: "json" }
            }
          ],
          responses: {
            "200": {
              description: "Successful response matching the requested format",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { type: "object" }
                  }
                },
                "application/pdf": {
                  schema: { type: "string", format: "binary" }
                },
                "text/csv": {
                  schema: { type: "string" }
                }
              }
            },
            "400": { description: "Invalid report type or company reference" },
            "401": { description: "Unauthorized" },
            "500": { description: "Internal server error" }
          }
        }
      }
    }
  }

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  })
}
