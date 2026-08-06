// cloudfunctions/_shared/auth.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 校验用户是否登录 + 是否有权限操作某冰箱
 * @param {string} fridgeId
 * @param {string[]} allowedRoles - 允许的角色列表 ['owner','readwrite']
 * @returns {{ openid: string, role: string }}
 */
async function checkFridgePermission(fridgeId, allowedRoles) {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw { code: -1, msg: '未登录' }

  const res = await db
    .collection('user_fridge')
    .where({ userId: OPENID, fridgeId })
    .get()

  if (res.data.length === 0) throw { code: -2, msg: '无权访问此冰箱' }

  const role = res.data[0].role
  if (!allowedRoles.includes(role)) {
    throw { code: -3, msg: '权限不足：需要 ' + allowedRoles.join('/') + ' 权限' }
  }

  return { openid: OPENID, role }
}

module.exports = { checkFridgePermission }