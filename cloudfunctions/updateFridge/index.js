// cloudfunctions/updateFridge/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('../_shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { fridgeId, name, doorType, hasConstantZone, constantZone, zones } = event
  if (!fridgeId) return { code: -2, msg: '缺少 fridgeId' }

  await checkFridgePermission(fridgeId, ['owner'])

  const updateData = { updatedAt: db.serverDate() }
  if (name !== undefined) updateData.name = name
  if (doorType !== undefined) updateData.doorType = doorType
  if (hasConstantZone !== undefined) updateData.hasConstantZone = hasConstantZone
  if (constantZone !== undefined) updateData.constantZone = constantZone
  if (zones !== undefined) updateData.zones = zones

  await db.collection('fridges').doc(fridgeId).update({ data: updateData })
  return { code: 0, data: { fridgeId } }
}