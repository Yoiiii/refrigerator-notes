// share-qrcode.ts
import { call } from '../../utils/cloud'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

Page({
  data: { theme: 'warm', fridgeId: '', role: 'readonly', qrUrl: '', generating: false },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || '', theme: app.globalData.theme || 'warm' })
  },

  onBack() { wx.navigateBack() },
  onRoleChange(e: any) { this.setData({ role: e.detail.value }) },

  async onGenerate() {
    this.setData({ generating: true })
    try {
      const data = await call('generateQRCode', { fridgeId: this.data.fridgeId, role: this.data.role }, { silent: true })
      if (data && data.url) {
        this.setData({ qrUrl: data.url })
      }
    } catch (e) {
      Toast({ context: this, message: '生成失败，请重试', selector: '#t-toast' })
    }
    this.setData({ generating: false })
  },

  onSaveQR() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.qrUrl,
      success: () => { Toast({ context: this, message: '已保存到相册', selector: '#t-toast' }) },
      fail: () => { Toast({ context: this, message: '保存失败', selector: '#t-toast' }) },
    })
  },
})
