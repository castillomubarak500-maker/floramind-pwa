const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  screen: "dashboard",
  chart: "ph",
  selectedSymptoms: new Set(["根尖发褐", "水温偏高"]),
  controls: {
    pump: true,
    oxygen: true,
    light: true,
    safety: true
  },
  metrics: {
    ph: 5.92,
    ec: 1.42,
    do: 6.8,
    waterTemp: 22.3,
    level: 78,
    humidity: 64,
    light: 226
  },
  history: {
    ph: [5.86, 5.91, 5.88, 5.94, 5.96, 5.93, 5.9, 5.92],
    ec: [1.28, 1.31, 1.32, 1.36, 1.38, 1.4, 1.42, 1.41],
    do: [6.3, 6.1, 6.4, 6.9, 7.1, 6.8, 6.6, 6.8]
  },
  growth: {
    height: [13.2, 13.8, 14.5, 15.1, 15.9, 16.5, 17.2],
    root: [2.1, 2.8, 3.9, 5.0, 6.2, 7.4, 8.6]
  },
  feed: [
    {
      author: "朱惜缘",
      role: "共生体观察",
      time: "12 分钟前",
      text: "今天根系颜色保持乳白，低流量循环后气泡附着明显减少。EC 先不继续上调。",
      likes: 28,
      comments: 6,
      image: "",
      liked: false
    },
    {
      author: "孙恩赐",
      role: "IoT 调试",
      time: "1 小时前",
      text: "泵开无流量联锁已验证，夹闭回水管后 7 秒停泵并保留通信告警。",
      likes: 19,
      comments: 4,
      image: "",
      liked: true
    }
  ]
};

const metricConfig = [
  { key: "ph", label: "pH", unit: "", icon: "activity", range: [5.5, 6.0], warn: [5.2, 6.5], decimals: 2 },
  { key: "ec", label: "EC", unit: "mS/cm", icon: "waves", range: [1.2, 1.8], warn: [0.9, 2.5], decimals: 2 },
  { key: "do", label: "溶解氧", unit: "mg/L", icon: "droplets", range: [6, 9], warn: [4, 10], decimals: 1 },
  { key: "waterTemp", label: "水温", unit: "℃", icon: "thermometer", range: [20, 24], warn: [16, 28], decimals: 1 },
  { key: "level", label: "液位", unit: "%", icon: "gauge", range: [70, 85], warn: [30, 95], decimals: 0 },
  { key: "humidity", label: "空气湿度", unit: "%RH", icon: "cloud-sun", range: [55, 70], warn: [40, 85], decimals: 0 }
];

const taskData = [
  { icon: "rotate-cw", title: "低流量循环", desc: "持续运行，流量统计正常", status: "进行中" },
  { icon: "sun-medium", title: "补光计划", desc: "07:30-20:30，当前 72% 白光", status: "已启用" },
  { icon: "flask-conical", title: "pH/EC 复测", desc: "预计 18:00 完成下一轮稳定值", status: "待执行" }
];

const supplies = [
  { name: "A/B 营养液", value: 36, note: "预计可用 9 天" },
  { name: "pH 标准液", value: 62, note: "下次校准建议 6 天内" },
  { name: "探头存储液", value: 22, note: "建议补充 KCl 存储液" }
];

const symptoms = ["根尖发褐", "白根减少", "叶缘焦枯", "花苞脱落", "叶片黄化", "水体异味", "水温偏高", "EC 快速上升", "气泡减少"];

function metricStatus(config, value) {
  const [min, max] = config.range;
  const [warnMin, warnMax] = config.warn;
  if (value < warnMin || value > warnMax) return "danger";
  if (value < min || value > max) return "warn";
  return "ok";
}

function fmt(value, decimals = 1) {
  return Number(value).toFixed(decimals);
}

function renderMetrics() {
  const grid = $("#metricGrid");
  grid.innerHTML = metricConfig.map((config) => {
    const value = state.metrics[config.key];
    const status = metricStatus(config, value);
    const statusText = status === "ok" ? "在目标区间" : status === "warn" ? "需关注趋势" : "触发保护阈值";
    return `
      <article class="metric-card">
        <div class="metric-head">
          <span>${config.label}</span>
          <i data-lucide="${config.icon}"></i>
        </div>
        <div class="metric-value">
          <strong>${fmt(value, config.decimals)}</strong>
          <span>${config.unit}</span>
        </div>
        <div class="metric-foot ${status}">${statusText}</div>
      </article>
    `;
  }).join("");
}

function renderTasks() {
  $("#todayTasks").innerHTML = taskData.map(task => `
    <div class="task-item">
      <div class="task-icon"><i data-lucide="${task.icon}"></i></div>
      <div><strong>${task.title}</strong><span>${task.desc}</span></div>
      <span class="small-tag">${task.status}</span>
    </div>
  `).join("");
}

function renderControls() {
  const controls = [
    { key: "pump", icon: "rotate-cw", title: "循环泵", desc: "低流量连续循环，低液位立即停泵" },
    { key: "oxygen", icon: "fan", title: "增氧泵", desc: "DO 低于 6 mg/L 自动增强增氧" },
    { key: "light", icon: "sun-medium", title: "补光灯", desc: "白光 + 450 nm 蓝 + 660 nm 红" },
    { key: "safety", icon: "shield-check", title: "本地联锁", desc: "低液位、漏液、无流量保护" }
  ];

  $("#controlStack").innerHTML = controls.map(control => `
    <div class="control-card">
      <div class="task-icon"><i data-lucide="${control.icon}"></i></div>
      <div><strong>${control.title}</strong><span>${control.desc}</span></div>
      <button class="switch ${state.controls[control.key] ? "on" : ""}" data-toggle="${control.key}" aria-label="${control.title}"></button>
    </div>
  `).join("");
}

function renderSupplies() {
  $("#supplyList").innerHTML = supplies.map(item => {
    const cls = item.value < 25 ? "danger" : item.value < 45 ? "warn" : "";
    return `
      <div class="supply-item">
        <div class="section-head">
          <div><strong>${item.name}</strong><span>${item.note}</span></div>
          <span class="small-tag">${item.value}%</span>
        </div>
        <div class="progress ${cls}"><i style="width:${item.value}%"></i></div>
      </div>
    `;
  }).join("");
}

function renderTimeline() {
  const items = [
    { date: "06/07", title: "EC 调整到 1.4 mS/cm", desc: "白色新根 8.6 cm，水温 22.1℃，DO 6.9 mg/L。" },
    { date: "06/05", title: "pH 两点校准", desc: "pH 4.00 与 7.00 标准液校准完成，保存 offset。" },
    { date: "06/03", title: "换液与根系拍照", desc: "全量换液 3.6 L，记录根色、气味和透明度。" },
    { date: "05/31", title: "低液位联锁测试", desc: "降低液位触发浮球，循环泵立即关闭。" }
  ];

  $("#timeline").innerHTML = items.map(item => `
    <div class="timeline-item">
      <div class="timeline-date">${item.date}</div>
      <div><strong>${item.title}</strong><span>${item.desc}</span></div>
    </div>
  `).join("");
}

function renderSymptoms() {
  $("#symptomChips").innerHTML = symptoms.map(symptom => `
    <button class="chip ${state.selectedSymptoms.has(symptom) ? "selected" : ""}" data-symptom="${symptom}">${symptom}</button>
  `).join("");
}

function renderFeed() {
  $("#feed").innerHTML = state.feed.map((post, index) => `
    <article class="post-card">
      <div class="post-head">
        <div class="avatar">${post.author.slice(0, 1)}</div>
        <div>
          <strong>${post.author}</strong>
          <span>${post.role} · ${post.time}</span>
        </div>
      </div>
      <p>${post.text}</p>
      <div class="post-actions">
        <button class="${post.liked ? "liked" : ""}" data-like="${index}"><i data-lucide="heart"></i>${post.likes}</button>
        <button data-comment="${index}"><i data-lucide="message-circle"></i>${post.comments}</button>
        <button data-share="${index}"><i data-lucide="share-2"></i>分享</button>
      </div>
    </article>
  `).join("");
}

function drawLineChart(canvas, series, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 34;
  const min = Math.min(...series) - (options.padding ?? 0.2);
  const max = Math.max(...series) + (options.padding ?? 0.2);
  const xStep = (width - pad * 2) / (series.length - 1);
  const toY = (value) => height - pad - ((value - min) / (max - min || 1)) * (height - pad * 2);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(28,89,74,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad + i * ((height - pad * 2) / 3);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
  gradient.addColorStop(0, "rgba(34, 181, 115, 0.24)");
  gradient.addColorStop(1, "rgba(102, 227, 157, 0)");

  ctx.beginPath();
  series.forEach((value, index) => {
    const x = pad + index * xStep;
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(pad, height - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  series.forEach((value, index) => {
    const x = pad + index * xStep;
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = options.color || "#66e39d";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  series.forEach((value, index) => {
    const x = pad + index * xStep;
    const y = toY(value);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#12322d";
    ctx.fill();
  });

  ctx.fillStyle = "rgba(18,50,45,0.76)";
  ctx.font = "20px Microsoft YaHei, sans-serif";
  ctx.fillText(options.label || "", pad, 24);
}

function drawDualChart(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  drawLineChart(canvas, state.growth.height, { label: "株高 cm", color: "#76dce2", padding: 1 });
  const series = state.growth.root;
  const pad = 34;
  const min = Math.min(...series) - 1;
  const max = Math.max(...series) + 1;
  const xStep = (width - pad * 2) / (series.length - 1);
  const toY = (value) => height - pad - ((value - min) / (max - min || 1)) * (height - pad * 2);
  ctx.beginPath();
  series.forEach((value, index) => {
    const x = pad + index * xStep;
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#ffd36b";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = "rgba(255,211,107,0.82)";
  ctx.font = "20px Microsoft YaHei, sans-serif";
  ctx.fillText("新根长度 cm", width - 170, 24);
}

function renderCharts() {
  const labels = { ph: "pH 稳定值", ec: "EC mS/cm", do: "DO mg/L" };
  drawLineChart($("#trendChart"), state.history[state.chart], { label: labels[state.chart], color: state.chart === "ec" ? "#76dce2" : state.chart === "do" ? "#ffd36b" : "#66e39d" });
  drawDualChart($("#growthChart"));
}

function updateAlertPanel() {
  const panel = $("#alertPanel");
  const dot = $("#alertDot");
  const risky = metricConfig.map(config => ({ config, value: state.metrics[config.key], status: metricStatus(config, state.metrics[config.key]) })).filter(item => item.status !== "ok");
  panel.classList.remove("warning", "danger");
  dot.classList.remove("on");
  if (risky.some(item => item.status === "danger")) {
    panel.classList.add("danger");
    dot.classList.add("on");
    $("#alertTitle").textContent = "存在保护级风险";
    $("#alertText").textContent = "请优先检查液位、DO、水温和回水流量，本地联锁已保持开启。";
  } else if (risky.length) {
    panel.classList.add("warning");
    dot.classList.add("on");
    $("#alertTitle").textContent = "趋势需要关注";
    $("#alertText").textContent = `${risky[0].config.label}偏离目标区间，建议先复测再调整。`;
  } else {
    $("#alertTitle").textContent = "暂无紧急告警";
    $("#alertText").textContent = "低液位、漏液和无流量保护均正常。";
  }

  const score = Math.max(72, Math.min(98, Math.round(100 - risky.length * 6 - Math.abs(state.metrics.waterTemp - 22) * 1.6)));
  $("#growthScore").textContent = score;
  $("#healthNarrative").textContent = risky.length ? "当前存在轻微偏离，建议按诊断建议逐项复核。" : "根区环境稳定，建议继续保持低流量循环。";
}

function createIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function renderAll() {
  renderMetrics();
  renderTasks();
  renderControls();
  renderSupplies();
  renderTimeline();
  renderSymptoms();
  renderFeed();
  renderCharts();
  updateAlertPanel();
  createIcons();
}

function navigate(screen) {
  state.screen = screen;
  $$(".screen").forEach(el => el.classList.toggle("active", el.dataset.screen === screen));
  $$(".bottom-nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.nav === screen));
  const titles = { dashboard: "实时监测", control: "设备控制", archive: "生长档案", diagnosis: "AI 诊断", community: "社区互动" };
  $("#screenTitle").textContent = titles[screen];
  setTimeout(renderCharts, 60);
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
      <p>输入设备序列号或扫描硬件二维码。演示版会绑定到 C-01 样机。</p>
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
        <div class="task-item"><div class="task-icon"><i data-lucide="shield-check"></i></div><div><strong>本地联锁正常</strong><span>漏液探头、浮球开关、流量脉冲在线</span></div><span class="small-tag">正常</span></div>
        <div class="task-item"><div class="task-icon"><i data-lucide="droplets"></i></div><div><strong>DO 趋势</strong><span>低于 6 mg/L 时自动增强增氧</span></div><span class="small-tag">监测中</span></div>
      </div>
    `;
  } else if (type === "generic") {
    content.innerHTML = `<h3>${payload.title}</h3><p>${payload.text}</p><div class="modal-grid"><button class="primary-action" data-action="closeModal">知道了</button></div>`;
  }
  $("#modal").showModal();
  createIcons();
}

function mutateMetrics() {
  const jitter = (base, scale, min, max) => Math.max(min, Math.min(max, base + (Math.random() - 0.5) * scale));
  state.metrics.ph = jitter(state.metrics.ph, 0.04, 5.65, 6.12);
  state.metrics.ec = jitter(state.metrics.ec, 0.03, 1.28, 1.62);
  state.metrics.do = jitter(state.metrics.do + (state.controls.oxygen ? 0.02 : -0.04), 0.16, 5.4, 7.5);
  state.metrics.waterTemp = jitter(state.metrics.waterTemp + (state.controls.light ? 0.02 : -0.01), 0.12, 21.2, 24.8);
  state.metrics.level = jitter(state.metrics.level - 0.02, 0.08, 72, 82);
  state.metrics.humidity = jitter(state.metrics.humidity, 0.8, 56, 72);
  state.metrics.light = Math.round(jitter(state.metrics.light, 16, 120, 360));
  Object.keys(state.history).forEach((key) => {
    const value = key === "ph" ? state.metrics.ph : key === "ec" ? state.metrics.ec : state.metrics.do;
    state.history[key] = [...state.history[key].slice(1), Number(value.toFixed(2))];
  });
  renderMetrics();
  updateAlertPanel();
  renderCharts();
  createIcons();
}

function runDiagnosis() {
  const hasRoot = state.selectedSymptoms.has("根尖发褐") || state.selectedSymptoms.has("白根减少");
  const hasHeat = state.selectedSymptoms.has("水温偏高") || state.metrics.waterTemp > 24;
  const hasEc = state.selectedSymptoms.has("EC 快速上升");
  let title = "根区低氧风险";
  let confidence = 86;
  let text = "DO 近期低于 6 mg/L 且水温偏高，建议先增强增氧、降低补光热负荷，并复查气石堵塞情况。";
  if (hasEc) {
    title = "盐分累积风险";
    confidence = 81;
    text = "EC 变化速度偏高，建议补水后充分混匀再复测，不要直接加营养液。";
  } else if (!hasRoot && !hasHeat) {
    title = "轻微养护偏离";
    confidence = 72;
    text = "症状证据不足，建议补充根系近照，并记录 24 h 内 pH、EC、DO 和水温趋势。";
  }
  $("#diagnosisResult").innerHTML = `
    <div class="result-head">
      <div><span class="panel-kicker">诊断结果</span><h3>${title}</h3></div>
      <strong>${confidence}%</strong>
    </div>
    <p>${text}</p>
    <div class="action-plan">
      <button data-action="applyDiagnosis"><i data-lucide="${hasEc ? "waves" : "fan"}"></i>${hasEc ? "启动复测流程" : "开启强制增氧"}</button>
      <button data-action="saveDiagnosis"><i data-lucide="file-check-2"></i>加入档案</button>
    </div>
  `;
  createIcons();
  showToast("AI 诊断已更新");
}

function handleAction(action, target) {
  if (action === "quickCare") {
    state.controls.pump = true;
    state.controls.oxygen = true;
    state.controls.light = true;
    renderControls();
    showToast("已执行一键养护：循环、增氧、补光策略已同步");
  }
  if (action === "mockOrder") showToast("已生成耗材补给清单：A/B 营养液、KCl 存储液");
  if (action === "calibrate") showToast(`${target.dataset.sensor} 校准流程已加入待办`);
  if (action === "addRecord") showToast("已打开今日记录草稿");
  if (action === "runDiagnosis") runDiagnosis();
  if (action === "applyDiagnosis") {
    state.controls.oxygen = true;
    renderControls();
    showToast("已开启强制增氧，并将在 10 分钟后复测 DO");
  }
  if (action === "saveDiagnosis") showToast("诊断结果已写入生长档案");
  if (action === "attachGrowth") showToast("已附带今日 pH/EC/DO 趋势摘要");
  if (action === "publishPost") publishPost();
  if (action === "confirmBind") {
    $("#deviceStatus").textContent = "C-01 在线";
    $("#modal").close();
    showToast("设备 C-01 绑定成功");
  }
  if (action === "closeModal") $("#modal").close();
}

function publishPost() {
  const input = $("#postInput");
  const text = input.value.trim();
  if (!text) {
    showToast("先写一条观察记录");
    return;
  }
  state.feed.unshift({
    author: "我",
    role: "今日观察",
    time: "刚刚",
    text,
    likes: 0,
    comments: 0,
    image: "",
    liked: false
  });
  input.value = "";
  renderFeed();
  createIcons();
  showToast("已发布到共生体社区");
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) navigate(nav.dataset.nav);

    const chartButton = event.target.closest("[data-chart]");
    if (chartButton) {
      state.chart = chartButton.dataset.chart;
      $$("[data-chart]").forEach(btn => btn.classList.toggle("selected", btn === chartButton));
      renderCharts();
    }

    const toggle = event.target.closest("[data-toggle]");
    if (toggle) {
      const key = toggle.dataset.toggle;
      state.controls[key] = !state.controls[key];
      renderControls();
      showToast(`${toggle.closest(".control-card").querySelector("strong").textContent}已${state.controls[key] ? "开启" : "关闭"}`);
    }

    const symptom = event.target.closest("[data-symptom]");
    if (symptom) {
      const value = symptom.dataset.symptom;
      if (state.selectedSymptoms.has(value)) state.selectedSymptoms.delete(value);
      else state.selectedSymptoms.add(value);
      renderSymptoms();
      createIcons();
    }

    const like = event.target.closest("[data-like]");
    if (like) {
      const post = state.feed[Number(like.dataset.like)];
      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;
      renderFeed();
      createIcons();
    }

    const action = event.target.closest("[data-action]");
    if (action) handleAction(action.dataset.action, action);
  });

  $("#bindDeviceBtn").addEventListener("click", () => openModal("bind"));
  $("#notificationBtn").addEventListener("click", () => openModal("alerts"));
  $("#modalClose").addEventListener("click", () => $("#modal").close());

  ["whiteRange", "redBlueRange"].forEach((id) => {
    const input = $(`#${id}`);
    const output = $(`#${id === "whiteRange" ? "whiteOutput" : "redBlueOutput"}`);
    input.addEventListener("input", () => {
      output.textContent = `${input.value}%`;
      $("#lightModeTag").textContent = Number($("#redBlueRange").value) > 65 ? "现蕾开花" : "营养生长";
    });
  });

  $("#plantPhoto").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("#photoStatus").innerHTML = '<i data-lucide="check-circle-2"></i>照片已选择';
    createIcons();
    showToast("照片已载入，选择症状后可分析");
  });
}

function clearLegacyCache() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
  }
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
  }
}

function init() {
  clearLegacyCache();
  renderAll();
  bindEvents();
  setInterval(mutateMetrics, 6500);
}

document.addEventListener("DOMContentLoaded", init);
