/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo: any
    theme: string
    fridges: any[]
    currentFridgeId: string
    homeDataDirty:boolean
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}