// cloudfunctions/addItem/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { fridgeId, zoneId, layerId, name, icon, quantity, unit, expireDate, images } = event
  if (!fridgeId || !zoneId || !layerId || !name || !expireDate) {
    return { code: -2, msg: '缺少必要参数' }
  }

  try {
    await checkFridgePermission(fridgeId, ['owner', 'readwrite'])
  } catch (err) {
    return { code: err.code || -1, msg: err.msg || '无权限操作' }
  }

  const { OPENID } = cloud.getWXContext()
  const now = db.serverDate()

  const res = await db.collection('items').add({
    data: {
      _openid: OPENID,
      fridgeId,
      zoneId,
      layerId,
      name,
      icon: icon || 'box',
      quantity: quantity || 1,
      unit: unit || '件',
      expireDate,
      images: images || [],
      notified: false,
      createdAt: now,
      updatedAt: now,
    },
  })

  return { code: 0, data: { itemId: res._id } }
}