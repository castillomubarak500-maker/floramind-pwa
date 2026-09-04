/* Shared presentation state. All data enters through FloraAPI. Classic deferred scripts for WebViews. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const state = {
  screen: "dashboard", chart: "ph", selectedSymptoms: new Set(),
  controls: {}, metrics: {}, history: { ph: [], ec: [], do: [] },
  growth: { height: [], root: [] }, feed: [], timeline: [], tasks: [], supplies: [],
  diagnosis: null, photo: null, photoUrl: null, busy: false, stale: false,
  updatedAt: null, ready: false, controlRevision: 0
};
const screenOrder = ["dashboard", "archive", "control", "diagnosis", "community"];
const metricConfig = [
  { key: "ph", label: "pH", unit: "", icon: "activity", range: [5.5, 6.0], warn: [5.2, 6.5], decimals: 2 },
  { key: "ec", label: "EC", unit: "mS/cm", icon: "waves", range: [1.2, 1.8], warn: [0.9, 2.5], decimals: 2 },
  { key: "do", label: "溶解氧", unit: "mg/L", icon: "droplets", range: [6, 9], warn: [4, 10], decimals: 1 },
  { key: "waterTemp", label: "水温", unit: "℃", icon: "thermometer", range: [20, 24], warn: [16, 28], decimals: 1 },
  { key: "level", label: "液位", unit: "%", icon: "gauge", range: [70, 85], warn: [30, 95], decimals: 0 },
  { key: "humidity", label: "空气湿度", unit: "%RH", icon: "cloud-sun", range: [55, 70], warn: [40, 85], decimals: 0 }
];
const symptoms = ["根尖发褐", "白根减少", "叶缘焦枯", "花苞脱落", "叶片黄化", "水体异味", "水温偏高", "EC 快速上升", "气泡减少"];

const trendChartConfig = {
  ph: {
    title: "pH 稳定值",
    unit: "pH",
    decimals: 2,
    color: "#66e39d",
    range: [5.5, 6.0],
    sampleLabels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
  },
  ec: {
    title: "EC",
    unit: "mS/cm",
    decimals: 2,
    color: "#76dce2",
    range: [1.2, 1.8],
    sampleLabels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
  },
  do: {
    title: "DO",
    unit: "mg/L",
    decimals: 1,
    color: "#ffd36b",
    range: [6.0, 9.0],
    sampleLabels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
  }
};

const growthSampleLabels = ["D32", "D33", "D34", "D35", "D36", "D37", "D38"];
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
function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}
function createIcons() { if (window.lucide) window.lucide.createIcons(); }
