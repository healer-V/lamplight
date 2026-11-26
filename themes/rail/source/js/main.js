(() => {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const root = document.documentElement

  // 深色模式：默认跟随系统，手动切换后记住选择
  const syncTheme = () => $$('[data-theme-btn]').forEach(b => b.setAttribute('aria-pressed', String(root.dataset.theme === 'dark')))
  $$('[data-theme-btn]').forEach(b => b.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark'
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (e) {}
    syncTheme()
  }))
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    let saved = null
    try { saved = localStorage.getItem('theme') } catch (err) {}
    if (saved) return
    if (e.matches) root.dataset.theme = 'dark'; else delete root.dataset.theme
    syncTheme()
  })
  syncTheme()

  // 移动端菜单抽屉
  const drawer = $('#drawer')
  const menuBtn = $('[data-menu]')
  const setDrawer = open => {
    if (!drawer) return
    drawer.classList.toggle('open', open)
    menuBtn && menuBtn.setAttribute('aria-expanded', String(open))
    if (open) $('.close', drawer).focus(); else if (menuBtn && drawer.contains(document.activeElement)) menuBtn.focus()
  }
  menuBtn && menuBtn.addEventListener('click', () => setDrawer(true))
  drawer && $$('[data-close], a', drawer).forEach(el => el.addEventListener('click', () => setDrawer(false)))
  addEventListener('keydown', e => { if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) setDrawer(false) })

  // 目录高亮与阅读进度
  const heads = $$('.prose h2[id], .prose h3[id]')
  const links = $$('.toc-link')
  const pctText = $('[data-progress-text]')
  const bar = $('[data-progress-bar]')
  const hrefId = a => { try { return decodeURIComponent(a.getAttribute('href').slice(1)) } catch (e) { return '' } }
  let ticking = false
  const update = () => {
    ticking = false
    if (heads.length && links.length) {
      const y = scrollY + 120
      let cur = heads[0]
      for (const h of heads) { if (h.offsetTop <= y) cur = h; else break }
      links.forEach(a => {
        const on = hrefId(a) === cur.id
        a.classList.toggle('on', on)
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current')
      })
    }
    if (pctText || bar) {
      const prose = $('.prose')
      let pct = 0
      if (prose) {
        const start = prose.offsetTop - innerHeight * 0.3
        const end = prose.offsetTop + prose.offsetHeight - innerHeight
        pct = Math.round(Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start))) * 100)
      }
      if (pctText) pctText.textContent = pct + '%'
      if (bar) bar.style.width = pct + '%'
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }, { passive: true })
  addEventListener('resize', update)
  update()

  // 复制代码
  $$('.code .copy').forEach(btn => btn.addEventListener('click', async () => {
    const code = $('pre', btn.closest('.code')).innerText
    const label = $('span', btn)
    try {
      await navigator.clipboard.writeText(code)
      label.textContent = '已复制'
    } catch (e) {
      label.textContent = '复制失败'
    }
    btn.classList.add('ok')
    setTimeout(() => { label.textContent = '复制'; btn.classList.remove('ok') }, 1600)
  }))

  // 站内搜索
  const dialog = $('#search')
  const input = $('[data-search-input]')
  const results = $('[data-search-results]')
  let index = null
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const mark = (s, q) => esc(s).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`)
  const render = () => {
    const q = input.value.trim()
    if (!q) { results.innerHTML = '<p class="hint">输入关键词开始搜索</p>'; return }
    if (!index) { results.innerHTML = '<p class="hint">正在加载索引…</p>'; return }
    const lower = q.toLowerCase()
    const hits = index.filter(p => p.title.toLowerCase().includes(lower) || p.text.toLowerCase().includes(lower)).slice(0, 20)
    if (!hits.length) { results.innerHTML = `<p class="hint">没有找到包含“${esc(q)}”的文章，换个关键词试试。</p>`; return }
    results.innerHTML = hits.map(p => {
      const i = p.text.toLowerCase().indexOf(lower)
      const snip = i >= 0 ? (i > 30 ? '…' : '') + p.text.slice(Math.max(0, i - 30), i + 70) + '…' : p.text.slice(0, 90) + '…'
      return `<a href="${p.url}"><b>${mark(p.title, q)}</b><small>${p.date} · ${mark(snip, q)}</small></a>`
    }).join('')
  }
  const openSearch = async () => {
    if (!dialog) return
    setDrawer(false)
    dialog.showModal()
    input.focus()
    if (!index) {
      try { index = await (await fetch(window.RAIL.search)).json() } catch (e) { results.innerHTML = '<p class="hint">搜索索引加载失败，请刷新页面后重试。</p>'; return }
      render()
    }
  }
  $$('[data-search-open]').forEach(b => b.addEventListener('click', openSearch))
  input && input.addEventListener('input', render)
  dialog && dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close() })
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog && dialog.open ? dialog.close() : openSearch() }
  })
})()
