// Splits docs/MANUAL_PERSONAL.md into one Starlight page per H1 chapter.
// The manual stays the single source of truth (it also feeds the release PDF);
// the generated pages are gitignored and rebuilt on every dev/build.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = join(root, "docs", "MANUAL_PERSONAL.md");
const outDir = join(root, "guia", "src", "content", "docs", "manual");

// The table of contents is replaced by the sidebar.
const SKIP = new Set(["Índice"]);

const plainText = (heading) => heading.replace(/[*`]/g, "").trim();
const urlSlug = (text) =>
  new GithubSlugger().slug(text.normalize("NFD").replace(/[̀-ͯ]/g, ""));

const body = readFileSync(source, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");

// Split into chapters on H1, ignoring "#" lines inside fenced code.
const chapters = [];
let inFence = false;
for (const line of body.split("\n")) {
  if (/^(```|~~~)/.test(line)) inFence = !inFence;
  const h1 = !inFence && line.match(/^# (.+)$/);
  if (h1) chapters.push({ title: plainText(h1[1]), lines: [] });
  else chapters.at(-1)?.lines.push(line);
}

const pages = chapters.filter((c) => !SKIP.has(c.title));
if (pages.length === 0) throw new Error(`No chapters found in ${source}`);

// Map every heading anchor (as Astro renders it) to the page that holds it.
const anchorPage = new Map();
for (const page of pages) {
  page.slug = urlSlug(page.title);
  const slugger = new GithubSlugger();
  anchorPage.set(slugger.slug(page.title), { page: page.slug, chapter: true });
  inFence = false;
  for (const line of page.lines) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    const heading = !inFence && line.match(/^#{2,6} (.+)$/);
    if (heading) anchorPage.set(slugger.slug(plainText(heading[1])), { page: page.slug });
  }
}

const rewriteLinks = (text, current) =>
  text
    .replace(/\]\(img\//g, "](./img/")
    .replace(/\]\(#([^)]+)\)/g, (match, anchor) => {
      const target = anchorPage.get(decodeURIComponent(anchor));
      if (!target) return match;
      if (target.chapter) return `](../${target.page}/)`;
      return target.page === current ? match : `](../${target.page}/#${anchor})`;
    });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(root, "docs", "img"), join(outDir, "img"), { recursive: true });

pages.forEach((page, index) => {
  const content = page.lines.join("\n").trim().replace(/\n---$/, "").trim();
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(page.title)}`,
    `sidebar: { order: ${index + 1} }`,
    'editUrl: "https://github.com/Leoglez10/app-prestamos-p15/edit/main/docs/MANUAL_PERSONAL.md"',
    "---",
  ].join("\n");
  writeFileSync(join(outDir, `${page.slug}.md`), `${frontmatter}\n\n${rewriteLinks(content, page.slug)}\n`);
});

console.log(`Manual → ${pages.length} pages in guia/src/content/docs/manual/`);
