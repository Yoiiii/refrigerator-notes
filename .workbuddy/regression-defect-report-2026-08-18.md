# 冰箱笔记 小程序 · 全量回归测试缺陷报告

**被测项目**：冰箱笔记（Fridge Notes）微信小程序
**测试轮次**：全量回归（静态代码走查）
**测试日期**：2026-08-18
**测试依据**：`CLAUDE.md` + `docs/prd-v1.3.2.md`（推断）+ 代码本身
**执行角色**：miniapp-tester（程小测，只读走查，未修改任何业务代码）

---

## 一、覆盖概览

| 项目 | 内容 |
|------|------|
| 走查页面 | 10 个：`index` `fridge` `fridge-create` `item-edit` `item-detail` `fridge-settings` `member-manage` `share-qrcode` `scan-result` `mine` |
| 走查模块 | `utils/cloud.ts` `theme.ts` `icons.ts` `util.ts` `refresh.ts`；组件 `swipe-cell` `upload`；`app.ts` |
| 核对接口 | 前端 `call()` × 20 个云函数；逐参数核对 `getFridgeList`/`getExpiringItems`/`getFridgeDetail`/`getItemDetail`/`manageMember`/`addItem`/`updateItem`/`deleteItem`/`joinFridge`/`generateQRCode`/`checkExpiry` 等数据契约 |
| 缺陷总数 | **12** 个（P0: 0 / P1: 2 / P2: 10） |
| 待确认项 | 5 个 |

> 说明：本轮为**静态代码走查**，未接入微信开发者工具运行时，缺陷均指向具体文件与行号；运行时表现见「待确认项 / 未覆盖项」。

---

## 二、缺陷清单

### P1-01 冰箱详情加载失败（权限失效/网络异常）无任何用户提示与空态

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge/fridge.ts:176-180` |
| **严重程度** | P1 |
| **缺陷类型** | 异常场景无提示 |

**复现路径**
1. 用户原本是某冰箱成员，被 owner 移除后再次打开该冰箱（`fridgeId` 深链或返回）；或弱网下 `getFridgeDetail` 返回非 0。
2. 打开 `pages/fridge/fridge`。

**期望 vs 实际**
- 期望：加载失败时显示错误提示或空态（如「加载失败，请返回重试」），与 `item-detail`、`index` 一致。
- 实际：`loadFridgeData` 的 `catch` 仅 `console.error` 后 `setData({ loading:false })`，WXML 走 `wx:else` 分支渲染出占位标题「客厅冰箱」+ 空结构的「空壳」，用户看到的是看似空白的冰箱，无任何反馈。

**修复建议**（仅建议，不写入文件）
```ts
// pages/fridge/fridge.ts  loadFridgeData 的 catch 中
} catch (e) {
  console.error('loadFridgeData error:', e)
  wx.showToast({ title: '冰箱加载失败，请返回重试', icon: 'none' })
  this.setData({ loadError: true, fridgeName: '', zones: [], displayZones: [], constantZone: null })
} finally {
  this.setData({ loading: false, refreshing: false })
}
// WXML 在 wx:else 内容顶部增加：<view wx:if="{{loadError}}" class="error-banner">…</view>
```

---

### P1-02 冰箱页未对只读（readonly）角色隐藏删除入口，点击后静默失败

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge/fridge.wxml:130 / 177 / 222`；`pages/fridge/fridge.ts:27-181` |
| **严重程度** | P1 |
| **缺陷类型** | 权限 UI 不一致 + 异常无提示 |

**复现路径**
1. 用一个 `readonly` 角色成员账号打开某冰箱（`pages/fridge/fridge`）。
2. 左滑任意物品单元格 → 出现红色「删除」按钮 → 点击 → 确认弹窗 → 确认。

**期望 vs 实际**
- 期望：只读成员不应看到删除滑动按钮（与首页 `index` 一致——首页对 `role==='readonly'` 已用 `swipeRight:[]` 隐藏）。
- 实际：冰箱页三处 `slot="right"` 删除按钮**无条件渲染**（双开门层、单开门层、恒温层）。点击确认后 `onDeleteConfirm` → `call('deleteItem')` 被服务端 `checkFridgePermission(['owner','readwrite'])` 拒绝，抛出后**前端 `catch` 为空**（`fridge.ts:265` `.catch(() => {})`），既不删数据也无任何 toast，用户看到「点了没反应」。

**根因**：`getFridgeDetail` 已返回 `role`，但 `loadFridgeData` 的 `setData` 未把 `role` 存入 `this.data`，导致 WXML 无法做权限分支（与首页做法不一致）。

**修复建议**（仅建议，不写入文件）
```ts
// pages/fridge/fridge.ts  loadFridgeData 的 setData 中补充
this.setData({ /* …原有… */ role: data.role })
// WXML 三处 slot="right" 增加 wx:if
<view slot="right" wx:if="{{role !== 'readonly'}}" class="swipe-delete"
      data-item-id="{{item._id}}" catch:tap="onDeleteItem">删除</view>
// 同时 onDeleteConfirm 的 .catch 改为给出失败 toast
```

---

### P2-01 云函数统一封装 `call()` 未设置超时

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `utils/cloud.ts:9-42` |
| **严重程度** | P2 |
| **缺陷类型** | 异常/性能 |

**复现路径**：弱网或服务端阻塞时调用任意云函数。
**期望 vs 实际**：`wx.cloud.callFunction` 默认超时 20s，期间页面 loading 长时间不结束、无「网络超时」提示。建议在 `call()` 内加 `timeout: 10000` 并在 `fail` 已提示基础上补充超时文案。

---

### P2-02 冰箱页删除失败 `catch` 为空，无任何提示

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge/fridge.ts:265`（及首页 `onDeleteExpiringConfirm` 的 `.catch` 仅提示「删除失败」，相对较好） |
| **严重程度** | P2 |
| **缺陷类型** | 异常无提示 |

**复现路径**：owner 删除物品时网络失败。
**期望 vs 实际**：`onDeleteConfirm().catch(() => {})` 静默吞错，用户不确定是否删除成功。建议 `.catch` 中 `wx.showToast({ title: '删除失败', icon:'none' })`。

---

### P2-03 保质期日期选择器写死 2026-01-01 ~ 2030-12-31 范围

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/item-edit/item-edit.wxml:22`；`pages/item-detail/item-detail.wxml:86` |
| **严重程度** | P2 |
| **缺陷类型** | 边界/体验 |

**复现路径**：设置保质期早于 2026-01-01 或晚于 2030-12-31。
**期望 vs 实际**：`picker mode="date"` 的 `start`/`end` 写死，超出范围不可选；`start="2026-01-01"` 若当前设备年份更早也会错位。建议 `start` 用动态今天、`end` 用今天 + N 年（或由 `fridgeListVersion`/服务端下发）。

---

### P2-04 获取微信头像昵称使用已废弃的 `wx.getUserProfile`

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/mine/mine.ts:68-87` |
| **严重程度** | P2 |
| **缺陷类型** | 功能不符合预期（平台适配） |

**复现路径**：「我的」页点击用户卡片 → 授权。
**期望 vs 实际**：微信自基础库 2.27+ 已废弃 `getUserProfile`，不再弹窗、返回匿名占位（昵称「微信用户」、灰色头像），功能实际失效（有默认昵称绕行，不影响主流程）。建议改用「头像昵称填写」能力或 `<button open-type="chooseAvatar">` + 昵称输入组件。

---

### P2-05 分享二维码 `scene` 长度临界微信 32 字符上限

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/generateQRCode/index.js:24` |
| **严重程度** | P2（临界风险，当前标准 `_id` 恰可用） |
| **缺陷类型** | 配置边界 |

**复现路径**：owner 生成分享码。
**期望 vs 实际**：`scene = \`${fridgeId}|${roleCode}|${dayTs}\``，标准 CloudBase `_id` 为 24 字符 + `|rw|` + base36 天数(~4) ≈ **恰好 32 字符**，余量为 0。`wxacode.getUnlimited` 的 `scene` 上限即 32，若环境 `_id` 变长则生成直接失败（`scan-result` 端无法解码）。建议去掉分隔符或缩短编码（如 `fridgeId` 用更短引用、时间戳用更紧凑进制）留出余量。

---

### P2-06 写入类云函数未捕获 `checkFridgePermission` 抛错，前端只收到通用「操作失败」

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/addItem/index.js:13`、`updateItem/index.js:11`、`deleteItem/index.js:11`、`deleteFridge/index.js:11`（均无 try/catch） |
| **严重程度** | P2 |
| **缺陷类型** | 异常提示/可维护性 |

**复现路径**：非 owner/只读用户触发 addItem/updateItem/deleteItem/deleteFridge（理论上 UI 已拦截，但深链/越权调用时）。
**期望 vs 实际**：`checkFridgePermission` 直接 `throw {code,msg}`，未被 `exports.main` 捕获 → 云函数返回非结构结果 → 前端 `call()` 只显示通用「操作失败」，而非「权限不足」。数据未被误写（安全），但提示不明确、难以排查。`manageMember` 已规范捕获（`manageMember/index.js:89-93`），建议其他写入函数统一加同样的 `try/catch` 归一化返回。

---

### P2-07 死代码云函数 `getItemsByLayer` / `getDefaultFridge` 未被前端调用

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/getItemsByLayer/index.js`（全文件）；`cloudfunctions/getDefaultFridge/index.js` |
| **严重程度** | P2 |
| **缺陷类型** | 可维护性 |

**复现路径**：前端全局搜索 `getItemsByLayer` / `getDefaultFridge`。
**期望 vs 实际**：前端从未调用这两个云函数（`getDefaultFridge` 的能力已被 `getFridgeList` 返回的 `defaultFridgeId` 覆盖），属部署冗余。建议删除未使用云函数或补齐调用。

---

### P2-08 每次保存物品都触发订阅消息授权弹窗

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/item-edit/item-edit.ts:214-229` |
| **严重程度** | P2 |
| **缺陷类型** | 体验打扰 |

**复现路径**：编辑/新增物品并反复保存。
**期望 vs 实际**：`onSave` 每次都在用户手势内调用 `wx.requestSubscribeMessage`，即使已订阅也会反复弹窗，体验打扰且可能触达平台「单次会话订阅」限制。建议在 `notifyEnabled === undefined`（尚未订阅）时申请，已订阅/已拒绝（`notifyEnabled===false`）时不再弹。

---

### P2-09 保存二维码到相册依赖 `downloadFile` 合法域名白名单

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/share-qrcode/share-qrcode.ts:35`（及 `wx.saveImageToPhotosAlbum`） |
| **严重程度** | P2（需真机/后台确认） |
| **缺陷类型** | 接口/配置 |

**复现路径**：生成二维码 → 保存到相册。
**期望 vs 实际**：`qrUrl` 为云存储临时 URL（`*.tcb.qcloud.la`），`wx.downloadFile` 需该域名在「downloadFile 合法域名」内。云开发环境通常自动放行，但非云开发/自定义域名下会下载失败且无明确提示（仅 catch 通用「保存失败」）。建议真机验证并在 MP 后台确认域名白名单。

---

### P2-10 冰箱设置页加载失败无错误态

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge-settings/fridge-settings.ts:34-36`；`pages/fridge-settings/fridge-settings.wxml:22-48` |
| **严重程度** | P2 |
| **缺陷类型** | 异常无提示 |

**复现路径**：`getFridgeDetail` 失败时打开冰箱设置。
**期望 vs 实际**：`catch` 仅 `setData({loading:false})`，WXML 显示空内容（标题为空），无错误提示/重试。建议加错误 banner 或复用 `t-empty` + 重试。

---

### P2-11 临期文案「临期0天」措辞怪异

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/getExpiringItems/index.js:100`；`pages/fridge/fridge.ts:77`（diffDays=0 时） |
| **严重程度** | P2 |
| **缺陷类型** | 文案体验 |

**复现路径**：物品恰好今天到期。
**期望 vs 实际**：`diffDays` 为 0 → 展示「临期0天」。建议今天到期显示「今天到期」（与 `getItemDetail` 的 `d===0 ? '今天到期'` 保持一致）。

---

### P2-12 预设图标列表使用 `wx:key="index"` 反模式

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `pages/fridge-create/fridge-create.wxml:63` |
| **严重程度** | P2 |
| **缺陷类型** | 可维护性 |

**复现路径**：——（静态）。
**期望 vs 实际**：固定 4 张预设图用 `index` 作 `wx:key` 属反模式（列表稳定时无害，但不符合最佳实践）。建议用图片路径作 key。

---

### P2-13 删除默认冰箱后 `users.defaultFridgeId` 悬空未清理

| 字段 | 内容 |
|------|------|
| **所属页面/模块** | `cloudfunctions/deleteFridge/index.js:7-33` |
| **严重程度** | P2 |
| **缺陷类型** | 数据一致性 |

**复现路径**：owner 删除其默认冰箱。
**期望 vs 实际**：`deleteFridge` 级联删 `items`/`user_fridge`/`fridges`/文件，但未重置 `users.defaultFridgeId`。该字段悬空指向已删冰箱；UI 因 `getFridgeList` 中 `fridges.find` 失败会回退到 `fridges[0]`，表现正确，但 DB 字段长期不一致。建议在删除后把 `defaultFridgeId` 置空或指向同用户剩余首个冰箱。

---

## 三、待确认项

| # | 疑点 | 位置 | 验证方法 |
|---|------|------|---------|
| 1 | 临期订阅模板 ID `6x2llq5Twlj-EkeFnpDi2M6rmBNc5-a-wke0wl6bk8E` 是否在 MP 后台订阅消息模板库登记，且字段 `thing1/date3/thing4` 与模板一致 | `item-edit.ts:9` / `checkExpiry/index.js:64` | 需 MP 后台确认；未登记则订阅与定时提醒均不生效 |
| 2 | `wx.downloadFile` 云存储域名白名单（保存二维码到相册） | `share-qrcode.ts:35` | 真机 + MP 后台确认 |
| 3 | 应用内无 `wx.scanCode` 入口，`scan-result` 仅经外部微信扫码（scene）进入；「应用内扫一扫加入」是否预期 | 全局无 `wx.scanCode` | 需产品确认（当前为外部扫码设计） |
| 4 | 自定义/玻璃实例组件 `t-pull-down-refresh`/`my-swipe-cell`/`t-upload` 在真机 glass-easel 表现 | `swipe-cell.ts`/`upload.ts` | 需真机回归（代码注释称已规避 wxs 问题） |
| 5 | `checkExpiry` 用服务端 `new Date()` 算阈值，与客户端 `notifyDays` 阈值口径跨时区一致性 | `checkExpiry/index.js:14-31` | 需后端确认（客户端已用本地零点规避） |

---

## 四、可单测函数建议

| 函数 | 位置 | 建议用例 |
|------|------|---------|
| `getIconEmoji` / `findIcon` | `utils/icons.ts:140-153` | 已知 key / 未知 key（返回 📦）/ 空字符串 / undefined |
| 日期工具 `toDateStr`/`dateToNum`/`isExpired`/`isWarning`/`diffDays` | 各云函数内联（建议抽公共模块） | 跨年、闰年 2/29、今天到期、恰好 +3 天、时区边界 |
| `call()` 的 result 解析 | `utils/cloud.ts:14-27` | `result` 为 undefined/null/`{code:0,data:undefined}`/`{code:-1,msg}` |
| `resolveCloudImages` | `utils/cloud.ts:97-106` | 全 cloud:// / 全 https / 混合 / 空数组 / 单个失败 |
| swipe-cell 位移计算 | `components/swipe-cell/swipe-cell.ts:105-135` | `< -0.5*rw` 收起、`> -0.5*rw` 展开、首滑未测量回退 |

---

## 五、未覆盖项与风险提示

- **运行时未执行**：本轮为静态代码走查，未接入微信开发者工具/真机，所有「真机表现」「网络/超时」「iOS 日期解析」需运行时回归（代码已针对 iOS 用 `new Date(y,m-1,d)` 规避，符合规范）。
- **云函数定时触发**：`checkExpiry` 需配置定时器 + 订阅模板才实际发送，未验证调度与送达。
- **大数据量**：`getFridgeDetail`/`getExpiringItems` 用 `items.get()` 默认上限 100 条，物品 >100 时 `getFridgeList` 已用 `count()` 校正总数，但详情/临期列表本身有截断风险，需在多物品冰箱下验证。
- **分包/首屏体积**：当前无分包（`app.json` 无 `subPackages`），主包体积需在 DevTools 构建后校验。
- **分享转发**：未实现 `onShareAppMessage`（仅二维码分享），如需会话内转发分享需补充。
- **支付**：无支付流程，N/A。
- **本轮基于代码推断的约定**：组件白名单、主题系统、`{code:0,data}` 契约均与 `CLAUDE.md`/`PRD` 一致，未发现违规使用 `t-card`/`t-list`/`t-select` 或直连数据库。

> 结论：未发现 P0 阻断性缺陷（无白屏/崩溃/数据丢失/鉴权缺失）。鉴权链（`checkFridgePermission` + 物品归属校验 + `manageMember` owner 守卫/事务）完整可靠；前后端数据契约一致。建议优先修复 **P1-01 / P1-02**（冰箱页异常反馈与只读权限 UI 一致性），其余为体验与可维护性改进项。
