# Security Policy

## Supported versions

The `main` branch and the latest 2.x release receive security fixes.

| Version | Supported |
| --- | --- |
| 2.x | :white_check_mark: |
| 1.x | :x: |

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Use GitHub's private reporting flow:

**<https://github.com/ShahabAhmed01/zynex-ai/security/advisories/new>**

Include:

- the affected version or commit,
- reproduction steps or a proof of concept,
- the impact you believe it has,
- any suggested mitigation.

You can expect an acknowledgement within a few days. Please allow time for a fix and advisory before public disclosure.

## Security model

- **API keys** live server-side in `.env` or the process environment. They are never returned by `/api/config` or `/api/health`.
- **Research jobs** require a random per-job `access_token` on status, report, and export routes. Tokens are compared with `secrets.compare_digest`.
- **Rate limits** apply to chat, research, and auth endpoints. They are process-local and reset on restart.
- **Input validation** bounds message roles, message sizes, topic length, research depth, and OAuth values.
- **Response headers** include a restrictive CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a referrer policy, and a permissions policy.
- **Provider failures** are surfaced as errors. Zynex does not silently substitute fabricated model output in live mode.

## Deployment guidance

- Serve Zynex over HTTPS and keep dependencies updated. Dependabot is configured for pip and GitHub Actions.
- Run one worker: job state and rate-limit counters are in memory.
- If you expose OAuth activation publicly, deploy only on a host you control. Activation writes the key to `.env`, and the OAuth callback URL is supplied by the client.
- Set `OPENROUTER_API_KEY` through the platform environment on ephemeral hosts.
- Do not put secrets in `CORS_ORIGINS`, issue reports, screenshots, or logs.
- Review the reverse-proxy configuration so it does not strip the security headers added by the app.

## Known limitations

- There is no user account system. Anyone who can reach a deployment can start jobs and talk to the configured model key.
- Research jobs and rate-limit state are not shared across processes or replicas.
- Web search depends on third-party endpoints and may be rate-limited or blocked by the network.
- The demo mode is a labelling and behavior boundary, not an authentication boundary.

## Dependency and secret checks

The launch audit for this branch ran:

```bash
pip-audit -r requirements.txt
gitleaks detect --redact
```

No known vulnerable dependencies or committed secrets were found at that time. Re-run these checks for your own deployment and keep the dependency set current.
