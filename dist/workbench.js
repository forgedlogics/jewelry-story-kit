"use strict";
const $ = (s) => document.querySelector(s),
  e = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0,
  );
let db,
  state = { version: 1, projects: [], stones: [] },
  current = null,
  view = "dashboard",
  saveQueue = Promise.resolve(),
  frameContext = null;
function notice(text) {
  $("#notice").textContent = text;
}
const valid = WorkbenchCore.validWorkspace;
function save() {
  if (!db) {
    $("#saveStatus").textContent = "Storage unavailable — export a backup";
    return;
  }
  $("#saveStatus").textContent = "Saving…";
  const snapshot = structuredClone(state);
  saveQueue = saveQueue
    .catch(() => {})
    .then(
      () =>
        new Promise((resolve, reject) => {
          const tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put(snapshot, "current");
          tx.oncomplete = () => {
            $("#saveStatus").textContent = "Saved in this browser";
            resolve();
          };
          tx.onerror = () => {
            $("#saveStatus").textContent = "Save failed — export a backup";
            notice(
              "Browser storage could not save your changes. Export a backup now.",
            );
            reject(tx.error);
          };
        }),
    );
  saveQueue.catch(() => {});
}
async function initialize() {
  try {
    db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("jewelry-workbench", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("workspace");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const stored = await new Promise((resolve, reject) => {
      const r = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("current");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (stored) {
      if (!valid(stored)) throw Error("Saved workspace could not be read.");
      state = stored;
    }
    $("#saveStatus").textContent = "Saved in this browser";
  } catch (error) {
    notice(
      error.message || "Storage unavailable. Use export to keep your work.",
    );
    $("#saveStatus").textContent = "Storage unavailable";
  }
  render();
}
function toolSession(tool) {
  state.tools = state.tools || {};
  return (
    state.tools[tool] ||
    (state.tools[tool] = {
      id: "tool:" + tool,
      name: "",
      material: "",
      inspiration: "",
      detail: "",
      client: "",
      modules: {},
    })
  );
}
function project() {
  return current
    ? state.projects.find((p) => p.id === current)
    : ["story", "campaign", "pricing"].includes(view)
      ? toolSession(view)
      : null;
}
function show(next) {
  view = next;
  frameContext = null;
  render();
}
function open(id, next = "brief") {
  current = id;
  show(next);
}
function render() {
  const p = project();
  $("#projectNav").hidden = !current || !p;
  $("#projectName").textContent = p?.name || "";
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("#title").textContent =
    {
      dashboard: "Your tools",
      projects: "Saved linked work",
      stones: "Diamond Ledger",
      brief: p?.name,
      pricing: "Pricing Calculator",
      story: "Story Kit",
      campaign: "Campaign Studio",
    }[view] || "Your projects";
  const main = $("#main");
  if (view === "dashboard") {
    main.innerHTML = `<section class="hero"><div><p class="eyebrow">FOUR TOOLS. YOUR WAY OF WORKING.</p><h2>Open the tool you need.<br>Connect it when you want.</h2><p>Use each tool on its own, or send a brief, estimate, or launch story to another tool. No jewelry-piece project is required.</p></div><div class="hero-mark" aria-hidden="true">◇</div></section><div class="cards tool-cards">${[
      [
        "story",
        "01",
        "Story Kit",
        "Write and edit product stories, social copy, and launch emails.",
        "Open Story Kit",
      ],
      [
        "campaign",
        "02",
        "Campaign Studio",
        "Build visual campaigns and export an editorial campaign book.",
        "Open Campaign Studio",
      ],
      [
        "stones",
        "03",
        "Diamond Ledger",
        "Access your private inventory, or prepare stone costs to use in pricing.",
        "Open Diamond Ledger",
      ],
      [
        "pricing",
        "04",
        "Pricing Calculator",
        "Estimate CAD weight, production costs, selling prices, and client quotes.",
        "Open Pricing Calculator",
      ],
    ]
      .map(
        ([id, num, title, description, label]) =>
          `<article class="card"><span class="badge">TOOL ${num}</span><h3>${title}</h3><p>${description}</p><button ${id === "stones" ? 'data-view="stones"' : `data-tool="${id}"`} class="primary">${label} ↗</button></article>`,
      )
      .join(
        "",
      )}</div><div class="card" style="margin-top:24px"><h3>Work together, only when you choose.</h3><p>Use “Send to another tool” for a one-time handoff. Create an optional linked workspace if you want several tools to share the same ongoing brief.</p><button data-view="projects">Open saved linked work →</button></div>`;
    return;
  }
  if (view === "projects") {
    main.innerHTML = `<div class="card"><h2>Optional linked workspaces</h2><p>Keep tools independent by default. Use a linked workspace only when you want them to share a brief and saved work over time.</p><button class="primary" data-new>Create linked workspace →</button></div><div class="actions"><button id="importPricing">Import saved calculator projects</button></div><input id="search" class="search" placeholder="Search linked work…" aria-label="Search linked work"><div class="cards" id="projectCards">${state.projects.map(card).join("")}</div>${!state.projects.length ? '<p class="muted">No linked workspaces. All four tools are available from All tools.</p>' : ""}`;
    return;
  }
  if (view === "stones") {
    renderStones();
    return;
  }
  if (!p) {
    show("projects");
    return;
  }
  if (view === "brief") {
    const total = stoneBudget(p.id);
    main.innerHTML = `<div class="grid"><form id="briefForm" class="card brief"><p class="eyebrow">THE SOURCE OF TRUTH</p><h2>Design brief</h2><p class="muted">These details follow your project into pricing, storytelling, and campaign planning.</p><label>Piece name<input name="name" required maxlength="150" value="${e(p.name)}"></label><label>Material & finish<input name="material" required maxlength="300" value="${e(p.material)}"></label><label>Inspiration<textarea name="inspiration" maxlength="1200">${e(p.inspiration)}</textarea></label><label>Design details<textarea name="detail" maxlength="1200">${e(p.detail || "")}</textarea></label><label>Client / collection<input name="client" maxlength="200" value="${e(p.client || "")}"></label><label>Project stage<select name="stage">${["Concept", "CAD & costing", "Sampling", "Ready to launch", "Archived"].map((v) => `<option ${v === p.stage ? "selected" : ""}>${v}</option>`).join("")}</select></label><button class="primary">Save design brief</button></form><section><div class="card"><span class="badge">${e(p.stage)}</span><h2>Move the piece forward.</h2><p>01 · Cost the piece and import CAD volume.</p><p>02 · Shape the story and edit the launch copy.</p><p>03 · Add approved visuals and export a campaign book.</p><div class="module-links"><button data-view="pricing">CAD & pricing ↗</button><button data-view="story">Story & copy ↗</button><button data-view="campaign">Campaign studio ↗</button></div></div><div class="card" style="margin-top:18px"><h3>Connected stone budget</h3><p>${money(total)} from assigned stone records</p><button data-view="stones">Manage stones →</button><p class="muted">${p.modules.pricing?.estimate ? `Estimated retail: ${money(p.modules.pricing.estimate.retail)}` : "Open CAD & pricing to build your estimate."}</p></div><div class="actions"><button id="duplicate">Duplicate project</button><button id="exportProject">Export this project</button><button class="danger" id="delete">Delete project</button></div></section></div>`;
    return;
  }
  const labels = {
    pricing:
      "Existing CAD import, costing, and client quote tools. Changes save to this project.",
    story:
      "Build and edit your product narrative and launch copy. Drafts save to this project.",
    campaign:
      "Upload approved visuals, build the campaign guide, and export the editorial PDF. Images save locally with this project.",
  };
  main.innerHTML = `<div class="tool-note"><div><label for="workMode">Work mode</label><select id="workMode"><option value="">Independent · this tool only</option>${state.projects.map((x) => `<option value="${e(x.id)}" ${current === x.id ? "selected" : ""}>Linked: ${e(x.name)}</option>`).join("")}</select><span class="muted">${current ? "Tools share this linked workspace." : "Changes stay in this tool until you choose to send them."}</span></div><div><label for="handoffTarget">Send to another tool</label><select id="handoffTarget">${[
    "story",
    "campaign",
    "pricing",
  ]
    .filter((x) => x !== view)
    .map(
      (x) =>
        `<option value="${x}">${{ story: "Story Kit", campaign: "Campaign Studio", pricing: "Pricing Calculator" }[x]}</option>`,
    )
    .join(
      "",
    )}</select><button id="handoff">Send current work →</button>${view === "pricing" && current ? '<button id="applyStones">Use assigned stone budget</button>' : ""}</div></div>${p.importedEstimate ? `<p class="muted">Estimate received from Pricing Calculator: ${money(p.importedEstimate.retail)} retail before tax. Confirm costs before publishing a price.</p>` : ""}<iframe id="toolFrame" title="${e($("#title").textContent)}" src="tools/${view}/index.html?v=tools-20261017"></iframe>`;
  frameContext = { project: p.id, module: view, token: crypto.randomUUID() };
  $("#toolFrame").onload = () => sendInit();
}
function card(p) {
  return `<article class="card"><span class="badge">${e(p.stage || "Concept")}</span><h3>${e(p.name)}</h3><p>${e(p.material)}</p><p>${Object.keys(p.modules).length}/3 tools started · ${state.stones.filter((s) => s.projectId === p.id).length} stone records</p><button data-open="${e(p.id)}">Open project ↗</button></article>`;
}
function sendInit() {
  const p = project(),
    frame = $("#toolFrame");
  if (!frame || !frameContext || !p) return;
  frame.contentWindow.postMessage(
    {
      type: "workbench:init",
      context: frameContext,
      project: {
        name: p.name,
        material: p.material,
        inspiration: p.inspiration,
        detail: p.detail || "",
        client: p.client || "",
        launchCopy: p.modules.story?.blocks || [],
        stoneDescription: state.stones
          .filter((s) => s.projectId === p.id && s.status !== "Sold")
          .map((s) => s.name)
          .join(", "),
      },
      saved: p.modules[view] || {},
      stoneBudget: stoneBudget(p.id),
    },
    location.origin,
  );
}
function stoneBudget(id) {
  return WorkbenchCore.stoneBudget(state.stones, id);
}
function safeSource(url) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
function renderStones() {
  const p = project();
  $("#main").innerHTML =
    `<div class="card"><h2>Your Diamond Ledger</h2><p>Open the existing private inventory and market-comparison app with your saved records.</p><a class="primary ledger-link" href="https://nikunj-diamond-ledger.nikunj-verma.chatgpt.site" target="_blank" rel="noopener">Open private Diamond Ledger ↗</a></div><h2 style="margin-top:28px">Stone handoff to pricing</h2><p class="muted">These browser-local records are separate from your private Ledger database. Record verified supplier prices, then assign stones to a design. Each row is one stone or parcel; price is the total for that row. Existing private Diamond Ledger records are not imported automatically.</p><details><summary>Add a stone record</summary><form id="stoneForm" class="card stone-form"><div class="grid"><label>Stock number / description<input name="name" required maxlength="200"></label><label>Supplier<input name="supplier" maxlength="200"></label><label>Total carat weight<input name="carat" type="number" min="0.001" step="0.001" required></label><label>Total price (USD)<input name="price" type="number" min="0" step="0.01" required></label><label>Source URL<input name="source" type="url" required placeholder="https://supplier.example/stone"></label><label>Verified on<input name="verified" type="date" required></label><label>Assign to project<select name="projectId"><option value="">Unassigned</option>${state.projects.map((c) => `<option value="${e(c.id)}" ${p?.id === c.id ? "selected" : ""}>${e(c.name)}</option>`).join("")}</select></label><label>Status<select name="status"><option>Available</option><option>Memo</option><option>On hold</option><option>Sold</option></select></label></div><button class="primary">Save stone record</button></form></details><div class="table-wrap"><table><thead><tr><th>STONE / SUPPLIER</th><th>CARAT</th><th>TOTAL / PER CT</th><th>PROJECT / STATUS</th><th>EVIDENCE</th><th></th></tr></thead><tbody>${state.stones.map((s) => `<tr><td>${e(s.name)}<br><span class="muted">${e(s.supplier)}</span></td><td>${e(s.carat)}</td><td>${money(s.price)}<br><span class="muted">${money(s.price / s.carat)}/ct</span></td><td><select data-stone="${e(s.id)}" data-field="projectId" aria-label="Project for ${e(s.name)}"><option value="">Unassigned</option>${state.projects.map((c) => `<option value="${e(c.id)}" ${s.projectId === c.id ? "selected" : ""}>${e(c.name)}</option>`).join("")}</select><select data-stone="${e(s.id)}" data-field="status" aria-label="Status for ${e(s.name)}">${["Available", "Memo", "On hold", "Sold"].map((v) => `<option ${v === s.status ? "selected" : ""}>${v}</option>`).join("")}</select></td><td>${safeSource(s.source) ? `<a href="${e(safeSource(s.source))}" target="_blank" rel="noopener">Source ↗</a>` : "No source"}<br>${e(s.verified)}</td><td><button data-price-stone="${e(s.id)}">Send to Pricing Calculator</button><button class="danger" data-remove-stone="${e(s.id)}">Remove</button></td></tr>`).join("")}</tbody></table></div>${!state.stones.length ? '<div class="empty">No stone records yet. Add a verified supplier price to start.</div>' : ""}<p class="muted">For your existing private inventory and market comparison: <a href="https://nikunj-diamond-ledger.nikunj-verma.chatgpt.site" target="_blank" rel="noopener">Open original Diamond Ledger ↗</a></p>`;
}
function newProject(data) {
  const now = new Date().toISOString();
  const p = {
    id: crypto.randomUUID(),
    name: data.name,
    material: data.material,
    inspiration: data.inspiration || "",
    detail: data.detail || "",
    client: "",
    stage: "Concept",
    modules: {},
    created: now,
    updated: now,
  };
  state.projects.unshift(p);
  save();
  open(p.id);
}
function importPricing() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("benchmarkJewelryProjectsV2") ||
        localStorage.getItem("jewelryCalculatorProjects") ||
        "[]",
    );
    if (!Array.isArray(saved))
      throw Error("Saved calculator data could not be read.");
    let added = 0;
    for (const old of saved) {
      if (
        !old ||
        !old.formData ||
        typeof old.formData !== "object" ||
        !old.id ||
        state.projects.some((p) => p.legacyPricingId === old.id)
      )
        continue;
      const fields = Object.fromEntries(
        Object.entries(old.formData)
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .map(([k, v]) => [k, String(v)]),
      );
      const metals = {
        10.36: "Sterling silver",
        "11.40": "10K gold",
        "13.50": "14K gold",
        "15.80": "18K gold",
        "19.30": "22K gold",
        21.45: "Platinum 950",
      };
      state.projects.push({
        id: crypto.randomUUID(),
        legacyPricingId: old.id,
        name: String(fields.pieceName || old.projectName || "Imported piece"),
        material: metals[fields.metalType] || "Confirm material",
        inspiration: "",
        detail: "",
        client: fields.clientName || "",
        stage: "CAD & costing",
        modules: { pricing: { fields } },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      added++;
    }
    save();
    render();
    notice(
      added
        ? `Imported ${added} calculator project(s). Original calculator records were kept.`
        : "No new saved calculator projects found in this browser. Open this app in the browser where you used the original calculator.",
    );
  } catch (error) {
    notice(error.message);
  }
}
function download(name, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#new").onclick = () => {
  $("#newForm").reset();
  $("#newDialog").showModal();
};
$("#close").onclick = () => $("#newDialog").close();
$("#newForm").onsubmit = (event) => {
  event.preventDefault();
  newProject(Object.fromEntries(new FormData(event.target)));
  $("#newDialog").close();
};
document.addEventListener("click", (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.dataset.tool) {
    current = null;
    show(b.dataset.tool);
  }
  if (b.dataset.view) {
    if (["dashboard", "stones", "projects"].includes(b.dataset.view))
      current = null;
    show(b.dataset.view);
  }
  if (b.id === "handoff") {
    const target = $("#handoffTarget").value;
    const destination = toolSession(target);
    if (
      Object.keys(destination.modules).length &&
      !confirm(
        "Send this context to " +
          target +
          "? Its existing draft and estimate stay saved; the shared name, material, and inspiration will be updated.",
      )
    )
      return;
    state.tools[target] = WorkbenchCore.transferTool(
      project(),
      destination,
      target,
    );
    save();
    current = null;
    show(target);
    notice("Work copied to this tool. The source remains independent.");
  }
  if (b.dataset.priceStone) {
    const stone = state.stones.find((s) => s.id === b.dataset.priceStone);
    if (!stone) return;
    const target = toolSession("pricing");
    if (
      !confirm(
        "Use " +
          money(stone.price) +
          " as the Pricing Calculator stone cost? This replaces its current stone-cost input.",
      )
    )
      return;
    target.modules.pricing = target.modules.pricing || { fields: {} };
    target.modules.pricing.fields = target.modules.pricing.fields || {};
    target.modules.pricing.fields.stoneCost = String(stone.price);
    save();
    current = null;
    show("pricing");
    notice("Stone price copied to Pricing Calculator.");
  }
  if (b.dataset.open) open(b.dataset.open);
  if (b.hasAttribute("data-new")) $("#new").click();
  if (b.id === "importPricing") importPricing();
  if (b.id === "example")
    newProject({
      name: "Tidal Arc Ring",
      material: "Sterling silver",
      inspiration: "The flowing curves left by receding ocean currents",
      detail: "A broad sculptural band with a flowing ridge and satin finish",
    });
  if (b.id === "duplicate") {
    const copy = structuredClone(project());
    copy.id = crypto.randomUUID();
    copy.name += " copy";
    state.projects.unshift(copy);
    save();
    open(copy.id);
  }
  if (
    b.id === "delete" &&
    confirm(
      "Delete this project and its saved drafts and images? Export a backup first if needed.",
    )
  ) {
    state.stones.forEach((s) => {
      if (s.projectId === current) s.projectId = "";
    });
    state.projects = state.projects.filter((p) => p.id !== current);
    current = null;
    save();
    show("projects");
  }
  if (b.dataset.removeStone && confirm("Remove this stone record?")) {
    state.stones = state.stones.filter((s) => s.id !== b.dataset.removeStone);
    save();
    renderStones();
  }
  if (b.id === "exportProject")
    download("jewelry-project.json", {
      version: 1,
      projects: [project()],
      stones: state.stones.filter((s) => s.projectId === current),
    });
  if (b.id === "applyStones") {
    const p = project();
    p.modules.pricing = p.modules.pricing || {};
    p.modules.pricing.fields = p.modules.pricing.fields || {};
    p.modules.pricing.fields.stoneCost = String(stoneBudget(p.id));
    save();
    sendInit();
    notice("Assigned stone budget applied to this estimate.");
  }
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "briefForm") {
    event.preventDefault();
    const p = project();
    Object.assign(p, Object.fromEntries(new FormData(event.target)), {
      updated: new Date().toISOString(),
    });
    for (const module of Object.values(p.modules)) {
      if (module.fields) {
        delete module.fields.piece;
        delete module.fields.pieceName;
        delete module.fields["piece-name"];
        delete module.fields.material;
        delete module.fields.metal;
        delete module.fields.inspiration;
        delete module.fields.direction;
        delete module.fields.detail;
      }
    }
    save();
    render();
    notice(
      "Design brief saved. Existing generated copy is kept; rebuild it when you want a new draft.",
    );
  }
  if (event.target.id === "stoneForm") {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    if (!safeSource(data.source)) {
      notice("Use an http or https supplier source.");
      return;
    }
    state.stones.unshift({
      ...data,
      id: crypto.randomUUID(),
      price: Number(data.price),
      carat: Number(data.carat),
    });
    save();
    renderStones();
    notice("Stone record saved. Apply the assigned budget from CAD & pricing.");
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "search")
    $("#projectCards").innerHTML =
      state.projects
        .filter((p) =>
          (p.name + " " + p.material)
            .toLowerCase()
            .includes(event.target.value.toLowerCase()),
        )
        .map(card)
        .join("") || "<p>No matching projects.</p>";
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "workMode") {
    current = el.value || null;
    show(view);
    return;
  }
  if (el.dataset.stone) {
    const stone = state.stones.find((s) => s.id === el.dataset.stone);
    if (stone && ["projectId", "status"].includes(el.dataset.field)) {
      stone[el.dataset.field] = el.value;
      save();
    }
  }
});
window.addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== $("#toolFrame")?.contentWindow
  )
    return;
  const msg = event.data;
  if (
    msg?.type !== "workbench:save" ||
    !frameContext ||
    msg.context?.token !== frameContext.token
  )
    return;
  const p = project();
  if (!p || p.id !== frameContext.project) return;
  if (!msg.saved || typeof msg.saved !== "object") return;
  p.modules[frameContext.module] = msg.saved;
  if (msg.common) {
    for (const key of ["name", "material", "inspiration", "detail", "client"]) {
      if (
        typeof msg.common[key] === "string" &&
        (msg.common[key].trim() || !["name", "material"].includes(key))
      )
        p[key] = msg.common[key].slice(
          0,
          key === "inspiration" || key === "detail" ? 1200 : 300,
        );
    }
  }
  $("#projectName").textContent = p.name;
  p.updated = new Date().toISOString();
  save();
});
$("#backup").onclick = () => download("jewelry-workbench-backup.json", state);
$("#restore").onchange = async (event) => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 50000000) throw Error("Use a backup smaller than 50 MB.");
    const data = JSON.parse(await file.text());
    if (!valid(data))
      throw Error("This is not a valid Jewelry Workbench backup.");
    if (
      !confirm(
        "Replace this workspace with the backup? Export your current workspace first if needed.",
      )
    )
      return;
    state = data;
    current = null;
    save();
    show("projects");
    notice("Workspace restored.");
  } catch (error) {
    notice(error.message);
  } finally {
    event.target.value = "";
  }
};
initialize();
