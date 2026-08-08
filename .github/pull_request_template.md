## Summary

- What changed and why?

## Safety and Data Contract

- [ ] Instagram requests remain sequential, bounded, and abortable
- [ ] Auth, challenge, rate-limit, timeout, bounds, and invalid responses do not continue with partial data
- [ ] Saved-data schema/owner handling is covered when persistence changes
- [ ] User-facing scope, metric, or API behavior changes are documented without safety guarantees

## Validation

- [ ] Version and `CHANGELOG.md` are updated
- [ ] `npm ci` passes
- [ ] `npm run check` passes
- [ ] `npm audit --audit-level=high` passes
- [ ] `npm run build` passes and `npm run check:generated` confirms parity
- [ ] Any manual browser smoke test avoided live Instagram requests unless explicitly required
