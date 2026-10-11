# الخيل عند العرب

Public PDF reader for the original user-supplied book.

- Main page: https://aldhaferi.net/arabian-horses/
- Repository website: https://aldhaferik.github.io/arabian-horses/
- Linked from https://art2.aldhaferi.net/

The PDF is preserved byte-for-byte in `assets/arabian-horses.pdf`. The viewer is locally hosted Mozilla PDF.js v6.4.299 (Apache 2.0; license in vendor/pdfjs/LICENSE), with custom styling and Arabic toolbar defaults. No build or external CDN is required. GitHub Pages publishes main at repository root. The homepage repository contains a lightweight wrapper pointing at this repository's viewer and PDF, so book updates only need to be committed here.

Run locally with `python3 -m http.server 8080`.
