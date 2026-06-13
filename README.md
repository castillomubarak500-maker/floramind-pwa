# FloraMind PWA

面向“维生基座”木本植物智能水培设备的移动端应用原型，包含实时监测、远程控制、生长档案、AI 诊断、社区互动、耗材预警和设备绑定流程。

## 本地运行

在仓库根目录启动静态服务：

```powershell
python -m http.server 8787 --bind 0.0.0.0
```

本机访问：

```text
http://127.0.0.1:8787/floramind_app/
```

正式 HTTPS 访问：

```text
https://castillomubarak500-maker.github.io/floramind-pwa/
```

产品网页端：

```text
https://castillomubarak500-maker.github.io/floramind-pwa/product/
```

对应二维码文件：

```text
floramind_app/qr_floramind_https.png
```

## 上线路径

### 路径 A：H5/PWA 上线

当前已部署到 GitHub Pages：

```text
https://castillomubarak500-maker.github.io/floramind-pwa/
```

`qr_target.txt` 与 `qr_floramind_https.png` 已指向该正式 HTTPS 地址。iOS Safari 和 Android Chrome 都可以通过“添加到主屏幕”安装为类 App 体验。

### 路径 B：iOS / Android App

当前代码是标准 Web/PWA，可用 Capacitor 封装：

1. `npm init`
2. `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
3. `npx cap init FloraMind com.shuiyunjiangxin.floramind --web-dir floramind_app`
4. `npx cap add ios`
5. `npx cap add android`
6. 用 Xcode / Android Studio 接入图标、启动图、权限和商店证书。

真正上架 App Store / 应用商店需要开发者账号、隐私政策、备案或合规材料、审核截图和设备权限说明。

### 路径 C：微信小程序

可把当前页面迁移到 uni-app 或 Taro，优先复用页面结构和状态逻辑。小程序上线需要：

1. 已认证小程序主体和 AppID。
2. HTTPS 后端接口域名备案并配置到微信后台。
3. 图片上传、AI 诊断和社区发布需要走微信授权与内容安全审核。
4. 提交微信审核后才能生成正式小程序码。

## 后端接口预留

当前数据为前端模拟。后续接真实设备时建议新增：

- `GET /api/device/:id/metrics`：pH、EC、DO、水温、液位、光照、温湿度。
- `POST /api/device/:id/control`：循环泵、增氧泵、补光、联锁配置。
- `POST /api/diagnosis`：图片与症状标签，返回诊断结果与建议。
- `GET/POST /api/archive`：生长记录、校准记录、换液记录。
- `GET/POST /api/community`：社区内容与互动。
