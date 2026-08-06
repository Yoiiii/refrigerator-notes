// app.ts
import { refreshTheme } from './utils/theme'

App<IAppOption>({
  globalData: {
    userInfo: null as any,
    theme: 'warm',
    fridges: [] as any[],
    currentFridgeId: '',
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-d4gl9uf3tb8659c31',
      traceUser: true,
    })

    this.doLogin()
  },

  async doLogin() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {},
      })
      const result = res.result as any
      if (result.code === 0 && result.data) {
        const user = result.data
        this.globalData.userInfo = user
        this.globalData.theme = user.theme || 'warm'
        wx.setStorageSync('theme', user.theme || 'warm')
        this.refreshTheme(user.theme || 'warm')
      }
    } catch (e) {
      console.error('login fail:', e)
      // 降级：使用缓存主题
      const cachedTheme = wx.getStorageSync('theme') || 'warm'
      this.refreshTheme(cachedTheme)
    }
  },

  refreshTheme(theme: string) {
    this.globalData.theme = theme
    refreshTheme(theme)
  },
})