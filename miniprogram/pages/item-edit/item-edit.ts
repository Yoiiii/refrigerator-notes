// item-edit.ts
import { call, uploadFile } from '../../utils/cloud'
import { ICON_CATEGORIES } from '../../utils/icons'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    isEdit: false, itemId: '', fridgeId: '',
    itemName: '', quantity: 1, expireDate: '',
    images: [] as any[],
    // 位置选择
    zones: [] as any[],
    zoneNames: [] as string[],
    layerNames: [] as string[],
    zoneIndex: 0,
    layerIndex: 0,
    selectedZoneName: '',
    selectedLayerName: '',
    zoneId: '',
    layerId: '',
    // 图标
    activeTab: 'icon',
    selectedIcon: 'milk',
    iconCategories: ICON_CATEGORIES,
    saving: false,
  },

  onLoad(options: any) {
    this.setData({ theme: app.globalData.theme || 'warm' })
    if (options.fridgeId) this.setData({ fridgeId: options.fridgeId })
    if (options.zoneId) this.setData({ zoneId: options.zoneId })
    if (options.layerId) this.setData({ layerId: options.layerId })
    if (options.itemId) {
      this.setData({ isEdit: true, itemId: options.itemId })
      this.loadItem()
    }
    this.loadFridgeStructure()
  },

  /** 加载冰箱分区结构用于位置选择 */
  async loadFridgeStructure() {
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId })
      if (!data) return
      const allZones: any[] = [...(data.zones || [])]
      if (data.hasConstantZone && data.constantZone) {
        allZones.push(data.constantZone)
      }
      const zoneNames = allZones.map((z: any) => z.name)
      // 若从冰箱页点击「添加物品」带入了 zoneId/layerId，则定位到对应分区与层；
      // 否则默认选中第一个分区的第一个层
      const presetZoneId = this.data.zoneId
      const presetLayerId = this.data.layerId
      let zoneIndex = 0
      if (presetZoneId) {
        const idx = allZones.findIndex((z: any) => z.zoneId === presetZoneId)
        if (idx >= 0) zoneIndex = idx
      }
      const targetZone = allZones[zoneIndex]
      const layerNames = targetZone?.layers?.map((l: any) => l.name) || []
      let layerIndex = 0
      if (presetLayerId && targetZone?.layers) {
        const lidx = targetZone.layers.findIndex((l: any) => l.layerId === presetLayerId)
        if (lidx >= 0) layerIndex = lidx
      }
      this.setData({
        zones: allZones,
        zoneNames,
        zoneIndex,
        layerNames,
        layerIndex,
        selectedZoneName: targetZone?.name || '',
        selectedLayerName: targetZone?.layers?.[layerIndex]?.name || '',
        zoneId: targetZone?.zoneId || '',
        layerId: targetZone?.layers?.[layerIndex]?.layerId || '',
      })
    } catch (e) {
      console.error('loadFridgeStructure error:', e)
    }
  },

  async loadItem() {
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId })
      const item = (data?.items || []).find((i: any) => i._id === this.data.itemId)
      if (item) {
        this.setData({
          itemName: item.name, quantity: item.quantity, expireDate: item.expireDate,
          images: (item.images || []).map((url: string) => ({ url })),
          selectedIcon: item.icon || 'box',
        })
        // 匹配物品的 zone/layer，定位 picker 索引
        const zoneIdx = this.data.zoneNames.indexOf(item.zoneId)
        if (zoneIdx >= 0) {
          this.setData({ zoneIndex: zoneIdx, zoneId: item.zoneId, selectedZoneName: this.data.zones[zoneIdx]?.name })
          const zone = this.data.zones[zoneIdx]
          const layerNames = zone?.layers?.map((l: any) => l.name) || []
          const layerIdx = zone?.layers?.findIndex((l: any) => l.layerId === item.layerId) || 0
          this.setData({ layerNames, layerIndex: layerIdx, layerId: item.layerId, selectedLayerName: layerNames[layerIdx] || '' })
        }
      }
    } catch (e) { }
  },

  onBack() { wx.navigateBack() },
  onNameChange(e: any) { this.setData({ itemName: e.detail.value }) },
  onQuantityChange(e: any) { this.setData({ quantity: e.detail.value }) },
  onDateChange(e: any) { this.setData({ expireDate: e.detail.value }) },
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

  /** 选择分区 */
  onZoneChange(e: any) {
    const zoneIndex = e.detail.value
    const zone = this.data.zones[zoneIndex]
    if (!zone) return
    const layerNames = zone.layers?.map((l: any) => l.name) || []
    this.setData({
      zoneIndex,
      zoneId: zone.zoneId,
      selectedZoneName: zone.name,
      layerNames,
      layerIndex: 0,
      layerId: zone.layers?.[0]?.layerId || '',
      selectedLayerName: zone.layers?.[0]?.name || '',
    })
  },

  /** 选择层 */
  onLayerChange(e: any) {
    const layerIndex = e.detail.value
    const zone = this.data.zones[this.data.zoneIndex]
    const layer = zone?.layers?.[layerIndex]
    if (!layer) return
    this.setData({
      layerIndex,
      layerId: layer.layerId,
      selectedLayerName: layer.name,
    })
  },

  async onSave() {
    if (!this.data.itemName) { Toast({ context: this, message: '请输入物品名称', selector: '#t-toast' }); return }
    if (!this.data.expireDate) { Toast({ context: this, message: '请选择保质期', selector: '#t-toast' }); return }
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
      app.globalData.homeDataDirty = true
      Toast({ context: this, message: '保存成功', selector: '#t-toast' })
      setTimeout(() => wx.navigateBack(), 300)
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})
