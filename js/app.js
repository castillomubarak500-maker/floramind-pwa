let pollTimer;
let refreshPending = false;

function syncLightControls() {
  [["white", "whiteRange", "whiteOutput"], ["redBlue", "redBlueRange", "redBlueOutput"]].forEach(item => {
    const value = state.controls[item[0]];
    $("#" + item[1]).disabled = value == null || (state.stale && !FloraAPI.isMock);
    $("#" + item[1]).value = value == null ? 0 : value;
    $("#" + item[2]).textContent = value == null ? "—" : value + "%";
    syncRangeFill($("#" + item[1]));
  });
}

function renderConnection() {
  const mode = FloraAPI.isMock ? "演示设备" : "设备";
  $("#deviceStatus").textContent = mode + " · " + FloraAPI.deviceId();
  $("#connectionLabel").textContent = state.stale ? "连接中断 · 显示上次数据" : FloraAPI.isMock ? "演示模式 · 每 6.5 秒更新" : "设备已同步";
  $("#connectionBar").classList.toggle("is-offline", state.stale);
  $("#retrySync").hidden = !state.stale;
  $("#lastSync").textContent = state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString("zh-CN", { hour12: false }) : "等待同步";
}

function hydrate(data) {
  const screen = state.screen;
  Object.assign(state, data, { screen: screen, selectedSymptoms: new Set(data.selectedSymptoms || []), ready: true, stale: false });
  renderAll(); syncLightControls(); renderConnection(); routeFromHash();
}

async function refreshMetrics() {
  if (refreshPending || document.hidden) return;
  refreshPending = true;
  const revision = state.controlRevision;
  try {
    if (!state.ready) hydrate(await FloraAPI.bootstrap());
    else {
      const data = await FloraAPI.getMetrics();
      state.metrics = data.metrics;
      if (!state.busy && revision === state.controlRevision) state.controls = data.controls;
      if (data.history) state.history = data.history;
      else Object.keys(state.history).forEach(key => { state.history[key] = state.history[key].slice(-7).concat(data.metrics[key]); });
      state.updatedAt = data.updatedAt;
      state.stale = false;
      renderMetrics(); renderCharts(); renderControls(); updateAlertPanel(); createIcons();
    }
  } catch (error) {
    state.stale = true;
    $("#aiAdvice").textContent = error.message || "数据同步失败，请重试";
    if (state.ready) updateAlertPanel();
    renderControls();
  } finally {
    refreshPending = false;
    renderConnection();
    clearTimeout(pollTimer);
    if (!document.hidden) pollTimer = setTimeout(refreshMetrics, FLORA_CONFIG.pollInterval);
  }
}

async function init() {
  bindEvents(); routeFromHash(); createIcons();
  $("#scoreNote").textContent = FloraAPI.isMock ? "演示指数 · 沿用原有评分" : "环境指数 · 非植物健康诊断";
  $("#trendPeriod").textContent = FloraAPI.isMock ? "24 h 趋势 · 演示窗口" : "最近采样";
  try { hydrate(await FloraAPI.bootstrap()); }
  catch (error) { state.stale = true; renderConnection(); $("#aiAdvice").textContent = error.message; }
  pollTimer = setTimeout(refreshMetrics, FLORA_CONFIG.pollInterval);
  document.addEventListener("visibilitychange", () => {
    clearTimeout(pollTimer);
    if (!document.hidden) refreshMetrics();
  });
  window.addEventListener("online", refreshMetrics);
  window.addEventListener("offline", () => {
    if (!FloraAPI.isMock) { state.stale = true; updateAlertPanel(); renderControls(); }
    renderConnection();
  });
}
document.addEventListener("DOMContentLoaded", init);
