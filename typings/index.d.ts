/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo: any
    theme: string
    fridges: any[]
    currentFridgeId: string
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}