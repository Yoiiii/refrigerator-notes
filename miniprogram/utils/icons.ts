// utils/icons.js - 物品图标映射表

export interface IconCategory {
  key: string
  name: string
  icons: IconItem[]
}

export interface IconItem {
  key: string
  emoji: string 
  name: string
}

export const ICON_CATEGORIES: IconCategory[] = [
  {
    key: 'dairy',
    name: '乳制品',
    icons: [
      { key: 'milk', emoji: '🥛', name: '牛奶' },
      { key: 'yogurt', emoji: '🍶', name: '酸奶' },
      { key: 'cheese', emoji: '🧀', name: '奶酪' },
      { key: 'butter', emoji: '🧈', name: '黄油' },
      { key: 'cream', emoji: '🍦', name: '奶油' },
    ],
  },
  {
    key: 'veg_fruit',
    name: '蔬菜水果',
    icons: [
      { key: 'apple', emoji: '🍎', name: '苹果' },
      { key: 'banana', emoji: '🍌', name: '香蕉' },
      { key: 'tomato', emoji: '🍅', name: '西红柿' },
      { key: 'lettuce', emoji: '🥬', name: '生菜' },
      { key: 'grape', emoji: '🍇', name: '葡萄' },
      { key: 'carrot', emoji: '🥕', name: '胡萝卜' },
      { key: 'orange', emoji: '🍊', name: '橙子' },
      { key: 'lemon', emoji: '🍋', name: '柠檬' },
      { key: 'peach', emoji: '🍑', name: '桃子' },
      { key: 'strawberry', emoji: '🍓', name: '草莓' },
      { key: 'watermelon', emoji: '🍉', name: '西瓜' },
      { key: 'corn', emoji: '🌽', name: '玉米' },
      { key: 'garlic', emoji: '🧄', name: '大蒜' },
      { key: 'onion', emoji: '🧅', name: '洋葱' },
      { key: 'potato', emoji: '🥔', name: '土豆' },
      { key: 'pepper', emoji: '🫑', name: '青椒' },
      { key: 'cucumber', emoji: '🥒', name: '黄瓜' },
      { key: 'mushroom', emoji: '🍄', name: '蘑菇' },
    ],
  },
  {
    key: 'meat_egg',
    name: '肉禽蛋',
    icons: [
      { key: 'egg', emoji: '🥚', name: '鸡蛋' },
      { key: 'chicken', emoji: '🍗', name: '鸡肉' },
      { key: 'pork', emoji: '🥩', name: '猪肉' },
      { key: 'beef', emoji: '🥩', name: '牛肉' },
      { key: 'fish', emoji: '🐟', name: '鱼' },
      { key: 'shrimp', emoji: '🦐', name: '虾' },
      { key: 'sausage', emoji: '🌭', name: '香肠' },
      { key: 'bacon', emoji: '🥓', name: '培根' },
    ],
  },
  {
    key: 'drink',
    name: '饮料',
    icons: [
      { key: 'juice', emoji: '🧃', name: '果汁' },
      { key: 'cola', emoji: '🥤', name: '可乐' },
      { key: 'water', emoji: '💧', name: '矿泉水' },
      { key: 'tea', emoji: '🍵', name: '茶' },
      { key: 'beer', emoji: '🍺', name: '啤酒' },
      { key: 'wine', emoji: '🍷', name: '红酒' },
      { key: 'coffee', emoji: '☕', name: '咖啡' },
      { key: 'bubble_tea', emoji: '🧋', name: '奶茶' },
    ],
  },
  {
    key: 'condiment',
    name: '调味品',
    icons: [
      { key: 'soy_sauce', emoji: '🫗', name: '酱油' },
      { key: 'vinegar', emoji: '🫗', name: '醋' },
      { key: 'salt', emoji: '🧂', name: '盐' },
      { key: 'oil', emoji: '🫒', name: '油' },
      { key: 'ketchup', emoji: '🫗', name: '番茄酱' },
      { key: 'sauce', emoji: '🥫', name: '酱料' },
      { key: 'jam', emoji: '🍯', name: '果酱' },
      { key: 'honey', emoji: '🍯', name: '蜂蜜' },
    ],
  },
  {
    key: 'frozen',
    name: '速冻食品',
    icons: [
      { key: 'dumpling', emoji: '🥟', name: '饺子' },
      { key: 'tangyuan', emoji: '🍡', name: '汤圆' },
      { key: 'ice_cream', emoji: '🍨', name: '冰淇淋' },
      { key: 'frozen_veg', emoji: '🥦', name: '冷冻蔬菜' },
      { key: 'pizza', emoji: '🍕', name: '披萨' },
      { key: 'meatball', emoji: '🧆', name: '肉丸' },
      { key: 'frozen_fish', emoji: '🐠', name: '冷冻鱼' },
      { key: 'frozen_shrimp', emoji: '🦞', name: '冷冻虾仁' },
    ],
  },
  {
    key: 'cooked',
    name: '熟食主食',
    icons: [
      { key: 'bread', emoji: '🍞', name: '面包' },
      { key: 'rice', emoji: '🍚', name: '米饭' },
      { key: 'noodle', emoji: '🍜', name: '面条' },
      { key: 'sandwich', emoji: '🥪', name: '三明治' },
      { key: 'cake', emoji: '🍰', name: '蛋糕' },
      { key: 'cookie', emoji: '🍪', name: '饼干' },
      { key: 'sushi', emoji: '🍣', name: '寿司' },
      { key: 'hotpot', emoji: '🍲', name: '火锅底料' },
    ],
  },
  {
    key: 'other',
    name: '其他',
    icons: [
      { key: 'box', emoji: '📦', name: '默认' },
      { key: 'medicine', emoji: '💊', name: '药品' },
      { key: 'cosmetic', emoji: '💄', name: '化妆品' },
      { key: 'gift', emoji: '🎁', name: '礼物' },
      { key: 'candy', emoji: '🍬', name: '糖果' },
      { key: 'snack', emoji: '🍿', name: '零食' },
      { key: 'chocolate', emoji: '🍫', name: '巧克力' },
      { key: 'nut', emoji: '🥜', name: '坚果' },
    ],
  },
]

/**
 * 根据 key 查找图标
 */
export function findIcon(key: string): IconItem | undefined {
  for (const cat of ICON_CATEGORIES) {
    const found = cat.icons.find((i) => i.key === key)
    if (found) return found
  }
  return undefined
}

/**
 * 获取图标 emoji
 */
export function getIconEmoji(key: string): string {
  return findIcon(key)?.emoji || '📦'
}