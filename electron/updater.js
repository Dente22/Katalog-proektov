const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");
const { readConfig } = require("./config");

function parseVersion(v) {
  return String(v || "0.0.0")
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((p) => parseInt(p, 10) || 0);
}

function compareVersions(a, b) {
  const aa = parseVersion(a);
  const bb = parseVersion(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function defaultFeedDir() {
  const fromConfig = readConfig().updateFeedDir;
  if (fromConfig && fs.existsSync(fromConfig)) return fromConfig;

  // Dev / builder output next to this repo
  const localRelease = path.join(__dirname, "..", "release");
  if (fs.existsSync(localRelease)) return localRelease;

  // Packaged: allow a sibling "updates" folder next to install root
  if (app.isPackaged) {
    const nearInstall = path.join(path.dirname(process.execPath), "..", "updates");
    if (fs.existsSync(nearInstall)) return path.resolve(nearInstall);
  }
  return localRelease;
}

function readManifest(feedDir) {
  const manifestPath = path.join(feedDir, "update-manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

function findInstaller(feedDir, preferredName) {
  if (preferredName) {
    const preferred = path.join(feedDir, preferredName);
    if (fs.existsSync(preferred)) return preferred;
  }
  try {
    const files = fs
      .readdirSync(feedDir)
      .filter((f) => /^Katalog-proektov-Setup-.*\.exe$/i.test(f) || /Setup.*\.exe$/i.test(f))
      .map((f) => ({
        name: f,
        full: path.join(feedDir, f),
        mtime: fs.statSync(path.join(feedDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    return files[0]?.full || null;
  } catch {
    return null;
  }
}

function checkForUpdate() {
  const currentVersion = app.getVersion();
  const feedDir = defaultFeedDir();
  if (!feedDir || !fs.existsSync(feedDir)) {
    return {
      ok: false,
      currentVersion,
      feedDir,
      available: false,
      reason: "feed-missing",
    };
  }

  const manifest = readManifest(feedDir);
  const remoteVersion = manifest?.version || null;
  const installer = findInstaller(feedDir, manifest?.installer);

  if (!installer) {
    return {
      ok: true,
      currentVersion,
      feedDir,
      available: false,
      reason: "no-installer",
    };
  }

  // If no manifest version, treat installer as available only when newer filename version matches
  let latestVersion = remoteVersion;
  if (!latestVersion) {
    const m = path.basename(installer).match(/Setup-(\d+\.\d+\.\d+)/i);
    latestVersion = m ? m[1] : null;
  }

  if (!latestVersion) {
    return {
      ok: true,
      currentVersion,
      feedDir,
      available: false,
      reason: "no-version",
      installer,
    };
  }

  const newer = compareVersions(latestVersion, currentVersion) > 0;
  return {
    ok: true,
    currentVersion,
    latestVersion,
    feedDir,
    available: newer,
    installer,
    reason: newer ? "update-available" : "up-to-date",
  };
}

function startInstallerAndQuit(installerPath, silent) {
  if (!installerPath || !fs.existsSync(installerPath)) {
    throw new Error("Installer not found");
  }
  const args = silent ? ["/S"] : [];
  const child = spawn(installerPath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
  setTimeout(() => app.quit(), 400);
  return { ok: true };
}

module.exports = {
  checkForUpdate,
  startInstallerAndQuit,
  defaultFeedDir,
  compareVersions,
};
