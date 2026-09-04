/* UI -> FloraAPI -> mock adapter / REST adapter. No network fallback to fabricated data. */
window.FloraAPI = (function () {
  const config = window.FLORA_CONFIG;
  const isMock = config.mode === "mock";
  let deviceId = FloraStorage.get(config.mode + ":device", config.deviceId);
  let demo = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  const key = name => config.mode + ":" + deviceId + ":" + name;

  async function request(path, options = {}) {
    if (!config.apiBaseUrl) throw new Error("尚未配置设备服务地址");
    const abort = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timer;
    const timeout = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        if (abort) abort.abort();
        reject(new Error("设备响应超时，请稍后重试"));
      }, config.requestTimeout);
    });
    const params = Object.assign({ credentials: "include", cache: "no-store" }, options);
    if (abort) params.signal = abort.signal;
    try {
      const operation = async function () {
        const response = await fetch(config.apiBaseUrl.replace(/\/$/, "") + path, params);
        if (!response.ok) throw new Error("设备服务返回 " + response.status);
        return response.json();
      };
      return await Promise.race([operation(), timeout]);
    } catch (error) {
      if (error.name === "AbortError") throw new Error("设备响应超时，请稍后重试");
      throw error;
    } finally { clearTimeout(timer); }
  }

  function validate(data) {
    const required = ["ph", "ec", "do", "waterTemp", "level"];
    if (!data || !data.metrics || required.some(name => typeof data.metrics[name] !== "number" || !Number.isFinite(data.metrics[name]))) {
      throw new Error("设备数据格式不完整，请检查接口");
    }
    if (!data.controls || ["pump", "oxygen", "light", "safety"].some(name => typeof data.controls[name] !== "boolean")) {
      throw new Error("设备未返回有效的控制状态");
    }
    const timestamp = Date.parse(data.updatedAt);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > 60000 || timestamp - Date.now() > 60000) {
      throw new Error("设备数据已过期，请检查连接与设备时钟");
    }
    const metrics = {};
    required.concat(["humidity", "light"]).forEach(name => {
      metrics[name] = typeof data.metrics[name] === "number" && Number.isFinite(data.metrics[name]) ? data.metrics[name] : null;
    });
    const controls = {};
    ["pump", "oxygen", "light", "safety"].forEach(name => { controls[name] = data.controls[name]; });
    ["white", "redBlue"].forEach(name => {
      if (Number.isFinite(data.controls[name]) && data.controls[name] >= 0 && data.controls[name] <= 100) controls[name] = data.controls[name];
    });
    // Optional remote metadata never flows directly into HTML renderers.
    return { metrics: metrics, controls: controls, updatedAt: data.updatedAt };
  }

  function demoSnapshot() {
    if (!demo) {
      demo = FloraMock.snapshot();
      const controls = FloraStorage.get(key("controls"), null);
      if (controls && ["pump", "oxygen", "light", "safety"].every(name => typeof controls[name] === "boolean")) {
        demo.controls = Object.assign(demo.controls, controls);
      }
      demo.feed = FloraStorage.get(key("feed"), demo.feed);
      demo.timeline = FloraStorage.get(key("archive"), demo.timeline);
    }
    return demo;
  }

  async function getMetrics(advance = true) {
    if (isMock) {
      const data = demoSnapshot();
      if (advance) FloraMock.advance(data);
      data.updatedAt = new Date().toISOString();
      return clone(data);
    }
    return validate(await request("/api/device/" + encodeURIComponent(deviceId) + "/metrics"));
  }

  async function bootstrap() {
    if (isMock) return getMetrics(false);
    const data = await getMetrics(false);
    return Object.assign({
      history: { ph: [data.metrics.ph], ec: [data.metrics.ec], do: [data.metrics.do] },
      growth: { height: [], root: [] }, selectedSymptoms: [], tasks: [], supplies: [],
      timeline: FloraStorage.get(key("archive"), []), feed: FloraStorage.get(key("feed"), [])
    }, data);
  }

  async function control(changes) {
    const allowed = ["pump", "oxygen", "light", "safety", "white", "redBlue"];
    Object.keys(changes).forEach(name => {
      if (allowed.indexOf(name) < 0) throw new Error("未知控制项");
      if (name === "white" || name === "redBlue") {
        if (!Number.isFinite(changes[name]) || changes[name] < 0 || changes[name] > 100) throw new Error("补光范围应为 0–100%");
      } else if (typeof changes[name] !== "boolean") throw new Error("控制状态必须是布尔值");
    });
    if (isMock) {
      const data = demoSnapshot();
      Object.assign(data.controls, changes);
      FloraStorage.set(key("controls"), data.controls);
      return clone(data.controls);
    }
    // Only acknowledged state is presented as applied. Commands are never queued offline.
    const result = await request("/api/device/" + encodeURIComponent(deviceId) + "/control", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes)
    });
    if (!result || result.applied !== true || !result.controls ||
        Object.keys(changes).some(name => result.controls[name] !== changes[name])) {
      throw new Error("设备尚未确认指令，状态未更改");
    }
    return result.controls;
  }

  async function diagnosis(symptoms, metrics, photo) {
    if (isMock) return FloraMock.diagnose({ selectedSymptoms: new Set(symptoms), metrics: metrics });
    const form = new FormData();
    form.append("deviceId", deviceId);
    form.append("symptoms", JSON.stringify(symptoms));
    form.append("metrics", JSON.stringify(metrics));
    if (photo) form.append("photo", photo);
    const result = await request("/api/diagnosis", { method: "POST", body: form });
    if (!result || typeof result.title !== "string" || typeof result.text !== "string" ||
        !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 100 ||
        ["oxygen", "retest", "observe"].indexOf(result.action) < 0) throw new Error("诊断结果格式错误");
    return Object.assign({}, result, { source: "live" });
  }

  return {
    isMock: isMock, bootstrap: bootstrap, getMetrics: getMetrics, control: control, diagnosis: diagnosis,
    deviceId: () => deviceId,
    bind: async function (serial) {
      if (!/^[A-Za-z0-9_-]{3,64}$/.test(serial)) throw new Error("序列号需为 3–64 位字母、数字或短横线");
      const previous = deviceId;
      const previousDemo = demo;
      deviceId = serial;
      demo = null;
      try {
        const data = await bootstrap();
        FloraStorage.set(config.mode + ":device", deviceId);
        return data;
      } catch (error) { deviceId = previous; demo = previousDemo; throw error; }
    },
    saveArchive: function (items) {
      if (isMock) demoSnapshot().timeline = clone(items.slice(0, 200));
      return FloraStorage.set(key("archive"), items.slice(0, 200));
    },
    saveFeed: function (posts) {
      if (isMock) demoSnapshot().feed = clone(posts.slice(0, 100));
      return FloraStorage.set(key("feed"), posts.slice(0, 100));
    }
  };
}());
