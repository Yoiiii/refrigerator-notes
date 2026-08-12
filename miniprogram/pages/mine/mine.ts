// mine.ts
import { call } from '../../utils/cloud'
import { getThemeName, getThemePreviewColors } from '../../utils/theme'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    userInfo: { nickname: '微信用户', avatar: '' },
    currentTheme: 'warm',
    themes: [] as any[],
    fridges: [] as any[],
    notifyEnabled: true,
    notifyDays: 3,
    aboutVisible: false,
  },

  onLoad() {
    this.initThemes()
    this.loadData()
    this.loadUserInfo()
  },

  onShow() {
    this.loadData()
    this.loadUserInfo()
    const theme = app.globalData.theme || 'warm'
    this.setData({ currentTheme: theme, theme: theme })
  },

  loadUserInfo() {
    const ui = app.globalData.userInfo
    if (ui && ui.nickname) {
      this.setData({
        userInfo: {
          nickname: ui.nickname,
          avatar: ui.avatarUrl || '',
        },
      })
    }
  },

  initThemes() {
    const keys = ['warm', 'fresh', 'modern', 'cute']
    this.setData({
      themes: keys.map((key) => ({
        key,
        name: getThemeName(key),
        colors: getThemePreviewColors(key),
      })),
    })
  },

  async loadData() {
    try {
      const res = await call('getFridgeList')
      this.setData({ fridges: res?.fridges || [] })
    } catch (e) {
      this.setData({
        fridges: [
          { fridgeId: 'demo_001', name: '客厅冰箱', doorType: 'double', totalItems: 12 },
        ],
      })
    }
  },

  onTabChange(e: any) {
    if (e.detail.value === 'home') {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.redirectTo({ url: '/pages/index/index' })
      }
    }
  },

  onThemeChange(e: any) {
    const theme = e.currentTarget.dataset.theme
    call('updateUserTheme', { theme }).then(() => {
      app.refreshTheme(theme)
      this.setData({ currentTheme: theme })
      wx.setStorageSync('theme', theme)
      Toast({ context: this, message: '主题已切换', selector: '#t-toast' })
    }).catch(() => {
      Toast({ context: this, message: '切换失败，请重试', selector: '#t-toast' })
    })
  },

  onCreateFridge() {
    wx.navigateTo({ url: '/pages/fridge-create/fridge-create' })
  },

  onGoFridge(e: any) {
    const fridgeId = e.currentTarget.dataset.fridgeId
    wx.navigateTo({ url: `/pages/fridge/fridge?fridgeId=${fridgeId}` })
  },

  onNoticeSwitch(e: any) {
    this.setData({ notifyEnabled: e.detail.value })
    Toast({ context: this, message: e.detail.value ? '已开启' : '已关闭', selector: '#t-toast' })
  },

  onNoticeDays() {
    wx.showActionSheet({
      itemList: ['1天', '3天', '5天', '7天'],
      success: (res) => {
        const days = [1, 3, 5, 7][res.tapIndex]
        this.setData({ notifyDays: days })
      },
    })
  },

  onAbout() {
    this.setData({ aboutVisible: true })
  },

  onAboutClose() {
    this.setData({ aboutVisible: false })
  },
})
