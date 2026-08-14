// cloudfunctions/createFridge/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { name, doorType, hasConstantZone, constantZone, zones, image } = event
  if (!name || !doorType || !zones || zones.length === 0) {
    return { code: -2, msg: '缺少必要参数' }
  }

  const now = db.serverDate()
  const fridgeData = {
    _openid: OPENID,
    name,
    doorType,
    hasConstantZone: !!hasConstantZone,
    zones,
    image: image || '',
    createdAt: now,
    updatedAt: now,
  }

  if (hasConstantZone && constantZone) {
    fridgeData.constantZone = constantZone
  }

  const fridgeRes = await db.collection('fridges').add({ data: fridgeData })
  const fridgeId = fridgeRes._id

  // 判断是否为用户的首个冰箱：查询已有冰箱关联（须在写入新关联之前）
  const existingRel = await db.collection('user_fridge').where({ userId: OPENID }).get()
  const isFirstFridge = existingRel.data.length === 0

  // 写入 user_fridge 关联表
  await db.collection('user_fridge').add({
    data: {
      userId: OPENID,
      fridgeId,
      role: 'owner',
      joinedAt: now,
    },
  })

  // 仅当用户此前没有任何冰箱（首个）时，才将新冰箱设为默认。
  // 已拥有默认/其他冰箱的用户新建冰箱，不会抢占原有默认冰箱。
  if (isFirstFridge) {
    const userRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (userRes.data.length > 0) {
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: { defaultFridgeId: fridgeId, updatedAt: now },
      })
    }
  }

  return { code: 0, data: { fridgeId, ...fridgeData } }
}