// cloudfunctions/generateQRCode/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { fridgeId, role } = event

  if (!fridgeId || !['readonly', 'readwrite'].includes(role)) {
    return { code: -1, msg: '参数错误' }
  }

  // 校验调用者是 owner
  const ownerCheck = await db.collection('user_fridge')
    .where({ userId: OPENID, fridgeId, role: 'owner' }).get()
  if (ownerCheck.data.length === 0) return { code: -2, msg: '仅所有者可生成分享码' }

  // 构造 scene：限制 32 字符（微信 getUnlimited 上限）。
  // 角色用短码 rw/readwrite、ro/readonly；时间戳用「自纪元起的天数」的 base36（约 3 字符），
  // 既保留 7 天有效期校验，又避免原 `fridgeId|role|Date.now()` ≈48 字符超限导致真机生成失败。
  const roleCode = role === 'readwrite' ? 'rw' : 'ro'
  const dayTs = Math.floor(Date.now() / 86400000).toString(36)
  const scene = `${fridgeId}|${roleCode}|${dayTs}`
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene,
    page: 'pages/scan-result/scan-result',
    checkPath: false,
    width: 430,
  })

  // 上传到云存储
  const upload = await cloud.uploadFile({
    cloudPath: `qrcodes/${fridgeId}_${Date.now()}.png`,
    fileContent: result.buffer,
  })

  const urlResult = await cloud.getTempFileURL({ fileList: [upload.fileID] })
  return {
    code: 0,
    data: {
      fileID: upload.fileID,
      url: urlResult.fileList[0].tempFileURL,
    },
  }
}