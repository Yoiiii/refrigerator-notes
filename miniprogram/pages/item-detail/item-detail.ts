// item-detail.ts
import { call } from '../../utils/cloud'
import { getIconEmoji } from '../../utils/icons'
import { Toast, Dialog } from 'tdesign-miniprogram'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    itemId: '', fridgeId: '',
    item: {} as any,
    editing: false, saving: false,
  },

  onLoad(options: any) {
    this.setData({ itemId: options.itemId || '', theme: app.globalData.theme || 'warm' })
    this.loadItem()
  },

  async loadItem() {
    // 从缓存或全局数据中获取
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId || 'demo' })
      const item = (data?.items || []).find((i: any) => i._id === this.data.itemId)
      if (item) {
        const expireDate = new Date(item.expireDate)
        const now = new Date()
        const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / 86400000)
        let statusTag = 'success', statusText = '安全'
        if (expireDate < now) { statusTag = 'danger'; statusText = '已过期' }
        else if (diffDays <= 3) { statusTag = 'warning'; statusText = `临期${diffDays}天` }
        this.setData({
          item: { ...item, iconEmoji: getIconEmoji(item.icon), statusTag, statusText, diffDays },
          fridgeId: item.fridgeId,
        })
      }
    } catch (e) {
      this.setData({
        item: {
          _id: this.data.itemId, name: '鲜牛奶', iconEmoji: '🥛', quantity: 2, unit: '瓶',
          expireDate: '2026-08-15', statusTag: 'success', statusText: '安全',
          locationText: '冷藏区 > 第1层', createdAt: '2026-08-01', updatedAt: '2026-08-05',
        },
      })
    }
  },

  onBack() { wx.navigateBack() },
  onEdit() { this.setData({ editing: true }) },
  onNameChange(e: any) { this.setData({ 'item.name': e.detail.value }) },
  onQuantityChange(e: any) { this.setData({ 'item.quantity': e.detail.value }) },
  onDatePicker() { wx.showToast({ title: '选择日期', icon: 'none' }) },

  async onSave() {
    this.setData({ saving: true })
    try {
      await call('updateItem', {
        itemId: this.data.itemId, fridgeId: this.data.fridgeId,
        name: this.data.item.name, quantity: this.data.item.quantity,
        expireDate: this.data.item.expireDate,
      })
      Toast({ message: '保存成功', selector: '#t-toast' })
      this.setData({ editing: false, saving: false })
    } catch (e) { this.setData({ saving: false }) }
  },

  onDelete() {
    Dialog({
      title: '删除物品', content: '删除后不可恢复，确定要删除吗？',
      confirmBtn: '删除', cancelBtn: '取消', selector: '#t-dialog', closeBtn: true,
    }).then((res: any) => {
      if (res.confirm) {
        call('deleteItem', { itemId: this.data.itemId, fridgeId: this.data.fridgeId }).then(() => {
          Toast({ message: '已删除', selector: '#t-toast' })
          wx.navigateBack()
        }).catch(() => { })
      }
    })
  },
})