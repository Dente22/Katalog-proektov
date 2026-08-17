const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const CONFIG_NAME = "project-cards-config.json";
const SHARED_DIR_NAME = "project-cards";

function sharedUserDataPath() {
  return path.join(app.getPath("appData"), SHARED_DIR_NAME);
}

/** Keep dev (electron .) and installed app on the same settings folder. */
function applySharedUserDataPath() {
  const target = sharedUserDataPath();
  fs.mkdirSync(target, { recursive: true });
  app.setPath("userData", target);
  return target;
}

function configFileIn(dir) {
  return path.join(dir, CONFIG_NAME);
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function scoreConfig(cfg) {
  if (!cfg || typeof cfg !== "object") return 0;
  const projects = cfg.projects && typeof cfg.projects === "object" ? Object.keys(cfg.projects).length : 0;
  const tags = Array.isArray(cfg.tags) ? cfg.tags.length : 0;
  const root = cfg.rootPath ? 10 : 0;
  return projects * 3 + tags + root + (cfg.sortBy ? 1 : 0);
}

function bundledSeedPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "defaults", CONFIG_NAME);
  }
  return path.join(__dirname, "..", "defaults", "user-config.json");
}

function candidateDirs() {
  const appData = app.getPath("appData");
  return [
    path.join(appData, "project-cards"),
    path.join(appData, "Каталог проектов"),
    path.join(appData, "Electron"),
  ];
}

/**
 * Merge project metas: keep higher rating / union tags.
 */
function mergeConfigs(base, extra) {
  if (!extra) return base || {};
  if (!base) return { ...extra };
  const projects = { ...(base.projects || {}) };
  for (const [key, meta] of Object.entries(extra.projects || {})) {
    const prev = projects[key] || { tags: [], rating: 0 };
    const tags = [...new Set([...(prev.tags || []), ...(meta.tags || [])])];
    const rating = Math.max(Number(prev.rating) || 0, Number(meta.rating) || 0);
    projects[key] = { tags, rating };
  }
  const tags = [...new Set([...(base.tags || []), ...(extra.tags || [])])];
  return {
    ...extra,
    ...base,
    rootPath: base.rootPath || extra.rootPath || "",
    updateFeedDir: base.updateFeedDir || extra.updateFeedDir || "",
    sortBy: base.sortBy || extra.sortBy || "name",
    tags,
    projects,
  };
}

function writeConfigTo(dir, cfg) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configFileIn(dir), JSON.stringify(cfg, null, 2), "utf8");
}

/**
 * Call once after applySharedUserDataPath(), before windows.
 * Picks the richest known config (dev / old install / seed) into shared folder.
 */
function migrateAndSeedUserConfig() {
  const targetDir = app.getPath("userData");
  const targetFile = configFileIn(targetDir);
  const current = readJsonSafe(targetFile);

  let best = current;
  let bestScore = scoreConfig(current);

  for (const dir of candidateDirs()) {
    if (path.resolve(dir) === path.resolve(targetDir)) continue;
    const cfg = readJsonSafe(configFileIn(dir));
    const s = scoreConfig(cfg);
    if (s > bestScore) {
      best = cfg;
      bestScore = s;
    } else if (s > 0 && best) {
      best = mergeConfigs(best, cfg);
      bestScore = scoreConfig(best);
    }
  }

  const seed = readJsonSafe(bundledSeedPath());
  if (scoreConfig(seed) > 0) {
    if (!best || bestScore === 0) {
      best = seed;
    } else {
      // Fill gaps from seed (e.g. missing projects), don't wipe user changes
      best = mergeConfigs(best, seed);
    }
  }

  if (!best) return { migrated: false };

  if (!best.updateFeedDir) {
    best.updateFeedDir = "D:\\Project\\просмотр\\release";
  }

  writeConfigTo(targetDir, best);
  return { migrated: true, path: targetFile, projects: Object.keys(best.projects || {}).length };
}

module.exports = {
  applySharedUserDataPath,
  migrateAndSeedUserConfig,
  bundledSeedPath,
  sharedUserDataPath,
  CONFIG_NAME,
};
