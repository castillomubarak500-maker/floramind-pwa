# FloraMind V2 验收记录

日期：2026-09-04。基线：`c28422cc8573393ecd6c167d8efc439f5f6b2f09`。

## 已执行

| 检查 | 结果与证据范围 |
|---|---|
| 全仓库盘点 | 19 个原有文件；无未提交用户改动；原有业务保留映射见 ARCHITECTURE.md |
| 原生脚本语法、链接、重复 ID | `python tools/verify-static.py` 通过 |
| 数据/接口回归 | 7 项通过：原值/变化范围/诊断分支、持久化、禁用存储、设备命名隔离、REST/确认、输入/时效校验、超时 |
| Service Worker 逻辑 | 3 项通过：缓存资源确实存在、离线响应、仅当前 scope 清理、不拦截 API/POST/其他站点 |
| DOM 交互 | 3 项通过：五页面/hash/控制；诊断到档案/观察/发布/点赞/评论/重载；盐分风险复测不误开增氧 |
| 本地 HTTP | 首页、产品目录、manifest、SW、图标脚本、二维码均 200 |
| 二维码 | PNG 984 × 984，黑白、四模块空白边；OpenCV 解码等于正式 HTTPS 地址 |
| 资源体积 | 首页引用资源约 109 KB（未压缩），产品约 53 KB；图标脚本 7,676 bytes，原包约 402 KB 不再加载 |
| 无构建部署 | 原生静态文件，页面不加载框架、npm、外部字体或 CDN；保留 Pages main 根目录模式 |

Node VM/DOM 测试是可复现的代码级回归；不模拟真实网络硬件，不证明浏览器引擎、画面布局或设备本地联锁。

## 设备与浏览器矩阵

| 环境/项目 | 当前结论 |
|---|---|
| iPhone 微信、Android 微信 | **未真机测试**；需设备扫码核验 |
| iPhone SE 375px、iPhone 15 393px、Android 360px | CSS 已覆盖；**未完成浏览器截图验证** |
| Safari | **未运行** |
| Chrome | DOM 行为已检查；**未在 Chrome 引擎中运行** |
| PWA 安装、离线重载、升级提示 | 静态/逻辑检查通过；**未完成实际浏览器安装与切网测试** |
| Lighthouse Performance >90、首次加载 <3s | **未测量，不能宣称达标** |
| Lighthouse PWA >90 | 新版已移除该分类；不提供虚构分数 |

限制：用户选定的内置浏览器无法初始化，报错缺少 `browser-service.mjs` 运行文件。没有擅自切换到其他浏览器表面。测试页已通过本地服务提供，待浏览器恢复或允许替代浏览器后完成视觉/引擎验证。

## 真机验收步骤

1. iOS 微信与 Android 微信扫码，确认页面进入、无横向滚动，375/393/360px 下导航不遮挡操作。
2. 顺序进入生命、生长、基座、AI、共生；后退、前进、刷新和产品目录刷新均回到正确页面。
3. 开关循环/增氧/补光，拖动滑杆，观察状态与确认提示；真实接口模式验证断网/过期/拒绝状态。
4. 上传小于 5 MB 的图片，选择症状分析，保存档案；发布含尖括号的文本应原样显示而不执行。
5. Chrome 首次联网加载，等待 Service Worker 完成安装，断网重载应用与 `/product/`。恢复网络并发布新 VERSION，确认更新提示。
6. Safari 添加到主屏幕；微信内按提示用系统浏览器安装；横竖屏和输入键盘弹出后仍能操作。
7. 在移动节流配置运行 Lighthouse，保存版本、网络/CPU节流参数、分数、LCP/CLS/INP 指标；不能将本地文件大小直接换算为实网首屏时间。

## 官方依据

- [MDN：Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)：完整缓存、生命周期与升级。
- [MDN：skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting)：显式启用等待中的版本。
- [Lighthouse：Remove PWA Category](https://github.com/GoogleChrome/lighthouse/issues/15535)：新版分类变更。
- [Lucide 原始许可证](https://github.com/lucide-icons/lucide/blob/main/LICENSE)：图标子集保留 ISC/MIT 归属。
