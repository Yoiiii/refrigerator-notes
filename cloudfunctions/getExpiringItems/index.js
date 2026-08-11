// cloudfunctions/getExpiringItems/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/** 将 Date 转为本地日期字符串 YYYY-MM-DD */
function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  // 获取用户信息（含 notifyDays）
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  const notifyDays = userRes.data.length > 0 ? (userRes.data[0].notifyDays || 3) : 3

  // 获取用户所有冰箱
  const relations = await db.collection('user_fridge').where({ userId: OPENID }).get()
  if (relations.data.length === 0) return { code: 0, data: [] }

  const fridgeIds = relations.data.map((r) => r.fridgeId)
  const now = new Date()
  const thresholdDate = new Date(now.getTime() + notifyDays * 24 * 60 * 60 * 1000)
  const todayStr = toDateStr(now)
  const thresholdStr = toDateStr(thresholdDate)

  // 用字符串比较日期（expireDate 存储的是 YYYY-MM-DD 字符串）
  const items = await db.collection('items')
    .where({
      fridgeId: _.in(fridgeIds),
      expireDate: _.gte(todayStr).and(_.lte(thresholdStr)),
    })
    .orderBy('expireDate', 'asc')
    .get()

  // 额外查询已过期的物品
  const expiredItems = await db.collection('items')
    .where({
      fridgeId: _.in(fridgeIds),
      expireDate: _.lt(todayStr),
    })
    .orderBy('expireDate', 'asc')
    .get()

  const allItems = [...expiredItems.data, ...items.data]

  // 获取所有相关冰箱，构建 zone/layer 名称映射
  const fridgesRes = await db.collection('fridges').where({ _id: _.in(fridgeIds) }).get()
  const zoneMap = {}  // zoneId -> zoneName
  const layerMap = {} // layerId -> layerName
  fridgesRes.data.forEach((f) => {
    const allZones = [...(f.zones || [])]
    if (f.hasConstantZone && f.constantZone) {
      allZones.push(f.constantZone)
    }
    allZones.forEach((z) => {
      zoneMap[z.zoneId] = z.name
      ;(z.layers || []).forEach((l) => {
        layerMap[l.layerId] = l.name
      })
    })
  })

  const itemsWithStatus = allItems.map((item) => {
    const d = new Date(item.expireDate)
    let status = 'warning'
    if (d < now) status = 'danger'
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000)
    const statusText = status === 'danger' ? '已过期' : `临期${diffDays}天`
    const locationText = `${zoneMap[item.zoneId] || ''}·${layerMap[item.layerId] || ''}`
    return { ...item, status, statusText, diffDays, locationText }
  })

  return { code: 0, data: itemsWithStatus }
}
