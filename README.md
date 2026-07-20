# CSE Election PV Public API documentation

Unofficial OpenAPI 3.1 documentation for the public consultation backend used by the French Ministry of Labour’s Élections professionnelles website.

## Contents

- `openapi.yaml` — machine-readable API contract
- `index.html` — hosted Swagger UI and overview
- `styles.css` — custom responsive presentation
- `swagger.js` — executable Swagger UI configuration
- `api/proxy.js` — restricted same-origin testing proxy

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

The upstream API only permits browser CORS calls from the official service origin. Hosted Swagger requests therefore use a restricted same-origin proxy. It permits documented public GET routes and establishment search, does not forward browser credentials, and deliberately blocks observation submission, CAPTCHA validation, and unverified POST operations. Upstream status codes, quota responses, and `retryAfter` are preserved. Respect consultation quotas, CAPTCHA requirements, and the official service rules. This project is not affiliated with or endorsed by the French Ministry of Labour.

Official search: https://www.elections-professionnelles.travail.gouv.fr/election-cse/pv/recherche
