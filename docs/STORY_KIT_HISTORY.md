# Jewelry Story Kit

A browser-based workspace that turns a jewelry design brief into launch-ready marketing copy.

[Open the public demo](https://forgedlogics.github.io/jewelry-story-kit/)

## What it does

Enter a piece name, material, inspiration, audience, and price tier. The tool creates:

- A product narrative
- A campaign angle
- A social-media caption
- A launch-email subject line

## Why it exists

Jewelry concepts often begin with a material, form, or feeling. Jewelry Story Kit helps translate those design decisions into clear language for product pages, social content, and launch planning.

Outputs use structured templates in the browser; no AI service, API key, or account is required. Briefs are not saved.

## Portfolio case study

The built-in Case Study view documents the marketing problem, intended users, and interaction decisions behind the tool.

## Built with

- HTML
- CSS
- JavaScript

## Run locally

Open `dist/index.html` in a browser.

## Status

First working version. Future iterations may add editable outputs, saved briefs, and exportable launch plans.

## Publishing

GitHub Actions publishes the `dist` folder to GitHub Pages when changes are pushed to `main`.

## Expanded launch workspace

The brief now includes design details, customer motivation, brand voice, campaign goal, and visual direction. Outputs include positioning, a product narrative, product-page structure, a campaign concept, three social posts, a launch email, art direction, and a measurement plan. Copy remains template-based and editable by copying/exporting. Use **Try an example** to explore it. Download the text brief or use Print / PDF.

## Per-brief AI image generation

The interface supports generating and downloading a new concept image from the current brief. **Live image generation is not active until a compatible provider and hosted server are configured.** No API key belongs in the static website.

1. Identify your image API provider and supported model. `server.py` currently supports OpenAI-compatible `/images/generations` providers returning `b64_json`. Other APIs require an adapter; a text-only API key is insufficient.
2. Deploy this repository as a Render Python web service using `render.yaml`.
3. Set `IMAGE_API_KEY`, `IMAGE_API_BASE_URL` (including `/v1` where appropriate), and `IMAGE_MODEL` in the service environment. Never commit them.
4. Set the public service URL in `dist/config.js` and push. The interface checks `/health` before enabling generation.
5. Validate one real generation before advertising the feature as live. Generated concepts are illustrative rather than verified production renders.

The demo server uses a global ten-request hourly cap per process. Use one worker/instance; a production deployment needs durable rate and budget limits. Briefs are sent to the configured provider on generation and are not stored by this application. The server does not expose provider credentials or raw provider errors.


## Cloudflare deployment (current)

The public frontend uses the Cloudflare Worker in `cloudflare/worker.mjs`, configured by `wrangler.jsonc`. It streams the image response from OpenAI to the browser and keeps the API key private. The older Python/Render bridge is an alternative only.

- Deploy: `npx wrangler@4 deploy`
- Private secret: in Cloudflare → Workers & Pages → jewelry-story-kit-images → Settings → Variables and Secrets, add a **Secret** named `OPENAI_API_KEY`. Or use `npx wrangler@4 secret put OPENAI_API_KEY` interactively; never paste the key into source code or chat.
- Model: `gpt-image-2`, one 1024×1024 PNG at low quality per request.
- Persistent shared allowance: ten generation attempts per UTC day across all visitors, enforced before the provider call by a SQLite-backed Durable Object. Failed attempts count. This limits request count rather than guaranteeing a currency spending cap.
- No prompts or images are saved by the Worker; only the daily counter is persisted. The prompt is sent to OpenAI when a visitor requests generation.
- Check `/health`: `ready` becomes true when the key is present. This checks configuration only; real generation must still be tested to verify API credit and model access.
