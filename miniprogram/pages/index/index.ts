// index.ts
import { call } from '../../utils/cloud'
import { getIconEmoji } from '../../utils/icons'
import { Dialog } from 'tdesign-miniprogram'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    loading: true,
    hasFridge: false,
    refreshing: false,
    currentFridge: {} as any,
    fridges: [] as any[],
    defaultFridgeId: '',
    expiringItems: [] as any[],
    swipeRight: [{ text: '删除', className: 'swipe-delete' }],
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
    console.log('app.globalData.userInfo',app.globalData.userInfo)
    this.setData({ theme: app.globalData.theme || 'warm'})
  },

  async onRefresh() {
    this.setData({ refreshing: true })
    await this.loadData()
    this.setData({ refreshing: false })
  },

  async loadData() {
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
          loading: false,
          hasFridge: true,
          fridges: fridges,
          defaultFridgeId,
          currentFridge,
          expiringItems: (expiringItems || []).map((item: any) => ({
            ...item,
            iconEmoji: getIconEmoji(item.icon),
            status: item.status === 'danger' ? 'danger' : 'warning',
            statusText: item.statusText || (item.status === 'danger' ? '已过期' : '临期'),
          })),
        })
      } else {
        this.setData({ loading: false, hasFridge: false, fridges: [], currentFridge: {} })
      }
    } catch (e) {
      // 云函数未部署时使用模拟数据
      this.setData({
        loading: false,
        hasFridge: true,
        currentFridge: {
          fridgeId: 'demo_001', name: '客厅冰箱', doorType: 'double',
          totalItems: 12, expiringCount: 3, expiredCount: 1,
        },
        expiringItems: [
          { _id: 'i1', name: '五花肉', iconEmoji: '🥩', locationText: '冷藏区·第3层', status: 'danger', statusText: '已过期' },
          { _id: 'i2', name: '鸡蛋', iconEmoji: '🥚', locationText: '冷藏区·第2层', status: 'warning', statusText: '临期2天' },
          { _id: 'i3', name: '速冻饺子', iconEmoji: '🥟', locationText: '冷冻区·第3层', status: 'warning', statusText: '临期1天' },
        ],
      })
    }
  },

  onTabChange(e: any) {
    if (e.detail.value === 'mine') {
      wx.redirectTo({ url: '/pages/mine/mine' })
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
    wx.navigateTo({ url: `/pages/item-detail/item-detail?itemId=${itemId}` })
  },

  onDeleteExpiringItem(e: any) {
    const itemId = e.currentTarget.dataset.itemId
    Dialog({
      title: '删除物品',
      content: '确定要删除该物品吗？',
      confirmBtn: '删除',
      cancelBtn: '取消',
      selector: '#t-dialog',
      closeBtn: true,
    }).then((res: any) => {
      if (res.confirm) {
        call('deleteItem', { itemId, fridgeId: this.data.currentFridge.fridgeId }).then(() => {
          this.loadData()
        }).catch(() => { })
      }
    })
  },
})