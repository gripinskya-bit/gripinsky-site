// Checks a published Tilda page against dist/tilda/manifest.json: blocks present and in order,
// styles and fonts loaded, no image placeholders left, every image reachable.
// Usage: npm run check -- https://gripinsky.ru/ai-3d-test
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const url = process.argv[2];
if (!url) { console.error('Укажите адрес страницы: npm run check -- https://…'); process.exit(2); }
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist/tilda/manifest.json'), 'utf8'));

const results = [];
const check = (ok, label, detail = '') => results.push({ ok, label, detail });

const res = await fetch(url, { redirect: 'follow' });
const html = await res.text();
check(res.ok, `Страница отвечает`, `${res.status} ${res.url}`);

check(html.includes('.gai{--bg:'), 'Блок 00-styles на месте (CSS лендинга)');
check(/fonts\.googleapis\.com\/css2\?family=Geologica/.test(html), 'Шрифты Geologica и Unbounded подключены');

const expected = manifest.blocks.map(b => b.name).filter(n => n !== '00-styles');
const found = [...html.matchAll(/data-block=["']?([\w-]+)/g)].map(m => m[1]);
const missing = expected.filter(n => !found.includes(n));
const dupes = found.filter((n, i) => found.indexOf(n) !== i);
const ordered = found.filter(n => expected.includes(n)).join() === expected.filter(n => found.includes(n)).join();
check(!missing.length, 'Все блоки на странице', missing.length ? `нет: ${missing.join(', ')}` : `${found.length} из ${expected.length}`);
check(!dupes.length, 'Блоки не продублированы', dupes.join(', '));
check(ordered, 'Блоки идут по порядку', ordered ? '' : `на странице: ${found.join(' → ')}`);

check(!html.includes('ЗАГРУЗИТЕ-В-ТИЛЬДУ'), 'Нет заглушек вместо картинок');
const images = Object.keys(manifest.images);
const srcs = [...new Set([...html.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1])
  .filter(s => images.some(f => s.endsWith('/' + f) || s.endsWith(f))))];
check(srcs.length >= images.length, 'Все картинки лендинга есть в коде', `${srcs.length} из ${images.length}`);
for (const src of srcs) {
  const abs = new URL(src, res.url).href;
  const r = await fetch(abs, { method: 'HEAD' }).catch(e => ({ ok: false, status: e.message }));
  check(r.ok, `Картинка открывается: ${path.basename(src)}`, r.ok ? '' : `${r.status} ${abs}`);
}

check(html.includes('class="cookie-banner"'), 'Плашка cookie на месте');
if (!manifest.enrollmentOpen) check(/<dialog[\s>]/.test(html), 'Окно «Запись пока не открыта» на месте');
const robots = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)/i)?.[1] ?? 'не задан';
results.push({ ok: null, label: 'meta robots (для пробной страницы нужен noindex)', detail: robots });

for (const r of results) console.log(`${r.ok === null ? 'ℹ' : r.ok ? '✓' : '✗'} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
const failed = results.filter(r => r.ok === false).length;
console.log(failed ? `\nПроблем: ${failed}` : '\nВсё на месте.');
process.exit(failed ? 1 : 0);
