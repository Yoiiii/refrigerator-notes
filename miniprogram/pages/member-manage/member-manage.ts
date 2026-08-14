// member-manage.ts
import { call } from '../../utils/cloud'
import Toast from 'tdesign-miniprogram/toast'
import { ActionSheet } from 'tdesign-miniprogram'

const app = getApp<IAppOption>()

Page({
  data: { theme: 'warm', fridgeId: '', isOwner: false, members: [] as any[], currentMember: null as any, removeVisible: false, removeMember: null as any, removeMemberText: '' },

  onLoad(options: any) {
    this.setData({ fridgeId: options.fridgeId || '', theme: app.globalData.theme || 'warm' })
    this.loadMembers()
  },

  async loadMembers() {
    try {
      const data = await call('manageMember', { fridgeId: this.data.fridgeId, action: 'list' })
      if (data) {
        const roleMap: Record<string, string> = { owner: '全部权限', readwrite: '可读写', readonly: '只读' }
        this.setData({
          members: data.map((m: any) => ({ ...m, roleText: roleMap[m.role] || m.role })),
          isOwner: data.some((m: any) => m.role === 'owner'),
        })
      }
    } catch (e) { }
  },

  onBack() { wx.navigateBack() },

  onChangeRole(e: any) {
    const member = e.currentTarget.dataset.member
    this.setData({ currentMember: member })
    const currentRole = member.role
    const items = [
      { label: '可读写', value: 'readwrite' },
      { label: '只读', value: 'readonly' },
    ]
    ActionSheet({
      title: '修改角色',
      itemList: items.map((i) => i.label),
      selector: '#t-action-sheet',
      closeBtn: true,
    }).then((res: any) => {
      if (res.selected !== undefined) {
        const newRole = items[res.selected].value
        if (newRole === currentRole) return
        call('manageMember', {
          fridgeId: this.data.fridgeId, action: 'changeRole',
          targetUserId: member.userId, newRole,
        }).then(() => {
          app.globalData.fridgeListVersion++
          Toast({ context: this, message: '角色已更新', selector: '#t-toast' })
          this.loadMembers()
        }).catch(() => { })
      }
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
    }).then(() => {
      app.globalData.fridgeListVersion++
      this.loadMembers()
    }).catch(() => { })
  },

  onRemoveCancel() {
    this.setData({ removeVisible: false })
  },

  onTransfer() {
    const members = this.data.members.filter((m: any) => m.role !== 'owner')
    ActionSheet({
      title: '选择新所有者',
      itemList: members.map((m: any) => m.nickname || '微信用户'),
      selector: '#t-action-sheet',
      closeBtn: true,
    }).then((res: any) => {
      if (res.selected !== undefined) {
        const target = members[res.selected]
        call('manageMember', {
          fridgeId: this.data.fridgeId, action: 'transfer', targetUserId: target.userId,
        }).then(() => {
          app.globalData.fridgeListVersion++
          Toast({ context: this, message: '所有权已转让', selector: '#t-toast' })
          this.loadMembers()
        }).catch(() => { })
      }
    })
  },
})
