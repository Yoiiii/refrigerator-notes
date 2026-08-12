// cloudfunctions/getItemDetail/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/** 将时间值格式化为可直接展示的 YYYY-MM-DD HH:mm */
function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { itemId, fridgeId } = event
  if (!itemId || !fridgeId) return { code: -2, msg: '缺少必要参数' }

  // 确认当前用户与冰箱的关系及角色
  const relation = await db.collection('user_fridge')
    .where({ userId: OPENID, fridgeId })
    .get()
  if (relation.data.length === 0) return { code: -3, msg: '无权访问此冰箱' }
  const role = relation.data[0].role

  const itemRes = await db.collection('items').where({ _id: itemId }).get()
  if (itemRes.data.length === 0) return { code: -4, msg: '物品不存在' }
  const item = itemRes.data[0]
  if (item.fridgeId !== fridgeId) return { code: -5, msg: '物品不属于该冰箱' }

  const fridgeRes = await db.collection('fridges').where({ _id: fridgeId }).get()
  const fridge = fridgeRes.data[0] || {}

  // 构建位置名称
  const allZones = [...(fridge.zones || [])]
  if (fridge.hasConstantZone && fridge.constantZone) {
    allZones.push(fridge.constantZone)
  }
  let zoneName = ''
  let layerName = ''
  allZones.forEach((zone) => {
    if (zone.zoneId === item.zoneId) {
      zoneName = zone.name || ''
      ;(zone.layers || []).forEach((layer) => {
        if (layer.layerId === item.layerId) layerName = layer.name || ''
      })
    }
  })
  const locationText = [zoneName, layerName].filter(Boolean).join('·')

  // 计算过期状态
  const now = new Date()
  const expireDate = new Date(item.expireDate)
  const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / 86400000)
  let status = 'safe'
  let statusTag = 'success'
  let statusText = '安全'
  if (expireDate < now) {
    status = 'danger'
    statusTag = 'danger'
    statusText = '已过期'
  } else if (diffDays <= 3) {
    status = 'warning'
    statusTag = 'warning'
    statusText = `临期${diffDays}天`
  }

  const canEdit = role === 'owner' || role === 'readwrite'
  return {
    code: 0,
    data: {
      ...item,
      status,
      statusTag,
      statusText,
      diffDays,
      locationText,
      fridgeName: fridge.name || '',
      role,
      canEdit,
      createdAt: formatDateTime(item.createdAt),
      updatedAt: formatDateTime(item.updatedAt),
    },
  }
}
