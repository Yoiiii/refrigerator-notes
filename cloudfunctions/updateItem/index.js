// cloudfunctions/updateItem/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { itemId, fridgeId, name, icon, quantity, unit, expireDate, images, zoneId, layerId } = event
  if (!itemId || !fridgeId) return { code: -2, msg: '缺少必要参数' }

  await checkFridgePermission(fridgeId, ['owner', 'readwrite'])

  const updateData = { updatedAt: db.serverDate() }
  if (name !== undefined) updateData.name = name
  if (icon !== undefined) updateData.icon = icon
  if (quantity !== undefined) updateData.quantity = quantity
  if (unit !== undefined) updateData.unit = unit
  if (expireDate !== undefined) updateData.expireDate = expireDate
  if (images !== undefined) updateData.images = images
  if (zoneId !== undefined) updateData.zoneId = zoneId
  if (layerId !== undefined) updateData.layerId = layerId

  await db.collection('items').doc(itemId).update({ data: updateData })
  return { code: 0, data: { itemId } }
}