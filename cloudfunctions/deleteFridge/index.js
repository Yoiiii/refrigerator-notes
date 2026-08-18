// cloudfunctions/deleteFridge/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { fridgeId } = event
  if (!fridgeId) return { code: -2, msg: '缺少 fridgeId' }

  let openid
  try {
    ({ openid } = await checkFridgePermission(fridgeId, ['owner']))
  } catch (err) {
    return { code: err.code || -1, msg: err.msg || '无权限操作' }
  }

  // 清理默认冰箱标记，避免 users.defaultFridgeId 悬空（P2-04）
  const userRes = await db.collection('users').where({ _openid: openid }).get()
  if (userRes.data.length > 0 && userRes.data[0].defaultFridgeId === fridgeId) {
    await db.collection('users').doc(userRes.data[0]._id).update({ data: { defaultFridgeId: '' } })
  }

  // 收集所有物品图片
  const items = await db.collection('items').where({ fridgeId }).get()
  const fileIDs = []
  items.data.forEach((item) => {
    if (item.images && item.images.length > 0) {
      fileIDs.push(...item.images)
    }
  })

  // 级联删除：items
  await db.collection('items').where({ fridgeId }).remove()
  // 级联删除：user_fridge
  await db.collection('user_fridge').where({ fridgeId }).remove()
  // 删除冰箱
  await db.collection('fridges').doc(fridgeId).remove()
  // 清理云存储文件
  if (fileIDs.length > 0) {
    try { await cloud.deleteFile({ fileList: fileIDs }) } catch (e) { console.error('delete files error:', e) }
  }

  return { code: 0, data: { fridgeId } }
}