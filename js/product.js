document.addEventListener("DOMContentLoaded", async function () {
  if (window.lucide) window.lucide.createIcons();
  try {
    const data = await FloraAPI.getMetrics(false);
    const decimals = { ph: 2, ec: 2, do: 1, waterTemp: 1, level: 0 };
    document.querySelectorAll("[data-product-metric]").forEach(element => {
      const key = element.dataset.productMetric;
      element.textContent = Number(data.metrics[key]).toFixed(decimals[key]);
    });
    document.getElementById("productDataStatus").textContent = FloraAPI.isMock ? "演示数据" : "设备快照";
  } catch (error) { document.getElementById("productDataStatus").textContent = "数据暂不可用"; }
});
