# 项目长期记忆（冰箱笔记 miniprogram-2）

## Git 工作流约定
- 用户明确要求：**只 commit，不 push**。完成代码改动后执行 `git add -A` + `git commit` 即可，不要执行 `git push`。
- 历史坑：git 全局配置指向 Z: 网络盘（`/z/.gitconfig` 锁权限），提交/推送需 `cp /z/.gitconfig ~/.gitconfig_local` 并 `export GIT_CONFIG_GLOBAL=~/.gitconfig_local` 绕过。
- 云函数改动需用户在开发者工具手动上传部署才生效。

## 技术约定（来自 CLAUDE.md）
- TS + TDesign Weixin + 微信云开发；`app.json` 用 `componentFramework: glass-easel`。
- 禁用 t-card / t-list / t-select；所有 DB 操作必须走云函数（utils/cloud.ts 的 call() 封装，约定 {code:0,data}）。
- 4 套主题；状态色：绿=安全(>3天) / 黄=临期(≤3天且>今天) / 红=过期(<今天)。
- 图片以 cloud:// fileID 存库，展示前需用 resolveCloudImages 转 https 再给 t-image。
- 日期比较统一用 YYYY-MM-DD 字符串（已内联 toDateStr/dateToNum/isExpired/isWarning/diffDays 到各云函数），避免 new Date(expireDate) 的时区错位。
