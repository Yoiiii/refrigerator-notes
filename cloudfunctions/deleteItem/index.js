// cloudfunctions/deleteItem/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId, fridgeId } = event
  if (!itemId || !fridgeId) return { code: -2, msg: '缺少必要参数' }

  try {
    await checkFridgePermission(fridgeId, ['owner', 'readwrite'])
  } catch (err) {
    return { code: err.code || -1, msg: err.msg || '无权限操作' }
  }

  // 获取物品信息，准备清理云存储图片
  const item = await db.collection('items').doc(itemId).get()
  // 校验物品确实属于该冰箱，防止越权删除其它冰箱物品（P2-10）
  if (!item.data || item.data.fridgeId !== fridgeId) {
    return { code: -5, msg: '物品不属于该冰箱' }
  }
  if (item.data && item.data.images && item.data.images.length > 0) {
    try { await cloud.deleteFile({ fileList: item.data.images }) } catch (e) {}
  }

  await db.collection('items').doc(itemId).remove()
  return { code: 0, msg: '删除成功' }
}