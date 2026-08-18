// item-edit.ts
import { call, uploadFile, deleteFile, resolveCloudImages } from '../../utils/cloud'
import { ICON_CATEGORIES } from '../../utils/icons'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

// 临期提醒订阅消息模板 ID（与 checkExpiry 云函数保持一致）
const EXPIRY_TEMPLATE_ID = '6x2llq5Twlj-EkeFnpDi2M6rmBNc5-a-wke0wl6bk8E'

Page({
  data: {
    theme: 'warm',
    isEdit: false, itemId: '', fridgeId: '',
    itemName: '', quantity: 1, expireDate: '',
    unit: '件',
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

  async onLoad(options: any) {
    this.setData({ theme: app.globalData.theme || 'warm' })
    if (options.fridgeId) this.setData({ fridgeId: options.fridgeId })
    if (options.zoneId) this.setData({ zoneId: options.zoneId })
    if (options.layerId) this.setData({ layerId: options.layerId })
    // 先加载冰箱分区结构，确保定位时 this.data.zones 已就绪，避免与 loadItem 竞态（P1-01）
    await this.loadFridgeStructure()
    if (options.itemId) {
      this.setData({ isEdit: true, itemId: options.itemId })
      this.loadItem()
    }
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
        // 图片字段存的是云存储 fileID（cloud:// 开头），旧数据可能是临时 url；
        // 统一整理成 { fileID, url }，url 直接用 fileID（<image> 原生支持 cloud:// 显示）
        const rawImages: string[] = item.images || []
        const images = rawImages.map((img: string) => {
          const isCloud = typeof img === 'string' && img.indexOf('cloud://') === 0
          return { fileID: isCloud ? img : '', url: img, type: 'image' }
        })
        this.setData({
          itemName: item.name, quantity: item.quantity, expireDate: item.expireDate,
          unit: item.unit || '件',
          images,
          selectedIcon: item.icon || 'box',
        })
        // 把云存储 fileID 转成 https 临时链接，确保原生/组件图片均可正常渲染（P2-07）
        const resolved = await resolveCloudImages(rawImages)
        this.setData({
          images: resolved.map((img: string) => {
            const isCloud = typeof img === 'string' && img.indexOf('cloud://') === 0
            return { fileID: isCloud ? img : '', url: img, type: 'image' }
          }),
        })
        // 匹配物品的 zone/layer，定位 picker 索引（按 zoneId 而非名称匹配，P1-01）
        const zoneIdx = this.data.zones.findIndex((z: any) => z.zoneId === item.zoneId)
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

  async onUploadAdd(e: any) {
    const selected: any[] = (e.detail && e.detail.files) || []
    if (!selected.length || this._uploading) return
    this._uploading = true
    wx.showLoading({ title: '上传中', mask: true })
    try {
      const uploaded: any[] = []
      for (const f of selected) {
        const localPath = f.url || f.tempFilePath || f.path
        if (!localPath) continue
        const ext = (localPath.split('.').pop() || 'png').split('?')[0]
        const cloudPath = `uploads/${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
        try {
          const fileID = await uploadFile(cloudPath, localPath)
          const resolvedUrl = (await resolveCloudImages([fileID]))[0] || fileID
          uploaded.push({ fileID, url: resolvedUrl, type: 'image' })
        } catch (err) {
          console.error('upload item image error:', err)
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
      if (uploaded.length) {
        this.setData({ images: [...this.data.images, ...uploaded].slice(0, 3) })
      }
    } finally {
      wx.hideLoading()
      this._uploading = false
    }
  },

  onUploadRemove(e: any) {
    const index = e.detail && e.detail.index
    if (index === undefined) return
    const images = this.data.images.slice()
    const removed = images[index]
    images.splice(index, 1)
    this.setData({ images })
    if (removed && removed.fileID) {
      deleteFile([removed.fileID]).catch(() => { })
    }
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
    // 顺带申请临期提醒订阅授权：必须在用户点击手势内同步发起（首个 await 之前），否则微信会拒绝弹窗
    const notifyEnabled = app.globalData.userInfo?.notifyEnabled
    if (notifyEnabled !== false) {
      wx.requestSubscribeMessage({
        tmplIds: [EXPIRY_TEMPLATE_ID],
        success: (res: any) => {
          // res[模板ID] 取值：accept=允许 / reject=用户拒绝 / ban=模板被封禁或非法（此时不会弹窗）
          console.log('[subscribe] 授权结果:', res, '本模板:', res?.[EXPIRY_TEMPLATE_ID])
        },
        fail: (err: any) => {
          // 真机不弹窗多半是这里报错（如 errCode 20001 模板ID未在小程序后台登记）
          console.error('[subscribe] 授权失败:', err)
          Toast({ context: this, message: `订阅授权失败 ${err?.errCode || ''}`, selector: '#t-toast' })
        },
      })
    }
    this.setData({ saving: true })
    try {
      const payload: any = {
        fridgeId: this.data.fridgeId,
        zoneId: this.data.zoneId, layerId: this.data.layerId,
        name: this.data.itemName, icon: this.data.selectedIcon,
        quantity: this.data.quantity, unit: this.data.unit, expireDate: this.data.expireDate,
        images: this.data.images.map((f: any) => f.fileID || f.url),
      }
      if (this.data.isEdit) {
        payload.itemId = this.data.itemId
        await call('updateItem', payload)
      } else {
        await call('addItem', payload)
      }
      app.globalData.fridgeListVersion++
      Toast({ context: this, message: '保存成功', selector: '#t-toast' })
      setTimeout(() => wx.navigateBack(), 300)
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})
