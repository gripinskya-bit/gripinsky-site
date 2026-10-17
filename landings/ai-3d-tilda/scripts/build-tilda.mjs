// Splits src/index.html into Tilda T123 blocks (dist/tilda/NN-name.html) and builds
// dist/tilda-preview.html, which wraps the same blocks in Tilda's own record markup and grid CSS.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(dist, 'tilda');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'tilda.config.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const warnings = new Set();

const attr = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const blocks = [...html.matchAll(/<!-- block:([\w-]+) -->\n([\s\S]*?)\n<!-- \/block -->/g)]
  .map(([, name, code]) => ({ name, code }));
if (blocks[0]?.name !== '00-styles') throw new Error('src/index.html: первым должен идти блок 00-styles');

blocks[0].code = blocks[0].code.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css.trim()}\n</style>`);
// data-block lets a check of the published page confirm every block is there, in order.
for (const b of blocks) b.code = b.code.replace(/^<div class="gai">/, `<div class="gai" data-block="${b.name}">`);

const planLinks = cfg.planLinks ?? {};
const enrollmentOpen = Object.keys(planLinks).length > 0 && Object.values(planLinks).every(Boolean);
if (!enrollmentOpen) warnings.add('planLinks: не у всех тарифов есть ссылка — на странице остаётся окно «Запись пока не открыта».');

const utm = (cfg.modelingCourseUtm ?? '').replace(/^[?&]/, '');
if (!utm) warnings.add('modelingCourseUtm пуст: ссылки на 1–2 уровень моделирования без UTM (см. CLAUDE.md, перед публикацией согласовать).');

for (const file of new Set([...html.matchAll(/src="assets\/([^"]+)"/g)].map(m => m[1]))) {
  if (!(file in (cfg.images ?? {}))) throw new Error(`tilda.config.json: нет ключа images["${file}"]`);
  if (!cfg.images[file]) warnings.add(`images["${file}"]: картинка ещё не загружена в Тильду.`);
}

function render(code, forPreview) {
  code = code.replace(/<button class="cta" data-plan="[^"]*" data-plan-id="(\w+)">([\s\S]*?)<\/button>/g,
    (m, id, inner) => planLinks[id] ? `<a class="cta" href="${attr(planLinks[id])}">${inner}</a>` : m);
  code = enrollmentOpen
    ? code.replace(/<!-- enrollment-closed -->[\s\S]*?<!-- \/enrollment-closed -->\n?/g, '')
    : code.replace(/<!-- \/?enrollment-closed -->/g, '');
  if (utm) code = code.replace(/(data-modeling-course href=")([^"]+)"/g,
    (m, start, href) => `${start}${href}${href.includes('?') ? '&amp;' : '?'}${attr(utm)}"`);
  return code.replace(/src="assets\/([^"]+)"/g, (m, file) =>
    `src="${attr(cfg.images[file] || (forPreview ? `tilda/upload/${file}` : `ЗАГРУЗИТЕ-В-ТИЛЬДУ/${file}`))}"`);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'upload'), { recursive: true });
for (const file of Object.keys(cfg.images)) fs.copyFileSync(path.join(root, 'src/assets', file), path.join(out, 'upload', file));

const rows = [], manifest = [];
for (const { name, code } of blocks) {
  const block = render(code, false);
  fs.writeFileSync(path.join(out, `${name}.html`), block + '\n');
  rows.push([name, (Buffer.byteLength(block) / 1024).toFixed(1) + ' КБ', block.length.toLocaleString('ru') + ' симв.']);
  manifest.push({ order: manifest.length + 1, name, file: `dist/tilda/${name}.html`, bytes: Buffer.byteLength(block), chars: block.length });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({
  builtAt: new Date().toISOString(),
  blocks: manifest,
  images: Object.fromEntries(Object.entries(cfg.images).map(([f, url]) => [f, url || null])),
  enrollmentOpen,
  warnings: [...warnings],
}, null, 2) + '\n');

const title = html.match(/<title>(.*?)<\/title>/)[1];
const description = html.match(/<meta name="description" content="(.*?)">/)[1];
fs.writeFileSync(path.join(out, 'page-settings.txt'), `Настройки страницы в Тильде → Главное / SEO

Заголовок (title):
${title}

Описание (description):
${description}

Блоки T123 добавлять по порядку: ${blocks.map(b => b.name).join(', ')}.
`);

// Tilda renders each T123 block as a record with this markup; tilda-grid is its global stylesheet.
const records = blocks.map(({ code }, i) => `<div id="rec${i + 1}" class="r t-rec" data-record-type="131"><!-- T123 --><div class="t123"><div class="t-container_100"><div class="t-width t-width_100"><!-- nominify begin -->
${render(code, true)}
<!-- nominify end --></div></div></div></div>`).join('\n');
fs.writeFileSync(path.join(dist, 'tilda-preview.html'), `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Предпросмотр в разметке Тильды · ${title}</title>
<link rel="stylesheet" href="https://static.tildacdn.com/css/tilda-grid-3.0.min.css">
</head><body class="t-body" style="margin:0;">
<div id="allrecords" class="t-records">
${records}
</div>
</body></html>
`);

console.table(Object.fromEntries(rows.map(([n, ...r]) => [n, r])));
console.log(`\nГотово: dist/tilda/ (блоки, upload/, page-settings.txt) и dist/tilda-preview.html`);
if (warnings.size) console.log('\nНужно сделать перед публикацией:\n' + [...warnings].map(w => '  • ' + w).join('\n'));
