// cloudfunctions/joinFridge/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { fridgeId, role } = event

  if (!fridgeId || !['readonly', 'readwrite'].includes(role)) {
    return { code: -1, msg: '参数错误' }
  }

  // 校验冰箱存在
  const fridge = await db.collection('fridges').doc(fridgeId).get()
  if (!fridge.data) return { code: -2, msg: '冰箱不存在或已失效' }

  // 是否已加入
  const exist = await db.collection('user_fridge')
    .where({ userId: OPENID, fridgeId }).get()
  if (exist.data.length > 0) return { code: -3, msg: '你已加入该冰箱' }

  // 写入关联
  await db.collection('user_fridge').add({
    data: {
      userId: OPENID,
      fridgeId,
      role,
      joinedAt: db.serverDate(),
    },
  })

  return { code: 0, msg: '加入成功', data: { fridgeName: fridge.data.name } }
}