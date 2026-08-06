// cloudfunctions/getExpiringItems/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  // 获取用户所有冰箱
  const relations = await db.collection('user_fridge').where({ userId: OPENID }).get()
  if (relations.data.length === 0) return { code: 0, data: [] }

  const fridgeIds = relations.data.map((r) => r.fridgeId)
  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 查询临期和过期物品
  const items = await db.collection('items')
    .where({
      fridgeId: _.in(fridgeIds),
      expireDate: _.lte(threeDaysLater),
    })
    .orderBy('expireDate', 'asc')
    .get()

  const itemsWithStatus = items.data.map((item) => {
    const d = new Date(item.expireDate)
    let status = 'warning'
    if (d < now) status = 'danger'
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000)
    const statusText = status === 'danger' ? '已过期' : `临期${diffDays}天`
    return { ...item, status, statusText, diffDays }
  })

  return { code: 0, data: itemsWithStatus }
}