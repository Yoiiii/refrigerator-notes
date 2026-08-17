// item-detail.ts
import { call, resolveCloudImages } from '../../utils/cloud'
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
    loadError: false,
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
        // 云存储图片 fileID 转 https 临时链接，确保正常渲染（P2-07）
        const rawImages: string[] = data.images || []
        const resolved = await resolveCloudImages(rawImages)
        this.setData({
          item: {
            ...data,
            images: resolved,
            iconEmoji: getIconEmoji(data.icon),
            statusTag: data.statusTag || 'success',
            statusText: data.statusText || '安全',
            diffDays: data.diffDays,
          },
          fridgeId: data.fridgeId || this.data.fridgeId,
          canEdit: !!data.canEdit,
          loadError: false,
        })
      }
    } catch (e) {
      // 加载失败：用真实 itemId 占位、明确标注加载失败，禁用编辑/删除，避免对假数据误操作
      this.setData({
        canEdit: false,
        loadError: true,
        item: {
          _id: this.data.itemId, name: '加载失败', iconEmoji: '📦', quantity: 0, unit: '',
          expireDate: '', statusTag: 'default', statusText: '加载失败',
          locationText: '—', createdAt: '—', updatedAt: '—',
        },
      })
      Toast({ context: this, message: '加载失败，请返回重试', selector: '#t-toast' })
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
  onDatePicker(e: any) { this.setData({ 'item.expireDate': e.detail.value }) },

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
