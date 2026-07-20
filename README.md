# CSE Election PV Public API documentation

Unofficial OpenAPI 3.1 documentation for the public consultation backend used by the French Ministry of Labour’s Élections professionnelles website.

## Contents

- `openapi.yaml` — machine-readable API contract
- `index.html` — hosted Swagger UI and overview
- `styles.css` — custom responsive presentation
- `swagger.js` — read-only Swagger UI configuration

## Validate

```bash
npm install
npm run validate
```

## Preview locally

```bash
npm run serve
# http://localhost:4173
```

## Important

The upstream API only permits browser CORS calls from the official service origin. Swagger execution is intentionally disabled. Respect consultation quotas, CAPTCHA requirements, `retryAfter`, and the official service rules. This project is not affiliated with or endorsed by the French Ministry of Labour.

Official search: https://www.elections-professionnelles.travail.gouv.fr/election-cse/pv/recherche
