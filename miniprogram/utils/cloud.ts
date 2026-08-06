// utils/cloud.js - 云函数统一调用封装

/**
 * 统一调用云函数
 * @param name 云函数名称
 * @param data 参数
 * @returns Promise<any>
 */
export function call(name: string, data: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result as any
        if (result && result.code === 0) {
          resolve(result.data)
        } else {
          wx.showToast({
            title: result?.msg || '操作失败',
            icon: 'none',
            duration: 2000,
          })
          reject(result)
        }
      },
      fail: (err) => {
        console.error(`[cloud] ${name} error:`, err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000,
        })
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