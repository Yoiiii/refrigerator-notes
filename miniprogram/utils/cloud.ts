// utils/cloud.js - 云函数统一调用封装

/**
 * 统一调用云函数
 * @param name 云函数名称
 * @param data 参数
 * @returns Promise<any>
 */
export function call(name: string, data: Record<string, any> = {}, opts: { silent?: boolean } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result as any
        if (result && result.code === 0) {
          resolve(result.data)
        } else {
          if (!opts.silent) {
            wx.showToast({
              title: result?.msg || '操作失败',
              icon: 'none',
              duration: 2000,
            })
          }
          reject(result)
        }
      },
      fail: (err) => {
        console.error(`[cloud] ${name} error:`, err)
        if (!opts.silent) {
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none',
            duration: 2000,
          })
        }
        reject(err)
      },
    })
  })
}

/**
 * 上传文件到云存储
 */
export function uploadFile(cloudPath: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => resolve(res.fileID),
      fail: reject,
    })
  })
}

/**
 * 获取临时文件链接
 */
export function getTempFileURL(fileID: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        resolve(res.fileList[0]?.tempFileURL || '')
      },
      fail: reject,
    })
  })
}

/**
 * 批量获取临时文件链接，返回 { fileID: tempFileURL } 映射
 */
export function getTempFileURLs(fileIDs: string[]): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const list = Array.from(new Set(fileIDs.filter(Boolean)))
    if (list.length === 0) return resolve({})
    wx.cloud.getTempFileURL({
      fileList: list,
      success: (res) => {
        const map: Record<string, string> = {}
        ;(res.fileList || []).forEach((f: any) => {
          if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL
        })
        resolve(map)
      },
      fail: reject,
    })
  })
}

/**
 * 将一组图片地址中的 cloud:// fileID 转换为 https 临时链接，其余原样返回
 */
export async function resolveCloudImages(urls: string[]): Promise<string[]> {
  const cloudIds = urls.filter((u) => typeof u === 'string' && u.indexOf('cloud://') === 0)
  if (cloudIds.length === 0) return urls
  try {
    const map = await getTempFileURLs(cloudIds)
    return urls.map((u) => (typeof u === 'string' && u.indexOf('cloud://') === 0 ? (map[u] || u) : u))
  } catch {
    return urls
  }
}

/**
 * 删除云存储文件
 */
export function deleteFile(fileIDs: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.cloud.deleteFile({
      fileList: fileIDs,
      success: resolve,
      fail: reject,
    })
  })
}