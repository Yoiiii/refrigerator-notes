// cloudfunctions/getFridgeDetail/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 为每个物品计算状态
  const itemsWithStatus = items.data.map((item) => {
    const expireDate = new Date(item.expireDate)
    let status = 'safe'
    if (expireDate < now) status = 'danger'
    else if (expireDate <= threeDaysLater) status = 'warning'
    return { ...item, status }
  })

  return {
    code: 0,
    data: {
      ...fridge.data,
      items: itemsWithStatus,
      role: relation.data[0].role,
    },
  }
}