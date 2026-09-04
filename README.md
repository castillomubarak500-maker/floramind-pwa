# FloraMind · 水蕴匠心

木本植物智能水培系统，面向挑战杯/创业展示的移动端 PWA。保留原有实时监测、设备控制、AI 诊断、生长档案、社区五项功能，以原生 HTML/CSS/JavaScript 完成模块化升级。**没有网站构建步骤或 npm 运行依赖。**

- 应用：https://castillomubarak500-maker.github.io/floramind-pwa/
- 产品：https://castillomubarak500-maker.github.io/floramind-pwa/product/
- 高清二维码：[qr/floramind-v2.png](qr/floramind-v2.png)，984 × 984，已解码核对正式地址。
- [工程保留说明](docs/ARCHITECTURE.md) · [ESP32 接口契约](docs/DEVICE-API.md) · [验收报告](docs/VALIDATION.md)

## 本地运行

在仓库根目录运行：

```sh
python tools/serve.py
```

访问 `http://127.0.0.1:8787/floramind-pwa/`；产品页为同地址下的 `product/`。本地服务使用真实部署前缀，便于检查 manifest scope、Service Worker 和相对路径。localhost 支持 PWA 安全上下文；普通局域网 HTTP 不等同于 HTTPS 安装环境。

## 目录

```text
index.html                  # 五个原有应用页面
product/index.html          # 可直接刷新、无需跳转的产品页
css/                        # tokens / app / product
js/                         # 配置、数据、图表、渲染、路由、交互、PWA
assets/                     # 原有应用图标与轻量植物概念 SVG
qr/floramind-v2.png          # 正式地址高清二维码
manifest.json / sw.js        # 安装清单与按版本离线缓存
404.html                    # 明确的不存在页面与返回入口
product.html / web/          # 兼容旧产品链接
vendor/                     # 原图标库、许可证
docs/                       # 架构、接口和验收
tests/ / tools/             # 可选验证与本地静态服务
```

原根目录 app.js/product.js 为迁移说明；原 CSS 路径为兼容入口。新页面仅加载 `js/` 与 `css/`。

## 数据与真实设备

默认 `js/config.js` 使用 `mode: "mock"`。UI 只通过 `api-service.js` 获取数据，模拟数值、变化范围与诊断规则均在 `mock-data.js`。真实模式使用以下 REST 端点：

```text
GET  /api/device/:id/metrics
POST /api/device/:id/control
POST /api/diagnosis
```

服务失败不会回退为模拟在线；控制以设备确认结果为准，不缓存、不离线排队。详细字段、时间戳、身份验证和 ESP32 本地联锁责任见[接口契约](docs/DEVICE-API.md)。

演示照片只本机预览，不上传、不做图像识别。社区、评论、档案写入当前浏览器；清除网站数据会删除这些记录。浏览器不允许存储时降级为当前会话，并在保存操作时提示。尚未实现多人云同步或真实 AI 模型。

保留原生命指数算法：初始数值为 **98%**，不是硬编码的 92%；它是演示环境评分，不代表经验证的植物健康概率。诊断 86/81/72 也只是原有规则展示分数。

## PWA 与微信

manifest 含 FloraMind 名称、standalone、`/floramind-pwa/` 的 start_url/scope 和原有 192/512 PNG 图标。首次联网安装完整缓存后，可离线访问首页、产品页与演示功能。

Service Worker 只清理当前项目 scope 的旧版本，不影响同域其他应用。HTML/CSS/JS/图标作为同一版本整体缓存；有新版本时，用户点更新后刷新。发布时务必修改 `sw.js` 的 `VERSION`。它不缓存设备接口或写请求。

微信 WebView 不具备某项 PWA 能力时仍能使用在线 H5；添加到主屏幕会给出系统浏览器操作说明。已实现 safe-area、原生弹窗/Canvas 降级、无毛玻璃的可读背景、减少动画偏好、16px 表单字号与 hash 路由。微信 iOS/Android 真机结果见验收报告，不能用静态检查代替。

## GitHub Pages

仓库现有配置为 **Deploy from a branch → main → /(root)**。保留 `.nojekyll`，无需更换部署模式。

`product/` 是实际目录，刷新直接返回 HTML；应用内部为 `#/dashboard`、`#/archive`、`#/control`、`#/diagnosis`、`#/community`。旧 `product.html`、`web/` 跳到新产品目录，保留查询参数和锚点。未知路径由 404 页面提供返回入口，不再用模糊路径匹配把任何地址都伪装成成功。

## 验证

基础检查只需 Python 与 Node，无第三方包：

```sh
python tools/verify-static.py
node --test tests/data.test.cjs tests/service-worker.test.cjs
```

可选 DOM 交互回归：在仓库外安装 JSDOM，将 `FLORA_TEST_JSDOM` 指向其安装目录，然后运行 `node --test tests/ui.test.cjs`。这些测试会替代 Canvas 绘图上下文，**不等于视觉、微信、Safari 或离线安装实测**。

生成二维码需要仅用于维护的 Python `qrcode`/Pillow；二维码已提交，部署时无需安装。图标子集可用 `node tools/extract-icons.cjs` 从仓库原始图标定义重新导出。

性能目标为移动端 Lighthouse Performance > 90、首次加载 < 3 秒；必须在实际网络与浏览器中测量。新版 Lighthouse 已取消独立 PWA 分类，详见[官方说明](https://github.com/GoogleChrome/lighthouse/issues/15535)，因此以 manifest、SW、离线重载、安装、更新分别验收。
