/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo: any
    theme: string
    fridges: any[]
    currentFridgeId: string
    fridgesReady: boolean
    fridgeListVersion: number
    indexSeenVersion: number
    mineSeenVersion: number
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}