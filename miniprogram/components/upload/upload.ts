// my-upload 组件：原生九宫格图片上传
// 选择图片后直传云存储，返回 { fileID, url }（url 即 cloud:// fileID，原生 <image> 可直接渲染）
// 规避 TDesign t-upload 在 glass-easel 真机下 grid「添加」按钮点击无响应、且默认只给本地临时路径的问题
import { uploadFile } from '../../utils/cloud'

Component({
  properties: {
    files: { type: Array, value: [] }, // [{ fileID, url }]
    max: { type: Number, value: 3 },
  },

  methods: {
    async onChoose() {
      const remain = this.data.max - (this.data.files?.length || 0)
      if (remain <= 0) return
      let tempFiles: Array<{ tempFilePath: string }> = []
      try {
        const res: any = await wx.chooseMedia({
          count: remain,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
        })
        tempFiles = res.tempFiles || []
      } catch (e) {
        // 旧基础库回退到 chooseImage
        try {
          const r2: any = await wx.chooseImage({
            count: remain,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
          })
          tempFiles = (r2.tempFiles || []).map((t: any) => ({ tempFilePath: t.path }))
        } catch (e2) {
          return
        }
      }
      const added: any[] = []
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
      if (added.length) {
        this.triggerEvent('change', { files: [...(this.data.files || []), ...added] })
      }
    },

    onRemove(e: any) {
      const idx = e.currentTarget.dataset.index
      const files = (this.data.files || []).slice()
      files.splice(idx, 1)
      this.triggerEvent('change', { files })
    },

    onPreview(e: any) {
      const files: any[] = this.data.files || []
      const urls = files.map((f) => f.url || f.fileID).filter(Boolean)
      if (!urls.length) return
      wx.previewImage({ urls, current: urls[e.currentTarget.dataset.index] })
    },
  },
})
