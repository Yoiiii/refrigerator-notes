// cloudfunctions/getFridgeDetail/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ===== 日期工具（基于 YYYY-MM-DD 字符串比较，时区无关，规避 new Date('YYYY-MM-DD') 的 UTC 零点偏移）=====
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

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { fridgeId } = event
  if (!fridgeId) return { code: -2, msg: '缺少 fridgeId' }

  // 校验用户是否关联此冰箱
  const relation = await db.collection('user_fridge').where({ userId: OPENID, fridgeId }).get()
  if (relation.data.length === 0) return { code: -3, msg: '无权访问此冰箱' }

  const fridge = await db.collection('fridges').doc(fridgeId).get()
  if (!fridge.data) return { code: -4, msg: '冰箱不存在' }

  // 获取所有物品
  const items = await db.collection('items').where({ fridgeId }).get()
  const todayStr = toDateStr(new Date())

  // 为每个物品计算状态（基于日期字符串比较，规避时区与 iOS 解析问题）
  const itemsWithStatus = items.data.map((item) => {
    let status = 'safe'
    if (isExpired(item.expireDate, todayStr)) status = 'danger'
    else if (isWarning(item.expireDate, todayStr, 3)) status = 'warning'
    return { ...item, status }
  })

  return {
    code: 0,
    data: {
      ...fridge.data,
      image: fridge.data.image || '',
      items: itemsWithStatus,
      role: relation.data[0].role,
    },
  }
}