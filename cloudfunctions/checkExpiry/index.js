// cloudfunctions/checkExpiry/index.js
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
  const now = new Date()
  const todayStr = toDateStr(now)

  // 获取所有启用通知的用户
  const usersRes = await db.collection('users')
    .where({ notifyEnabled: true })
    .get()

  if (usersRes.data.length === 0) return { code: 0, notified: 0 }

  let totalNotified = 0

  for (const user of usersRes.data) {
    const notifyDays = user.notifyDays || 3
    const thresholdDate = new Date(now.getTime() + notifyDays * 24 * 60 * 60 * 1000)
    const thresholdStr = toDateStr(thresholdDate)

    // 获取该用户关联的冰箱
    const relations = await db.collection('user_fridge')
      .where({
        userId: user._openid,
        role: _.in(['owner', 'readwrite']),
      }).get()

    if (relations.data.length === 0) continue

    const fridgeIds = relations.data.map((r) => r.fridgeId)

    // 查询该用户冰箱中未通知且已过期/临期的物品
    const items = await db.collection('items')
      .where({
        notified: false,
        fridgeId: _.in(fridgeIds),
        expireDate: _.lte(thresholdStr),
      })
      .get()

    if (items.data.length === 0) continue

    // 按 fridgeId 分组
    const byFridge = {}
    items.data.forEach((item) => {
      if (!byFridge[item.fridgeId]) byFridge[item.fridgeId] = []
      byFridge[item.fridgeId].push(item)
    })

    for (const [fridgeId, fridgeItems] of Object.entries(byFridge)) {
      const firstItem = fridgeItems[0]
      const diffDays = Math.ceil((new Date(firstItem.expireDate) - now) / 86400000)

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: user._openid,
          templateId: 'YOUR_TEMPLATE_ID',
          page: `pages/fridge/fridge?fridgeId=${fridgeId}`,
          data: {
            thing1: { value: firstItem.name },
            number2: { value: diffDays },
            thing3: { value: `${fridgeItems.length} 件物品临期` },
          },
        })
      } catch (e) {
        console.error('send msg fail:', e)
      }
    }

    // 标记已通知
    const ids = items.data.map((i) => i._id)
    await db.collection('items')
      .where({ _id: _.in(ids) })
      .update({ data: { notified: true } })

    totalNotified += ids.length
  }

  return { code: 0, notified: totalNotified }
}
