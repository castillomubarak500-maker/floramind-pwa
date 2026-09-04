/* Existing actions retained; persistence and device acknowledgements complete their behavior. */
function savedMessage(ok, text) { showToast(ok ? text : text + "（仅本次会话，浏览器未允许保存）"); }

function addArchive(title, desc) {
  const now = new Date();
  state.timeline.unshift({ date: (now.getMonth() + 1) + "/" + now.getDate(), title: title, desc: desc });
  state.timeline = state.timeline.slice(0, 200);
  const ok = FloraAPI.saveArchive(state.timeline);
  renderTimeline();
  savedMessage(ok, "已保存到本机生长档案");
}

async function applyControl(changes) {
  if (state.busy) return false;
  if (!state.ready || (state.stale && !FloraAPI.isMock)) throw new Error("请先恢复设备数据同步");
  state.busy = true;
  state.controlRevision += 1;
  renderControls();
  try {
    Object.assign(state.controls, await FloraAPI.control(changes));
    updateAlertPanel();
    return true;
  } finally { state.busy = false; renderControls(); }
}

async function runDiagnosis() {
  if (!state.ready) throw new Error("正在等待数据，请稍后再试");
  if (state.stale && !FloraAPI.isMock) throw new Error("数据已过期，请恢复同步后再诊断");
  const result = await FloraAPI.diagnosis(Array.from(state.selectedSymptoms), state.metrics, state.photo);
  state.diagnosis = result;
  $("#diagnosisResult").innerHTML = `
    <div class="result-head"><div><span class="panel-kicker">${result.source === "mock" ? "规则演示 · 非模型概率" : "诊断建议"}</span><h3>${escapeHTML(result.title)}</h3></div><strong>${Math.round(result.confidence)}%</strong></div>
    <p>${escapeHTML(result.text)}</p>
    <div class="action-plan"><button data-action="applyDiagnosis"><i data-lucide="${result.action === "oxygen" ? "fan" : "activity"}"></i>${result.action === "oxygen" ? "开启强制增氧" : "记录复测计划"}</button><button data-action="saveDiagnosis"><i data-lucide="file-check-2"></i>加入档案</button></div>`;
  createIcons();
  showToast(FloraAPI.isMock ? "演示诊断已更新；照片仅供预览" : "诊断已更新");
}

function publishPost() {
  const input = $("#postInput");
  const text = input.value.trim();
  if (!text) return showToast("先写一条观察记录");
  state.feed.unshift({ author: "我", role: "今日观察", time: "刚刚", text: text.slice(0, 2000), likes: 0, comments: 0, image: "", liked: false, replies: [] });
  state.feed = state.feed.slice(0, 100);
  const ok = FloraAPI.saveFeed(state.feed);
  input.value = "";
  renderFeed(); createIcons();
  savedMessage(ok, "已发布到本机演示社区");
}

async function handleAction(action, target) {
  if (action === "quickCare" && await applyControl({ pump: true, oxygen: true, light: true })) {
    showToast(FloraAPI.isMock ? "演示养护已开启：循环、增氧与补光" : "设备已确认养护指令");
  }
  if (action === "mockOrder") openModal("generic", { title: "耗材补给清单", text: "A/B 营养液、KCl 存储液。此处为清单展示，不会下单或扣款。" });
  if (action === "calibrate") addArchive(target.dataset.sensor + " 校准待办", "待使用标准液完成校准；此记录不表示设备已校准。");
  if (action === "addRecord") openModal("record");
  if (action === "saveRecord") {
    const text = $("#recordInput").value.trim();
    if (!text) return showToast("请写下今天的观察");
    addArchive("今日观察", text.slice(0, 2000)); closeModal();
  }
  if (action === "runDiagnosis") await runDiagnosis();
  if (action === "applyDiagnosis") {
    if (!state.diagnosis) return showToast("请先完成一次诊断");
    if (state.diagnosis.action === "oxygen") {
      if (await applyControl({ oxygen: true })) showToast("增氧已开启；建议 10 分钟后手动复测 DO");
    } else addArchive("诊断复测计划", state.diagnosis.text);
  }
  if (action === "saveDiagnosis") {
    if (!state.diagnosis) return showToast("请先完成一次诊断");
    addArchive(state.diagnosis.title, (state.diagnosis.source === "mock" ? "[规则演示] " : "[AI 建议] ") + state.diagnosis.text);
  }
  if (action === "attachGrowth") {
    if (!state.ready) return showToast("等待数据同步");
    $("#postInput").value += `\n[${FloraAPI.isMock ? "演示" : "设备"}数据] pH ${fmt(state.metrics.ph, 2)} · EC ${fmt(state.metrics.ec, 2)} mS/cm · DO ${fmt(state.metrics.do)} mg/L`;
    showToast("趋势摘要已附在正文中");
  }
  if (action === "publishPost") publishPost();
  if (action === "confirmBind") {
    const data = await FloraAPI.bind($("#serialInput").value.trim());
    hydrate(data); closeModal(); showToast(FloraAPI.isMock ? "演示设备已命名" : "设备数据已读取");
  }
  if (action === "closeModal") closeModal();
  if (action === "saveComment") {
    const text = $("#commentInput").value.trim();
    if (!text) return showToast("请先填写评论");
    const post = state.feed[Number(target.dataset.index)];
    if (!post) return;
    post.replies = (post.replies || []).concat(text.slice(0, 500)).slice(-50);
    post.comments += 1;
    const ok = FloraAPI.saveFeed(state.feed);
    closeModal(); renderFeed(); createIcons(); savedMessage(ok, "评论已保存在本机");
  }
  if (action === "retrySync") await refreshMetrics();
}

function bindEvents() {
  document.addEventListener("click", async event => {
    addTapFeedback(event);
    try {
      const nav = event.target.closest("[data-nav]");
      if (nav) navigate(nav.dataset.nav);
      const chart = event.target.closest("[data-chart]");
      if (chart) {
        state.chart = chart.dataset.chart;
        $$("[data-chart]").forEach(button => { button.classList.toggle("selected", button === chart); button.setAttribute("aria-pressed", String(button === chart)); });
        renderCharts();
      }
      const toggle = event.target.closest("[data-toggle]");
      if (toggle && !toggle.disabled) {
        const name = toggle.closest(".control-card").querySelector("strong").textContent;
        const key = toggle.dataset.toggle;
        if (await applyControl({ [key]: !state.controls[key] })) {
          showToast(name + (state.controls[key] ? "已开启" : "已关闭") + (FloraAPI.isMock ? " · 演示" : ""));
          const replacement = document.querySelector('[data-toggle="' + key + '"]');
          if (replacement) replacement.focus();
        }
      }
      const symptom = event.target.closest("[data-symptom]");
      if (symptom) {
        const value = symptom.dataset.symptom;
        if (state.selectedSymptoms.has(value)) state.selectedSymptoms.delete(value); else state.selectedSymptoms.add(value);
        symptom.classList.toggle("selected", state.selectedSymptoms.has(value));
        symptom.setAttribute("aria-pressed", String(state.selectedSymptoms.has(value)));
      }
      const like = event.target.closest("[data-like]");
      if (like) {
        const post = state.feed[Number(like.dataset.like)];
        post.liked = !post.liked; post.likes += post.liked ? 1 : -1;
        FloraAPI.saveFeed(state.feed); renderFeed(); createIcons();
      }
      const comment = event.target.closest("[data-comment]");
      if (comment) {
        const index = Number(comment.dataset.comment);
        openModal("comment", { index: index, text: (state.feed[index].replies || []).join("\n") || "还没有本机评论，分享你的观察吧。" });
      }
      const share = event.target.closest("[data-share]");
      if (share) {
        const text = state.feed[Number(share.dataset.share)].text;
        if (navigator.share) {
          try { await navigator.share({ title: "FloraMind 生长观察", text: text, url: location.href }); }
          catch (error) { if (error.name !== "AbortError") openModal("generic", { title: "分享观察", text: text + "\n可长按复制这段文字。" }); }
        } else openModal("generic", { title: "分享观察", text: text + "\n可长按复制这段文字，或通过微信右上角分享页面。" });
      }
      const action = event.target.closest("[data-action]");
      if (action && !action.disabled) {
        action.disabled = true;
        try { await handleAction(action.dataset.action, action); } finally { action.disabled = false; }
      }
    } catch (error) { showToast(error.message || "操作未完成，请重试"); }
  });
  $("#bindDeviceBtn").addEventListener("click", () => openModal("bind"));
  $("#notificationBtn").addEventListener("click", () => openModal("alerts"));
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", event => { if (event.target === $("#modal")) closeModal(); });
  $("#modal").addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); }
    if (event.key !== "Tab") return;
    const nodes = $$("button:not([disabled]), input, textarea, a[href]", $("#modal"));
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  ["whiteRange", "redBlueRange"].forEach(id => {
    const input = $("#" + id);
    const output = $(id === "whiteRange" ? "#whiteOutput" : "#redBlueOutput");
    syncRangeFill(input);
    input.addEventListener("input", () => { syncRangeFill(input); output.textContent = input.value + "%"; });
    input.addEventListener("change", async () => {
      try {
        const key = id === "whiteRange" ? "white" : "redBlue";
        if (!await applyControl({ [key]: Number(input.value) })) throw new Error("上一个指令处理中，请重试");
        $("#lightModeTag").textContent = Number($("#redBlueRange").value) > 65 ? "现蕾开花" : "营养生长";
      } catch (error) { showToast(error.message); syncLightControls(); }
    });
  });
  $("#plantPhoto").addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = ""; return showToast("请选择小于 5 MB 的 JPG、PNG 或 WebP 图片");
    }
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photo = file; state.photoUrl = URL.createObjectURL(file);
    const preview = $("#photoPreview"); preview.src = state.photoUrl; preview.hidden = false;
    $("#photoStatus").textContent = "照片已选择";
    showToast(FloraAPI.isMock ? "照片仅本机预览；演示分析使用症状" : "照片将在开始分析时上传");
  });
}
