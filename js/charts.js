/* Existing Canvas chart implementation; older WebView fallbacks added. */
function unitValue(value, unit, decimals = 1) {
  const text = Number(value).toFixed(decimals);
  return unit ? `${text} ${unit}` : text;
}

function drawBadge(ctx, text, x, y, color, align = "left") {
  ctx.save();
  ctx.font = "700 15px Microsoft YaHei, sans-serif";
  const metrics = ctx.measureText(text);
  const width = metrics.width + 18;
  const left = align === "right" ? x - width : x;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.strokeStyle = "rgba(28,89,74,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(left, y - 19, width, 28, 10);
  else ctx.rect(left, y - 19, width, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, left + 9, y);
  ctx.restore();
}

function drawLineChart(canvas, series, options = {}) {
  if (!series.length) return;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const leftPad = 66;
  const rightPad = 28;
  const topPad = 76;
  const bottomPad = 44;
  const decimals = options.decimals == null ? 1 : options.decimals;
  const unit = options.unit || "";
  const targetRange = options.range || [];
  const valuesForDomain = [...series, ...targetRange];
  const rawMin = Math.min(...valuesForDomain);
  const rawMax = Math.max(...valuesForDomain);
  const spread = rawMax - rawMin || 1;
  const min = rawMin - spread * 0.18;
  const max = rawMax + spread * 0.2;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const xStep = chartWidth / Math.max(1, series.length - 1);
  const toX = (index) => leftPad + index * xStep;
  const toY = (value) => topPad + (1 - ((value - min) / (max - min || 1))) * chartHeight;
  const latest = series[series.length - 1];
  const color = options.color || "#66e39d";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(18,50,45,0.78)";
  ctx.font = "800 22px Microsoft YaHei, sans-serif";
  ctx.fillText(`${options.label || ""} ${unit ? `· ${unit}` : ""}`, leftPad, 28);
  drawBadge(ctx, `最新 ${unitValue(latest, unit, decimals)}`, width - rightPad, 28, color, "right");
  if (targetRange.length === 2) {
    ctx.fillStyle = "rgba(102,128,120,0.82)";
    ctx.font = "700 15px Microsoft YaHei, sans-serif";
    ctx.fillText(`目标 ${unitValue(targetRange[0], unit, decimals)} - ${unitValue(targetRange[1], unit, decimals)}`, leftPad, 54);
  }

  if (targetRange.length === 2) {
    const y1 = toY(targetRange[0]);
    const y2 = toY(targetRange[1]);
    ctx.fillStyle = "rgba(34,181,115,0.08)";
    ctx.fillRect(leftPad, Math.min(y1, y2), chartWidth, Math.abs(y2 - y1));
  }

  ctx.strokeStyle = "rgba(28,89,74,0.12)";
  ctx.lineWidth = 1;
  const tickCount = 4;
  ctx.font = "13px Microsoft YaHei, sans-serif";
  ctx.fillStyle = "rgba(102,128,120,0.82)";
  for (let i = 0; i < tickCount; i += 1) {
    const ratio = i / (tickCount - 1);
    const y = topPad + ratio * chartHeight;
    const tickValue = max - ratio * (max - min);
    ctx.beginPath();
    ctx.moveTo(leftPad, y);
    ctx.lineTo(width - rightPad, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(unitValue(tickValue, unit, decimals), leftPad - 8, y + 4);
  }
  ctx.textAlign = "left";

  const gradient = ctx.createLinearGradient(0, topPad, 0, height - bottomPad);
  gradient.addColorStop(0, "rgba(34, 181, 115, 0.2)");
  gradient.addColorStop(1, "rgba(102, 227, 157, 0)");

  ctx.beginPath();
  series.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(width - rightPad, height - bottomPad);
  ctx.lineTo(leftPad, height - bottomPad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  series.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  series.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#12322d";
    ctx.fill();
    ctx.fillStyle = "rgba(18,50,45,0.8)";
    ctx.font = "700 13px Microsoft YaHei, sans-serif";
    ctx.textAlign = index === series.length - 1 ? "right" : "center";
    ctx.fillText(Number(value).toFixed(decimals), x, y - 10);
    if (options.sampleLabels && options.sampleLabels[index]) {
      ctx.fillStyle = "rgba(102,128,120,0.72)";
      ctx.font = "12px Microsoft YaHei, sans-serif";
      ctx.fillText(options.sampleLabels[index], x, height - 12);
    }
  });
  ctx.textAlign = "left";
}

function drawDualChart(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const leftPad = 66;
  const rightPad = 30;
  const topPad = 72;
  const bottomPad = 44;
  const heightSeries = state.growth.height;
  const rootSeries = state.growth.root;
  if (!heightSeries.length || !rootSeries.length) return;
  const allValues = [...heightSeries, ...rootSeries];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const spread = rawMax - rawMin || 1;
  const min = Math.max(0, rawMin - spread * 0.16);
  const max = rawMax + spread * 0.18;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const xStep = chartWidth / Math.max(1, heightSeries.length - 1);
  const toX = (index) => leftPad + index * xStep;
  const toY = (value) => topPad + (1 - ((value - min) / (max - min || 1))) * chartHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(18,50,45,0.78)";
  ctx.font = "800 22px Microsoft YaHei, sans-serif";
  ctx.fillText("株高与新根长度 · cm", leftPad, 28);
  drawBadge(ctx, `株高 ${unitValue(heightSeries[heightSeries.length - 1], "cm", 1)}`, width - rightPad, 28, "#31b8c0", "right");
  drawBadge(ctx, `新根 ${unitValue(rootSeries[rootSeries.length - 1], "cm", 1)}`, width - rightPad, 58, "#e7a93a", "right");

  ctx.strokeStyle = "rgba(28,89,74,0.12)";
  ctx.lineWidth = 1;
  ctx.font = "13px Microsoft YaHei, sans-serif";
  ctx.fillStyle = "rgba(102,128,120,0.82)";
  for (let i = 0; i < 4; i += 1) {
    const ratio = i / 3;
    const y = topPad + ratio * chartHeight;
    const tickValue = max - ratio * (max - min);
    ctx.beginPath();
    ctx.moveTo(leftPad, y);
    ctx.lineTo(width - rightPad, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(unitValue(tickValue, "cm", 1), leftPad - 8, y + 4);
  }
  ctx.textAlign = "left";

  const heightGradient = ctx.createLinearGradient(0, topPad, 0, height - bottomPad);
  heightGradient.addColorStop(0, "rgba(118,220,226,0.18)");
  heightGradient.addColorStop(1, "rgba(118,220,226,0)");
  ctx.beginPath();
  heightSeries.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(width - rightPad, height - bottomPad);
  ctx.lineTo(leftPad, height - bottomPad);
  ctx.closePath();
  ctx.fillStyle = heightGradient;
  ctx.fill();

  ctx.beginPath();
  heightSeries.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#76dce2";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  rootSeries.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#ffd36b";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  heightSeries.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#12322d";
    ctx.fill();
    ctx.fillStyle = "rgba(18,50,45,0.78)";
    ctx.font = "700 13px Microsoft YaHei, sans-serif";
    ctx.textAlign = index === heightSeries.length - 1 ? "right" : "center";
    ctx.fillText(Number(value).toFixed(1), x, y - 10);
  });

  rootSeries.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#12322d";
    ctx.fill();
    if (index % 2 === 0 || index === rootSeries.length - 1) {
      ctx.fillStyle = "rgba(118,94,19,0.78)";
      ctx.font = "700 13px Microsoft YaHei, sans-serif";
      ctx.textAlign = index === rootSeries.length - 1 ? "right" : "center";
      ctx.fillText(Number(value).toFixed(1), x, y + 22);
    }
    ctx.fillStyle = "rgba(102,128,120,0.72)";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(growthSampleLabels[index], x, height - 12);
  });
  ctx.textAlign = "left";
}

function renderCharts() {
  const config = trendChartConfig[state.chart];
  const canvas = $("#trendChart");
  drawLineChart(canvas, state.history[state.chart], {
    label: config.title,
    color: config.color,
    unit: config.unit,
    decimals: config.decimals,
    range: config.range,
    sampleLabels: FloraAPI.isMock ? config.sampleLabels : []
  });
  canvas.setAttribute("aria-label", `${config.title}，最新 ${unitValue(state.history[state.chart][state.history[state.chart].length - 1], config.unit, config.decimals)}，目标 ${unitValue(config.range[0], config.unit, config.decimals)} 到 ${unitValue(config.range[1], config.unit, config.decimals)}`);
  drawDualChart($("#growthChart"));
  $("#growthChart").setAttribute("aria-label", state.growth.height.length ? `生长曲线，株高 ${unitValue(state.growth.height[state.growth.height.length - 1], "cm", 1)}，新根长度 ${unitValue(state.growth.root[state.growth.root.length - 1], "cm", 1)}` : "暂无生长测量数据");
}
