# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the WebRTC Call Recorder, please **do not** open a public GitHub issue. Instead, please report it privately using GitHub's Security Advisory feature.

### How to Report

1. Go to the [Security Advisories](https://github.com/your-org/webrtc-call-recorder/security/advisories) page
2. Click "Report a vulnerability"
3. Provide details about the vulnerability:
   - Type of vulnerability (e.g., XSS, SQL Injection, Authentication bypass)
   - Location in code (file, line number, or component)
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

Alternatively, email security reports to: **[security@example.com]**

## Vulnerability Disclosure Timeline

- **Day 0**: Vulnerability reported to maintainers
- **Day 1**: Initial assessment and acknowledgment
- **Days 1-7**: Investigation and fix development
- **Days 7-14**: Security patch released and CVE assigned (if applicable)
- **Public disclosure**: 30 days after patch release or when 90% of users are patched

## Supported Versions

| Version | Status | Support Until |
|---------|--------|---------------|
| 0.2.x | Beta | Active (patches for critical issues) |
| 0.1.x | Legacy | End of Life - No longer supported |

### Receiving Security Updates

To stay informed about security updates:
1. Watch the repository for release notifications
2. Subscribe to [GitHub Security Alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts)
3. Review the CHANGELOG.md for security patches

## Security Best Practices

When deploying the WebRTC Call Recorder, please follow these security practices:

### Environment Configuration

- **Never commit secrets**: Use environment variables for API keys, database credentials, and JWT secrets
- **Use strong secrets**: JWT_SECRET should be minimum 32 characters of random data
- **Enable HTTPS/TLS**: Use valid certificates (Let's Encrypt recommended)
- **Set environment to production**: Use `NODE_ENV=production` in production

### Database Security

- **Use strong passwords**: Enforce strong passwords for PostgreSQL users
- **Restrict network access**: Keep database in private subnet, not publicly accessible
- **Enable SSL connections**: Use `sslmode=require` for PostgreSQL connections
- **Regular backups**: Implement automated backup with encryption
- **Audit logging**: Enable PostgreSQL audit logging for compliance

### Application Security

- **Keep dependencies updated**: Run `npm audit` and `npm update` regularly
- **Use rate limiting**: Configure rate limits on API endpoints
- **Enable CORS properly**: Only allow trusted origins
- **Validate input**: All user input must be validated and sanitized
- **Handle errors safely**: Never expose sensitive info in error messages

### Monitoring & Logging

- **Enable audit logging**: Log all sensitive operations
- **Monitor metrics**: Watch for unusual traffic or error patterns
- **Set up alerts**: Configure alerts for security events
- **Centralize logs**: Send logs to secure, centralized storage
- **Don't log secrets**: Never log passwords, tokens, or API keys

### Mobile Security

- **Use HTTPS only**: Enforce TLS 1.3+ for all API calls
- **Certificate pinning**: Consider implementing certificate pinning
- **Secure storage**: Use encrypted storage for sensitive data (AsyncStorage encryption)
- **Permissions**: Only request necessary permissions from users
- **Code obfuscation**: Minify and obfuscate production builds

## Security Checklist for Deployment

Before deploying to production, ensure:

- [ ] All dependencies are up to date (`npm audit` shows no vulnerabilities)
- [ ] Database is in private subnet with strong passwords
- [ ] Environment variables are securely configured
- [ ] HTTPS/TLS is enabled with valid certificates
- [ ] Rate limiting is configured
- [ ] CORS is restricted to trusted origins
- [ ] Audit logging is enabled
- [ ] Monitoring and alerting are configured
- [ ] Regular backup strategy is implemented and tested
- [ ] Incident response plan is documented
- [ ] Security updates are monitored regularly

## Known Security Considerations

### Call Recording & Consent

- This application facilitates call recording with legal consent verification
- Users are responsible for complying with local laws regarding call recording
- The consent system provides evidence of user consent but does not replace legal counsel
- Recording laws vary by jurisdiction - always consult legal experts for your region

### Data Privacy

- The application handles sensitive personal data (call recordings, consent logs)
- Implement appropriate data retention policies
- Ensure compliance with GDPR, CCPA, APPI, and other applicable privacy laws
- Users have the right to request data deletion (GDPR Article 17, CCPA Section 1798.100)

### Encryption

The application uses:
- **AES-256-CBC** for recording data at rest
- **TLS 1.3+** for data in transit
- **RSA-2048** for signature generation
- **HMAC-SHA256** for JWT signing

These are considered secure for the threat model. However:
- HSM (Hardware Security Module) recommended for production key storage
- Key rotation should be implemented regularly
- Consider key escrow or recovery procedures

## Dependencies & Supply Chain

The project depends on several npm packages. Security considerations:
- Run `npm audit` regularly to check for vulnerabilities
- Use `npm audit fix` to patch vulnerabilities
- Keep Node.js updated to latest LTS version
- Monitor GitHub Dependabot alerts
- Review major dependency updates before installing

## Compliance & Standards

This project is designed with consideration for:
- **GDPR** (General Data Protection Regulation) - EU/UK
- **CCPA** (California Consumer Privacy Act) - USA
- **APPI** (Act on the Protection of Personal Information) - Japan
- **OWASP Top 10** - Application security risks
- **CWE/SANS Top 25** - Common weaknesses

## Security Testing

The project includes:
- **Unit tests** with 92.5% coverage
- **Integration tests** for critical paths
- **Load testing** for DoS resistance
- **Input validation** tests
- **CORS tests**

Additional security testing recommended:
- Penetration testing by certified security professionals
- SAST (Static Application Security Testing)
- DAST (Dynamic Application Security Testing)
- Dependency scanning

## Incident Response

If a security incident occurs:

1. **Identify & Contain**: Determine scope and impact
2. **Investigate**: Analyze logs and system state
3. **Fix**: Develop and test security patch
4. **Disclose**: Notify affected users and stakeholders
5. **Review**: Post-incident analysis and improvements

Contact: [security@example.com]

## Security References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
- [Mobile App Security](https://owasp.org/www-project-mobile-top-10/)

## Acknowledgments

We appreciate the security research community for helping us maintain this project's security. Thank you to all who have reported vulnerabilities responsibly.

---

**Last Updated**: 2025-11-17
