export type ScoreKey = '构图' | '光影' | '色彩' | '情绪' | '后期空间'

export const scores: Record<ScoreKey, number> = {
  构图: 88,
  光影: 82,
  色彩: 90,
  情绪: 85,
  后期空间: 80,
}

export const analysisTags = ['电影感', '低饱和', '冷色调', '孤独感']

export const reportBlocks = [
  {
    title: '作品亮点',
    text: '画面拥有清晰的视觉中心，暗部保留了足够细节，主体与环境之间形成了克制但有张力的叙事关系。',
  },
  {
    title: '构图分析',
    text: '主体位置接近三分线交汇处，前景留白让视线自然进入画面。边缘信息较干净，整体结构稳定。',
  },
  {
    title: '光影分析',
    text: '主光方向明确，阴影层次形成了空间纵深。若进一步压低局部高光，画面会更有电影质感。',
  },
  {
    title: '色彩分析',
    text: '冷色调与低饱和处理让情绪更集中，局部暖色可以作为视觉锚点，增强观看停留时间。',
  },
  {
    title: '情绪表达',
    text: '画面传递出安静、疏离、等待的情绪，人物或建筑关系没有被过度解释，留有二次阅读空间。',
  },
  {
    title: '改进建议',
    text: '改进方向：建议裁切掉右上方少量干扰区域，并在后期中略微提升中间调对比，让主体轮廓更有力量。\n\n调色建议：白平衡可略微向冷色移动，降低青蓝色饱和度约 5%—10%，高光加入少量暖色并压低约 10%，让主体与环境形成更清晰的冷暖层次。',
  },
]

export const features = [
  ['01', '构图分析', '识别主体位置、视觉动线、留白比例与画面平衡。'],
  ['02', '光影分析', '判断光源方向、明暗层次、反差控制和空间塑造。'],
  ['03', '色彩分析', '解析色彩倾向、饱和度关系、冷暖对比与统一性。'],
  ['04', '情绪表达', '提炼照片中的叙事情绪、人物状态和观看心理。'],
  ['05', '后期建议', '给出裁切、明暗、色彩和质感层面的优化方向。'],
  ['06', '作品评分', '用专业维度生成综合评分，帮助你快速判断作品完成度。'],
]

export const photos = [
  {
    id: 1,
    title: '夜色候场',
    category: '街头',
    score: 86,
    tags: ['电影感', '冷色调'],
    image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 2,
    title: '玻璃之后',
    category: '人像',
    score: 91,
    tags: ['低饱和', '情绪'],
    image: 'https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 3,
    title: '冷山回声',
    category: '风光',
    score: 84,
    tags: ['风光', '蓝调'],
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 4,
    title: '立面秩序',
    category: '建筑',
    score: 88,
    tags: ['几何', '建筑'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 5,
    title: '银盐街角',
    category: '黑白',
    score: 79,
    tags: ['黑白', '街头'],
    image: 'https://images.unsplash.com/photo-1488685062520-56d9c949f77d?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 6,
    title: '雨后片场',
    category: '电影感',
    score: 93,
    tags: ['电影感', '胶片'],
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=90',
  },
]

export const demoImage =
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=90'

export const heroImage =
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=90'
