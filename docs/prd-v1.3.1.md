# 冰箱笔记小程序 产品需求文档（PRD）

> 版本：V1.3.1 ｜ 日期：2026-08-06 ｜ 状态：待评审
> 阅读对象：设计师 / 前端开发 / 后端开发 / AI 代码生成工具
> V1.1 修订：新增用户-冰箱关联表、二维码分享、权限管理
> V1.2 修订：新增主题切换（4种风格）、物品右滑删除/点击详情、冰箱恒温层、物品图标选择、物品详情页
> V1.3 修订：补全页面树、新增第七章「云开发实现方案（完整后端）」
> V1.3.1 修订：全局移除不存在的 `t-select` 组件，按场景替换为 `t-dropdown-menu`+`t-dropdown-item` / `t-action-sheet` / `t-picker` / `t-radio-group`，新增对应 AI 提示词约束

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

| 主题 Key | 主题名 | 主色 | 背景色 | 卡片圆角 | 特征描述 |
|---------|--------|------|--------|---------|---------|
| `warm` | 温暖家居（**默认**） | `#FF9F45` | `#FAF8F5` | 24rpx | 暖橙主色、米白底、柔和阴影，适合家庭场景 |
| `fresh` | 清新健康 | `#00B96B` | `#F7FAF8` | 16rpx | 青绿主色、薄荷辅色、大量留白，主打健康感 |
| `modern` | 现代简约 | `#007AFF` | `#F2F2F7` | 20rpx | 科技蓝、灰阶体系、毛玻璃效果，高级克制 |
| `cute` | 可爱圆润 | `#FF6B9D` | `#FFF0F5` | 32rpx | 草莓粉、鹅黄辅色、超大圆角胶囊按钮，活泼可爱 |

**实现机制**：
1. 在 `app.wxss` 中定义 4 套 CSS 变量块，以 `page[data-theme="warm"]` 等属性选择器区分。
2. 在 `app.js` 的 `onLaunch` 中调用云函数 `login` 获取用户信息（含 `theme` 字段），通过 `wx.setStorageSync('theme', value)` 缓存，并调用 `this.refreshTheme()` 全局设置 `page` 的 `data-theme` 属性。
3. 切换主题时：更新云数据库 `users.theme` → 更新本地缓存 → 重新设置 `data-theme` → 全局 WXSS 变量即时生效。
4. 状态色（安全绿/临期黄/过期红）在 4 套主题中**保持一致**，仅主色、背景、圆角、阴影变化，保证功能识别度不受主题影响。
5. 主题字段写入 `users` 集合：`{ "theme": "warm" }`，默认值为 `"warm"`。

**冰箱层状态色（全局统一，不随主题变化）**：

| 状态 | 触发条件 | 颜色值 |
|------|---------|--------|
| 安全绿 | 所有物品过期日 > 今天+3天 | `#52C41A` / `rgba(82,196,26,0.12)` |
| 临期黄 | 存在物品过期日 ≤ 今天+3天 且 > 今天 | `#FAAD14` / `rgba(250,173,20,0.15)` |
| 过期红 | 存在物品过期日 < 今天 | `#FF4D4F` / `rgba(255,77,79,0.15)` |

---

## 二、信息架构

### 2.1 数据实体关系

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
- `userId: string`      // 用户 openid
- `fridgeId: string`    // 冰箱 ID
- `role: 'owner' | 'readonly' | 'readwrite'`
- `joinedAt: timestamp`

### 2.2 完整页面树（V1.3 补全）

```
冰箱笔记
├── 首页（pages/index）
│   ├── 无冰箱 → 引导创建卡片（t-empty + t-button）
│   ├── 有冰箱 → 默认冰箱入口卡片 + 切换冰箱入口（t-action-sheet）
│   └── 临期物品列表（t-swipe-cell 右滑删除 / 点击进入详情）
│
├── 冰箱页（pages/fridge）
│   ├── 拟物冰箱结构图（表格状，双开门左右/单开门上下，含恒温层）
│   ├── 点击某层 → 展开该层物品列表（t-collapse）
│   ├── 层内物品：右滑删除（t-swipe-cell）/ 点击进入详情
│   └── 右上角「+」→ 添加物品页（需手动选位置）
│
├── 冰箱创建/编辑页（pages/fridge-create）
│   ├── 类型选择（双开门/单开门）
│   ├── 各分区：名称、温度类型、层数
│   ├── 恒温层开关 + 配置（V1.2）
│   ├── 实时预览拟物冰箱
│   └── 保存 / 删除（编辑模式下）
│
├── 添加/编辑物品页（pages/item-edit）
│   ├── 表单：名称、数量、保质期、位置
│   ├── Tab1 上传图片（t-upload，≤3张）
│   ├── Tab2 选择图标（常见物品图标面板，8大分类）（V1.2）
│   └── 保存 / 取消
│
├── 物品详情页（pages/item-detail）（V1.2 新增）
│   ├── 展示物品完整信息（大图/图标、名称、位置、倒计时 Tag、数量）
│   ├── 编辑保存（进入编辑模式 → 复用添加页表单预填）
│   └── 删除物品（t-dialog 二次确认）
│
├── 冰箱设置页（pages/fridge-settings）
│   ├── 编辑冰箱信息（名称、结构）（跳转 fridge-create 编辑模式）
│   ├── 成员管理（跳转 member-manage）
│   ├── 分享冰箱（跳转 share-qrcode）
│   └── 删除冰箱（owner 可见，t-dialog 二次确认）
│
├── 成员管理页（pages/member-manage）
│   ├── 列表展示所有成员（头像、昵称、角色）
│   ├── 所有者可：改角色（readonly ↔ readwrite）
│   ├── 所有者可：移除成员
│   └── 所有者可：转让所有权（需对方确认）
│
├── 分享二维码页（pages/share-qrcode）
│   ├── 选择分享权限（readonly / readwrite）t-radio-group
│   ├── 生成小程序码（调用云函数 generateQRCode）
│   ├── 展示二维码图片（t-image + t-loading）
│   └── 保存到相册按钮
│
├── 扫码结果页（pages/scan-result）
│   ├── 解析 scene 参数（fridgeId + role）
│   ├── 校验冰箱是否存在 / 是否已加入
│   ├── 弹出确认弹窗（是否加入 XXX 冰箱）
│   └── 确认 → 调用 joinFridge → 写入 user_fridge
│
└── 我的（pages/mine）
    ├── 微信授权登录（头像、昵称）
    ├── 外观设置 / 主题切换（4种风格 t-radio-group）（V1.2）
    ├── 冰箱管理（列表、编辑、删除）
    ├── 通知设置（临期提醒总开关 + 提前天数）
    └── 关于（隐私协议 t-dialog）
```

---

## 三、功能需求详述

### 3.1 用户与登录

#### 3.1.1 首次登录
- 调用 `wx.login` 获取 code → 调用云函数 `login` → 云函数内部用 `cloud.getWXContext()` 拿 openid → 查询 `users` 集合，不存在则新建（含 `theme: "warm"` 默认值），存在则更新最后登录时间。
- 返回用户信息（含 `theme`）→ 前端缓存并调用 `app.refreshTheme(theme)`。
- **不收集**手机号、真实昵称等敏感信息；昵称头像仅在用户主动点击授权时获取并脱敏存储。

#### 3.1.2 users 集合字段
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

### 3.2 冰箱管理

#### 3.2.1 创建冰箱（FridgeCreate）
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
5. **实时预览区**：根据上面配置，同步渲染拟物冰箱预览（见 3.3 渲染规则，含恒温层位置与渐变色）。
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
    "layers": [ { "layerId": "string", "index": 0, "name": "恒温层" } ]
  },
  "zones": [
    {
      "zoneId": "string",
      "name": "冷藏区",
      "tempType": "cold | freeze",
      "layers": [ { "layerId": "string", "index": 0, "name": "第1层" } ]
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**创建后**：云函数 `createFridge` 在写入 `fridges` 集合的同时，向 `user_fridge` 插入一条 `{ userId, fridgeId, role: "owner" }` 记录。

#### 3.2.2 冰箱列表管理
- 我的-冰箱管理：使用 `t-cell-group` + `t-cell` 展示所有冰箱，右侧 `t-swipe-cell` 提供"编辑/删除"操作。
- "编辑"跳转冰箱创建/编辑页（带 fridgeId，可修改名称、门型、分区层数、恒温层开关等）。
- 删除前弹出 `t-dialog` 二次确认。注意：删除冰箱时**级联删除**其下所有 `items` 记录 + 关联的 `user_fridge` 记录 + 云存储中的图片文件。

### 3.3 冰箱页（核心页面）

#### 3.3.1 拟物冰箱渲染规则
- 整体用 CSS Grid（`t-grid` 或原生 grid）实现**表格状**布局，模拟冰箱分层结构。
- **双开门冰箱**：左右两列排布，左列冷藏区、右列冷冻区，每列内按层数纵向排列。恒温层（若有）单独横置于两列**下方**，占满整行宽度。
- **单开门冰箱**：单列纵向排列，从上到下依次为「冷藏区各层 → 恒温层（若有）→ 冷冻区各层」，整体呈上下结构。
- 每一层是一个**可点击的卡片区块**，使用 `t-cell` 或自定义 `view` + `t-badge` 展示该层物品数量。
- 拟物视觉：每层用大圆角 + 柔和阴影模拟"抽屉"质感；冷藏层用浅蓝渐变（`linear-gradient(180deg,#E8F4FD,#D6EBFA)`），冷冻层用深蓝渐变（`linear-gradient(180deg,#DCEEFB,#BBDDF5)`），恒温层用暖米色渐变（`linear-gradient(180deg,#FFF6E9,#FFF0D9)`）。

#### 3.3.2 颜色状态规则（核心视觉）
根据**该层内所有物品中最早的过期时间**计算层级颜色：

| 状态 | 触发条件 | 背景色值 | 说明 |
|------|---------|---------|------|
| 安全（绿） | 所有物品过期日 > 今天+3天 | `rgba(82,196,26,0.12)` | 无临期风险 |
| 临期（黄） | 存在物品过期日 ≤ 今天+3天 且 > 今天 | `rgba(250,173,20,0.15)` | 需尽快食用 |
| 过期（红） | 存在物品过期日 < 今天 | `rgba(255,77,79,0.15)` | 已过期 |

> 颜色仅作用于**该层卡片背景**和**展开后列表行的背景**，文字保持深色保证可读性。使用 `t-tag` 在每层卡片右上角显示状态文字（"安全"/"临期X天"/"已过期"）。

#### 3.3.3 点击展开物品列表
- 点击某层 → 使用 `t-collapse` 或页面内展开动画，在该层下方展开物品列表。
- 列表项使用 `t-swipe-cell` 包裹 `t-cell`：左为物品缩略图（`t-image` width=80rpx，优先显示用户上传图片，无图片则显示所选图标），中为名称+保质期文字，右为数量 `t-badge`。
- **右滑出现删除按钮**：`t-swipe-cell` 右侧暴露红色"删除"按钮，点击后弹出 `t-dialog` 二次确认，确认后从云数据库 `items` 集合删除该物品并刷新列表。
- **点击列表项（非删除按钮区域）**：跳转至物品详情页（pages/item-detail），携带 `itemId`。
- 列表行背景色继承该物品自身的状态色（规则同上）。
- 列表最下方固定一个 `+ 添加物品` 行，点击进入添加物品页并**自动带入当前层的位置参数**。

### 3.4 添加/编辑物品

#### 3.4.1 入口
- 冰箱页右上角 `+` 图标按钮（`t-icon` name="add"）→ 需用户手动选择位置。
- 某层展开列表最下方 `+ 添加物品` → 自动填充位置。

#### 3.4.2 表单字段

| 字段 | 组件 | 规则 |
|------|------|------|
| 物品名称 | `t-input` | 必填，最多20字 |
| 物品图片/图标（二选一） | Tab 切换：`t-upload` 或图标选择面板 | 选填，见下方 3.4.3 |
| 数量 | `t-stepper` | 默认1，最小值1，最大值999 |
| 保质期 | `t-date-time-picker`（mode="date"） | 必填，不能选过去日期 |
| 存放位置 | 两个级联 `t-picker` 或 `t-cascader` | 第一级选分区（冷藏/冷冻/恒温），第二级选层（第1层/第2层…） |

- 表单外层包裹 `t-form`，提交时做校验，未通过时在对应字段下方用 `t-toast` 提示。
- 保存按钮：`t-button` type="primary"，点击后显示 `t-loading` 或按钮内置 loading 态，成功则 `t-toast` "保存成功" 并 `wx.navigateBack`。

#### 3.4.3 物品图片与图标选择（V1.2）

提供 **两种可视化标识方式**，用户通过顶部 `t-tabs` 切换：

**Tab 1：上传图片**（默认）
- 使用 `t-upload`，选填，最多 3 张，单张 ≤2MB，支持拍照/相册，上传到云存储。
- 上传中显示 `t-toast` "上传中…" + 进度。

**Tab 2：选择图标**（无图时的轻量替代）
- 提供**常见物品图标库**，按分类横向滚动展示，用户点击选中后高亮。
- 图标库内置分类与示例（使用 TDesign `t-icon` 或自定义 SVG 图标）：

| 分类 | 示例图标关键词 |
|------|--------------|
| 乳制品 | 牛奶、酸奶、奶酪、黄油 |
| 蔬菜水果 | 苹果、香蕉、西红柿、生菜 |
| 肉禽蛋 | 鸡蛋、鸡肉、猪肉、牛肉 |
| 饮料 | 果汁、可乐、矿泉水、茶 |
| 调味品 | 酱油、醋、盐、油 |
| 速冻食品 | 饺子、汤圆、冰淇淋、冷冻蔬菜 |
| 熟食主食 | 面包、米饭、面条、三明治 |
| 其他 | 默认盒子图标 |

- 图标选择为**单选**，选中后存入 `item.icon` 字段（存图标 key 字符串，如 `"milk"`），展示时映射为对应图片/图标组件。
- 优先级：若用户上传了图片，则列表/详情优先显示图片；若无图片但有图标，则显示图标；两者皆无则显示默认占位图标。

#### 3.4.4 数据结构
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

### 3.5 物品详情页（V1.2 新增）

**入口**：冰箱页某层展开列表中，点击物品列表项（非右滑删除区域）；或首页临期列表中点击物品。

**页面布局**（自上而下）：
1. **头部**：物品缩略图/图标（大图展示，`t-image` width=200rpx），右侧物品名称（大字）+ 数量 `t-badge`。
2. **信息卡片**（`t-cell-group`）：
   - 存放位置：`冷藏区 > 第1层`（可点击跳转对应冰箱层）
   - 保质期：日期 + 剩余天数 `t-tag`（绿/黄/红）
   - 添加时间、更新时间
3. **操作按钮区**（底部固定）：
   - `t-button` theme="primary" 文字"编辑保存" → 进入编辑模式（字段可修改，同添加物品页表单）
   - `t-button` theme="danger" 文字"删除物品" → 弹出 `t-dialog` 二次确认后删除并 `wx.navigateBack`

**编辑模式**：
- 页面顶部加 `t-tag` 标识"编辑中"。
- 表单字段与 3.4.2 一致（名称、图片/图标、数量、保质期、位置），预填当前物品数据。
- 保存时调用云函数 `updateItem` 更新 `items` 集合对应记录，成功后 `t-toast` "保存成功" 并退出编辑模式。
- 删除操作不可逆，需二次确认。

### 3.6 首页临期物品列表（V1.2 新增）

**位置**：首页默认冰箱卡片下方，标题"临期提醒"，使用 `t-cell-group`。

**规则**：
- 聚合该用户所有冰箱中**临期（≤3天）和已过期**的物品，按过期时间升序排列。
- 每项使用 `t-swipe-cell` 包裹 `t-cell`：
  - 左：物品缩略图/图标 + 名称 + 保质期倒计时 `t-tag`（黄/红）
  - 右：数量 `t-badge`
- **右滑出现删除按钮**：红色"删除"，点击后 `t-dialog` 二次确认，确认后从 `items` 集合删除并刷新列表。
- **点击列表项**：跳转至物品详情页（pages/item-detail），携带 `itemId`。
- 空状态：若无非安全物品，显示 `t-empty` "暂无临期物品 🎉"。

### 3.7 冰箱分享与权限

#### 3.7.1 生成分享二维码
- 入口：冰箱设置页 → "分享冰箱" → 跳转 share-qrcode 页。
- 操作步骤：
  1. 用户选择分享权限（只读 readonly / 可读写 readwrite），使用 `t-radio-group`。
  2. 点击"生成二维码" → 调用云函数 `generateQRCode({ fridgeId, role })`。
  3. 云函数内部调用微信 `wxacode.getUnlimited` 生成小程序码，`scene` 编码为 `fridgeId|role|timestamp`，`page` 设为 `pages/scan-result/scan-result`。
  4. 返回 buffer → 上传至云存储 `qrcodes/${fridgeId}_${Date.now()}.png` → 返回临时 URL。
  5. 前端 `t-image` 展示二维码 + "保存到相册" `t-button`。
- 二维码有效期：7 天（云函数在扫码时校验 timestamp）。

#### 3.7.2 权限说明
- **只读（readonly）**：可查看冰箱结构、物品列表、保质期状态，**不可**添加/修改/删除物品，**不可**修改冰箱设置。
- **可读写（readwrite）**：拥有除"管理成员"和"删除冰箱"之外的全部操作权限。
- **所有者（owner）**：唯一拥有全部权限，包括转让所有权、移除成员、删除冰箱。

#### 3.7.3 扫码加入
- 用户使用微信"扫一扫"扫描小程序码 → 微信自动打开 `pages/scan-result/scan-result` 并传入 `scene` 参数。
- scan-result 页面解析 scene → 调用云函数 `joinFridge({ fridgeId, role })`：
  - 校验 fridgeId 存在且未过期。
  - 校验当前用户未加入过该冰箱。
  - 弹出 `t-dialog` 确认："是否加入 [冰箱名称]？你将获得 [只读/可读写] 权限。"
  - 确认后写入 `user_fridge` 表 → `t-toast` "加入成功" → 跳转首页刷新冰箱列表。

#### 3.7.4 成员管理
- 入口：冰箱设置页 → "成员管理" → member-manage 页。
- 展示所有成员的头像、昵称、角色（`t-list` + `t-avatar` + `t-tag`）。
- 所有者可：
  - 更改成员角色（readonly ↔ readwrite），使用 `t-dropdown-menu` + `t-dropdown-item` 内嵌下拉选择，或使用 `t-action-sheet` 底部弹出选择面板（选项较少时优先用 action-sheet）。
  - 移除成员（被移除者不再能看到该冰箱），`t-dialog` 二次确认。
  - 转让所有权（需对方确认，通过云函数通知），`t-action-sheet` 选择新所有者。

### 3.8 临期提醒

- **触发规则**：每日凌晨定时任务（云函数 `checkExpiry`，cron `0 1 * * *`）扫描所有物品，对 `expireDate` 在**今天+提前天数（默认3天）内**且**未过期**的物品，向物品所属冰箱中 `role != 'readonly'` 的成员推送订阅消息。
- **推送方式**：微信订阅消息（一次性/长期，按用户授权情况）。
- **推送内容**：物品名称、存放位置、剩余天数、跳转路径（指向对应冰箱层）。
- **用户设置**：我的-通知设置，使用 `t-switch` 控制"临期提醒"总开关，以及 `t-radio-group` 选择提前天数（1天/3天/5天/7天）。
- 推送后更新 `items.notified = true`，避免重复推送。

### 3.9 首页逻辑

```
onLoad:
  if (用户无冰箱) → 显示"创建冰箱"引导卡片（t-empty + t-button）
  else → 显示默认冰箱卡片（t-card：冰箱名、门型图标、物品总数、临期数）
         + "切换冰箱"入口（t-action-sheet 底部弹出所有冰箱）
         + 临期物品列表（t-swipe-cell 右滑删除 / 点击进入详情）
  点击冰箱卡片 → 跳转冰箱页（携带 fridgeId）
  点击临期列表项 → 跳转物品详情页（携带 itemId）
  右滑临期列表项 → 删除按钮 → 二次确认后删除
```

### 3.10 我的页面与主题切换（V1.2 新增）

**我的页面布局**（`t-cell-group` 分组）：

1. **用户信息区**：头像（微信头像）、昵称，点击触发授权登录。
2. **外观设置 / 主题风格**（分组标题）：
   - 使用 `t-radio-group` 横向排列 4 个主题卡片，每个卡片内显示主题色块预览 + 主题名。
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

## 四、交互与体验规范

### 4.1 流畅性要求
- 列表超过 20 条时必须使用**分页加载**或 `t-pull-down-refresh` + 上拉加载更多，禁止一次性渲染全部数据。
- 图片使用 `t-image` 的懒加载属性，缩略图压缩至 ≤200rpx 边长。
- 页面切换使用标准 `wx.navigateTo`/`redirectTo`，禁止多层嵌套（深度≤5）。
- 冰箱结构图（层数≤12）可一次性渲染，但每层卡片需是轻量 DOM。

### 4.2 加载与状态反馈（强制）
所有异步操作必须有状态提示，不得出现"无响应"黑盒：

| 场景 | 反馈组件 | 示例文案 |
|------|---------|---------|
| 页面初次加载 | `t-loading` 骨架屏 或 `t-skeleton` | — |
| 提交表单 | 按钮 `loading` 属性 | — |
| 上传图片 | `t-toast` "上传中…" + 进度 | — |
| 生成二维码 | 全屏 `t-loading` | "正在生成分享码…" |
| 扫码验证中 | 全屏 `t-loading` | "正在验证…" |
| 加载更多 | 列表底部 `t-loading` | "加载中…" |
| 操作成功 | `t-toast` | "保存成功" |
| 操作失败 | `t-toast` 或 `t-dialog` | "网络异常，请重试" |
| 权限不足 | `t-message` 或 `t-toast` | "暂无编辑权限" |
| 空状态 | `t-empty` | "暂无物品，点击 + 添加" |

### 4.3 通用交互组件约定
- 确认类弹窗 → `t-dialog`（带标题、内容、确认/取消按钮）。
- 底部菜单 → `t-action-sheet`。
- 全局轻提示 → `t-toast`，duration 2000ms。
- 底部导航 → `t-tab-bar`（首页 / 我的）。

---

## 五、非功能需求

| 类别 | 要求 |
|------|------|
| 性能 | 首屏加载 ≤ 1.5s（4G网络），页面切换无白屏；冰箱/物品列表 ≤ 500 条时无明显卡顿 |
| 兼容性 | 微信基础库 ≥ 2.30.0，iOS/Android 主流机型适配；TDesign ≥ 1.3.0 |
| 安全 | 仅云开发数据库，用户隔离；不采集敏感信息；HTTPS/云函数加密传输；客户端禁止直连数据库 |
| 可维护性 | 代码按 pages / components / utils / cloudfunctions 分层；组件化复用 |
| 埋点 | 关键行为（创建冰箱、添加物品、收到提醒点击）上报，便于迭代 |

---

## 六、页面清单与跳转关系

### 6.1 页面清单

| 页面路径 | 说明 | 主要 TDesign 组件 |
|---------|------|-----------------|
| pages/index/index | 首页（冰箱入口 + 临期列表） | t-card, t-empty, t-button, t-action-sheet, t-swipe-cell, t-cell, t-badge, t-tag |
| pages/fridge/fridge | 冰箱页（拟物结构图 + 恒温层 + 右滑删除） | t-grid, t-cell, t-badge, t-tag, t-collapse, t-image, t-swipe-cell |
| pages/fridge-create/fridge-create | 创建/编辑冰箱（含恒温层开关 + 实时预览） | t-input, t-radio-group, t-stepper, t-switch, t-button, t-dialog |
| pages/item-edit/item-edit | 添加/编辑物品（图片+图标 Tab） | t-form, t-input, t-upload, t-stepper, t-date-time-picker, t-cascader, t-tabs, t-button |
| pages/item-detail/item-detail | 物品详情（编辑保存 / 删除） | t-cell-group, t-image, t-tag, t-badge, t-button, t-dialog |
| pages/fridge-settings/fridge-settings | 冰箱设置（编辑/成员/分享/删除） | t-cell-group, t-button, t-dialog |
| pages/member-manage/member-manage | 成员管理（角色修改/移除/转让） | t-list, t-avatar, t-tag, t-dropdown-menu, t-dropdown-item, t-action-sheet, t-dialog |
| pages/share-qrcode/share-qrcode | 分享二维码（选权限 + 生成 + 保存） | t-radio-group, t-loading, t-image, t-button |
| pages/scan-result/scan-result | 扫码结果处理（校验 + 加入确认） | t-loading, t-dialog, t-toast |
| pages/mine/mine | 我的（登录 + 主题切换 + 设置 + 关于） | t-cell-group, t-cell, t-switch, t-radio-group, t-tab-bar |

### 6.2 跳转关系

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

## 七、云开发实现方案（完整后端）

> 本章节为 V1.3 新增，详细描述使用**微信小程序云开发（CloudBase）**构建后端的完整实现方式。AI 在生成代码时应严格遵循本章的云函数签名、数据库结构、鉴权模板和安全规则。

### 7.1 环境准备

1. **开通云开发**：小程序管理后台 → 开发 → 云开发，创建一个**按量计费环境**（推荐），记录环境 ID（如 `fridge-note-prod`）。
2. **项目初始化**：在 `app.js` 中调用：
   ```javascript
   wx.cloud.init({
     env: 'fridge-note-prod',
     traceUser: true   // 记录用户访问
   })
   ```
3. **云函数依赖**：在云函数目录下如需第三方包（如 `dayjs`），执行 `npm install dayjs --production`，并在云函数根目录保留 `package.json` 和 `node_modules`。
4. **基础库版本**：`project.config.json` 中设置 `libVersion: "2.30.0"`。

### 7.2 云数据库集合设计

#### 7.2.1 集合清单与权限

| 集合名称 | 用途 | 客户端权限 | 读写方式 |
|----------|------|-----------|---------|
| `users` | 用户信息 + 主题偏好 | 仅管理员 | 仅云函数 |
| `fridges` | 冰箱结构定义 | 仅管理员 | 仅云函数 |
| `items` | 物品记录 | 仅管理员 | 仅云函数 |
| `user_fridge` | 用户-冰箱关联及角色 | 仅管理员 | 仅云函数 |

> **安全规则**：所有集合的权限统一设置为「仅创建者可读写」**并在客户端代码中禁止直连**，所有读写都通过云函数代理。云函数内使用 `cloud.database()` 拥有完整管理权限。

在集合的 `securityRules` 中配置：
```json
{
  "read": false,
  "write": false
}
```
即完全禁止客户端直接读写，强制走云函数鉴权。

#### 7.2.2 索引建议

- `items` 集合：
  - `{ fridgeId: 1, zoneId: 1, layerId: 1 }` —— 加速按冰箱区域查询物品
  - `{ expireDate: 1 }` —— 加速临期扫描
  - `{ notified: 1, expireDate: 1 }` —— 加速定时提醒查询
- `user_fridge` 集合：
  - `{ userId: 1 }` —— 加速获取用户所有冰箱
  - `{ fridgeId: 1 }` —— 加速获取冰箱所有成员
- `fridges` 集合：
  - `{ _openid: 1 }` —— 加速查询用户创建的冰箱

#### 7.2.3 数据模型（权威定义）

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
    "layers": [ { "layerId": "cl1", "index": 0, "name": "恒温层" } ]
  },
  "zones": [
    { "zoneId": "z1", "name": "冷藏区", "tempType": "cold",
      "layers": [ { "layerId": "l1", "index": 0, "name": "第1层" } ] },
    { "zoneId": "z2", "name": "冷冻区", "tempType": "freeze",
      "layers": [ { "layerId": "l2", "index": 0, "name": "第1层" } ] }
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

### 7.3 云函数设计

#### 7.3.1 云函数清单

| 云函数名称 | 触发方式 | 功能描述 |
|------------|----------|----------|
| `login` | HTTP 调用 | 微信登录，获取 openid，创建/更新 users 记录（含 theme 默认值） |
| `updateUserTheme` | HTTP 调用 | 更新用户主题偏好 `users.theme` |
| `createFridge` | HTTP 调用 | 创建冰箱，写入 fridges + user_fridge（role=owner） |
| `updateFridge` | HTTP 调用 | 修改冰箱结构/名称，校验 owner |
| `deleteFridge` | HTTP 调用 | 删除冰箱 + 级联删除 items / user_fridge / 云存储文件，校验 owner |
| `getFridgeList` | HTTP 调用 | 获取当前用户所有冰箱（通过 user_fridge 联表查询） |
| `getFridgeDetail` | HTTP 调用 | 获取冰箱详情及物品列表（按权限过滤） |
| `addItem` | HTTP 调用 | 添加物品，校验 write 权限（role≠readonly） |
| `updateItem` | HTTP 调用 | 修改物品，校验 write 权限 |
| `deleteItem` | HTTP 调用 | 删除物品，校验 write 权限，同步删除云存储图片 |
| `getItemsByLayer` | HTTP 调用 | 获取某层物品列表 |
| `getExpiringItems` | HTTP 调用 | 获取用户所有冰箱临期物品（聚合查询） |
| `generateQRCode` | HTTP 调用 | 生成带参数的小程序码（调用 wxacode.getUnlimited） |
| `joinFridge` | HTTP 调用 | 扫码后加入冰箱，写入 user_fridge |
| `manageMember` | HTTP 调用 | 修改成员角色 / 移除成员 / 转让所有权，校验 owner |
| `checkExpiry` | **定时触发** | 每日凌晨扫描临期物品并发送订阅消息 |

#### 7.3.2 云函数通用鉴权模板（强制）

每个涉及写操作的云函数，开头**必须**执行以下鉴权逻辑：

```javascript
// cloudfunctions/_shared/auth.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 校验用户是否登录 + 是否有权限操作某冰箱
 * @param {string} fridgeId
 * @param {string[]} allowedRoles - 允许的角色列表，如 ['owner','readwrite']
 */
async function checkFridgePermission(fridgeId, allowedRoles) {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw { code: -1, msg: '未登录' }

  const res = await db.collection('user_fridge').where({
    userId: OPENID,
    fridgeId: fridgeId
  }).get()

  if (res.data.length === 0) throw { code: -2, msg: '无权访问此冰箱' }

  const role = res.data[0].role
  if (!allowedRoles.includes(role)) {
    throw { code: -3, msg: '权限不足：需要 ' + allowedRoles.join('/') + ' 权限' }
  }

  return { openid: OPENID, role }
}

module.exports = { checkFridgePermission }
```

**各云函数的权限要求速查**：

| 云函数 | 需要的角色 |
|--------|-----------|
| createFridge | 已登录即可 |
| updateFridge | owner |
| deleteFridge | owner |
| addItem / updateItem / deleteItem | owner 或 readwrite |
| getFridgeList / getFridgeDetail / getItemsByLayer / getExpiringItems | 已登录即可（自动按 user_fridge 过滤） |
| generateQRCode | owner |
| joinFridge | 已登录即可 |
| manageMember | owner |
| checkExpiry | 定时触发（跳过鉴权） |

#### 7.3.3 关键云函数实现要点

**（1）login —— 微信登录**
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '登录失败' }

  const now = db.serverDate()
  const exist = await db.collection('users').where({ _openid: OPENID }).get()

  if (exist.data.length === 0) {
    // 新用户：创建，theme 默认 warm
    const res = await db.collection('users').add({
      data: {
        _openid: OPENID,
        nickname: event.nickname || '微信用户',
        avatarUrl: event.avatarUrl || '',
        theme: 'warm',
        notifyEnabled: true,
        notifyDays: 3,
        createdAt: now,
        updatedAt: now
      }
    })
    return { code: 0, data: { _id: res._id, _openid: OPENID, theme: 'warm' } }
  } else {
    // 老用户：更新登录时间
    await db.collection('users').doc(exist.data[0]._id).update({
      data: { updatedAt: now }
    })
    return { code: 0, data: exist.data[0] }
  }
}
```

**（2）generateQRCode —— 生成分享小程序码**
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { fridgeId, role } = event
  if (!['readonly','readwrite'].includes(role)) return { code: -1, msg: 'role 非法' }

  // 校验调用者是 owner
  const ownerCheck = await db.collection('user_fridge').where({
    userId: OPENID, fridgeId, role: 'owner'
  }).get()
  if (ownerCheck.data.length === 0) return { code: -2, msg: '仅所有者可生成分享码' }

  // 构造 scene（7天有效期）
  const scene = `${fridgeId}|${role}|${Date.now()}`
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene: scene,
    page: 'pages/scan-result/scan-result',
    checkPath: false,
    width: 430
  })

  // 上传到云存储
  const upload = await cloud.uploadFile({
    cloudPath: `qrcodes/${fridgeId}_${Date.now()}.png`,
    fileContent: result.buffer
  })

  // 返回临时 URL
  const urlResult = await cloud.getTempFileURL({ fileList: [upload.fileID] })
  return { code: 0, data: { fileID: upload.fileID, url: urlResult.fileList[0].tempFileURL } }
}
```

**（3）joinFridge —— 扫码加入冰箱**
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { fridgeId, role } = event

  // 校验冰箱存在
  const fridge = await db.collection('fridges').doc(fridgeId).get()
  if (!fridge.data) return { code: -1, msg: '冰箱不存在或已失效' }

  // 是否已加入
  const exist = await db.collection('user_fridge').where({
    userId: OPENID, fridgeId
  }).get()
  if (exist.data.length > 0) return { code: -2, msg: '你已加入该冰箱' }

  // 写入关联
  await db.collection('user_fridge').add({
    data: {
      userId: OPENID,
      fridgeId,
      role,
      joinedAt: db.serverDate()
    }
  })

  return { code: 0, msg: '加入成功', data: { fridgeName: fridge.data.name } }
}
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
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 查询未通知且临期的物品
  const items = await db.collection('items').where({
    notified: false,
    expireDate: _.lte(threeDaysLater).and(_.gte(now))
  }).get()

  // 按 fridgeId 分组
  const byFridge = {}
  items.data.forEach(item => {
    if (!byFridge[item.fridgeId]) byFridge[item.fridgeId] = []
    byFridge[item.fridgeId].push(item)
  })

  for (const [fridgeId, expiringItems] of Object.entries(byFridge)) {
    // 获取该冰箱所有非只读成员
    const members = await db.collection('user_fridge').where({
      fridgeId, role: _.in(['owner','readwrite'])
    }).get()

    for (const member of members.data) {
      // 获取用户通知偏好
      const user = await db.collection('users').where({ _openid: member.userId }).get()
      if (user.data.length === 0 || !user.data[0].notifyEnabled) continue

      // 发送订阅消息（模板需提前在微信后台申请）
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: member.userId,
          templateId: 'YOUR_TEMPLATE_ID',  // 替换为实际模板 ID
          page: `pages/fridge/fridge?fridgeId=${fridgeId}`,
          data: {
            thing1: { value: expiringItems[0].name },
            number2: { value: Math.ceil((new Date(expiringItems[0].expireDate)-now)/86400000) },
            thing3: { value: expiringItems.length + ' 件物品临期' }
          }
        })
      } catch (e) { console.error('send fail', e) }
    }
  }

  // 标记已通知
  const ids = items.data.map(i => i._id)
  if (ids.length > 0) {
    await db.collection('items').where({ _id: _.in(ids) }).update({
      data: { notified: true }
    })
  }

  return { code: 0, notified: ids.length }
}
```

### 7.4 云存储

- **用途**：存储用户上传的物品图片、生成的二维码图片。
- **目录规划**：
  - `images/items/{itemId}/` —— 物品图片（每张 ≤2MB）
  - `qrcodes/` —— 分享二维码
- **上传方式**：前端通过 `wx.cloud.uploadFile` 上传，成功后在云函数 `addItem`/`updateItem` 中写入 `items.images` 数组。
- **删除联动**：云函数 `deleteItem` 和 `deleteFridge` 中同步调用 `cloud.deleteFile({ fileList: [...] })` 清理云存储文件，避免垃圾数据。
- **权限**：云存储默认仅管理员可读写，前端通过 `wx.cloud.getTempFileURL` 获取临时链接展示。

### 7.5 前端调用云函数统一封装

建议在 `utils/cloud.js` 中封装统一调用方法：

```javascript
// utils/cloud.js
function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        const result = res.result || {}
        if (result.code === 0) resolve(result.data)
        else {
          wx.showToast({ title: result.msg || '操作失败', icon: 'none' })
          reject(result)
        }
      },
      fail: err => {
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = { call }
```

页面中调用示例：
```javascript
const cloud = require('../../utils/cloud.js')

// 添加物品
cloud.call('addItem', {
  fridgeId: 'xxx',
  zoneId: 'z1',
  layerId: 'l1',
  name: '牛奶',
  icon: 'milk',
  quantity: 2,
  unit: '瓶',
  expireDate: '2026-08-15'
}).then(() => {
  wx.showToast({ title: '添加成功' })
  wx.navigateBack()
})
```

### 7.6 环境变量与配置

- 云函数中统一使用 `cloud.DYNAMIC_CURRENT_ENV` 获取当前环境 ID，避免硬编码。
- 订阅消息模板 ID 存储在云函数的 `config.js` 中，或通过云数据库 `config` 集合管理（推荐，便于线上修改无需重部署）。
- 二维码有效期（默认 7 天）也建议放入 `config` 集合，便于调整。

### 7.7 云开发项目目录结构（推荐）

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
│   ├── app.wxss            （4套主题 CSS 变量定义）
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

## 八、AI 代码生成提示词建议（附录）

> 以下内容供将本文档喂给 AI 生成原型图或小程序代码时使用。

- **组件约束**：生成任何 WXML 时，优先使用 `tdesign-miniprogram` 组件，例如按钮用 `<t-button>`、输入框用 `<t-input>`、列表用 `<t-cell>`、右滑用 `<t-swipe-cell>`，不要使用原生 `<button>` 或手写 `<view>` 模拟按钮。
- **样式约束**：颜色、间距、圆角一律用 TDesign CSS 变量（`--td-*`），禁止硬编码。主题相关的色值使用 `page[data-theme="warm|fresh|modern|cute"]` 选择器覆盖。
- **页面结构**：每个页面必须包含 `*.wxml` `*.wxss` `*.js` `*.json` 四个文件，并在 `*.json` 的 `usingComponents` 中声明所用 TDesign 组件路径（如 `"t-button": "tdesign-miniprogram/button/button"`）。
- **状态反馈**：所有异步函数必须配套 `t-toast` 或 `t-loading`，不得出现无提示等待。
- **数据层（强约束）**：使用微信云开发（CloudBase），数据库集合命名为 `fridges`、`items`、`users`、`user_fridge`，**禁止客户端直连数据库**，所有读写通过 `wx.cloud.callFunction` 调用云函数。
- **鉴权模板**：每个云函数开头必须 `require('./_shared/auth.js')` 中的 `checkFridgePermission(fridgeId, allowedRoles)`，校验失败返回对应错误码。
- **主题系统**：必须在 `app.wxss` 定义 4 套 CSS 变量（warm/fresh/modern/cute），`app.js` 中实现 `refreshTheme(theme)` 全局方法，从 `users.theme` 读取并写入 `page` 的 `data-theme` 属性。默认值为 `warm`。切换时调用云函数 `updateUserTheme` 持久化。
- **图标选择**：添加/编辑物品页用 `t-tabs` 切"上传图片 / 选择图标"两栏；图标面板按 8 大分类展示可点击缩略图，选中后高亮边框并写入 `item.icon` 字段。
- **右滑删除**：临期列表与冰箱层物品列表一律用 `<t-swipe-cell>`，右侧暴露红色"删除"按钮，点击后弹 `<t-dialog>` 二次确认再删云数据库记录。
- **物品详情页**：独立页面 `pages/item-detail`，展示完整信息 + 编辑保存/删除两个底部按钮，删除需二次确认。
- **冰箱布局**：双开门用 CSS Grid 两列左右排布（左冷藏右冷冻，恒温层在下方占满整行）；单开门单列纵向（冷藏在上、恒温层在中、冷冻在下）。每层用大圆角渐变背景模拟抽屉。
- **二维码分享**：使用云函数 `generateQRCode` 调用 `cloud.openapi.wxacode.getUnlimited`，scene 格式 `fridgeId|role|timestamp`，page 设为 `pages/scan-result/scan-result`。
- **定时提醒**：云函数 `checkExpiry` 的 `config.json` 必须包含 `"triggers": [{"type":"timer","config":"0 0 1 * * * *"}]`，扫描 `notified=false` 且 `expireDate` 在阈值内的物品并发送订阅消息。
- **云存储清理**：删除物品/冰箱时，云函数中同步调用 `cloud.deleteFile` 清理关联文件。
- **⚠️ 禁止 t-select 组件**：TDesign Weixin 组件库中**不存在 `t-select` 组件**，严禁在代码中使用。所有"下拉选择"场景按以下规则替换：
  - 页面内嵌下拉菜单 → `t-dropdown-menu` + `t-dropdown-item`（需先在 JSON 中声明 `"t-dropdown-menu": "tdesign-miniprogram/dropdown-menu/dropdown-menu"` 和 `"t-dropdown-item": "tdesign-miniprogram/dropdown-item/dropdown-item"`）
  - 表单内底部弹出滚轮选择 → `t-picker`（单位、存放位置级联等）
  - 少量选项的底部面板 → `t-action-sheet`（编辑/删除操作、更改角色等 2~4 个选项场景）
  - 2~3 个选项的平铺选择 → `t-radio-group`（门型、恒温层开关、通知提前天数等）
  - 示例（成员管理改角色）：用 `<t-dropdown-menu><t-dropdown-item options="{{roleOptions}}" value="{{role}}" bindchange="onRoleChange"/></t-dropdown-menu>`，options 格式为 `[{label:'只读',value:'readonly'},{label:'可读写',value:'readwrite'}]`

---

## 九、附录：修订记录

| 版本 | 日期 | 修订人 | 修订内容 |
|------|------|--------|----------|
| v1.0 | 2026-08-06 | 产品经理 | 初始版本：冰箱创建、物品管理、临期提醒 |
| v1.1 | 2026-08-06 | 产品经理 | 新增用户-冰箱关联表、二维码分享、权限管理（只读/可读写/所有者） |
| v1.2 | 2026-08-06 | 产品经理 | 新增主题切换（4种风格）、物品右滑删除/点击详情、冰箱恒温层、物品图标选择、物品详情页 |
| v1.3 | 2026-08-06 | 产品经理 | 补全完整页面树（含分享/扫码/成员管理/设置页）；新增第七章「云开发实现方案」（环境、集合、索引、云函数清单、鉴权模板、关键云函数代码、云存储、统一封装、目录结构） |
| v1.3.1 | 2026-08-06 | 产品经理 | 修正：全局移除不存在的 `t-select` 组件，替换为 `t-dropdown-menu`+`t-dropdown-item` / `t-action-sheet` / `t-picker` / `t-radio-group`（按场景选用）；同步更新页面清单、成员管理描述及 AI 提示词约束 |

---

**文档结束。**

如需生成原型图或开始编码，请将此文档作为上下文一并输入 AI 工具。文档中所有云函数签名、数据库字段、鉴权逻辑均可直接作为 AI 生成代码的强约束依据。
