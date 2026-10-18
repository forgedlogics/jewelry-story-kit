const $ = (id) => document.getElementById(id);
const media = {};
const panels = [null, $('panel-1'), $('panel-2'), $('panel-3'), $('panel-4')];
let current = 1;

const toast = (text) => {
  const node = $('toast');
  node.textContent = text;
  node.classList.add('show');
  setTimeout(() => node.classList.remove('show'), 2600);
};

const details = () => ({
  name: $('piece-name').value.trim() || 'Untitled jewelry project',
  direction: $('direction').value.trim() || 'A study in material, motif, and personal expression.',
  metal: $('metal').value.trim() || 'selected metal',
  stones: $('stones').value.trim() || 'selected stones'
});

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

function show(step) {
  current = step;
  panels.forEach((panel, index) => panel && panel.classList.toggle('is-hidden', index !== step));
  document.querySelectorAll('[data-jump]').forEach((button) => button.classList.toggle('active', +button.dataset.jump === step));
  $('status-text').textContent = ['', 'Design setup', 'Model campaign', 'Campaign plan', 'Ready to export'][step];
}

function openCodex(prompt) {
  navigator.clipboard?.writeText(prompt);
  toast('Brief copied — attach your reference image in Codex, then paste.');
  window.open('https://chatgpt.com/', '_blank', 'noopener');
}

function attach(inputId, outputId, key) {
  $(inputId).onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))return toast('Choose a PNG, JPEG, WebP, or GIF smaller than 8 MB.');
    media[key] = URL.createObjectURL(file);
    $(outputId).src = media[key];
    $(outputId).hidden = false;
    if (key === 'product') show(2);
    if (['hero', 'detail', 'editorial'].every((name) => media[name])) show(3);
  };
}

const renderBrief = () => {
  const value = details();
  return `Use my attached sketch as the exact reference. Create a high-end photorealistic studio render of ${value.name}. Inspiration: ${value.direction}. Materials: ${value.metal}, ${value.stones}. Preserve silhouette and motifs. Luxury lighting, no text, no watermark.`;
};

const shotBrief = (key) => {
  const value = details();
  const kind = {
    hero: 'front-facing luxury hero portrait',
    detail: 'profile or macro jewelry detail on model',
    editorial: 'editorial fashion campaign frame'
  }[key];
  return `Attach my approved product render of ${value.name}. Create an HD ${kind}, preserving the exact piece, metal, stones, motifs and scale. No text or watermark.`;
};

function buildPlan() {
  if (!['hero', 'detail', 'editorial'].every((key) => media[key])) return toast('Finish the three model images first.');
  const value = details();
  $('guide').innerHTML = `<p class="eyebrow">CAMPAIGN GUIDE</p><h3>${escapeHtml(value.name)}: from sketch to presence.</h3><div class="guide-block"><b>Target customer</b><p>Design-conscious jewelry buyers who value story-led pieces and thoughtful craft.</p></div><div class="guide-block"><b>Launch sequence</b><p>1. Sketch teaser · 2. Product reveal · 3. Hero portrait · 4. Editorial CTA.</p></div><div class="guide-block"><b>Caption</b><p>“From a line on paper to a piece with presence.”</p></div>`;
  const launchCopy=window.workbenchLaunchCopy||[];
  for(const [heading,body] of launchCopy.filter(([heading])=>['Product narrative','Launch email'].includes(heading))){const block=document.createElement('div');block.className='guide-block';const h=document.createElement('b'),p=document.createElement('p');h.textContent=heading;p.textContent=body;block.append(h,p);$('guide').append(block);}
  show(4);
  buildMoodboard();
}

function buildMoodboard() {
  $('moodboard').innerHTML = ['product', 'hero', 'detail', 'editorial']
    .map((key) => media[key] ? `<img src="${media[key]}" alt="${key}">` : '')
    .join('');
}

function imagePage(key, label, title, caption) {
  if (!media[key]) return '';
  return `<section class="book-page book-image-page"><p class="book-kicker">${label}</p><h2 class="book-title">${escapeHtml(title)}</h2><div class="book-image-frame"><img class="book-image" src="${media[key]}" alt="${escapeHtml(title)}"></div><p class="book-caption">${escapeHtml(caption)} · image shown in full without cropping</p><p class="book-footer">Jewelry Campaign Studio</p></section>`;
}

function buildEditorialBook() {
  const value = details();
  const sketchPage = media.sketch
    ? `<section class="book-page book-spread"><div><p class="book-kicker">01 / Original sketch</p><h2 class="book-title">The first line.</h2><p class="book-copy">The sketch establishes the silhouette, rhythm, scale, and signature motif of ${escapeHtml(value.name)}. It is the source of the visual language carried through every campaign image.</p><p class="book-copy"><strong>Material direction:</strong> ${escapeHtml(value.metal)} · ${escapeHtml(value.stones)}</p></div><div class="book-image-frame"><img class="book-image" src="${media.sketch}" alt="Original sketch"></div><p class="book-footer">Inspiration / sketch study</p></section>`
    : '';
  const storyPage = `<section class="book-page"><p class="book-kicker">02 / Inspiration</p><h2 class="book-title">A design with a point of view.</h2><p class="book-subtitle">${escapeHtml(value.direction)}</p><p class="book-copy">This campaign turns the design process into the narrative. The imagery moves from the original idea to the finished piece, then shows how it lives on the body. The result is an editorial story that makes the craftsmanship, material, and emotion of the piece easy to understand.</p><p class="book-footer">Campaign intention</p></section>`;
  const campaignPage = `<section class="book-page"><p class="book-kicker">07 / Campaign rollout</p><h2 class="book-title">How the story unfolds.</h2><div class="book-plan"><article><h3>01 · Intrigue</h3><p>Lead with the sketch and a close crop of the central motif. Invite curiosity around the inspiration.</p></article><article><h3>02 · Reveal</h3><p>Introduce the finished product render. Focus on silhouette, materials, and the craft behind the piece.</p></article><article><h3>03 · Presence</h3><p>Use the hero and detail photographs to show scale, movement, and the emotional impact of wearing it.</p></article><article><h3>04 · Invitation</h3><p>Close with the editorial frame and a clear invitation to save, enquire, or join the waitlist.</p></article></div><p class="book-copy">Suggested social rhythm: sketch teaser → product reveal → model hero/detail → editorial call to action.</p><p class="book-footer">Launch approach</p></section>`;
  const launchPages=(window.workbenchLaunchCopy||[]).filter(([heading])=>['Product narrative','Launch email'].includes(heading)).map(([heading,body])=>`<section class="book-page"><p class="book-kicker">Launch copy / ${escapeHtml(heading)}</p><h2 class="book-title">${escapeHtml(heading)}</h2><p class="book-copy" style="white-space:pre-line">${escapeHtml(body)}</p></section>`).join('');
  $('print-deck').innerHTML = `<section class="book-page book-cover"><div><p class="book-kicker">Jewelry Campaign Studio · Editorial Campaign Book</p><h1 class="book-title">${escapeHtml(value.name)}</h1></div><div><p class="book-subtitle">${escapeHtml(value.direction)}</p><p class="book-meta">${escapeHtml(value.metal)} · ${escapeHtml(value.stones)}</p></div></section>${sketchPage}${storyPage}${imagePage('product', '03 / Finished piece', value.name, 'Approved product render')}${imagePage('hero', '04 / Campaign image one', 'The hero', 'On-model hero portrait')}${imagePage('detail', '05 / Campaign image two', 'The detail', 'Material and form study')}${imagePage('editorial', '06 / Campaign image three', 'The editorial', 'Atmosphere and styling frame')}${campaignPage}${launchPages}`;
}

$('render-brief').onclick = () => openCodex(renderBrief());
$('open-current').onclick = () => openCodex(current === 1 ? renderBrief() : shotBrief('hero'));
document.querySelectorAll('[data-shot]').forEach((button) => {
  button.onclick = () => media.product ? openCodex(shotBrief(button.dataset.shot)) : toast('Add the approved product render first.');
});

attach('sketch', 'sketch-preview', 'sketch');
attach('product', 'product-preview', 'product');
attach('hero', 'hero-preview', 'hero');
attach('detail', 'detail-preview', 'detail');
attach('editorial', 'editorial-preview', 'editorial');
['piece-name', 'direction'].forEach((id) => $(id).oninput = () => { $('project-title').textContent = $('piece-name').value || 'Untitled jewelry project'; });
document.querySelectorAll('[data-jump]').forEach((button) => button.onclick = () => show(+button.dataset.jump));
$('build-campaign').onclick = buildPlan;
$('print').onclick = () => {
  if (!media.product) return toast('Add the product and model images first.');
  buildEditorialBook();
  window.print();
};
$('agency-audit').onclick = () => {
  const value = details();
  const query = new URLSearchParams({ brand: value.name, goal: `Launch ${value.name} through product and editorial imagery.`, audience: 'Design-conscious jewelry buyers', context: value.direction });
  window.open(`https://forgedlogics.github.io/agency-of-tomorrow/?${query}#lab`, '_blank', 'noopener');
};

show(1);
