# API & Webhook Integrations

Open-Invoice is engineered with a developer-first approach, offering robust REST APIs and event-driven webhook callbacks for seamless accounting integrations.

---

## 🔑 Developer API Authentication

To connect custom scripts, mobile apps, or backend servers:
1. Navigate to **Settings** -> **Developer Settings**.
2. Click **Generate API Key**.
3. Copy the generated key. *(All keys are securely hashed using sha256 before storage).*

To authenticate your API requests, pass the key inside the `Authorization` header:
```http
Authorization: Bearer oi_live_your_api_key_here
```

---

## 🔗 Webhook Subscriptions

Webhooks allow your application to receive real-time HTTP POST notifications when events occur in your account.

### Configuring Webhooks
1. Navigate to **Settings** -> **Webhooks**.
2. Click **Add Webhook Endpoint**.
3. Input your destination **Payload URL** (e.g. `https://api.yourcompany.com/webhooks/open-invoice`).
4. Select the event triggers you want to subscribe to:
   - `invoice.created`: Fired immediately when an invoice draft is saved.
   - `invoice.paid`: Fired when payment is confirmed or manually recorded.
   - `invoice.overdue`: Fired when the due date passes.
5. Save the endpoint.

---

## 📦 Webhook Payload Schema

All Webhook calls deliver a structured JSON payload with event parameters:

```json
{
  "id": "evt_1234567890",
  "event": "invoice.paid",
  "created_at": "2026-07-01T12:00:00Z",
  "company_id": "comp_abc123",
  "data": {
    "id": "inv_987654321",
    "invoice_number": "INV-2026-0001",
    "customer": {
      "name": "Acme Corporation",
      "email": "billing@acme.com"
    },
    "totals": {
      "subtotal": 10000.00,
      "gst_total": 1800.00,
      "tds_total": 200.00,
      "grand_total": 11600.00
    },
    "currency": "INR",
    "status": "PAID"
  }
}
```

---

## 🛠️ Webhook Logging & Debugging

Open-Invoice provides a built-in webhook inspector console under **Settings** -> **Webhooks** -> **Delivery Logs**:
- Tracks **HTTP status responses** (e.g., `200 OK`, `500 Internal Server Error`).
- Saves the complete **request payload** and **response body** for rapid developer debugging.
- Automatically retries failed callbacks on backoff schedules (managed by the **Inngest** event-loop).
