/* global hexo */
'use strict'

// 生成 /search.json，供站内搜索使用
hexo.extend.generator.register('search_index', function (locals) {
  const urlFor = hexo.extend.helper.get('url_for').bind(hexo)
  const posts = locals.posts.sort('-date').filter(p => p.published !== false).map(p => ({
    title: p.title,
    url: urlFor(p.path),
    date: p.date.format('YYYY-MM-DD'),
    text: String(p.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
  }))
  return { path: 'search.json', data: JSON.stringify(posts) }
})
