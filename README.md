# Style86: sito vetrina

Static site, no build step. Serve the folder with any static server:

    python3 -m http.server 8686

Deployed on Vercel: every push to `main` goes live automatically (no build step).

## Media
Photos supplied by the salon (Nov 2026), lightly sharpened:

| File | Shot |
|------|------|
| hero-1 | Storefront, via Luigi Ornato 59 |
| hero-2 | Cutting stations with round brass mirrors |
| hero-3 | Wash bar |
| hero-4 | Oval mirror on the grey stucco wall |
| hero-5 | Reception with logo and teal sofa |

| work-1 … work-5 | Finished work for the carousel (normalised to 9:16, 960–1080 px wide) |

`hero-*-bg.jpg` are blurred, darkened copies drawn behind the mirror.
Camera moves per shot live in `SHOTS` at the top of `app.js`
(x < 0 pans right, y > 0 pans up, s = zoom).

The originals are WhatsApp-compressed (1152x2048). Sending the original
camera files would make the hero sharper on large screens.

## To confirm with the salon
- Prices on items marked `data-confirm="1"` in `index.html` are estimates.
- WhatsApp on +39 366 305 7307 (assumed).
- Hours: Treatwell lists Tue-Sat 9-20, Sun 10-16, Mon closed; Instagram says Mon-Sat 9-19:30.

## Type
Cormorant Garamond (headings, hero 500, wordmark) + Manrope (body; nav and buttons 600).
Brand marks carry `translate="no"` so browser auto-translation cannot break the logo.
