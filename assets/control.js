// ==========================
// DOM
// ==========================
const startButton = document.getElementById("Start");
const resetButton = document.getElementById("Reset");

const listInput = document.getElementById("ListInput");
const confirmListBtn = document.getElementById("ConfirmList");
const clearListBtn = document.getElementById("ClearList");

const inputField = document.getElementById("InputField");
const confirmPickBtn = document.getElementById("Confirm");
const clearPickBtn = document.getElementById("ClearPick");

const forcedNotice = document.getElementById("forcedNotice");
const forcedIcon = document.getElementById("forcedIcon");
const forcedInfoModal = document.getElementById("forcedInfoModal");
const forcedInfoText = document.getElementById("forcedInfoText");

const bgGrid = document.getElementById("bgGrid");
const bgModal = document.getElementById("bgModal");
const bgModalVideo = document.getElementById("bgModalVideo");
const bgModalTitle = document.getElementById("bgModalTitle");
const bgModalClose = document.getElementById("bgModalClose");
const bgCancelBtn = document.getElementById("bgCancelBtn");
const bgApplyBtn = document.getElementById("bgApplyBtn");

// ==========================
// Keys
// ==========================
const KEY_LIST = "ArrDAIKIN";
const KEY_WINNERS = "DAIKINDaTrungThuong";
const KEY_FORCED = "ArrDAIKINTrungThuong"; // ép trúng chờ quay
const KEY_BG = "backgroundVideo";
const KEY_BTN_START = "btnStart";
const KEY_RESET_SO = "Reset_So";

// ==========================
// State
// ==========================
let selectedRowEl = null;
let selectedRawValue = null;     // đang chọn trên bảng (chưa confirm)
let confirmedForcedValue = null; // đã confirm ép trúng (ArrDAIKINTrungThuong)
let selectedBgUrl = null;

// ==========================
// Helpers
// ==========================
function ensureArray(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { }
  localStorage.setItem(key, JSON.stringify([]));
  return [];
}

function normalizeLine(s) {
  return (s || "").toString().replace(/\r/g, "").trim();
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
  });
}

function readStoredBackground() {
  const raw = localStorage.getItem(KEY_BG);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch (e) {
    return raw;
  }
}
function writeStoredBackground(url) {
  if (!url) return;
  localStorage.setItem(KEY_BG, JSON.stringify(url));
}

function readForced() {
  const raw = localStorage.getItem(KEY_FORCED);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function writeForced(valOrNull) {
  localStorage.setItem(KEY_FORCED, JSON.stringify(valOrNull));
}

function hideForcedNotice() {
  if (!forcedNotice) return;
  forcedNotice.style.display = "none";
  forcedNotice.textContent = "";
}
function showForcedNotice(text) {
  if (!forcedNotice) return;
  forcedNotice.style.display = "block";
  forcedNotice.textContent = text;
}

// ==========================
// Start/Dừng UI
// ==========================
function setRunningUI(isRunning) {
  if (!startButton) return;
  if (isRunning) {
    startButton.classList.add("is-running");
    startButton.textContent = "DỪNG";
  } else {
    startButton.classList.remove("is-running");
    startButton.textContent = "BẮT ĐẦU";
  }
}
function getRunningState() {
  try {
    return JSON.parse(localStorage.getItem(KEY_BTN_START)) === true;
  } catch (e) {
    return false;
  }
}
function setRunningState(next) {
  localStorage.setItem(KEY_BTN_START, JSON.stringify(!!next));
  setRunningUI(!!next);
}

// ==========================
// Forced icon + popup info
// - chỉ hiện khi ĐÃ CONFIRM ép trúng
// - popup ưu tiên phía trên nút
// ==========================
function setForcedInfoConfirmed(valueOrNull) {
  confirmedForcedValue = valueOrNull;

  if (!forcedIcon) return;

  if (valueOrNull) {
    forcedIcon.style.display = "inline-flex";
    forcedIcon.dataset.value = valueOrNull;
  } else {
    forcedIcon.style.display = "none";
    forcedIcon.dataset.value = "";
    hideForcedInfoPopup();
  }
}

function showForcedInfoPopup() {
  if (!forcedInfoModal || !forcedInfoText || !forcedIcon) return;
  const val = forcedIcon.dataset.value || "";
  if (!val) return;

  forcedInfoText.textContent = val;

  forcedInfoModal.style.display = "block";
  forcedInfoModal.style.left = "0px";
  forcedInfoModal.style.top = "0px";

  const r = forcedIcon.getBoundingClientRect();
  const popW = forcedInfoModal.offsetWidth || 320;
  const popH = forcedInfoModal.offsetHeight || 120;

  let left = r.left + r.width / 2 - popW / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - popW - 10));

  let top = r.top - popH - 10;       // ✅ phía trên
  if (top < 10) top = r.bottom + 10; // fallback nếu không đủ chỗ

  forcedInfoModal.style.left = left + "px";
  forcedInfoModal.style.top = top + "px";
}

function hideForcedInfoPopup() {
  if (!forcedInfoModal) return;
  forcedInfoModal.style.display = "none";
}

forcedIcon?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (forcedInfoModal.style.display === "block") hideForcedInfoPopup();
  else showForcedInfoPopup();
});

document.addEventListener("click", (e) => {
  if (!forcedInfoModal || forcedInfoModal.style.display !== "block") return;
  const t = e.target;
  if (t === forcedIcon || forcedInfoModal.contains(t)) return;
  hideForcedInfoPopup();
});

// ==========================
// nhapdanhsachquay() giữ hỏi reset winners + lọc trùng + loại người đã trúng nếu chọn no
// ==========================
function nhapdanhsachquay() {
  let ArrDAIKIN = [];
  let DAIKINDaTrungThuong = ensureArray(KEY_WINNERS);

  let inputText = normalizeLine(listInput ? listInput.value : "");
  if (!inputText) {
    // Không bật popup khi ô list trống
    showForcedNotice("⚠ Vui lòng nhập danh sách dự thưởng vào ô danh sách trước khi xác nhận.");
    return [];
  }
  const lines = inputText.split(/\r?\n/);

  if (DAIKINDaTrungThuong.length > 0) {
    let resetResponse = "";
    while (true) {
      resetResponse = prompt(
        "Bạn có muốn reset danh sách đã trúng thưởng không? (yes/no)",
        "no"
      );
      if (resetResponse == null) resetResponse = "no";
      resetResponse = resetResponse.toLowerCase().trim();
      if (resetResponse === "yes" || resetResponse === "no") break;
      alert("Vui lòng nhập 'yes' hoặc 'no'.");
    }
    if (resetResponse === "yes") {
      DAIKINDaTrungThuong = [];
      localStorage.setItem(KEY_WINNERS, JSON.stringify([]));
    }
  }

  const winnersSet = new Set(DAIKINDaTrungThuong.map((x) => normalizeLine(x)));

  for (let i = 0; i < lines.length; i++) {
    const raw = normalizeLine(lines[i]);
    if (!raw) continue;
    if (raw.toUpperCase() === "NO") continue;
    if (ArrDAIKIN.includes(raw)) continue;
    if (winnersSet.has(raw)) continue;
    ArrDAIKIN.push(raw);
  }

  localStorage.setItem(KEY_LIST, JSON.stringify(ArrDAIKIN));
  return ArrDAIKIN;
}

// ==========================
// Render tables
// ==========================
function renderPrizeList() {
  const tbody = document.querySelector(".left-panel table tbody");
  if (!tbody) return;

  const list = ensureArray(KEY_LIST);
  tbody.innerHTML = "";

  if (selectedRawValue && !list.includes(selectedRawValue)) {
    selectedRowEl = null;
    selectedRawValue = null;
    if (inputField) inputField.value = "";
  }

  list.forEach((name, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.value = name;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(name).replace(/\n/g, "<br>")}</td>
    `;

    if (selectedRawValue === name) {
      selectedRowEl = tr;
      tr.classList.add("selected");
    }

    tr.addEventListener("click", () => {
      // ✅ click chỉ chọn + fill input, KHÔNG set ArrDAIKINTrungThuong
      if (selectedRowEl && selectedRowEl !== tr) selectedRowEl.classList.remove("selected");
      selectedRowEl = tr;
      selectedRawValue = name;
      tr.classList.add("selected");
      if (inputField) inputField.value = name;

      // ✅ icon/popup chỉ hiện khi confirm, nên click sẽ không bật icon
      hideForcedNotice();
    });

    tbody.appendChild(tr);
  });
}

function renderWinners() {
  const tbody = document.getElementById("spinHistory");
  if (!tbody) return;

  const winners = ensureArray(KEY_WINNERS);
  tbody.innerHTML = "";

  const view = [...winners].reverse();
  view.forEach((name, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${winners.length - idx}</td>
      <td>${escapeHtml(name).replace(/\n/g, "<br>")}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================
// List actions
// ==========================
function handleConfirmList() {
  nhapdanhsachquay();

  selectedRowEl = null;
  selectedRawValue = null;
  if (inputField) inputField.value = "";
  hideForcedNotice();

  // reset ép trúng khi đổi danh sách
  writeForced(null);
  setForcedInfoConfirmed(null);

  renderPrizeList();
  renderWinners();
}

function handleClearList() {
  if (listInput) listInput.value = "";
}

// ==========================
// ✅ ÉP TRÚNG - QUY TRÌNH ĐÚNG
// - click: chỉ chọn
// - confirm: mới set ArrDAIKINTrungThuong + bật icon/popup
// - không đẩy vào winners, không remove khỏi list
// ==========================
function handleConfirmPick() {
  const list = ensureArray(KEY_LIST);
  const typed = normalizeLine(inputField ? inputField.value : "");
  const picked = selectedRawValue || typed;

  if (!picked) return;

  if (!list.includes(picked)) {
    showForcedNotice("⚠ Người này không tồn tại trong danh sách dự thưởng. Hãy chọn từ bảng bên trái.");
    return;
  }

  writeForced(picked);                 // ✅ chỉ confirm mới ghi
  setForcedInfoConfirmed(picked);      // ✅ confirm mới hiện icon
  hideForcedNotice();
}

function handleClearPick() {
  if (selectedRowEl) selectedRowEl.classList.remove("selected");
  selectedRowEl = null;
  selectedRawValue = null;
  if (inputField) inputField.value = "";

  hideForcedNotice();

  // ✅ BỎ = xóa ArrDAIKINTrungThuong + tắt icon/popup
  writeForced(null);
  setForcedInfoConfirmed(null);
}

// ==========================
// Background modal
// ==========================
function openBgModal(url, title) {
  if (!bgModal || !bgModalVideo || !bgModalTitle) return;
  selectedBgUrl = url;

  bgModalTitle.textContent = title || "Xem trước background";
  bgModal.style.display = "flex";

  bgModalVideo.pause();
  bgModalVideo.removeAttribute("src");
  bgModalVideo.load();

  bgModalVideo.src = url;
  bgModalVideo.load();

  const p = bgModalVideo.play();
  if (p && typeof p.catch === "function") p.catch(() => { });
}

function closeBgModal() {
  if (!bgModal || !bgModalVideo) return;
  bgModal.style.display = "none";
  bgModalVideo.pause();
  bgModalVideo.removeAttribute("src");
  bgModalVideo.load();
  selectedBgUrl = null;
}

bgModalClose?.addEventListener("click", closeBgModal);
bgCancelBtn?.addEventListener("click", closeBgModal);
bgModal?.addEventListener("click", (e) => {
  if (e.target === bgModal) closeBgModal();
});

bgApplyBtn?.addEventListener("click", () => {
  if (!selectedBgUrl) return;
  writeStoredBackground(selectedBgUrl);

  bgGrid?.querySelectorAll(".bg-tile.selected").forEach((el) => el.classList.remove("selected"));
  const match = bgGrid?.querySelector(`.bg-tile[data-url="${CSS.escape(selectedBgUrl)}"]`);
  if (match) match.classList.add("selected");

  closeBgModal();
});

// ==========================
// ✅ Background tiles: ẨN file không tồn tại
// ✅ GIỮ đúng thứ tự trái->phải (append tile theo thứ tự, nhưng ẩn đến khi probe ok)
// ✅ LUÔN có nút XEM/CHỌN trên thumbnail
// ==========================
function initBackgroundTiles() {
  if (!bgGrid) return;

  const files = Array.isArray(window.BACKGROUND_VIDEO_FILES) ? window.BACKGROUND_VIDEO_FILES : [];
  const basePath = window.BACKGROUND_BASE_PATH || "assets/background/";
  const fallbackPoster = basePath + "Man%20led.png";

  bgGrid.innerHTML = "";
  if (!files.length) return;

  const stored = readStoredBackground();

  files.forEach((fileName) => {
    const url = basePath + encodeURIComponent(fileName).replace(/%2F/g, "/");

    // tạo tile theo thứ tự ngay từ đầu
    const tile = document.createElement("div");
    tile.className = "bg-tile";
    tile.dataset.url = url;
    tile.style.display = "none"; // ✅ ẩn cho đến khi probe ok

    const thumb = document.createElement("div");
    thumb.className = "bg-thumb";

    const caption = document.createElement("div");
    caption.className = "bg-caption";
    caption.textContent = fileName;

    // ảnh preview nếu có (video1.png...), không có thì fallback
    const posterGuess = url.replace(/\.(mp4|webm|ogg)$/i, ".png");
    const img = document.createElement("img");
    img.alt = fileName;
    img.loading = "lazy";
    img.src = posterGuess;
    img.onerror = () => {
      img.onerror = null;
      img.src = fallbackPoster;
    };

    // ✅ nút XEM/CHỌN luôn hiển thị
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bg-btn";
    btn.textContent = "XEM / CHỌN";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBgModal(url, fileName);
    });

    thumb.appendChild(img);
    thumb.appendChild(btn);

    tile.appendChild(thumb);
    tile.appendChild(caption);

    tile.addEventListener("click", () => openBgModal(url, fileName));

    if (stored && stored === url) tile.classList.add("selected");

    // append theo đúng thứ tự
    bgGrid.appendChild(tile);

    // probe video để quyết định hiện/ẩn
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.playsInline = true;

    const cleanup = () => {
      try {
        probe.pause();
        probe.removeAttribute("src");
        probe.load();
      } catch (e) { }
    };

    probe.onerror = () => {
      cleanup();
      tile.remove(); // ❌ không tồn tại -> remove
    };

    probe.onloadedmetadata = () => {
      cleanup();
      tile.style.display = ""; // ✅ tồn tại -> show (giữ đúng vị trí)
    };

    try {
      probe.src = url;
    } catch (e) {
      tile.remove();
    }
  });
}

// ==========================
// Events
// ==========================
confirmListBtn?.addEventListener("click", handleConfirmList);
clearListBtn?.addEventListener("click", handleClearList);

confirmPickBtn?.addEventListener("click", handleConfirmPick);
clearPickBtn?.addEventListener("click", handleClearPick);

startButton?.addEventListener("click", () => {
  const cur = getRunningState();
  setRunningState(!cur);
});

resetButton?.addEventListener("click", () => {
  localStorage.setItem(KEY_RESET_SO, String(Date.now()));
});

// ==========================
// Init
// ==========================
ensureArray(KEY_WINNERS);
ensureArray(KEY_LIST);

setRunningUI(getRunningState());
renderPrizeList();
renderWinners();
initBackgroundTiles();

// load trạng thái ép trúng (nếu có) -> hiện icon
const forced = readForced();
setForcedInfoConfirmed(forced ? forced : null);

window.addEventListener("storage", (e) => {
  if (e.key === KEY_BTN_START) setRunningUI(getRunningState());
  if (e.key === KEY_LIST) renderPrizeList();
  if (e.key === KEY_WINNERS) renderWinners();
  if (e.key === KEY_BG) initBackgroundTiles();
  if (e.key === KEY_FORCED) {
    const v = readForced();
    setForcedInfoConfirmed(v ? v : null);
  }
});
