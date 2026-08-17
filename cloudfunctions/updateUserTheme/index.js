// cloudfunctions/updateUserTheme/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
 try {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: -1, msg: '未登录' }

  const { theme } = event
  const validThemes = ['warm', 'fresh', 'modern', 'cute']
  if (!validThemes.includes(theme)) return { code: -2, msg: '无效的主题' }

  const user = await db.collection('users').where({ _openid: OPENID }).get()
  if (user.data.length === 0) return { code: -3, msg: '用户不存在' }

  await db.collection('users').doc(user.data[0]._id).update({
    data: { theme, updatedAt: db.serverDate() },
  })

  return { code: 0, data: { theme } }
 } catch (e) {
  console.error('updateUserTheme error:', e)
  return { code: -99, msg: e?.message || '服务器错误' }
 }
}