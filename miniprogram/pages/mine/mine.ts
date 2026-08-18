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
    aboutContent: '',
  },

  onLoad() {
    this.initThemes()
    // 关于弹窗内容用真实换行（WXML 静态属性不解析 \n），交由 t-dialog 按行渲染（P2-15）
    this.setData({
      aboutContent:
        '冰箱笔记 v1.3.0\n\n帮助您记录冰箱内物品存放位置与保质期，减少因遗忘导致的食品过期浪费。\n\n我们重视您的隐私，不会收集任何敏感信息。',
    })
    this.loadUserInfo()
  },

  async onShow() {
    const theme = app.globalData.theme || 'warm'
    this.setData({ currentTheme: theme, theme: theme })
    // 等待登录就绪，避免冷启动时 userInfo/通知设置读到默认值（P2-14）
    const appAny: any = app
    if (appAny.loginReady && typeof appAny.loginReady.then === 'function') {
      try { await appAny.loginReady } catch (e) {}
    }
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
          avatar: ui.avatarUrl || ui.avatar || '',
        },
        // 重新进入「我的」时回显通知设置，避免被默认值覆盖（P2-08）
        notifyDays: ui.notifyDays || this.data.notifyDays,
        notifyEnabled: ui.notifyEnabled !== undefined ? ui.notifyEnabled : this.data.notifyEnabled,
      })
    }
  },

  // 获取微信头像昵称并同步到云端（P2-13）
  onGetUserProfile() {
    wx.getUserProfile({
      desc: '用于在「我的」页面展示头像昵称',
      success: (res) => {
        const { nickName, avatarUrl } = res.userInfo
        const ui = app.globalData.userInfo || {}
        ui.nickname = nickName
        ui.avatarUrl = avatarUrl
        app.globalData.userInfo = ui
        this.setData({
          userInfo: { nickname: nickName, avatar: avatarUrl },
        })
        // 同步到云端用户表
        call('login', { nickname: nickName, avatarUrl }, { silent: true }).catch(() => {})
      },
      fail: () => {
        Toast({ context: this, message: '获取头像昵称失败，请允许授权', selector: '#t-toast' })
      },
    })
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
      // 把通知设置缓存到全局，便于重新进入「我的」时回显（P2-08）
      if (app.globalData.userInfo) {
        app.globalData.userInfo.notifyDays = res?.notifyDays || 3
        app.globalData.userInfo.notifyEnabled = res?.notifyEnabled !== false
      }
    } catch (e) {
      // 加载失败：展示空态 + 重试，不注入伪造冰箱，也不误报数据就绪（P1-02）
      this.setData({ fridges: [], fridgesLoading: false })
      app.globalData.fridges = []
      app.globalData.fridgesReady = false
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
    const prev = this.data.notifyEnabled
    this.setData({ notifyEnabled })
    Toast({ context: this, message: notifyEnabled ? '已开启' : '已关闭', selector: '#t-toast' })
    call('updateUserNotify', { notifyEnabled }, { silent: true }).then(() => {
      // 同步全局，便于其它页读取
      if (app.globalData.userInfo) app.globalData.userInfo.notifyEnabled = notifyEnabled
    }).catch(() => {
      // 失败回滚本地状态，保证 UI 与后端一致（P2-14）
      this.setData({ notifyEnabled: prev })
      Toast({ context: this, message: '保存失败，请重试', selector: '#t-toast' })
    })
  },

  onNoticeDays() {
    wx.showActionSheet({
      itemList: ['1天', '3天', '5天', '7天'],
      success: (res) => {
        const days = [1, 3, 5, 7][res.tapIndex]
        const prev = this.data.notifyDays
        this.setData({ notifyDays: days })
        call('updateUserNotify', { notifyDays: days }, { silent: true }).then(() => {
          if (app.globalData.userInfo) app.globalData.userInfo.notifyDays = days
        }).catch(() => {
          this.setData({ notifyDays: prev })
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
