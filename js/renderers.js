function renderMetrics() {
  const grid = $("#metricGrid");
  grid.innerHTML = metricConfig.map((config) => {
    const value = state.metrics[config.key];
    const status = metricStatus(config, value);
    const statusText = value == null ? "暂无数据" : status === "ok" ? "在目标区间" : status === "warn" ? "需关注趋势" : "触发保护阈值";
    return `
      <article class="metric-card" data-metric="${config.key}">
        <div class="metric-head">
          <span>${config.label}</span>
          <i data-lucide="${config.icon}"></i>
        </div>
        <div class="metric-value">
          <strong>${value == null ? "—" : fmt(value, config.decimals)}</strong>
          <span>${config.unit}</span>
        </div>
        <div class="metric-foot ${status}">${statusText}</div>
      </article>
    `;
  }).join("");
}

function renderTasks() {
  $("#todayTasks").innerHTML = state.tasks.map(task => `
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
      <button class="switch ${state.controls[control.key] ? "on" : ""}" data-toggle="${control.key}" role="switch" aria-checked="${Boolean(state.controls[control.key])}" aria-label="${control.title}" ${state.busy || !state.ready || (state.stale && !FloraAPI.isMock) ? "disabled" : ""}></button>
    </div>
  `).join("");
  createIcons();
}

function renderSupplies() {
  $("#supplyList").innerHTML = state.supplies.map(item => {
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
  const items = state.timeline;

  $("#timeline").innerHTML = items.map(item => `
    <div class="timeline-item">
      <div class="timeline-date">${escapeHTML(item.date)}</div>
      <div><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.desc)}</span></div>
    </div>
  `).join("");
}

function renderSymptoms() {
  $("#symptomChips").innerHTML = symptoms.map(symptom => `
    <button class="chip ${state.selectedSymptoms.has(symptom) ? "selected" : ""}" data-symptom="${symptom}" aria-pressed="${state.selectedSymptoms.has(symptom)}">${symptom}</button>
  `).join("");
}

function renderFeed() {
  $("#feed").innerHTML = state.feed.length ? state.feed.map((post, index) => `
    <article class="post-card">
      <div class="post-head">
        <div class="avatar">${escapeHTML(post.author.slice(0, 1))}</div>
        <div>
          <strong>${escapeHTML(post.author)}</strong>
          <span>${escapeHTML(post.role)} · ${escapeHTML(post.time)}</span>
        </div>
      </div>
      <p>${escapeHTML(post.text)}</p>
      <div class="post-actions">
        <button class="${post.liked ? "liked" : ""}" data-like="${index}" aria-label="点赞" aria-pressed="${post.liked}"><i data-lucide="heart"></i>${Number(post.likes) || 0}</button>
        <button data-comment="${index}"><i data-lucide="message-circle"></i>${Number(post.comments) || 0}</button>
        <button data-share="${index}"><i data-lucide="share-2"></i>分享</button>
      </div>
    </article>
  `).join("") : '<p class="empty-state">写下第一条生长观察，让经验继续生长。</p>';
}
function updateAlertPanel() {
  const panel = $("#alertPanel");
  const dot = $("#alertDot");
  const risky = metricConfig.filter(config => state.metrics[config.key] != null).map(config => ({ config, value: state.metrics[config.key], status: metricStatus(config, state.metrics[config.key]) })).filter(item => item.status !== "ok");
  panel.classList.remove("warning", "danger");
  dot.classList.remove("on");
  if (risky.some(item => item.status === "danger")) {
    panel.classList.add("danger");
    dot.classList.add("on");
    $("#alertTitle").textContent = "存在保护级风险";
    $("#alertText").textContent = "请优先检查液位、DO、水温和回水流量，请确认设备端本地联锁状态。";
  } else if (risky.length) {
    panel.classList.add("warning");
    dot.classList.add("on");
    $("#alertTitle").textContent = "趋势需要关注";
    $("#alertText").textContent = `${risky[0].config.label}偏离目标区间，建议先复测再调整。`;
  } else {
    $("#alertTitle").textContent = "暂无紧急告警";
    $("#alertText").textContent = "当前监测指标在目标区间；硬件联锁需由设备端确认。";
  }

  const score = Math.max(72, Math.min(98, Math.round(100 - risky.length * 6 - Math.abs(state.metrics.waterTemp - 22) * 1.6)));
  // Preserve the original score calculation; it is a demo heuristic, not a botanical measurement.
  const visibleScore = state.ready && !state.stale ? score : null;
  $("#growthScore").textContent = visibleScore == null ? "—" : visibleScore;
  $("#lifeRing").style.strokeDashoffset = visibleScore == null ? 289 : 289 * (1 - visibleScore / 100);
  $("#lifeGauge").setAttribute("aria-label", visibleScore == null ? "生命指数暂无最新数据" : `演示生命指数 ${visibleScore}%`);
  $("#aiAdvice").textContent = state.stale ? "连接中断，请先恢复数据同步" : risky.length ? "建议复测偏离指标" : "今日无需调整";
  $("#rootStatus").textContent = FloraAPI.isMock ? "根系活跃" : "根系待观察";
  $("#waterStatus").textContent = state.stale ? "循环待确认" : state.controls.pump ? (FloraAPI.isMock ? "水循环正常" : "循环泵已开启") : "水循环已暂停";
  $("#environmentStatus").textContent = state.stale ? "等待同步" : risky.length ? "环境需关注" : "环境稳定";
  $("#healthNarrative").textContent = risky.length ? "当前指标偏离目标区间，建议按告警逐项复核。" : "根区环境稳定，建议继续保持低流量循环。";
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
