const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const FILE_NAME = "project-cards-config.json";

const DEFAULT_TAGS_RU = ["Работа", "Учёба", "Личное", "Архив"];
const DEFAULT_TAGS_EN = ["Work", "Study", "Personal", "Archive"];

const DEFAULTS = {
  rootPath: "",
  cursorPath: "",
  vsCodePath: "",
  tags: [],
  projects: {},
  sortBy: "name",
  /** Folder where new Setup.exe + update-manifest.json are published */
  updateFeedDir: "D:\\Project\\просмотр\\release",
};

function configPath() {
  return path.join(app.getPath("userData"), FILE_NAME);
}

function normalizeConfig(raw) {
  const cfg = { ...DEFAULTS, ...(raw || {}) };
  if (!Array.isArray(cfg.tags)) cfg.tags = [];
  if (!cfg.projects || typeof cfg.projects !== "object") cfg.projects = {};
  if (!["name", "rating", "rating-asc"].includes(cfg.sortBy)) cfg.sortBy = "name";
  return cfg;
}

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return normalizeConfig({ ...DEFAULTS });
  }
}

function writeConfig(partial) {
  const next = normalizeConfig({ ...readConfig(), ...partial });
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function ensureDefaultTags(isRussian) {
  const cfg = readConfig();
  if (cfg.tags.length > 0) return cfg;
  return writeConfig({
    tags: isRussian ? DEFAULT_TAGS_RU : DEFAULT_TAGS_EN,
  });
}

function getProjectMeta(projectPath) {
  const cfg = readConfig();
  const meta = cfg.projects[projectPath] || {};
  return {
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    rating: Number.isFinite(meta.rating) ? Math.min(5, Math.max(0, Math.round(meta.rating))) : 0,
  };
}

function setProjectMeta(projectPath, patch) {
  const cfg = readConfig();
  const prev = getProjectMeta(projectPath);
  const nextMeta = {
    tags: Array.isArray(patch.tags) ? [...new Set(patch.tags.map(String))] : prev.tags,
    rating:
      patch.rating === undefined
        ? prev.rating
        : Math.min(5, Math.max(0, Math.round(Number(patch.rating) || 0))),
  };
  const projects = { ...cfg.projects, [projectPath]: nextMeta };
  // drop empty meta to keep file small
  if (!nextMeta.tags.length && !nextMeta.rating) {
    delete projects[projectPath];
  }
  return writeConfig({ projects });
}

function addGlobalTag(tagName) {
  const name = String(tagName || "").trim();
  if (!name) throw new Error("Empty tag");
  const cfg = readConfig();
  if (cfg.tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
    return cfg;
  }
  return writeConfig({ tags: [...cfg.tags, name] });
}

module.exports = {
  readConfig,
  writeConfig,
  DEFAULTS,
  ensureDefaultTags,
  getProjectMeta,
  setProjectMeta,
  addGlobalTag,
};
