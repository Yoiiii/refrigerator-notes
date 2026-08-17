// cloudfunctions/updateUserNotify/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { notifyDays, notifyEnabled } = event
  // 组装待更新字段
  const data = { updatedAt: db.serverDate() }
  if (notifyDays !== undefined && notifyDays !== null) {
    const days = Number(notifyDays)
    if (![1, 3, 5, 7].includes(days)) return { code: -2, msg: '无效的提前天数' }
    data.notifyDays = days
  }
  if (notifyEnabled !== undefined && notifyEnabled !== null) {
    data.notifyEnabled = !!notifyEnabled
  }

  const user = await db.collection('users').where({ _openid: OPENID }).get()
  if (user.data.length === 0) return { code: -3, msg: '用户不存在' }

  await db.collection('users').doc(user.data[0]._id).update({ data })

  return { code: 0, msg: '已保存', data: { notifyDays: data.notifyDays, notifyEnabled: data.notifyEnabled } }
}
