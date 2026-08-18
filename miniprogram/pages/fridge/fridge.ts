// fridge.ts
import { call, getTempFileURLs } from "../../utils/cloud";
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
    role: "",
    loadError: false,
  },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || "" });
    ;(this as any)._firstShow = true;
    this.loadFridgeData(true);
  },

  onShow() {
    this.setData({ theme: app.globalData.theme || "warm" });
    // 首屏由 onLoad 已发起请求，避免与 onShow 并发双发；仅当从子页返回（非首次）才静默刷新
    if ((this as any)._firstShow) {
      (this as any)._firstShow = false;
      return;
    }
    this.loadFridgeData(false);
  },

  async loadFridgeData(showSkeleton = false) {
    if (showSkeleton) {
      this.setData({ loading: true })
    } else {
      // 静默刷新：内容微微变淡，作为过渡动画的起点
      this.setData({ refreshing: true })
    }
    this.setData({ loadError: false })
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
                // 用本地零点计算临期天数，规避 new Date('YYYY-MM-DD') 的时区偏移与 iOS 解析问题（P2-03）
                const [ey, em, ed] = item.expireDate.split('-').map(Number)
                const now = new Date()
                const expireTs = new Date(ey, em - 1, ed).getTime()
                const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
                const diffDays = Math.max(0, Math.round((expireTs - todayTs) / 86400000))
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

        // 解析云存储图片 fileID -> https 临时链接，确保 t-image 可正常渲染（P2-07）
        const allItems: any[] = [];
        zones.forEach((z: any) => (z.layers || []).forEach((l: any) => allItems.push(...(l.items || []))));
        if (constantZone) constantZone.layers.forEach((l: any) => allItems.push(...(l.items || [])));
        const cloudIds: string[] = [];
        allItems.forEach((it: any) => (it.images || []).forEach((img: any) => {
          if (typeof img === "string" && img.indexOf("cloud://") === 0) cloudIds.push(img);
        }));
        let fridgeImage = data.image || "";
        if (cloudIds.length) {
          const map = await getTempFileURLs(Array.from(new Set(cloudIds)));
          allItems.forEach((it: any) => {
            it.images = (it.images || []).map((img: any) =>
              (typeof img === "string" && img.indexOf("cloud://") === 0) ? (map[img] || img) : img);
          });
        }
        if (typeof fridgeImage === "string" && fridgeImage.indexOf("cloud://") === 0) {
          const m = await getTempFileURLs([fridgeImage]);
          fridgeImage = m[fridgeImage] || fridgeImage;
        }

        this.setData({
          fridgeName: data.name || "冰箱",
          role: data.role || "",
          fridgeImage,
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
      this.setData({ loadError: true });
      wx.showToast({ title: "加载失败，请重试", icon: "none" });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  // 计算物品临期文案：已过期 / 临期N天 / 空（安全）。分区层与恒温层共用（P2-02）
  getExpireText(item: any): string {
    if (item.status === "danger") return "已过期"
    if (item.status === "warning") {
      const [ey, em, ed] = item.expireDate.split("-").map(Number)
      const now = new Date()
      const expireTs = new Date(ey, em - 1, ed).getTime()
      const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const diffDays = Math.max(0, Math.round((expireTs - todayTs) / 86400000))
      return diffDays === 0 ? "今天到期" : `临期${diffDays}天`
    }
    return ""
  },

  getLayerStatusTag(items: any[]): string {    if (!items.length) return "success";
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
    const patch: Record<string, any> = {};
    this.data.zones.forEach((z: any, zi: number) => {
      (z.layers || []).forEach((l: any, li: number) => {
        if (l.layerId === layerId) patch[`zones[${zi}].layers[${li}].expanded`] = !l.expanded;
      });
    });
    if (this.data.constantZone) {
      this.data.constantZone.layers.forEach((l: any, li: number) => {
        if (l.layerId === layerId) patch[`constantZone.layers[${li}].expanded`] = !l.expanded;
      });
    }
    this.setData(patch);
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
      .catch(() => {
        wx.showToast({ title: '删除失败，请重试', icon: 'none' })
      });
  },

  onDeleteCancel() {
    this.setData({ deleteVisible: false });
  },

  onRetry() {
    this.loadFridgeData(true);
  },
});
