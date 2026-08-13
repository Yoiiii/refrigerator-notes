// index.ts
import { call } from '../../utils/cloud'
import { getIconEmoji } from '../../utils/icons'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    pageLoading: true,
    refreshing: false,
    swiping: false,
    hasFridge: false,
    currentFridge: {} as any,
    fridges: [] as any[],
    defaultFridgeId: '',
    expiringItems: [] as any[],
    swipeRight: [{ text: '删除', className: 'swipe-delete' }],
    deleteVisible: false,
    deleteItemId: '',
    deleteFridgeId: '',
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (app.globalData.homeDataDirty) {
      app.globalData.homeDataDirty = false
      this.loadData()
    }
    this.setData({ theme: app.globalData.theme || 'warm'})
  },

  async onRefresh() {
    this.setData({ refreshing: true })
    await this.loadData(false)
    this.setData({ refreshing: false })
  },

  async loadData(showSkeleton = true) {
    if (showSkeleton) this.setData({ pageLoading: true })
    try {
      const res = await call('getFridgeList')
      const defaultFridgeId = res.defaultFridgeId
      const fridges = res?.fridges || []

      if (fridges.length > 0) {

        let currentFridge = fridges.find((f: any) => f.fridgeId === defaultFridgeId)
        if (!currentFridge) currentFridge = fridges[0]
        if (defaultFridgeId && app.globalData.userInfo) {
          app.globalData.userInfo.defaultFridgeId = defaultFridgeId
        }

        const expiringItems = await call('getExpiringItems')
        this.setData({
          pageLoading: false,
          hasFridge: true,
          fridges: fridges,
          defaultFridgeId,
          currentFridge,
          expiringItems: (expiringItems || []).map((item: any) => ({
            ...item,
            iconEmoji: getIconEmoji(item.icon),
            status: item.status === 'danger' ? 'danger' : 'warning',
            statusText: item.statusText || (item.status === 'danger' ? '已过期' : '临期'),
            swipeRight: item.role === 'readonly' ? [] : this.data.swipeRight,
          })),
        })
      } else {
        this.setData({ pageLoading: false, hasFridge: false, fridges: [], currentFridge: {} })
      }
    } catch (e) {
      // 云函数未部署时使用模拟数据
      this.setData({
        pageLoading: false,
        hasFridge: true,
        currentFridge: {
          fridgeId: 'demo_001', name: '客厅冰箱', doorType: 'double',
          totalItems: 12, expiringCount: 3, expiredCount: 1,
        },
        expiringItems: [
          { _id: 'i1', fridgeId: 'demo_001', fridgeName: '客厅冰箱', name: '五花肉', iconEmoji: '🥩', locationText: '客厅冰箱 · 冷藏区·第3层', status: 'danger', statusText: '已过期', role: 'owner', swipeRight: this.data.swipeRight },
          { _id: 'i2', fridgeId: 'demo_001', fridgeName: '客厅冰箱', name: '鸡蛋', iconEmoji: '🥚', locationText: '客厅冰箱 · 冷藏区·第2层', status: 'warning', statusText: '临期2天', role: 'owner', swipeRight: this.data.swipeRight },
          { _id: 'i3', fridgeId: 'demo_001', fridgeName: '客厅冰箱', name: '速冻饺子', iconEmoji: '🥟', locationText: '客厅冰箱 · 冷冻区·第3层', status: 'warning', statusText: '临期1天', role: 'owner', swipeRight: this.data.swipeRight },
        ],
      })
    }
  },

  onTabChange(e: any) {
    if (e.detail.value === 'mine') {
      wx.navigateTo({ url: '/pages/mine/mine' })
    }
  },

  onCreateFridge() {
    wx.navigateTo({ url: '/pages/fridge-create/fridge-create' })
  },

  onGoFridge() {
    wx.navigateTo({ url: `/pages/fridge/fridge?fridgeId=${this.data.currentFridge.fridgeId}` })
  },

  onSwitchFridge() {
    const { fridges } = this.data
    wx.showActionSheet({
      itemList: fridges.map((f: any) => f.name),
      success: (res) => {
        const selected = fridges[res.tapIndex]
        this.setData({ currentFridge: selected, defaultFridgeId: selected.fridgeId })
        // 同步 globalData
        if (app.globalData.userInfo) {
          app.globalData.userInfo.defaultFridgeId = selected.fridgeId
        }
        // 更新服务端的 defaultFridgeId
        call('updateDefaultFridge', { fridgeId: selected.fridgeId }).catch(() => {})
      },
    })
  },

  onAddItem() {
    wx.navigateTo({ url: `/pages/item-edit/item-edit?fridgeId=${this.data.currentFridge.fridgeId}` })
  },

  onManageFridge() {
    const { currentFridge } = this.data
    wx.navigateTo({ url: `/pages/fridge-settings/fridge-settings?fridgeId=${currentFridge.fridgeId}` })
  },

  onNotification() {
    wx.showToast({ title: '暂无新通知', icon: 'none' })
  },

  onItemDetail(e: any) {
    const itemId = e.currentTarget.dataset.itemId
    console.log('e.currentTarget.dataset',e.currentTarget.dataset)
    const fridgeId = e.currentTarget.dataset.fridgeId
    wx.navigateTo({ url: `/pages/item-detail/item-detail?itemId=${itemId}&fridgeId=${fridgeId}` })
  },

  onDeleteExpiringItem(e: any) {
    const { itemId, fridgeId } = e.currentTarget.dataset
    if (!itemId || !fridgeId) return
    this.setData({ deleteVisible: true, deleteItemId: itemId, deleteFridgeId: fridgeId })
  },

  onSwipeLock(e: any) {
    const locked = e.detail.locked
    if (locked !== this.data.swiping) this.setData({ swiping: locked })
  },

  onDeleteExpiringConfirm() {
    this.setData({ deleteVisible: false, pageLoading: true })
    call('deleteItem', { itemId: this.data.deleteItemId, fridgeId: this.data.deleteFridgeId })
      .then(() => {
        wx.showToast({ title: '删除成功', icon: 'success' })
        return this.loadData(true)
      })
      .catch(() => {
        wx.showToast({ title: '删除失败', icon: 'none' })
        this.setData({ pageLoading: false })
      })
  },

  onDeleteExpiringCancel() {
    this.setData({ deleteVisible: false })
  },
})
