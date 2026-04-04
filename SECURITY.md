# Security Policy

## Reporting Vulnerabilities

Report vulnerabilities to sg85207@gmail.com or open a GitHub issue.

## How This Tool Handles Your Data

This tool runs **entirely in your browser** on instagram.com. It:

- Uses your existing Instagram session cookies to call Instagram's API
- Never sends your data to any external server
- Never stores credentials or tokens
- Caches scan results in localStorage (your browser only)
- Does not inject any tracking, analytics, or third-party scripts

The bundled script is fully open source and can be audited in `src/`.

## Rate Limiting

The tool includes built-in rate limiting to avoid triggering Instagram's anti-abuse systems:

- Delays between API requests with randomized jitter
- Exponential backoff on failed requests
- Automatic cooldown when approaching rate limits
- 429 detection with 60-second auto-pause

Use the default timing settings unless you have a specific reason to change them. Lowering delays increases the risk of a temporary account restriction from Instagram.

## Supported Versions

Only the latest version on `main` is supported.
