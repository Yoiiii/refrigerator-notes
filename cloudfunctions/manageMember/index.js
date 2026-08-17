// cloudfunctions/manageMember/index.js
const cloud = require('wx-server-sdk')
const { checkFridgePermission } = require('./shared/auth')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 列出成员：仅需是冰箱成员（任意角色）即可，不强制 owner（P2-11）
async function listMembers(fridgeId) {
  const { OPENID } = cloud.getWXContext()
  const relation = await db.collection('user_fridge').where({ userId: OPENID, fridgeId }).get()
  if (relation.data.length === 0) return { code: -3, msg: '无权访问此冰箱' }

  const members = await db.collection('user_fridge').where({ fridgeId }).get()
  const userIds = members.data.map((m) => m.userId)
  const users = await db.collection('users')
    .where({ _openid: db.command.in(userIds) }).get()
  const result = members.data.map((m) => {
    const u = users.data.find((u) => u._openid === m.userId)
    return { ...m, nickname: u?.nickname || '微信用户', avatarUrl: u?.avatarUrl || '', isCurrentUser: m.userId === OPENID }
  })
  return { code: 0, data: result }
}

exports.main = async (event) => {
  const { fridgeId, action, targetUserId, newRole } = event
  if (!fridgeId || !action) return { code: -2, msg: '缺少必要参数' }

  try {
    // 仅查看成员列表：任意成员可访问
    if (action === 'list') {
      return await listMembers(fridgeId)
    }

    // 变更类操作：仅 owner 可执行
    await checkFridgePermission(fridgeId, ['owner'])

    if (action === 'changeRole') {
      if (!targetUserId || !['readonly', 'readwrite'].includes(newRole)) {
        return { code: -3, msg: '参数错误' }
      }
      await db.collection('user_fridge')
        .where({ userId: targetUserId, fridgeId, role: db.command.neq('owner') })
        .update({ data: { role: newRole } })
      return { code: 0, msg: '角色已更新' }
    }

    if (action === 'remove') {
      if (!targetUserId) return { code: -3, msg: '缺少目标用户' }
      await db.collection('user_fridge')
        .where({ userId: targetUserId, fridgeId, role: db.command.neq('owner') })
        .remove()
      return { code: 0, msg: '已移除成员' }
    }

    if (action === 'transfer') {
      if (!targetUserId) return { code: -3, msg: '缺少目标用户' }
      // 转让所有权
      const { OPENID } = cloud.getWXContext()
      await db.collection('user_fridge')
        .where({ userId: OPENID, fridgeId }).update({ data: { role: 'readwrite' } })
      await db.collection('user_fridge')
        .where({ userId: targetUserId, fridgeId }).update({ data: { role: 'owner' } })
      return { code: 0, msg: '所有权已转让' }
    }

    return { code: -4, msg: '未知操作' }
  } catch (e) {
    // 鉴权或其它异常：统一以 {code,msg} 契约返回，避免异常丢失精确错误信息（P2-12）
    if (e && e.code !== undefined) return { code: e.code, msg: e.msg }
    return { code: -99, msg: e?.message || '服务器错误' }
  }
}
