// utils/theme.ts - 主题管理器

/**
 * 刷新所有活跃页面的主题数据
 * 各页面的 onShow 中调用此方法，将 theme 写入页面 data，
 * 配合 WXML 中 data-theme 属性和 WXSS 中 [data-theme] 选择器实现主题切换
 */
export function refreshTheme(theme: string) {
  const validThemes = ['warm', 'fresh', 'modern', 'cute']
  const t = validThemes.includes(theme) ? theme : 'warm'

  const pages = getCurrentPages()
  pages.forEach((page: any) => {
    page.setData({ theme: t })
  })
}

/**
 * 获取主题主色
 */
export function getThemeColor(theme: string): string {
  const map: Record<string, string> = {
    warm: '#FF9F45',
    fresh: '#00B96B',
    modern: '#007AFF',
    cute: '#FF6B9D',
  }
  return map[theme] || '#FF9F45'
}

/**
 * 获取主题中文名
 */
export function getThemeName(theme: string): string {
  const map: Record<string, string> = {
    warm: '温暖家居',
    fresh: '清新健康',
    modern: '现代简约',
    cute: '可爱圆润',
  }
  return map[theme] || '温暖家居'
}

/**
 * 主题色块预览色列表
 */
export function getThemePreviewColors(theme: string): string[] {
  const map: Record<string, string[]> = {
    warm: ['#FF9F45', '#FAF8F5', '#FFE0C0'],
    fresh: ['#00B96B', '#F7FAF8', '#B7EBD0'],
    modern: ['#007AFF', '#F2F2F7', '#B0D4F7'],
    cute: ['#FF6B9D', '#FFF0F5', '#FFD0DF'],
  }
  return map[theme] || ['#FF9F45', '#FAF8F5', '#FFE0C0']
}