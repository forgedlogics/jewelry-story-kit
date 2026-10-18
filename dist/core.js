(function (root) {
  "use strict";
  const object = (v) => v && typeof v === "object" && !Array.isArray(v);
  const text = (v) => typeof v === "string";
  const image = (v) =>
    text(v) &&
    v.length < 12000000 &&
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(v);
  function moduleData(m) {
    return (
      object(m) &&
      (!m.fields ||
        (object(m.fields) &&
          Object.values(m.fields).every(
            (v) => text(v) || typeof v === "boolean",
          ))) &&
      (!m.assets ||
        (object(m.assets) && Object.values(m.assets).every(image))) &&
      (!m.quoteImages ||
        (Array.isArray(m.quoteImages) &&
          m.quoteImages.length <= 4 &&
          m.quoteImages.every(image))) &&
      (!m.image || image(m.image)) &&
      (!m.blocks ||
        (Array.isArray(m.blocks) &&
          m.blocks.length <= 50 &&
          m.blocks.every(
            (b) => Array.isArray(b) && b.length === 2 && b.every(text),
          ))) &&
      (!m.step || (Number.isInteger(m.step) && m.step >= 1 && m.step <= 4))
    );
  }
  function validWorkspace(data) {
    if (
      !object(data) ||
      data.version !== 1 ||
      !Array.isArray(data.projects) ||
      !Array.isArray(data.stones) ||
      data.projects.length > 1000 ||
      data.stones.length > 10000
    )
      return false;
    if (
      data.tools &&
      (!object(data.tools) ||
        !Object.entries(data.tools).every(
          ([key, p]) =>
            ["story", "campaign", "pricing"].includes(key) &&
            object(p) &&
            ["id", "name", "material", "inspiration"].every((k) =>
              text(p[k]),
            ) &&
            object(p.modules) &&
            Object.values(p.modules).every(moduleData),
        ))
    )
      return false;
    const ids = new Set();
    for (const p of data.projects) {
      if (
        !object(p) ||
        !["id", "name", "material", "inspiration"].every((k) => text(p[k])) ||
        !p.id ||
        ids.has(p.id) ||
        !object(p.modules) ||
        !Object.entries(p.modules).every(
          ([k, m]) =>
            ["pricing", "story", "campaign"].includes(k) && moduleData(m),
        )
      )
        return false;
      ids.add(p.id);
    }
    const stoneIds = new Set();
    for (const s of data.stones) {
      if (
        !object(s) ||
        !["id", "name", "source", "verified", "status", "projectId"].every(
          (k) => text(s[k]),
        ) ||
        !s.id ||
        stoneIds.has(s.id) ||
        !Number.isFinite(s.price) ||
        s.price < 0 ||
        !Number.isFinite(s.carat) ||
        s.carat <= 0 ||
        !["Available", "Memo", "On hold", "Sold"].includes(s.status) ||
        (s.projectId && !ids.has(s.projectId))
      )
        return false;
      stoneIds.add(s.id);
    }
    return true;
  }
  function stoneBudget(stones, id) {
    return stones
      .filter((s) => s.projectId === id && s.status !== "Sold")
      .reduce((sum, s) => sum + s.price, 0);
  }
  function transferTool(source, destination, target) {
    const result = structuredClone(destination);
    for (const key of ["name", "material", "inspiration", "detail", "client"])
      if (typeof source[key] === "string") result[key] = source[key];
    if (source.modules.story)
      result.modules.story = structuredClone(source.modules.story);
    const estimate =
      source.modules.pricing?.estimate || source.importedEstimate;
    if (estimate) result.importedEstimate = structuredClone(estimate);
    if (target === "campaign" && source.modules.story?.image) {
      result.modules.campaign = result.modules.campaign || {};
      result.modules.campaign.assets = {
        ...(result.modules.campaign.assets || {}),
        product: source.modules.story.image,
      };
    }
    return result;
  }
  const api = { validWorkspace, stoneBudget, transferTool };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WorkbenchCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
