# Custom Domain Setup

Open-Invoice allows Growth and Enterprise accounts to publish billing links under their own branded domains.

---

## 🗺️ How it Works

```
[Request: billing.acme.com] ---> [Reverse Proxy / Caddy]
                                        |
         (Verify domain status)         v
[Next.js App Server] <--- [GET /api/public/verify-domain?domain=...]
        |
        +---> Allowed: Rewrite internally to /_custom/[companyId]/p/invoice/[id]
```

1. **Edge Middleware Routing**: The core middleware ([`src/middleware.ts`](file:///Users/aswin/Documents/personal/Open-Invoice/src/middleware.ts)) intercepts incoming hostnames.
2. **Lightweight Verification API**: If the domain is recognized as a non-platform custom host, the middleware queries the public verification API to match the `companyId` and confirm active subscription status.
3. **Internal Rewrite**: The URL is rewritten on-the-fly to the white-label custom page path without modifying the customer's browser address bar.

---

## ⚙️ DNS Configuration

To configure a custom domain:
1. Go to your DNS hosting dashboard (e.g., Cloudflare, Route53, GoDaddy).
2. Create a new **CNAME** record:
   - **Host/Name**: `billing` (or your preferred subdomain)
   - **Target/Value**: `cname.open-invoice.com`
3. If using Cloudflare, turn the cloud icon to **DNS Only** (Grey Cloud) to allow TLS certificate validation challenges to reach the gateway.

---

## 🖥️ Platform Verification
1. Open **Settings** in the dashboard.
2. Scroll to the **Custom Domain Configuration** card.
3. Enter your domain (e.g. `billing.yourcompany.com`) and click **Save Changes**.
4. Visit `https://billing.yourcompany.com/p/invoice/[id]` to trigger the automatic Let's Encrypt SSL generation process.
