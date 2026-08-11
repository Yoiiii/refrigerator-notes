// cloudfunctions/getDefaultFridge/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  // 获取用户默认冰箱 ID
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0) return { code: -2, msg: '用户不存在' }

  const defaultFridgeId = userRes.data[0].defaultFridgeId
  if (!defaultFridgeId) return { code: 0, data: { fridge: null } }

  // 校验用户是否仍有权限访问该冰箱
  const relation = await db.collection('user_fridge')
    .where({ userId: OPENID, fridgeId: defaultFridgeId }).get()
  if (relation.data.length === 0) {
    // 无权限，清除 defaultFridgeId
    await db.collection('users').doc(userRes.data[0]._id).update({
      data: { defaultFridgeId: '', updatedAt: db.serverDate() },
    })
    return { code: 0, data: { fridge: null } }
  }

  // 获取冰箱信息
  const fridgeRes = await db.collection('fridges').doc(defaultFridgeId).get()
  const fridge = fridgeRes.data

  // 统计物品
  const items = await db.collection('items').where({ fridgeId: defaultFridgeId }).get()
  const now = new Date()
  const todayStr = toDateStr(now)
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const thresholdStr = toDateStr(threeDaysLater)

  const totalItems = items.data.length
  const expiredCount = items.data.filter((i) => i.expireDate < todayStr).length
  const expiringCount = items.data.filter(
    (i) => i.expireDate >= todayStr && i.expireDate <= thresholdStr,
  ).length

  return {
    code: 0,
    data: {
      defaultFridgeId: fridge._id,
      fridges: [{
        fridgeId: fridge._id,
        name: fridge.name,
        doorType: fridge.doorType,
        hasConstantZone: fridge.hasConstantZone,
        zones: fridge.zones,
        image: fridge.image || '',
        totalItems,
        expiringCount,
        expiredCount,
        role: relation.data[0].role,
      }],
    },
  }
}
