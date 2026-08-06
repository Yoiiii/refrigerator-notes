// cloudfunctions/deleteFridge/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('../_shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { fridgeId } = event
  if (!fridgeId) return { code: -2, msg: '缺少 fridgeId' }

  await checkFridgePermission(fridgeId, ['owner'])

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

  return { code: 0, msg: '删除成功' }
}