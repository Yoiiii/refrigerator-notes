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
 try {
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

    // 仅对发送成功的分组标记已通知，失败分组保留 notified:false 并累加 retryCount，避免提醒永久丢失（P1-03）
    const successIds = []
    const TEMPLATE_ID = '6x2llq5TwIj-EkeFnpDi2M6rmBNc5-a-wke0wl6bk8E'
    for (const [fridgeId, fridgeItems] of Object.entries(byFridge)) {
      const firstItem = fridgeItems[0]
      // thing 类字段限 20 个字符（按字符截断更直观，避免小程序端显示被截断）
      const thingLimit = (s) => (s || '').slice(0, 18)
      const location = [
        firstItem.fridgeName || '冰箱',
        firstItem.locationText || firstItem.layerName || firstItem.zoneName || '',
      ].filter(Boolean).join(' · ')

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: user._openid,
          templateId: TEMPLATE_ID,
          page: `pages/fridge/fridge?fridgeId=${fridgeId}`,
          data: {
            thing1: { value: thingLimit(firstItem.name) },
            date3: { value: firstItem.expireDate },
            thing4: { value: thingLimit(location) },
          },
        })
        successIds.push(...fridgeItems.map((i) => i._id))
      } catch (e) {
        console.error('send msg fail:', e)
        // 发送失败：保留未通知状态并累加重试次数
        const failIds = fridgeItems.map((i) => i._id)
        await db.collection('items')
          .where({ _id: _.in(failIds) })
          .update({ data: { retryCount: _.inc(1) } })
      }
    }

    if (successIds.length) {
      await db.collection('items')
        .where({ _id: _.in(successIds) })
        .update({ data: { notified: true, retryCount: 0 } })
    }

    totalNotified += successIds.length
  }

  return { code: 0, notified: totalNotified }
 } catch (e) {
  console.error('checkExpiry error:', e)
  return { code: -99, msg: e?.message || '服务器错误' }
 }
}
