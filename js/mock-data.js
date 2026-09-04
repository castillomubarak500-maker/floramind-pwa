/* Original demo values, jitter ranges and diagnostic branches retained from app.js. */
(function () {
const initial = {
  screen: "dashboard",
  chart: "ph",
  selectedSymptoms: ["根尖发褐", "水温偏高"],
  controls: {
    pump: true,
    oxygen: true,
    light: true,
    safety: true,
    white: 72,
    redBlue: 48
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
const timeline = [
    { date: "06/07", title: "EC 调整到 1.4 mS/cm", desc: "白色新根 8.6 cm，水温 22.1℃，DO 6.9 mg/L。" },
    { date: "06/05", title: "pH 两点校准", desc: "pH 4.00 与 7.00 标准液校准完成，保存 offset。" },
    { date: "06/03", title: "换液与根系拍照", desc: "全量换液 3.6 L，记录根色、气味和透明度。" },
    { date: "05/31", title: "低液位联锁测试", desc: "降低液位触发浮球，循环泵立即关闭。" }
  ];
function advance(state) {
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
  return state;
}
function diagnose(state) {
  const hasRoot = state.selectedSymptoms.has("根尖发褐") || state.selectedSymptoms.has("白根减少");
  const hasHeat = state.selectedSymptoms.has("水温偏高") || state.metrics.waterTemp > 24;
  const hasEc = state.selectedSymptoms.has("EC 快速上升");
  let title = "根区低氧风险";
  let confidence = 86;
  let text = "所选根系或高温症状提示可能存在低氧风险。请结合当前 DO 复测，检查气石与水温，再决定是否增强增氧。";
  if (hasEc) {
    title = "盐分累积风险";
    confidence = 81;
    text = "EC 变化速度偏高，建议补水后充分混匀再复测，不要直接加营养液。";
  } else if (!hasRoot && !hasHeat) {
    title = "轻微养护偏离";
    confidence = 72;
    text = "症状证据不足，建议补充根系近照，并记录 24 h 内 pH、EC、DO 和水温趋势。";
  }
  return { title, confidence, text, action: hasEc ? "retest" : "oxygen", source: "mock" };
}
window.FloraMock = {
  snapshot: function () {
    const data = JSON.parse(JSON.stringify(initial));
    data.timeline = JSON.parse(JSON.stringify(timeline));
    data.tasks = JSON.parse(JSON.stringify(taskData));
    data.supplies = JSON.parse(JSON.stringify(supplies));
    data.updatedAt = new Date().toISOString();
    return data;
  },
  advance: advance,
  diagnose: diagnose
};
}());
