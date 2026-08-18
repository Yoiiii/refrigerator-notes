// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
 try {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '登录失败，未获取到 openid' }

  const now = db.serverDate()
  const exist = await db.collection('users').where({ _openid: OPENID }).get()

  if (exist.data.length === 0) {
    const res = await db.collection('users').add({
      data: {
        _openid: OPENID,
        nickname: event.nickname || '微信用户',
        avatarUrl: event.avatarUrl || '',
        theme: 'warm',
        notifyEnabled: true,
        notifyDays: 3,
        defaultFridgeId: '',
        createdAt: now,
        updatedAt: now,
      },
    })
    return {
      code: 0,
      data: {
        _id: res._id,
        _openid: OPENID,
        nickname: '微信用户',
        avatarUrl: '',
        defaultFridgeId: '',
        theme: 'warm',
        notifyEnabled: true,
        notifyDays: 3,
      },
    }
  }

  const updateData = { updatedAt: now }
  if (event.nickname !== undefined && event.nickname) updateData.nickname = event.nickname
  if (event.avatarUrl !== undefined) updateData.avatarUrl = event.avatarUrl
  await db.collection('users').doc(exist.data[0]._id).update({ data: updateData })
  // 返回更新后的用户数据，避免前端使用缓存旧值
  const updatedUser = { ...exist.data[0], ...updateData }
  delete updatedUser.updatedAt
  return { code: 0, data: updatedUser }
 } catch (e) {
  console.error('login error:', e)
  return { code: -99, msg: e?.message || '服务器错误' }
 }
}