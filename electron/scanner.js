const fs = require("fs/promises");
const path = require("path");

const CARD_FILES = ["card.md", "card.dm"];
const LOGO_BASES = ["logo", "icon", "favicon"];
const LOGO_EXTS = [".svg", ".png", ".webp", ".jpg", ".jpeg", ".ico", ".gif"];
const PREFERRED_DIRS = ["assets", "public", "media", "images", "img", "static", "icons"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  ".venv",
  ".venv-1",
  "venv",
  "dist",
  "dist-electron",
  "build",
  "coverage",
  "out",
  "release",
  "releases",
  ".cursor",
  ".next",
  ".cache",
  "__pycache__",
  "test-results",
  "playwright-report",
]);

function makePreview(text, maxLen = 160) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  const snippet = lines.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
  if (snippet.length <= maxLen) return snippet;
  return snippet.slice(0, maxLen - 1).trimEnd() + "…";
}

function baseRank(base) {
  const i = LOGO_BASES.indexOf(base);
  return i === -1 ? 99 : i;
}

function extRank(ext) {
  const i = LOGO_EXTS.indexOf(ext);
  return i === -1 ? 99 : i;
}

function isLogoFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (!LOGO_EXTS.includes(ext)) return false;
  const base = path.basename(fileName, path.extname(fileName)).toLowerCase();
  return LOGO_BASES.includes(base);
}

async function listEntries(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function findLogoInDir(dir) {
  const entries = await listEntries(dir);
  const files = entries
    .filter((e) => e.isFile() && isLogoFile(e.name))
    .map((e) => {
      const ext = path.extname(e.name).toLowerCase();
      const base = path.basename(e.name, path.extname(e.name)).toLowerCase();
      return {
        full: path.join(dir, e.name),
        score: baseRank(base) * 10 + extRank(ext),
      };
    })
    .sort((a, b) => a.score - b.score);
  return files[0]?.full || null;
}

async function findLogo(projectDir) {
  const rootHit = await findLogoInDir(projectDir);
  if (rootHit) return rootHit;

  const entries = await listEntries(projectDir);
  const dirs = entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name.toLowerCase()))
    .map((e) => e.name);

  const ordered = [
    ...PREFERRED_DIRS.filter((d) =>
      dirs.some((x) => x.toLowerCase() === d)
    ).map((d) => dirs.find((x) => x.toLowerCase() === d)),
    ...dirs
      .filter((d) => !PREFERRED_DIRS.includes(d.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  ];

  for (const name of ordered) {
    const hit = await findLogoInDir(path.join(projectDir, name));
    if (hit) return hit;
  }
  return null;
}

async function readCardDescription(dir) {
  for (const fileName of CARD_FILES) {
    const full = path.join(dir, fileName);
    try {
      const content = await fs.readFile(full, "utf8");
      const trimmed = content.trim();
      if (!trimmed) return { description: null, cardFile: fileName };
      return { description: trimmed, cardFile: fileName };
    } catch {
      // try next
    }
  }
  return { description: null, cardFile: null };
}

async function listSubdirs(dir) {
  const entries = await listEntries(dir);
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

async function scanProjects(rootPath) {
  const root = path.resolve(rootPath);
  const cards = [];
  const names = await listSubdirs(root);

  for (const name of names) {
    const absolutePath = path.join(root, name);
    const [{ description, cardFile }, logoPath] = await Promise.all([
      readCardDescription(absolutePath),
      findLogo(absolutePath),
    ]);
    const hasDescription = Boolean(description);
    cards.push({
      id: absolutePath,
      name,
      absolutePath,
      relativePath: name,
      description,
      preview: hasDescription ? makePreview(description) : null,
      cardFile,
      hasDescription,
      logoPath,
    });
  }

  return cards;
}

module.exports = { scanProjects, findLogo };
