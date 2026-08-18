# 修复 PR 说明 · 回归缺陷修复（P1×2 + P2×7）

**分支/提交**：`14f2a6f`（本地，未 push）
**日期**：2026-08-18
**来源**：全量回归测试报告 `regression-defect-report-2026-08-18.md`
**范围**：修复报告中的 P1-01、P1-02 与 7 个 P2 项；未改动任何其他业务行为。

---

## 一、改动总览

| 类型 | 文件 | 改动 |
|------|------|------|
| 前端·页面 | `pages/fridge/fridge.ts` | `role` 存入 data；`loadFridgeData` catch 置 `loadError`+toast |
| 前端·页面 | `pages/fridge/fridge.wxml` | 删除/添加按钮三处加 `wx:if="{{role !== 'readonly'}}"`；新增 `wx:elif="{{loadError}}"` 错误空态 + 重新加载 |
| 前端·页面 | `pages/item-edit/item-edit.ts` | `onLoad` 算 `minDate`/`maxDate`（今天~+5年）；`onSave` 订阅授权去重（`expirySubscribeAsked`） |
| 前端·页面 | `pages/item-edit/item-edit.wxml` | 保质期 `picker` 的 `start`/`end` 改绑动态 `minDate`/`maxDate` |
| 前端·页面 | `pages/mine/mine.ts` | `onChooseAvatar` + `onNicknameInput` 替换已废弃 `getUserProfile`，分别同步云端 |
| 前端·页面 | `pages/mine/mine.wxml` / `mine.wxss` | 头像用 `button open-type="chooseAvatar"`；昵称用 `input type="nickname"` |
| 前端·页面 | `pages/fridge-settings/fridge-settings.ts` | 删除成功后同步清空 `globalData.userInfo.defaultFridgeId` |
| 前端·工具 | `utils/cloud.ts` | `call()` 加 15s 超时（`Promise + setTimeout`，`opts.timeout` 可覆盖） |
| 云函数 | `addItem` / `updateItem` / `deleteItem` / `deleteFridge` | `try/catch` 包裹 `checkFridgePermission`，权限不足返回 `{code, msg}` |
| 云函数 | `deleteFridge` | 删除前清理 `users.defaultFridgeId`（按 openid 定位） |
| 云函数 | `getItemsByLayer` / `getDefaultFridge` | **已删除**（前端 0 调用，死代码） |
| 文档 | `CLAUDE.md` | 清理两张表格中对已删云函数的引用 |

---

## 二、逐项修复说明

### P1-01 冰箱详情加载失败无反馈
- `loadFridgeData` 的 `catch` 由「仅 `console.error`」改为置 `loadError:true` 并 `wx.showToast({title:'加载失败，请重试'})`。
- WXML 在 `wx:else` 内容之上增加 `wx:elif="{{loadError}}"` 分支，展示错误提示与「重新加载」按钮，弱网/权限失效不再显示「客厅冰箱」空壳。

### P1-02 只读成员可见无效删除按钮
- 根因：`getFridgeDetail` 已返回 `role`，但 `loadFridgeData` 的 `setData` 未把它存入 `this.data`，WXML 无法做权限分支。
- 修复：`fridge.ts` 存入 `role`；`fridge.wxml` 删除按钮（双开门/单开门/恒温层共 3 处）与添加物品按钮（3 处）统一加 `wx:if="{{role !== 'readonly'}}"`，收口「只读不可写」。

### P2-01 `call()` 未设超时
- `utils/cloud.ts` 用 `Promise + setTimeout` 包装，默认 15s；`opts.timeout` 可覆盖；超时在非 `silent` 时提示「请求超时，请重试」，`settled` 标志防重复 settle。

### P2-03 保质期 picker 写死范围
- `item-edit.ts` `onLoad` 计算 `minDate = 今天`、`maxDate = (今年+5)-12-31`；`item-edit.wxml` 的 `picker` `start`/`end` 改绑这两个动态值。

### P2-04 `getUserProfile` 已废弃
- `mine` 页改为微信现行方案：`button open-type="chooseAvatar"` 取头像（`onChooseAvatar`）、`input type="nickname"` 取昵称（`onNicknameInput`），分别调 `login` 同步云端。旧 API 新版本拿不到真实头像昵称，此改为必要适配。

### P2-06 写入类云函数未捕获权限抛错
- `addItem`/`updateItem`/`deleteItem`/`deleteFridge` 用 `try/catch` 包裹 `checkFridgePermission`，权限不足时 `return {code: err.code||-1, msg: err.msg||'无权限操作'}`，前端拿到明确提示而非裸「操作失败」。

### P2-07 死代码云函数
- 删除 `cloudfunctions/getItemsByLayer`、`getDefaultFridge`（前端 grep 0 调用，能力已被 `getFridgeList` 的 `defaultFridgeId` 覆盖）；清理 `CLAUDE.md` 表格引用。

### P2-08 每次保存都弹订阅授权
- `item-edit.ts` `onSave` 申请订阅前检查 `wx.getStorageSync('expirySubscribeAsked')`，已弹过则跳过，同设备仅主动询问一次。

### P2-13 删除默认冰箱后 defaultFridgeId 悬空
- `deleteFridge` 删除前用 `checkFridgePermission` 返回的 `openid` 定位 `users`，若 `defaultFridgeId===fridgeId` 则置空；`fridge-settings.ts` 删除成功后同步清空 `globalData.userInfo.defaultFridgeId`。

---

## 三、部署与验证注意

- ⚠️ **云函数需手动上传部署**：`addItem`/`updateItem`/`deleteItem`/`deleteFridge` 改了代码，编译前端不生效，必须在微信开发者工具右键「上传并部署」。
- ⚠️ **基础库兼容**：`mine` 头像昵称依赖 `chooseAvatar`/`type="nickname"`，过旧基础库上回退灰色头像 +「微信用户」属预期降级。
- ✅ **静态校验**：4 个改动云函数均通过 `node --check`；TS 改动沿用既有写法（本地未装 `tsc`，由开发者工具编译）。
- 🔍 **建议真机回归**：`mine` 头像昵称采集、只读成员权限 UI、弱网下冰箱页错误态——静态走查无法覆盖运行时表现。

---

## 四、未包含（待后续）
~~P2-02（删除失败 catch 补 toast）、P2-05（二维码 scene 余量）、P2-09（downloadFile 域名白名单）、P2-10（设置页错误态）、P2-11（临期0天文案）、P2-12（wx:key 反模式）本轮未修复，详见回归报告「六、6.2」。~~

> 上述 6 项已在 **第二轮修复（commit `da1b14c`）** 全部闭环，详见下文第五节。

---

## 五、第二轮补充修复（commit `da1b14c`，2026-08-18 晚）

| 报告 ID | 缺陷 | 修复位置 | 部署注意 |
|---------|------|----------|----------|
| P2-02 | 删除失败无声 | `fridge.ts` `onDeleteConfirm` `.catch` 补 `wx.showToast({title:'删除失败，请重试'})` | 前端编译即生效 |
| P2-05 | 二维码 scene 余量 | `generateQRCode` 去掉 `\|` 分隔符（定长 fridgeId24+role2+dayTs≈30 字符），加 `>32` 护栏；`scan-result` 解码端兼容旧 `\|` 格式 | **云函数需重新上传部署**；旧 `\|` 格式二维码 7 天内仍可被识别 |
| P2-09 | 保存二维码错误提示 | `share-qrcode.ts` `onSaveQR` catch 细分：相册授权→引导设置页；下载/域名失败→「检查网络或域名白名单」 | 前端编译即生效 |
| P2-10 | 设置页错误态 | `fridge-settings.ts` catch 置 `loadError`+toast；`fridge-settings.wxml` 增 `wx:elif="{{loadError}}"` 错误 banner + 重新加载 | 前端编译即生效 |
| P2-11 | 临期0天→今天到期 | `fridge.ts` `getExpireText` 与 `getExpiringItems` 云函数 `diffDays===0` 改「今天到期」 | **`getExpiringItems` 需重新上传部署** |
| P2-12 | wx:key 反模式 | `fridge-create.wxml` 预设图标 `wx:key="index"` → `wx:key="*this"` | 前端编译即生效 |

**验证**：2 个云函数 `node --check` 通过；`scan-result` 解码逻辑走查（新/旧格式分支覆盖）。
