const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectCards", {
  getLocale: () => ipcRenderer.invoke("app:locale"),
  getBrand: () => ipcRenderer.invoke("app:brand"),
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  installUpdate: (opts) => ipcRenderer.invoke("update:install", opts || {}),
  selectUpdateFeed: () => ipcRenderer.invoke("update:selectFeedDir"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (partial) => ipcRenderer.invoke("config:set", partial),
  selectRoot: () => ipcRenderer.invoke("catalog:selectRoot"),
  scan: () => ipcRenderer.invoke("catalog:scan"),
  createFolder: (name, description) =>
    ipcRenderer.invoke("catalog:createFolder", { name, description }),
  setProjectMeta: (path, patch) =>
    ipcRenderer.invoke("meta:setProject", { path, ...patch }),
  addTag: (name) => ipcRenderer.invoke("meta:addTag", { name }),
  openProject: (editor, folderPath) =>
    ipcRenderer.invoke("project:open", { editor, folderPath }),
  openFolder: (folderPath) => ipcRenderer.invoke("shell:openFolder", folderPath),
  showInFolder: (folderPath) => ipcRenderer.invoke("shell:showItem", folderPath),
  onCatalogChanged: (cb) => {
    const handler = () => cb();
    ipcRenderer.on("catalog:changed", handler);
    return () => ipcRenderer.removeListener("catalog:changed", handler);
  },
});
