# 冰箱笔记小程序 产品需求文档（PRD）

> 版本：V1.5.0 ｜ 日期：2026-08-19 ｜ 状态：待评审
> 阅读对象：设计师 / 前端开发 / 后端开发 / AI 代码生成工具
> V1.1 修订：新增用户-冰箱关联表、二维码分享、权限管理
> V1.2 修订：新增主题切换（4种风格）、物品右滑删除/点击详情、冰箱恒温层、物品图标选择、物品详情页
> V1.3 修订：补全页面树、新增第七章「云开发实现方案（完整后端）」
> V1.3.1 修订：全局移除不存在的 `t-select` 组件，按场景替换为 `t-dropdown-menu`+`t-dropdown-item` / `t-action-sheet` / `t-picker` / `t-radio-group`
> V1.3.2 修订：全局移除不存在的 `t-card` 和 `t-list` 组件；卡片用原生 `view`+`t-cell` 组合替代，列表用 `t-cell-group`+`t-cell` 替代；新增「TDesign 组件白名单」章节
> V1.3.3 修订：新增「云函数常见错误与避坑指南」，记录 `wx-server-sdk` 依赖缺失导致云端 `Cannot find module 'wx-server-sdk'` 的错误现象、根因、解决方案与强制预防措施
> V1.3.4 修订：新增「首页空状态出现多余滚动条」与「自定义按钮与小程序原生胶囊按钮重叠」两条避坑记录；新增首页 WXML 双分支条件渲染规范与自定义按钮位置规范
> V1.4.0 修订（本版本）：①新增物品后返回自动刷新数据 ②冰箱创建页实时预览置顶+分区可删除 ③首页添加冰箱按钮改为右下角浮动圆形按钮并跟随主题色 ④冰箱层点击物品不折叠 ⑤我的页面显示微信头像昵称（chooseAvatar+nickname） ⑥冰箱页图标位置重构（设置→表格右上角/添加→表格下方）⑦首页加载缓冲（骨架屏三态）
> V1.5.0 修订（本版本）：①冰箱页加载失败新增错误态+「重新加载」、只读成员按 role 隐藏删除/添加按钮 ②云函数统一封装 call() 增加 15s 超时 ③addItem/updateItem/deleteItem/deleteFridge 捕获 checkFridgePermission 异常返回结构化 {code,msg} ④删除默认冰箱同步清理 users.defaultFridgeId ⑤分享二维码 scene 改为定长无分隔符编码(fridgeId24+roleCode2+dayTs)并加>32护栏，扫码端向后兼容旧`|`格式 ⑥接入微信隐私授权弹窗(__usePrivacyCheck__+首次启动requirePrivacyAuthorize) ⑦临期0天显示「今天到期」⑧冰箱设置页加载失败错误态+重试 ⑨删除失败/保存二维码失败细分提示 ⑩保存物品订阅授权同设备去重 ⑪预设图标 wx:key 改用*this ⑫移除死代码云函数 getItemsByLayer

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
- 全局引入方式：在 `app.json` 的 `usingComponents` 中注册常用组件，页面级组件在各自 JSON 中引入。
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
| `t-avatar`                        | `tdesign-miniprogram/avatar/avatar`                       | 成员头像 / 我的页面头像    |
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
| `t-skeleton`                      | `tdesign-miniprogram/skeleton/skeleton`                   | 骨架屏（加载缓冲）         |
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
| `t-fab`                           | `tdesign-miniprogram/fab/fab`                             | **悬浮按钮（右下角 FAB）** |
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
  border-radius: 24rpx;
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
  user_fridge —— 用户-冰箱关联及角色
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
│   ├── 加载中态 → 骨架屏（t-skeleton）缓冲，禁止直接显示"还没有冰箱"
│   ├── 无冰箱 → 引导创建卡片 + 右下角浮动圆形按钮（t-fab，主题色）
│   ├── 有冰箱 → 默认冰箱入口卡片（view.card + t-cell + t-badge + t-tag）
│   ├── 右下角浮动圆形按钮（t-fab，主题色）→ 创建冰箱
│   ├── 切换冰箱入口（t-action-sheet）
│   └── 临期物品列表（t-cell-group + t-swipe-cell 右滑删除 / 点击进入详情）
│
├── 冰箱页（pages/fridge）
│   ├── 拟物冰箱结构图（t-grid 或原生 grid，双开门左右/单开门上下，含恒温层）
│   ├── 冰箱表格右上角 ⚙️设置图标（t-navbar rightIcon 插槽）
│   ├── 点击某层 → 展开该层物品列表（t-collapse / t-collapse-panel）
│   ├── 层内物品：右滑删除（t-swipe-cell）/ 点击进入详情（不折叠层）
│   └── 冰箱表格正下方 ➕添加物品按钮（独立 view.add-item-bar，居中）
│
├── 冰箱创建/编辑页（pages/fridge-create）
│   ├── 【最上方】实时预览区（拟物冰箱预览，配置即变）
│   ├── 类型选择（双开门/单开门）→ t-radio-group
│   ├── 各分区行（可删除）：
│   │     每行右上角 🗑️删除按钮（t-icon name="delete"）
│   │     分区名称(t-input)、温度类型(t-radio-group)、层数(t-stepper)
│   ├── 「+ 添加分区」按钮（t-button size="small"）
│   ├── 恒温层开关(t-switch) + 配置
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
│   ├── 所有者可：改角色（t-dropdown-menu + t-dropdown-item）
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
    ├── 微信头像 + 昵称（chooseAvatar + nickname 授权）
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

#### 4.2.1 创建/编辑冰箱（V1.4.0 重构）

**入口**：首页右下角浮动按钮 / 首页无冰箱时的引导卡片 / 我的-冰箱管理。

**页面布局**（自上而下，**预览置顶**）：

1. **【最上方】实时预览区**（V1.4.0 强制置顶）
   - 根据下方配置，同步渲染拟物冰箱预览（见 4.3 渲染规则，含恒温层位置与渐变色）。
   - 用 `view class="preview-box"` 包裹，固定高度约 `400rpx`，背景为浅灰圆角区域。
   - 配置任何一项（门型/分区/层数/恒温层），预览**立即变化**，无需点保存就能看到效果。

2. **冰箱名称**：`t-input`，placeholder "如：客厅冰箱"。

3. **门型选择**：`t-radio-group`，选项「单开门」「双开门」。

4. **分区列表**（动态渲染，**每个分区可单独删除**）：
   - 每一行用 `view class="zone-row"` 包裹，包含：
     - 分区名称：`t-input`（默认"冷藏区"/"冷冻区"）
     - 温度类型：`t-radio-group`，「冷藏」「冷冻」
     - 层数：`t-stepper`，最小值1，最大值6
     - **右上角删除按钮**：`t-icon name="delete"` 或 `t-button` theme="danger" size="small" variant="text"，点击弹出 `t-dialog` 二次确认后删除该分区
   - 分区行用 `t-swipe-cell` 也可以（右滑出现删除），但**推荐直接显示删除图标**，操作更直观。
   - 至少保留 1 个分区，不能全部删除。

5. **「+ 添加分区」按钮**：`t-button` size="small" variant="outline"，点击后追加一个新的分区行（默认"新分区"、冷藏、1层）。

6. **恒温层开关**（V1.2）：`t-switch` "是否包含恒温层"。开启后：
   - 双开门：恒温层横置于左右两列**下方**，占满整行。
   - 单开门：恒温层置于冷藏区与冷冻区**中间**。
   - 恒温层名称可编辑（默认"恒温区"），层数可配置 1~2 层。
   - 开启后同样在预览区实时显示。

7. **保存按钮**：底部固定 `t-button` type="primary" size="large"，loading 态防重复提交。

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

**创建/编辑后**：

- 云函数 `createFridge` / `updateFridge` 写入后，若从冰箱页进入，需**刷新冰箱页数据**。
- 详见 4.9 节「数据返回自动刷新」。

#### 4.2.2 冰箱列表管理

- 我的-冰箱管理：使用 `t-cell-group` + `t-cell` 展示所有冰箱（**不使用 t-list**），右侧 `t-swipe-cell` 提供"编辑/删除"操作。
- "编辑"跳转冰箱创建/编辑页（带 fridgeId，可修改名称、门型、分区层数、恒温层开关等）。
- 删除前弹出 `t-dialog` 二次确认。注意：删除冰箱时**级联删除**其下所有 `items` 记录 + 关联的 `user_fridge` 记录 + 云存储中的图片文件。同时，若该冰箱是某用户（`users.defaultFridgeId`）的默认冰箱，云函数 `deleteFridge` 须一并清理该字段，避免悬空引用导致首页默认冰箱查询异常（V1.5.0 新增）。

### 4.3 冰箱页（核心页面）

> ⚠️ **加载失败处理（V1.5.0）**：`getFridgeDetail` 调用失败时页面须进入错误态（显示错误提示 + 「重新加载」按钮），**不得**回退为展示占位冰箱名（如"客厅冰箱"）的空壳；权限失效/弱网场景下尤需保证可见反馈。

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

> 颜色仅作用于**该层卡片背景**和**展开后列表行的背景**，文字保持深色保证可读性。使用 `t-tag` 在每层卡片右上角显示状态文字（"安全"/"临期X天"/"今天到期"/"已过期"）。当 `diffDays === 0` 时显示"今天到期"而非"临期0天"（V1.5.0 调整，前后端一致）。

#### 4.3.3 点击展开物品列表（V1.4.0 修改：点击物品不折叠）

- 点击某层 → 使用 `t-collapse` + `t-collapse-panel` 或页面内展开动画，在该层下方展开物品列表。
- 列表容器用 `t-cell-group`，列表项用 `t-cell` 包裹在 `t-swipe-cell` 内：左为物品缩略图（`t-image` width=80rpx，优先显示用户上传图片，无图片则显示所选图标），中为名称+保质期文字，右为数量 `t-badge`。
- **右滑出现删除按钮**：`t-swipe-cell` 右侧暴露红色"删除"按钮，点击后弹出 `t-dialog` 二次确认，确认后从云数据库 `items` 集合删除该物品并刷新列表。
- **点击列表项（非删除按钮区域）→ 跳转至物品详情页**（pages/item-detail），携带 `itemId`。**此操作不会折叠（收起）该层**——用户从详情页返回后，层仍然保持展开状态。
- **实现要点**：用 `t-collapse` 的 `value`（受控模式）控制展开/收起，点击物品跳转时不修改 `value`，返回时层自然保持展开。
- 列表行背景色继承该物品自身的状态色（规则同上）。
- 列表最下方固定一个 `+ 添加物品` 行（`t-cell` + `t-icon`），点击进入添加物品页并**自动带入当前层的位置参数**。

#### 4.3.4 冰箱页图标位置规范（V1.4.0 重构）

> ⚠️ **冰箱页右上角禁止放置任何自定义控件**（与微信胶囊按钮冲突，详见 8.8.7）。

| 位置               | 放什么      | 用什么组件                                  | 说明               |
| ------------------ | ----------- | ------------------------------------------- | ------------------ |
| 冰箱**表格右上角** | ⚙️ 设置图标 | `t-navbar` 的 `rightIcon` 插槽              | 点击进入冰箱设置页 |
| 冰箱**表格正下方** | ➕ 添加物品 | 独立 `<view class="add-item-bar">` 居中按钮 | 点击进入添加物品页 |
| ❌ 页面右上角      | 什么都不放  | —                                           | 避免和胶囊重叠     |

**WXML 结构**：

```xml
<!-- 冰箱页 fridge.wxml -->
<t-navbar title="{{fridgeName}}" left-arrow>
  <!-- 设置图标放 navbar 的 rightIcon 插槽（表格右上角） -->
  <view slot="rightIcon" class="nav-right-btn" bindtap="onOpenSettings">
    <t-icon name="setting" size="40rpx" />
  </view>
</t-navbar>

<!-- 冰箱拟物表格 -->
<view class="fridge-body">
  <view class="fridge-grid">
    <!-- 冷藏区各层 -->
    <view class="zone cold-zone">...</view>
    <!-- 恒温层（若有） -->
    <view class="zone constant-zone" wx:if="{{hasConstantZone}}">...</view>
    <!-- 冷冻区各层 -->
    <view class="zone freeze-zone">...</view>
  </view>
</view>

<!-- 添加物品按钮：表格正下方，独立区域 -->
<view class="add-item-bar">
  <t-button theme="primary" size="large" icon="add" bindtap="onAddItem">
    添加物品
  </t-button>
</view>
```

**WXSS**：

```css
/* navbar 右侧设置图标 */
.nav-right-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--td-brand-color, #ff9f45);
  color: #fff;
}

/* 冰箱表格主体 */
.fridge-body {
  padding: 24rpx;
  padding-bottom: 160rpx; /* 给底部添加按钮留空间 */
}

/* 添加物品按钮：表格正下方，居中固定 */
.add-item-bar {
  position: fixed;
  bottom: calc(40rpx + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 48rpx;
  z-index: 99;
}
.add-item-bar t-button {
  width: 100%;
  border-radius: 40rpx;
}
```

### 4.4 添加/编辑物品

#### 4.4.1 入口

- 冰箱页**表格正下方**的「添加物品」按钮（`t-button` theme="primary"）→ 自动填充当前冰箱，需用户选择具体层。
- 某层展开列表最下方 `+ 添加物品` → 自动填充位置。

> ⚠️ 冰箱页**不使用左上角 + 号按钮**（V1.3.4 的方案已废弃）。所有添加入口统一放在表格下方或层列表底部，避免与胶囊按钮产生任何位置冲突。

#### 4.4.2 表单字段

| 字段                    | 组件                                                     | 规则                                       |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------ |
| 物品名称                | `t-input`                                                | 必填，最多20字                             |
| 物品图片/图标（二选一） | `t-tabs` + `t-tab-panel` 切换：`t-upload` 或图标选择面板 | 选填，见下方 4.4.3                         |
| 数量                    | `t-stepper`                                              | 默认1，最小值1，最大值999                  |
| 保质期                  | `t-datetime-picker`（mode="date"）                       | 必填，不能选过去日期                       |
| 存放位置                | `t-cascader`（分区→层）                                  | 第一级选分区（冷藏/冷冻/恒温），第二级选层 |

- 表单外层包裹 `t-form`，提交时做校验，未通过时在对应字段下方用 `t-toast` 提示。
- 保存按钮：`t-button` type="primary"，点击后显示 loading 态，成功则 `t-toast` "保存成功"。
- **保存后跳转行为**（V1.4.0）：
  - 若从冰箱页进入 → `wx.navigateBack()` 返回冰箱页 → **冰箱页自动刷新该层物品列表**（详见 4.9 节）。
  - 若从首页临期列表进入 → `wx.navigateBack()` 返回首页 → **首页自动刷新临期列表**。

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

**返回刷新**（V1.4.0）：从详情页 `wx.navigateBack()` 返回上一页（冰箱页或首页）时，上一页**必须自动刷新**对应数据列表（详见 4.9 节）。

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
  3. 云函数内部调用微信 `wxacode.getUnlimited` 生成小程序码，`scene` 采用**定长无分隔符编码**：`fridgeId`（标准 `_id` 24 字符）+ `roleCode`（2 字符，`rw`=readwrite / `ro`=readonly）+ `dayTs`（自纪元起天数的 base36，约 3~4 字符），总长 ≈29 字符，远低于微信 32 字符上限；云函数内对 `scene.length > 32` 兜底返回明确错误。`page` 设为 `pages/scan-result/scan-result`。扫码端（scan-result）向后兼容旧 `fridgeId|role|dayTs` 分隔符格式（旧码 7 天有效期内仍可识别，V1.5.0 调整）。
  4. 返回 buffer → 上传至云存储 `qrcodes/${fridgeId}_${Date.now()}.png` → 返回临时 URL。
  5. 前端用 `t-qrcode` 或 `t-image` 展示二维码 + "保存到相册" `t-button`。
- 二维码有效期：7 天（云函数在扫码时校验 timestamp）。

#### 4.7.2 权限说明

- **只读（readonly）**：可查看冰箱结构、物品列表、保质期状态，**不可**添加/修改/删除物品，**不可**修改冰箱设置。
- **可读写（readwrite）**：拥有除"管理成员"和"删除冰箱"之外的全部操作权限。
- **所有者（owner）**：唯一拥有全部权限，包括转让所有权、移除成员、删除冰箱。
- **UI 表现（V1.5.0）**：冰箱页中"删除物品"与"添加物品"按钮对 **readonly** 成员**直接隐藏**（通过页面 `role` 数据 + `wx:if` 分支），避免其点击后由服务端拒绝而"无反应"；owner/readwrite 正常显示。

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

### 4.9 数据返回自动刷新（V1.4.0 新增）

> ⚠️ **核心规则**：从任何子页面（添加物品、编辑物品、物品详情、冰箱创建/编辑）返回首页或冰箱页时，**上一页必须自动重新拉取数据并刷新视图**，不得显示旧数据。

#### 4.9.0 刷新触发场景总览

| 操作                  | 返回目标页    | 需要刷新的数据            |
| --------------------- | ------------- | ------------------------- |
| 添加物品成功          | 冰箱页        | 该层物品列表 + 该层状态色 |
| 编辑物品保存成功      | 冰箱页 / 首页 | 对应物品信息 + 临期列表   |
| 删除物品成功          | 冰箱页 / 首页 | 对应列表 + 临期列表       |
| 创建冰箱成功          | 首页          | 冰箱入口卡片列表          |
| 编辑冰箱成功          | 冰箱页 / 首页 | 冰箱结构 + 预览           |
| 删除冰箱成功          | 首页          | 冰箱入口卡片列表          |
| 加入冰箱成功（扫码）  | 首页          | 冰箱入口卡片列表          |
| 移除成员 / 转让所有权 | 冰箱设置页    | 成员列表                  |

#### 4.9.1 实现方案：onShow + 数据版本号

**方案 A：使用 `onShow` 生命周期（推荐，最简单）**

在需要刷新的页面（`pages/index`、`pages/fridge`）的 `onShow` 中调用数据加载函数：

```javascript
// pages/fridge/fridge.js
Page({
  data: {
    fridgeId: "",
    fridgeData: null,
    loading: true,
    layerItems: {}, // { layerId: [items] }
  },

  onLoad(options) {
    this.fridgeId = options.fridgeId || "";
    // onLoad 只做初始化，不请求数据
  },

  onShow() {
    // 每次页面显示（包括从子页面返回）都重新拉取数据
    this.loadFridgeData();
  },

  async loadFridgeData() {
    this.setData({ loading: true });
    try {
      const data = await cloud.call("getFridgeDetail", {
        fridgeId: this.fridgeId,
      });
      // 计算每个层的物品和状态色
      const layerItems = this.computeLayerItems(data);
      this.setData({
        fridgeData: data,
        layerItems,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  // 计算每层状态色
  computeLayerItems(fridgeData) {
    // ...按 zoneId + layerId 分组物品，计算最早过期时间
  },
});
```

**方案 B：使用 `getCurrentPages` 回调解耦（复杂场景备选）**

子页面保存成功后，直接调用上一页的刷新方法：

```javascript
// pages/item-edit/item-edit.js —— 保存成功后
const pages = getCurrentPages();
const prevPage = pages[pages.length - 2]; // 上一页
if (prevPage && prevPage.loadFridgeData) {
  prevPage.loadFridgeData(); // 主动触发刷新
}
wx.navigateBack();
```

> **推荐方案 A**：`onShow` 方案更简洁、更可靠，无需关心页面栈深度。唯一代价是每次页面显示都会请求一次网络，但冰箱数据量小（≤500 条），开销可忽略。

#### 4.9.2 首页加载缓冲（V1.4.0 强制）

**三态状态机**：首页 `onLoad` / `onShow` 必须按以下逻辑处理，**禁止**在数据加载完成前显示"还没有冰箱"：

```javascript
// pages/index/index.js
Page({
  data: {
    pageState: "loading", // 'loading' | 'empty' | 'hasFridge'
    fridgeList: [],
    defaultFridge: null,
    expiringItems: [],
    refreshing: false,
  },

  onLoad() {
    // 初始化为 loading，不假设有没有冰箱
    this.setData({ pageState: "loading" });
  },

  onShow() {
    // 每次显示都重新检查（从子页面返回时也会触发）
    this.checkFridgeAndLoad();
  },

  async checkFridgeAndLoad() {
    try {
      const data = await cloud.call("getFridgeList", {});
      const list = data.list || [];

      if (list.length === 0) {
        // 真的没有冰箱
        this.setData({
          pageState: "empty",
          fridgeList: [],
          expiringItems: [],
        });
      } else {
        // 有冰箱 → 加载默认冰箱详情 + 临期列表
        const defaultFridge = list[0];
        const [fridgeDetail, expiring] = await Promise.all([
          cloud.call("getFridgeDetail", { fridgeId: defaultFridge._id }),
          cloud.call("getExpiringItems", {}),
        ]);
        this.setData({
          pageState: "hasFridge",
          fridgeList: list,
          defaultFridge,
          expiringItems: expiring.items || [],
        });
      }
    } catch (e) {
      // 网络错误时也进入 empty，但提示重试
      this.setData({ pageState: "empty" });
      wx.showToast({ title: "加载失败，下拉重试", icon: "none" });
    } finally {
      this.setData({ refreshing: false });
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.checkFridgeAndLoad();
  },
});
```

**对应 WXML（三态条件渲染）**：

```xml
<!-- 状态一：加载中 → 骨架屏缓冲 -->
<view class="page-container" wx:if="{{pageState === 'loading'}}">
  <view class="loading-wrap">
    <!-- 冰箱卡片骨架 -->
    <t-skeleton theme="paragraph" loading="{{true}}" :rows="2" />
    <!-- 临期列表骨架 -->
    <view class="skeleton-list">
      <t-skeleton theme="paragraph" loading="{{true}}" :rows="3" />
    </view>
    <view class="loading-tip">
      <t-loading text="正在加载冰箱数据..." size="40rpx" />
    </view>
  </view>
</view>

<!-- 状态二：真的没有冰箱 -->
<view class="page-container" wx:elif="{{pageState === 'empty'}}">
  <view class="empty-wrap">
    <t-empty
      icon="add-circle"
      description="还没有冰箱"
      sub-description="创建一个冰箱，开始记录食材的存放位置与保质期"
    />
    <t-button theme="primary" size="large" bindtap="onCreateFridge">
      创建冰箱
    </t-button>
  </view>
</view>

<!-- 状态三：有冰箱 → scroll-view + pull-down-refresh -->
<view class="page-container" wx:else>
  <t-pull-down-refresh
    value="{{refreshing}}"
    bindrefresh="onPullDownRefresh"
  >
    <scroll-view scroll-y class="fridge-scroll">
      <!-- 默认冰箱入口卡片 -->
      <view class="card fridge-card" bindtap="onTapFridge">
        <t-cell
          title="{{defaultFridge.name}}"
          description="{{defaultFridge.doorType === 'double' ? '双开门' : '单开门'}}"
          note="{{expiringItems.length}} 件临期"
          arrow
        >
          <t-tag slot="note" theme="warning" wx:if="{{expiringItems.length > 0}}">临期</t-tag>
        </t-cell>
      </view>

      <!-- 临期物品列表 -->
      <view class="section-title">临期提醒</view>
      <t-cell-group>
        <t-swipe-cell wx:for="{{expiringItems}}" wx:key="_id" right="{{swipeRight}}">
          <t-cell
            title="{{item.name}}"
            description="到期：{{item.expireDate}}"
            arrow
            bindtap="onTapItem"
            data-id="{{item._id}}"
          >
            <t-tag slot="note" theme="{{item.status === 'expired' ? 'danger' : 'warning'}}">
              {{item.status === 'expired' ? '已过期' : '临期' + item.daysLeft + '天'}}
            </t-tag>
          </t-cell>
        </t-swipe-cell>
      </t-cell-group>
      <t-empty wx:if="{{expiringItems.length === 0}}" description="暂无临期物品 🎉" />
    </scroll-view>
  </t-pull-down-refresh>
</view>

<!-- 右下角浮动圆形按钮（全三态通用） -->
<t-fab
  class="fab-create"
  icon="add"
  aria-label="创建冰箱"
  bindclick="onCreateFridge"
/>
```

**对应 WXSS**：

```css
/* 骨架屏容器 */
.loading-wrap {
  padding: 48rpx 32rpx;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.loading-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48rpx 0;
}

/* 空状态 */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 32rpx;
}

/* 有冰箱：scroll-view 真正需要滚动时才出现滚动条 */
.fridge-scroll {
  height: calc(100vh - env(safe-area-inset-bottom) - 120rpx);
}
.page-container {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 48rpx 32rpx;
  background: var(--td-bg-color-page, #faf8f5);
}

/* 右下角浮动按钮：跟随主题色 */
.fab-create {
  position: fixed;
  right: 40rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  z-index: 999;
}
.fab-create .t-fab {
  background: var(--td-brand-color, #ff9f45) !important;
  color: #fff !important;
  width: 96rpx !important;
  height: 96rpx !important;
  border-radius: 50% !important;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15) !important;
}
```

**关键约束**：

- `wx:if` 与 `wx:elif` 与 `wx:else` 必须是**兄弟节点**，确保三种 DOM 不会同时存在于页面上。
- 加载中分支**不得**出现 `scroll-view`、`t-pull-down-refresh` 等可滚动/可下拉容器，只用 `t-skeleton` + `t-loading`。
- 有冰箱分支才使用 `scroll-view` + `t-pull-down-refresh`，保证内容超出时才出现滚动条和下拉刷新行为。
- `onShow` 中调用 `checkFridgeAndLoad()`，确保从子页面返回时自动刷新。

#### 4.9.3 首页完整逻辑伪代码

```
onLoad:
  set pageState = 'loading'
  显示骨架屏（t-skeleton + t-loading）

onShow:
  call checkFridgeAndLoad()
    → cloud.getFridgeList()
    → if 空: set pageState = 'empty'（显示引导卡片 + 右下角 FAB）
    → if 有: set pageState = 'hasFridge'（显示冰箱卡片 + 临期列表 + 右下角 FAB）
    → 失败时: set pageState = 'empty' + toast 提示

点击冰箱卡片 → navigateTo 冰箱页（携带 fridgeId）
点击临期列表项 → navigateTo 物品详情页（携带 itemId）
右滑临期列表项 → 删除按钮 → 二次确认后删除 → 刷新列表

右下角 FAB 点击 → navigateTo 冰箱创建页
```

### 4.10 我的页面与主题切换（V1.4.0 重写）

**我的页面布局**（用 `t-cell-group` 分组，**不使用 t-list**）：

#### 4.10.1 微信头像与昵称（V1.4.0 强制）

> ⚠️ **微信隐私政策要求**：2022 年后 `wx.getUserInfo` 不再返回真实头像昵称。必须使用专用组件让用户**主动点击授权**。

**头像获取**：使用 `button` 的 `open-type="chooseAvatar"`，点击后弹出微信头像选择器：

```xml
<!-- pages/mine/mine.wxml -->
<view class="profile-header">
  <!-- 头像按钮：点击弹出微信头像选择器 -->
  <button
    class="avatar-btn"
    open-type="chooseAvatar"
    bindchooseavatar="onChooseAvatar"
  >
    <image
      class="avatar-img"
      src="{{avatarUrl || '/assets/default-avatar.png'}}"
      mode="aspectFill"
    />
  </button>

  <!-- 昵称输入：type="nickname" 调起微信昵称键盘 -->
  <input
    class="nickname-input"
    type="nickname"
    value="{{nickname}}"
    placeholder="点击设置昵称"
    placeholder-class="nickname-placeholder"
    bindblur="onNicknameInput"
    maxlength="20"
  />
</view>
```

```javascript
// pages/mine/mine.js
const cloud = require("../../utils/cloud.js");

Page({
  data: {
    avatarUrl: "",
    nickname: "",
  },

  onShow() {
    // 每次显示都从云函数拉取最新用户信息
    this.loadUserProfile();
  },

  async loadUserProfile() {
    try {
      const user = await cloud.call("getUserInfo", {});
      this.setData({
        avatarUrl: user.avatarUrl || "",
        nickname: user.nickname || "",
      });
    } catch (e) {
      console.error("加载用户信息失败", e);
    }
  },

  // 用户选择头像后回调
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail; // 临时路径
    // 1. 先显示本地预览
    this.setData({ avatarUrl });
    // 2. 上传到云存储
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${Date.now()}.png`,
        filePath: avatarUrl,
      });
      // 3. 更新云数据库
      await cloud.call("updateUserProfile", {
        avatarUrl: uploadRes.fileID,
      });
      wx.showToast({ title: "头像已更新", icon: "success" });
    } catch (err) {
      wx.showToast({ title: "头像更新失败", icon: "none" });
    }
  },

  // 昵称输入完成
  async onNicknameInput(e) {
    const nickname = e.detail.value.trim();
    if (!nickname) return;
    if (nickname === this.data.nickname) return;
    try {
      await cloud.call("updateUserProfile", { nickname });
      this.setData({ nickname });
      wx.showToast({ title: "昵称已更新", icon: "success" });
    } catch (err) {
      wx.showToast({ title: "更新失败", icon: "none" });
    }
  },
});
```

```css
/* 头像区域样式 */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx 48rpx;
  background: var(--td-brand-color, #ff9f45);
  border-radius: 0 0 40rpx 40rpx;
}
.avatar-btn {
  padding: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid #fff;
  background: rgba(255, 255, 255, 0.3);
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.nickname-input {
  margin-top: 24rpx;
  font-size: 36rpx;
  color: #fff;
  text-align: center;
  background: transparent;
  border: none;
}
.nickname-placeholder {
  color: rgba(255, 255, 255, 0.7);
}
```

**隐私协议声明**（V1.4.0 强制）：在 `app.json` 中必须声明以下权限，否则头像昵称组件无法正常工作：

```json
{
  "permission": {
    "scope.userInfo": {
      "desc": "用于展示您的头像和昵称"
    }
  },
  "requiredPrivateInfos": ["chooseAvatar", "nickname"]
}
```

**隐私授权弹窗（V1.5.0 新增）**：在 `app.json` 顶层增加 `"__usePrivacyCheck__": true`，并在 `app.js` 的 `onLaunch` 中调用 `wx.getPrivacySetting` → 若 `needAuthorization` 为真则主动 `wx.requirePrivacyAuthorize` 弹出微信原生隐私授权框（文案取 MP 后台「用户隐私保护指引」）。开启后，`chooseAvatar` / `wx.chooseMedia` / `wx.saveImageToPhotosAlbum` 等隐私接口在用户未授权时会自动弹框，无需页面逐一处理。注意：弹窗仅在隐私指引已在 MP 后台**发布**后才会出现，未发布时静默降级不阻塞启动。

```json
{
  "__usePrivacyCheck__": true,
  "permission": {
    "scope.userInfo": {
      "desc": "用于展示您的头像和昵称"
    }
  },
  "requiredPrivateInfos": ["chooseAvatar", "nickname"]
}
```

**云函数 `updateUserProfile`**：

```javascript
// cloudfunctions/updateUserProfile/index.js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: "未登录" };

  const updateData = { updatedAt: db.serverDate() };
  if (event.avatarUrl) updateData.avatarUrl = event.avatarUrl;
  if (event.nickname) updateData.nickname = event.nickname;

  const exist = await db.collection("users").where({ _openid: OPENID }).get();
  if (exist.data.length === 0) {
    return { code: -2, msg: "用户不存在" };
  }

  await db.collection("users").doc(exist.data[0]._id).update({
    data: updateData,
  });

  return { code: 0, msg: "更新成功" };
};
```

#### 4.10.2 主题切换

**外观设置 / 主题风格**（分组标题）：

- 使用 `t-radio-group` 横向排列 4 个主题选项，每个选项用 `view class="card"` 包裹色块预览 + 主题名（**不使用 t-card**）。
- 选项：`温暖家居`（默认选中）/ `清新健康` / `现代简约` / `可爱圆润`。
- 切换时即时预览（当前页立即换肤），同时弹出 `t-toast` "主题已切换"。

**主题切换实现要点**：

- 默认主题：`warm`（写入 `users.theme` 默认值）。
- 切换流程：用户点击主题 → 调用云函数 `updateUserTheme({ theme })` → 更新 `users.theme` → 更新本地缓存 → 调用全局 `app.refreshTheme()` → 设置 `page[data-theme]` → 全局 WXSS 变量即时生效。
- 切换失败回滚：若云数据库更新失败，本地不切换，提示 `t-toast` "切换失败，请重试"。

#### 4.10.3 其他设置项

| 分组     | 内容                                                              |
| -------- | ----------------------------------------------------------------- |
| 冰箱管理 | `t-cell` 进入冰箱列表（编辑/删除）                                |
| 通知设置 | `t-switch` 临期提醒总开关 + `t-radio-group` 提前天数（1/3/5/7天） |
| 关于     | 隐私协议入口（`t-dialog` 展示）                                   |

---

## 五、交互与体验规范

### 5.1 流畅性要求

- 列表超过 20 条时必须使用**分页加载**或 `t-pull-down-refresh` + 上拉加载更多，禁止一次性渲染全部数据。
- 图片使用 `t-image` 的懒加载属性，缩略图压缩至 ≤200rpx 边长。
- 页面切换使用标准 `wx.navigateTo`/`redirectTo`，禁止多层嵌套（深度≤5）。
- 冰箱结构图（层数≤12）可一次性渲染，但每层卡片需是轻量 DOM。

### 5.2 加载与状态反馈（强制）

所有异步操作必须有状态提示，不得出现"无响应"黑盒：

| 场景         | 反馈组件                          | 示例文案                |
| ------------ | --------------------------------- | ----------------------- |
| 页面初次加载 | `t-skeleton` 骨架屏 + `t-loading` | "正在加载冰箱数据…"     |
| 提交表单     | 按钮 `loading` 属性               | —                       |
| 上传图片     | `t-toast` "上传中…" + 进度        | —                       |
| 生成二维码   | 全屏 `t-loading`                  | "正在生成分享码…"       |
| 扫码验证中   | 全屏 `t-loading`                  | "正在验证…"             |
| 加载更多     | 列表底部 `t-loading`              | "加载中…"               |
| 操作成功     | `t-toast`                         | "保存成功"              |
| 操作失败     | `t-toast` 或 `t-dialog`           | "网络异常，请重试"      |
| 权限不足     | `t-message` 或 `t-toast`          | "暂无编辑权限"          |
| 空状态       | `t-empty`                         | "暂无物品，点击 + 添加" |

### 5.3 通用交互组件约定

- 确认类弹窗 → `t-dialog`（带标题、内容、确认/取消按钮）。
- 底部菜单 → `t-action-sheet`。
- 全局轻提示 → `t-toast`，duration 2000ms。
- 底部导航 → `t-tab-bar`（首页 / 我的）。
- 列表容器 → `t-cell-group` + `t-cell`（**禁止用 t-list**）。
- 卡片容器 → 原生 `view class="card"` + 内部 TDesign 组件（**禁止用 t-card**）。
- 右下角悬浮按钮 → `t-fab`（**禁止用 position:fixed 手写圆形按钮**，直接用 TDesign 的 FAB 组件，自动跟随主题色）。

### 5.4 数据刷新约定（V1.4.0 新增）

- 所有页面**必须**在 `onShow` 中调用数据加载函数，确保从子页面返回时自动刷新。
- 禁止在 `onLoad` 中只加载一次数据后不再更新。
- 下拉刷新（`t-pull-down-refresh`）必须触发完整的数据重新拉取。
- 删除/保存操作成功后，除 `navigateBack` 外，还必须确保上一页 `onShow` 能拿到最新数据（通过 `onShow` 方案天然满足）。

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

| 页面路径                              | 说明                                                                      | 主要 TDesign 组件（均经白名单核验）                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pages/index/index                     | 首页（三态：loading骨架屏/empty引导/hasFridge列表 + 右下角FAB）           | t-skeleton, t-loading, view.card, t-empty, t-button, t-fab, t-action-sheet, t-swipe-cell, t-cell, t-cell-group, t-badge, t-tag, t-pull-down-refresh, scroll-view |
| pages/fridge/fridge                   | 冰箱页（拟物结构图 + 恒温层 + 设置图标在表格右上角 + 添加按钮在表格下方） | t-navbar, t-grid, t-cell, t-badge, t-tag, t-collapse, t-image, t-swipe-cell, t-button                                                                            |
| pages/fridge-create/fridge-create     | 创建/编辑冰箱（**预览置顶** + 分区可删除 + 添加分区按钮）                 | t-input, t-radio-group, t-stepper, t-switch, t-button, t-dialog, t-icon, t-swipe-cell                                                                            |
| pages/item-edit/item-edit             | 添加/编辑物品（图片+图标 Tab）                                            | t-form, t-input, t-upload, t-stepper, t-datetime-picker, t-cascader, t-tabs, t-tab-panel, t-button                                                               |
| pages/item-detail/item-detail         | 物品详情（编辑保存 / 删除）                                               | view.card, t-cell-group, t-image, t-tag, t-badge, t-button, t-dialog                                                                                             |
| pages/fridge-settings/fridge-settings | 冰箱设置（编辑/成员/分享/删除）                                           | t-cell-group, t-button, t-dialog                                                                                                                                 |
| pages/member-manage/member-manage     | 成员管理（角色修改/移除/转让）                                            | t-cell-group, t-cell, t-avatar, t-tag, t-dropdown-menu, t-dropdown-item, t-action-sheet, t-dialog                                                                |
| pages/share-qrcode/share-qrcode       | 分享二维码（选权限 + 生成 + 保存）                                        | t-radio-group, t-loading, t-qrcode, t-image, t-button                                                                                                            |
| pages/scan-result/scan-result         | 扫码结果处理（校验 + 加入确认）                                           | t-loading, t-dialog, t-toast                                                                                                                                     |
| pages/mine/mine                       | 我的（**微信头像昵称授权** + 主题切换 + 设置 + 关于）                     | t-cell-group, t-cell, t-avatar, t-switch, t-radio-group, t-tab-bar, button(open-type)                                                                            |

### 7.2 跳转关系

- 首页 → 冰箱页（带 fridgeId）
- 首页 → 冰箱创建页（无 fridgeId 时为新建）
- 首页临期列表 → 物品详情页（带 itemId）
- 冰箱页 → 物品详情页（带 itemId，点击列表项，**不折叠层**）
- 冰箱页 → 冰箱设置页（带 fridgeId，通过右上角设置图标）
- 冰箱页 → 物品编辑页（带 zoneId + layerId，通过下方添加按钮）
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
     traceUser: true,
   });
   ```
3. **依赖安装**：云函数如需使用第三方包（如 `wx-server-sdk`），在每个云函数目录下执行 `npm install wx-server-sdk --production`。

### 8.2 云数据库集合设计

#### 8.2.1 集合列表

| 集合名称      | 用途                   | 权限控制     |
| ------------- | ---------------------- | ------------ |
| `users`       | 存储用户信息及主题偏好 | 仅云函数读写 |
| `fridges`     | 冰箱结构数据           | 仅云函数读写 |
| `items`       | 物品记录               | 仅云函数读写 |
| `user_fridge` | 用户-冰箱关联及角色    | 仅云函数读写 |

#### 8.2.2 集合索引建议

- `items` 集合：
  - 索引 `{ fridgeId: 1, zoneId: 1, layerId: 1 }` —— 加速按冰箱区域查询物品
  - 索引 `{ expireDate: 1 }` —— 加速临期查询
  - 索引 `{ notified: 1, expireDate: 1 }` —— 加速定时提醒查询
- `user_fridge` 集合：
  - 索引 `{ userId: 1 }` —— 加速获取用户所有冰箱
  - 索引 `{ fridgeId: 1 }` —— 加速获取冰箱所有成员
- `fridges` 集合：
  - 索引 `{ _openid: 1 }` —— 加速查询用户创建的冰箱

#### 8.2.3 数据模型（JSON Schema 示例）

**users 集合**：

```json
{
  "_id": "自动生成",
  "_openid": "微信 openid",
  "nickname": "张三",
  "avatarUrl": "cloud://...",
  "theme": "warm",
  "notifyEnabled": true,
  "notifyDays": 3,
  "createdAt": "2026-08-06T10:00:00Z",
  "updatedAt": "2026-08-06T10:00:00Z"
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

| 云函数名称          | 触发方式     | 功能描述                                                         |
| ------------------- | ------------ | ---------------------------------------------------------------- |
| `login`             | HTTP 调用    | 微信登录，获取 openid，创建/更新 users 记录（含 theme 默认值）   |
| `getUserInfo`       | HTTP 调用    | 获取当前用户信息（含头像、昵称、主题）                           |
| `updateUserProfile` | HTTP 调用    | 更新用户头像/昵称（V1.4.0 新增）                                 |
| `updateUserTheme`   | HTTP 调用    | 更新用户主题偏好 `users.theme`                                   |
| `createFridge`      | HTTP 调用    | 创建冰箱，写入 fridges + user_fridge（role=owner）               |
| `updateFridge`      | HTTP 调用    | 修改冰箱结构/名称，校验 owner                                    |
| `deleteFridge`      | HTTP 调用    | 删除冰箱 + 级联删除 items / user_fridge / 云存储文件，校验 owner |
| `getFridgeList`     | HTTP 调用    | 获取当前用户所有冰箱（通过 user_fridge 联表查询）                |
| `getFridgeDetail`   | HTTP 调用    | 获取冰箱详情及物品列表（按权限过滤）                             |
| `addItem`           | HTTP 调用    | 添加物品，校验 write 权限（role≠readonly）                       |
| `updateItem`        | HTTP 调用    | 修改物品，校验 write 权限                                        |
| `deleteItem`        | HTTP 调用    | 删除物品，校验 write 权限，同步删除云存储图片                    |
| `getExpiringItems`  | HTTP 调用    | 获取用户所有冰箱临期物品（聚合查询）                             |
| `generateQRCode`    | HTTP 调用    | 生成带参数的小程序码（调用 wxacode.getUnlimited）                |
| `joinFridge`        | HTTP 调用    | 扫码后加入冰箱，写入 user_fridge                                 |
| `manageMember`      | HTTP 调用    | 修改成员角色 / 移除成员 / 转让所有权，校验 owner                 |
| `checkExpiry`       | **定时触发** | 每日凌晨扫描临期物品并发送订阅消息                               |

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
| createFridge / getUserInfo / updateUserProfile                       | 已登录即可                            |
| updateFridge / updateUserTheme                                       | owner                                 |
| deleteFridge                                                         | owner                                 |
| addItem / updateItem / deleteItem                                    | owner 或 readwrite                    |
| getFridgeList / getFridgeDetail / getExpiringItems | 已登录即可（自动按 user_fridge 过滤） |
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
    const res = await db.collection("users").add({
      data: {
        _openid: OPENID,
        nickname: "微信用户",
        avatarUrl: "",
        theme: "warm",
        notifyEnabled: true,
        notifyDays: 3,
        createdAt: now,
        updatedAt: now,
      },
    });
    return { code: 0, data: { _id: res._id, _openid: OPENID, theme: "warm" } };
  } else {
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

**（2）getUserInfo —— 获取用户信息（V1.4.0 新增）**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: "未登录" };

  const res = await db.collection("users").where({ _openid: OPENID }).get();
  if (res.data.length === 0) return { code: -2, msg: "用户不存在" };

  return { code: 0, data: res.data[0] };
};
```

**（3）updateUserProfile —— 更新头像/昵称（V1.4.0 新增）**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: "未登录" };

  const updateData = { updatedAt: db.serverDate() };
  if (event.avatarUrl) updateData.avatarUrl = event.avatarUrl;
  if (event.nickname) updateData.nickname = event.nickname;

  const exist = await db.collection("users").where({ _openid: OPENID }).get();
  if (exist.data.length === 0) return { code: -2, msg: "用户不存在" };

  await db.collection("users").doc(exist.data[0]._id).update({
    data: updateData,
  });

  return { code: 0, msg: "更新成功" };
};
```

**（4）generateQRCode —— 生成分享小程序码**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { fridgeId, role } = event;
  if (!["readonly", "readwrite"].includes(role))
    return { code: -1, msg: "role 非法" };

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

  // 定长无分隔符 scene：fridgeId(24) + roleCode(2) + dayTs(base36)，总长≈29（远低于 32 上限）
  const roleCode = role === 'readwrite' ? 'rw' : 'ro'
  const dayTs = Math.floor(Date.now() / 86400000).toString(36)
  const scene = `${fridgeId}${roleCode}${dayTs}`
  if (scene.length > 32) {
    return { code: -3, msg: '分享码过长，请稍后重试' }
  }
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene,
    page: "pages/scan-result/scan-result",
    checkPath: false,
    width: 430,
  });

  const upload = await cloud.uploadFile({
    cloudPath: `qrcodes/${fridgeId}_${Date.now()}.png`,
    fileContent: result.buffer,
  });

  const urlResult = await cloud.getTempFileURL({ fileList: [upload.fileID] });
  return {
    code: 0,
    data: { fileID: upload.fileID, url: urlResult.fileList[0].tempFileURL },
  };
};
```

**（5）joinFridge —— 扫码加入冰箱**

```javascript
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { fridgeId, role } = event;

  const fridge = await db.collection("fridges").doc(fridgeId).get();
  if (!fridge.data) return { code: -1, msg: "冰箱不存在或已失效" };

  const exist = await db
    .collection("user_fridge")
    .where({
      userId: OPENID,
      fridgeId,
    })
    .get();
  if (exist.data.length > 0) return { code: -2, msg: "你已加入该冰箱" };

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

**（6）checkExpiry —— 定时临期扫描**

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

  const items = await db
    .collection("items")
    .where({
      notified: false,
      expireDate: _.lte(threeDaysLater).and(_.gte(now)),
    })
    .get();

  const byFridge = {};
  items.data.forEach((item) => {
    if (!byFridge[item.fridgeId]) byFridge[item.fridgeId] = [];
    byFridge[item.fridgeId].push(item);
  });

  for (const [fridgeId, expiringItems] of Object.entries(byFridge)) {
    const members = await db
      .collection("user_fridge")
      .where({
        fridgeId,
        role: _.in(["owner", "readwrite"]),
      })
      .get();

    for (const member of members.data) {
      const user = await db
        .collection("users")
        .where({ _openid: member.userId })
        .get();
      if (user.data.length === 0 || !user.data[0].notifyEnabled) continue;

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: member.userId,
          templateId: "YOUR_TEMPLATE_ID",
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

- **用途**：存储用户上传的物品图片、用户头像、生成的二维码图片。
- **目录规划**：
  - `images/items/{itemId}/` —— 物品图片（每张 ≤2MB）
  - `avatars/` —— 用户头像（V1.4.0 新增）
  - `qrcodes/` —— 分享二维码
- **上传方式**：前端通过 `wx.cloud.uploadFile` 上传，成功后在云函数 `addItem`/`updateItem`/`updateUserProfile` 中写入对应集合的 URL 字段。
- **删除联动**：云函数 `deleteItem` 和 `deleteFridge` 中同步调用 `cloud.deleteFile({ fileList: [...] })` 清理云存储文件，避免垃圾数据。
- **权限**：云存储默认仅管理员可读写，前端通过 `wx.cloud.getTempFileURL` 获取临时链接展示。

### 8.5 前端调用云函数统一封装

建议在 `utils/cloud.js` 中封装统一调用方法：

```javascript
// utils/cloud.js
const TIMEOUT_MS = 15000; // 云函数调用超时（V1.5.0 新增）

function call(name, data = {}, opts = {}) {
  return new Promise((resolve, reject) => {
    // 超时控制（V1.5.0）：超过 TIMEOUT_MS 视为失败，避免前端无限挂起
    const timer = setTimeout(() => {
      if (!opts.silent) wx.showToast({ title: "请求超时，请重试", icon: "none" });
      reject(new Error("call timeout"));
    }, opts.timeout || TIMEOUT_MS);

    const done = (fn) => (arg) => {
      clearTimeout(timer);
      fn(arg);
    };

    wx.cloud.callFunction({
      name,
      data,
      success: done((res) => {
        const result = res.result || {};
        if (result.code === 0) resolve(result.data);
        else {
          // 后端返回结构化 {code, msg}（写入类云函数已 try/catch 权限异常），调用方可据此区分"权限不足"等
          if (!opts.silent) wx.showToast({ title: result.msg || "操作失败", icon: "none" });
          reject(result);
        }
      }),
      fail: done((err) => {
        console.error(`[cloud] ${name} error:`, err);
        if (!opts.silent) wx.showToast({ title: "网络错误，请重试", icon: "none" });
        reject(err);
      }),
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
│   ├── getUserInfo/
│   ├── updateUserProfile/    （V1.4.0 新增）
│   ├── updateUserTheme/
│   ├── createFridge/
│   ├── updateFridge/
│   ├── deleteFridge/
│   ├── getFridgeList/
│   ├── getFridgeDetail/
│   ├── addItem/
│   ├── updateItem/
│   ├── deleteItem/
│   ├── getExpiringItems/
│   ├── generateQRCode/
│   ├── joinFridge/
│   ├── manageMember/
│   ├── checkExpiry/
│   └── _shared/
│       └── auth.js          （公共鉴权模块）
├── miniprogram/
│   ├── app.js
│   ├── app.wxss            （4套主题 CSS 变量定义 + .card 通用卡片样式 + .fab-create 主题色）
│   ├── app.json             （含 requiredPrivateInfos: chooseAvatar/nickname）
│   ├── pages/
│   │   ├── index/           （三态：loading/empty/hasFridge + 右下角 FAB）
│   │   ├── fridge/          （设置图标在 navbar 右上角 + 添加按钮在表格下方）
│   │   ├── fridge-create/   （预览置顶 + 分区可删除 + 添加分区）
│   │   ├── item-edit/
│   │   ├── item-detail/
│   │   ├── fridge-settings/
│   │   ├── member-manage/
│   │   ├── share-qrcode/
│   │   ├── scan-result/
│   │   └── mine/            （chooseAvatar + nickname 授权）
│   ├── components/
│   ├── utils/
│   │   ├── cloud.js         （云函数统一封装）
│   │   ├── theme.js         （refreshTheme 实现）
│   │   └── icons.js         （物品图标映射表）
│   └── assets/
│       └── icons/            （常见物品图标资源）
└── project.config.json       （含 cloudfunctionRoot + cloudDevelopment）
```

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
- 原因只有一个：**该云函数目录下的 `package.json` 没有声明 `wx-server-sdk` 依赖**。
- 常见触发场景：
  1. AI 生成云函数代码时只写了 `index.js`，**漏掉了 `package.json`**。
  2. `package.json` 存在但 `dependencies` 字段为空或缺少 `wx-server-sdk`。
  3. 上传时选了"不上传 node_modules"但云端安装又因 `package.json` 缺失依赖而失败。

**解决方案**（三选一）：

**方案 A：本地安装后上传（推荐调试阶段使用）**

```bash
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

然后在微信开发者工具中**右键该云函数目录** → 选择「上传并部署：云端安装依赖」。

**方案 C：锁定版本号（方案 B 失败时备用）**

```json
{ "dependencies": { "wx-server-sdk": "2.15.0" } }
```

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

> ⚠️ **每个云函数目录都要有自己的 `package.json`**。本项目共有 17 个云函数（`login`、`getUserInfo`、`updateUserProfile`、`updateUserTheme`、`createFridge`、`updateFridge`、`deleteFridge`、`getFridgeList`、`getFridgeDetail`、`addItem`、`updateItem`、`deleteItem`、`getExpiringItems`、`generateQRCode`、`joinFridge`、`manageMember`、`checkExpiry`），**每一个**目录下都必须有独立的 `package.json` 且声明 `wx-server-sdk` 依赖。

**共享模块 `_shared/` 的特殊说明**：

- `_shared/auth.js` 不是云函数，是**被其他云函数 `require` 的共享模块**。
- `_shared/` 目录下**不需要** `package.json`，也**不能**单独上传部署。
- 引用方式：在其他云函数的 `index.js` 顶部写 `const { checkFridgePermission } = require('../_shared/auth.js')`。
- 上传某个云函数时，工具会自动把 `require` 到的 `_shared/auth.js` 一起打包上传。

#### 8.8.3 错误二：上传并部署选项不出现

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

**根因**：`_shared/` 不是云函数，没有 `exports.main` 入口，工具不会将其识别为可部署单元。

**正确做法**：`_shared/auth.js` 通过相对路径被具体云函数 `require` 引入，跟随那个云函数一起打包上传。开发者只需上传具体的云函数目录即可。

#### 8.8.5 上传部署标准流程（SOP）

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

#### 8.8.6 错误四：首页空状态出现多余滚动条（V1.3.4 新增）

**根因**：`scroll-view` 的"可滚动"是内建行为，与内容是否溢出无关——只要容器是 `scroll-view`，即使内容没溢出也会渲染滚动条。

**正确做法**：用 `wx:if` / `wx:elif` / `wx:else` 将"加载中/空状态/有冰箱"拆成**三套完全独立的 DOM 结构**（详见 4.9.2 节的完整代码）。

**核心原则**：

- 加载中 → `t-skeleton` + `t-loading`，**禁止**出现 `scroll-view`、`t-pull-down-refresh`。
- 空状态 → 普通 `<view>` 容器，**禁止**出现 `scroll-view`、`t-pull-down-refresh`。
- 有数据状态 → 才使用 `scroll-view` + `t-pull-down-refresh`。

#### 8.8.7 错误五：自定义按钮与小程序原生胶囊按钮重叠（V1.3.4 新增）

**根因**：微信小程序右上角的胶囊按钮是**系统级控件**，不受页面 CSS 控制。任何自定义控件放在右上角必然与之重叠。

**正确做法**（V1.4.0 更新）：

- 冰箱页设置图标 → 放在 `t-navbar` 的 `rightIcon` 插槽（框架自动避让胶囊）。
- 首页添加冰箱按钮 → 改用 `t-fab` **右下角浮动圆形按钮**（框架自带，自动跟随主题色）。
- 冰箱页添加物品按钮 → 放在冰箱表格**正下方**，不用 fixed 定位到右上角。
- **禁止使用 `position:fixed; top:0; right:0`** 放置任何自定义控件。

**位置规则速查**：

| 位置                           | 是否允许                | 推荐组件                     |
| ------------------------------ | ----------------------- | ---------------------------- |
| 右上角（fixed / absolute）     | ❌ **禁止**             | —                            |
| 左上角（navbar leftIcon 插槽） | ✅ 允许                 | `t-navbar` slot              |
| navbar rightIcon 插槽          | ✅ **推荐**（设置图标） | `t-navbar` slot              |
| 右下角浮动按钮                 | ✅ **推荐**（添加操作） | `t-fab`（自动跟随主题色）    |
| 页面内容区域内                 | ✅ 允许                 | 如列表顶部、卡片内           |
| 页面底部固定栏                 | ✅ 允许                 | 如 `t-tab-bar`、底部操作按钮 |

#### 8.8.8 错误六：首页闪烁"还没有冰箱"（V1.4.0 新增）

**错误现象**：首页一打开先闪一下"还没有冰箱"的空状态，然后才显示冰箱列表——用户体验极差。

**根因**：`onLoad` 中先 `setData({ pageState: 'empty' })` 或直接渲染了空状态分支，等异步数据回来才切换到有冰箱分支。即使网络很快，也会有几十毫秒的"闪屏"。

**正确做法**：

- `onLoad` 中**初始化为 `pageState: 'loading'`**，不假设有没有冰箱。
- 只有云函数**明确返回空数组**时，才切换到 `'empty'`。
- 网络失败时也进入 `'empty'`，但用 `t-toast` 提示"加载失败，下拉重试"。
- 完整代码见 4.9.2 节。

**验证方法**：

- 删掉所有冰箱 → 首页应显示骨架屏 → 数据回来后显示空状态引导（不是先空状态再骨架屏）。
- 有冰箱 → 首页应显示骨架屏 → 数据回来后显示冰箱卡片（不会先闪一下"还没有冰箱"）。

#### 8.8.9 错误七：从子页面返回后数据不刷新（V1.4.0 新增）

**错误现象**：在添加物品页保存成功后返回冰箱页，冰箱页显示的还是旧数据（新添加的物品看不到），必须手动下拉刷新才能看到。

**根因**：数据加载逻辑写在 `onLoad` 中，`onLoad` 只在页面**首次创建**时执行一次。从子页面 `navigateBack` 返回时，页面已经存在，`onLoad` 不会再次触发。

**正确做法**：

- 数据加载逻辑写在**独立的函数**中（如 `loadFridgeData()`）。
- `onLoad` 中只做参数初始化。
- `onShow` 中调用 `loadFridgeData()`——`onShow` 在每次页面显示时都会触发，包括从子页面返回。
- 完整代码见 4.9.1 节。

**验证方法**：

- 添加物品 → 返回冰箱页 → 新物品应立即出现在列表中，无需手动刷新。
- 删除物品 → 返回 → 该物品应立即消失。
- 创建冰箱 → 返回首页 → 新冰箱卡片应立即出现。

---

## 九、AI 代码生成提示词建议（强约束）

> 以下内容供将本文档喂给 AI 生成原型图或小程序代码时使用。**所有约束均为强制**。

### 9.1 组件白名单（最高优先级）

- **仅允许使用本文档第二章「TDesign 组件白名单」中列出的组件**，禁止引入任何不在白名单内的 TDesign 组件。
- **严禁使用 `t-card`**：所有"卡片"均用原生 `<view class="card">` 包裹 TDesign 组件实现，样式参考 2.3 节的 `.card` CSS 写法。
- **严禁使用 `t-list`**：所有列表均用 `<t-cell-group>` + 多个 `<t-cell>` 实现。
- **严禁使用 `t-select`**：所有"下拉选择"按 V1.3.1 规则替换（见 9.3）。
- **严禁手写圆形浮动按钮**：右下角悬浮按钮统一使用 `t-fab` 组件，自动跟随主题色。

### 9.2 通用约束

- **组件引用**：生成任何 WXML 时，优先使用 `tdesign-miniprogram` 组件。每个页面必须包含 `*.wxml` `*.wxss` `*.js` `*.json` 四个文件，并在 `*.json` 的 `usingComponents` 中声明所用 TDesign 组件路径。
- **样式约束**：颜色、间距、圆角一律用 TDesign CSS 变量（`--td-*`），禁止硬编码。主题相关的色值使用 `page[data-theme="warm|fresh|modern|cute"]` 选择器覆盖。
- **状态反馈**：所有异步函数必须配套 `t-toast` 或 `t-loading`，不得出现无提示等待。

### 9.3 下拉选择：四选一规则（V1.3.1）

- 页面内嵌下拉菜单 → `t-dropdown-menu` + `t-dropdown-item`
- 表单内底部弹出滚轮选择 → `t-picker`（单位、存放位置级联等）
- 少量选项的底部面板 → `t-action-sheet`（编辑/删除操作、更改角色等）
- 2~3 个选项的平铺选择 → `t-radio-group`（门型、恒温层开关、通知提前天数等）

### 9.4 数据层（强约束）

- 使用微信云开发（CloudBase），数据库集合命名为 `fridges`、`items`、`users`、`user_fridge`，**禁止客户端直连数据库**，所有读写通过 `wx.cloud.callFunction` 调用云函数。
- 鉴权模板：每个云函数开头必须 `require('./_shared/auth.js')` 中的 `checkFridgePermission(fridgeId, allowedRoles)`。
- **每个云函数必须包含 `package.json`**：`dependencies` 中**必须声明 `"wx-server-sdk": "~2.6.3"`**。缺少此依赖会导致云端报 `Cannot find module 'wx-server-sdk'`（详见 8.8.1 节）。
- **`_shared/` 目录不是云函数**：没有 `package.json`，不能单独上传，通过 `require('../_shared/auth.js')` 被具体云函数引入。

### 9.5 业务规则

- **主题系统**：必须在 `app.wxss` 定义 4 套 CSS 变量（warm/fresh/modern/cute），`app.js` 中实现 `refreshTheme(theme)` 全局方法。默认值为 `warm`。切换时调用云函数 `updateUserTheme` 持久化。
- **图标选择**：添加/编辑物品页用 `t-tabs` + `t-tab-panel` 切"上传图片 / 选择图标"两栏；图标面板用 `t-grid` + `t-grid-item` 按 8 大分类展示。
- **右滑删除**：临期列表与冰箱层物品列表一律用 `<t-swipe-cell>`，右侧暴露红色"删除"按钮，点击后弹 `<t-dialog>` 二次确认。
- **物品详情页**：独立页面 `pages/item-detail`，展示完整信息 + 编辑保存/删除两个底部按钮，删除需二次确认。
- **冰箱布局**：双开门用 CSS Grid 两列左右排布（左冷藏右冷冻，恒温层在下方占满整行）；单开门单列纵向（冷藏在上、恒温层在中、冷冻在下）。每层用大圆角渐变背景模拟抽屉。
- **点击物品不折叠层**（V1.4.0）：冰箱层用 `t-collapse` 受控模式，点击物品跳转时不修改 `value`，返回时层保持展开。
- **二维码分享**：使用云函数 `generateQRCode` 调用 `cloud.openapi.wxacode.getUnlimited`，scene 采用**定长无分隔符编码** `fridgeId(24)+roleCode(2)+dayTs(base36)`（详见 4.7.1 与 8.3.3），扫码端（scan-result）向后兼容旧 `fridgeId|role|dayTs` 格式（V1.5.0 调整）。
- **定时提醒**：云函数 `checkExpiry` 的 `config.json` 必须包含 `"triggers": [{"type":"timer","config":"0 0 1 * * * *"}]`。
- **云存储清理**：删除物品/冰箱时，云函数中同步调用 `cloud.deleteFile` 清理关联文件。

### 9.6 前端布局硬约束（V1.3.4 + V1.4.0 更新）

#### 9.6.1 首页三态条件渲染（强制）

- 必须使用 `wx:if` / `wx:elif` / `wx:else` 将"加载中/空状态/有冰箱"渲染为**三套完全独立的 DOM**。
- **加载中分支**：用 `t-skeleton` + `t-loading`，**禁止**出现 `scroll-view` 和 `t-pull-down-refresh`。
- **空状态分支**：用普通 `<view class="page-container">`，**禁止**出现 `scroll-view` 和 `t-pull-down-refresh`。
- **有冰箱分支**：才使用 `scroll-view` + `t-pull-down-refresh`。
- `onLoad` 初始化为 `pageState: 'loading'`，**禁止**先假设为空状态。
- 参考 4.9.2 节的完整 WXML/WXSS/JS 代码。

#### 9.6.2 自定义按钮位置规范（强制）

- **禁止使用 `position:fixed; top:0; right:0`** 放置任何自定义控件（与胶囊按钮冲突）。
- **右下角浮动按钮**：统一使用 `t-fab` 组件（自动跟随主题色），不用手写圆形按钮。
- **设置类图标**：放在 `t-navbar` 的 `rightIcon` 插槽（框架自动避让胶囊）。
- **添加类按钮**：放在内容区域底部（如冰箱表格正下方），不用 fixed 定位到右上角。
- 参考 8.8.7 节的位置规则速查表。

#### 9.6.3 数据返回自动刷新（V1.4.0 强制）

- 所有页面的数据加载逻辑必须写在独立函数中，在 `onShow` 中调用（不仅在 `onLoad` 中）。
- 从子页面 `navigateBack` 返回时，`onShow` 会自动触发，数据自然刷新。
- 禁止只依赖 `onLoad` 一次性加载数据。
- 参考 4.9.1 节的完整代码示例。

#### 9.6.4 冰箱创建页规范（V1.4.0 强制）

- **实时预览区必须置顶**：放在页面最上方，配置变更时立即更新预览。
- **每个分区行必须有删除入口**：右上角放 `t-icon name="delete"` 或小型删除按钮，点击后 `t-dialog` 二次确认。
- 至少保留 1 个分区，禁止全部删除。
- 提供「+ 添加分区」按钮，点击追加新分区行。
- 参考 4.2.1 节的完整布局说明。

#### 9.6.5 我的页面头像昵称（V1.4.0 强制）

- 头像：使用 `<button open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">` 触发微信头像选择器。
- 昵称：使用 `<input type="nickname">` 调起微信昵称键盘。
- 头像选择后通过 `wx.cloud.uploadFile` 上传到云存储 `avatars/` 目录，再调用 `updateUserProfile` 更新 `users.avatarUrl`。
- `app.json` 必须声明 `"requiredPrivateInfos": ["chooseAvatar", "nickname"]`。
- `app.json` 顶层增加 `"__usePrivacyCheck__": true`，并在 `app.js` 的 `onLaunch` 中调用 `wx.getPrivacySetting` → 按需 `wx.requirePrivacyAuthorize` 弹出微信原生隐私授权框（V1.5.0 新增）。
- **禁止使用已废弃的 `wx.getUserInfo`**。
- 参考 4.10.1 节的完整 WXML/JS/CSS 代码。

---

## 十、附录：修订记录

| 版本       | 日期           | 修订人       | 修订内容                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | -------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0       | 2026-08-06     | 产品经理     | 初始版本：冰箱创建、物品管理、临期提醒                                                                                                                                                                                                                                                                                                                                              |
| v1.1       | 2026-08-06     | 产品经理     | 新增用户-冰箱关联表、二维码分享、权限管理                                                                                                                                                                                                                                                                                                                                           |
| v1.2       | 2026-08-06     | 产品经理     | 新增主题切换（4种）、右滑删除/点击详情、恒温层、图标选择、物品详情页                                                                                                                                                                                                                                                                                                                |
| v1.3       | 2026-08-06     | 产品经理     | 补全页面树；新增云开发实现方案（环境/集合/云函数/鉴权/存储）                                                                                                                                                                                                                                                                                                                        |
| v1.3.1     | 2026-08-06     | 产品经理     | 移除 `t-select`，按场景替换为 dropdown-menu/picker/action-sheet/radio-group                                                                                                                                                                                                                                                                                                         |
| v1.3.2     | 2026-08-06     | 产品经理     | 移除 `t-card`/`t-list`；新增 TDesign 组件白名单（65 个官方组件 + 替代方案）                                                                                                                                                                                                                                                                                                         |
| v1.3.3     | 2026-08-06     | 产品经理     | 新增云函数避坑指南：`wx-server-sdk` 依赖缺失的完整解决方案与预防措施                                                                                                                                                                                                                                                                                                                |
| v1.3.4     | 2026-08-06     | 产品经理     | 新增首页空状态滚动条避坑 + 自定义按钮与胶囊重叠避坑                                                                                                                                                                                                                                                                                                                                 |
| **v1.4.0** | **2026-08-07** | **产品经理** | **七大更新：①新增物品/编辑后返回自动刷新（onShow方案）②冰箱创建页预览置顶+分区可删除+添加分区按钮 ③首页添加冰箱改为右下角 t-fab 浮动圆形按钮跟随主题色 ④冰箱层点击物品不折叠（collapse受控模式）⑤我的页面显示微信头像昵称（chooseAvatar+type=nickname+云存储上传）⑥冰箱页图标重构（设置→navbar右上角/添加→表格下方）⑦首页三态加载缓冲（skeleton+loading，禁止先显示"还没有冰箱"）** |
| **v1.5.0** | **2026-08-19** | **开发（AI 辅助）** | **十二项缺陷修复闭环：①冰箱页加载失败错误态+「重新加载」、只读成员按 role 隐藏删除/添加按钮 ②call() 加 15s 超时 ③写入类云函数捕获权限异常返回结构化{code,msg} ④删除默认冰箱清理 defaultFridgeId ⑤分享码 scene 定长无分隔符编码+长度护栏（向后兼容旧格式）⑥接入微信隐私授权弹窗 ⑦临期0天改"今天到期" ⑧冰箱设置页加载失败错误态 ⑨删除/保存二维码失败细分提示 ⑩订阅授权同设备去重 ⑪预设图标 wx:key 改 *this ⑫移除死代码云函数 getItemsByLayer** |

---

**文档结束。**

如需生成原型图或开始编码，请将此文档作为上下文一并输入 AI 工具。文档中所有云函数签名、数据库字段、鉴权逻辑、组件白名单、布局约束、刷新机制均可直接作为 AI 生成代码的强约束依据。
