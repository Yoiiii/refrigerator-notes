// cloudfunctions/updateItem/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId, fridgeId, name, icon, quantity, unit, expireDate, images, zoneId, layerId } = event
  if (!itemId || !fridgeId) return { code: -2, msg: '缺少必要参数' }

  try {
    await checkFridgePermission(fridgeId, ['owner', 'readwrite'])
  } catch (err) {
    return { code: err.code || -1, msg: err.msg || '无权限操作' }
  }

  // 校验物品确实属于该冰箱，防止越权修改其它冰箱物品（P2-10）
  const itemDoc = await db.collection('items').doc(itemId).get()
  if (!itemDoc.data || itemDoc.data.fridgeId !== fridgeId) {
    return { code: -5, msg: '物品不属于该冰箱' }
  }

  const updateData = { updatedAt: db.serverDate() }
  if (name !== undefined) updateData.name = name
  if (icon !== undefined) updateData.icon = icon
  if (quantity !== undefined) updateData.quantity = quantity
  if (unit !== undefined) updateData.unit = unit
  if (expireDate !== undefined) { updateData.expireDate = expireDate; updateData.notified = false }
  if (images !== undefined) updateData.images = images
  if (zoneId !== undefined) updateData.zoneId = zoneId
  if (layerId !== undefined) updateData.layerId = layerId

  await db.collection('items').doc(itemId).update({ data: updateData })
  return { code: 0, data: { itemId } }
}