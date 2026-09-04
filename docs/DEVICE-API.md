# ESP32-S3 与服务端接入契约

浏览器不直接连接 ESP32。推荐链路：ESP32-S3 → HTTPS/MQTT 网关 → REST 服务 → FloraMind。

## 切换数据源

编辑 `js/config.js`：

```js
window.FLORA_CONFIG = Object.assign({
  mode: "live",
  apiBaseUrl: "https://your-device-api.example",
  deviceId: "C-01",
  pollInterval: 6500,
  requestTimeout: 8000
}, window.FLORA_CONFIG || {});
```

`apiBaseUrl` 是服务端根地址，不包含 `/api`。该示例域名需要替换。演示模式为 `mock`，API 失败不会回退成模拟在线。

每次修改站点部署均更新 `sw.js` 中的 `VERSION`，使已经安装的客户端获取完整一致的新版本资源。

## GET /api/device/:id/metrics

以下五个 metrics 字段和四个布尔控制字段必须存在；`updatedAt` 为 UTC ISO 8601，前后 60 秒内有效。humidity、light 和两项补光百分比可选；缺失时显示无数据/不可调。

```json
{
  "metrics": { "ph": 5.92, "ec": 1.42, "do": 6.8, "waterTemp": 22.3, "level": 78, "humidity": 64, "light": 226 },
  "controls": { "pump": true, "oxygen": true, "light": true, "safety": true, "white": 72, "redBlue": 48 },
  "updatedAt": "使用当前设备采样的 UTC 时间，例如 2026-09-04T14:00:00.000Z"
}
```

单位沿用原应用：EC mS/cm，DO mg/L，水温 ℃，液位 %，湿度 %RH。原 light 字段单位未在基线定义，暂不用于判断控制策略；后端接入时明确该字段的物理单位。

服务端应返回设备最新确认状态，不应把过期快照刷新时间冒充采样时间。页面隐藏时暂停轮询，返回前台时立即读取。设备 ID 会作为路径片段编码。实时模式的趋势只显示最近采样；历史窗口与生长测量接口尚需独立接入。

## POST /api/device/:id/control

请求 JSON，可以同时提交多项：

```json
{ "pump": true, "oxygen": true, "light": true }
```

返回必须包含设备已经确认的最终状态：

```json
{
  "applied": true,
  "controls": { "pump": true, "oxygen": true, "light": true, "safety": true, "white": 72, "redBlue": 48 }
}
```

补光字段范围 0–100。未确认、拒绝、超时或离线均不会改变界面为“执行成功”。前端不重放、不排队、不自动重试写操作。并发操作期间禁用开关，避免过期轮询覆盖刚完成的控制结果。

保留原有 safety 开关入口用于演示；真实后端应按设备安全策略拒绝不允许的修改。低液位、漏液、无流量停泵等硬件保护必须在 ESP32 本地完成，即便网络、手机或页面关闭仍应生效。

## POST /api/diagnosis

`multipart/form-data`：`deviceId`、JSON 字符串 `symptoms`、JSON 字符串 `metrics`，以及可选 `photo`（JPEG/PNG/WebP，前端上限 5 MB）。由浏览器设置 boundary，不手动指定 Content-Type。

```json
{
  "title": "根区低氧风险",
  "text": "请结合复测数据检查气石与水温。",
  "confidence": 86,
  "action": "oxygen"
}
```

`action` 只接受 `oxygen`、`retest`、`observe`；confidence 为 0–100。演示版 86/81/72 只是继承的规则展示数字，未经统计校准，不是模型概率。真实模型也需要单独校准与验证。

## 会话与后端责任

前端采用 `credentials: include`。跨域服务需显式允许 GitHub Pages 的 Origin，并处理 OPTIONS、Content-Type、凭据与 CSRF；不能把允许凭据与任意 Origin 混用。静态仓库不保存 API 密钥、硬件凭据或模型密钥。登录、设备归属、鉴权、速率限制与指令幂等性由服务端实现。

绑定演示设备只保存名字；实时模式绑定是读取已授权设备的数据，不能替代设备配网、认证与所有权验证。档案/社区目前均为本机数据，没有多人服务端同步，后续再实现 `/api/archive` 与 `/api/community` 适配器。

接入验收：传感器校准 → 设备时间同步 → 五项数值与实测核对 → 指令确认/拒绝/超时 → 断网本地保护 → AI 数据来源与结果复核。
