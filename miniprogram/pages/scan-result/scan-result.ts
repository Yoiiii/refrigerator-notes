// scan-result.ts
import { call } from '../../utils/cloud'
import { refreshFridgeLists } from '../../utils/refresh'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    loading: true, loadingText: '正在验证…',
    fridgeId: '', role: 'readonly', fridgeName: '',
    resultIcon: '🧊', resultTitle: '', resultDesc: '',
    showJoinBtn: false, showGoHome: false,
  },

  onLoad(options: any) {
    this.setData({ theme: app.globalData.theme || 'warm' })
    const scene = decodeURIComponent(options.scene || '')
    if (scene) {
      const parts = scene.split('|')
      const fridgeId = parts[0]
      // 短角色码解码：rw→readwrite，ro→readonly（与 generateQRCode 对应）
      const roleMap: Record<string, string> = { rw: 'readwrite', ro: 'readonly' }
      const role = roleMap[parts[1]] || 'readonly'
      // 时间戳为「自纪元起天数」的 base36，还原为毫秒
      const timestamp = parseInt(parts[2] || '', 36) * 86400000
      // 7天有效期
      if (!timestamp || Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
        this.setData({
          loading: false, resultIcon: '⏰', resultTitle: '二维码已失效',
          resultDesc: '该分享码已超过7天有效期，请联系分享者重新生成', showGoHome: true,
        })
        return
      }
      this.setData({ fridgeId, role })
      this.verifyJoin()
    } else {
      this.setData({
        loading: false, resultIcon: '❌', resultTitle: '无效的二维码',
        resultDesc: '无法识别该二维码', showGoHome: true,
      })
    }
  },

  async verifyJoin() {
    try {
      await call('joinFridge', { fridgeId: this.data.fridgeId, role: this.data.role })
      app.globalData.fridgeListVersion++
      refreshFridgeLists()
      this.setData({
        loading: false, resultIcon: '✅', resultTitle: '加入成功',
        resultDesc: `你已成功加入该冰箱`, showGoHome: true,
      })
    } catch (e: any) {
      const msg = e?.msg || ''
      if (msg.includes('已加入')) {
        this.setData({
          loading: false, resultIcon: 'ℹ️', resultTitle: '你已加入',
          resultDesc: '你已是该冰箱的成员', showGoHome: true,
        })
      } else {
        // 失败暴露重试入口，允许用户再次尝试加入（P2-08）
        this.setData({
          loading: false, resultIcon: '❌', resultTitle: '加入失败',
          resultDesc: msg || '无法加入该冰箱', showJoinBtn: true, showGoHome: true,
        })
      }
    }
  },

  onJoin() {
    this.verifyJoin()
  },
  onGoHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  },
})
