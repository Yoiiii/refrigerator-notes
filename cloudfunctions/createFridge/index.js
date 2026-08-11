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

  // 写入 user_fridge 关联表
  await db.collection('user_fridge').add({
    data: {
      userId: OPENID,
      fridgeId,
      role: 'owner',
      joinedAt: now,
    },
  })

  // 如果用户的 defaultFridgeId 为空，则设置为新创建的冰箱 ID
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length > 0 && !userRes.data[0].defaultFridgeId) {
    await db.collection('users').doc(userRes.data[0]._id).update({
      data: { defaultFridgeId: fridgeId, updatedAt: now },
    })
  }

  return { code: 0, data: { fridgeId, ...fridgeData } }
}