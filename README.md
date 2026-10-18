# Jewelry Workbench

One project workspace for jewelry design, CAD pricing, stones, launch copy, and campaign visuals.

[Open Jewelry Workbench](https://forgedlogics.github.io/jewelry-story-kit/)

## Quick links

- [All tools](https://forgedlogics.github.io/jewelry-story-kit/)
- [Story Kit](https://forgedlogics.github.io/jewelry-story-kit/?tool=story)
- [Campaign Studio](https://forgedlogics.github.io/jewelry-story-kit/?tool=campaign)
- [Pricing Calculator](https://forgedlogics.github.io/jewelry-story-kit/?tool=pricing)
- [Diamond Ledger](https://nikunj-diamond-ledger.nikunj-verma.chatgpt.site) — private access
- [Stone handoff to pricing](https://forgedlogics.github.io/jewelry-story-kit/?tool=stones)

## Start here

The home screen is a dashboard for four independent tools:

- **Story Kit** — product stories, editable launch copy, and image briefs.
- **Campaign Studio** — approved campaign imagery and editorial PDF books.
- **Diamond Ledger** — direct access to the existing private inventory and market-comparison app, plus a local stone-cost handoff to Pricing Calculator.
- **Pricing Calculator** — CAD weight, production costs, selling prices, and client quotes.

Open any tool directly. No jewelry-piece project is required. Each embedded tool
keeps its own browser-local working session.

## Connect tools when you choose

Use **Send to another tool** for a one-time copy of the current context. Calculator
estimates carry into the receiving tool as an estimate note. Story copy carries
into Campaign Studio's guide/book; a generated story image can become its product
image. Source and destination remain independent after the handoff.

For ongoing shared work, create an optional **linked workspace** and select it in
the tool's **Work mode** dropdown. Existing saved piece-based workspaces remain
available under **Saved linked work**. They are not the software's main navigation.

Diamond Ledger's private database remains in the original application. Its dashboard
entry opens that app separately; it is not silently replaced or automatically
synchronized. The browser-local stone handoff lets you record a verified stone cost
and explicitly send it to Pricing Calculator. You can also assign those records to
an optional linked workspace.

## Storage and backups

Embedded-tool working sessions and linked work are stored in the current browser, under this site's origin. The original private Diamond Ledger keeps its existing separate storage. It does not provide accounts or cloud sync. Clearing browser data removes saved work. Export a workspace backup regularly; import it on another device or origin to restore your projects and images. Import replaces the current workspace after confirmation. Individual project exports use the same backup format.

Campaign images support PNG, JPEG, WebP, and GIF up to 8 MB each. Backup import is limited to 50 MB. CAD files are processed locally; their resulting volume and weight are saved, while original CAD files must be kept separately.

The original private Diamond Ledger database is not copied, exposed, or migrated. The integrated stone library starts empty; the original Ledger remains linked for existing private inventory and market comparison. Use **Import saved calculator projects** to copy compatible saved BenchMark estimates from this browser. GitHub Pages apps under forgedlogics share one origin, so existing local estimates can be discovered there. Imports keep the original records and avoid duplicates. Data saved on another browser or domain needs an export/import workflow; it cannot be discovered automatically.

## Image workflow

Campaign visuals are uploaded approved images. **Generate in Codex** prepares a prompt and opens ChatGPT; the user generates and approves images there before returning to upload them. Story Kit's optional image-service connection remains available, but is not required and is not guaranteed live. Core project, pricing, copy, and campaign-book workflows require no model API key.

Copy uses structured templates rather than live AI research. Pricing is an estimate; confirm supplier costs, tax, specifications, and production details before quoting.

## Development

```sh
python3 -m http.server 4188 --directory dist
node --test tests/workbench.test.cjs
```

Open `http://localhost:4188`. GitHub Actions publishes `dist/` to Pages after changes to `main`.

`dist/tools/pricing` reuses BenchMark; `dist/tools/story` preserves the original Story Kit; `dist/tools/campaign` reuses Campaign Studio. A same-origin message bridge connects each tool to the current project. Messages require the active frame, origin, and project token to prevent late writes from another project. Only public source assets are published; workspace records stay in the visitor's browser.

The previous Story Kit documentation is preserved in [docs/STORY_KIT_HISTORY.md](docs/STORY_KIT_HISTORY.md).
