const fs = require("fs");
const path = require("path");

function preferNames(platform) {
  return platform === "win32" ? ["icon.ico", "icon.png", "logo.png"] : ["icon.png", "logo.png", "icon.ico"];
}

function listCandidates() {
  const names = preferNames(process.platform);
  const roots = [
    path.join(__dirname, "..", "build"),
    path.join(__dirname, "..", "assets"),
    path.join(__dirname, "..", "public"),
    path.join(__dirname, ".."),
  ];
  if (process.resourcesPath) {
    roots.unshift(path.join(process.resourcesPath, "icons"));
    roots.unshift(path.join(process.resourcesPath, "assets"));
    roots.unshift(path.join(process.resourcesPath, "build"));
  }
  const out = [];
  for (const name of names) {
    for (const root of roots) {
      out.push(path.join(root, name));
    }
  }
  return out;
}

function resolveAppIconPath() {
  return listCandidates().find((p) => fs.existsSync(p)) || null;
}

function resolveBrandLogoPath() {
  const names = ["logo.svg", "logo.png", "icon.png"];
  const roots = [
    path.join(__dirname, "..", "assets"),
    path.join(__dirname, "..", "public"),
    path.join(__dirname, ".."),
  ];
  if (process.resourcesPath) {
    roots.unshift(path.join(process.resourcesPath, "assets"));
  }
  for (const name of names) {
    for (const root of roots) {
      const p = path.join(root, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return resolveAppIconPath();
}

module.exports = {
  resolveAppIconPath,
  resolveBrandLogoPath,
  listCandidates,
};
