const path = require("path");
const fs = require("fs");
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeImage,
} = require("electron");
const {
  readConfig,
  writeConfig,
  ensureDefaultTags,
  getProjectMeta,
  setProjectMeta,
  addGlobalTag,
} = require("./config");
const { scanProjects } = require("./scanner");
const { openInEditor, defaultCursorPath, defaultVsCodePath } = require("./openEditors");
const { resolveAppIconPath, resolveBrandLogoPath } = require("./appIcon");
const { checkForUpdate, startInstallerAndQuit, defaultFeedDir } = require("./updater");
const { applySharedUserDataPath, migrateAndSeedUserConfig } = require("./userData");

// Must run before app ready — one settings folder for bat/dev and installer.
applySharedUserDataPath();

// Windows taskbar / pinned shortcuts group by this id (must match appId).
if (process.platform === "win32") {
  app.setAppUserModelId("local.project-cards");
}

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function logoToDataUrl(logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return null;
  try {
    const stat = fs.statSync(logoPath);
    if (stat.size > 800 * 1024) return null;
    const ext = path.extname(logoPath).toLowerCase();
    if (ext === ".svg") {
      const text = fs.readFileSync(logoPath, "utf8");
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    }
    const mime = MIME[ext] || "application/octet-stream";
    const buf = fs.readFileSync(logoPath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function safeFolderName(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\.+$/g, "")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new Error("Invalid folder name");
  }
  return cleaned;
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {fs.FSWatcher | null} */
let watcher = null;
let watchTimer = null;

function isRussian() {
  const locale = (app.getLocale() || "").toLowerCase();
  return locale === "ru" || locale.startsWith("ru-");
}

function createWindow() {
  const iconPath = resolveAppIconPath();
  const appIcon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#12161c",
    title: isRussian() ? "Каталог проектов" : "Project Catalog",
    show: false,
    autoHideMenuBar: true,
    icon: appIcon && !appIcon.isEmpty() ? appIcon : iconPath || undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.platform === "win32" && iconPath) {
    try {
      mainWindow.setIcon(iconPath);
    } catch {
      // ignore
    }
  }

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopWatcher() {
  if (watchTimer) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

function setupWatcher(rootPath) {
  stopWatcher();
  if (!rootPath || !fs.existsSync(rootPath)) return;

  try {
    watcher = fs.watch(rootPath, { recursive: true }, () => {
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        mainWindow?.webContents.send("catalog:changed");
      }, 400);
    });
  } catch {
    // ignore
  }
}

function enrichCards(scanned) {
  return scanned.map((card) => {
    const meta = getProjectMeta(card.absolutePath);
    return {
      ...card,
      logoUrl: logoToDataUrl(card.logoPath),
      tags: meta.tags,
      rating: meta.rating,
    };
  });
}

function registerIpc() {
  ipcMain.handle("app:locale", () => ({
    locale: app.getLocale(),
    russian: isRussian(),
  }));

  ipcMain.handle("app:brand", () => {
    const logoPath = resolveBrandLogoPath();
    return {
      logoUrl: logoToDataUrl(logoPath),
      iconPath: resolveAppIconPath(),
      version: app.getVersion(),
      packaged: app.isPackaged,
    };
  });

  ipcMain.handle("update:check", () => checkForUpdate());

  ipcMain.handle("update:install", (_e, payload) => {
    const info = checkForUpdate();
    const installer = payload?.installer || info.installer;
    const silent = payload?.silent !== false;
    return startInstallerAndQuit(installer, silent);
  });

  ipcMain.handle("update:selectFeedDir", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: isRussian()
        ? "Папка с установщиками обновлений (release)"
        : "Folder with update installers (release)",
      properties: ["openDirectory"],
      defaultPath: defaultFeedDir() || undefined,
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true };
    }
    const updateFeedDir = result.filePaths[0];
    writeConfig({ updateFeedDir });
    return { canceled: false, updateFeedDir, check: checkForUpdate() };
  });

  ipcMain.handle("config:get", () => {
    const cfg = ensureDefaultTags(isRussian());
    return {
      ...cfg,
      detectedCursor: defaultCursorPath(),
      detectedVsCode: defaultVsCodePath(),
    };
  });

  ipcMain.handle("config:set", (_e, partial) => {
    const next = writeConfig(partial || {});
    if (Object.prototype.hasOwnProperty.call(partial || {}, "rootPath")) {
      setupWatcher(next.rootPath);
    }
    return next;
  });

  ipcMain.handle("catalog:selectRoot", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: isRussian()
        ? "Выберите корневую папку с проектами"
        : "Select the root folder with projects",
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true };
    }
    const rootPath = result.filePaths[0];
    const cfg = writeConfig({ rootPath });
    setupWatcher(rootPath);
    return { canceled: false, config: cfg };
  });

  ipcMain.handle("catalog:scan", async () => {
    const cfg = ensureDefaultTags(isRussian());
    if (!cfg.rootPath) {
      return { cards: [], rootPath: "", tags: cfg.tags, sortBy: cfg.sortBy };
    }
    const scanned = await scanProjects(cfg.rootPath);
    const cards = enrichCards(scanned);
    setupWatcher(cfg.rootPath);
    return {
      cards,
      rootPath: cfg.rootPath,
      tags: cfg.tags,
      sortBy: cfg.sortBy,
    };
  });

function skillsSourceDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "skills-template");
  }
  // Skills bundled with this catalog app (D:\Project\просмотр\.cursor\skills)
  return path.join(__dirname, "..", ".cursor", "skills");
}

function writeCardMd(projectDir, description, folderName) {
  const text = String(description || "").trim();
  const content =
    text ||
    (isRussian()
      ? `Папка проекта «${folderName}». Описание пока не заполнено — допишите, о чём этот проект.`
      : `Project folder "${folderName}". Description not filled in yet — write what this project is about.`);
  fs.writeFileSync(path.join(projectDir, "card.md"), `${content}\n`, "utf8");
}

function copySkillsIntoProject(projectDir) {
  const src = skillsSourceDir();
  const dest = path.join(projectDir, ".cursor", "skills");
  if (!fs.existsSync(src)) {
    throw new Error(
      isRussian()
        ? "Не найдены скилы шаблона (.cursor/skills у каталога)"
        : "Template skills not found (.cursor/skills next to the catalog app)"
    );
  }
  fs.mkdirSync(path.join(projectDir, ".cursor"), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

  ipcMain.handle("catalog:createFolder", async (_e, payload) => {
    const cfg = readConfig();
    if (!cfg.rootPath) {
      throw new Error(isRussian() ? "Сначала выберите корень" : "Select a root folder first");
    }
    const name = safeFolderName(payload?.name);
    const full = path.join(cfg.rootPath, name);
    if (fs.existsSync(full)) {
      throw new Error(isRussian() ? "Папка уже существует" : "Folder already exists");
    }
    fs.mkdirSync(full, { recursive: false });
    try {
      writeCardMd(full, payload?.description, name);
      copySkillsIntoProject(full);
    } catch (err) {
      // rollback empty-ish folder if seeding failed mid-way
      try {
        fs.rmSync(full, { recursive: true, force: true });
      } catch {
        // ignore
      }
      throw err;
    }
    return { ok: true, path: full, name };
  });

  ipcMain.handle("meta:setProject", (_e, payload) => {
    const projectPath = payload?.path;
    if (!projectPath) throw new Error("Missing path");
    setProjectMeta(projectPath, {
      tags: payload.tags,
      rating: payload.rating,
    });
    return getProjectMeta(projectPath);
  });

  ipcMain.handle("meta:addTag", (_e, payload) => {
    const cfg = addGlobalTag(payload?.name);
    return { tags: cfg.tags };
  });

  ipcMain.handle("project:open", async (_e, payload) => {
    const { editor, folderPath } = payload || {};
    const cfg = readConfig();
    return openInEditor(editor, folderPath, cfg);
  });

  ipcMain.handle("shell:openFolder", async (_e, folderPath) => {
    if (!folderPath || !fs.existsSync(folderPath)) {
      throw new Error(isRussian() ? "Папка не найдена" : "Folder not found");
    }
    const err = await shell.openPath(folderPath);
    if (err) throw new Error(err);
    return { ok: true };
  });

  ipcMain.handle("shell:showItem", async (_e, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
      shell.showItemInFolder(folderPath);
      return { ok: true };
    }
    return { ok: false };
  });
}

const APP_DISPLAY_NAME = "Каталог проектов";

app.setName(APP_DISPLAY_NAME);

app.whenReady().then(() => {
  migrateAndSeedUserConfig();
  registerIpc();
  createWindow();
  const cfg = readConfig();
  if (cfg.rootPath) setupWatcher(cfg.rootPath);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopWatcher();
  if (process.platform !== "darwin") app.quit();
});
