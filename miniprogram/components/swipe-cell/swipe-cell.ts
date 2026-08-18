// @ts-nocheck
// 自实现的滑动单元格，避免 TDesign t-swipe-cell 依赖 wxs 动态事件绑定
// （在 glass-easel 真机 runtime 下 wxs 事件处理器不生效，导致左滑失效）。
// 本组件使用标准 methods 事件函数，真机 / 模拟器表现一致。

const THRESHOLD = 0.3
const MIN_DISTANCE = 10

// 当前处于展开态的单元格实例（模块级共享，用于多开互斥）
let _activeCell = null

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
      this._rightWidth = 0
      this.measure()
    },
    detached() {
      if (_activeCell === this) _activeCell = null
    },
  },
  methods: {
    measure() {
      const q = this.createSelectorQuery()
      q.select('.sc-right')
        .boundingClientRect((rect) => {
          if (rect && rect.width) {
            // 测量结果存实例属性，避免直接改 this.data 不触发渲染且易丢失（P2-07）
            this._rightWidth = rect.width
          }
        })
        .exec()
    },

    onTouchStart(e) {
      const self = this
      // 提前（异步）测量右侧操作区宽度，避免首次 move 时 _rightWidth 仍是 0 导致无法左滑
      self.measure()
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
      // 右滑操作区宽度尚未测量（首次渲染/布局未完成）时，先测量并返回，
      // 避免 rightWidth 仍为 0 导致首次滑动无位移（P2-07）
      if (!self._rightWidth) {
        self.measure()
        return
      }
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

      const rw = self._rightWidth || 0
      let offset = self._startOffset + dx
      // 注意：位移上限必须用实例属性 _rightWidth（P2-07 改为实例属性后，
      // 误用 self.data.rightWidth 会恒为 0，把左滑负位移钳回 0 导致左滑失效）
      offset = Math.min(Math.max(offset, -rw), 0)
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
      const rw = self._rightWidth || 0
      let target = 0
      if (rw > 0) {
        const isOpen = self._startOffset <= -rw * 0.5
        if (isOpen) {
          // 已展开态：右滑位移超过一半(> -0.5*rw)则收起，否则保持展开
          target = self._offset > -rw * 0.5 ? 0 : -rw
        } else {
          // 未展开态：左滑超过 30% 则展开，否则收起
          target = self._offset < -rw * THRESHOLD ? -rw : 0
        }
      }
      self._offset = target
      self.setData({
        wrapperStyle: `transform: translate3d(${target}px,0,0); transition: transform .3s;`,
      })
      // 多开互斥：展开时收起其它已展开项，收起时清空前一个激活项
      if (target === -rw) {
        if (_activeCell && _activeCell !== self) _activeCell.closeSelf()
        _activeCell = self
      } else if (_activeCell === self) {
        _activeCell = null
      }
      self.unlock()
    },

    // 被动收起（被其它单元格展开时触发），不改动 _activeCell 的归属
    closeSelf() {
      const self = this
      if (self._offset !== 0) {
        self._offset = 0
        self.setData({
          wrapperStyle: 'transform: translate3d(0,0,0); transition: transform .3s;',
        })
      }
      self.unlock()
    },
  },
})
