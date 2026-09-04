/* Hash routes survive GitHub Pages reloads and browser back/forward. */
function updateNavState(screen) {
  $$(".bottom-nav button").forEach((btn) => {
    const active = btn.dataset.nav === screen;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}
function navigate(screen, fromHash = false) {
  if (screenOrder.indexOf(screen) < 0) screen = "dashboard";
  const changed = screen !== state.screen;
  state.screen = screen;
  $$(".screen").forEach(element => {
    const active = element.dataset.screen === screen;
    element.hidden = !active;
    element.classList.toggle("active", active);
    element.setAttribute("aria-hidden", String(!active));
    if (active && changed) element.scrollTop = 0;
  });
  updateNavState(screen);
  const titles = { dashboard: "生命", archive: "生长档案", control: "维生基座", diagnosis: "AI 诊断", community: "共生社区" };
  $("#screenTitle").textContent = titles[screen];
  document.title = titles[screen] + " · FloraMind";
  if (!fromHash && location.hash !== "#/" + screen) location.hash = "/" + screen;
  if (state.ready) renderCharts();
}
function routeFromHash() { navigate(location.hash.replace(/^#\/?/, "") || "dashboard", true); }
window.addEventListener("hashchange", routeFromHash);
