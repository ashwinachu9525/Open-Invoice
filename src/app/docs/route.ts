import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Developer Portal & API Docs | Open-Invoice</title>
  
  <!-- Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Swagger UI CSS -->
  <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
  
  <!-- Custom Styling to match the app's premium dark glass theme -->
  <style>
    /* Reset & Base variables */
    :root {
      --font-sans: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --bg-color: #0c0a0f;
      --text-color: #f1ecf7;
      --primary-gradient: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      --accent-color: #8b5cf6;
      --accent-hover: #7c3aed;
      --card-bg: rgba(22, 19, 31, 0.65);
      --border-color: rgba(255, 255, 255, 0.08);
      --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    
    body {
      margin: 0;
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: var(--font-sans);
      min-height: 100vh;
      background-image:
        radial-gradient(ellipse 60% 40% at 20% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 60%),
        radial-gradient(ellipse 65% 45% at 80% 100%, rgba(79, 70, 229, 0.1) 0%, transparent 60%);
      background-attachment: fixed;
    }
    
    /* Premium Header */
    header {
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(12, 10, 15, 0.7);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 1rem 2rem;
    }
    
    .header-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .brand-logo {
      width: 32px;
      height: 32px;
      background: var(--primary-gradient);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 1.1rem;
      box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);
    }
    
    .brand-name {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #ffffff, #d8b4fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .nav-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 0.5rem 1.25rem;
      border-radius: 9999px;
      font-weight: 500;
      font-size: 0.875rem;
      text-decoration: none;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    
    /* Hero Section */
    .hero {
      max-width: 1400px;
      margin: 3rem auto 1.5rem;
      padding: 0 2rem;
    }
    
    .hero-title {
      font-size: 2.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0 0 0.5rem 0;
      background: linear-gradient(135deg, #ffffff 30%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .hero-desc {
      font-size: 1.1rem;
      color: #94a3b8;
      max-width: 800px;
      margin: 0;
      line-height: 1.6;
    }
    
    /* Swagger UI Container */
    #swagger-ui-container {
      max-width: 1400px;
      margin: 0 auto 5rem;
      padding: 0 1rem;
    }
    
    /* Customizing Swagger UI Classes to match dark glassmorphism theme */
    .swagger-ui {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: var(--glass-shadow);
      padding: 2rem;
    }
    
    /* Override Swagger UI Styles */
    .swagger-ui * {
      font-family: var(--font-sans) !important;
    }
    
    .swagger-ui .info, 
    .swagger-ui .scheme-container {
      background: transparent !important;
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 0 2rem 0 !important;
    }
    
    .swagger-ui .info .title {
      color: white !important;
      font-weight: 700 !important;
    }
    
    .swagger-ui .info p, 
    .swagger-ui .info li, 
    .swagger-ui .info td, 
    .swagger-ui .info a {
      color: #94a3b8 !important;
      font-size: 0.95rem !important;
    }
    
    .swagger-ui .info a {
      color: var(--accent-color) !important;
      text-decoration: underline !important;
    }
    
    /* Operations block cards */
    .swagger-ui .opblock {
      background: rgba(15, 12, 22, 0.5) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      margin-bottom: 0.75rem !important;
      overflow: hidden !important;
      transition: all 0.2s ease !important;
    }
    
    .swagger-ui .opblock:hover {
      border-color: rgba(139, 92, 246, 0.25) !important;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.08) !important;
    }
    
    .swagger-ui .opblock .opblock-summary {
      border-bottom: none !important;
      padding: 0.75rem 1.25rem !important;
    }
    
    /* Method badges */
    .swagger-ui .opblock .opblock-summary-method {
      border-radius: 6px !important;
      font-weight: 700 !important;
      font-size: 0.75rem !important;
      min-width: 80px !important;
      text-align: center !important;
      padding: 0.35rem 0 !important;
    }
    
    /* Custom method colors */
    .swagger-ui .opblock-get .opblock-summary-method {
      background: rgba(16, 185, 129, 0.15) !important;
      color: #34d399 !important;
      border: 1px solid rgba(16, 185, 129, 0.2) !important;
    }
    .swagger-ui .opblock-get {
      background: rgba(16, 185, 129, 0.02) !important;
      border-color: rgba(16, 185, 129, 0.08) !important;
    }
    
    .swagger-ui .opblock-post .opblock-summary-method {
      background: rgba(59, 130, 246, 0.15) !important;
      color: #60a5fa !important;
      border: 1px solid rgba(59, 130, 246, 0.2) !important;
    }
    .swagger-ui .opblock-post {
      background: rgba(59, 130, 246, 0.02) !important;
      border-color: rgba(59, 130, 246, 0.08) !important;
    }
    
    .swagger-ui .opblock-put .opblock-summary-method {
      background: rgba(245, 158, 11, 0.15) !important;
      color: #fbbf24 !important;
      border: 1px solid rgba(245, 158, 11, 0.2) !important;
    }
    .swagger-ui .opblock-put {
      background: rgba(245, 158, 11, 0.02) !important;
      border-color: rgba(245, 158, 11, 0.08) !important;
    }
    
    .swagger-ui .opblock-delete .opblock-summary-method {
      background: rgba(239, 68, 68, 0.15) !important;
      color: #f87171 !important;
      border: 1px solid rgba(239, 68, 68, 0.2) !important;
    }
    .swagger-ui .opblock-delete {
      background: rgba(239, 68, 68, 0.02) !important;
      border-color: rgba(239, 68, 68, 0.08) !important;
    }
    
    /* Text colors in blocks */
    .swagger-ui .opblock .opblock-summary-path,
    .swagger-ui .opblock .opblock-summary-path__deprecated {
      color: #e2e8f0 !important;
      font-size: 0.95rem !important;
      font-weight: 500 !important;
    }
    
    .swagger-ui .opblock .opblock-summary-description {
      color: #94a3b8 !important;
      font-size: 0.85rem !important;
    }
    
    .swagger-ui .opblock-description-wrapper p, 
    .swagger-ui .opblock-external-docs-wrapper p, 
    .swagger-ui .opblock-title_normal {
      color: #cbd5e1 !important;
    }
    
    /* Parameters and sections */
    .swagger-ui section.models h4,
    .swagger-ui .opblock-section-header h4 {
      color: white !important;
      font-weight: 600 !important;
    }
    
    .swagger-ui table thead tr td,
    .swagger-ui table thead tr th {
      color: #94a3b8 !important;
      border-bottom: 1px solid var(--border-color) !important;
      font-weight: 600 !important;
    }
    
    .swagger-ui .parameter__name {
      color: #cbd5e1 !important;
      font-weight: 600 !important;
    }
    
    .swagger-ui .parameter__type {
      color: var(--accent-color) !important;
    }
    
    .swagger-ui .parameter__in {
      color: #64748b !important;
    }
    
    .swagger-ui .parameter__desc {
      color: #cbd5e1 !important;
    }
    
    /* Buttons */
    .swagger-ui .btn {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid var(--border-color) !important;
      color: #cbd5e1 !important;
      border-radius: 6px !important;
      font-weight: 500 !important;
      transition: all 0.2s ease !important;
    }
    
    .swagger-ui .btn:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: white !important;
    }
    
    .swagger-ui .btn.execute {
      background: var(--primary-gradient) !important;
      border: none !important;
      color: white !important;
      font-weight: 600 !important;
      box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3) !important;
    }
    
    .swagger-ui .btn.execute:hover {
      opacity: 0.95 !important;
      transform: translateY(-1px) !important;
    }
    
    /* Inputs */
    .swagger-ui input[type=text],
    .swagger-ui select,
    .swagger-ui textarea {
      background: rgba(22, 19, 31, 0.8) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: white !important;
      border-radius: 6px !important;
      padding: 0.5rem !important;
      outline: none !important;
      transition: border-color 0.2s ease !important;
    }
    
    .swagger-ui input[type=text]:focus,
    .swagger-ui select:focus,
    .swagger-ui textarea:focus {
      border-color: var(--accent-color) !important;
    }
    
    /* Responses & JSON syntax */
    .swagger-ui .responses-inner h4,
    .swagger-ui .responses-inner h5 {
      color: #e2e8f0 !important;
    }
    
    .swagger-ui .response-col_status {
      color: white !important;
      font-weight: 600 !important;
    }
    
    .swagger-ui pre {
      background: #0f0c13 !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 8px !important;
      padding: 1rem !important;
    }
    
    .swagger-ui .microlight {
      background: transparent !important;
      color: #94a3b8 !important;
    }
    
    /* Models / Schemas at the bottom */
    .swagger-ui section.models {
      border: 1px solid var(--border-color) !important;
      border-radius: 12px !important;
      background: rgba(15, 12, 22, 0.4) !important;
      margin-top: 3rem !important;
    }
    
    .swagger-ui section.models .model-container {
      background: transparent !important;
      border-bottom: 1px solid var(--border-color) !important;
      margin: 0 !important;
      padding: 1rem !important;
    }
    
    .swagger-ui section.models .model-container:last-child {
      border-bottom: none !important;
    }
    
    .swagger-ui section.models h4 {
      border-bottom: 1px solid var(--border-color) !important;
      padding: 1rem !important;
      margin: 0 !important;
    }
    
    .swagger-ui .model-title {
      color: #e2e8f0 !important;
      font-weight: 600 !important;
    }
    
    .swagger-ui .model {
      color: #cbd5e1 !important;
    }
    
    .swagger-ui .prop-name {
      color: #cbd5e1 !important;
    }
    
    .swagger-ui .prop-type {
      color: var(--accent-color) !important;
    }
    
    /* Expand/Collapse icons */
    .swagger-ui .model-toggle:after {
      background: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") 50% no-repeat !important;
      background-size: 100% !important;
    }
    
    /* Authorization popup modal */
    .swagger-ui .modal-ux {
      background: #16131f !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
    }
    
    .swagger-ui .modal-ux-header h3 {
      color: white !important;
    }
    
    .swagger-ui .modal-ux-content h4 {
      color: #e2e8f0 !important;
    }
    
    .swagger-ui .modal-ux-content p {
      color: #94a3b8 !important;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-container">
      <div class="brand">
        <div class="brand-logo">OI</div>
        <span class="brand-name">Open-Invoice</span>
      </div>
      <a href="/dashboard" class="nav-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Dashboard
      </a>
    </div>
  </header>
  
  <main class="hero">
    <h1 class="hero-title">Developer Hub</h1>
    <p class="hero-desc">
      Welcome to the Open-Invoice API developer reference. Use our RESTful endpoints to programmatically manage invoices, generate quotation documents, compile customer statements, and pull detailed tax and financial reports.
    </p>
  </main>
  
  <section id="swagger-ui-container">
    <div id="swagger-ui"></div>
  </section>

  <!-- Swagger UI Scripts -->
  <script>
    function initSwaggerUI() {
      try {
        const container = document.getElementById('swagger-ui');
        if (!container) {
          console.warn("Target container #swagger-ui not found in DOM yet, retrying in 50ms...");
          setTimeout(initSwaggerUI, 50);
          return;
        }
        window.ui = SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis
          ],
          layout: "BaseLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          docExpansion: "list"
        });
      } catch (err) {
        console.error("Failed to initialize Swagger UI:", err);
      }
    }
  </script>
  <script src="/swagger-ui/swagger-ui-bundle.js" charset="UTF-8" onload="initSwaggerUI()"></script>
</body>
</html>
`
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  })
}
