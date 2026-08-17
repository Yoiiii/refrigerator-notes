// fridge-settings.ts
import { call } from '../../utils/cloud'
import { refreshFridgeLists } from '../../utils/refresh'

const app = getApp<IAppOption>()

Page({
  data: { theme: 'warm', loading: true, fridgeId: '', fridgeName: '', doorTypeText: '', hasConstantZone: false, isOwner: false, deleteVisible: false },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || '', theme: app.globalData.theme || 'warm' })
    this.loadFridge()
  },

  async loadFridge() {
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId })
      if (data) {
        this.setData({
          loading: false,
          fridgeName: data.name,
          doorTypeText: data.doorType === 'double' ? '双开门' : '单开门',
          hasConstantZone: data.hasConstantZone || false,
          isOwner: data.role === 'owner',
        })
      }
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onBack() { wx.navigateBack() },
  onEditFridge() {
    wx.navigateTo({ url: `/pages/fridge-create/fridge-create?fridgeId=${this.data.fridgeId}` })
  },
  onMemberManage() {
    wx.navigateTo({ url: `/pages/member-manage/member-manage?fridgeId=${this.data.fridgeId}` })
  },
  onShare() {
    wx.navigateTo({ url: `/pages/share-qrcode/share-qrcode?fridgeId=${this.data.fridgeId}` })
  },
  onDeleteFridge() {
    this.setData({ deleteVisible: true })
  },

  onDeleteConfirm() {
    this.setData({ deleteVisible: false })
    call('deleteFridge', { fridgeId: this.data.fridgeId }, { silent: true })
      .then(() => {
        app.globalData.fridgeListVersion++
        // 主动刷新页面栈里的首页/我的列表（不依赖 onShow 时序）
        refreshFridgeLists()
        wx.showToast({ title: '删除成功', icon: 'success' })
        // 等成功提示停留片刻再返回，避免页面卸载时 toast 被同部销毁
        setTimeout(() => {
          // 栈深不足 2（冷启动 / 扫码深链直达）时回退无效，改为 reLaunch 回首页（P2-04）
          const pages = getCurrentPages()
          if (pages.length > 2) {
            wx.navigateBack({ delta: 2 })
          } else {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        }, 600)
      })
      .catch(() => {
        wx.showToast({ title: '删除失败', icon: 'none' })
      })
  },

  onDeleteCancel() {
    this.setData({ deleteVisible: false })
  },
})
