// fridge-settings.ts
import { call } from '../../utils/cloud'
import Toast from 'tdesign-miniprogram/toast'

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
    call('deleteFridge', { fridgeId: this.data.fridgeId }).then(() => {
      app.globalData.homeDataDirty = true
      Toast({ context: this, message: '已删除', selector: '#t-toast' })
      wx.navigateBack({ delta: 2 })
    }).catch(() => { })
  },

  onDeleteCancel() {
    this.setData({ deleteVisible: false })
  },
})
