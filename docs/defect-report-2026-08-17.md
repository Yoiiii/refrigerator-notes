# 冰箱笔记小程序 · 全量回归测试缺陷报告

**被测项目**：冰箱笔记（miniprogram-2）微信小程序
**测试轮次**：回归测试（基于 2026-08-14 ~ 08-17 一轮改动后的当前代码）
**测试日期**：2026-08-17
**测试依据**：CLAUDE.md + 代码静态走查（10 个页面 + 12 个云函数 + 3 个 utils）
**测试方式**：静态代码走查（未执行真机/运行时验证）

---

## 一、覆盖概览

| 项目 | 内容 |
|------|------|
| 走查页面 | 10 个：index / fridge / fridge-create / item-edit / item-detail / fridge-settings / member-manage / share-qrcode / scan-result / mine |
| 走查模块 | utils/cloud.ts、utils/theme.ts、utils/icons.ts、utils/refresh.ts、components/swipe-cell |
| 核对接口 | 12 个云函数（getFridgeList / getFridgeDetail / getItemDetail / getExpiringItems / createFridge / updateFridge / deleteFridge / addItem / updateItem / deleteItem / generateQRCode / joinFridge / manageMember / checkExpiry） |
| 缺陷总数 | **14** 个（P0: 1 / P1: 6 / P2: 7） |
| 待确认项 | 5 个 |

---

## 二、缺陷清单

> 按 P0 > P1 > P2 排序。

### P0-01 分享二维码云函数返回被注释，生成功能完全失效

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/generateQRCode/index.js:21-42` |
| **严重程度** | P0 |
| **缺陷类型** | 功能（核心分享流程阻断） |

**复现路径**
1. 「我的 / 冰箱管理」进入某冰箱 → 管理冰箱 → 分享
2. 选择权限（只读/可读写）→ 点「生成分享码」
3. 观察页面

**期望 vs 实际**
- 期望：`generateQRCode` 生成二维码并 `return { code:0, data:{ fileID, url } }`，前端 `share-qrcode.ts` 拿到 `data.url` 渲染二维码。
- 实际：云函数在 `cloud.openapi.wxacode.getUnlimited` 之后，整段「上传云存储 + getTempFileURL + return」被注释（`index.js:28-41`），函数**没有 return 语句**，返回 `undefined`。前端 `if (data && data.url)` 恒为 false，`qrUrl` 永远为空，二维码与「保存到相册」按钮均不显示。分享冰箱主流程完全不可用。

**修复建议**
```js
// cloudfunctions/generateQRCode/index.js  建议恢复
const result = await cloud.openapi.wxacode.getUnlimited({ scene, page: 'pages/scan-result/scan-result', checkPath: false, width: 430 })
const upload = await cloud.uploadFile({
  cloudPath: `qrcodes/${fridgeId}_${Date.now()}.png`,
  fileContent: result.buffer,
})
const urlResult = await cloud.getTempFileURL({ fileList: [upload.fileID] })
return { code: 0, data: { fileID: upload.fileID, url: urlResult.fileList[0].tempFileURL } }
```
> 需重新「上传并部署」该云函数。

---

### P1-01 分享二维码「保存到相册」缺少下载步骤

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/share-qrcode/share-qrcode.ts:30-36` |
| **严重程度** | P1 |
| **缺陷类型** | 功能（即便是 P0-01 修好后仍失败） |

**复现路径**：生成二维码成功后点「保存到相册」。

**期望 vs 实际**
- 期望：将二维码图片保存到系统相册。
- 实际：`wx.saveImageToPhotosAlbum({ filePath: this.data.qrUrl })` 要求**本地文件路径**，但 `qrUrl` 是云存储 fileID 或 https 临时链接，API 直接失败并 toast「保存失败」。

**修复建议**
```ts
// share-qrcode.ts
async onSaveQR() {
  const url = this.data.qrUrl
  if (!url) return
  try {
    const dl = await wx.downloadFile({ url })   // 拿到本地 tempFilePath
    await wx.saveImageToPhotosAlbum({ filePath: dl.tempFilePath })
    Toast({ context: this, message: '已保存到相册', selector: '#t-toast' })
  } catch (e) {
    // 相册授权被拒时引导 openSetting
    Toast({ context: this, message: '保存失败，请允许相册权限', selector: '#t-toast' })
  }
}
```
> 同时需处理 `scope.writePhotosAlbum` 授权：首次用 `wx.saveImageToPhotosAlbum` 会自动弹窗，但若用户曾拒绝，需 `wx.openSetting` 引导。

---

### P1-02 上传图片未入库（仅存本地临时路径）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/item-edit/item-edit.ts:120-125, 171`；`pages/fridge-create/fridge-create.ts:178-183, 195` |
| **严重程度** | P1 |
| **缺陷类型** | 功能/数据（图片不持久、跨设备丢失） |

**复现路径**
1. 添加/编辑物品或创建冰箱，切到「上传图片」Tab
2. 选一张图 → 保存

**期望 vs 实际**
- 期望：图片上传到云存储，数据库存 fileID，任何设备可访问。
- 实际：`onUploadAdd` 仅 `setData({ images: e.detail.files })`；`onSave` 发送 `images.map(f => f.fileID || f.url)`。TDesign `t-upload` 在真机给出的 `e.detail.files[].url` 是**本地临时路径**（`wxfile://tmp_...` 或 http 临时链接），`fileID` 为 `undefined`。结果数据库存的是临时路径，重载后/其他设备图片消失。

**修复建议**：`onUploadAdd` 中把选中的本地文件 `wx.cloud.uploadFile` 到云存储，存下 `fileID` 再 setData；`onSave` 统一存 `fileID` 列表。`t-image` 支持直接显示 `cloud://` fileID。

---

### P1-03 真机下 t-upload「添加」按钮可能无响应

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/item-edit/item-edit.wxml:61`；`pages/fridge-create/fridge-create.wxml:82` |
| **严重程度** | P1 |
| **缺陷类型** | 功能（与 P1-02 叠加，上传形同虚设） |

**期望 vs 实际**
- 历史已确认：在 `glass-easel` 组件框架下，`t-upload` 网格（grid）模式的「添加」按钮包在 `t-grid-item` 内、靠自定义 `click` 触发，真机下该事件不触发，点不动。当前两页均使用默认 grid 模式 `t-upload`，未做原生兜底。
- 结果：真机无法选图，P1-02 的上传链路在真机上根本进不去。

**修复建议**：自写原生九宫格上传组件（`wx.chooseMedia`/`wx.chooseImage` + 云存储），参考之前 `components/upload` 思路；或在确认 TDesign 版本已修复该问题后升级依赖并验证真机。

---

### P1-04 通知「提前天数 / 开关」设置未持久化且无后端效果

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/mine/mine.ts:119-132`；云函数 `getExpiringItems/index.js:21` |
| **严重程度** | P1 |
| **缺陷类型** | 功能（设置无效） |

**复现路径**：我的 → 通知设置 → 关闭「临期提醒」或改「提前天数」→ 返回 → 再进入。

**期望 vs 实际**
- 期望：设置写入云端，影响临期计算与订阅推送。
- 实际：`onNoticeSwitch`/`onNoticeDays` 只 `setData` + toast，**不调用任何云函数**；`users.notifyDays`/`notifyEnabled` 从未被写入。`getExpiringItems`（line 21）读取 `users.notifyDays`，但永远取到默认值 3。即使用户改成 7 天，临期列表仍以 3 天计，订阅推送阈值也无效。

**修复建议**：新增/复用云函数（如 `updateUserNotify`）持久化 `notifyDays`/`notifyEnabled`；订阅消息引导 `wx.requestSubscribeMessage` 在前端触发。

---

### P1-05 物品详情编辑无法修改保质期

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/item-detail/item-detail.ts:65`；`pages/item-detail/item-detail.wxml:56-62` |
| **严重程度** | P1 |
| **缺陷类型** | 功能缺口 |

**复现路径**：物品详情 → 点「编辑保存」→ 点「保质期」字段。

**期望 vs 实际**
- 期望：弹出日期选择器，可改保质期。
- 实际：`onDatePicker` 是空 stub：`wx.showToast({ title: '选择日期', icon: 'none' })`，不打开任何选择器；`onSave` 只回传原 `this.data.item.expireDate`。用户**无法在详情页修改到期日**（名称、数量可改）。

**修复建议**：用 `t-date-time-picker` 或原生 `picker mode="date"` 绑定 `onDatePicker`，选中后 `setData({ 'item.expireDate': value })`。

---

### P2-01 pages/logs 页面未注册（死代码）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/logs/*`（logs.ts/wxml/wxss/json）vs `app.json` `pages` 数组 |
| **严重程度** | P2 |
| **缺陷类型** | 配置/可维护性 |

**复现路径**：`app.json.pages` 共 10 项，不含 `pages/logs`；该目录 4 个文件真实存在但不可达（除非硬编码路径跳转）。

**修复建议**：若不再需要，删除 `pages/logs/`；若需保留，补登 `app.json.pages`。

---

### P2-02 fridge-create 预览用 zones 而非 previewZones，单开门恒温层置中预览未生效

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge-create/fridge-create.ts:47-55, 128-130`（rebuildPreview 计算 previewZones 但 wxml 未使用）；`pages/fridge-create/fridge-create.wxml:20-42` |
| **严重程度** | P2 |
| **缺陷类型** | 功能一致性（预览≠实际） |

**复现路径**：创建冰箱 → 选单开门 + 开恒温层 → 看实时预览。

**期望 vs 实际**
- 期望：单开门预览中恒温层插入分区中间（与详情页 `displayZones` 一致）。
- 实际：wxml 始终 `wx:for="{{zones}}"` + 底部单独的 `preview-zone constant` 块，`previewZones`（已内置中间插入逻辑）**从未被渲染**，`rebuildPreview()` 形同死代码。预览里恒温层永远在底部。

**修复建议**：预览区改用 `previewZones`（或复用与 fridge.ts 一致的 `displayZones` 算法），使预览与最终布局一致；或删除无用的 `previewZones`/`rebuildPreview` 以减负债。

---

### P2-03 fridge.ts 首次加载 onLoad + onShow 双发请求

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge/fridge.ts:27-36` |
| **严重程度** | P2 |
| **缺陷类型** | 性能/体验 |

**复现路径**：进入冰箱详情页（冷启动首次）。

**期望 vs 实际**
- 期望：首屏只请求一次。
- 实际：`onLoad` 调 `loadFridgeData(true)`（骨架态），紧接着 `onShow` 又调 `loadFridgeData(false)`（淡入态），两次请求并发、骨架与淡入状态互相覆盖，存在闪烁与一次多余请求。

**修复建议**：用 `onLoad` 已加载标志，或在 `onShow` 中区分「首次」与「返回页」——首次不重复请求（`onLoad` 已发），仅非首次（如从添加物品返回）静默刷新。

---

### P2-04 fridge.ts 直接 mutate this.data 后 setData 同引用

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge/fridge.ts:186-198`（onLayerTap） |
| **严重程度** | P2 |
| **缺陷类型** | 逻辑/可维护性 |

**复现路径**：冰箱详情页点分区/层标题展开收起。

**期望 vs 实际**
- 期望：展开/收起稳定更新视图。
- 实际：`onLayerTap` 直接改 `this.data.zones`/`constantZone` 对象内部属性，再 `setData({ zones: this.data.zones })`（同引用）。依赖框架对同引用重新序列化，属反模式；部分基础库/特定写法下可能不触发 diff，导致展开态不刷新。

**修复建议**：用深拷贝或路径更新：`this.setData({ ['zones['+zi+'].layers['+li+'].expanded']: !expanded })`。

---

### P2-05 item-detail 加载失败展示伪造数据并可编辑/删除

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/item-detail/item-detail.ts:42-51` |
| **严重程度** | P2 |
| **缺陷类型** | 体验/数据误导 |

**复现路径**：网络异常导致 `getItemDetail` 失败。

**期望 vs 实际**
- 期望：展示错误态/重试，而非假数据。
- 实际：catch 中塞入硬编码 `item`（`name:'鲜牛奶'` 等）且 `canEdit:true`。用户可对“假内容”点编辑/删除；虽 `itemId` 是真实 id（会作用于真实物品），但**展示名称错误**，易误导误操作。

**修复建议**：失败时用真实 `itemId` 占位并明确标注「加载失败，请重试」，禁用编辑/删除，或返回上一页提示。

---

### P2-06 member-manage 当前用户 owner 判定不准确

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/member-manage/member-manage.ts:23` |
| **严重程度** | P2 |
| **缺陷类型** | 逻辑/权限可见性 |

**复现路径**：进入成员管理页，查看 `isOwner` 取值。

**期望 vs 实际**
- 期望：`isOwner` 表示“当前用户是否为 owner”。
- 实际：`isOwner = data.some(m => m.role === 'owner')` 表示“列表里是否有任意 owner”（冰箱必有 owner，所以恒为 true）。属冗余/错误逻辑。
- 当前因入口 `fridge-settings` 的 `isOwner` 与云端 `checkFridgePermission(['owner'])` 双重限制，非 owner 难以触达；但若误入，list 会静默失败（`.catch(() => {})` 无提示），成员列表空白。

**修复建议**：云端 `manageMember` list 返回时标记 `isCurrentUser`，前端据此决定 `isOwner` 与是否展示管理按钮；list 失败给出明确 toast。

---

### P2-07 t-image 显示 cloud:// fileID 可能无法渲染

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge/fridge.wxml:121,168`；`pages/item-detail/item-detail.wxml:28`；`pages/index/index.wxml:46` 等 |
| **严重程度** | P2 |
| **缺陷类型** | 兼容性（待真机确认） |

**复现路径**：物品/冰箱使用上传图片（云存储 fileID）时。

**期望 vs 实际**
- 期望：图片正常显示。
- 实际：`t-image src="{{item.images[0]}}"` 当值为 `cloud://` fileID 时，TDesign image 不一定解析云存储协议（原生 `<image>` 可）。叠加 P1-02（存的是临时路径而非 fileID），当前图片展示链路整体脆弱。

**修复建议**：统一用原生 `<image>` 或对 fileID 先 `wx.cloud.getTempFileURL` 转 https 再给 `t-image`；结合 P1-02 修复后验证真机。

---

### P2-08 index 空冰箱分支未清理 expiringItems / defaultFridgeId

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/index/index.ts:87-89` |
| **严重程度** | P2 |
| **缺陷类型** | 数据残留（轻微） |

**复现路径**：原本有冰箱与临期项 → 全部删除冰箱 → 回到首页。

**期望 vs 实际**
- 期望：清空临期列表与默认 id。
- 实际：`fridges.length === 0` 分支只 `setData({ pageLoading:false, hasFridge:false, currentFridge:{} })`，未清空 `expiringItems` / `defaultFridgeId`。UI 因切到空态不渲染，但 data 残留；下次有冰箱时若加载异常可能短暂显示旧临期项。

**修复建议**：空分支一并 `setData({ expiringItems: [], defaultFridgeId: '' })`。

---

## 三、待确认项

| # | 疑点 | 位置 | 验证方法 |
|---|------|------|---------|
| 1 | createFridge「已有默认冰箱时新建不抢占」修复（commit c6819e2）已改代码，但**云函数需重新上传部署**才能生效；若未部署，行为仍可能抢占默认。 | `cloudfunctions/createFridge/index.js` | 部署后在真机新建第二个冰箱验证首页默认冰箱不变 |
| 2 | `expireDate` 以 "YYYY-MM-DD" 字符串存储，`new Date("2026-08-20")` 在 iOS 低版本是否解析异常（getExpiringItems 已用字符串比较规避，风险低）。 | `getFridgeDetail`/`getItemDetail`/`fridge.ts` | 真机（旧 iOS）验证日期计算 |
| 3 | `checkExpiry` 定时器是否真正按 `users.notifyDays` 推送订阅消息（依赖 P1-04 落库）。 | `cloudfunctions/checkExpiry` | 云端日志 + 接收推送验证 |
| 4 | 真机 t-upload 点击「添加」行为（P1-03）需实机验证。 | `t-upload` 两处 | 真机点选图片 |
| 5 | 深层级下 tab 切换（`t-tab-bar` + navigateTo/navigateBack）是否始终有界；如 设置→成员→返回 后再切 tab。 | `index.ts:111` / `mine.ts:87` | 真机多路径跳转压测 |

---

## 四、可单测函数建议

| 函数 | 位置 | 建议用例 |
|------|------|---------|
| `getLayerStatusTag(items)` / `getLayerStatusText(items)` | `pages/fridge/fridge.ts:152-164` | 空数组→success/安全；含 danger→danger/已过期；含 warning→warning/临期；danger+warning 混合→danger |
| `getIconEmoji(key)` / `findIcon(key)` | `utils/icons.ts:140-153` | 已知 key→对应 emoji；未知 key→默认 📦 |
| `getThemeColor/Name/PreviewColors(theme)` | `utils/theme.ts` | 非法 theme→回落 warm 默认值 |
| `refreshTheme(theme)` | `utils/theme.ts` | 非法 theme 回落 warm，不抛错 |
| `toDateStr(date)` | `cloudfunctions/getExpiringItems/index.js:8` | 跨月（1月31→2月）、跨年、闰年 2 月 29 |

---

## 五、未覆盖项与风险提示

- **静态走查，无运行时验证**：本报告基于源码静态分析，未执行真机/模拟器运行，缺陷以代码逻辑推断为主；涉及真机交互（t-upload 点击、t-image cloud://、iOS 日期）的结论已列入待确认项。
- **云函数未在云端实测**：仅读源码，未实际部署调用；P0-01 等需部署后确认。
- **未覆盖**：实时订阅消息（checkExpiry 定时器 + 前端 `wx.requestSubscribeMessage` 引导是否闭环）、云函数错误码全链路、并发请求竞态（连续保存/删除）、弱网与登录态失效降级（app.ts `doLogin` 失败仅降级主题）、多成员并发编辑同一物品。
- **性能**：`getFridgeList` 对每个冰箱各发一次 `items` 查询（N+1），冰箱数量大时耗时上升，建议批量聚合。
- **编码/BOM**：本轮未发现新的 BOM 或乱码（上次已清理）；若重新出现编译报错，优先排查文件 BOM（见上次记录）。
- **tabBar 实现**：本项目无原生 `tabBar`，用 `t-tab-bar` 组件 + 手动 navigate 实现首页/我的切换；当前逻辑有界，但属非标准做法，后续如需「切换保持页面状态」会有局限。
