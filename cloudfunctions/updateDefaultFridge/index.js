// cloudfunctions/updateDefaultFridge/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { fridgeId } = event
  if (!fridgeId) return { code: -2, msg: '缺少 fridgeId' }

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0) return { code: -3, msg: '用户不存在' }

  await db.collection('users').doc(userRes.data[0]._id).update({
    data: { defaultFridgeId: fridgeId, updatedAt: db.serverDate() },
  })

  return { code: 0, data: { defaultFridgeId: fridgeId } }
}