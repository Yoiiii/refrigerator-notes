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
    fridgesLoading: true,
    notifyEnabled: true,
    notifyDays: 3,
    aboutVisible: false,
  },

  onLoad() {
    this.initThemes()
    this.loadUserInfo()
  },

  onShow() {
    const theme = app.globalData.theme || 'warm'
    this.setData({ currentTheme: theme, theme: theme })
    this.loadUserInfo()
    // 仅首次加载，或冰箱数据有变更（新增/删除/编辑）时才刷新列表，避免每次切回都闪骨架
    // 用版本号而非单次消费标志：首页/我的各自记录已见版本，变更时都能独立刷新，互不抢消费
    if (app.globalData.fridgeListVersion !== app.globalData.mineSeenVersion) {
      app.globalData.mineSeenVersion = app.globalData.fridgeListVersion
      this.loadData()
    } else if (this.data.fridges.length === 0 && app.globalData.fridges) {
      // 页面被销毁重建后本地 data 重置为空，但全局已缓存过数据，直接复用、不闪骨架
      this.setData({ fridges: app.globalData.fridges, fridgesLoading: false })
    }
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
    const self: any = this
    if (self._fridgeLoading) return
    self._fridgeLoading = true
    this.setData({ fridgesLoading: true })
    try {
      const res = await call('getFridgeList')
      const list = res?.fridges || []
      this.setData({
        fridges: list,
        fridgesLoading: false,
        notifyDays: res?.notifyDays || 3,
        notifyEnabled: res?.notifyEnabled !== false,
      })
      app.globalData.fridges = list
      app.globalData.fridgesReady = true
    } catch (e) {
      const list = [
        { fridgeId: 'demo_001', name: '客厅冰箱', doorType: 'double', totalItems: 12 },
      ]
      this.setData({ fridges: list, fridgesLoading: false })
      app.globalData.fridges = list
      app.globalData.fridgesReady = true
    } finally {
      self._fridgeLoading = false
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
    call('updateUserTheme', { theme }, { silent: true }).then(() => {
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
    const notifyEnabled = e.detail.value
    this.setData({ notifyEnabled })
    Toast({ context: this, message: notifyEnabled ? '已开启' : '已关闭', selector: '#t-toast' })
    call('updateUserNotify', { notifyEnabled }, { silent: true }).catch(() => {
      Toast({ context: this, message: '保存失败，请重试', selector: '#t-toast' })
    })
  },

  onNoticeDays() {
    wx.showActionSheet({
      itemList: ['1天', '3天', '5天', '7天'],
      success: (res) => {
        const days = [1, 3, 5, 7][res.tapIndex]
        this.setData({ notifyDays: days })
        call('updateUserNotify', { notifyDays: days }, { silent: true }).catch(() => {
          Toast({ context: this, message: '保存失败，请重试', selector: '#t-toast' })
        })
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
