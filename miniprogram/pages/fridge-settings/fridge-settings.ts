// fridge-settings.ts
import { call } from '../../utils/cloud'
import { Toast, Dialog } from 'tdesign-miniprogram'

const app = getApp<IAppOption>()

Page({
  data: { theme: 'warm', loading: true, fridgeId: '', fridgeName: '', doorTypeText: '', hasConstantZone: false, isOwner: false },

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
    Dialog({
      title: '删除冰箱', content: '删除后所有物品和成员数据将同时清除，不可恢复！',
      confirmBtn: '确定删除', cancelBtn: '取消', selector: '#t-dialog', closeBtn: true,
    }).then((res: any) => {
      if (res.confirm) {
        call('deleteFridge', { fridgeId: this.data.fridgeId }).then(() => {
          Toast({ message: '已删除', selector: '#t-toast' })
          wx.navigateBack({ delta: 2 })
        }).catch(() => { })
      }
    })
  },
})