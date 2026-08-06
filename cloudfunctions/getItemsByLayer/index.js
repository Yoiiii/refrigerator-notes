// cloudfunctions/getItemsByLayer/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { fridgeId, zoneId, layerId } = event
  if (!fridgeId || !zoneId || !layerId) return { code: -2, msg: '缺少必要参数' }

  const relation = await db.collection('user_fridge').where({ userId: OPENID, fridgeId }).get()
  if (relation.data.length === 0) return { code: -3, msg: '无权访问' }

  const items = await db.collection('items')
    .where({ fridgeId, zoneId, layerId })
    .orderBy('createdAt', 'asc')
    .get()

  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const itemsWithStatus = items.data.map((item) => {
    const d = new Date(item.expireDate)
    let status = 'safe'
    if (d < now) status = 'danger'
    else if (d <= threeDaysLater) status = 'warning'
    return { ...item, status }
  })

  return { code: 0, data: itemsWithStatus }
}