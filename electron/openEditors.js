const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function exists(p) {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch {
    return false;
  }
}

function defaultCursorPath() {
  const local = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(local, "Programs", "cursor", "Cursor.exe"),
    path.join(local, "Programs", "Cursor", "Cursor.exe"),
  ];
  return candidates.find(exists) || "";
}

function defaultVsCodePath() {
  const local = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const candidates = [
    path.join(local, "Programs", "Microsoft VS Code", "Code.exe"),
    path.join(programFiles, "Microsoft VS Code", "Code.exe"),
    path.join(programFiles, "Microsoft VS Code Insiders", "Code - Insiders.exe"),
  ];
  return candidates.find(exists) || "";
}

function resolveEditorPath(kind, config) {
  if (kind === "cursor") {
    return config.cursorPath && exists(config.cursorPath)
      ? config.cursorPath
      : defaultCursorPath();
  }
  return config.vsCodePath && exists(config.vsCodePath)
    ? config.vsCodePath
    : defaultVsCodePath();
}

function openInEditor(kind, folderPath, config) {
  const exe = resolveEditorPath(kind, config);
  if (!exe) {
    const label = kind === "cursor" ? "Cursor" : "VS Code";
    throw new Error(`${label} не найден. Укажите путь в настройках или установите редактор.`);
  }
  if (!exists(folderPath)) {
    throw new Error("Папка проекта не найдена");
  }

  // -n / --new-window: open in a new window
  const child = spawn(exe, [folderPath, "-n"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return { ok: true, exe };
}

module.exports = {
  openInEditor,
  defaultCursorPath,
  defaultVsCodePath,
  resolveEditorPath,
};
