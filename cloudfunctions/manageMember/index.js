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

  const members = await db.collection('user_fridge').where({ fridgeId }).limit(1000).get()
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
        return { code: -4, msg: '参数错误' }
      }
      const upd = await db.collection('user_fridge')
        .where({ userId: targetUserId, fridgeId, role: db.command.neq('owner') })
        .update({ data: { role: newRole } })
      // 命中 0 条（目标非成员 / 已是 owner）也返回明确错误，避免静默成功（P2-11）
      if (!upd.stats || upd.stats.updated === 0) {
        return { code: -5, msg: '未找到该成员或目标已是所有者' }
      }
      return { code: 0, msg: '角色已更新' }
    }

    if (action === 'remove') {
      if (!targetUserId) return { code: -4, msg: '缺少目标用户' }
      const rm = await db.collection('user_fridge')
        .where({ userId: targetUserId, fridgeId, role: db.command.neq('owner') })
        .remove()
      if (!rm.stats || rm.stats.removed === 0) {
        return { code: -5, msg: '未找到该成员或目标已是所有者' }
      }
      return { code: 0, msg: '已移除成员' }
    }

    if (action === 'transfer') {
      if (!targetUserId) return { code: -4, msg: '缺少目标用户' }
      const { OPENID } = cloud.getWXContext()
      // 先校验目标是否为本冰箱成员且非 owner（P2-11）
      const targetRel = await db.collection('user_fridge').where({ userId: targetUserId, fridgeId }).get()
      if (targetRel.data.length === 0) {
        return { code: -5, msg: '目标用户不是本冰箱成员' }
      }
      if (targetRel.data[0].role === 'owner') {
        return { code: -5, msg: '目标用户已是所有者' }
      }
      // 事务内「先升后降」：任一失败整体回滚，最坏双 owner（可管理），绝不会产生零 owner 孤儿冰箱（P1-02）
      const transaction = await db.startTransaction()
      try {
        await transaction.collection('user_fridge')
          .where({ userId: targetUserId, fridgeId }).update({ data: { role: 'owner' } })
        await transaction.collection('user_fridge')
          .where({ userId: OPENID, fridgeId }).update({ data: { role: 'readwrite' } })
        await transaction.commit()
      } catch (err) {
        await transaction.rollback()
        throw { code: -6, msg: '转让失败，请重试' }
      }
      return { code: 0, msg: '所有权已转让' }
    }

    return { code: -4, msg: '未知操作' }
  } catch (e) {
    // 鉴权或其它异常：统一以 {code,msg} 契约返回，避免异常丢失精确错误信息（P2-12）
    if (e && e.code !== undefined) return { code: e.code, msg: e.msg }
    return { code: -99, msg: e?.message || '服务器错误' }
  }
}
