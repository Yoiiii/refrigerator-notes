// @ts-nocheck
// 自实现的滑动单元格，避免 TDesign t-swipe-cell 依赖 wxs 动态事件绑定
// （在 glass-easel 真机 runtime 下 wxs 事件处理器不生效，导致左滑失效）。
// 本组件使用标准 methods 事件函数，真机 / 模拟器表现一致。

const THRESHOLD = 0.3
const MIN_DISTANCE = 10

Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true,
  },
  data: {
    wrapperStyle: 'transform: translate3d(0,0,0); transition: none;',
    rightWidth: 0,
  },
  lifetimes: {
    ready() {
      this.measure()
    },
  },
  methods: {
    measure() {
      const q = this.createSelectorQuery()
      q.select('.sc-right')
        .boundingClientRect((rect) => {
          if (rect && rect.width) {
            this.data.rightWidth = rect.width
          }
        })
        .exec()
    },

    onTouchStart(e) {
      const self = this
      if (self.data.rightWidth === 0) self.measure()
      const t = e.touches[0]
      self._sx = t.clientX
      self._sy = t.clientY
      self._dir = ''
      self._startOffset = self._offset || 0
      self._dragging = false
      self._locked = false
    },

    onTouchMove(e) {
      const self = this
      const t = e.touches[0]
      const dx = t.clientX - self._sx
      const dy = t.clientY - self._sy
      const offsetX = Math.abs(dx)
      const offsetY = Math.abs(dy)

      if (!self._dir) {
        if (offsetX > offsetY && offsetX > MIN_DISTANCE) {
          self._dir = 'horizontal'
          // 横向滑动：锁住外层下拉刷新，避免误触发下拉
          if (!self._locked) {
            self._locked = true
            self.triggerEvent('lock', { locked: true })
          }
        } else if (offsetY > offsetX && offsetY > MIN_DISTANCE) {
          self._dir = 'vertical'
        }
      }

      // 纵向滑动交给页面滚动，只在横向滑动时处理左滑
      if (self._dir !== 'horizontal') return

      let offset = self._startOffset + dx
      offset = Math.min(Math.max(offset, -self.data.rightWidth), 0)
      self._offset = offset
      self.setData({
        wrapperStyle: `transform: translate3d(${offset}px,0,0); transition: none;`,
      })
    },

    unlock() {
      const self = this
      if (self._locked) {
        self._locked = false
        self.triggerEvent('lock', { locked: false })
      }
    },

    onTouchEnd() {
      const self = this
      if (self._dir !== 'horizontal') {
        self.unlock()
        return
      }
      const rw = self.data.rightWidth
      let target = 0
      // 滑动超过阈值则打开，露出右侧操作区
      if (rw > 0 && -self._startOffset < rw && -self._offset > rw * THRESHOLD) {
        target = -rw
      }
      self._offset = target
      self.setData({
        wrapperStyle: `transform: translate3d(${target}px,0,0); transition: transform .3s;`,
      })
      self.unlock()
    },
  },
})
