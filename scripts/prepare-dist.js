/**
 * Prepare files electron-builder needs before packaging the NSIS installer.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const defaultsDir = path.join(root, "defaults");

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(defaultsDir, { recursive: true });

function copyFirstAvailable(dest, sources) {
  if (fs.existsSync(dest)) return dest;
  for (const src of sources) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log("Copied", path.relative(root, src), "->", path.relative(root, dest));
      return dest;
    }
  }
  return null;
}

copyFirstAvailable(path.join(buildDir, "icon.png"), [
  path.join(root, "assets", "icon.png"),
  path.join(root, "assets", "logo-256.png"),
  path.join(root, "logo.png"),
  path.join(root, "icon.png"),
]);

const ico = path.join(buildDir, "icon.ico");
if (!fs.existsSync(ico)) {
  const result = spawnSync(process.execPath, [path.join(__dirname, "make-app-icon.js")], {
    stdio: "inherit",
  });
  if (result.status !== 0 && !fs.existsSync(ico)) {
    console.error("Could not generate build/icon.ico");
    process.exit(1);
  }
}

const seed = path.join(defaultsDir, "user-config.json");
const example = path.join(defaultsDir, "user-config.example.json");
if (!fs.existsSync(seed) && fs.existsSync(example)) {
  fs.copyFileSync(example, seed);
  console.log("Created defaults/user-config.json from example");
}

if (!fs.existsSync(seed)) {
  fs.writeFileSync(
    seed,
    JSON.stringify(
      {
        rootPath: "",
        cursorPath: "",
        vsCodePath: "",
        tags: ["Работа", "Учёба", "Личное", "Архив"],
        projects: {},
        sortBy: "name",
        updateFeedDir: "",
        scanDepth: 3,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("Wrote empty defaults/user-config.json");
}

console.log("prepare-dist: ok");
