window.BACKGROUND_VIDEO_FILES = [
  "video1.mp4",
  "video2.mp4",
  "video3.mp4",
  "video4.mp4",
  "video5.mp4",
  "video6.mp4",
  "video7.mp4",
  "video8.mp4",
  "video9.mp4",
  "video10.mp4"
];

  // ✅ Tự lấy base path từ đường dẫn của file background_list.js
  // Ví dụ script src = .../assets/background/background_list.js
  // => base = .../assets/background/
  (function () {
    try {
      const src = (document.currentScript && document.currentScript.src) || "";
      window.BACKGROUND_BASE_PATH = src.substring(0, src.lastIndexOf("/") + 1);
    } catch (e) {
      // fallback nếu currentScript không có (hiếm)
      window.BACKGROUND_BASE_PATH = "assets/background/";
    }
  })();