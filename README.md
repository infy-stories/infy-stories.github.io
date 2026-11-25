## Infosys Hyderabad Story Page

Stories are rendered in [the frontend editor](write/new/index.html) and uploaded
as ordered JPEG batches to `/api/postConfession`. The [story rules](writeStoryRules.html)
lead to the editor; the old [story URL](writeConfession.html) and
[rules URL](writeConfessionRules.html) redirect to the current rules page.
The legacy JSON `/postConfession` submission and server-side story renderer are retired.

### Special Story Themes

[special_themes/themes.json](special_themes/themes.json) contains scheduled palettes
for the new story editor and standalone admin title cards. Active themes appear
as full-width featured options above the regular palettes.

| Theme | From (IST) | Through (IST) | Artwork |
| --- | --- | --- | --- |
| Diwali | October 27, 2026 | November 12, 2026 | Gold diyas on charcoal |
| Christmas | December 18, 2026 | December 27, 2026 | Evergreen garland, fairy lights, ornaments, tree, and gifts on cranberry |
| New Year | December 28, 2026 | January 5, 2027 | Champagne and teal fireworks, confetti, and streamers on midnight |
| Sankranthi | January 10, 2027 | January 17, 2027 | Colorful kites, mango-leaf toran, sugarcane, harvest pot, and rangoli on light mint |

Each entry defines a unique `name`, an `emoji`, hexadecimal `background`, `text`,
and `accent` colors, plus inclusive ISO `from` and `to` timestamps with an explicit
timezone. The `decoration` keys `diwali`, `christmas`, `new-year`, and `sankranthi`
select artwork shared by story slides and title covers. Decorations stay near
the edges to preserve text readability. Edit dates here for future campaigns.

Availability follows the browser clock and refreshes at schedule boundaries and
when the page regains focus. Expired selections return to a regular palette;
submissions already in progress retain their chosen palette. Invalid entries or
an unavailable registry do not prevent using the regular themes. Serve the site
over HTTP, such as VS Code Live Server, so the browser can fetch the JSON registry.

## Admin access

Set `ADMIN_KEY` as a Vercel environment secret for the API deployment, then redeploy.
The home page includes a visible Admin entry. The key is checked by the API and
kept in `sessionStorage` only for the current browser tab; the login form uses
one password field with `current-password` autocomplete and the Credential
Management API where the browser supports it, so compatible password managers
can save and autofill the key.
No key should be added to frontend source or committed files.

The dedicated admin page can compose a story, check form and cooldown counts,
view daily story and query history, toggle form availability, edit the last allocated
Instagram sequence number, and clear the current Vercel instance's in-memory IP
cooldown dictionaries. Daily counts roll over automatically at midnight India
time; there is no manual reset. Lowering the Instagram sequence can reuse numbers
already assigned to posts. Cooldown dictionaries are not shared across serverless
instances, so clearing them is best-effort rather than a global reset.
The Instagram sequence can be typed or adjusted with the minus and plus buttons;
changes are sent only after confirmation.
The history and Instagram sections load only when opened; their refresh buttons
request fresh data without reloading the other sections. Story and query histories
default to the latest seven India-time dates. Set inclusive From/To dates and
select Apply dates to fetch that range, or use All dates to fetch the full history.
