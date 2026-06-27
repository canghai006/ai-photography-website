export type ScoreKey = '构图' | '光影' | '色彩' | '情绪' | '后期空间'

export const scores: Record<ScoreKey, number> = {
  构图: 92,
  光影: 86,
  色彩: 90,
  情绪: 91,
  后期空间: 84,
}

export const analysisTags = ['电影感', '低饱和', '冷色调', '孤独感']

export const reportBlocks = [
  {
    title: '作品亮点',
    text: '水面倒影把园林建筑完整延伸到画面下半部，白衣舞者成为明亮而灵动的视觉锚点，静态空间与人物动作形成了很有诗意的对照。',
  },
  {
    title: '构图分析',
    text: '舞者落在右侧三分区域，横向廊桥稳定画面结构，上下倒影形成接近对称的纵深。建筑、荷叶与水纹共同建立了层次丰富的观看路径。',
  },
  {
    title: '光影分析',
    text: '斑驳阳光穿过树冠照亮舞者和荷塘，使白衣从深绿环境中自然分离。屋檐暗部仍有细节，水面反光让上下空间保持通透。',
  },
  {
    title: '色彩分析',
    text: '绿色是画面主色，朱红立柱形成互补色节奏，白衣则提供干净的视觉停顿。整体色彩浓郁但仍保持传统园林的沉静气质。',
  },
  {
    title: '情绪表达',
    text: '舞者舒展的动作与平静水面形成动静关系，传统建筑和完整倒影增强了东方叙事感，画面像一段被定格的园林舞台。',
  },
  {
    title: '改进建议',
    text: '改进方向：可适度弱化画面右侧暗部人物与杂物的存在感，并轻微提亮屋檐下的中间调，让建筑细节与舞者之间的叙事联系更完整。\n\n调色建议：绿色饱和度降低约 5%—8%，黄色明度略降以控制树叶高光；白衣高光压低约 10%，阴影轻抬并加入少量青色，高光保留微暖色，让朱红立柱、白衣和深绿环境的层次更清晰。',
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
    category: '其他',
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
    category: '其他',
    score: 88,
    tags: ['几何', '建筑'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 5,
    title: '银盐街角',
    category: '其他',
    score: 79,
    tags: ['黑白', '街头'],
    image: 'https://images.unsplash.com/photo-1488685062520-56d9c949f77d?auto=format&fit=crop&w=1200&q=90',
  },
  {
    id: 6,
    title: '雨后片场',
    category: '其他',
    score: 93,
    tags: ['电影感', '胶片'],
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=90',
  },
]

export const demoImage =
  '/media/demo-garden-reflection.jpg'

export const heroImage =
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=90'
