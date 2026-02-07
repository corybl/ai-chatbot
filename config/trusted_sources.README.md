trusted_sources.json — format and template

Purpose
- Centralized, editable list of preferred/trusted sources used by the chatbot for prioritization and UI badges.

File location
- config/trusted_sources.json

Schema (each entry is an object):
- id: short machine-friendly identifier (string, unique)
- name: human-friendly name (string)
- domain: primary domain (string) — used for quick match (e.g. "cdc.gov")
- url: canonical url for the org (string)
- type: one of ["government","hospital","academic","nonprofit","international","other"]
- region: e.g. "usa", "canada", "europe", "global" (string)
- trusted_level: integer (1=low, 2=high, 3=top-tier) — used for sorting/UI
- notes: optional short note for maintainers

Example entry (template):
{
  "id": "example_org",
  "name": "Example Organization",
  "domain": "example.org",
  "url": "https://www.example.org/",
  "type": "nonprofit",
  "region": "global",
  "trusted_level": 2,
  "notes": "Add any maintainer notes here"
}

Tips for editing
- Keep the `id` unique and lowercase with underscores.
- Prefer domain-only matches for broad coverage (e.g., "nih.gov").
- Use `trusted_level` 3 for government and world-leading public health institutions (.gov, WHO, CDC, NIH, NHS, Health Canada, etc.).
- Use `trusted_level` 2 for major academic medical centers, major hospitals, and reputable non-profits.
- Use `trusted_level` 1 for other potentially useful sources that are less authoritative.

Integration notes
- The server or client can read this JSON file at startup to determine which sources get "Trusted" badges and to influence sorting/prioritization.
- If you want me to wire this file into the server logic (so the server attaches a `trusted` flag to each citation in the API response), say so and I will update `server.js` to load this JSON and incorporate it into `filterCitationsByRegion()`.
