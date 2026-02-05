var desiredLength = 1;
var batdau = "- - -";

var tocdo = 80;
var timecham = tocdo;
var cham = 0;

var ArrDAIKIN = [];
var ArrDAIKINbackup = [];
var index = 0;

var Start = false;
var previous = 0;
var startTime;
var kiemtrachay = false;

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
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v;
  } catch (e) {}
  localStorage.setItem(key, JSON.stringify([]));
  return [];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ==========================
// ✅ Background storage (FIX giật/đứng do JSON.parse)
// ==========================
function readStoredBackground() {
  const raw = localStorage.getItem("backgroundVideo");
  if (!raw) return null;

  // hỗ trợ cả 2 kiểu:
  // 1) kiểu mới: JSON string -> "\"assets/...mp4\""
  // 2) kiểu cũ: string thô -> "assets/...mp4"
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch (e) {
    return raw;
  }
}

function writeStoredBackground(url) {
  if (!url) return;
  // lưu kiểu mới (ổn định, không gây JSON.parse crash)
  localStorage.setItem("backgroundVideo", JSON.stringify(url));
}

// ==========================
// ✅ Cho index.html tự nhập danh sách nếu chưa có
// ==========================
function nhapdanhsachquay() {
  let inputText = prompt("Nhập danh sách (mỗi dòng 1 người/số):");
  if (!inputText) return;

  let lines = inputText
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  // unique
  let set = new Set();
  for (let s of lines) {
    if (s !== "NO") set.add(String(s));
  }
  ArrDAIKIN = Array.from(set);

  if (ArrDAIKIN.length === 0) {
    alert("Không có dữ liệu hợp lệ để quay!");
    return;
  }

  ArrDAIKINbackup = [...ArrDAIKIN];
  shuffleArray(ArrDAIKIN);

  localStorage.setItem("ArrDAIKIN", JSON.stringify(ArrDAIKIN));
  localStorage.setItem("ArrDAIKINbackup", JSON.stringify(ArrDAIKINbackup));

  // đảm bảo các key không null
  ensureArray("DAIKINDaTrungThuong");
  localStorage.setItem("ArrDAIKINTrungThuong", JSON.stringify(null));
}

function init() {
  ArrDAIKIN = JSON.parse(localStorage.getItem("ArrDAIKIN")) || [];
  ArrDAIKINbackup = JSON.parse(localStorage.getItem("ArrDAIKINbackup")) || [];

  // đảm bảo winners luôn là mảng
  ensureArray("DAIKINDaTrungThuong");

  // background mặc định + migrate dữ liệu cũ
  const currentBg = readStoredBackground();
  if (!currentBg) {
    writeStoredBackground("assets/background/video1.mp4");
  } else {
    // migrate string thô -> JSON string
    const raw = localStorage.getItem("backgroundVideo");
    if (raw && raw[0] !== '"') writeStoredBackground(currentBg);
  }

  if (!ArrDAIKIN || ArrDAIKIN.length === 0) {
    nhapdanhsachquay();
    ArrDAIKIN = JSON.parse(localStorage.getItem("ArrDAIKIN")) || [];
  }

  $("#digits").html(batdau);

  // apply background đã lưu
  var savedBackground = readStoredBackground();
  let videoElement = document.getElementById("background-video");
  if (videoElement && savedBackground) changeBackground(savedBackground);
}

function setRandomNumber(timestamp) {
  ArrDAIKIN = JSON.parse(localStorage.getItem("ArrDAIKIN")) || [];
  if (Start === false) return;
  if (!previous) previous = timestamp;

  var progress = timestamp - previous;
  if (progress > tocdo && ArrDAIKIN.length > 0) {
    previous = timestamp;
    index = Math.floor(Math.random() * ArrDAIKIN.length);
    $("#digits").html(ArrDAIKIN[index]);
  }

  requestAnimationFrame(setRandomNumber);
}

function startAnimation() {
  var element = document.getElementById("digits");
  var element2 = document.getElementById("digits2");

  element.classList.remove("run-animation");
  element2.classList.remove("run-animation");
  void element.offsetWidth;
  void element2.offsetWidth;
  element.classList.add("run-animation");
  element2.classList.add("run-animation");
}

function setRandomNumber_Cham(timestamp) {
  ArrDAIKIN = JSON.parse(localStorage.getItem("ArrDAIKIN")) || [];
  if (!startTime) startTime = timestamp;

  // nếu hết người để quay
  if (!ArrDAIKIN || ArrDAIKIN.length === 0) {
    alert("Đã hết danh sách để quay!");
    kiemtrachay = false;
    $("#start").show();
    $("#stop").hide();
    return;
  }

  if (cham < 10) {
    if (timestamp - previous >= timecham) {
      previous = timestamp;
      index = Math.floor(Math.random() * ArrDAIKIN.length);
      $("#digits").html(ArrDAIKIN[index]);
      cham++;
      timecham += tocdo;
    }
    requestAnimationFrame(setRandomNumber_Cham);
    return;
  }

  // ✅ kết thúc, chốt kết quả
  cham = 0;
  timecham = tocdo;

  var result = ArrDAIKIN[index];

  var forcedWinner = JSON.parse(localStorage.getItem("ArrDAIKINTrungThuong"));
  if (forcedWinner != null) result = forcedWinner;

  $("#digits").html(result);
  startAnimation();

  // ✅ FIX: winners luôn là mảng
  var DAIKINDaTrungThuong = ensureArray("DAIKINDaTrungThuong");
  DAIKINDaTrungThuong.push(result);

  // loại khỏi danh sách quay
  ArrDAIKIN = ArrDAIKIN.filter((item) => item !== result);

  localStorage.setItem("ArrDAIKINTrungThuong", JSON.stringify(null));
  localStorage.setItem("ArrDAIKIN", JSON.stringify(ArrDAIKIN));
  localStorage.setItem("DAIKINDaTrungThuong", JSON.stringify(DAIKINDaTrungThuong));

  kiemtrachay = false;
  shuffleArray(ArrDAIKIN);

  $("#start").show();
  $("#stop").hide();
}

function fnStart() {
  if (Start === true || kiemtrachay === true) return;
  Start = true;
  kiemtrachay = true;
  previous = 0;

  $("#stop").show();
  $("#start").hide();

  requestAnimationFrame(setRandomNumber);
}

function fnStop() {
  if (Start === false) return;
  $("#stop").hide();
  Start = false;
  previous = 0;
  requestAnimationFrame(setRandomNumber_Cham);
}

// ==========================
// Background apply (safe + fallback)
// ==========================
function changeBackground(backgroundUrl) {
  let videoElement = document.getElementById("background-video");
  if (!videoElement) return;

  // fallback nếu video lỗi
  videoElement.onerror = function () {
    const fallback = "assets/background/video1.mp4";
    if (videoElement.src !== fallback) {
      videoElement.src = fallback;
      writeStoredBackground(fallback);
    }
  };

  videoElement.src = backgroundUrl;
  writeStoredBackground(backgroundUrl);
}

// nhận background đổi từ control
window.addEventListener("storage", function (event) {
  if (event.key === "backgroundVideo") {
    const url = readStoredBackground();
    if (url) changeBackground(url);
  }
});

$("#start").on("click", fnStart);
$("#stop").on("click", fnStop);

$(document).ready(function () {
  init();

  // restore vị trí/kích thước digits
  let digitsPosition = JSON.parse(localStorage.getItem("digitsPosition"));
  let digitsSize = localStorage.getItem("digitsSize");

  if (digitsPosition) {
    $("#digits").css({ left: digitsPosition.left + "px", top: digitsPosition.top + "px" });
  }
  if (digitsSize) {
    $("#digits").css({ fontSize: digitsSize + "px" });
  }

  var savedRange = localStorage.getItem("NumberStartEnd");
  if (savedRange) $("#number-range").html(savedRange);
});

// phím tắt
$(document).keydown(function (e) {
  let digits = $("#digits");
  let pos = digits.position();

  switch (e.which) {
    case 74: // j
      digits.css({ left: pos.left - 10 + "px" });
      break;
    case 73: // i
      digits.css({ top: pos.top - 10 + "px" });
      break;
    case 76: // l
      digits.css({ left: pos.left + 10 + "px" });
      break;
    case 75: // k
      digits.css({ top: pos.top + 10 + "px" });
      break;

    case 189: // -
      let newSize = prompt("Nhập kích thước mới cho SỐ (px):");
      if (newSize && !isNaN(newSize)) {
        digits.css({ fontSize: newSize + "px" });
        localStorage.setItem("digitsSize", newSize);
      }
      break;

    case 187: // =
      digits.removeAttr("style");
      localStorage.removeItem("digitsPosition");
      localStorage.removeItem("digitsSize");
      alert("Khôi phục tất cả cài đặt!");
      break;

    case 49:
      changeBackground("assets/background/video1.mp4");
      break;
    case 50:
      changeBackground("assets/background/video2.mp4");
      break;
    case 51:
      changeBackground("assets/background/video3.mp4");
      break;

    case 81: // Q nhập lại danh sách
      if (!kiemtrachay) nhapdanhsachquay();
      break;

    default:
      return;
  }

  localStorage.setItem("digitsPosition", JSON.stringify(digits.position()));
  e.preventDefault();
});

// sync từ control.html
window.addEventListener("storage", function (event) {
  if (event.key === "btnStart") {
    let nutStart = JSON.parse(localStorage.getItem("btnStart"));
    if (nutStart === true) fnStart();
    if (nutStart === false) fnStop();
  }
  if (event.key === "Reset_So") {
    $("#digits").html(batdau);
  }
});
