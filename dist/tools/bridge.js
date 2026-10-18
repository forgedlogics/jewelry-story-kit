"use strict";
let wbContext = null,
  wbLoading = false,
  wbAssets = {};
const wbKind = location.pathname.includes("/pricing/")
  ? "pricing"
  : location.pathname.includes("/campaign/")
    ? "campaign"
    : "story";
function wbFields() {
  return Object.fromEntries(
    [...document.querySelectorAll("input[id],textarea[id],select[id]")]
      .filter((el) => el.type !== "file")
      .map((el) => [el.id, el.type === "checkbox" ? el.checked : el.value]),
  );
}
function wbSnapshot() {
  const saved = { fields: wbFields(), assets: wbAssets };
  if (wbKind === "pricing") {
    saved.estimate = latestEstimate;
    saved.quoteImages = quoteImages;
  }
  if (wbKind === "story") {
    saved.blocks = blocks;
    saved.prompt = prompt;
    if (document.getElementById("generatedImage").src.startsWith("data:image/"))
      saved.image = document.getElementById("generatedImage").src;
  }
  if (wbKind === "campaign") saved.step = current;
  return saved;
}
function wbNotify() {
  if (!wbContext || wbLoading) return;
  parent.postMessage(
    {
      type: "workbench:save",
      context: wbContext,
      saved: wbSnapshot(),
      common:
        wbKind === "pricing"
          ? {
              name: field.pieceName.value,
              client: field.clientName.value,
              ...(wbContext.project.startsWith("tool:")
                ? { material: field.metalType.selectedOptions[0].textContent }
                : {}),
            }
          : wbKind === "story"
            ? {
                name: $("piece").value,
                material: $("material").value,
                inspiration: $("inspiration").value,
                detail: $("detail").value,
              }
            : {
                name: $("piece-name").value,
                material: $("metal").value,
                inspiration: $("direction").value,
              },
    },
    location.origin,
  );
}
window.workbenchNotify = wbNotify;
window.addEventListener("message", (event) => {
  if (
    event.source !== parent ||
    event.origin !== location.origin ||
    event.data?.type !== "workbench:init"
  )
    return;
  wbLoading = true;
  const { context, project: p, saved } = event.data;
  wbContext = context;
  wbAssets = saved.assets || {};
  const fields = { ...(saved.fields || {}) };
  if (wbKind === "pricing") {
    fields.pieceName = p.name;
    if (!fields.metalType) {
      const match = p.material
        .toLowerCase()
        .match(/(silver|platinum|10k|14k|18k|22k)/);
      const densities = {
        silver: "10.36",
        platinum: "21.45",
        "10k": "11.40",
        "14k": "13.50",
        "18k": "15.80",
        "22k": "19.30",
      };
      if (match) fields.metalType = densities[match[1]];
    }
    fields.clientName = p.client;
    if (saved.quoteImages) {
      quoteImages = saved.quoteImages;
      document.getElementById("quoteImageStatus").textContent =
        quoteImages.length
          ? `${quoteImages.length} saved photo(s) ready for the client quote.`
          : "No photos selected.";
    }
  }
  if (wbKind === "story") {
    fields.piece = p.name;
    fields.material = p.material;
    fields.inspiration = p.inspiration;
    fields.detail = p.detail;
  }
  if (wbKind === "campaign") {
    fields["piece-name"] = p.name;
    window.workbenchLaunchCopy = p.launchCopy || [];
    if (!fields.stones) fields.stones = p.stoneDescription || "";
    fields.metal = p.material;
    fields.direction = p.inspiration;
  }
  for (const [id, value] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el && el.type !== "file") {
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value;
    }
  }
  if (wbKind === "pricing") calculate();
  if (wbKind === "story" && saved.blocks?.length) {
    build();
    blocks = saved.blocks;
    document
      .querySelectorAll("#storyBlocks .copy-block p")
      .forEach((el, n) => (el.textContent = blocks[n]?.[1] || ""));
    if (saved.image?.startsWith("data:image/")) {
      document.getElementById("generatedImage").src = saved.image;
      document.getElementById("generatedImage").hidden = false;
      document.getElementById("imageDownload").href = saved.image;
      document.getElementById("imageDownload").hidden = false;
    }
  }
  if (wbKind === "campaign") {
    for (const [key, data] of Object.entries(wbAssets)) {
      if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(data)) continue;
      media[key] = data;
      const image = document.getElementById(key + "-preview");
      if (image) {
        image.src = data;
        image.hidden = false;
      }
    }
    document.getElementById("project-title").textContent = p.name;
    show(saved.step || 1);
    if (
      saved.step === 4 &&
      ["hero", "detail", "editorial"].every((k) => media[k])
    )
      buildPlan();
  }
  wbLoading = false;
});
document.addEventListener("input", () => wbNotify());
document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.type === "file" && wbKind === "campaign") {
    const keys = {
      sketch: "sketch",
      product: "product",
      hero: "hero",
      detail: "detail",
      editorial: "editorial",
    };
    const key = Object.keys(keys).find((k) => input.id.includes(k));
    const file = input.files?.[0];
    if (!key || !file) return;
    if (
      file.size > 8 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      alert(
        "To save this image in your project, choose a PNG, JPEG, WebP, or GIF smaller than 8 MB.",
      );
      return;
    }
    const ctx = wbContext?.token;
    const reader = new FileReader();
    reader.onload = () => {
      if (wbContext?.token !== ctx) return;
      wbAssets[key] = reader.result;
      wbNotify();
    };
    reader.readAsDataURL(file);
  }
  wbNotify();
});
document.addEventListener("click", () => setTimeout(wbNotify, 0));
document
  .querySelectorAll("img")
  .forEach((image) => image.addEventListener("load", wbNotify));
const wbStyle = document.createElement("style");
wbStyle.textContent =
  "body{background:#f6f3ed}body>header,body>.topbar,.project-bar{display:none!important}main{padding-top:24px!important}body>main>section:first-child>h1,body>main>section:first-child>.lede{display:none}";
document.head.append(wbStyle);
