const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const live = path.join(
  process.env.APPDATA || "",
  "project-cards",
  "project-cards-config.json"
);
const seedPath = path.join(root, "defaults", "user-config.json");

function score(cfg) {
  if (!cfg) return 0;
  const n = cfg.projects ? Object.keys(cfg.projects).length : 0;
  return n * 3 + (cfg.rootPath ? 10 : 0) + (Array.isArray(cfg.tags) ? cfg.tags.length : 0);
}

try {
  if (fs.existsSync(live)) {
    const liveCfg = JSON.parse(fs.readFileSync(live, "utf8"));
    let seedCfg = null;
    try {
      seedCfg = JSON.parse(fs.readFileSync(seedPath, "utf8"));
    } catch {
      seedCfg = null;
    }
    if (score(liveCfg) >= score(seedCfg)) {
      if (!liveCfg.updateFeedDir) {
        liveCfg.updateFeedDir = "D:\\Project\\просмотр\\release";
      }
      fs.mkdirSync(path.dirname(seedPath), { recursive: true });
      fs.writeFileSync(seedPath, JSON.stringify(liveCfg, null, 2), "utf8");
      console.log("Synced defaults/user-config.json from live AppData settings");
    }
  }
} catch (err) {
  console.warn("Could not sync live config into defaults:", err.message);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseDir = path.join(root, "release");

if (!fs.existsSync(releaseDir)) {
  console.error("release/ not found — run electron-builder first");
  process.exit(1);
}

const setup =
  fs
    .readdirSync(releaseDir)
    .filter((f) => f.toLowerCase().endsWith(".exe"))
    .filter((f) => /setup/i.test(f) || /katalog-proektov/i.test(f))
    .sort((a, b) => {
      const sa = fs.statSync(path.join(releaseDir, a)).mtimeMs;
      const sb = fs.statSync(path.join(releaseDir, b)).mtimeMs;
      return sb - sa;
    })[0] || null;

const manifest = {
  version: pkg.version,
  productName: pkg.productName || pkg.name,
  installer: setup,
  generatedAt: new Date().toISOString(),
  notes:
    "Положи новые Setup.exe сюда (release/). Установленное приложение найдёт обновление само. Настройки подтянутся из AppData project-cards.",
};

fs.writeFileSync(
  path.join(releaseDir, "update-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

console.log("Wrote update-manifest.json", manifest);
