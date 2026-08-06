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

  // 构造 scene（7天有效期）
  const scene = `${fridgeId}|${role}|${Date.now()}`
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