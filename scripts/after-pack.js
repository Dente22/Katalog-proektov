/**
 * Embed build/icon.ico into the Windows exe. electron-builder's rcedit step
 * is skipped (signAndEditExecutable=false) because winCodeSign fails to
 * extract Darwin symlinks without Developer Mode.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function findRcedit() {
  const local = path.join(__dirname, "rcedit-x64.exe");
  if (fs.existsSync(local)) return local;

  const cache = path.join(
    process.env.LOCALAPPDATA || "",
    "electron-builder-cache",
    "winCodeSign",
    "winCodeSign-2.6.0",
    "rcedit-x64.exe"
  );
  if (fs.existsSync(cache)) return cache;

  throw new Error("rcedit-x64.exe not found (scripts/ or electron-builder-cache)");
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exe = path.join(context.appOutDir, exeName);
  const ico = path.join(context.packager.projectDir, "build", "icon.ico");
  const png = path.join(context.packager.projectDir, "build", "icon.png");

  if (!fs.existsSync(exe)) {
    throw new Error(`afterPack: exe missing ${exe}`);
  }
  if (!fs.existsSync(ico)) {
    throw new Error(`afterPack: icon missing ${ico}`);
  }

  const rcedit = findRcedit();
  execFileSync(rcedit, [exe, "--set-icon", ico], { stdio: "inherit" });

  // Also place icons next to the exe for shortcuts / Explorer.
  fs.copyFileSync(ico, path.join(context.appOutDir, "icon.ico"));
  if (fs.existsSync(png)) {
    fs.copyFileSync(png, path.join(context.appOutDir, "icon.png"));
  }

  console.log("afterPack: embedded app icon into", exeName);
};
