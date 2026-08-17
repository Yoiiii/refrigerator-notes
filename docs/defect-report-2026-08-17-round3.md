# 冰箱笔记小程序 · 全量回归测试缺陷报告（第三轮）

**被测项目**：冰箱笔记（miniprogram-2）微信小程序  
**测试轮次**：全量回归（第二轮报告 `defect-report-2026-08-17-round2.md` 的 20 项修复 + 后续 TDZ 修复(`01cf5d2`) + 左滑复原(`d92a29d`) + 多开互斥/空页面精简(`b951414`) 均已合入；本轮验证修复 + 挖掘新缺陷）  
**测试日期**：2026-08-17  
**测试依据**：CLAUDE.md + `miniapp-test-kit` 测试清单（A 配置 / B 逐页 / C 逻辑 / D 接口 / E 小程序特有）  
**测试方式**：静态代码走查（本人精读核心文件 + 3 个并行只读探索代理分页面组走查），未执行真机/运行时验证；`git` 仅本地提交未推送（按用户约定）

---

## 一、覆盖概览

| 项目           | 内容                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 走查页面         | 10 个：index / fridge / fridge-create / fridge-settings / item-edit / item-detail / member-manage / share-qrcode / scan-result / mine |
| 走查模块         | utils/cloud.ts、theme.ts、icons.ts、components/upload、components/swipe-cell                                                            |
| 核对云函数        | 20 个 + `_shared`                                                                                                                    |
| **历史缺陷修复验证** | 第二轮 20 项：**19/20 PASS，1 项 FAIL（空页面精简未落盘/回归）**；后续 TDZ / 多开互斥 / scene 缩短 均 PASS                                                       |
| **本轮新缺陷**    | **P0: 1 / P1: 3 / P2: 20+**（见下，已去重合并）                                                                                               |
| 待确认项         | 5 个                                                                                                                                 |

---

## 二、历史缺陷修复验证结果（第二轮 20 项 + 后续修正）

> 结论来自本人 grep 校验 + 三代理交叉核对。

| 原编号       | 缺陷                         | 验证结论                   | 证据                                                                                                                                                                                       |    |                                                 |
| --------- | -------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -- | ----------------------------------------------- |
| P0-01     | 云函数日期时区错位                  | ✅ PASS                 | 全云函数 grep `new Date(item.expireDate)` / `new Date(i.expireDate)` **0 命中**；`getFridgeDetail/List/getItemsByLayer/getExpiringItems/getItemDetail` 均内联 `isExpired/isWarning/diffDays` 字符串比较 |    |                                                 |
| P1-01     | 编辑保存位置错位                   | ✅ PASS                 | `item-edit.ts:114` `zones.findIndex(z=>z.zoneId===item.zoneId)`；`onLoad` 先 `await loadFridgeStructure()` 再 `loadItem()`                                                                  |    |                                                 |
| P1-02     | mine 注入 demo_001           | ✅ PASS（首页漏修，见本轮 P1-01） | `mine.ts` 已无 demo_001；但 `index.ts:93-107` **仍有**                                                                                                                                         |    |                                                 |
| P2-01     | 首页切换过滤临期列表                 | ✅ PASS                 | `index.ts:74-89` 存全量 `_allExpiring`，`:135-145` 按 `fridgeId` 过滤                                                                                                                           |    |                                                 |
| P2-02     | 创建页深拷贝                     | ✅ PASS                 | `fridge-create.ts:112,136,148,162` 均 `JSON.parse(JSON.stringify(...))` 后 setData                                                                                                         |    |                                                 |
| P2-03     | fridge.ts 本地零点             | ✅ PASS                 | `fridge.ts:64-69` 用 `new Date(y,m-1,d)`                                                                                                                                                  |    |                                                 |
| P2-04     | 设置页 delta:2 保护             | ✅ PASS                 | `fridge-settings.ts:56-63` `getCurrentPages().length>2` 才 `navigateBack`，否则 `reLaunch`                                                                                                   |    |                                                 |
| P2-05     | 设置页 isOwner 门禁             | ✅ PASS                 | `fridge-settings.wxml:29,44` `wx:if="{{isOwner}}"`                                                                                                                                       |    |                                                 |
| P2-06     | deleteFridge 返回 data       | ✅ PASS                 | `deleteFridge/index.js:33` `{code:0,data:{fridgeId}}`                                                                                                                                    |    |                                                 |
| P2-07     | swipe-cell 首滑/展开           | ✅ PASS                 | `swipe-cell.ts:60-63` rightWidth===0 先 measure 再 return；`:108-115` 展开态右滑可收起                                                                                                              |    |                                                 |
| P2-08     | scan-result 重试             | ✅ PASS                 | `scan-result.ts:63-66` 失败置 `showJoinBtn:true`；wxml 渲染重试按钮                                                                                                                                |    |                                                 |
| P2-09     | item-edit 单位硬编码            | ✅ PASS                 | `item-edit.ts:179` `unit:this.data.unit`；`loadItem` 读 `item.unit`；`unit:'件'` 仅出现在 `:13` data 初始默认值（合理，非缺陷）                                                                               |    |                                                 |
| P2-10     | updateItem/deleteItem 归属校验 | ✅ PASS                 | 写前 `doc(itemId).get()` 校验 `item.fridgeId===fridgeId`                                                                                                                                     |    |                                                 |
| P2-11     | manageMember list 放行       | ✅ PASS                 | `manageMember/index.js` list 放行任意成员，仅变更操作校验 owner                                                                                                                                        |    |                                                 |
| P2-12     | manageMember try/catch 契约  | ✅ PASS                 | `manageMember/index.js` main 用 try/catch 返回 `{code,msg}`                                                                                                                                 |    |                                                 |
| P2-13     | member-manage 失败 toast     | ✅ PASS                 | `member-manage.ts:60/85/110` 失败弹 toast                                                                                                                                                   |    |                                                 |
| P2-14     | mine 乐观回滚                  | ✅ PASS                 | `mine.ts:124/132/142/147` 缓存 prev 并回滚                                                                                                                                                    |    |                                                 |
| P2-15     | upload 并发锁                 | ✅ PASS                 | `upload.ts` `_uploading` 锁 + try/finally                                                                                                                                                 |    |                                                 |
| P2-16     | 空态                         | ✅ PASS                 | `mine.wxml` / `member-manage.wxml` 均有空态                                                                                                                                                  |    |                                                 |
| P2-17     | 样式溢出/安全区                   | ⚠️ 部分                  | `.user-name/.f-name` 已 ellipsis；**`.member-name` 因 flex 容器 ellipsis 不生效（见本轮 P2-09）**；`.page-container` 已叠加 `env(safe-area-inset-bottom)`                                                 |    |                                                 |
| 待确认1      | generateQRCode scene 超长    | ✅ PASS                 | `generateQRCode/index.js:22` \`scene=fridgeId                                                                                                                                            | rw | dayTs`（base36 天级），≤31 字符；`scan-result.ts\` 同步解码 |
| TDZ 修复    | getExpiringItems 变量遮蔽      | ✅ PASS                 | `index.js:99,105` 用局部 `diffDaysValue`，无同名遮蔽；`node --check` 通过                                                                                                                            |    |                                                 |
| 多开互斥      | swipe-cell 互斥              | ✅ PASS                 | `swipe-cell.ts:10` 模块级 `_activeCell` + `:122-127` 互斥 + `closeSelf`                                                                                                                       |    |                                                 |
| **空页面精简** | index 无冰箱只显示图片             | ❌ **FAIL（回归）**         | `index.wxml:30-31` **仍含** `<t-empty description="还没有冰箱" />` + `<view class="empty-desc">…</view>`，与用户"只显示图片"要求不符，疑似上轮修改未落盘                                                               |    |                                                 |

> 结论：第二轮修复整体扎实，仅"空页面精简"一项未真正生效（用户明确要求过，需重做）。`mine` 的 demo_001 已修，但 `index` 的同类注入**漏改**。

---

## 三、本轮新发现缺陷

### P0-01 member-manage「改角色 / 转让所有权」100% 崩溃（核心功能阻断）

| 字段          | 内容                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------- |
| **所属页面/模块** | `miniprogram/pages/member-manage/member-manage.ts:4, 43-48, 95-100`；`member-manage.wxml:13` |
| **严重程度**    | P0                                                                                          |
| **缺陷类型**    | 运行时崩溃（非概率性，全量触发）                                                                            |

**根因**：直接调用 `ActionSheet({...})`。TDesign 1.15.3 中 `ActionSheet` 默认导出是对象 `{ show, close }`（`miniprogram_npm/tdesign-miniprogram/action-sheet/index.js:1`、`index.d.ts:4-7`），不可直接当函数调用 → `TypeError: ActionSheet is not a function`，`.then()` 整条链不执行。叠加 3 处错误：① 参数名应为 `items`（非 `itemList`）；② 未传 `context: this`（实例定位失败）；③ `show()` 返回实例而非 Promise，`e.detail.selected` 才是结果回传。

**复现路径**：成员管理页（owner）→ 点「改角色」或「转让所有权」→ 无弹层、控制台报错、无任何后续。

**期望 vs 实际**：期望弹出动作面板并选择角色/新所有者；实际完全无响应。

**修复建议**：

```ts
import { ActionSheet } from 'tdesign-miniprogram'
// 改角色：
ActionSheet.show({ context: this, selector: '#t-action-sheet', items: ['可读写','只读'] })
// wxml: <t-action-sheet id="t-action-sheet" bind:selected="onRoleSelected" />
// onRoleSelected(e) { const role = ['readwrite','readonly'][e.detail.index]; ...call('manageMember', {...}) }
```

或直接复用 `mine.ts:138` / `index.ts:130` 已验证可用的 `wx.showActionSheet`。

---

### P1-01 index 首页冷启动失败仍注入 demo_001 假数据（漏修的历史遗漏）

| 字段          | 内容                                        |
| ----------- | ----------------------------------------- |
| **所属页面/模块** | `miniprogram/pages/index/index.ts:93-107` |
| **严重程度**    | P1                                        |
| **缺陷类型**    | 体验/数据误导（与 round2 P1-02 同类，但修复时漏改了首页）      |

**根因**：`loadData`（或首屏请求）的 catch 分支塞入 `{fridgeId:'demo_001',name:'客厅冰箱',doorType:'double',totalItems:12}` 及 3 条虚构物品，并置 `hasFridge:true`、写 `app.globalData.fridgesReady=true`。

**复现路径**：断网 / 云函数未部署 → 首页显示"客厅冰箱 / 12 件 / 五花肉·已过期"等虚构数据 → 点进去 `onGoFridge` 带 `fridgeId=demo_001` → 打开不存在的冰箱二次报错。

**期望 vs 实际**：期望与 `mine.ts` 一致做空态 + 重试；实际造假并污染全局 `globalData.fridges`。

**修复建议**：删除 mock 分支，失败置 `hasFridge:false` + 错误态 + 重试按钮（与 mine 对齐）。

---

### P1-02 manageMember 转让所有权非原子，可能产生「无 owner 的孤儿冰箱」

| 字段          | 内容                                           |
| ----------- | -------------------------------------------- |
| **所属页面/模块** | `cloudfunctions/manageMember/index.js:55-64` |
| **严重程度**    | P1                                           |
| **缺陷类型**    | 数据一致性破坏，不可自愈                                 |

**根因**：`transfer` 先把自己降为 `readwrite`（`:59-60`），再把 target 升为 `owner`（`:61-62`）。若第二条 update 失败/超时，或 `targetUserId` 非本冰箱成员（伪造入参，命中 0 条）→ 该冰箱**再无 owner**，`checkFridgePermission(fridgeId,['owner'])` 永久失败 → 改名/删冰箱/转让全部锁死。

**修复建议**：先 `get` 校验 target 存在且非 owner；用 `db.runTransaction` 包裹两次 update；顺序改为「先升 target，再降自己」，最坏情况是双 owner（可管理）而非零 owner（锁死）。

---

### P1-03 checkExpiry：订阅消息发送失败仍标记 notified，提醒永久丢失 + templateId 占位符

| 字段          | 内容                                                                                 |
| ----------- | ---------------------------------------------------------------------------------- |
| **所属页面/模块** | `cloudfunctions/checkExpiry/index.js:65-87`（`:68` `templateId:'YOUR_TEMPLATE_ID'`） |
| **严重程度**    | P1                                                                                 |
| **缺陷类型**    | 提醒功能失效                                                                             |

**根因**：`send()` 抛错被 `:65-78` 的 try/catch 吞掉（仅 `console.error`），流程继续，`:82-85` 无条件 `update({notified:true})`。因 `templateId` 是占位符，当前每条物品首次定时任务后即被标记"已通知却从未送达"，且此后 `notified:false` 查询永不再命中。

**修复建议**：按 fridge 分组记录成功/失败，仅对成功分组标记 `notified:true`；失败保留 `notified:false` 并加 `retryCount`；填入真实 `templateId`。

---

### P2 级缺陷（按模块归类，均带文件:行号）

#### P2-01 首页无冰箱空状态回归（用户明确要求"只显示图片"未生效）

- `index.wxml:30-31` 仍渲染 `<t-empty description="还没有冰箱" />` 图标 + `<view class="empty-desc">创建冰箱…</view>` 描述。与"只显示图片"要求不符，疑似 `b951414` 该部分修改未落盘。
- 修复：删除 `<t-empty>` 与 `empty-desc`，仅保留 `<image class="empty-image" src="{{emptyFridgeImage}}">` + 创建按钮。

#### P2-02 恒温层物品缺失「临期天数/已过期」文案

- `fridge/fridge.ts:99-117`（恒温层映射未算 `expireText`）+ `fridge.wxml:217`（仅渲染 `item.expireDate`）。分区层已在 `:70-79` 正确设置。
- 修复：恒温层复用同 `diffDays/expireText` 逻辑。

#### P2-03 首页横幅计数与临期列表阈值不一致（破坏 P2-01 一致性精神）

- `getFridgeList/index.js:51-52` 阈值**硬编码 3** vs `getExpiringItems/index.js:42` 用用户 `notifyDays`（默认 3）。`notifyDays≠3` 时横幅"X 件需要处理"与下方列表项数不符。
- 修复：两端统一阈值（getFridgeList 也读 notifyDays，或固定一致）。

#### P2-04 冰箱设置页编辑保存后自身名称未刷新

- `fridge-settings.ts` 无 `onShow` 重载，保存/编辑返回后 `fridgeName` 仍为旧值。
- 修复：增加 `onShow` 调 `loadFridge()`，或返回时主动刷新。

#### P2-05 member-name ellipsis 不生效（flex 容器内 text-overflow 失效）

- `member-manage.wxss:5` `.member-name` 同时 `display:flex` + `text-overflow:ellipsis`，省略号不会渲染，长昵称把同行「所有者」标签挤掉。连带 `mine.wxss:20-22 .user-meta` / `:112-114 .f-info` 缺 `min-width:0`，超长昵称/冰箱名挤压头像与箭头。
- 修复：`.member-name` 改为外层 flex + 内层 `<text>` 承载 ellipsis；`.user-meta/.f-info/.member-info` 统一加 `min-width:0`。

#### P2-06 upload 组件若干问题

- **取消选图连弹**：`upload.ts:22-41` chooseMedia 取消 → catch → 立即再弹 chooseImage，需取消两次（应判断 `errMsg` 含 `cancel` 直接 return，或 `wx.canIUse('chooseMedia')` 能力判定）。
- **预览 cloud:// 黑屏**：`:68-73` `wx.previewImage` 不支持云协议，应先用 `resolveCloudImages()` 转 https；`.filter(Boolean)` 致 current 索引错位。
- **无上传中反馈**：`:43-52` 串行上传无 loading；**删除不清理云存储**：`:61-66` onRemove 仅改数组，云文件成孤儿。
- **类型问题**：`:15,18,57` `this._uploading` 未声明，`tsconfig` strict 下报属性不存在。

#### P2-07 swipe-cell 直接改 this.data + 首次滑动吞事件

- `swipe-cell.ts:30-39` `this.data.rightWidth = rect.width` 未走 setData（反模式）；`:60-63` 未测量完成时 `return` 吞掉一帧，低端机首次左滑偶发无位移。
- 修复：测量结果存实例属性 `this._rightWidth`，或 `setData`；`ready` + slot observer 双保险预测量。

#### P2-08 mine 重新进入通知设置回落默认值；加载失败不自动重试

- `mine.ts:16-17` 默认 `notifyDays=3/enabled=true`；`loadUserInfo` 仅 `:72-77` 赋值，重新进「我的」时（页面实例重建）`fridgeListVersion===mineSeenVersion` 走分支只恢复 fridges，不恢复 notify 字段 → UI 显示默认值与库不符（P2）。
- `mine.ts:32-34` 先消费 `mineSeenVersion` 再 `loadData`，失败后再 onShow 判定"已见最新版本"不再请求（P2）。
- 修复：notify 字段一并缓存到 `globalData.userInfo` 并回填；`loadData` 成功后再置 `mineSeenVersion`。

#### P2-09 member-manage 全链路重复 toast（违反 call() 契约）

- `utils/cloud.ts:19-27` 已弹 toast；`member-manage.ts` 多处又弹一次 → 双提示叠加，且后者掩盖后端精确原因。应与 `mine.ts` 一致用 `call(...,{silent:true})` 后由页面统一提示。

#### P2-10 member-manage 加载失败与真空态共用视图、无重试、无 onShow

- `member-manage.ts` 仅 `onLoad`；`loadMembers` 失败显示"暂无成员"（误导，至少含当前用户）；转让成功后上一页 `fridge-settings` 的 `isOwner` 不刷新（仍可见"删除/编辑"入口，由云函数拒绝）。拆分 `loadFailed` 状态 + 重试按钮 + 增加 `onShow`/回写上一页。

#### P2-11 manageMember changeRole/remove 未校验受影响条数；错误码冲突

- `manageMember/index.js:41-52` 传非成员 target / 对 owner 改角色 → 命中 0 条仍返回成功；`:11` 与 `:39` 都用 `-3` 语义冲突。修复：校验 `stats.updated/removed>0` 否则返回明确错误码。

#### P2-12 多个云函数缺外层 try/catch（破坏 {code,msg} 契约）

- `updateUserNotify/index.js:22-27`、`updateUserTheme/index.js`、`login/index.js`、`checkExpiry/index.js`、`getFridgeList/index.js` 的 main 无 try/catch → DB 异常穿透 → 客户端进 `cloud.ts` fail 分支弹通用"网络错误"。应与 `manageMember` 一致统一兜底。附带 `updateUserNotify` 当两字段均缺时仍写 `updatedAt` 并返回"已保存"，缺参数校验。

#### P2-13 昵称/头像永不落地，成员列表全是"微信用户"

- `login/index.js:17` 存 `event.nickname` vs `:32-33` 返回硬编码 `'微信用户'/'`；全仓无 `getUserProfile/chooseAvatar`；`member-manage.wxml:27` 丢弃云函数返回的 `avatarUrl`。多人共享冰箱时无法辨识成员，配合 P1-02 转让风险叠加（可能转错人）。
- 修复：接入 `<button open-type="chooseAvatar">` + nickname 输入落库；成员列表补 `avatarUrl` 与 openid 尾号。

#### P2-14 冷启动竞态：mine 首屏 userInfo 可能为默认值

- `app.ts:26,29-49` doLogin 异步且无 Promise 暴露；`mine.onLoad/onShow` 早于 login 返回时 `globalData.userInfo` 为 null → `loadUserInfo()` return，无补偿回调。修复：`app.ts` 存 `this.loginReady=this.doLogin()`，页面 `await app.loginReady`。

#### P2-15 关于弹窗 `\n` 字面显示

- `mine.wxml:5` 静态属性不做 C 转义，`\n` 可见且挤成一行。修复：ts 提供含真实换行的字符串或 `&#10;`。

#### P2-16 列表未分页，成员/物品超 100 条失真

- `manageMember/index.js:13-16`、`:49`、`.get()` 默认 100 条上限 → 成员超 100 不显示；物品超 100 时计数全按 100 截断。修复：成员分页；计数用 `.count()`/聚合。

#### P2-17 updateItem 延长保质期不重置 notified

- `updateItem/index.js:24` 编辑延长 expireDate 后 `notified` 仍 true → 新临期点不再提醒。修复：`expireDate` 变更时 `updateData.notified=false`。

#### P2-18 `_shared/auth.js` 是孤儿，权限逻辑 6 处重复拷贝

- `cloudfunctions/_shared/auth.js` 不被任何函数 `require`（不部署），真正生效的是各函数目录下的 `shared/auth.js` 副本，需同步改 6 处否则权限分叉。修复：删除孤儿或统一共享引用。

#### P2-19 调试 console.log 残留 / 切换冰箱竞态

- `index.ts:171` `console.log('e.currentTarget.dataset',…)` 生产日志噪声，删除。
- `index.ts:74-89` 初始全量写入 `_allExpiring` 与 `:128-154` `onSwitchFridge` 读取存在竞态，首屏云函数未返回即切换会显示空/不准。修复：切换前判 `_allExpiring` 就绪，或 `onSwitchFridge` 内直接 `call('getExpiringItems')` 后按 `fridgeId` 过滤。

---

## 四、待确认项

| # | 疑点                                                                                             | 位置                                         | 验证方法                                       |
| - | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| 1 | **checkExpiry templateId 真实模板**（`YOUR_TEMPLATE_ID` 占位）及字段匹配                                    | `checkExpiry/index.js:68`                  | 产品/运营提供真实订阅消息模板 ID                         |
| 2 | **订阅消息授权闭环缺失**：全仓无 `wx.requestSubscribeMessage` 调用，开关只写库未申请授权，未授权时 `subscribeMessage.send` 必失败 | `mine.wxml` 临期提醒开关；业务代码 grep 确认            | 确认是否走长期订阅（需类目审批）                           |
| 3 | `_shared/auth.js` 不被部署，6 个含 `shared/auth.js` 的函数部署后是否各自独立可运行（缺副本则 require 报模块未找到）              | `cloudfunctions/_shared/` vs 各函数 `shared/` | 分别部署调用 deleteFridge/updateFridge 等观察是否 500 |
| 4 | 页面栈 >10：`index→fridge→item-edit→item-detail` 等深层跳转（尤其扫码深链）可能超 10 层致 navigateTo 失败              | 各 `navigateTo` 链路                          | 真机连续 navigateTo 至第 11 层观察                  |
| 5 | `getDefaultFridge` 是否被前端使用（其 `i.expireDate<todayStr` 字符串比较正确，仅作复核）                             | 全局搜 `call('getDefaultFridge')`             | 确认调用方与前端取 defaultFridgeId 路径               |

---

## 五、未覆盖项与风险提示

- **静态走查，无运行时验证**：所有 P0/P1 以代码逻辑推断为主；swipe-cell 真机滑动、`t-image` 云文件解析、iOS 日期、`scene` 长度等已在 round2 待确认项列出并部分修复，真机仍需复测。
- **云函数未实测**：仅读源码，未部署调用；P0-01（member-manage ActionSheet 崩溃）属**前端运行时**必现，优先级最高。
- **未覆盖**：实时订阅消息全链路、`checkExpiry` 定时触发器时区（`config.json` cron `0 0 1 * * * *` 与云函数 UTC `new Date()` 当日边界）、多成员并发编辑同一物品、连续保存/删除的并发竞态、弱网降级体验。
- **强烈建议修复顺序**：**P0-01（member-manage 崩溃）→ P1-01（index demo_001 漏修）→ P1-02（孤儿冰箱）→ P1-03（提醒丢失）→ P2-01（空页面回归，用户明确要的结果）→ 其余 P2**。
- **统一日期工具**（round2 已建议）：本轮确认各云函数已内联 `isExpired/isWarning` 且一致，无需再抽；但 `_shared` 权限副本漂移（P2-18）与云函数缺 try/catch（P2-12）建议统一治理。

---

## 六、可单测函数建议

| 函数                                                      | 位置               | 建议用例                                                                     |
| ------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `isExpired/isWarning/diffDays(expireDateStr, todayStr)` | 各云函数内联           | `expireDate==today`→非过期；`==today+2`→warning；`==today-1`→expired；跨月/跨年/闰年 |
| `transfer` 原子性（新增）                                      | `manageMember`   | 并发转让、target 非成员、第二次 update 失败 → 不产生零 owner                               |
| `checkExpiry` 标记策略（新增）                                  | `checkExpiry`    | 部分发送成功 → 仅成功分组标记 notified                                                |
| `getIconEmoji/findIcon`                                 | `utils/icons.ts` | 已知 key→emoji；未知→默认 📦                                                    |
| `getThemeColor/Name/PreviewColors`                      | `utils/theme.ts` | 非法 theme→回落 warm                                                         |

