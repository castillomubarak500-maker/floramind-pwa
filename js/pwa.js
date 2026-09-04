/* Capability detection: a WebView without service workers still gets the complete online app. */
(function () {
  const script = document.currentScript;
  const base = new URL("../", script.src);
  let installPrompt = null;
  let waitingWorker = null;
  let userRequestedUpdate = false;

  function notice(message, buttonText, handler) {
    const box = document.getElementById("pwaNotice");
    if (!box) return;
    document.getElementById("pwaMessage").textContent = message;
    const button = document.getElementById("pwaButton");
    button.textContent = buttonText;
    button.onclick = handler;
    box.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (waitingWorker) return;
    notice("把 FloraMind 放到你的主屏幕", "添加", async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      document.getElementById("pwaNotice").hidden = true;
    });
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    const box = document.getElementById("pwaNotice");
    if (box) box.hidden = true;
  });

  function offerUpdate(registration) {
    waitingWorker = registration.waiting;
    if (!waitingWorker) return;
    notice("FloraMind 新版本已准备好", "更新", () => {
      userRequestedUpdate = true;
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    });
  }

  window.addEventListener("load", async () => {
    const ua = navigator.userAgent;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (/MicroMessenger/i.test(ua) && !standalone) {
      notice("微信中可直接养护；添加主屏幕需在系统浏览器打开", "知道了", () => { document.getElementById("pwaNotice").hidden = true; });
    } else if (/iPhone|iPad|iPod/i.test(ua) && !standalone) {
      notice("在 Safari 中点「分享 → 添加到主屏幕」", "知道了", () => { document.getElementById("pwaNotice").hidden = true; });
    }
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    try {
      const registration = await navigator.serviceWorker.register(new URL("sw.js", base).href, { scope: base.pathname });
      offerUpdate(registration);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(registration);
        });
      });
    } catch (error) {
      notice("离线资源未就绪，联网功能仍可使用", "重试", () => location.reload());
    }
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (userRequestedUpdate) location.reload();
  });
}());
