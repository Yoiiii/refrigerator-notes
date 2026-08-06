// item-edit.ts
import { call, uploadFile } from '../../utils/cloud'
import { ICON_CATEGORIES } from '../../utils/icons'
import { Toast } from 'tdesign-miniprogram'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    isEdit: false, itemId: '', fridgeId: '',
    itemName: '鲜牛奶', quantity: 2, expireDate: '2026-08-15',
    images: [] as any[],
    selectedZoneName: '冷藏区', selectedLayerName: '第1层',
    zoneId: 'z1', layerId: 'l1',
    activeTab: 'image',
    selectedIcon: 'milk',
    iconCategories: ICON_CATEGORIES,
    saving: false,
  },

  onLoad(options: any) {
    this.setData({ theme: app.globalData.theme || 'warm' })
    if (options.itemId) { this.setData({ isEdit: true, itemId: options.itemId }); this.loadItem() }
    if (options.fridgeId) this.setData({ fridgeId: options.fridgeId })
    if (options.zoneId) this.setData({ zoneId: options.zoneId })
    if (options.layerId) this.setData({ layerId: options.layerId })
  },

  async loadItem() {
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId })
      const item = (data?.items || []).find((i: any) => i._id === this.data.itemId)
      if (item) {
        this.setData({
          itemName: item.name, quantity: item.quantity, expireDate: item.expireDate,
          images: (item.images || []).map((url: string) => ({ url })),
          selectedIcon: item.icon || 'box', zoneId: item.zoneId, layerId: item.layerId,
        })
      }
    } catch (e) { }
  },

  onBack() { wx.navigateBack() },
  onNameChange(e: any) { this.setData({ itemName: e.detail.value }) },
  onQuantityChange(e: any) { this.setData({ quantity: e.detail.value }) },
  onDatePicker() { wx.showToast({ title: '选择日期', icon: 'none' }) },
  onTabChange(e: any) { this.setData({ activeTab: e.detail.value }) },

  onUploadAdd(e: any) {
    this.setData({ images: e.detail.files })
  },
  onUploadRemove(e: any) {
    this.setData({ images: e.detail.files })
  },

  onIconSelect(e: any) {
    this.setData({ selectedIcon: e.currentTarget.dataset.key })
  },

  onLocationPicker() {
    wx.showToast({ title: '选择存放位置', icon: 'none' })
  },

  async onSave() {
    if (!this.data.itemName) { Toast({ message: '请输入物品名称', selector: '#t-toast' }); return }
    if (!this.data.expireDate) { Toast({ message: '请选择保质期', selector: '#t-toast' }); return }
    this.setData({ saving: true })
    try {
      const payload: any = {
        fridgeId: this.data.fridgeId,
        zoneId: this.data.zoneId, layerId: this.data.layerId,
        name: this.data.itemName, icon: this.data.selectedIcon,
        quantity: this.data.quantity, unit: '件', expireDate: this.data.expireDate,
        images: this.data.images.map((f: any) => f.url || f.fileID),
      }
      if (this.data.isEdit) {
        payload.itemId = this.data.itemId
        await call('updateItem', payload)
      } else {
        await call('addItem', payload)
      }
      Toast({ message: '保存成功', selector: '#t-toast' })
      wx.navigateBack()
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})