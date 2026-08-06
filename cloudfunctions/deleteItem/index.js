// cloudfunctions/deleteItem/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId, fridgeId } = event
  if (!itemId || !fridgeId) return { code: -2, msg: '缺少必要参数' }

  await checkFridgePermission(fridgeId, ['owner', 'readwrite'])

  // 获取物品信息，准备清理云存储图片
  const item = await db.collection('items').doc(itemId).get()
  if (item.data && item.data.images && item.data.images.length > 0) {
    try { await cloud.deleteFile({ fileList: item.data.images }) } catch (e) {}
  }

  await db.collection('items').doc(itemId).remove()
  return { code: 0, msg: '删除成功' }
}