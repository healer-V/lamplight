/* global hexo */
'use strict'

const ICONS = {
  list: '<path d="M4 5h16M4 12h16M4 19h10"/>',
  series: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  archive: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>'
}

hexo.extend.helper.register('icon', (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`)

// 字数：中文按字计，英文和数字按词计，不含代码块
hexo.extend.helper.register('word_count', function (content) {
  const text = String(content || '')
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<[^>]+>/g, ' ')
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const words = (text.match(/[A-Za-z0-9]+/g) || []).length
  const n = cjk + words
  return n < 1000 ? `${n} 字` : `约 ${(n / 1000).toFixed(1)}k 字`
})

// 系列的每一站，已发布的文章带上链接
hexo.extend.helper.register('series_stops', function (series) {
  return (series.stops || []).map(stop => {
    const post = stop.slug ? this.site.posts.findOne({ slug: stop.slug }) : null
    return { title: stop.title, url: post ? this.url_for(post.path) : '', post }
  })
})

// 当前文章属于哪个系列、第几站
hexo.extend.helper.register('series_of', function (post) {
  for (const series of this.theme.series || []) {
    const index = (series.stops || []).findIndex(s => s.slug && s.slug === post.slug)
    if (index !== -1) return { series, index }
  }
  return null
})

// 当前页面对应哪个菜单项
hexo.extend.helper.register('current_section', function () {
  const page = this.page
  if (this.is_tag() || page.layout === 'tags') return '/tags/'
  if (this.is_category() || page.layout === 'series') return '/series/'
  if (this.is_archive()) return '/archives/'
  if (this.is_home() || this.is_post()) return '/'
  return '/' + String(page.path || '').replace(/index\.html$/, '')
})
