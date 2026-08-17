// member-manage.ts
import { call } from '../../utils/cloud'
import Toast from 'tdesign-miniprogram/toast'

const app = getApp<IAppOption>()

Page({
  data: {
    theme: 'warm',
    fridgeId: '',
    isOwner: false,
    members: [] as any[],
    currentMember: null as any,
    removeVisible: false,
    removeMember: null as any,
    removeMemberText: '',
    loadFailed: false,
  },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || '', theme: app.globalData.theme || 'warm' })
    this._inited = false
    this.loadMembers()
  },

  // 从转让/移除返回后自动刷新成员列表与角色（P2-10）
  onShow() {
    if (this._inited) this.loadMembers()
    this._inited = true
  },

  async loadMembers() {
    try {
      const data: any[] = await call('manageMember', { fridgeId: this.data.fridgeId, action: 'list' }, { silent: true })
      if (data) {
        const roleMap: Record<string, string> = { owner: '全部权限', readwrite: '可读写', readonly: '只读' }
        const myMember = data.find((m: any) => m.isCurrentUser)
        this.setData({
          members: data.map((m: any) => ({ ...m, roleText: roleMap[m.role] || m.role })),
          // isOwner 表示「当前登录用户是否为 owner」，而非「列表里是否有 owner」
          isOwner: !!(myMember && myMember.role === 'owner'),
          loadFailed: false,
        })
      }
    } catch (e: any) {
      // 加载失败与空态区分：保留「暂无成员」语义，仅失败时显示重试（P2-10）
      Toast({ context: this, message: e?.msg || '成员加载失败，请重试', selector: '#t-toast' })
      this.setData({ loadFailed: true })
    }
  },

  onRetry() {
    this.loadMembers()
  },

  onBack() { wx.navigateBack() },

  onChangeRole(e: any) {
    const member = e.currentTarget.dataset.member
    const currentRole = member.role
    const items = [
      { label: '可读写', value: 'readwrite' },
      { label: '只读', value: 'readonly' },
    ]
    wx.showActionSheet({
      itemList: items.map((i) => i.label),
      success: (res: any) => {
        const newRole = items[res.tapIndex].value
        if (newRole === currentRole) return
        this.doChangeRole(member.userId, newRole)
      },
    })
  },

  doChangeRole(userId: string, newRole: string) {
    call('manageMember', {
      fridgeId: this.data.fridgeId, action: 'changeRole',
      targetUserId: userId, newRole,
    }, { silent: true })
      .then(() => {
        app.globalData.fridgeListVersion++
        Toast({ context: this, message: '角色已更新', selector: '#t-toast' })
        this.loadMembers()
      })
      .catch((err: any) => {
        // 由页面统一提示，避免与 call() 内部 toast 叠加（P2-09）
        Toast({ context: this, message: err?.msg || '操作失败，请重试', selector: '#t-toast' })
      })
  },

  onRemove(e: any) {
    const member = e.currentTarget.dataset.member
    this.setData({
      removeVisible: true,
      removeMember: member,
      removeMemberText: `确定要移除 ${member.nickname || '该成员'} 吗？`,
    })
  },

  onRemoveConfirm() {
    const member = this.data.removeMember
    this.setData({ removeVisible: false })
    if (!member) return
    call('manageMember', {
      fridgeId: this.data.fridgeId, action: 'remove', targetUserId: member.userId,
    }, { silent: true })
      .then(() => {
        app.globalData.fridgeListVersion++
        this.loadMembers()
      })
      .catch((err: any) => {
        Toast({ context: this, message: err?.msg || '移除失败，请重试', selector: '#t-toast' })
      })
  },

  onRemoveCancel() {
    this.setData({ removeVisible: false })
  },

  onTransfer() {
    const members = this.data.members.filter((m: any) => m.role !== 'owner')
    if (members.length === 0) {
      Toast({ context: this, message: '没有可转让的成员', selector: '#t-toast' })
      return
    }
    wx.showActionSheet({
      itemList: members.map((m: any) => m.nickname || '微信用户'),
      success: (res: any) => {
        const target = members[res.tapIndex]
        this.doTransfer(target.userId)
      },
    })
  },

  doTransfer(userId: string) {
    call('manageMember', {
      fridgeId: this.data.fridgeId, action: 'transfer', targetUserId: userId,
    }, { silent: true })
      .then(() => {
        app.globalData.fridgeListVersion++
        Toast({ context: this, message: '所有权已转让', selector: '#t-toast' })
        this.loadMembers()
      })
      .catch((err: any) => {
        Toast({ context: this, message: err?.msg || '转让失败，请重试', selector: '#t-toast' })
      })
  },
})
