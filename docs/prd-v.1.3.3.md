# 冰箱笔记小程序 产品需求文档（PRD）

> 版本：V1.3.3 ｜ 日期：2026-08-06 ｜ 状态：待评审
> 阅读对象：设计师 / 前端开发 / 后端开发 / AI 代码生成工具
> V1.1 修订：新增用户-冰箱关联表、二维码分享、权限管理
> V1.2 修订：新增主题切换（4种风格）、物品右滑删除/点击详情、冰箱恒温层、物品图标选择、物品详情页
> V1.3 修订：补全页面树、新增第七章「云开发实现方案（完整后端）」
> V1.3.1 修订：全局移除不存在的 `t-select` 组件，按场景替换为 `t-dropdown-menu`+`t-dropdown-item` / `t-action-sheet` / `t-picker` / `t-radio-group`，新增对应 AI 提示词约束
> V1.3.2 修订：全局移除不存在的 `t-card` 和 `t-list` 组件；卡片用原生 `view`+`t-cell` 组合替代，列表用 `t-cell-group`+`t-cell` 替代；新增「TDesign 组件白名单」章节与 AI 硬约束
> V1.3.3 修订：新增第八章「云函数常见错误与避坑指南」，记录 `wx-server-sdk` 依赖缺失导致云端 `Cannot find module 'wx-server-sdk'` 的错误现象、根因、解决方案与强制预防措施；同步更新 AI 提示词约束

---

## 一、产品概述

### 1.1 产品定位

一款帮助用户记录冰箱内物品存放位置与保质期的"冰箱笔记"微信小程序，核心目标是**减少因遗忘导致的食品过期浪费**。支持多人协作管理同一台冰箱，通过二维码分享实现家庭成员间的便捷共享。

### 1.2 目标用户

- 家庭主妇/主夫、独居青年、合租室友等需要管理冰箱食材的人群。
- 痛点：冰箱东西多、记不住保质期、不清楚具体放在哪一层、家人之间信息不同步。

### 1.3 核心使用场景

1. 买菜回家 → 打开小程序 → 选择冰箱某层 → 录入物品与保质期。
2. 日常查看 → 打开首页 → 一眼看到冰箱结构图 → 绿/黄/红三色快速识别临期状态。
3. 收到临期推送 → 点击通知 → 进入对应冰箱层 → 决定尽快食用或处理。
4. 家人采购 → 扫描冰箱分享码加入 → 获得只读/可读写权限 → 协同管理。

### 1.4 设计语言与 UI 规范（强约束）

- **UI 组件库**：**TDesign Weixin（tdesign-miniprogram）**，所有按钮、列表、输入框、弹窗、Toast、选择器必须使用该库组件，**禁止**手写样式替代。
- 安装方式：`npm i tdesign-miniprogram -S --production`，并在微信开发者工具中执行「构建 npm」，`app.json` 中**移除** `"style": "v2"`。
- 全局引入方式：在 `app.json` 的 `usingComponents` 中注册常用组件（t-button、t-cell、t-input、t-dialog、t-toast、t-tab-bar 等），页面级组件在各自 JSON 中引入。
- 色彩体系：沿用 TDesign 设计 Token（`--td-brand-color`、`--td-success-color`、`--td-warning-color`、`--td-error-color`），禁止硬编码色值。
- 圆角、间距、字号严格使用 TDesign 的 CSS 变量（`--td-radius-*`、`--td-spacer-*`、`--td-font-size-*`）。

### 1.5 主题风格系统（可动态切换）

系统内置 **4 套主题风格**，用户可在「我的」页面随时切换，切换后**全局即时生效**，并持久化到用户表。

| 主题 Key | 主题名               | 主色      | 背景色    | 卡片圆角 | 特征描述                                     |
| -------- | -------------------- | --------- | --------- | -------- | -------------------------------------------- |
| `warm`   | 温暖家居（**默认**） | `#FF9F45` | `#FAF8F5` | 24rpx    | 暖橙主色、米白底、柔和阴影，适合家庭场景     |
| `fresh`  | 清新健康             | `#00B96B` | `#F7FAF8` | 16rpx    | 青绿主色、薄荷辅色、大量留白，主打健康感     |
| `modern` | 现代简约             | `#007AFF` | `#F2F2F7` | 20rpx    | 科技蓝、灰阶体系、毛玻璃效果，高级克制       |
| `cute`   | 可爱圆润             | `#FF6B9D` | `#FFF0F5` | 32rpx    | 草莓粉、鹅黄辅色、超大圆角胶囊按钮，活泼可爱 |

**实现机制**：

1. 在 `app.wxss` 中定义 4 套 CSS 变量块，以 `page[data-theme="warm"]` 等属性选择器区分。
2. 在 `app.js` 的 `onLaunch` 中调用云函数 `login` 获取用户信息（含 `theme` 字段），通过 `wx.setStorageSync('theme', value)` 缓存，并调用 `this.refreshTheme()` 全局设置 `page` 的 `data-theme` 属性。
3. 切换主题时：更新云数据库 `users.theme` → 更新本地缓存 → 重新设置 `data-theme` → 全局 WXSS 变量即时生效。
4. 状态色（安全绿/临期黄/过期红）在 4 套主题中**保持一致**，仅主色、背景、圆角、阴影变化，保证功能识别度不受主题影响。
5. 主题字段写入 `users` 集合：`{ "theme": "warm" }`，默认值为 `"warm"`。

**冰箱层状态色（全局统一，不随主题变化）**：

| 状态   | 触发条件                            | 颜色值                              |
| ------ | ----------------------------------- | ----------------------------------- |
| 安全绿 | 所有物品过期日 > 今天+3天           | `#52C41A` / `rgba(82,196,26,0.12)`  |
| 临期黄 | 存在物品过期日 ≤ 今天+3天 且 > 今天 | `#FAAD14` / `rgba(250,173,20,0.15)` |
| 过期红 | 存在物品过期日 < 今天               | `#FF4D4F` / `rgba(255,77,79,0.15)`  |

---

## 二、TDesign 组件白名单（V1.3.2 新增 · 强约束）

> ⚠️ **本章为硬约束**。TDesign 微信小程序版**不包含** `t-card`、`t-list`、`t-select` 等组件。AI 生成代码前**必须**核对组件是否在下方白名单内，**不在白名单的一律不得使用**。

### 2.0 官方组件总览（65 个，分 5 大类）

**基础（7）**：Button、Divider、Fab、Icon、Layout、Link、Typography
**导航（8）**：BackTop、Drawer、Indexes、Navbar、SideBar、Steps、TabBar、Tabs
**输入（17）**：Calendar、Cascader、CheckBox、ColorPicker、DateTimePicker、Form、Input、Picker、Radio、Rate、Search、Slider、Stepper、Switch、Textarea、TreeSelect、Upload
**数据展示（20）**：Avatar、Badge、Cell、Collapse、CountDown、Empty、Footer、Grid、Image、ImageViewer、Progress、QRCode、Result、Segmented、Skeleton、Sticky、Swiper、Table、Tag、Watermark
**反馈（13）**：ActionSheet、Dialog、DropdownMenu、Guide、Loading、Message、NoticeBar、Overlay、Popover、Popup、PullDownRefresh、SwipeCell、Toast

### 2.1 本小程序实际用到的组件清单

| 组件                              | 注册路径（usingComponents）                               | 典型用途                   |
| --------------------------------- | --------------------------------------------------------- | -------------------------- |
| `t-button`                        | `tdesign-miniprogram/button/button`                       | 所有按钮                   |
| `t-cell`                          | `tdesign-miniprogram/cell/cell`                           | 列表行、表单行             |
| `t-cell-group`                    | `tdesign-miniprogram/cell-group/cell-group`               | 列表容器                   |
| `t-input`                         | `tdesign-miniprogram/input/input`                         | 文本输入                   |
| `t-textarea`                      | `tdesign-miniprogram/textarea/textarea`                   | 多行输入                   |
| `t-switch`                        | `tdesign-miniprogram/switch/switch`                       | 开关（恒温层、通知）       |
| `t-radio` / `t-radio-group`       | `tdesign-miniprogram/radio/radio` 等                      | 单选（门型、权限、主题）   |
| `t-checkbox`                      | `tdesign-miniprogram/checkbox/checkbox`                   | 多选                       |
| `t-picker`                        | `tdesign-miniprogram/picker/picker`                       | 底部滚轮选择（单位、位置） |
| `t-datetime-picker`               | `tdesign-miniprogram/datetime-picker/datetime-picker`     | 日期选择（保质期）         |
| `t-cascader`                      | `tdesign-miniprogram/cascader/cascader`                   | 级联选择（分区→层）        |
| `t-stepper`                       | `tdesign-miniprogram/stepper/stepper`                     | 数量增减                   |
| `t-slider`                        | `tdesign-miniprogram/slider/slider`                       | 滑块                       |
| `t-upload`                        | `tdesign-miniprogram/upload/upload`                       | 图片上传                   |
| `t-dropdown-menu`                 | `tdesign-miniprogram/dropdown-menu/dropdown-menu`         | 内嵌下拉菜单               |
| `t-dropdown-item`                 | `tdesign-miniprogram/dropdown-item/dropdown-item`         | 下拉菜单项                 |
| `t-action-sheet`                  | `tdesign-miniprogram/action-sheet/action-sheet`           | 底部动作面板               |
| `t-dialog`                        | `tdesign-miniprogram/dialog/dialog`                       | 二次确认弹窗               |
| `t-toast`                         | `tdesign-miniprogram/toast/toast`                         | 轻提示                     |
| `t-message`                       | `tdesign-miniprogram/message/message`                     | 顶部消息条                 |
| `t-tag`                           | `tdesign-miniprogram/tag/tag`                             | 状态标签（临期/过期）      |
| `t-badge`                         | `tdesign-miniprogram/badge/badge`                         | 数量徽标                   |
| `t-avatar`                        | `tdesign-miniprogram/avatar/avatar`                       | 成员头像                   |
| `t-empty`                         | `tdesign-miniprogram/empty/empty`                         | 空状态                     |
| `t-loading`                       | `tdesign-miniprogram/loading/loading`                     | 加载态                     |
| `t-icon`                          | `tdesign-miniprogram/icon/icon`                           | 图标                       |
| `t-image`                         | `tdesign-miniprogram/image/image`                         | 图片（懒加载）             |
| `t-image-viewer`                  | `tdesign-miniprogram/image-viewer/image-viewer`           | 图片预览                   |
| `t-tabs` / `t-tab-panel`          | `tdesign-miniprogram/tabs/tabs` 等                        | Tab 切换（图片/图标）      |
| `t-navbar`                        | `tdesign-miniprogram/navbar/navbar`                       | 顶部导航栏                 |
| `t-popup`                         | `tdesign-miniprogram/popup/popup`                         | 弹出层                     |
| `t-form`                          | `tdesign-miniprogram/form/form`                           | 表单容器（校验）           |
| `t-grid` / `t-grid-item`          | `tdesign-miniprogram/grid/grid` 等                        | 宫格（图标选择面板）       |
| `t-segmented`                     | `tdesign-miniprogram/segmented/segmented`                 | 分段选择器                 |
| `t-steps`                         | `tdesign-miniprogram/steps/steps`                         | 步骤条                     |
| `t-collapse` / `t-collapse-panel` | `tdesign-miniprogram/collapse/collapse` 等                | 折叠面板（层展开）         |
| `t-divider`                       | `tdesign-miniprogram/divider/divider`                     | 分割线                     |
| `t-progress`                      | `tdesign-miniprogram/progress/progress`                   | 进度条                     |
| `t-count-down`                    | `tdesign-miniprogram/count-down/count-down`               | 倒计时                     |
| `t-skeleton`                      | `tdesign-miniprogram/skeleton/skeleton`                   | 骨架屏                     |
| `t-qrcode`                        | `tdesign-miniprogram/qrcode/qrcode`                       | 二维码展示                 |
| `t-swiper`                        | `tdesign-miniprogram/swiper/swiper`                       | 轮播                       |
| `t-sticky`                        | `tdesign-miniprogram/sticky/sticky`                       | 吸顶                       |
| `t-back-top`                      | `tdesign-miniprogram/back-top/back-top`                   | 回到顶部                   |
| `t-tab-bar`                       | `tdesign-miniprogram/tab-bar/tab-bar`                     | 底部导航                   |
| `t-pull-down-refresh`             | `tdesign-miniprogram/pull-down-refresh/pull-down-refresh` | 下拉刷新                   |
| `t-swipe-cell`                    | `tdesign-miniprogram/swipe-cell/swipe-cell`               | 右滑删除                   |
| `t-notice-bar`                    | `tdesign-miniprogram/notice-bar/notice-bar`               | 公告条                     |
| `t-overlay`                       | `tdesign-miniprogram/overlay/overlay`                     | 遮罩层                     |
| `t-popover`                       | `tdesign-miniprogram/popover/popover`                     | 气泡弹出                   |
| `t-result`                        | `tdesign-miniprogram/result/result`                       | 结果页                     |
| `t-watermark`                     | `tdesign-miniprogram/watermark/watermark`                 | 水印                       |
| `t-footer`                        | `tdesign-miniprogram/footer/footer`                       | 页脚                       |
| `t-link`                          | `tdesign-miniprogram/link/link`                           | 文字链接                   |
| `t-typography`                    | `tdesign-miniprogram/typography/typography`               | 排版                       |
| `t-layout`                        | `tdesign-miniprogram/layout/layout`                       | 布局                       |
| `t-fab`                           | `tdesign-miniprogram/fab/fab`                             | 悬浮按钮                   |
| `t-drawer`                        | `tdesign-miniprogram/drawer/drawer`                       | 抽屉                       |
| `t-side-bar`                      | `tdesign-miniprogram/side-bar/side-bar`                   | 侧边栏                     |
| `t-indexes`                       | `tdesign-miniprogram/indexes/indexes`                     | 索引列表                   |
| `t-calendar`                      | `tdesign-miniprogram/calendar/calendar`                   | 日历                       |
| `t-color-picker`                  | `tdesign-miniprogram/color-picker/color-picker`           | 取色器                     |
| `t-rate`                          | `tdesign-miniprogram/rate/rate`                           | 评分                       |
| `t-search`                        | `tdesign-miniprogram/search/search`                       | 搜索框                     |
| `t-table`                         | `tdesign-miniprogram/table/table`                         | 表格                       |

### 2.2 不存在组件的替代方案（强制）

| 不存在的组件  | 错误用法示例             | 正确替代方案                                                                                                      |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| ❌ `t-card`   | `<t-card title="...">`   | 用**原生 `<view class="card">`** 包裹 `t-cell` / `t-image` / `t-tag` / `t-typography`，搭配 CSS 圆角+阴影模拟卡片 |
| ❌ `t-list`   | `<t-list>`               | 用 `t-cell-group` + 多个 `t-cell` 实现列表                                                                        |
| ❌ `t-select` | `<t-select options=...>` | 见 V1.3.1 规则：`t-dropdown-menu`+`t-dropdown-item` / `t-picker` / `t-action-sheet` / `t-radio-group`             |

### 2.3 "卡片"的正确写法（替代 t-card）

冰箱管家小程序里"冰箱入口卡片""物品卡片""成员卡片"等场景，**统一用下面的结构**：

```xml
<!-- 用原生 view 模拟卡片 -->
<view class="card">
  <t-cell
    title="客厅冰箱"
    description="双开门 · 共 12 件物品"
    image="https://..."
    note="3 件临期"
    arrow
    bindtap="onTapFridge"
  >
    <t-tag slot="note" theme="warning">临期</t-tag>
  </t-cell>
</view>
```

```css
/* app.wxss 或页面 wxss */
.card {
  background: #fff;
  border-radius: 24rpx; /* 圆角随主题变化，建议用 var(--td-radius-*) */
  margin: 16rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
/* 主题切换时圆角也跟着变 */
page[data-theme="fresh"] .card {
  border-radius: 16rpx;
}
page[data-theme="modern"] .card {
  border-radius: 20rpx;
}
page[data-theme="cute"] .card {
  border-radius: 32rpx;
}
```

如果卡片里需要更复杂的内容（大图 + 标题 + 描述 + 操作按钮），就用 `view` + `t-image` + `t-typography` + `t-button` 自由组合，**不要用任何名为 `card` 的组件**。

---

## 三、信息架构

### 3.1 数据实体关系

```
User (微信用户, 集合: users)
  └─ 拥有多个 Fridge （通过 user_fridge 关联表）
       ├─ 每个 Fridge 有多个 Item (集合: items)
       └─ 每个 Fridge 可被多个 User 访问（不同 role）

集合清单：
  users        —— 用户信息 + 主题偏好
  fridges     —— 冰箱结构定义
  items       —— 物品记录
  user_fridge —— 用户-冰箱关联及角色权限
```

**user_fridge 关联表字段**：

- `userId: string` // 用户 openid
- `fridgeId: string` // 冰箱 ID
- `role: 'owner' | 'readonly' | 'readwrite'`
- `joinedAt: timestamp`

### 3.2 完整页面树

```
冰箱笔记
├── 首页（pages/index）
│   ├── 无冰箱 → 引导创建卡片（view.card + t-empty + t-button）
│   ├── 有冰箱 → 默认冰箱入口卡片（view.card + t-cell + t-badge + t-tag）
│   ├── 切换冰箱入口（t-action-sheet）
│   └── 临期物品列表（t-cell-group + t-swipe-cell 右滑删除 / 点击进入详情）
│
├── 冰箱页（pages/fridge）
│   ├── 拟物冰箱结构图（t-grid 或原生 grid，双开门左右/单开门上下，含恒温层）
│   ├── 点击某层 → 展开该层物品列表（t-collapse / t-collapse-panel）
│   ├── 层内物品：右滑删除（t-swipe-cell）/ 点击进入详情
│   └── 右上角「+」→ 添加物品页（需手动选位置）
│
├── 冰箱创建/编辑页（pages/fridge-create）
│   ├── 类型选择（双开门/单开门）→ t-radio-group
│   ├── 各分区：名称(t-input)、温度类型(t-radio-group)、层数(t-stepper)
│   ├── 恒温层开关(t-switch) + 配置
│   ├── 实时预览拟物冰箱
│   └── 保存(t-button loading) / 删除（编辑模式下 t-dialog 二次确认）
│
├── 添加/编辑物品页（pages/item-edit）
│   ├── 表单：名称(t-input)、数量(t-stepper)、保质期(t-datetime-picker)、位置(t-cascader)
│   ├── Tab1 上传图片（t-upload，≤3张）
│   ├── Tab2 选择图标（t-grid + t-grid-item 图标面板，8大分类）
│   └── 保存(t-button) / 取消
│
├── 物品详情页（pages/item-detail）
│   ├── 展示物品完整信息（t-image 大图/图标、t-cell-group 信息列表、t-tag 倒计时、t-badge 数量）
│   ├── 编辑保存（进入编辑模式 → 复用添加页表单预填）
│   └── 删除物品（t-dialog 二次确认）
│
├── 冰箱设置页（pages/fridge-settings）
│   ├── 编辑冰箱信息（跳转 fridge-create 编辑模式）
│   ├── 成员管理（跳转 member-manage）
│   ├── 分享冰箱（跳转 share-qrcode）
│   └── 删除冰箱（owner 可见，t-dialog 二次确认）
│
├── 成员管理页（pages/member-manage）
│   ├── 列表展示所有成员（t-cell-group + t-cell + t-avatar + t-tag）
│   ├── 所有者可：改角色（t-dropdown-menu + t-dropdown-item 内嵌下拉 / t-action-sheet 底部面板）
│   ├── 所有者可：移除成员（t-dialog 二次确认）
│   └── 所有者可：转让所有权（t-action-sheet 选择新所有者）
│
├── 分享二维码页（pages/share-qrcode）
│   ├── 选择分享权限（t-radio-group：readonly / readwrite）
│   ├── 生成小程序码（调用云函数 generateQRCode）
│   ├── 展示二维码（t-qrcode 或 t-image + t-loading）
│   └── 保存到相册按钮（t-button）
│
├── 扫码结果页（pages/scan-result）
│   ├── 解析 scene 参数（fridgeId + role）
│   ├── 校验冰箱是否存在 / 是否已加入
│   ├── 弹出确认弹窗（t-dialog：是否加入 XXX 冰箱）
│   └── 确认 → 调用 joinFridge → 写入 user_fridge
│
└── 我的（pages/mine）
    ├── 微信授权登录（t-avatar + t-button 头像昵称）
    ├── 外观设置 / 主题切换（t-radio-group 4种风格 + 实时预览）
    ├── 冰箱管理（t-cell-group 列表、编辑、删除）
    ├── 通知设置（t-switch 临期提醒总开关 + t-radio-group 提前天数）
    └── 关于（隐私协议 t-dialog）
```

---

## 四、功能需求详述

### 4.1 用户与登录

#### 4.1.1 首次登录

- 调用 `wx.login` 获取 code → 调用云函数 `login` → 云函数内部用 `cloud.getWXContext()` 拿 openid → 查询 `users` 集合，不存在则新建（含 `theme: "warm"` 默认值），存在则更新最后登录时间。
- 返回用户信息（含 `theme`）→ 前端缓存并调用 `app.refreshTheme(theme)`。
- **不收集**手机号、真实昵称等敏感信息；昵称头像仅在用户主动点击授权时获取并脱敏存储。

#### 4.1.2 users 集合字段

```json
{
  "_id": "自动",
  "_openid": "微信 openid（自动）",
  "nickname": "string（脱敏）",
  "avatarUrl": "string（微信头像）",
  "theme": "warm",
  "notifyEnabled": true,
  "notifyDays": 3,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 4.2 冰箱管理

#### 4.2.1 创建冰箱（FridgeCreate）

**入口**：首页"+"按钮 / 首页无冰箱时的引导卡片 / 我的-冰箱管理。

**页面布局**（自上而下）：

1. **冰箱名称**：`t-input`，placeholder "如：客厅冰箱"。
2. **门型选择**：`t-radio-group`，选项「单开门」「双开门」。
3. **分区配置**（动态渲染，每个分区一组）：
   - 分区名称：`t-input`（默认"冷藏区"/"冷冻区"）
   - 温度类型：`t-radio-group`，「冷藏」「冷冻」
   - 层数：`t-stepper`，最小值1，最大值6
4. **恒温层开关**（V1.2）：`t-switch` "是否包含恒温层"。开启后：
   - 双开门：恒温层横置于左右两列**下方**，占满整行。
   - 单开门：恒温层置于冷藏区与冷冻区**中间**。
   - 恒温层名称可编辑（默认"恒温区"），层数可配置 1~2 层。
5. **实时预览区**：根据上面配置，同步渲染拟物冰箱预览（见 4.3 渲染规则，含恒温层位置与渐变色）。
6. **保存按钮**：底部固定 `t-button` type="primary" size="large"，loading 态防重复提交。

**数据结构**：

```json
{
  "_id": "自动（fridgeId）",
  "_openid": "创建者 openid",
  "name": "客厅冰箱",
  "doorType": "double | single",
  "hasConstantZone": true,
  "constantZone": {
    "zoneId": "string",
    "name": "恒温区",
    "tempType": "constant",
    "layers": [{ "layerId": "string", "index": 0, "name": "恒温层" }]
  },
  "zones": [
    {
      "zoneId": "string",
      "name": "冷藏区",
      "tempType": "cold | freeze",
      "layers": [{ "layerId": "string", "index": 0, "name": "第1层" }]
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**创建后**：云函数 `createFridge` 在写入 `fridges` 集合的同时，向 `user_fridge` 插入一条 `{ userId, fridgeId, role: "owner" }` 记录。

#### 4.2.2 冰箱列表管理

- 我的-冰箱管理：使用 `t-cell-group` + `t-cell` 展示所有冰箱（**不使用 t-list**），右侧 `t-swipe-cell` 提供"编辑/删除"操作。
- "编辑"跳转冰箱创建/编辑页（带 fridgeId，可修改名称、门型、分区层数、恒温层开关等）。
- 删除前弹出 `t-dialog` 二次确认。注意：删除冰箱时**级联删除**其下所有 `items` 记录 + 关联的 `user_fridge` 记录 + 云存储中的图片文件。

### 4.3 冰箱页（核心页面）

#### 4.3.1 拟物冰箱渲染规则

- 整体用 CSS Grid（`t-grid` 或原生 grid）实现**表格状**布局，模拟冰箱分层结构。
- **双开门冰箱**：左右两列排布，左列冷藏区、右列冷冻区，每列内按层数纵向排列。恒温层（若有）单独横置于两列**下方**，占满整行宽度。
- **单开门冰箱**：单列纵向排列，从上到下依次为「冷藏区各层 → 恒温层（若有）→ 冷冻区各层」，整体呈上下结构。
- 每一层是一个**可点击的卡片区块**，用 `view class="card"` 包裹 `t-cell` + `t-badge` 展示该层物品数量（**不使用 t-card**）。
- 拟物视觉：每层用大圆角 + 柔和阴影模拟"抽屉"质感；冷藏层用浅蓝渐变（`linear-gradient(180deg,#E8F4FD,#D6EBFA)`），冷冻层用深蓝渐变（`linear-gradient(180deg,#DCEEFB,#BBDDF5)`），恒温层用暖米色渐变（`linear-gradient(180deg,#FFF6E9,#FFF0D9)`）。

#### 4.3.2 颜色状态规则（核心视觉）

根据**该层内所有物品中最早的过期时间**计算层级颜色：

| 状态       | 触发条件                            | 背景色值                | 说明       |
| ---------- | ----------------------------------- | ----------------------- | ---------- |
| 安全（绿） | 所有物品过期日 > 今天+3天           | `rgba(82,196,26,0.12)`  | 无临期风险 |
| 临期（黄） | 存在物品过期日 ≤ 今天+3天 且 > 今天 | `rgba(250,173,20,0.15)` | 需尽快食用 |
| 过期（红） | 存在物品过期日 < 今天               | `rgba(255,77,79,0.15)`  | 已过期     |

> 颜色仅作用于**该层卡片背景**和**展开后列表行的背景**，文字保持深色保证可读性。使用 `t-tag` 在每层卡片右上角显示状态文字（"安全"/"临期X天"/"已过期"）。

#### 4.3.3 点击展开物品列表

- 点击某层 → 使用 `t-collapse` + `t-collapse-panel` 或页面内展开动画，在该层下方展开物品列表。
- 列表容器用 `t-cell-group`，列表项用 `t-cell` 包裹在 `t-swipe-cell` 内：左为物品缩略图（`t-image` width=80rpx，优先显示用户上传图片，无图片则显示所选图标），中为名称+保质期文字，右为数量 `t-badge`。
- **右滑出现删除按钮**：`t-swipe-cell` 右侧暴露红色"删除"按钮，点击后弹出 `t-dialog` 二次确认，确认后从云数据库 `items` 集合删除该物品并刷新列表。
- **点击列表项（非删除按钮区域）**：跳转至物品详情页（pages/item-detail），携带 `itemId`。
- 列表行背景色继承该物品自身的状态色（规则同上）。
- 列表最下方固定一个 `+ 添加物品` 行（`t-cell` + `t-icon`），点击进入添加物品页并**自动带入当前层的位置参数**。

### 4.4 添加/编辑物品

#### 4.4.1 入口

- 冰箱页右上角 `+` 图标按钮（`t-icon` name="add"）→ 需用户手动选择位置。
- 某层展开列表最下方 `+ 添加物品` → 自动填充位置。

#### 4.4.2 表单字段

| 字段                    | 组件                                                     | 规则                                                       |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| 物品名称                | `t-input`                                                | 必填，最多20字                                             |
| 物品图片/图标（二选一） | `t-tabs` + `t-tab-panel` 切换：`t-upload` 或图标选择面板 | 选填，见下方 4.4.3                                         |
| 数量                    | `t-stepper`                                              | 默认1，最小值1，最大值999                                  |
| 保质期                  | `t-datetime-picker`（mode="date"）                       | 必填，不能选过去日期                                       |
| 存放位置                | `t-cascader`（分区→层）                                  | 第一级选分区（冷藏/冷冻/恒温），第二级选层（第1层/第2层…） |

- 表单外层包裹 `t-form`，提交时做校验，未通过时在对应字段下方用 `t-toast` 提示。
- 保存按钮：`t-button` type="primary"，点击后显示 loading 态，成功则 `t-toast` "保存成功" 并 `wx.navigateBack`。

#### 4.4.3 物品图片与图标选择（V1.2）

提供 **两种可视化标识方式**，用户通过顶部 `t-tabs` 切换：

**Tab 1：上传图片**（默认）

- 使用 `t-upload`，选填，最多 3 张，单张 ≤2MB，支持拍照/相册，上传到云存储。
- 上传中显示 `t-toast` "上传中…" + 进度。

**Tab 2：选择图标**（无图时的轻量替代）

- 提供**常见物品图标库**，按分类用 `t-grid` + `t-grid-item` 横向滚动展示，用户点击选中后高亮边框。
- 图标库内置分类与示例（使用 TDesign `t-icon` 或自定义 SVG 图标）：

| 分类     | 示例图标关键词               |
| -------- | ---------------------------- |
| 乳制品   | 牛奶、酸奶、奶酪、黄油       |
| 蔬菜水果 | 苹果、香蕉、西红柿、生菜     |
| 肉禽蛋   | 鸡蛋、鸡肉、猪肉、牛肉       |
| 饮料     | 果汁、可乐、矿泉水、茶       |
| 调味品   | 酱油、醋、盐、油             |
| 速冻食品 | 饺子、汤圆、冰淇淋、冷冻蔬菜 |
| 熟食主食 | 面包、米饭、面条、三明治     |
| 其他     | 默认盒子图标                 |

- 图标选择为**单选**，选中后存入 `item.icon` 字段（存图标 key 字符串，如 `"milk"`），展示时映射为对应图片/图标组件。
- 优先级：若用户上传了图片，则列表/详情优先显示图片；若无图片但有图标，则显示图标；两者皆无则显示默认占位图标。

#### 4.4.4 数据结构

```json
{
  "_id": "自动（itemId）",
  "_openid": "添加者 openid",
  "fridgeId": "string",
  "zoneId": "string",
  "layerId": "string",
  "name": "鲜牛奶",
  "images": ["cloud://..."],
  "icon": "milk",
  "quantity": 2,
  "unit": "瓶",
  "expireDate": "2026-08-10",
  "notified": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 4.5 物品详情页（V1.2 新增）

**入口**：冰箱页某层展开列表中，点击物品列表项（非右滑删除区域）；或首页临期列表中点击物品。

**页面布局**（自上而下）：

1. **头部**：物品缩略图/图标（大图展示，`t-image` width=200rpx），右侧物品名称（大字）+ 数量 `t-badge`。
2. **信息区**（用 `view class="card"` 包裹 `t-cell-group`，**不使用 t-card**）：
   - 存放位置：`冷藏区 > 第1层`（可点击跳转对应冰箱层）
   - 保质期：日期 + 剩余天数 `t-tag`（绿/黄/红）
   - 添加时间、更新时间
3. **操作按钮区**（底部固定）：
   - `t-button` theme="primary" 文字"编辑保存" → 进入编辑模式（字段可修改，同添加物品页表单）
   - `t-button` theme="danger" 文字"删除物品" → 弹出 `t-dialog` 二次确认后删除并 `wx.navigateBack`

**编辑模式**：

- 页面顶部加 `t-tag` 标识"编辑中"。
- 表单字段与 4.4.2 一致（名称、图片/图标、数量、保质期、位置），预填当前物品数据。
- 保存时调用云函数 `updateItem` 更新 `items` 集合对应记录，成功后 `t-toast` "保存成功" 并退出编辑模式。
- 删除操作不可逆，需二次确认。

### 4.6 首页临期物品列表（V1.2 新增）

**位置**：首页默认冰箱卡片下方，标题"临期提醒"，使用 `t-cell-group`（**不使用 t-list**）。

**规则**：

- 聚合该用户所有冰箱中**临期（≤3天）和已过期**的物品，按过期时间升序排列。
- 每项使用 `t-swipe-cell` 包裹 `t-cell`：
  - 左：物品缩略图/图标 + 名称 + 保质期倒计时 `t-tag`（黄/红）
  - 右：数量 `t-badge`
- **右滑出现删除按钮**：红色"删除"，点击后 `t-dialog` 二次确认，确认后从 `items` 集合删除并刷新列表。
- **点击列表项**：跳转至物品详情页（pages/item-detail），携带 `itemId`。
- 空状态：若无非安全物品，显示 `t-empty` "暂无临期物品 🎉"。

### 4.7 冰箱分享与权限

#### 4.7.1 生成分享二维码

- 入口：冰箱设置页 → "分享冰箱" → 跳转 share-qrcode 页。
- 操作步骤：
  1. 用户选择分享权限（只读 readonly / 可读写 readwrite），使用 `t-radio-group`。
  2. 点击"生成二维码" → 调用云函数 `generateQRCode({ fridgeId, role })`。
  3. 云函数内部调用微信 `wxacode.getUnlimited` 生成小程序码，`scene` 编码为 `fridgeId|role|timestamp`，`page` 设为 `pages/scan-result/scan-result`。
  4. 返回 buffer → 上传至云存储 `qrcodes/${fridgeId}_${Date.now()}.png` → 返回临时 URL。
  5. 前端用 `t-qrcode` 或 `t-image` 展示二维码 + "保存到相册" `t-button`。
- 二维码有效期：7 天（云函数在扫码时校验 timestamp）。

#### 4.7.2 权限说明

- **只读（readonly）**：可查看冰箱结构、物品列表、保质期状态，**不可**添加/修改/删除物品，**不可**修改冰箱设置。
- **可读写（readwrite）**：拥有除"管理成员"和"删除冰箱"之外的全部操作权限。
- **所有者（owner）**：唯一拥有全部权限，包括转让所有权、移除成员、删除冰箱。

#### 4.7.3 扫码加入

- 用户使用微信"扫一扫"扫描小程序码 → 微信自动打开 `pages/scan-result/scan-result` 并传入 `scene` 参数。
- scan-result 页面解析 scene → 调用云函数 `joinFridge({ fridgeId, role })`：
  - 校验 fridgeId 存在且未过期。
  - 校验当前用户未加入过该冰箱。
  - 弹出 `t-dialog` 确认："是否加入 [冰箱名称]？你将获得 [只读/可读写] 权限。"
  - 确认后写入 `user_fridge` 表 → `t-toast` "加入成功" → 跳转首页刷新冰箱列表。

#### 4.7.4 成员管理

- 入口：冰箱设置页 → "成员管理" → member-manage 页。
- 成员列表用 `t-cell-group` + `t-cell` + `t-avatar` + `t-tag` 展示（**不使用 t-list**）。
- 所有者可：
  - 更改成员角色（readonly ↔ readwrite），使用 `t-dropdown-menu` + `t-dropdown-item` 内嵌下拉选择，或使用 `t-action-sheet` 底部弹出选择面板（选项较少时优先用 action-sheet）。
  - 移除成员（被移除者不再能看到该冰箱），`t-dialog` 二次确认。
  - 转让所有权（需对方确认，通过云函数通知），`t-action-sheet` 选择新所有者。

### 4.8 临期提醒

- **触发规则**：每日凌晨定时任务（云函数 `checkExpiry`，cron `0 0 1 * * * *`）扫描所有物品，对 `expireDate` 在**今天+提前天数（默认3天）内**且**未过期**的物品，向物品所属冰箱中 `role != 'readonly'` 的成员推送订阅消息。
- **推送方式**：微信订阅消息（一次性/长期，按用户授权情况）。
- **推送内容**：物品名称、存放位置、剩余天数、跳转路径（指向对应冰箱层）。
- **用户设置**：我的-通知设置，使用 `t-switch` 控制"临期提醒"总开关，以及 `t-radio-group` 选择提前天数（1天/3天/5天/7天）。
- 推送后更新 `items.notified = true`，避免重复推送。

### 4.9 首页逻辑

```
onLoad:
  if (用户无冰箱) → 显示"创建冰箱"引导（view.card + t-empty + t-button）
  else → 显示默认冰箱入口卡片（view.card 包裹 t-cell：冰箱名、门型图标、物品总数、临期数）
         + "切换冰箱"入口（t-action-sheet 底部弹出所有冰箱）
         + 临期物品列表（t-cell-group + t-swipe-cell 右滑删除 / 点击进入详情）
  点击冰箱卡片 → 跳转冰箱页（携带 fridgeId）
  点击临期列表项 → 跳转物品详情页（携带 itemId）
  右滑临期列表项 → 删除按钮 → 二次确认后删除
```

### 4.10 我的页面与主题切换（V1.2 新增）

**我的页面布局**（用 `t-cell-group` 分组，**不使用 t-list**）：

1. **用户信息区**：`t-avatar` 头像 + 昵称，点击触发授权登录。
2. **外观设置 / 主题风格**（分组标题）：
   - 使用 `t-radio-group` 横向排列 4 个主题选项，每个选项用 `view class="card"` 包裹色块预览 + 主题名（**不使用 t-card**）。
   - 选项：`温暖家居`（默认选中）/ `清新健康` / `现代简约` / `可爱圆润`。
   - 切换时即时预览（当前页立即换肤），同时弹出 `t-toast` "主题已切换"。
3. **冰箱管理**：`t-cell` 进入冰箱列表（编辑/删除）。
4. **通知设置**：`t-switch` 临期提醒总开关 + `t-radio-group` 提前天数。
5. **关于**：隐私协议入口（`t-dialog` 展示）。

**主题切换实现要点**：

- 默认主题：`warm`（写入 `users.theme` 默认值）。
- 切换流程：用户点击主题 → 调用云函数 `updateUserTheme({ theme })` → 更新 `users.theme` → 更新本地缓存 → 调用全局 `app.refreshTheme()` → 设置 `page[data-theme]` → 全局 WXSS 变量即时生效。
- 切换失败回滚：若云数据库更新失败，本地不切换，提示 `t-toast` "切换失败，请重试"。

---

## 五、交互与体验规范

### 5.1 流畅性要求

- 列表超过 20 条时必须使用**分页加载**或 `t-pull-down-refresh` + 上拉加载更多，禁止一次性渲染全部数据。
- 图片使用 `t-image` 的懒加载属性，缩略图压缩至 ≤200rpx 边长。
- 页面切换使用标准 `wx.navigateTo`/`redirectTo`，禁止多层嵌套（深度≤5）。
- 冰箱结构图（层数≤12）可一次性渲染，但每层卡片需是轻量 DOM。

### 5.2 加载与状态反馈（强制）

所有异步操作必须有状态提示，不得出现"无响应"黑盒：

| 场景         | 反馈组件                           | 示例文案                |
| ------------ | ---------------------------------- | ----------------------- |
| 页面初次加载 | `t-loading` 骨架屏 或 `t-skeleton` | —                       |
| 提交表单     | 按钮 `loading` 属性                | —                       |
| 上传图片     | `t-toast` "上传中…" + 进度         | —                       |
| 生成二维码   | 全屏 `t-loading`                   | "正在生成分享码…"       |
| 扫码验证中   | 全屏 `t-loading`                   | "正在验证…"             |
| 加载更多     | 列表底部 `t-loading`               | "加载中…"               |
| 操作成功     | `t-toast`                          | "保存成功"              |
| 操作失败     | `t-toast` 或 `t-dialog`            | "网络异常，请重试"      |
| 权限不足     | `t-message` 或 `t-toast`           | "暂无编辑权限"          |
| 空状态       | `t-empty`                          | "暂无物品，点击 + 添加" |

### 5.3 通用交互组件约定

- 确认类弹窗 → `t-dialog`（带标题、内容、确认/取消按钮）。
- 底部菜单 → `t-action-sheet`。
- 全局轻提示 → `t-toast`，duration 2000ms。
- 底部导航 → `t-tab-bar`（首页 / 我的）。
- 列表容器 → `t-cell-group` + `t-cell`（**禁止用 t-list**）。
- 卡片容器 → 原生 `view class="card"` + 内部 TDesign 组件（**禁止用 t-card**）。

---

## 六、非功能需求

| 类别     | 要求                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 性能     | 首屏加载 ≤ 1.5s（4G网络），页面切换无白屏；冰箱/物品列表 ≤ 500 条时无明显卡顿        |
| 兼容性   | 微信基础库 ≥ 2.30.0，iOS/Android 主流机型适配；TDesign ≥ 1.3.0                       |
| 安全     | 仅云开发数据库，用户隔离；不采集敏感信息；HTTPS/云函数加密传输；客户端禁止直连数据库 |
| 可维护性 | 代码按 pages / components / utils / cloudfunctions 分层；组件化复用                  |
| 埋点     | 关键行为（创建冰箱、添加物品、收到提醒点击）上报，便于迭代                           |

---

## 七、页面清单与跳转关系

### 7.1 页面清单

| 页面路径                              | 说明                                     | 主要 TDesign 组件（均经白名单核验）                                                                |
| ------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| pages/index/index                     | 首页（冰箱入口 + 临期列表）              | view.card, t-empty, t-button, t-action-sheet, t-swipe-cell, t-cell, t-cell-group, t-badge, t-tag   |
| pages/fridge/fridge                   | 冰箱页（拟物结构图 + 恒温层 + 右滑删除） | t-grid, t-cell, t-badge, t-tag, t-collapse, t-image, t-swipe-cell                                  |
| pages/fridge-create/fridge-create     | 创建/编辑冰箱（含恒温层开关 + 实时预览） | t-input, t-radio-group, t-stepper, t-switch, t-button, t-dialog                                    |
| pages/item-edit/item-edit             | 添加/编辑物品（图片+图标 Tab）           | t-form, t-input, t-upload, t-stepper, t-datetime-picker, t-cascader, t-tabs, t-tab-panel, t-button |
| pages/item-detail/item-detail         | 物品详情（编辑保存 / 删除）              | view.card, t-cell-group, t-image, t-tag, t-badge, t-button, t-dialog                               |
| pages/fridge-settings/fridge-settings | 冰箱设置（编辑/成员/分享/删除）          | t-cell-group, t-button, t-dialog                                                                   |
| pages/member-manage/member-manage     | 成员管理（角色修改/移除/转让）           | t-cell-group, t-cell, t-avatar, t-tag, t-dropdown-menu, t-dropdown-item, t-action-sheet, t-dialog  |
| pages/share-qrcode/share-qrcode       | 分享二维码（选权限 + 生成 + 保存）       | t-radio-group, t-loading, t-qrcode, t-image, t-button                                              |
| pages/scan-result/scan-result         | 扫码结果处理（校验 + 加入确认）          | t-loading, t-dialog, t-toast                                                                       |
| pages/mine/mine                       | 我的（登录 + 主题切换 + 设置 + 关于）    | t-cell-group, t-cell, t-avatar, t-switch, t-radio-group, t-tab-bar                                 |

### 7.2 跳转关系

- 首页 → 冰箱页（带 fridgeId）
- 首页 → 冰箱创建页（无 fridgeId 时为新建）
- 首页临期列表 → 物品详情页（带 itemId）
- 冰箱页 → 物品详情页（带 itemId，点击列表项）
- 冰箱页 → 物品编辑页（带 zoneId + layerId，点 + 号）
- 冰箱页 → 冰箱设置页（带 fridgeId）
- 冰箱设置页 → 冰箱创建页（编辑模式，带 fridgeId）
- 冰箱设置页 → 成员管理页（带 fridgeId）
- 冰箱设置页 → 分享二维码页（带 fridgeId）
- 物品详情页 → 物品编辑页（编辑模式，带 itemId）
- 扫码结果页 → 首页（加入成功后）
- 全局底栏 → 首页 / 我的

---

## 八、云开发实现方案（完整后端）

> 本章节详细描述使用**微信小程序云开发（CloudBase）**构建后端的完整实现方式。AI 在生成代码时应严格遵循本章的云函数签名、数据库结构、鉴权模板和安全规则。

### 8.1 环境准备

1. **开通云开发**：小程序管理后台 → 开发 → 云开发，创建一个**按量计费环境**（推荐），记录环境 ID（如 `fridge-note-prod`）。
2. **项目初始化**：在 `app.js` 中调用：

   ```javascript
   wx.cloud.init({
     env: "fridge-note-prod",
     traceUser: true, // 记录用户访问
   });
   ```

3. **云函数依赖**：在云函数目录下如需第三方包（如 `dayjs`），执行 `npm install dayjs --production`，并在云函数根目录保留 `package.json` 和 `node_modules`。
4. **基础库版本**：`project.config.json` 中设置 `libVersion: "2.30.0"`。

### 8.2 云数据库集合设计

#### 8.2.1 集合清单与权限

| 集合名称      | 用途                | 客户端权限 | 读写方式 |
| ------------- | ------------------- | ---------- | -------- |
| `users`       | 用户信息 + 主题偏好 | 仅管理员   | 仅云函数 |
| `fridges`     | 冰箱结构定义        | 仅管理员   | 仅云函数 |
| `items`       | 物品记录            | 仅管理员   | 仅云函数 |
| `user_fridge` | 用户-冰箱关联及角色 | 仅管理员   | 仅云函数 |

> **安全规则**：所有集合的权限统一设置为「仅创建者可读写」**并在客户端代码中禁止直连**，所有读写都通过云函数代理。云函数内使用 `cloud.database()` 拥有完整管理权限。

在集合的 `securityRules` 中配置：

```json
{
  "read": false,
  "write": false
}
```

即完全禁止客户端直接读写，强制走云函数鉴权。

#### 8.2.2 索引建议

- `items` 集合：
  - `{ fridgeId: 1, zoneId: 1, layerId: 1 }` —— 加速按冰箱区域查询物品
  - `{ expireDate: 1 }` —— 加速临期扫描
  - `{ notified: 1, expireDate: 1 }` —— 加速定时提醒查询
- `user_fridge` 集合：
  - `{ userId: 1 }` —— 加速获取用户所有冰箱
  - `{ fridgeId: 1 }` —— 加速获取冰箱所有成员
- `fridges` 集合：
  - `{ _openid: 1 }` —— 加速查询用户创建的冰箱

#### 8.2.3 数据模型（权威定义）

**users 集合**：

```json
{
  "_id": "自动",
  "_openid": "微信 openid（自动）",
  "nickname": "string（脱敏）",
  "avatarUrl": "string（微信头像）",
  "theme": "warm",
  "notifyEnabled": true,
  "notifyDays": 3,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**fridges 集合**：

```json
{
  "_id": "自动（fridgeId）",
  "_openid": "创建者 openid",
  "name": "客厅冰箱",
  "doorType": "double",
  "hasConstantZone": true,
  "constantZone": {
    "zoneId": "cz1",
    "name": "恒温区",
    "tempType": "constant",
    "layers": [{ "layerId": "cl1", "index": 0, "name": "恒温层" }]
  },
  "zones": [
    {
      "zoneId": "z1",
      "name": "冷藏区",
      "tempType": "cold",
      "layers": [{ "layerId": "l1", "index": 0, "name": "第1层" }]
    },
    {
      "zoneId": "z2",
      "name": "冷冻区",
      "tempType": "freeze",
      "layers": [{ "layerId": "l2", "index": 0, "name": "第1层" }]
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**items 集合**：

```json
{
  "_id": "自动（itemId）",
  "_openid": "添加者 openid",
  "fridgeId": "string",
  "zoneId": "string",
  "layerId": "string",
  "name": "鲜牛奶",
  "images": ["cloud://env-id/xxx.png"],
  "icon": "milk",
  "quantity": 2,
  "unit": "瓶",
  "expireDate": "2026-08-15",
  "notified": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**user_fridge 集合**：

```json
{
  "_id": "自动",
  "userId": "openid",
  "fridgeId": "string",
  "role": "owner",
  "joinedAt": "timestamp"
}
```

### 8.3 云函数设计

#### 8.3.1 云函数清单

| 云函数名称         | 触发方式     | 功能描述                                                         |
| ------------------ | ------------ | ---------------------------------------------------------------- |
| `login`            | HTTP 调用    | 微信登录，获取 openid，创建/更新 users 记录（含 theme 默认值）   |
| `updateUserTheme`  | HTTP 调用    | 更新用户主题偏好 `users.theme`                                   |
| `createFridge`     | HTTP 调用    | 创建冰箱，写入 fridges + user_fridge（role=owner）               |
| `updateFridge`     | HTTP 调用    | 修改冰箱结构/名称，校验 owner                                    |
| `deleteFridge`     | HTTP 调用    | 删除冰箱 + 级联删除 items / user_fridge / 云存储文件，校验 owner |
| `getFridgeList`    | HTTP 调用    | 获取当前用户所有冰箱（通过 user_fridge 联表查询）                |
| `getFridgeDetail`  | HTTP 调用    | 获取冰箱详情及物品列表（按权限过滤）                             |
| `addItem`          | HTTP 调用    | 添加物品，校验 write 权限（role≠readonly）                       |
| `updateItem`       | HTTP 调用    | 修改物品，校验 write 权限                                        |
| `deleteItem`       | HTTP 调用    | 删除物品，校验 write 权限，同步删除云存储图片                    |
| `getItemsByLayer`  | HTTP 调用    | 获取某层物品列表                                                 |
| `getExpiringItems` | HTTP 调用    | 获取用户所有冰箱临期物品（聚合查询）                             |
| `generateQRCode`   | HTTP 调用    | 生成带参数的小程序码（调用 wxacode.getUnlimited）                |
| `joinFridge`       | HTTP 调用    | 扫码后加入冰箱，写入 user_fridge                                 |
| `manageMember`     | HTTP 调用    | 修改成员角色 / 移除成员 / 转让所有权，校验 owner                 |
| `checkExpiry`      | **定时触发** | 每日凌晨扫描临期物品并发送订阅消息                               |

#### 8.3.2 云函数通用鉴权模板（强制）

每个涉及写操作的云函数，开头**必须**执行以下鉴权逻辑：

```javascript
// cloudfunctions/_shared/auth.js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 校验用户是否登录 + 是否有权限操作某冰箱
 * @param {string} fridgeId
 * @param {string[]} allowedRoles - 允许的角色列表，如 ['owner','readwrite']
 */
async function checkFridgePermission(fridgeId, allowedRoles) {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw { code: -1, msg: "未登录" };

  const res = await db
    .collection("user_fridge")
    .where({
      userId: OPENID,
      fridgeId: fridgeId,
    })
    .get();

  if (res.data.length === 0) throw { code: -2, msg: "无权访问此冰箱" };

  const role = res.data[0].role;
  if (!allowedRoles.includes(role)) {
    throw {
      code: -3,
      msg: "权限不足：需要 " + allowedRoles.join("/") + " 权限",
    };
  }

  return { openid: OPENID, role };
}

module.exports = { checkFridgePermission };
```

**各云函数的权限要求速查**：

| 云函数                                                               | 需要的角色                            |
| -------------------------------------------------------------------- | ------------------------------------- |
| createFridge                                                         | 已登录即可                            |
| updateFridge                                                         | owner                                 |
| deleteFridge                                                         | owner                                 |
| addItem / updateItem / deleteItem                                    | owner 或 readwrite                    |
| getFridgeList / getFridgeDetail / getItemsByLayer / getExpiringItems | 已登录即可（自动按 user_fridge 过滤） |
| generateQRCode                                                       | owner                                 |
| joinFridge                                                           | 已登录即可                            |
| manageMember                                                         | owner                                 |
| checkExpiry                                                          | 定时触发（跳过鉴权）                  |

#### 8.3.3 关键云函数实现要点

**（1）login —— 微信登录**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: "登录失败" };

  const now = db.serverDate();
  const exist = await db.collection("users").where({ _openid: OPENID }).get();

  if (exist.data.length === 0) {
    // 新用户：创建，theme 默认 warm
    const res = await db.collection("users").add({
      data: {
        _openid: OPENID,
        nickname: event.nickname || "微信用户",
        avatarUrl: event.avatarUrl || "",
        theme: "warm",
        notifyEnabled: true,
        notifyDays: 3,
        createdAt: now,
        updatedAt: now,
      },
    });
    return { code: 0, data: { _id: res._id, _openid: OPENID, theme: "warm" } };
  } else {
    // 老用户：更新登录时间
    await db
      .collection("users")
      .doc(exist.data[0]._id)
      .update({
        data: { updatedAt: now },
      });
    return { code: 0, data: exist.data[0] };
  }
};
```

**（2）generateQRCode —— 生成分享小程序码**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { fridgeId, role } = event;
  if (!["readonly", "readwrite"].includes(role))
    return { code: -1, msg: "role 非法" };

  // 校验调用者是 owner
  const ownerCheck = await db
    .collection("user_fridge")
    .where({
      userId: OPENID,
      fridgeId,
      role: "owner",
    })
    .get();
  if (ownerCheck.data.length === 0)
    return { code: -2, msg: "仅所有者可生成分享码" };

  // 构造 scene（7天有效期）
  const scene = `${fridgeId}|${role}|${Date.now()}`;
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene: scene,
    page: "pages/scan-result/scan-result",
    checkPath: false,
    width: 430,
  });

  // 上传到云存储
  const upload = await cloud.uploadFile({
    cloudPath: `qrcodes/${fridgeId}_${Date.now()}.png`,
    fileContent: result.buffer,
  });

  // 返回临时 URL
  const urlResult = await cloud.getTempFileURL({ fileList: [upload.fileID] });
  return {
    code: 0,
    data: { fileID: upload.fileID, url: urlResult.fileList[0].tempFileURL },
  };
};
```

**（3）joinFridge —— 扫码加入冰箱**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { fridgeId, role } = event;

  // 校验冰箱存在
  const fridge = await db.collection("fridges").doc(fridgeId).get();
  if (!fridge.data) return { code: -1, msg: "冰箱不存在或已失效" };

  // 是否已加入
  const exist = await db
    .collection("user_fridge")
    .where({
      userId: OPENID,
      fridgeId,
    })
    .get();
  if (exist.data.length > 0) return { code: -2, msg: "你已加入该冰箱" };

  // 写入关联
  await db.collection("user_fridge").add({
    data: {
      userId: OPENID,
      fridgeId,
      role,
      joinedAt: db.serverDate(),
    },
  });

  return { code: 0, msg: "加入成功", data: { fridgeName: fridge.data.name } };
};
```

**（4）checkExpiry —— 定时临期扫描**

- 在云函数目录下创建 `config.json`：

```json
{
  "triggers": [
    {
      "name": "dailyCheck",
      "type": "timer",
      "config": "0 0 1 * * * *"
    }
  ]
}
```

含义：每天凌晨 1:00 触发（秒 分 时 日 月 周 年）。

- 云函数主体逻辑：

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 查询未通知且临期的物品
  const items = await db
    .collection("items")
    .where({
      notified: false,
      expireDate: _.lte(threeDaysLater).and(_.gte(now)),
    })
    .get();

  // 按 fridgeId 分组
  const byFridge = {};
  items.data.forEach((item) => {
    if (!byFridge[item.fridgeId]) byFridge[item.fridgeId] = [];
    byFridge[item.fridgeId].push(item);
  });

  for (const [fridgeId, expiringItems] of Object.entries(byFridge)) {
    // 获取该冰箱所有非只读成员
    const members = await db
      .collection("user_fridge")
      .where({
        fridgeId,
        role: _.in(["owner", "readwrite"]),
      })
      .get();

    for (const member of members.data) {
      // 获取用户通知偏好
      const user = await db
        .collection("users")
        .where({ _openid: member.userId })
        .get();
      if (user.data.length === 0 || !user.data[0].notifyEnabled) continue;

      // 发送订阅消息（模板需提前在微信后台申请）
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: member.userId,
          templateId: "YOUR_TEMPLATE_ID", // 替换为实际模板 ID
          page: `pages/fridge/fridge?fridgeId=${fridgeId}`,
          data: {
            thing1: { value: expiringItems[0].name },
            number2: {
              value: Math.ceil(
                (new Date(expiringItems[0].expireDate) - now) / 86400000,
              ),
            },
            thing3: { value: expiringItems.length + " 件物品临期" },
          },
        });
      } catch (e) {
        console.error("send fail", e);
      }
    }
  }

  // 标记已通知
  const ids = items.data.map((i) => i._id);
  if (ids.length > 0) {
    await db
      .collection("items")
      .where({ _id: _.in(ids) })
      .update({
        data: { notified: true },
      });
  }

  return { code: 0, notified: ids.length };
};
```

### 8.4 云存储

- **用途**：存储用户上传的物品图片、生成的二维码图片。
- **目录规划**：
  - `images/items/{itemId}/` —— 物品图片（每张 ≤2MB）
  - `qrcodes/` —— 分享二维码
- **上传方式**：前端通过 `wx.cloud.uploadFile` 上传，成功后在云函数 `addItem`/`updateItem` 中写入 `items.images` 数组。
- **删除联动**：云函数 `deleteItem` 和 `deleteFridge` 中同步调用 `cloud.deleteFile({ fileList: [...] })` 清理云存储文件，避免垃圾数据。
- **权限**：云存储默认仅管理员可读写，前端通过 `wx.cloud.getTempFileURL` 获取临时链接展示。

### 8.5 前端调用云函数统一封装

建议在 `utils/cloud.js` 中封装统一调用方法：

```javascript
// utils/cloud.js
function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result || {};
        if (result.code === 0) resolve(result.data);
        else {
          wx.showToast({ title: result.msg || "操作失败", icon: "none" });
          reject(result);
        }
      },
      fail: (err) => {
        wx.showToast({ title: "网络错误，请重试", icon: "none" });
        reject(err);
      },
    });
  });
}

module.exports = { call };
```

页面中调用示例：

```javascript
const cloud = require("../../utils/cloud.js");

// 添加物品
cloud
  .call("addItem", {
    fridgeId: "xxx",
    zoneId: "z1",
    layerId: "l1",
    name: "牛奶",
    icon: "milk",
    quantity: 2,
    unit: "瓶",
    expireDate: "2026-08-15",
  })
  .then(() => {
    wx.showToast({ title: "添加成功" });
    wx.navigateBack();
  });
```

### 8.6 环境变量与配置

- 云函数中统一使用 `cloud.DYNAMIC_CURRENT_ENV` 获取当前环境 ID，避免硬编码。
- 订阅消息模板 ID 存储在云函数的 `config.js` 中，或通过云数据库 `config` 集合管理（推荐，便于线上修改无需重部署）。
- 二维码有效期（默认 7 天）也建议放入 `config` 集合，便于调整。

### 8.7 云开发项目目录结构（推荐）

```
miniprogram/
├── cloudfunctions/
│   ├── login/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── config.json
│   ├── createFridge/
│   ├── updateFridge/
│   ├── deleteFridge/
│   ├── getFridgeList/
│   ├── getFridgeDetail/
│   ├── addItem/
│   ├── updateItem/
│   ├── deleteItem/
│   ├── getItemsByLayer/
│   ├── getExpiringItems/
│   ├── generateQRCode/
│   ├── joinFridge/
│   ├── manageMember/
│   ├── updateUserTheme/
│   ├── checkExpiry/
│   └── _shared/
│       └── auth.js          （公共鉴权模块）
├── miniprogram/
│   ├── app.js
│   ├── app.wxss            （4套主题 CSS 变量定义 + .card 通用卡片样式）
│   ├── app.json
│   ├── pages/
│   │   ├── index/
│   │   ├── fridge/
│   │   ├── fridge-create/
│   │   ├── item-edit/
│   │   ├── item-detail/
│   │   ├── fridge-settings/
│   │   ├── member-manage/
│   │   ├── share-qrcode/
│   │   ├── scan-result/
│   │   └── mine/
│   ├── components/
│   ├── utils/
│   │   ├── cloud.js         （云函数统一封装）
│   │   ├── theme.js         （refreshTheme 实现）
│   │   └── icons.js         （物品图标映射表）
│   └── assets/
│       └── icons/            （常见物品图标资源）
└── project.config.json
```

---

### 8.8 云函数常见错误与避坑指南（V1.3.3 新增）

> ⚠️ **本章为强制约束**。记录开发过程中实际踩过的坑，AI 生成云函数代码时**必须**遵守下方的预防措施，杜绝同类错误再次发生。

#### 8.8.1 错误一：`Cannot find module 'wx-server-sdk'`

**错误现象**（云端调用云函数时返回）：

```json
{
  "errorCode": 1,
  "errorMessage": "Error: Cannot find module 'wx-server-sdk'
Require stack:
- /var/user/index.js
- /data/scf/frame/node16/userFunction.js
- /data/scf/frame/node16/runtime.js",
  "requestId": "f3a9fefd-b8a3-4dad-be97-0782d33f99e5",
  "statusCode": 443
}
```

**根因分析**：

- 云函数运行时在执行 `index.js` 时，遇到 `require('wx-server-sdk')`，但在云端环境中找不到这个包。
- 原因只有一个：**该云函数目录下的 `package.json` 没有声明 `wx-server-sdk` 依赖**，导致无论"本地安装依赖"还是"云端安装依赖"都无法获取该包。
- 常见触发场景：
  1. AI 生成云函数代码时只写了 `index.js`，**漏掉了 `package.json`**。
  2. `package.json` 存在但 `dependencies` 字段为空或缺少 `wx-server-sdk`。
  3. 上传时选了"不上传 node_modules"但云端安装又因 `package.json` 缺失依赖而失败。

**解决方案**（三选一）：

**方案 A：本地安装后上传（推荐调试阶段使用）**

```bash
# 进入具体的云函数目录（不是 cloudfunctions 总目录！）
cd cloudfunctions/login
npm install wx-server-sdk
```

安装完成后该目录下会出现 `node_modules/` 文件夹。然后在微信开发者工具中**右键该云函数目录** → 选择「上传并部署：云端安装依赖」。

**方案 B：让云端自动安装（推荐生产部署）**
确保云函数目录下有完整的 `package.json`：

```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

然后在微信开发者工具中**右键该云函数目录** → 选择「上传并部署：云端安装依赖」。云端会根据 `package.json` 自动执行 `npm install`。

**方案 C：锁定版本号（方案 B 失败时备用）**
若云端安装时拉到不兼容的新版本导致报错，将版本号锁定：

```json
{
  "dependencies": {
    "wx-server-sdk": "2.15.0"
  }
}
```

重新上传即可。

**验证是否修复**：

- 上传成功后，到云开发控制台 → 云函数列表 → 点击该函数 → 「日志」→ 手动触发一次。
- 若不再报 `Cannot find module`，且日志显示正常执行，则修复成功。

#### 8.8.2 预防措施（强制）

**AI 生成云函数代码时，必须为每个云函数目录同时生成以下两个文件**，缺一不可：

**文件 1：`index.js`** —— 入口文件，必须包含：

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  // 业务逻辑
};
```

**文件 2：`package.json`** —— 依赖声明，必须包含：

```json
{
  "name": "函数名称（与目录名一致）",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

> ⚠️ **每个云函数目录都要有自己的 `package.json`**。本项目共有 15 个云函数（`login`、`createFridge`、`updateFridge`、`deleteFridge`、`getFridgeList`、`getFridgeDetail`、`addItem`、`updateItem`、`deleteItem`、`getItemsByLayer`、`getExpiringItems`、`generateQRCode`、`joinFridge`、`manageMember`、`updateUserTheme`、`checkExpiry`），**每一个**目录下都必须有独立的 `package.json` 且声明 `wx-server-sdk` 依赖。

**共享模块 `_shared/` 的特殊说明**：

- `_shared/auth.js` 不是云函数，是**被其他云函数 `require` 的共享模块**。
- `_shared/` 目录下**不需要** `package.json`，也**不能**单独上传部署。
- 引用方式：在其他云函数的 `index.js` 顶部写 `const { checkFridgePermission } = require('../_shared/auth.js')`。
- 上传某个云函数时，工具会自动把 `require` 到的 `_shared/auth.js` 一起打包上传。

#### 8.8.3 错误二：上传并部署选项不出现

**错误现象**：右键云函数目录后，菜单里没有「上传并部署：云端安装依赖」选项。

**根因与解决**：

| 排查项                         | 正确做法                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 右键位置错误                   | 必须右键**具体云函数子目录**（如 `cloudfunctions/login/`），不是 `cloudfunctions/` 总目录，也不是 `_shared/` |
| `index.js` 缺少 `exports.main` | 入口文件必须 `exports.main = async (event, context) => {...}`，否则工具不识别为云函数                        |
| `package.json` 缺失或非法      | 目录内必须有合法 JSON 格式的 `package.json`                                                                  |
| 云环境未绑定                   | 右键 `cloudfunctions/` 总目录 → 「当前环境」→ 选择已创建的环境                                               |
| `project.config.json` 未配置   | 必须包含 `"cloudfunctionRoot": "cloudfunctions/"` 和 `"cloudDevelopment": true`                              |
| `app.json` 缺少 cloud 声明     | 必须包含 `"cloud": true`                                                                                     |
| 开发者工具版本过低             | 帮助 → 检查更新，升级到最新稳定版                                                                            |

#### 8.8.4 错误三：`_shared` 模块无法单独上传

**错误现象**：尝试右键 `_shared/` 目录上传，报错或菜单无上传选项。

**根因**：`_shared/` 不是云函数，没有 `exports.main` 入口，工具不会将其识别为可部署单元。

**正确做法**：`_shared/auth.js` 通过相对路径被具体云函数 `require` 引入，跟随那个云函数一起打包上传。开发者只需上传具体的云函数目录即可。

#### 8.8.5 上传部署标准流程（SOP）

为避免遗漏，每次新增或修改云函数后，按以下流程操作：

```
1. 确认该云函数目录下有 index.js + package.json
2. 确认 package.json 的 dependencies 中有 "wx-server-sdk": "~2.6.3"
3. 本地执行 npm install（或在开发者工具中右键选"云端安装依赖"）
4. 在微信开发者工具中，右键该云函数目录（非总目录）
5. 选择「上传并部署：云端安装依赖」
6. 等待右下角提示"上传成功"
7. 到云开发控制台 → 云函数列表 → 确认函数已显示
8. 点击函数 → 「测试」或查看「日志」验证运行正常
```

---

## 九、AI 代码生成提示词建议（强约束）

> 以下内容供将本文档喂给 AI 生成原型图或小程序代码时使用。**所有约束均为强制**。

### 9.1 组件白名单（最高优先级）

- **仅允许使用本文档第二章「TDesign 组件白名单」中列出的组件**，禁止引入任何不在白名单内的 TDesign 组件。
- **严禁使用 `t-card`**：所有"卡片"均用原生 `<view class="card">` 包裹 TDesign 组件实现，样式参考 2.3 节的 `.card` CSS 写法。
- **严禁使用 `t-list`**：所有列表均用 `<t-cell-group>` + 多个 `<t-cell>` 实现。
- **严禁使用 `t-select`**：所有"下拉选择"按 V1.3.1 规则替换（见 9.3）。

### 9.2 通用约束

- **组件引用**：生成任何 WXML 时，优先使用 `tdesign-miniprogram` 组件，例如按钮用 `<t-button>`、输入框用 `<t-input>`、列表用 `<t-cell>`、右滑用 `<t-swipe-cell>`。
- **样式约束**：颜色、间距、圆角一律用 TDesign CSS 变量（`--td-*`），禁止硬编码。主题相关的色值使用 `page[data-theme="warm|fresh|modern|cute"]` 选择器覆盖。
- **页面结构**：每个页面必须包含 `*.wxml` `*.wxss` `*.js` `*.json` 四个文件，并在 `*.json` 的 `usingComponents` 中声明所用 TDesign 组件路径（如 `"t-button": "tdesign-miniprogram/button/button"`）。
- **状态反馈**：所有异步函数必须配套 `t-toast` 或 `t-loading`，不得出现无提示等待。

### 9.3 下拉选择：四选一规则（V1.3.1）

- 页面内嵌下拉菜单 → `t-dropdown-menu` + `t-dropdown-item`（需先在 JSON 中声明 `"t-dropdown-menu": "tdesign-miniprogram/dropdown-menu/dropdown-menu"` 和 `"t-dropdown-item": "tdesign-miniprogram/dropdown-item/dropdown-item"`）
- 表单内底部弹出滚轮选择 → `t-picker`（单位、存放位置级联等）
- 少量选项的底部面板 → `t-action-sheet`（编辑/删除操作、更改角色等 2~4 个选项场景）
- 2~3 个选项的平铺选择 → `t-radio-group`（门型、恒温层开关、通知提前天数等）
- 示例（成员管理改角色）：用 `<t-dropdown-menu><t-dropdown-item options="{{roleOptions}}" value="{{role}}" bindchange="onRoleChange"/></t-dropdown-menu>`，options 格式为 `[{label:'只读',value:'readonly'},{label:'可读写',value:'readwrite'}]`

### 9.4 数据层（强约束）

- 使用微信云开发（CloudBase），数据库集合命名为 `fridges`、`items`、`users`、`user_fridge`，**禁止客户端直连数据库**，所有读写通过 `wx.cloud.callFunction` 调用云函数。
- 鉴权模板：每个云函数开头必须 `require('./_shared/auth.js')` 中的 `checkFridgePermission(fridgeId, allowedRoles)`，校验失败返回对应错误码。
- **每个云函数必须包含 `package.json`**：AI 生成任何云函数时，**必须同时生成该目录下的 `package.json` 文件**，且 `dependencies` 中**必须声明 `"wx-server-sdk": "~2.6.3"`**。缺少此依赖会导致云端报 `Cannot find module 'wx-server-sdk'`（详见 8.8.1 节）。这是最高优先级强制约束，不可省略。
- **`_shared/` 目录不是云函数**：`_shared/auth.js` 是共享模块，没有 `package.json`，不能单独上传。它通过 `require('../_shared/auth.js')` 被具体云函数引入，跟随该云函数一起打包上传。

### 9.5 业务规则

- **主题系统**：必须在 `app.wxss` 定义 4 套 CSS 变量（warm/fresh/modern/cute），`app.js` 中实现 `refreshTheme(theme)` 全局方法，从 `users.theme` 读取并写入 `page` 的 `data-theme` 属性。默认值为 `warm`。切换时调用云函数 `updateUserTheme` 持久化。
- **图标选择**：添加/编辑物品页用 `t-tabs` + `t-tab-panel` 切"上传图片 / 选择图标"两栏；图标面板用 `t-grid` + `t-grid-item` 按 8 大分类展示可点击缩略图，选中后高亮边框并写入 `item.icon` 字段。
- **右滑删除**：临期列表与冰箱层物品列表一律用 `<t-swipe-cell>`，右侧暴露红色"删除"按钮，点击后弹 `<t-dialog>` 二次确认再删云数据库记录。
- **物品详情页**：独立页面 `pages/item-detail`，展示完整信息 + 编辑保存/删除两个底部按钮，删除需二次确认。
- **冰箱布局**：双开门用 CSS Grid 两列左右排布（左冷藏右冷冻，恒温层在下方占满整行）；单开门单列纵向（冷藏在上、恒温层在中、冷冻在下）。每层用大圆角渐变背景模拟抽屉。
- **二维码分享**：使用云函数 `generateQRCode` 调用 `cloud.openapi.wxacode.getUnlimited`，scene 格式 `fridgeId|role|timestamp`，page 设为 `pages/scan-result/scan-result`。
- **定时提醒**：云函数 `checkExpiry` 的 `config.json` 必须包含 `"triggers": [{"type":"timer","config":"0 0 1 * * * *"}]`，扫描 `notified=false` 且 `expireDate` 在阈值内的物品并发送订阅消息。
- **云存储清理**：删除物品/冰箱时，云函数中同步调用 `cloud.deleteFile` 清理关联文件。

---

## 十、附录：修订记录

| 版本   | 日期       | 修订人   | 修订内容                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0   | 2026-08-06 | 产品经理 | 初始版本：冰箱创建、物品管理、临期提醒                                                                                                                                                                                                                                                                                                                         |
| v1.1   | 2026-08-06 | 产品经理 | 新增用户-冰箱关联表、二维码分享、权限管理（只读/可读写/所有者）                                                                                                                                                                                                                                                                                                |
| v1.2   | 2026-08-06 | 产品经理 | 新增主题切换（4种风格）、物品右滑删除/点击详情、冰箱恒温层、物品图标选择、物品详情页                                                                                                                                                                                                                                                                           |
| v1.3   | 2026-08-06 | 产品经理 | 补全完整页面树；新增第八章「云开发实现方案」（环境、集合、索引、云函数清单、鉴权模板、关键云函数代码、云存储、统一封装、目录结构）                                                                                                                                                                                                                             |
| v1.3.1 | 2026-08-06 | 产品经理 | 修正：全局移除不存在的 `t-select` 组件，替换为 `t-dropdown-menu`+`t-dropdown-item` / `t-action-sheet` / `t-picker` / `t-radio-group`（按场景选用）；同步更新页面清单、成员管理描述及 AI 提示词约束                                                                                                                                                             |
| v1.3.2 | 2026-08-06 | 产品经理 | 修正：全局移除不存在的 `t-card` 和 `t-list` 组件；卡片统一用原生 `view.card`+TDesign 组件替代，列表统一用 `t-cell-group`+`t-cell` 替代；新增第二章「TDesign 组件白名单」（65 个官方组件清单 + 替代方案 + .card CSS 写法）；页面清单与 AI 提示词同步更新                                                                                                        |
| v1.3.3 | 2026-08-06 | 产品经理 | 新增 8.8 节「云函数常见错误与避坑指南」：记录 `Cannot find module 'wx-server-sdk'` 错误现象/根因/三套解决方案（本地安装/云端安装/版本锁定）/预防措施；明确每个云函数必须自带 `package.json` 且声明 `wx-server-sdk` 依赖；补充"上传并部署选项不出现"排查表、`_shared` 不能单独上传说明、上传部署 SOP 标准流程；AI 提示词 9.4 节同步新增 `package.json` 强制约束 |

---

**文档结束。**

如需生成原型图或开始编码，请将此文档作为上下文一并输入 AI 工具。文档中所有云函数签名、数据库字段、鉴权逻辑、组件白名单均可直接作为 AI 生成代码的强约束依据。
