// fridge.ts
import { call } from '../../utils/cloud'
import { getIconEmoji } from '../../utils/icons'
import { Dialog } from 'tdesign-miniprogram'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    fridgeId: '',
    fridgeName: '客厅冰箱',
    doorType: 'double',
    doorTypeText: '双开门',
    hasConstantZone: false,
    constantZone: null as any,
    zones: [] as any[],
    stats: { total: 0, expiring: 0, expired: 0, safe: 0 },
    swipeRight: [{ text: '删除', className: 'swipe-delete' }],
  },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || '' })
    this.loadFridgeData()
  },

  onShow() {
    this.setData({ theme: app.globalData.theme || 'warm' })
    this.loadFridgeData()
  },

  async loadFridgeData() {
    try {
      const data = await call('getFridgeDetail', { fridgeId: this.data.fridgeId })
      if (data) {
        const allLayers: any[] = []
        const zones = (data.zones || []).map((zone: any) => {
          const layers = (zone.layers || []).map((layer: any) => {
            const items = (data.items || []).filter((item: any) =>
              item.zoneId === zone.zoneId && item.layerId === layer.layerId
            ).map((item: any) => ({
              ...item,
              iconEmoji: getIconEmoji(item.icon),
              expireText: item.status === 'danger' ? '已过期'
                : item.status === 'warning' ? ('临期' + item.diffDays + '天') : '',
            }))
            const layerData = {
              ...layer,
              items: items,
              itemCount: items.length,
              expanded: false,
              statusTag: this.getLayerStatusTag(items),
              statusText: this.getLayerStatusText(items),
            }
            allLayers.push(layerData)
            return layerData
          })
          return { ...zone, layers }
        })

        // 恒温层
        let constantZone = null
        if (data.hasConstantZone && data.constantZone) {
          const cz = data.constantZone
          const layers = (cz.layers || []).map((layer: any) => {
            const items = (data.items || []).filter((item: any) =>
              item.zoneId === cz.zoneId && item.layerId === layer.layerId
            ).map((item: any) => ({
              ...item,
              iconEmoji: getIconEmoji(item.icon),
            }))
            return {
              ...layer, items, itemCount: items.length, expanded: false,
              statusTag: this.getLayerStatusTag(items), statusText: this.getLayerStatusText(items)
            }
          })
          constantZone = { ...cz, layers }
          allLayers.push(...layers)
        }

        let total = 0, expiring = 0, expired = 0, safe = 0
        allLayers.forEach((layer: any) => {
          (layer.items || []).forEach((item: any) => {
            total += item.quantity || 1
            if (item.status === 'danger') expired++
            else if (item.status === 'warning') expiring++
            else safe++
          })
        })

        this.setData({
          fridgeName: data.name || '冰箱',
          doorType: data.doorType || 'double',
          doorTypeText: data.doorType === 'double' ? '双开门' : '单开门',
          hasConstantZone: data.hasConstantZone || false,
          constantZone,
          zones,
          stats: { total, expiring, expired, safe },
        })
      }
    } catch (e) {
      console.error('loadFridgeData error:', e)
    }
  },

  getLayerStatusTag(items: any[]): string {
    if (!items.length) return 'success'
    if (items.some((i: any) => i.status === 'danger')) return 'danger'
    if (items.some((i: any) => i.status === 'warning')) return 'warning'
    return 'success'
  },

  getLayerStatusText(items: any[]): string {
    if (!items.length) return '安全'
    if (items.some((i: any) => i.status === 'danger')) return '已过期'
    if (items.some((i: any) => i.status === 'warning')) return '临期'
    return '安全'
  },

  onBack() { wx.navigateBack() },
  onSettings() {
    wx.navigateTo({ url: `/pages/fridge-settings/fridge-settings?fridgeId=${this.data.fridgeId}` })
  },
  onAddItem() {
    wx.navigateTo({ url: `/pages/item-edit/item-edit?fridgeId=${this.data.fridgeId}` })
  },
  onAddItemFromLayer(e: any) {
    const { zoneId, layerId } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/item-edit/item-edit?fridgeId=${this.data.fridgeId}&zoneId=${zoneId}&layerId=${layerId}` })
  },

  onLayerTap(e: any) {
    const { zoneId, layerId } = e.currentTarget.dataset
    const toggle = (list: any[]) => list.forEach((l: any) => {
      if (l.layerId === layerId) l.expanded = !l.expanded
    })
    this.data.zones.forEach((z: any) => toggle(z.layers))
    if (this.data.constantZone) toggle(this.data.constantZone.layers)
    this.setData({ zones: this.data.zones, constantZone: this.data.constantZone })
  },

  onItemDetail(e: any) {
    const itemId = e.currentTarget.dataset.itemId
    wx.navigateTo({ url: `/pages/item-detail/item-detail?itemId=${itemId}` })
  },

  onDeleteItem(e: any) {
    const itemId = e.currentTarget.dataset.itemId
    Dialog({
      title: '删除物品', content: '确定要删除该物品吗？', confirmBtn: '删除', cancelBtn: '取消',
      selector: '#t-dialog', closeBtn: true,
    }).then((res: any) => {
      if (res.confirm) {
        call('deleteItem', { itemId, fridgeId: this.data.fridgeId }).then(() => {
          this.loadFridgeData()
        }).catch(() => { })
      }
    })
  },
})