const api = window.projectCards;

const STR = {
  ru: {
    brand: "Каталог проектов",
    search: "Поиск по имени или описанию…",
    refresh: "Обновить",
    changeRoot: "Сменить корень",
    selectRoot: "Выбрать папку",
    createFolder: "Создать папку",
    createFolderTitle: "Новая папка проекта",
    createFolderPrompt: "Имя папки",
    createFolderDescPrompt: "Краткое описание (для card.md)",
    createFolderOk: "Папка создана: описание и скилы скопированы",
    dialogCancel: "Отмена",
    dialogOk: "Создать",
    dialogSave: "Добавить",
    noRootTitle: "Корневая папка не выбрана",
    noRootHint: "Укажите папку, в которой лежат ваши проекты.",
    noResults: "Ничего не найдено",
    noDescription: "Нет описания",
    emptyCatalog: "В корневой папке нет подпапок проектов",
    projects: "проектов",
    path: "Путь",
    openCursor: "Открыть в Cursor",
    openVsCode: "Открыть в VS Code",
    openFolder: "Открыть папку",
    back: "Назад к каталогу",
    allTags: "Все",
    tags: "Разделы",
    rating: "Рейтинг",
    ratingFilter: "Звёзды",
    allRatings: "Все",
    noRating: "Без оценки",
    sort: "Сортировка",
    sortName: "По имени",
    sortRatingDesc: "Сначала 5★ → 1★",
    sortRatingAsc: "Сначала 1★ → 5★",
    addTag: "Новый раздел",
    addTagPrompt: "Название раздела",
    saveTags: "Сохранить разделы",
    noTags: "Без раздела",
    checkUpdate: "Обновление",
    updateAvailable: "Доступна версия",
    updateInstall: "Обновить сейчас?",
    updateUpToDate: "У вас актуальная версия",
    updateMissing: "Установщик обновления не найден в папке release",
    updateFeed: "Папка обновлений",
  },
  en: {
    brand: "Project Catalog",
    search: "Search by name or description…",
    refresh: "Refresh",
    changeRoot: "Change root",
    selectRoot: "Select folder",
    createFolder: "Create folder",
    createFolderTitle: "New project folder",
    createFolderPrompt: "Folder name",
    createFolderDescPrompt: "Short description (for card.md)",
    createFolderOk: "Folder created: description and skills copied",
    dialogCancel: "Cancel",
    dialogOk: "Create",
    dialogSave: "Add",
    noRootTitle: "No root folder selected",
    noRootHint: "Choose the folder that contains your projects.",
    noResults: "No projects match your search",
    noDescription: "No description",
    emptyCatalog: "No project folders found in the root",
    projects: "projects",
    path: "Path",
    openCursor: "Open in Cursor",
    openVsCode: "Open in VS Code",
    openFolder: "Open folder",
    back: "Back to catalog",
    allTags: "All",
    tags: "Sections",
    rating: "Rating",
    ratingFilter: "Stars",
    allRatings: "All",
    noRating: "Unrated",
    sort: "Sort",
    sortName: "By name",
    sortRatingDesc: "5★ → 1★ first",
    sortRatingAsc: "1★ → 5★ first",
    addTag: "New section",
    addTagPrompt: "Section name",
    saveTags: "Save sections",
    noTags: "No section",
    checkUpdate: "Updates",
    updateAvailable: "New version available",
    updateInstall: "Update now?",
    updateUpToDate: "You are up to date",
    updateMissing: "Update installer not found in release folder",
    updateFeed: "Updates folder",
  },
};

let strings = STR.ru;
let cards = [];
let rootPath = "";
let availableTags = [];
let query = "";
let selectedId = null;
let filterTag = "";
/** null = all, 0 = unrated, 1..5 = exact stars */
let filterRating = null;
let sortBy = "name";
let savedScrollY = 0;
let restoreScrollAfterRender = false;
let brandLogoUrl = null;
let appVersion = "";

function brandHtml() {
  const ver = appVersion ? `<span class="brand-ver">v${escapeHtml(appVersion)}</span>` : "";
  if (brandLogoUrl) {
    return `<div class="brand-lockup"><img class="brand-logo" src="${escapeHtml(brandLogoUrl)}" alt="" /><div class="brand">${escapeHtml(strings.brand)}</div>${ver}</div>`;
  }
  return `<div class="brand-lockup"><div class="brand">${escapeHtml(strings.brand)}</div>${ver}</div>`;
}

const app = document.getElementById("app");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(message, ok = false) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle("ok", ok);
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 4200);
}

/** Electron does not support window.prompt — use an in-app modal instead. */
function showFormDialog({ title, fields, confirmLabel }) {
  return new Promise((resolve) => {
    document.querySelector(".modal-root")?.remove();

    const root = document.createElement("div");
    root.className = "modal-root";
    root.innerHTML = `
      <div class="modal-backdrop" data-modal="cancel"></div>
      <form class="modal" novalidate>
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <div class="modal-fields">
          ${fields
            .map((f, i) => {
              const id = `modal-field-${i}`;
              if (f.multiline) {
                return `<label class="modal-label" for="${id}">${escapeHtml(f.label)}
                  <textarea id="${id}" name="${escapeHtml(f.name)}" rows="3" class="modal-input"></textarea>
                </label>`;
              }
              return `<label class="modal-label" for="${id}">${escapeHtml(f.label)}
                <input id="${id}" name="${escapeHtml(f.name)}" type="text" class="modal-input" autocomplete="off" ${f.required ? "required" : ""} />
              </label>`;
            })
            .join("")}
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" data-modal="cancel">${escapeHtml(strings.dialogCancel)}</button>
          <button type="submit" class="btn">${escapeHtml(confirmLabel || strings.dialogOk)}</button>
        </div>
      </form>
    `;
    document.body.appendChild(root);

    const form = root.querySelector("form");
    const first = root.querySelector("input, textarea");
    const finish = (value) => {
      root.remove();
      resolve(value);
    };

    root.addEventListener("click", (e) => {
      if (e.target?.getAttribute?.("data-modal") === "cancel") finish(null);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = {};
      for (const f of fields) {
        const el = form.elements.namedItem(f.name);
        data[f.name] = el ? String(el.value || "").trim() : "";
      }
      const missing = fields.find((f) => f.required && !data[f.name]);
      if (missing) {
        form.elements.namedItem(missing.name)?.focus();
        return;
      }
      finish(data);
    });

    requestAnimationFrame(() => first?.focus());
  });
}

function metaOf(card) {
  return {
    tags: Array.isArray(card.tags) ? card.tags : [],
    rating: Number(card.rating) || 0,
  };
}

function filteredCards() {
  const q = query.trim().toLowerCase();
  let list = cards.slice();

  if (filterTag === "__none__") {
    list = list.filter((c) => metaOf(c).tags.length === 0);
  } else if (filterTag) {
    list = list.filter((c) => metaOf(c).tags.includes(filterTag));
  }

  if (filterRating === 0) {
    list = list.filter((c) => metaOf(c).rating === 0);
  } else if (filterRating !== null) {
    list = list.filter((c) => metaOf(c).rating === filterRating);
  }

  if (q) {
    list = list.filter((c) => {
      const m = metaOf(c);
      const hay = `${c.name} ${c.description || ""} ${c.relativePath} ${m.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  list.sort((a, b) => {
    if (sortBy === "rating") return (metaOf(b).rating || 0) - (metaOf(a).rating || 0) || a.name.localeCompare(b.name);
    if (sortBy === "rating-asc") return (metaOf(a).rating || 0) - (metaOf(b).rating || 0) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return list;
}

async function loadCatalog() {
  const keepScroll = !selectedId;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const data = await api.scan();
  cards = data.cards || [];
  rootPath = data.rootPath || "";
  availableTags = data.tags || [];
  sortBy = data.sortBy || "name";
  render();
  if (keepScroll) {
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
  }
}

async function init() {
  const locale = await api.getLocale();
  strings = locale.russian ? STR.ru : STR.en;
  document.documentElement.lang = locale.russian ? "ru" : "en";
  document.title = strings.brand;
  try {
    const brand = await api.getBrand();
    brandLogoUrl = brand?.logoUrl || null;
    appVersion = brand?.version || "";
  } catch {
    brandLogoUrl = null;
  }
  await loadCatalog();
  api.onCatalogChanged(() => {
    void loadCatalog();
  });
  // Soft update check on startup (packaged or when release/ exists)
  try {
    const info = await api.checkUpdate();
    if (info?.available) {
      const msg = `${strings.updateAvailable} ${info.latestVersion} (сейчас ${info.currentVersion}).\n${strings.updateInstall}`;
      if (window.confirm(msg)) {
        await api.installUpdate({ installer: info.installer, silent: true });
      }
    }
  } catch {
    // ignore
  }
}

function toneFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return 150 + (hash % 140);
}

function initialOf(name) {
  const ch = (name || "?").trim().charAt(0);
  return ch.toUpperCase() || "?";
}

function starsHtml(rating, interactive, projectPath) {
  const value = Number(rating) || 0;
  const stars = [1, 2, 3, 4, 5]
    .map((n) => {
      const on = n <= value ? " on" : "";
      if (!interactive) return `<span class="star${on}">★</span>`;
      return `<button type="button" class="star-btn${on}" data-action="setRating" data-path="${escapeHtml(projectPath)}" data-rating="${n}" title="${n}">★</button>`;
    })
    .join("");
  return `<div class="stars" aria-label="${escapeHtml(strings.rating)} ${value}/5">${stars}</div>`;
}

function tagsPills(tags) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>`;
}

function mediaHtml(c, kind) {
  const tone = toneFromName(c.name);
  const monoCls = kind === "detail" ? "detail-mono" : "card-mono";
  const mono = `<div class="${monoCls}" style="--tone:${tone}">${escapeHtml(initialOf(c.name))}</div>`;
  if (!c.logoUrl) return mono;
  const imgCls = kind === "detail" ? "detail-logo" : "card-logo";
  return `<img class="${imgCls}" src="${escapeHtml(c.logoUrl)}" alt="" loading="lazy" onerror="this.remove()" />${mono}`;
}

function cardHtml(c) {
  const muted = c.hasDescription ? "" : " muted";
  const tone = toneFromName(c.name);
  const meta = metaOf(c);
  const body = c.hasDescription
    ? `<p>${escapeHtml(c.preview || "")}</p>`
    : `<span class="badge">${escapeHtml(strings.noDescription)}</span>`;
  return `
    <article class="card${muted}" style="--tone:${tone}" data-action="openCard" data-id="${escapeHtml(c.id)}" tabindex="0" role="button">
      <div class="card-side">${mediaHtml(c, "card")}</div>
      <div class="card-main">
        <div class="card-top">
          <h3>${escapeHtml(c.name)}</h3>
          ${starsHtml(meta.rating, false)}
        </div>
        ${body}
        ${tagsPills(meta.tags)}
        <div class="card-actions">
          <button type="button" class="btn secondary tiny" data-action="openFolder" data-path="${escapeHtml(c.absolutePath)}">${escapeHtml(strings.openFolder)}</button>
        </div>
      </div>
    </article>`;
}

function filtersHtml() {
  const chips = [
    `<button type="button" class="chip${filterTag === "" ? " active" : ""}" data-action="filterTag" data-tag="">${escapeHtml(strings.allTags)}</button>`,
    `<button type="button" class="chip${filterTag === "__none__" ? " active" : ""}" data-action="filterTag" data-tag="__none__">${escapeHtml(strings.noTags)}</button>`,
    ...availableTags.map(
      (t) =>
        `<button type="button" class="chip${filterTag === t ? " active" : ""}" data-action="filterTag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`
    ),
  ].join("");

  const ratingChips = [
    `<button type="button" class="chip${filterRating === null ? " active" : ""}" data-action="filterRating" data-rating="">${escapeHtml(strings.allRatings)}</button>`,
    ...[5, 4, 3, 2, 1].map(
      (n) =>
        `<button type="button" class="chip${filterRating === n ? " active" : ""}" data-action="filterRating" data-rating="${n}">${"★".repeat(n)}</button>`
    ),
    `<button type="button" class="chip${filterRating === 0 ? " active" : ""}" data-action="filterRating" data-rating="0">${escapeHtml(strings.noRating)}</button>`,
  ].join("");

  return `
    <div class="filters">
      <div class="filter-block">
        <span class="filter-label">${escapeHtml(strings.tags)}</span>
        <div class="chips">${chips}</div>
      </div>
      <div class="filter-block">
        <span class="filter-label">${escapeHtml(strings.ratingFilter)}</span>
        <div class="chips">${ratingChips}</div>
      </div>
      <div class="filter-block sort-block">
        <label class="filter-label" for="sortBy">${escapeHtml(strings.sort)}</label>
        <select id="sortBy" class="sort-select">
          <option value="name" ${sortBy === "name" ? "selected" : ""}>${escapeHtml(strings.sortName)}</option>
          <option value="rating" ${sortBy === "rating" ? "selected" : ""}>${escapeHtml(strings.sortRatingDesc)}</option>
          <option value="rating-asc" ${sortBy === "rating-asc" ? "selected" : ""}>${escapeHtml(strings.sortRatingAsc)}</option>
        </select>
      </div>
    </div>`;
}

function detailTagsEditor(card) {
  const meta = metaOf(card);
  const checks = availableTags
    .map((t) => {
      const checked = meta.tags.includes(t) ? "checked" : "";
      return `<label class="tag-check"><input type="checkbox" value="${escapeHtml(t)}" ${checked}/> ${escapeHtml(t)}</label>`;
    })
    .join("");
  return `
    <div class="meta-panel">
      <div class="meta-row">
        <span class="filter-label">${escapeHtml(strings.rating)}</span>
        ${starsHtml(meta.rating, true, card.absolutePath)}
      </div>
      <div class="meta-row">
        <span class="filter-label">${escapeHtml(strings.tags)}</span>
        <div class="tag-checks">${checks || `<span class="muted-text">${escapeHtml(strings.noTags)}</span>`}</div>
        <div class="tag-add">
          <button type="button" class="btn secondary tiny" data-action="addTag">${escapeHtml(strings.addTag)}</button>
          <button type="button" class="btn tiny" data-action="saveTags" data-path="${escapeHtml(card.absolutePath)}">${escapeHtml(strings.saveTags)}</button>
        </div>
      </div>
    </div>`;
}

function renderGrid() {
  const host = document.getElementById("content");
  if (!host) return;
  const list = filteredCards();
  if (!cards.length) {
    host.innerHTML = `<div class="empty"><p>${escapeHtml(strings.emptyCatalog)}</p></div>`;
  } else if (!list.length) {
    host.innerHTML = `<div class="empty"><p>${escapeHtml(strings.noResults)}</p></div>`;
  } else {
    host.innerHTML = `<div class="grid">${list.map(cardHtml).join("")}</div>`;
  }

  host.querySelectorAll('[data-action="openCard"]').forEach((el) => {
    const open = () => {
      savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      selectedId = el.getAttribute("data-id");
      render();
    };
    el.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      open();
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  host.querySelectorAll('[data-action="openFolder"]').forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await api.openFolder(el.getAttribute("data-path"));
      } catch (err) {
        toast(err?.message || String(err));
      }
    });
  });
}

function render() {
  if (!rootPath) {
    app.innerHTML = `
      <div class="toolbar">${brandHtml()}</div>
      <div class="empty">
        <h2>${escapeHtml(strings.noRootTitle)}</h2>
        <p>${escapeHtml(strings.noRootHint)}</p>
        <div class="actions">
          <button type="button" data-action="selectRoot" class="btn">${escapeHtml(strings.selectRoot)}</button>
        </div>
      </div>`;
    bindShell();
    return;
  }

  if (selectedId) {
    const card = cards.find((c) => c.id === selectedId);
    if (!card) {
      selectedId = null;
    } else {
      const body = card.hasDescription
        ? escapeHtml(card.description)
        : escapeHtml(strings.noDescription);
      const tone = toneFromName(card.name);
      app.innerHTML = `
        <div class="detail" style="--tone:${tone}">
          <div class="detail-hero">
            ${mediaHtml(card, "detail")}
            <div>
              <h2>${escapeHtml(card.name)}</h2>
              <p class="path"><strong>${escapeHtml(strings.path)}:</strong> ${escapeHtml(card.relativePath)}</p>
            </div>
          </div>
          ${detailTagsEditor(card)}
          <div class="body">${body}</div>
          <div class="actions">
            <button type="button" class="btn" data-action="openCursor" data-path="${escapeHtml(card.absolutePath)}">${escapeHtml(strings.openCursor)}</button>
            <button type="button" class="btn ghost" data-action="openVsCode" data-path="${escapeHtml(card.absolutePath)}">${escapeHtml(strings.openVsCode)}</button>
            <button type="button" class="btn secondary" data-action="openFolder" data-path="${escapeHtml(card.absolutePath)}">${escapeHtml(strings.openFolder)}</button>
            <button type="button" class="btn secondary" data-action="back">${escapeHtml(strings.back)}</button>
          </div>
        </div>`;
      bindShell();
      return;
    }
  }

  app.innerHTML = `
    <div class="toolbar">
      ${brandHtml()}
      <input id="search" class="search" type="search" placeholder="${escapeHtml(strings.search)}" value="${escapeHtml(query)}" />
      <button type="button" class="btn" data-action="createFolder">${escapeHtml(strings.createFolder)}</button>
      <button type="button" class="btn secondary" data-action="checkUpdate">${escapeHtml(strings.checkUpdate)}</button>
      <button type="button" class="btn secondary" data-action="refresh">${escapeHtml(strings.refresh)}</button>
      <button type="button" class="btn secondary" data-action="selectRoot">${escapeHtml(strings.changeRoot)}</button>
    </div>
    ${filtersHtml()}
    <div class="meta">${filteredCards().length}/${cards.length} ${escapeHtml(strings.projects)}${rootPath ? ` · ${escapeHtml(rootPath)}` : ""}</div>
    <div id="content"></div>`;
  bindShell();
  renderGrid();
  if (restoreScrollAfterRender) {
    const y = savedScrollY;
    restoreScrollAfterRender = false;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
  }
}

function applyLocalMeta(projectPath, patch) {
  const card = cards.find((c) => c.absolutePath === projectPath);
  if (!card) return;
  if (patch.tags) card.tags = patch.tags;
  if (patch.rating !== undefined) card.rating = patch.rating;
}

async function bindShell() {
  const search = document.getElementById("search");
  if (search) {
    search.addEventListener("input", (e) => {
      query = e.target.value;
      const meta = document.querySelector(".meta");
      if (meta && !selectedId) {
        meta.textContent = `${filteredCards().length}/${cards.length} ${strings.projects}${rootPath ? ` · ${rootPath}` : ""}`;
      }
      renderGrid();
    });
  }

  const sortSelect = document.getElementById("sortBy");
  if (sortSelect) {
    sortSelect.addEventListener("change", async (e) => {
      sortBy = e.target.value;
      try {
        await api.setConfig({ sortBy });
      } catch {
        // ignore persist errors
      }
      renderGrid();
      const meta = document.querySelector(".meta");
      if (meta) {
        meta.textContent = `${filteredCards().length}/${cards.length} ${strings.projects}${rootPath ? ` · ${rootPath}` : ""}`;
      }
    });
  }

  app.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", async () => {
      const action = el.getAttribute("data-action");
      const folderPath = el.getAttribute("data-path");
      try {
        if (action === "selectRoot") {
          const res = await api.selectRoot();
          if (!res.canceled) {
            selectedId = null;
            filterTag = "";
            filterRating = null;
            await loadCatalog();
          }
        }
        if (action === "refresh") await loadCatalog();
        if (action === "back") {
          selectedId = null;
          restoreScrollAfterRender = true;
          render();
        }
        if (action === "filterTag") {
          filterTag = el.getAttribute("data-tag") || "";
          render();
        }
        if (action === "filterRating") {
          const raw = el.getAttribute("data-rating");
          filterRating = raw === "" || raw === null ? null : Number(raw);
          render();
        }
        if (action === "createFolder") {
          const form = await showFormDialog({
            title: strings.createFolderTitle,
            confirmLabel: strings.dialogOk,
            fields: [
              { name: "name", label: strings.createFolderPrompt, required: true },
              { name: "description", label: strings.createFolderDescPrompt, multiline: true },
            ],
          });
          if (!form) return;
          await api.createFolder(form.name, form.description || "");
          toast(strings.createFolderOk, true);
          await loadCatalog();
        }
        if (action === "checkUpdate") {
          const info = await api.checkUpdate();
          if (info?.available) {
            const msg = `${strings.updateAvailable} ${info.latestVersion} (сейчас ${info.currentVersion}).\n${strings.updateInstall}`;
            if (window.confirm(msg)) {
              await api.installUpdate({ installer: info.installer, silent: true });
            }
          } else if (info?.reason === "up-to-date") {
            toast(`${strings.updateUpToDate} (v${info.currentVersion})`, true);
          } else {
            const pick = window.confirm(
              `${strings.updateMissing}\n${info?.feedDir || ""}\n\n${strings.updateFeed}?`
            );
            if (pick) {
              const res = await api.selectUpdateFeed();
              if (!res.canceled && res.check?.available) {
                if (window.confirm(`${strings.updateAvailable} ${res.check.latestVersion}. ${strings.updateInstall}`)) {
                  await api.installUpdate({ installer: res.check.installer, silent: true });
                }
              } else if (!res.canceled) {
                toast(strings.updateUpToDate, true);
              }
            }
          }
        }
        if (action === "openCursor") {
          await api.openProject("cursor", folderPath);
        }
        if (action === "openVsCode") {
          await api.openProject("vscode", folderPath);
        }
        if (action === "openFolder") {
          await api.openFolder(folderPath);
        }
        if (action === "setRating") {
          const rating = Number(el.getAttribute("data-rating") || 0);
          const meta = await api.setProjectMeta(folderPath, { rating });
          applyLocalMeta(folderPath, meta);
          render();
        }
        if (action === "addTag") {
          const form = await showFormDialog({
            title: strings.addTag,
            confirmLabel: strings.dialogSave,
            fields: [{ name: "name", label: strings.addTagPrompt, required: true }],
          });
          if (!form) return;
          const res = await api.addTag(form.name);
          availableTags = res.tags || availableTags;
          render();
        }
        if (action === "saveTags") {
          const checked = [...app.querySelectorAll('.tag-checks input[type="checkbox"]:checked')].map(
            (i) => i.value
          );
          const meta = await api.setProjectMeta(folderPath, { tags: checked });
          applyLocalMeta(folderPath, meta);
          toast(strings.saveTags, true);
          render();
        }
      } catch (err) {
        toast(err?.message || String(err));
      }
    });
  });
}

init().catch((err) => toast(err?.message || String(err)));
