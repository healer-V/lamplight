/* global hexo */
'use strict'

const LANG = {
  bash: '终端', shell: '终端', sh: '终端', zsh: '终端',
  js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
  html: 'HTML', xml: 'XML', css: 'CSS', json: 'JSON', sql: 'SQL', yaml: 'YAML', yml: 'YAML',
  text: '文本', plaintext: '文本', md: 'Markdown', markdown: 'Markdown'
}

hexo.extend.filter.register('after_post_render', data => {
  let html = data.content

  // 一级章节的中文序号（一、二、……）单独包一层，桌面端悬挂在正文左侧
  html = html.replace(
    /(<h2 id="[^"]*">(?:<a [^>]*><\/a>)?)([一二三四五六七八九十]+、)/g,
    '$1<span class="no">$2</span>'
  )

  // 表格外包一层，窄屏可以横向滚动
  html = html.replace(/<table>/g, '<div class="table"><table>').replace(/<\/table>/g, '</table></div>')

  // 代码块加上语言标签和复制按钮
  html = html.replace(/<pre><code class="highlight ([\w-]+)">([\s\S]*?)<\/code><\/pre>/g, (_, lang, code) => {
    const label = LANG[lang] || lang.toUpperCase()
    return `<figure class="code" data-lang="${lang}"><header><span class="lang"></span>${label}` +
      '<button type="button" class="copy" aria-label="复制代码">' +
      '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/></svg>' +
      '<span>复制</span></button></header>' +
      `<pre><code>${code}</code></pre></figure>`
  })

  data.content = html
  return data
})
