# 冰箱笔记小程序 · 全量回归测试缺陷报告（第二轮）

**被测项目**：冰箱笔记（miniprogram-2）微信小程序
**测试轮次**：全量回归（第一轮报告 `defect-report-2026-08-17.md` 的 14 项修复已合入，本轮验证修复 + 挖掘新缺陷）
**测试日期**：2026-08-17
**测试依据**：CLAUDE.md + `miniapp-test-kit` 测试清单（A 配置 / B 逐页 / C 逻辑 / D 接口 / E 小程序特有）
**测试方式**：静态代码走查（本人精读核心文件 + 3 个并行只读探索代理分页面组走查），未执行真机/运行时验证

---

## 一、覆盖概览

| 项目 | 内容 |
|------|------|
| 走查页面 | 10 个：index / fridge / fridge-create / fridge-settings / item-edit / item-detail / member-manage / share-qrcode / scan-result / mine |
| 走查模块 | utils/cloud.ts、utils/theme.ts、utils/icons.ts、components/upload、components/swipe-cell |
| 核对云函数 | 20 个：login / createFridge / updateFridge / deleteFridge / getFridgeList / getFridgeDetail / getDefaultFridge / getExpiringItems / getItemsByLayer / addItem / updateItem / deleteItem / getItemDetail / generateQRCode / joinFridge / manageMember / updateUserNotify / updateUserTheme / checkExpiry / _shared |
| **历史缺陷修复验证** | **13 / 13 全部 PASS**（含 createFridge 不抢占默认待确认项） |
| **本轮新缺陷** | **20 个（P0: 1 / P1: 2 / P2: 17）** |
| 待确认项 | 6 个 |

---

## 二、历史缺陷修复验证结果（第一轮 14 项）

| 原编号 | 缺陷 | 验证结论 | 证据 |
|--------|------|----------|------|
| P0-01 | generateQRCode 返回被注释 | ✅ PASS | `cloudfunctions/generateQRCode/index.js:28-41` 已完整恢复 `uploadFile→getTempFileURL→return {code:0,data:{fileID,url}}` |
| P1-01 | 保存到相册缺下载步骤 | ✅ PASS | `share-qrcode.ts:30-55` 先 `downloadFile` 再 `saveImageToPhotosAlbum`，授权被拒 `openSetting` 闭环 |
| P1-02/03 | 上传图未入库 / t-upload 真机失效 | ✅ PASS | 新增 `components/upload` 原生组件；`item-edit.wxml:61` 用 `my-upload`，`item-edit.ts:177` 存 `fileID` |
| P1-04 | 通知设置未持久化 | ✅ PASS | `mine.ts:124-144` 调 `updateUserNotify`；`getFridgeList` 返回 `notifyEnabled/notifyDays` |
| P1-05 | 详情无法改保质期 | ✅ PASS | `item-detail.wxml:64` picker `bind:change="onDatePicker"` → `item-detail.ts:74` 回写 → `:83` 随保存提交 |
| P2-01 | pages/logs 死代码 | ✅ PASS | 目录已删除，git 状态确认 |
| P2-02 | 预览用 zones 而非 previewZones | ✅ PASS | `fridge-create.wxml:21` 渲染 `previewZones`，`rebuildPreview` 中间插入逻辑被消费 |
| P2-03 | fridge 首屏双发请求 | ✅ PASS | `fridge.ts:27-41` `_firstShow` 标志，仅返回页 `loadFridgeData(false)` |
| P2-04 | onLayerTap 直接 mutate this.data | ✅ PASS | `fridge.ts:212-226` 路径 `setData`（`'zones[${zi}].layers[${li}].expanded'`） |
| P2-05 | 详情加载失败塞伪造数据 | ✅ PASS | `item-detail.ts:48-60` 置 `loadError:true`、`canEdit:false`，操作栏 `wx:if` 隐藏 |
| P2-06 | member-manage isOwner 判定 | ✅ PASS | `member-manage.ts:21-26` 改为 `m.userId===currentOpenid`；`manageMember` 标 `isCurrentUser`；失败 toast |
| P2-07 | t-image 显示 cloud:// | ✅ PASS | `item-detail.ts:32-37` 经 `resolveCloudImages` 转 https 再给 src |
| P2-08 | index 空冰箱未清场 | ✅ PASS | `index.ts:88` 一并清空 `expiringItems` / `defaultFridgeId` |
| 待确认1 | createFridge 不抢占默认 | ✅ PASS | `createFridge/index.js:34-57` 查已有 `user_fridge`，仅首个冰箱设默认 |

> 第一轮 14 项缺陷已全部修复，本轮**未观察到回退**。

---

## 三、本轮新发现缺陷

> 按 P0 > P1 > P2 排序。

### P0-01 云函数日期「今天到期」被误判为「已过期」（时区错位，污染核心过期判定）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/getFridgeDetail/index.js:22-32`、`getFridgeList/index.js:30-34`、`getExpiringItems/index.js:78-82`、`getItemsByLayer/index.js:24-28`；客户端 `miniprogram/pages/fridge/fridge.ts:64` |
| **严重程度** | P0 |
| **缺陷类型** | 数据正确性（核心过期/临期状态计算） |

**根因**：`expireDate` 在库中以字符串 `YYYY-MM-DD` 存储。`new Date("2026-08-17")`（date-only 形式）按 ES2015+ 规范被解析为 **UTC 零点**；在 CloudBase 中国区（+8）服务器上等价于本地 **08:00**。与本地 `now` 比较时，所有"今天到期"的物品在 **08:00–23:59** 这一大段时间内都会被判定 `expireDate < now` → 误标 `danger`（已过期/红），违背"红=过期(<今天)"。

**复现路径**
1. 放入一个 `expireDate` 为"今天"的物品。
2. 上午 8 点后打开冰箱详情页 / 首页临期列表。

**期望 vs 实际**
- 期望：今天到期 → 应为「安全(绿)」或「临期(黄)」，而非「已过期(红)」。
- 实际：`getFridgeDetail` 等用 `new Date(item.expireDate) < new Date()` 比较，今天到期物品在一天约 16 小时内显示为「已过期」红标。
- 对照：`getDefaultFridge/index.js:42-51` 用 `toDateStr(now)` 字符串比较是**正确**的——同仓库两种范式并存，说明本 bug 是回归式遗漏。

**修复建议**：抽出统一工具 `isExpired/isWarning(expireDateStr, now)`，全部云函数复用；服务端 `now` 也用 `toDateStr(now)` 字符串比较（或统一 `new Date(y,m-1,d)` 本地零点）。客户端 `fridge.ts:64` 改用 `expireDate.split('-')` 构造本地零点，规避时区与 iOS `Invalid Date`。

---

### P1-01 编辑物品保存后位置被静默搬到首分区首层（数据损坏）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/item-edit/item-edit.ts:111`（主因）+ `:31-41`（竞态） |
| **严重程度** | P1 |
| **缺陷类型** | 数据正确性（每次"编辑并保存"都会错位） |

**复现路径**
1. 在某冰箱非首分区的物品上点「编辑」。
2. 不改任何字段 → 点保存。

**期望 vs 实际**
- 期望：保存后物品停留原位。
- 实际：`loadItem` 用 `const zoneIdx = this.data.zoneNames.indexOf(item.zoneId)` 定位（`item-edit.ts:111`）。但 `zoneNames` 是分区**名称数组**（`:52` `allZones.map(z=>z.name)`），而 `item.zoneId` 是**分区 ID**，二者永远不匹配 → 返回 `-1` → `:112-118` 定位块**永不执行**。于是 `zoneId/layerId` 停留在 `loadFridgeStructure` 默认值（首分区/首层），`onSave:174` 把错误值提交 `updateItem`，物品被静默搬至 `zone[0]/layer[0]`。

**修复建议**
1. 改为按 ID 定位：`const zoneIdx = this.data.zones.findIndex((z:any)=> z.zoneId === item.zoneId)`。
2. 解除竞态：`onLoad` 中 `await loadFridgeStructure()` 后再 `loadItem()`，使定位时 `this.data.zones` 已就绪。

---

### P1-02 mine 加载失败注入伪造冰箱 demo_001（失败展示假数据）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/mine/mine.ts:80-86` |
| **严重程度** | P1 |
| **缺陷类型** | 体验/数据误导（与旧 P2-05 同款反模式） |

**复现路径**：冷启动 / 弱网 / 未登录 / `getFridgeList` 失败时进入「我的」。

**期望 vs 实际**
- 期望：展示空态 + 「点击重试」。
- 实际：`loadData` catch 塞入 `{fridgeId:'demo_001',name:'客厅冰箱',doorType:'double',totalItems:12}` 并置 `app.globalData.fridgesReady=true`。用户点击 `onGoFridge` 跳 `/pages/fridge/fridge?fridgeId=demo_001`（不存在的冰箱），且污染全局 `globalData.fridges`，向全应用误报「数据已就绪」。

**修复建议**：失败分支改为空态 + 重试按钮，不注入假数据、不置 `fridgesReady=true`。

---

### P2-01 首页切换冰箱后「临期列表」与 banner 范围不一致

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/index/index.ts:125-140`（`onSwitchFridge`） |
| **严重程度** | P2 |

**复现路径**：首页有多冰箱 → 切到「0 临期」的冰箱。

**期望 vs 实际**：切换冰箱只 `setData({currentFridge, defaultFridgeId})` 并调 `updateDefaultFridge`，**未刷新 `expiringItems`**（云端返回的是该用户**全部**冰箱的临期项）。结果 banner「X 件需要处理」用单冰箱计数显示「0」，下方「临期提醒」却列出其它冰箱物品，自相矛盾。

**修复建议**：banner 改对各冰箱 `expiringCount/expiredCount` 求和（全局），或 `onSwitchFridge` 后按 `defaultFridgeId` 重新拉取并过滤 `expiringItems`，使两者范围一致。

---

### P2-02 fridge-create 多处直接 mutate `this.data` 后 `setData` 同引用

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/fridge-create/fridge-create.ts:110-121, 133-170` |
| **严重程度** | P2 |

**复现路径**：创建冰箱时增删分区/层、改恒温层。

**期望 vs 实际**：`onConstantZoneLayers`/`onZoneLayersChange`/`onAddZone`/`onDeleteZone` 直接改 `this.data.constantZone/zones` 内部数组（push/splice）后 `setData` 同引用。同文件 `onZoneNameChange` 等已用路径 `setData`，风格不一致；该反模式在 glass-easel 下存在 diff/观察者不一致风险（与已修的 P2-04 同源）。

**修复建议**：改为深拷贝后再 `setData`（如 `JSON.parse(JSON.stringify(this.data.zones))`），与 `onLayerTap` 路径写法统一。

---

### P2-03 客户端 `fridge.ts:64` `new Date(expireDate)` 时区 + iOS 兼容

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/fridge/fridge.ts:64` |
| **严重程度** | P2 |

**复现路径**：冰箱详情页查看「今天到期」物品的临期天数。

**期望 vs 实际**：`const diffDays = Math.ceil((new Date(item.expireDate).getTime() - Date.now())/86400000)` 存在 +8 偏移，导致天数偏差；且 `new Date('2026-08-17')`（连字符日期-only）在**低版本 iOS 基础库/JSCore** 可能返回 `Invalid Date` → `getTime()` 为 `NaN` → 「临期NaN天」。

**修复建议**：用 `expireDate.split('-')` 构造 `new Date(y, m-1, d)`（本地零点），或复用与云函数一致的字符串比较工具。

---

### P2-04 fridge-settings 删除后 `navigateBack({delta:2})` 强假设栈深

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/fridge-settings/fridge-settings.ts:55-57` |
| **严重程度** | P2 |

**复现路径**：冷启动 / 扫码深链 / 场景值直达 `fridge-settings` 后删除冰箱。

**期望 vs 实际**：`delta:2` 假定栈恒为 `index→fridge→fridge-settings`。直达场景栈深不足 2，调用静默失效，用户停留在已删除冰箱的设置页。

**修复建议**：用 `getCurrentPages().length` 保护，不足则 `wx.reLaunch` 到首页；或由首页统一回退。

---

### P2-05 fridge-settings 未依 `isOwner` 隐藏删除/编辑入口

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/fridge-settings/fridge-settings.wxml:29, 44` |
| **严重程度** | P2 |

**复现路径**：readonly 成员进入冰箱设置。

**期望 vs 实际**：`fridge-settings.ts:24` 已取 `isOwner`，但 wxml 的「冰箱名称 / 删除冰箱」等 `t-cell` 未做 `wx:if="{{isOwner}}"` 门禁。云函数 `deleteFridge/updateFridge` 经 `checkFridgePermission(['owner'])` 拦截（不越权），但 readonly 成员仍可见并尝试操作，权限语义不符。

**修复建议**：`isOwner` 为 false 时隐藏删除/编辑入口或置灰。

---

### P2-06 deleteFridge 返回缺少 `data` 字段，违反 `{code:0,data}` 约定

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/deleteFridge/index.js:33` |
| **严重程度** | P2 |

**复现路径**：删除冰箱成功。

**期望 vs 实际**：返回 `{ code: 0, msg: '删除成功' }`（无 `data`）。当前 `fridge-settings.ts` 用 `.then(()=>{...})` 未取返回值故未崩，但 `call()` 在 `code===0` 时 `resolve(result.data)` 得 `undefined`；日后若调用方依赖返回值会踩坑。

**修复建议**：改为 `return { code: 0, data: { fridgeId } }`。

---

### P2-07 swipe-cell 首次左滑可能无响应 + 已展开态逻辑缺陷

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/components/swipe-cell/swipe-cell.ts:36-37, 71-76, 87-104` |
| **严重程度** | P2 |

**复现路径**：列表页（fridge/index）首次左滑某一项。

**期望 vs 实际**：`onTouchStart` 中 `if(rightWidth===0) this.measure()`，`measure` 的 `boundingClientRect` 回调异步；首次 `touchmove` 在回调返回前触发时 `rightWidth` 仍为 0 → 偏移 0 → **首次滑动无位移**。另：`onTouchEnd` 阈值 `:96` 对「已展开」项任何收尾都走 `target=0` → 已展开项无法保持展开。

**修复建议**：`ready()` 完成首次 measure 并缓存；`onTouchMove` 中 `rightWidth===0` 先 `measure()` 并 `return`；已展开态单独判断「保持展开」。

---

### P2-08 scan-result 自动加入失败无重试入口（死代码）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/scan-result/scan-result.ts:13, 67-69`；`scan-result.wxml:15` |
| **严重程度** | P2 |

**复现路径**：扫码进入 → 自动 `verifyJoin()` → 因网络/其它原因失败。

**期望 vs 实际**：`onLoad` 直接自动加入，全程从不把 `showJoinBtn` 置真，「加入冰箱」按钮（`wx:if="{{showJoinBtn}}"`）永不渲染；`onJoin` 不可达，用户无法重试，仅显示「加入失败 + 返回首页」。

**修复建议**：失败时 `setData({showJoinBtn:true})` 暴露重试按钮，或明确提示并允许重新进入流程。

---

### P2-09 item-edit `onSave` 硬编码 `unit:'件'`

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/item-edit/item-edit.ts:176` |
| **严重程度** | P2 |

**复现路径**：编辑一个自定义单位的物品（如「kg」），保存任意字段。

**期望 vs 实际**：`payload.unit = '件'` 硬编码且始终发送；`updateItem` 会 `updateData.unit = unit` 覆盖。当前所有物品 unit 均为「件」暂不显现，但一旦存在自定义单位，编辑任意字段都会把它重置为「件」；且 `loadItem` 未读取 `item.unit` 进 data。

**修复建议**：编辑态改为 `unit: this.data.unit`（并把 unit 读入 data），仅新增时设默认「件」。

---

### P2-10 updateItem/deleteItem 未校验 item 归属当前 fridge（越权隐患）

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/updateItem/index.js:23`、`deleteItem/index.js:19` |
| **严重程度** | P2 |

**复现路径**：持有 A 冰箱 readwrite 者传入 B 冰箱某 `itemId`。

**期望 vs 实际**：两者仅用 `fridgeId` 做 `checkFridgePermission`，未像 `getItemDetail:32` 那样 `doc(itemId).get()` 校验 `item.fridgeId === fridgeId`。可修改/删除 B 冰箱物品。

**修复建议**：写前 `doc(itemId).get()` 校验归属，不符返回错误码。

---

### P2-11 manageMember `list` 被 owner 鉴权拦截

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/manageMember/index.js:11` |
| **严重程度** | P2 |

**复现路径**：非 owner（readwrite/readonly）进入成员管理页。

**期望 vs 实际**：`checkFridgePermission(fridgeId, ['owner'])` 对所有 action（含 list）强制 owner。若入口未严格限定仅 owner 可达，则列表必失败空白。

**修复建议**：list 放宽至任意成员（`['owner','readwrite','readonly']`），仅 changeRole/remove/transfer 保留 owner 校验。

---

### P2-12 鉴权异常用 `throw` 抛出，丢失 `{code,msg}` 契约

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/manageMember/index.js:11` + `cloudfunctions/_shared/auth.js:14,21,24` |
| **严重程度** | P2 |

**复现路径**：无权限调用 manageMember。

**期望 vs 实际**：`checkFridgePermission` 直接 `throw {code,msg}`，`exports.main` 未 try/catch。异常经云函数运行时 → 前端 `call` 走 `fail` → 弹通用「网络错误，请重试」，丢失精确 `msg`。

**修复建议**：改为 `return {code,msg}` 或在 `main` 内 try/catch 包裹后统一返回 `{code,msg}`。

---

### P2-13 member-manage 三个变更操作静默吞错

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/member-manage/member-manage.ts:59, 82, 105` |
| **严重程度** | P2 |

**复现路径**：改角色 / 移除成员 / 转让 owner 失败。

**期望 vs 实际**：均 `.catch(()=>{})`，失败无任何反馈且列表不刷新，用户不知操作成败。

**修复建议**：失败弹 Toast 并视情况回滚/重载列表。

---

### P2-14 通知开关/天数乐观更新无回滚

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/mine/mine.ts:124-144` |
| **严重程度** | P2 |

**复现路径**：关通知 / 改天数 → 后端保存失败。

**期望 vs 实际**：先 `setData` 翻转本地状态，再 `call(...).catch` 仅弹「保存失败」，但本地已翻转 → UI 与后端不一致。

**修复建议**：失败回滚本地状态，或保存期间禁用开关/显示 loading。

---

### P2-15 upload 组件无并发锁 / 上传中态

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/components/upload/upload.ts:13-52` |
| **严重程度** | P2 |

**复现路径**：上传期间快速连点「+」。

**期望 vs 实际**：`onChoose` 读 `this.data.files` 计算 `remain`，无锁；快速连点可能超额添加 / 重复选择。

**修复建议**：加 `_uploading` 锁，上传中禁用「+」按钮。

---

### P2-16 空态 / loading 态缺失

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `miniprogram/pages/member-manage/member-manage.wxml`（无 members 空态/骨架）；`miniprogram/pages/mine/mine.wxml`（无 fridges 空态，仅骨架+创建入口） |
| **严重程度** | P2 |

**修复建议**：补「暂无成员 / 暂无冰箱」空态（`t-empty` 已全局注册 `app.json:35`）。

---

### P2-17 样式适配：长文本溢出 & 安全区未叠加

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `mine.wxss:23-27(.user-name), 112-116(.f-name)`；`member-manage.wxss:5(.member-name)`；`app.wxss:131-135(.page-container padding-bottom:120rpx)` |
| **严重程度** | P2 |

**修复建议**：昵称/名称加 `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`；`.page-container` 底部叠加 `env(safe-area-inset-bottom)`，避免刘海屏被 tab-bar 遮挡（取决于 `t-tab-bar` 是否自带安全区）。

---

## 四、待确认项

| # | 疑点 | 位置 | 验证方法 |
|---|------|------|---------|
| 1 | **generateQRCode scene 超长（疑似 P1）**：`scene = fridgeId\|role\|Date.now()` ≈ 24+1+8~9+1+13 ≈ 47 字符，超过微信 `getUnlimited` 的 32 字节上限，真机可能直接报「scene 长度错误」导致分享码生成整体失败（P0-01 修复在真机可能不生效）。 | `generateQRCode/index.js:20` | 真机扫码 / 查云函数 `getUnlimited` 返回错误；若超长，改短码映射或压缩 fridgeId |
| 2 | 云函数服务器时区确为 UTC+8 以确认 P0-01 实际触发 | 各状态计算云函数 | 在 `getFridgeDetail` 打印 `new Date().getTimezoneOffset()` 与 `new Date(item.expireDate).toString()`，确认 expireDate 被 +8 偏移 |
| 3 | 低版本 iOS 下 `new Date('YYYY-MM-DD')` 是否为 Invalid Date | 客户端 `fridge.ts:64` 及各云函数 | iOS 真机放「今天到期」物品，观察是否「临期NaN天」或误判过期 |
| 4 | `fridge-settings` `delta:2` 在冷启动/深链直达场景的栈行为 | `fridge-settings.ts:55-57` | 通过「我的」或扫码直接拉起 `fridge-settings?fridgeId=xxx` 后删除，观察是否回退失败 |
| 5 | `manageMember` 入口是否仅 owner 可达（决定 P2-11 是否真实触发） | `fridge-settings` → `member-manage` 跳转 | 以 readonly 成员身份尝试进入成员管理页 |
| 6 | `checkExpiry` 订阅消息 `templateId:'YOUR_TEMPLATE_ID'` 为占位符（`checkExpiry/index.js:68`），生产环境推送必失败；且 `:81-85` 发送失败仍标记 `notified:true`，失败消息不重试 | `cloudfunctions/checkExpiry` | 确认是否为待填配置及重试策略 |

---

## 五、未覆盖项与风险提示

- **静态走查，无运行时验证**：本报告基于源码静态分析，P0/P1 等的"误判/错位"以代码逻辑推断为主；涉真机交互（swipe-cell 首滑、t-image、iOS 日期、scene 长度）已列入待确认项。
- **云函数未实测**：仅读源码，未实际部署调用；P0-01、P2-10/11/12 等需部署后确认。
- **未覆盖**：实时订阅消息（checkExpiry 定时器 + `wx.requestSubscribeMessage` 引导闭环）、云函数错误码全链路、并发请求竞态（连续保存/删除）、弱网与登录态失效降级（app.ts `doLogin` 失败仅降级主题）、多成员并发编辑同一物品、`getExpiringItems` 的 N+1 查询性能（每个冰箱各查一次 items）。
- **建议优先修复顺序**：P0-01（日期时区，核心功能）→ P1-01（编辑位置损坏）→ P1-02（失败假数据）→ 待确认1（scene 超长，影响分享）→ P2 按需。
- **统一日期工具**：强烈建议抽出 `toDateStr / isExpired / isWarning` 工具函数，所有云函数 + 客户端统一复用，根除 P0-01/P2-03 这类时区/解析缺陷。

---

## 六、可单测函数建议

| 函数 | 位置 | 建议用例 |
|------|------|---------|
| `toDateStr(date)` | `getDefaultFridge/index.js:7`（建议抽到 `_shared/util`） | 跨月（1/31→2 月）、跨年、闰年 2/29 |
| `isExpired / isWarning(expireDateStr, nowStr)`（**新增**） | 建议统一放置 | `expireDate==today`→非过期；`expireDate==today+2`→warning；`expireDate==today-1`→expired；时区无关 |
| `getLayerStatusTag / getLayerStatusText(items)` | `fridge/fridge.ts` | 空数组→safe；含 danger→danger；含 warning→warning；混合→danger |
| `getIconEmoji(key) / findIcon(key)` | `utils/icons.ts` | 已知 key→emoji；未知→默认 📦 |
| `getThemeColor/Name/PreviewColors(theme)` | `utils/theme.ts` | 非法 theme→回落 warm |
