// cloudfunctions/getFridgeList/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  // 通过 user_fridge 关联表查询用户所有冰箱
  const relations = await db.collection('user_fridge').where({ userId: OPENID }).get()
  if (relations.data.length === 0) return { code: 0, data: [] }

  const fridgeIds = relations.data.map((r) => r.fridgeId)
  const fridges = await db.collection('fridges').where({ _id: db.command.in(fridgeIds) }).get()

  // 统计每个冰箱的物品数
  const result = await Promise.all(
    fridges.data.map(async (f) => {
      const items = await db.collection('items').where({ fridgeId: f._id }).get()
      const now = new Date()
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      const expiringCount = items.data.filter((i) => {
        const d = new Date(i.expireDate)
        return d <= threeDaysLater && d > now
      }).length
      const expiredCount = items.data.filter((i) => new Date(i.expireDate) < now).length
      const relation = relations.data.find((r) => r.fridgeId === f._id)
      return {
        fridgeId: f._id,
        name: f.name,
        doorType: f.doorType,
        hasConstantZone: f.hasConstantZone,
        zones: f.zones,
        totalItems: items.data.length,
        expiringCount,
        expiredCount,
        role: relation ? relation.role : 'readonly',
      }
    }),
  )

  return { code: 0, data: result }
}