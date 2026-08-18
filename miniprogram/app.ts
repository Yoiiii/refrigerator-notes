// app.ts
import { refreshTheme } from './utils/theme'

App<IAppOption>({
  globalData: {
    userInfo: null as any,
    theme: 'warm',
    fridges: [] as any[],
    currentFridgeId: '',
    fridgesReady: false,
    fridgeListVersion: 0,
    indexSeenVersion: -1,
    mineSeenVersion: -1,
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

    // 隐私授权弹窗：首次启动主动弹出，取得明示同意（隐私合规）
    this.initPrivacy()

    // 暴露登录就绪 Promise，供页面 await，避免冷启动竞态读到默认 userInfo（P2-14）
    ;(this as any).loginReady = this.doLogin()
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

  initPrivacy() {
    // 隐私保护指引合规：
    // 1) __usePrivacyCheck__ 已在 app.json 开启，调用 getUserProfile / chooseMedia /
    //    saveImageToPhotosAlbum 等隐私接口时，若用户尚未授权，微信会自动弹出原生授权框
    // 2) 这里在首次启动时主动弹出一次，确保「使用前取得明示同意」
    // 用 any 兜底：部分 miniprogram-api-typings 版本未声明隐私接口，避免 tsc 报类型错
    const wxp: any = wx
    if (!wxp.getPrivacySetting || !wxp.requirePrivacyAuthorize) return
    wxp.getPrivacySetting({
      success: (res: any) => {
        if (res.needAuthorization) {
          wxp.requirePrivacyAuthorize({
            success: () => {
              // 用户点击「同意」，授权态由微信侧记录，无需本地额外处理
            },
            fail: () => {
              // 用户点击「拒绝」：仅关闭弹窗，隐私相关功能仍受限，
              // 下次触发隐私接口时微信会再次弹出授权框
              wx.showToast({ title: '部分功能需授权后使用', icon: 'none' })
            },
          })
        }
      },
      fail: () => {
        // 隐私指引尚未在 MP 后台发布时不阻塞应用启动
      },
    })
  },

  refreshTheme(theme: string) {
    this.globalData.theme = theme
    refreshTheme(theme)
  },
})
