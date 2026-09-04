function addTapFeedback(event) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const surface = event.target.closest("button, .chip, .upload-box");
  if (!surface || surface.disabled || surface.classList.contains("no-ripple")) return;
  if (surface.querySelector(".tap-ripple")) surface.querySelector(".tap-ripple").remove();

  surface.classList.remove("is-pressing");
  void surface.offsetWidth;
  surface.classList.add("is-pressing");
  setTimeout(() => surface.classList.remove("is-pressing"), 200);

  const rect = surface.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const clientX = event.clientX || rect.left + rect.width / 2;
  const clientY = event.clientY || rect.top + rect.height / 2;
  const ripple = document.createElement("span");
  ripple.className = "tap-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${clientX - rect.left - size / 2}px`;
  ripple.style.top = `${clientY - rect.top - size / 2}px`;
  surface.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  setTimeout(() => ripple.remove(), 560);
}

function syncRangeFill(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || 0);
  const pct = ((value - min) / (max - min || 1)) * 100;
  input.style.setProperty("--value", `${pct}%`);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function openModal(type, payload = {}) {
  const content = $("#modalContent");
  if (type === "bind") {
    content.innerHTML = `
      <h3>绑定维生基座</h3>
      <p>演示模式仅保存设备名称；真实模式将读取序列号对应设备的最新数据。</p>
      <div class="modal-grid">
        <input id="serialInput" value="FM-C01-ESP32S3" aria-label="设备序列号">
        <button class="primary-action" data-action="confirmBind"><i data-lucide="link"></i>确认绑定</button>
      </div>
    `;
  } else if (type === "alerts") {
    content.innerHTML = `
      <h3>告警中心</h3>
      <p>低液位、漏液、无流量由 ESP32 本地处理；APP 只负责展示和远程确认。</p>
      <div class="modal-grid">
        <div class="task-item"><div class="task-icon"><i data-lucide="shield-check"></i></div><div><strong>本地联锁状态</strong><span>设备端执行，演示页面不验证硬件</span></div><span class="small-tag">需实机确认</span></div>
        <div class="task-item"><div class="task-icon"><i data-lucide="droplets"></i></div><div><strong>DO 趋势</strong><span>低于 6 mg/L 时自动增强增氧</span></div><span class="small-tag">监测中</span></div>
      </div>
    `;
  } else if (type === "generic") {
    content.innerHTML = `<h3>${escapeHTML(payload.title)}</h3><p>${escapeHTML(payload.text)}</p><div class="modal-grid"><button class="primary-action" data-action="closeModal">知道了</button></div>`;
  }
  if (type === "record") {
    content.innerHTML = '<h3 id="modalHeading">记录今天的生长</h3><p>保存在当前浏览器，便于下次回来查看。</p><div class="modal-grid"><label for="recordInput">观察记录</label><textarea id="recordInput" rows="4" maxlength="2000" placeholder="根系颜色、叶片状态、换液情况…"></textarea><button class="primary-action" data-action="saveRecord">保存记录</button></div>';
  }
  if (type === "comment") {
    content.innerHTML = `<h3 id="modalHeading">共生讨论</h3><p>${escapeHTML(payload.text)}</p><div class="modal-grid"><label for="commentInput">添加本地评论</label><textarea id="commentInput" rows="3" maxlength="500"></textarea><button class="primary-action" data-action="saveComment" data-index="${payload.index}">保存评论</button></div>`;
  }
  const heading = content.querySelector("h3");
  if (heading) heading.id = "modalHeading";
  const modal = $("#modal");
  openModal.previousFocus = document.activeElement;
  if (modal.showModal) modal.showModal();
  else { modal.setAttribute("open", ""); document.body.classList.add("modal-open"); }
  const focusTarget = content.querySelector("input,textarea,button");
  (focusTarget || $("#modalClose")).focus();
  createIcons();
}
function closeModal() {
  const modal = $("#modal");
  if (modal.close) modal.close(); else modal.removeAttribute("open");
  document.body.classList.remove("modal-open");
  if (openModal.previousFocus) openModal.previousFocus.focus();
}
