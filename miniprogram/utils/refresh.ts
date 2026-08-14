// 创建/删除/编辑冰箱后，主动刷新页面栈中还存活的「首页」与「我的」列表。
// 不再依赖 onShow + 版本号的触发时序，确保「切换冰箱」列表立即更新。
export function refreshFridgeLists() {
  let pages: any[] = []
  try {
    pages = getCurrentPages() as any[]
  } catch (e) {
    return
  }
  const app = getApp<IAppOption>()
  const version = app.globalData.fridgeListVersion
  pages.forEach((p: any) => {
    if (!p) return
    const route = (p.route || p.__route__ || '').replace(/^\//, '')
    if (
      (route === 'pages/index/index' || route === 'pages/mine/mine') &&
      typeof p.loadData === 'function'
    ) {
      try {
        // 首页静默刷新（不闪骨架）；我的页用骨架刷新
        p.loadData(route === 'pages/mine/mine')
        // 同步已见版本，避免返回时 onShow 再重复拉取
        if (route === 'pages/index/index') app.globalData.indexSeenVersion = version
        else app.globalData.mineSeenVersion = version
      } catch (e) {}
    }
  })
}
