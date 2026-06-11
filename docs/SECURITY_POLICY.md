# Internal Security Policy Draft (ISO 27001 / SOC 2)

## 1. Access Control Policy
- **Principle of Least Privilege**: All employees and systems must be granted the minimum level of access necessary to perform their duties.
- **Multi-Factor Authentication (MFA)**: MFA must be enabled for all administrative access to production systems, including the hosting environment (Vercel) and database management interfaces.
- **Tenant Isolation**: The application strictly isolates tenant data at the application level via the `getTenantDb` Prisma extension. Developers MUST use `getTenantDb(companyId)` rather than the raw `prisma` client for all tenant-specific operations to prevent cross-tenant data leakage.

## 2. Incident Response Plan
1. **Identification**: Any employee suspecting a security incident (e.g., unauthorized access, data leak) must immediately report it to the engineering lead.
2. **Containment**: If an ongoing attack is detected, the affected systems (e.g., specific tenant accounts) must be temporarily disabled or isolated from the network.
3. **Eradication**: Identify the root cause (e.g., compromised credentials, vulnerable dependency) and remove the threat.
4. **Recovery**: Restore systems from the latest secure backup and verify integrity before resuming normal operations.
5. **Lessons Learned**: Conduct a post-mortem within 72 hours to document the incident and implement preventative measures.

## 3. Data Protection and Encryption
- **Data in Transit**: All data transmitted between the client and server must be encrypted using TLS 1.2 or higher.
- **Data at Rest**: Production databases must have encryption at rest enabled (e.g., AWS KMS, Vercel Postgres encryption).
- **Secrets Management**: No secrets (API keys, DB credentials) shall be committed to the repository. Use environment variables provided by the hosting platform (e.g., Vercel Environment Variables).

## 4. Auditing and Logging
- Critical actions within the application (e.g., login, invoice creation, company settings changes) should be logged into the `AuditLog` table.
- Logs must be retained for at least 90 days to comply with standard SOC 2 requirements.
