# Jewelry Workbench

One project workspace for jewelry design, CAD pricing, stones, launch copy, and campaign visuals.

[Open Jewelry Workbench](https://forgedlogics.github.io/jewelry-story-kit/)

## Start here

1. Create a project with its piece name, material, and inspiration.
2. Open **CAD & pricing**. Enter weight or import STL / mesh-based 3DM, add supplier costs, and create a client quote.
3. Record stones in **Stone library**, assign them to the project, then apply the budget in pricing.
4. Open **Story & copy**. Build the template-based launch story, then edit each text block directly.
5. Open **Campaign studio**. Add a sketch and approved product/model images, then export the editorial PDF. Product narrative and email copy travel into the campaign guide and book.

Try the Tidal Arc Ring example to explore the workflow.

## Connected project data

A shared design brief feeds all three tools. Estimates, editable story blocks, campaign steps, quote photos, and campaign images are saved per project in IndexedDB. Switching tools or reloading restores the work. Use the design brief to update shared context; existing copy stays intact until you rebuild it.

Stone records include a supplier, carat weight, total USD price, source URL, verification date, project assignment, and status. Price per carat is calculated from the recorded total. Sold records are excluded from the budget. A row represents one stone or one parcel, not an automatic quantity multiplier.

## Storage and backups

This version stores everything in the current browser, under this site's origin. It does not provide accounts or cloud sync. Clearing browser data removes saved work. Export a workspace backup regularly; import it on another device or origin to restore your projects and images. Import replaces the current workspace after confirmation. Individual project exports use the same backup format.

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
