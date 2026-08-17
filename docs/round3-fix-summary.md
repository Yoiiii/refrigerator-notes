# Round3 缺陷修复概览（基于 defect-report-2026-08-17-round3.md）

**提交**：`34d8cc5`（本地，按用户约定未推送）  
**范围**：P0-01、P1-01、P1-02、P1-03、P2-02~P2-08、P2-09~P2-12、P2-14~P2-17、P2-19  
**跳过/未做**：P2-01（用户已手动改好空页面）、P2-13（昵称/头像需 UI 设计，未实现）、P2-18（`_shared/auth.js` 为孤儿但内容与各函数 `shared/auth.js` 完全一致，无分叉风险，未动）

## 前端修复
| 编号 | 文件 | 修复 |
| --- | --- | --- |
| P0-01 | member-manage.ts/.wxml | 改角色/转让改用 `wx.showActionSheet`（与 mine/index 一致），移除会崩溃的 `ActionSheet({...})` 调用与未用的 `<t-action-sheet>` |
| P1-01 | index.ts | 移除 `demo_001` 假数据分支，失败改走空态 + toast，不再污染全局 |
| P2-02 | fridge.ts | 恒温层物品补 `expireText`（抽 `getExpireText` 与分区层共用） |
| P2-04 | fridge-settings.ts | 加 `onShow` 重新加载，编辑/转让返回后名称与 owner 状态同步 |
| P2-05 | member-manage.wxml/.wxss, mine.wxss | `member-name` 改为内层 `<text>` 承载 ellipsis；`.user-meta/.f-info` 加 `min-width:0` |
| P2-06 | upload.ts | 选图失败给出明确 toast（不再静默 return → “无响应”观感）；预览前 `resolveCloudImages` 转 https（避免 cloud:// 黑屏）；删除清理云存储；上传 loading |
| P2-07 | swipe-cell.ts | 测量结果改存实例属性 `_rightWidth`，不再直接写 `this.data.rightWidth` |
| P2-08 | mine.ts | 通知设置缓存到 `globalData.userInfo` 并回显，避免重进「我的」被默认值覆盖 |
| P2-09 | member-manage.ts | 变更操作改 `call(...,{silent:true})`，由页面统一 toast，去双重提示 |
| P2-10 | member-manage.ts/.wxml | 加载失败与空态区分 + 重试按钮 + `onShow` 刷新 |
| P2-14 | app.ts, mine.ts | `app.loginReady` 暴露 Promise，mine `onShow` 等待登录就绪 |
| P2-15 | mine.ts/.wxml | 关于弹窗内容改用真实换行字符串（WXML 静态属性不解析 `\n`） |
| P2-19 | index.ts | 删除调试 `console.log` |

## 云函数修复
| 编号 | 文件 | 修复 |
| --- | --- | --- |
| P1-02 | manageMember | 转让改用 `db.startTransaction`，**先升 target 为 owner 再降自己**，任一失败整体回滚，杜绝“零 owner 孤儿冰箱” |
| P1-03 | checkExpiry | 仅对发送成功的分组标记 `notified`；失败项 `retryCount+1` 保留重试（templateId 仍为占位，待运营提供真实模板） |
| P2-03 | getFridgeList | 横幅阈值由硬编码 `3` 改为用户 `notifyDays`，与临期列表一致 |
| P2-11 | manageMember | `changeRole`/`remove` 校验 `stats.updated/removed>0`，命中 0 条返回明确错误；错误码去重（-4 参数 / -5 未找到 / -6 转让失败） |
| P2-12 | getFridgeList/checkExpiry/updateUserNotify/updateUserTheme/login | 统一加外层 `try/catch` 返回 `{code,msg}` 契约 |
| P2-16 | getFridgeList/manageMember | 物品总数用 `.count()`（避开 `.get()` 100 条上限）；成员查询 `.limit(1000)` |
| P2-17 | updateItem | 修改 `expireDate` 时重置 `notified:false`，新临期点重新提醒 |

## 待你跟进
1. **云函数需手动上传部署**（开发者工具右键各函数 → 上传并部署）。
2. **P2-06 真机“点击无反应”**：代码已确保选图 API 正确调用并给出失败反馈。若仍不弹选图，最常见根因是**微信相册/相机权限被拒**（设置 → 微信 → 相册/相机 改为“允许”）。请在真机确认权限后复测。
3. **P1-03**：提供真实订阅消息 `templateId` 与字段映射后，提醒才会真正送达。
4. **P2-13（昵称/头像）**：当前成员显示“微信用户”是因为 `login` 仅存 `event.nickname` 且无 `chooseAvatar` 入口，需补充头像/昵称编辑 UI，本轮未实现。
