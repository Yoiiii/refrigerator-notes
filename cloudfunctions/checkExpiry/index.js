// cloudfunctions/checkExpiry/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const items = await db.collection('items')
    .where({
      notified: false,
      expireDate: _.lte(threeDaysLater).and(_.gte(now)),
    })
    .get()

  // 按 fridgeId 分组
  const byFridge = {}
  items.data.forEach((item) => {
    if (!byFridge[item.fridgeId]) byFridge[item.fridgeId] = []
    byFridge[item.fridgeId].push(item)
  })

  for (const [fridgeId, expiringItems] of Object.entries(byFridge)) {
    const members = await db.collection('user_fridge')
      .where({ fridgeId, role: _.in(['owner', 'readwrite']) }).get()

    for (const member of members.data) {
      const user = await db.collection('users')
        .where({ _openid: member.userId }).get()
      if (user.data.length === 0 || !user.data[0].notifyEnabled) continue

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: member.userId,
          templateId: 'YOUR_TEMPLATE_ID',
          page: `pages/fridge/fridge?fridgeId=${fridgeId}`,
          data: {
            thing1: { value: expiringItems[0].name },
            number2: {
              value: Math.ceil((new Date(expiringItems[0].expireDate) - now) / 86400000),
            },
            thing3: { value: `${expiringItems.length} 件物品临期` },
          },
        })
      } catch (e) {
        console.error('send msg fail:', e)
      }
    }
  }

  // 标记已通知
  const ids = items.data.map((i) => i._id)
  if (ids.length > 0) {
    await db.collection('items')
      .where({ _id: _.in(ids) })
      .update({ data: { notified: true } })
  }

  return { code: 0, notified: ids.length }
}