# FloraMind V2 工程与保留边界

基线：`c28422cc8573393ecd6c167d8efc439f5f6b2f09`，2026-09-04。

升级前枚举了全部 19 个受版本管理的文件；读取自有 HTML/CSS/JS、配置和说明，对三个 PNG 检查尺寸与内容，对 Lucide 压缩库加载其导出并提取原始图标定义。无原有工作区改动。

## 原文件与变化

| 基线文件 | V2 去向/用途 |
|---|---|
| `index.html` | 保留五个页面、业务容器 ID 和操作名；更新首页、导航与语义结构 |
| `app.js` | 原函数按职责提取到 `js/`，根入口留下迁移说明 |
| `styles.css` | 公共兼容入口，视觉样式归入 `css/tokens.css`、`css/app.css` |
| `product.html` | 保留旧链接，转向真实静态页 `product/` |
| `product/index.html` | 由跳转壳变为完整产品页 |
| `product.css`、`product.js` | 旧路径兼容入口，现行实现在 `css/product.css`、`js/product.js` |
| `floramind-vision-v2.css` | 保留旧视觉入口，以共享 Token 为准 |
| `web/index.html` | 旧产品链接兼容转向 `product/` |
| `manifest.json`、`sw.js` | 安装清单、按版本完整离线资源缓存 |
| `404.html`、`.nojekyll` | 明确的不存在页面、纯静态 Pages 部署 |
| 两个 `assets/floramind-icon-*.png` | 保留原有 192/512 图标 |
| `vendor/lucide.min.js` | 保留原包作为出处；页面只加载约 7.7 KB 子集 |
| `qr_floramind_https.png`、`qr_target.txt` | 保留旧文件入口；新二维码在 `qr/floramind-v2.png` |
| `README.md` | 更新运行、部署、接口、验证说明 |

## 保留的业务规则

- 初始 pH 5.92、EC 1.42、DO 6.8、水温 22.3℃、液位 78%，以及所有原有目标区间/保护阈值。
- 原始指标随机变化范围、循环周期 6500 ms、历史队列长度 8；演示时段标签不代表实际测量时间。
- 原 Canvas 曲线与生长样本，株高 17.2 cm、新根 8.6 cm。
- 循环泵、增氧、补光、本地联锁四个开关；白光、红蓝滑杆。
- 原症状集合、三条诊断分支与 86/81/72 的演示评分。
- 原两条社区内容、点赞逻辑、四条历史档案。
- 原生命指数公式 `max(72, min(98, round(100 - 风险项数 × 6 - |水温 - 22| × 1.6)))`。因此初始数据显示 **98%**，没有为了视觉稿的 92% 覆盖已有评分逻辑。该值是环境启发式演示，不能作为植物健康测量值。

## 必要的行为修复

原“保存档案”“记录”“附带数据”“评论”“分享”中有提示空操作，现补上本机持久化/浏览器分享降级。原盐分风险按钮虽写“复测”却实际开启增氧，现仅新增复测记录。诊断文案不再把未测得的低 DO 写成已发生事实；照片在演示模式仅预览，不宣称图像识别。

用户内容以纯文本转义后插入页面；隐藏页面退出焦点顺序；控件有可访问状态；对话框提供无原生 dialog 的降级和焦点管理。旧脚本的全站清缓存与全站注销 Service Worker 已移除。

## 模块边界

```text
UI: core / renderers / charts / router / ui / actions / app
                         ↓
                    api-service
                    ↙         ↘
              mock-data      HTTPS REST
                    ↓
                 storage
```

经典 `defer` 脚本按依赖顺序加载，无框架、动态 import、CDN 字体、构建工具或运行时 npm 依赖。配置值位于 `js/config.js`。测试工具不是部署依赖。

静态资源采用版本完整缓存：新版本安装成功后提示更新，由用户决定何时切换；API 与 POST 不进缓存，不离线重放设备指令。不同仓库缓存按 scope 隔离。
