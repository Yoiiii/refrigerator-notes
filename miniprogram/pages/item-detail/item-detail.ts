// item-detail.ts
import { call } from '../../utils/cloud'
import { getIconEmoji } from '../../utils/icons'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    itemId: '', fridgeId: '',
    item: {} as any,
    editing: false, saving: false,
    canEdit: true,
    deleteVisible: false,
  },

  onLoad(options: any) {
    this.setData({ itemId: options.itemId || '', theme: app.globalData.theme || 'warm',fridgeId: options.fridgeId})
    this.loadItem()
  },

  async loadItem() {
    try {
      const data = await call('getItemDetail', {
        itemId: this.data.itemId,
        fridgeId: this.data.fridgeId,
      })
      if (data) {
        this.setData({
          item: {
            ...data,
            iconEmoji: getIconEmoji(data.icon),
            statusTag: data.statusTag || 'success',
            statusText: data.statusText || '安全',
            diffDays: data.diffDays,
          },
          fridgeId: data.fridgeId || this.data.fridgeId,
          canEdit: !!data.canEdit,
        })
      }
    } catch (e) {
      this.setData({
        canEdit: true,
        item: {
          _id: this.data.itemId, name: '鲜牛奶', iconEmoji: '🥛', quantity: 2, unit: '瓶',
          expireDate: '2026-08-15', statusTag: 'success', statusText: '安全',
          locationText: '冷藏区·第1层', createdAt: '2026-08-01', updatedAt: '2026-08-05',
        },
      })
    }
  },

  onBack() { wx.navigateBack() },
  onEdit() {
    if (!this.data.canEdit) {
      Toast({ context: this, message: '没有编辑权限', selector: '#t-toast' })
      return
    }
    this.setData({ editing: true })
  },
  onCancelEdit() { this.setData({ editing: false }) },
  onNameChange(e: any) { this.setData({ 'item.name': e.detail.value }) },
  onQuantityChange(e: any) { this.setData({ 'item.quantity': e.detail.value }) },
  onDatePicker() { wx.showToast({ title: '选择日期', icon: 'none' }) },

  async onSave() {
    if (!this.data.canEdit) return
    this.setData({ saving: true })
    try {
      await call('updateItem', {
        itemId: this.data.itemId, fridgeId: this.data.fridgeId,
        name: this.data.item.name, quantity: this.data.item.quantity,
        expireDate: this.data.item.expireDate,
      })
      app.globalData.fridgeListVersion++
      Toast({ context: this, message: '保存成功', selector: '#t-toast' })
      this.setData({ editing: false, saving: false })
    } catch (e) { this.setData({ saving: false }) }
  },

  onDelete() {
    if (!this.data.canEdit) return
    this.setData({ deleteVisible: true })
  },

  onDeleteConfirm() {
    this.setData({ deleteVisible: false })
    call('deleteItem', { itemId: this.data.itemId, fridgeId: this.data.fridgeId }).then(() => {
      app.globalData.fridgeListVersion++
      Toast({ context: this, message: '已删除', selector: '#t-toast' })
      wx.navigateBack()
    }).catch(() => { })
  },

  onDeleteCancel() {
    this.setData({ deleteVisible: false })
  },
})
