// fridge.ts
import { call } from "../../utils/cloud";
import { getIconEmoji } from "../../utils/icons";

const app = getApp<IAppOption>();

Page({
  data: {
    theme: "warm",
    loading: true,
    refreshing: false,
    fridgeId: "",
    fridgeName: "客厅冰箱",
    fridgeImage: "",
    doorType: "double",
    doorTypeText: "双开门",
    hasConstantZone: false,
    constantZone: null as any,
    zones: [] as any[],
    displayZones: [] as any[],
    stats: { total: 0, expiring: 0, expired: 0, safe: 0 },
    swipeRight: [{ text: "删除", className: "swipe-delete" }],
    deleteVisible: false,
    deleteItemId: "",
  },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || "" });
    this.loadFridgeData(true);
  },

  onShow() {
    this.setData({ theme: app.globalData.theme || "warm" });
    // 返回页面（如添加物品后）静默刷新，不闪骨架屏
    this.loadFridgeData(false);
  },

  async loadFridgeData(showSkeleton = false) {
    if (showSkeleton) {
      this.setData({ loading: true })
    } else {
      // 静默刷新：内容微微变淡，作为过渡动画的起点
      this.setData({ refreshing: true })
    }
    try {
      const data = await call("getFridgeDetail", {
        fridgeId: this.data.fridgeId,
      });
      if (data) {
        const allLayers: any[] = [];
        const zones = (data.zones || []).map((zone: any) => {
          const layers = (zone.layers || []).map((layer: any) => {
            const items = (data.items || [])
              .filter(
                (item: any) =>
                  item.zoneId === zone.zoneId && item.layerId === layer.layerId,
              )
              .map((item: any) => {
                const diffDays = Math.max(0, Math.ceil((new Date(item.expireDate).getTime() - Date.now()) / 86400000))
                return {
                  ...item,
                  iconEmoji: getIconEmoji(item.icon),
                  expireText:
                    item.status === "danger"
                      ? "已过期"
                      : item.status === "warning"
                        ? `临期${diffDays}天`
                        : "",
                }
              });
            const layerData = {
              ...layer,
              items: items,
              itemCount: items.length,
              expanded: true,
              statusTag: this.getLayerStatusTag(items),
              statusText: this.getLayerStatusText(items),
            };
            allLayers.push(layerData);
            return layerData;
          });
          return { ...zone, layers };
        });

        // 恒温层
        let constantZone = null;
        if (data.hasConstantZone && data.constantZone) {
          const cz = data.constantZone;
          const layers = (cz.layers || []).map((layer: any) => {
            const items = (data.items || [])
              .filter(
                (item: any) =>
                  item.zoneId === cz.zoneId && item.layerId === layer.layerId,
              )
              .map((item: any) => ({
                ...item,
                iconEmoji: getIconEmoji(item.icon),
              }));
            return {
              ...layer,
              items,
              itemCount: items.length,
              expanded: true,
              statusTag: this.getLayerStatusTag(items),
              statusText: this.getLayerStatusText(items),
            };
          });
          constantZone = { ...cz, layers };
          allLayers.push(...layers);
        }

        let total = 0,
          expiring = 0,
          expired = 0,
          safe = 0;
        allLayers.forEach((layer: any) => {
          (layer.items || []).forEach((item: any) => {
            total += item.quantity || 1;
            if (item.status === "danger") expired++;
            else if (item.status === "warning") expiring++;
            else safe++;
          });
        });

        // 单开门：恒温层插入分区中间；双开门：恒温层保持在底部（单独渲染）
        const isSingle = (data.doorType || "double") === "single";
        let displayZonesList: any[] = (zones || []).map((z: any) => ({ key: z.zoneId, type: "zone", zone: z }));
        if (isSingle && data.hasConstantZone && constantZone) {
          const mid = Math.floor((zones || []).length / 2);
          displayZonesList.splice(mid, 0, { key: constantZone.zoneId, type: "constant", zone: constantZone });
        }

        this.setData({
          fridgeName: data.name || "冰箱",
          fridgeImage: data.image || "",
          doorType: data.doorType || "double",
          doorTypeText: data.doorType === "double" ? "双开门" : "单开门",
          hasConstantZone: data.hasConstantZone || false,
          constantZone,
          zones,
          displayZones: displayZonesList,
          stats: { total, expiring, expired, safe },
        });
      }
    } catch (e) {
      console.error("loadFridgeData error:", e);
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  getLayerStatusTag(items: any[]): string {
    if (!items.length) return "success";
    if (items.some((i: any) => i.status === "danger")) return "danger";
    if (items.some((i: any) => i.status === "warning")) return "warning";
    return "success";
  },

  getLayerStatusText(items: any[]): string {
    if (!items.length) return "安全";
    if (items.some((i: any) => i.status === "danger")) return "已过期";
    if (items.some((i: any) => i.status === "warning")) return "临期";
    return "安全";
  },

  onBack() {
    wx.navigateBack();
  },
  onSettings() {
    wx.navigateTo({
      url: `/pages/fridge-settings/fridge-settings?fridgeId=${this.data.fridgeId}`,
    });
  },
  onAddItem() {
    wx.navigateTo({
      url: `/pages/item-edit/item-edit?fridgeId=${this.data.fridgeId}`,
    });
  },
  onAddItemFromLayer(e: any) {
    const { zoneId, layerId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/item-edit/item-edit?fridgeId=${this.data.fridgeId}&zoneId=${zoneId}&layerId=${layerId}`,
    });
  },

  onLayerTap(e: any) {
    const { zoneId, layerId } = e.currentTarget.dataset;
    const toggle = (list: any[]) =>
      list.forEach((l: any) => {
        if (l.layerId === layerId) l.expanded = !l.expanded;
      });
    this.data.zones.forEach((z: any) => toggle(z.layers));
    if (this.data.constantZone) toggle(this.data.constantZone.layers);
    this.setData({
      zones: this.data.zones,
      constantZone: this.data.constantZone,
    });
  },

  onItemDetail(e: any) {
    const itemId = e.currentTarget.dataset.itemId;
    wx.navigateTo({ url: `/pages/item-detail/item-detail?itemId=${itemId}&fridgeId=${this.data.fridgeId}` });
  },

  onDeleteItem(e: any) {
    const itemId = e.currentTarget.dataset.itemId;
    this.setData({ deleteVisible: true, deleteItemId: itemId });
  },

  onDeleteConfirm() {
    this.setData({ deleteVisible: false });
    call("deleteItem", { itemId: this.data.deleteItemId, fridgeId: this.data.fridgeId })
      .then(() => {
        app.globalData.fridgeListVersion++;
        wx.showToast({ title: "删除成功", icon: "success" });
        // 删除后静默刷新，不闪骨架屏
        this.loadFridgeData(false);
      })
      .catch(() => { });
  },

  onDeleteCancel() {
    this.setData({ deleteVisible: false });
  },
});
