// fridge-create.ts
import { call } from '../../utils/cloud'
import { refreshFridgeLists } from '../../utils/refresh'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

// 预设冰箱图标
const PRESET_IMAGES = [
  '/assets/images/refrigerator1.png',
  '/assets/images/refrigerator2.png',
  '/assets/images/refrigerator3.png',
  '/assets/images/refrigerator4.png',
]

Page({
  data: {
    theme: 'warm',
    isEdit: false, fridgeId: '', fridgeName: '', doorType: 'double',
    hasConstantZone: false,
    constantZone: {
      zoneId: 'cz1', name: '恒温区', tempType: 'constant',
      layers: [{ layerId: 'cl1', index: 0, name: '恒温层' }]
    } as any,
    zones: [] as any[],
    previewZones: [] as any[],
    saving: false,
    // 图标/图片 Tab
    activeTab: 'icon',
    presetImages: PRESET_IMAGES,
    selectedImage: '',
    selectedImageIndex: -1,
    images: [] as any[],
  },

  onLoad(options: any) {
    this.setData({ theme: app.globalData.theme || 'warm' })
    if (options.fridgeId) {
      this.setData({ isEdit: true, fridgeId: options.fridgeId })
      this.loadFridge()
    } else {
      this.initDefault()
    }
  },

  // 重建实时预览顺序：与详情页一致
  // 单开门且开启恒温层时，恒温层置于分区中间；双开门恒温层保持在底部
  rebuildPreview() {
    const { zones, doorType, hasConstantZone, constantZone } = this.data
    const list = (zones || []).map((z: any) => ({ key: z.zoneId, type: 'zone', zone: z }))
    if (hasConstantZone && constantZone) {
      if (doorType === 'single') {
        const mid = Math.floor((zones || []).length / 2)
        list.splice(mid, 0, { key: constantZone.zoneId, type: 'constant', zone: constantZone })
      } else {
        list.push({ key: constantZone.zoneId, type: 'constant', zone: constantZone })
      }
    }
    this.setData({ previewZones: list })
  },

  initDefault() {
    this.setData({
      // 默认选中第一个预设图标
      selectedImageIndex: 0,
      selectedImage: PRESET_IMAGES[0],
      zones: [
        {
          zoneId: 'z1', name: '冷藏区', tempType: 'cold',
          layers: [{ layerId: 'l1', index: 0, name: '第1层' }, { layerId: 'l2', index: 1, name: '第2层' }, { layerId: 'l3', index: 2, name: '第3层' }]
        },
        {
          zoneId: 'z2', name: '冷冻区', tempType: 'freeze',
          layers: [{ layerId: 'l4', index: 0, name: '第1层' }, { layerId: 'l5', index: 1, name: '第2层' }, { layerId: 'l6', index: 2, name: '第3层' }]
        },
      ],
    })
    this.rebuildPreview()
  },

  async loadFridge() {
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId })
      if (data) {
        const image = data.image || ''
        const imageIndex = image ? PRESET_IMAGES.indexOf(image) : -1
        const images = image && imageIndex === -1 ? [{ url: image }] : []
        this.setData({
          fridgeName: data.name, doorType: data.doorType,
          hasConstantZone: data.hasConstantZone || false,
          constantZone: data.constantZone || this.data.constantZone,
          zones: data.zones || [],
          selectedImage: image,
          selectedImageIndex: imageIndex,
          images,
        })
        this.rebuildPreview()
      }
    } catch (e) { }
  },

  onBack() { wx.navigateBack() },
  onNameChange(e: any) { this.setData({ fridgeName: e.detail.value }) },
  onDoorTypeChange(e: any) { this.setData({ doorType: e.detail.value }); this.rebuildPreview() },
  onConstantZoneSwitch(e: any) { this.setData({ hasConstantZone: e.detail.value }); this.rebuildPreview() },
  onConstantZoneName(e: any) {
    this.setData({ 'constantZone.name': e.detail.value })
    this.rebuildPreview()
  },
  onConstantZoneLayers(e: any) {
    const count = e.detail.value
    const cz = JSON.parse(JSON.stringify(this.data.constantZone))
    const current = cz.layers.length
    if (count > current) {
      for (let i = current + 1; i <= count; i++) cz.layers.push({ layerId: `cl${i}`, index: i - 1, name: `恒温层${i > 1 ? i : ''}` })
    } else {
      cz.layers = cz.layers.slice(0, count)
    }
    this.setData({ constantZone: cz })
    this.rebuildPreview()
  },

  onZoneNameChange(e: any) {
    const zi = e.currentTarget.dataset.zi
    this.setData({ [`zones[${zi}].name`]: e.detail.value })
    this.rebuildPreview()
  },
  onZoneTempTypeChange(e: any) {
    const zi = e.currentTarget.dataset.zi
    this.setData({ [`zones[${zi}].tempType`]: e.detail.value })
    this.rebuildPreview()
  },
  onZoneLayersChange(e: any) {
    const zi = e.currentTarget.dataset.zi
    const count = e.detail.value
    const zone = JSON.parse(JSON.stringify(this.data.zones[zi]))
    const current = zone.layers.length
    if (count > current) {
      for (let i = current + 1; i <= count; i++) {
        zone.layers.push({ layerId: `l${Date.now()}_${i}`, index: i - 1, name: `第${i}层` })
      }
    } else { zone.layers = zone.layers.slice(0, count) }
    this.setData({ [`zones[${zi}]`]: zone })
    this.rebuildPreview()
  },

  onAddZone() {
    const zones = JSON.parse(JSON.stringify(this.data.zones))
    if (zones.length >= 4) { Toast({ context: this, message: '最多4个分区', selector: '#t-toast' }); return }
    const idx = zones.length
    zones.push({
      zoneId: `z${Date.now()}`, name: idx === 0 ? '冷藏区' : '冷冻区',
      tempType: idx === 0 ? 'cold' : 'freeze',
      layers: [{ layerId: `l${Date.now()}_1`, index: 0, name: '第1层' }, { layerId: `l${Date.now()}_2`, index: 1, name: '第2层' }],
    })
    this.setData({ zones })
    this.rebuildPreview()
  },

  onDeleteZone(e: any) {
    const zi = e.currentTarget.dataset.zi
    const zones = JSON.parse(JSON.stringify(this.data.zones))
    if (zones.length <= 1) {
      Toast({ context: this, message: '至少保留一个分区', selector: '#t-toast' })
      return
    }
    zones.splice(zi, 1)
    this.setData({ zones })
    this.rebuildPreview()
  },

  onTabChange(e: any) { this.setData({ activeTab: e.detail.value }) },

  onSelectPresetImage(e: any) {
    const index = e.currentTarget.dataset.index
    this.setData({
      selectedImage: this.data.presetImages[index],
      selectedImageIndex: index,
      images: [],
    })
  },

  onUploadChange(e: any) {
    this.setData({ images: e.detail.files, selectedImageIndex: -1 })
  },

  async onSave() {
    if (!this.data.fridgeName) { Toast({ context: this, message: '请输入冰箱名称', selector: '#t-toast' }); return }
    this.setData({ saving: true })
    try {
      const payload = {
        name: this.data.fridgeName,
        doorType: this.data.doorType,
        hasConstantZone: this.data.hasConstantZone,
        constantZone: this.data.hasConstantZone ? this.data.constantZone : undefined,
        zones: this.data.zones,
        image: this.data.images[0]?.url || this.data.images[0]?.fileID || this.data.selectedImage || '',
      }
      if (this.data.isEdit) {
        await call('updateFridge', { fridgeId: this.data.fridgeId, ...payload })
      } else {
        await call('createFridge', payload)
      }
      app.globalData.fridgeListVersion++
      Toast({ context: this, message: '保存成功', selector: '#t-toast' })
      // 主动刷新页面栈里的首页/我的列表（不依赖 onShow 时序）
      refreshFridgeLists()
      wx.navigateBack()
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})
