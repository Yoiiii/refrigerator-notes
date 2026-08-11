// fridge-create.ts
import { call } from '../../utils/cloud'
import { Toast } from 'tdesign-miniprogram'

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
    isEdit: false, fridgeId: '', fridgeName: '客厅冰箱', doorType: 'double',
    hasConstantZone: false,
    constantZone: {
      zoneId: 'cz1', name: '恒温区', tempType: 'constant',
      layers: [{ layerId: 'cl1', index: 0, name: '恒温层' }]
    } as any,
    zones: [] as any[],
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

  initDefault() {
    this.setData({
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
      }
    } catch (e) { }
  },

  onBack() { wx.navigateBack() },
  onReset() { this.initDefault() },
  onNameChange(e: any) { this.setData({ fridgeName: e.detail.value }) },
  onDoorTypeChange(e: any) { this.setData({ doorType: e.detail.value }) },
  onConstantZoneSwitch(e: any) { this.setData({ hasConstantZone: e.detail.value }) },
  onConstantZoneName(e: any) {
    this.setData({ 'constantZone.name': e.detail.value })
  },
  onConstantZoneLayers(e: any) {
    const count = e.detail.value
    const cz = this.data.constantZone
    const current = cz.layers.length
    if (count > current) {
      for (let i = current + 1; i <= count; i++) cz.layers.push({ layerId: `cl${i}`, index: i - 1, name: `恒温层${i > 1 ? i : ''}` })
    } else {
      cz.layers = cz.layers.slice(0, count)
    }
    this.setData({ constantZone: cz })
  },

  onZoneNameChange(e: any) {
    const zi = e.currentTarget.dataset.zi
    this.setData({ [`zones[${zi}].name`]: e.detail.value })
  },
  onZoneTempTypeChange(e: any) {
    const zi = e.currentTarget.dataset.zi
    this.setData({ [`zones[${zi}].tempType`]: e.detail.value })
  },
  onZoneLayersChange(e: any) {
    const zi = e.currentTarget.dataset.zi
    const count = e.detail.value
    const zone = this.data.zones[zi]
    const current = zone.layers.length
    if (count > current) {
      for (let i = current + 1; i <= count; i++) {
        zone.layers.push({ layerId: `l${Date.now()}_${i}`, index: i - 1, name: `第${i}层` })
      }
    } else { zone.layers = zone.layers.slice(0, count) }
    this.setData({ [`zones[${zi}]`]: zone })
  },

  onAddZone() {
    const zones = this.data.zones
    if (zones.length >= 4) { Toast({ message: '最多4个分区', selector: '#t-toast' }); return }
    const idx = zones.length
    zones.push({
      zoneId: `z${Date.now()}`, name: idx === 0 ? '冷藏区' : '冷冻区',
      tempType: idx === 0 ? 'cold' : 'freeze',
      layers: [{ layerId: `l${Date.now()}_1`, index: 0, name: '第1层' }, { layerId: `l${Date.now()}_2`, index: 1, name: '第2层' }],
    })
    this.setData({ zones })
  },

  onDeleteZone(e: any) {
    const zi = e.currentTarget.dataset.zi
    const zones = this.data.zones
    if (zones.length <= 1) {
      Toast({ message: '至少保留一个分区', selector: '#t-toast' })
      return
    }
    zones.splice(zi, 1)
    this.setData({ zones })
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

  onUploadAdd(e: any) {
    this.setData({ images: e.detail.files, selectedImageIndex: -1 })
  },
  onUploadRemove(e: any) {
    this.setData({ images: e.detail.files, selectedImageIndex: -1 })
  },

  async onSave() {
    if (!this.data.fridgeName) { Toast({ message: '请输入冰箱名称', selector: '#t-toast' }); return }
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
      Toast({ message: '保存成功', selector: '#t-toast' })
      wx.navigateBack()
    } catch (e) {
      this.setData({ saving: false })
    }
  },
})