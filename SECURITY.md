# Security Policy

## Supported Versions

Currently, only the `main` branch (version 1.x) is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Zynex, please do NOT open a public issue. 
Instead, please send an email to the project maintainers directly, or use GitHub's "Security Advisories" feature to privately report the vulnerability.

We will review all security reports and work to issue a patch and an advisory as quickly as possible. Please allow us time to investigate and fix the vulnerability before making it public.

## Security Best Practices
- Keep your `.env` file secure. NEVER commit it to source control.
- If using OpenRouter, rotate your API keys regularly.
- Ensure the server runs in an isolated container or virtual environment in production.
