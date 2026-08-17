// my-upload 组件：原生九宫格图片上传
// 选择图片后直传云存储，返回 { fileID, url }（url 即 cloud:// fileID，原生 <image> 可直接渲染）
// 规避 TDesign t-upload 在 glass-easel 真机下 grid「添加」按钮点击无响应、且默认只给本地临时路径的问题
import { uploadFile, resolveCloudImages, deleteFile } from '../../utils/cloud'

Component({
  properties: {
    files: { type: Array, value: [] }, // [{ fileID, url }]
    max: { type: Number, value: 3 },
  },

  methods: {
    async onChoose() {
      // 并发锁：上传期间忽略重复点击，避免快速连点导致超额/重复选择
      if (this._uploading) return
      const remain = this.data.max - (this.data.files?.length || 0)
      if (remain <= 0) return
      this._uploading = true
      try {
        let tempFiles: Array<{ tempFilePath: string }> = []
        try {
          const res: any = await wx.chooseMedia({
            count: remain,
            mediaType: ['image'],
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
          })
          tempFiles = res.tempFiles || []
        } catch (e: any) {
          const errMsg = (e && e.errMsg) || ''
          // 用户主动取消：静默返回，不报错
          if (errMsg.indexOf('cancel') >= 0) return
          // 旧基础库回退到 chooseImage
          try {
            const r2: any = await wx.chooseImage({
              count: remain,
              sizeType: ['compressed'],
              sourceType: ['album', 'camera'],
            })
            tempFiles = (r2.tempFiles || []).map((t: any) => ({ tempFilePath: t.path }))
          } catch (e2: any) {
            const msg2 = (e2 && e2.errMsg) || ''
            // 非取消的错误（多为相册/相机权限被拒）：给出明确反馈，避免「点击无反应」的困惑（P2-06）
            if (msg2.indexOf('cancel') < 0) {
              wx.showToast({ title: '无法打开相册，请检查微信相册/相机权限', icon: 'none' })
            }
            return
          }
        }
        if (!tempFiles.length) return

        const added: any[] = []
        wx.showLoading({ title: '上传中', mask: true })
        try {
          for (const f of tempFiles) {
            const ext = (f.tempFilePath.split('.').pop() || 'png').split('?')[0]
            const cloudPath = `uploads/${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
            try {
              const fileID = await uploadFile(cloudPath, f.tempFilePath)
              added.push({ fileID, url: fileID })
            } catch (e) {
              wx.showToast({ title: '上传失败', icon: 'none' })
            }
          }
        } finally {
          wx.hideLoading()
        }
        if (added.length) {
          this.triggerEvent('change', { files: [...(this.data.files || []), ...added] })
        }
      } finally {
        this._uploading = false
      }
    },

    onRemove(e: any) {
      const idx = e.currentTarget.dataset.index
      const files = (this.data.files || []).slice()
      const removed = files[idx]
      files.splice(idx, 1)
      this.triggerEvent('change', { files })
      // 同步删除云存储文件，避免孤儿文件堆积（P2-06）
      const fid = removed && (removed.fileID || removed.url)
      if (fid && typeof fid === 'string' && fid.indexOf('cloud://') === 0) {
        deleteFile([fid]).catch(() => {})
      }
    },

    async onPreview(e: any) {
      const files: any[] = this.data.files || []
      if (!files.length) return
      // wx.previewImage 不支持 cloud:// 协议，需先转 https，否则黑屏（P2-06）
      const urls = await resolveCloudImages(files.map((f) => f.url || f.fileID))
      const idx = e.currentTarget.dataset.index
      wx.previewImage({ urls, current: urls[idx] })
    },
  },
})
