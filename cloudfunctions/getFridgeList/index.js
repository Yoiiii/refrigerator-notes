// cloudfunctions/getFridgeList/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ===== 日期工具（基于 YYYY-MM-DD 字符串比较，时区无关）=====
function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function dateToNum(s) { return parseInt(String(s).replace(/-/g, ''), 10) }
function addDaysStr(baseStr, n) {
  const [y, m, d] = baseStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toDateStr(dt)
}
function isExpired(expireDateStr, todayStr) { return dateToNum(expireDateStr) < dateToNum(todayStr) }
function isWarning(expireDateStr, todayStr, thresholdDays) {
  const e = dateToNum(expireDateStr)
  const t = dateToNum(todayStr)
  const w = dateToNum(addDaysStr(todayStr, thresholdDays))
  return e >= t && e <= w
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  // 获取用户信息（含 defaultFridgeId 与通知设置）
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  const userInfo = userRes.data.length > 0 ? userRes.data[0] : null
  const defaultFridgeId = userInfo ? (userInfo.defaultFridgeId || '') : ''
  const notifyDays = userInfo ? (userInfo.notifyDays || 3) : 3
  const notifyEnabled = userInfo ? (userInfo.notifyEnabled !== false) : true

  // 通过 user_fridge 关联表查询用户所有冰箱
  const relations = await db.collection('user_fridge').where({ userId: OPENID }).get()
  if (relations.data.length === 0) return { code: 0, data: { defaultFridgeId, notifyDays, notifyEnabled, fridges: [] } }

  const fridgeIds = relations.data.map((r) => r.fridgeId)
  const fridges = await db.collection('fridges').where({ _id: db.command.in(fridgeIds) }).get()

  // 统计每个冰箱的物品数
  const result = await Promise.all(
    fridges.data.map(async (f) => {
      const items = await db.collection('items').where({ fridgeId: f._id }).get()
      const todayStr = toDateStr(new Date())
      const expiringCount = items.data.filter((i) => isWarning(i.expireDate, todayStr, 3)).length
      const expiredCount = items.data.filter((i) => isExpired(i.expireDate, todayStr)).length
      const relation = relations.data.find((r) => r.fridgeId === f._id)
      return {
        fridgeId: f._id,
        name: f.name,
        doorType: f.doorType,
        hasConstantZone: f.hasConstantZone,
        zones: f.zones,
        image: f.image || '',
        totalItems: items.data.length,
        expiringCount,
        expiredCount,
        role: relation ? relation.role : 'readonly',
      }
    }),
  )

  return { code: 0, data: { defaultFridgeId, notifyDays, notifyEnabled, fridges: result } }
}