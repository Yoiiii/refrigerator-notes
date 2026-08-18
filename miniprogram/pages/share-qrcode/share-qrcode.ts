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

  async onSaveQR() {
    const url = this.data.qrUrl
    if (!url) return
    try {
      // 云存储临时链接需先下载到本地临时文件，才能 saveImageToPhotosAlbum
      const dl = await wx.downloadFile({ url })
      if (dl.statusCode !== 200) {
        Toast({ context: this, message: '下载失败，请重试', selector: '#t-toast' })
        return
      }
      await wx.saveImageToPhotosAlbum({ filePath: dl.tempFilePath })
      Toast({ context: this, message: '已保存到相册', selector: '#t-toast' })
    } catch (e: any) {
      const errMsg = (e && e.errMsg) || ''
      // 用户拒绝相册授权时引导去设置页开启
      if (/auth deny|authorize|album/i.test(errMsg)) {
        wx.showModal({
          title: '需要相册权限',
          content: '保存图片需要您授权相册，是否前往设置开启？',
          confirmText: '去设置',
          success: (r) => { if (r.confirm) wx.openSetting() },
        })
      } else if (/download|url|fail|domain/i.test(errMsg)) {
        // 多为 downloadFile 合法域名白名单未配置（云存储域名需在 MP 后台 downloadFile 合法域名内）
        Toast({ context: this, message: '下载失败，请检查网络或域名白名单', selector: '#t-toast' })
      } else {
        Toast({ context: this, message: '保存失败', selector: '#t-toast' })
      }
    }
  },
})
