# اعمال المؤرخ احمد بن محارب الظفيري رحمه الله

Ten original PDFs, preserved byte-for-byte. File names, sizes and SHA-256 checksums are recorded in books.json.

Main library: https://ahmed.aldhaferi.net/
Previous address retained: https://aldhaferi.net/arabian-horses/
GitHub repository: https://github.com/aldhaferik/arabian-horses
Linked from https://art2.aldhaferi.net/.

The homepage repository contains a lightweight wrapper. Files and the complete locally hosted Mozilla PDF.js v6.4.299 reader are served from this repository. PDF.js uses Apache 2.0; see vendor/pdfjs/LICENSE. Custom styling and Arabic toolbar defaults have been applied. Each work has a shareable ?book= URL, and mobile visitors select works from a dropdown. No external CDN or build is needed. GitHub Pages publishes main/root.

Local preview: python3 -m http.server 8080

## Shared statistics

The statistics interface is implemented in stats.js. backend/schema.sql creates private aggregate/event tables and a service-role-only SECURITY INVOKER RPC. backend/index.ts is the Edge Function. Deploy as library-stats with verify_jwt=true and use the project's legacy public anon JWT in stats-config.js. Never add the service-role key to this repository. The frontend sends aggregate requests and anonymous events only; the server hashes visitor and rate-limit identifiers with HMAC.

Reader opens are recorded after PDF.js confirms the complete PDF and first page have loaded, deduplicated once per browser per work in a rolling 30-minute window. Both viewer download controls and page download links record download requests; completed saves cannot be verified. Direct PDF opens through the library are counted separately. Existing visits and external direct PDF URLs are not included. Retry event IDs remain deduplicated for 48 hours; frontend retries last at most 20 seconds. Public telemetry is an activity estimate, not verified human readership.

Frontend read failures display unavailable status, never local or invented counts. PDF reading and downloading continue independently. Requests are validated, capped at 2 KiB, and rate-limited to 120/minute per hashed gateway IP. Event rows expire after two days; aggregate totals remain. A successful new event insert and counter update happen atomically.

Deployed in Supabase project dkbpkbzbbbqdfjiuhjkr (aldhaferik's Org, free plan, Frankfurt). Endpoint: https://dkbpkbzbbbqdfjiuhjkr.supabase.co/functions/v1/library-stats. JWT verification is enabled. The public legacy anon JWT in stats-config.js is intentionally client-visible; private schemas and the database RPC are inaccessible to that role. Database tests run inside rolled-back transactions verified counter increments, 30-minute deduplication, retry idempotency, and access restrictions without retaining artificial activity. Live aggregate checks passed for all ten documents. Counters begin from activation on 11 October 2026; no earlier activity was invented.
