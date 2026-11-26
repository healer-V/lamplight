# Lamplight

基于 [Hexo](https://hexo.io/) 的静态个人博客，使用自定义主题 **Rail**。

## 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 运行环境 | Node.js | ≥ 20.19 | Hexo 8 的最低要求，开发时使用 Node.js 22 |
| 包管理 | pnpm | 10 及以上 | 依赖版本锁定在 `pnpm-lock.yaml` |
| 静态站点生成 | Hexo | 8.1.2 | 把 Markdown 生成静态网页 |
| Markdown 渲染 | hexo-renderer-marked | 7.0.1 | 基于 marked 15 |
| 代码高亮 | highlight.js | 11.12 | Hexo 内置，构建时完成高亮 |
| 模板引擎 | EJS（hexo-renderer-ejs） | 2.0.0 | 主题页面模板 |
| 页面生成器 | hexo-generator-index / archive / category / tag | — | 首页、归档、分类、标签页 |
| RSS | hexo-generator-feed | 4.0.0 | 生成 `/atom.xml` |
| 本地预览 | hexo-server | 3.0.0 | 本地开发服务器 |
| 主题 | Rail（自研） | — | 原生 CSS + 原生 JavaScript，无前端框架、无构建步骤 |

`hexo-renderer-stylus` 是 Hexo 起步模板自带的依赖，Rail 主题没有使用 Stylus。

### Rail 主题

- **样式**：原生 CSS，用 CSS 变量和 `oklch()` 颜色定义浅色、深色两套配色，响应式断点为 1180px 和 860px。
- **交互脚本**：原生 JavaScript，单文件，负责深色模式、移动端菜单、目录高亮与阅读进度、代码复制和站内搜索。
- **主题脚本**（`themes/rail/scripts/`）：
  - `helpers.js`：模板辅助函数，包括图标、字数统计、系列路线和菜单高亮；
  - `filters.js`：渲染后处理正文，给章节序号、表格和代码块加上主题需要的结构；
  - `search.js`：构建时生成 `/search.json`，作为站内搜索的索引。

## 目录结构

```text
.
├── _config.yml          # Hexo 站点配置
├── _config.rail.yml     # Rail 主题的站点级配置：头像、系列路线
├── source/
│   ├── _posts/          # 文章
│   ├── images/          # 文章与封面图片
│   ├── about/           # 关于页
│   ├── series/          # 专栏页
│   └── tags/            # 标签页
├── scaffolds/           # 新建文章时使用的模板
├── themes/rail/         # Rail 主题
│   ├── _config.yml      # 主题默认配置：菜单、RSS 等
│   ├── layout/          # EJS 页面模板
│   ├── scripts/         # 主题辅助脚本
│   └── source/          # CSS 与 JavaScript
└── design/              # 界面设计稿与配图来源
```

## 本地开发

```bash
pnpm install          # 安装依赖
pnpm server           # 启动本地预览，访问 http://localhost:4000
npx hexo new "标题"    # 新建文章
pnpm build            # 生成静态网站到 public/
pnpm clean            # 清理缓存和生成文件
```

`pnpm-workspace.yaml` 允许 `hexo-util` 执行安装脚本。pnpm 10 及以上默认不执行依赖的安装脚本，缺少这一项时安装会报 `ERR_PNPM_IGNORED_BUILDS`。

## 配置说明

### 站点信息

在 `_config.yml` 中修改 `title`、`subtitle`、`author` 等字段。部署前需要把 `url` 改成站点的实际地址，RSS 中的链接依赖它。

### 头像与系列路线

在 `_config.rail.yml` 中配置：

```yaml
avatar: /images/avatar.jpg     # 图片放在 source/images/ 下

series:
  - name: 系列名称
    short: 简称                  # 用于侧栏标题
    description: 一句话介绍
    cover: /images/cover.jpg
    stops:
      - title: 第一站
        slug: post-slug          # 文章 slug，即文件名去掉日期前缀后的部分
      - title: 计划中的一站        # 不写 slug 表示尚未发布
```

文章发布后，把它的 slug 填到对应的站，首页、文章页、专栏页和移动端菜单中的路线会一起更新。

### 文章封面

在文章 Front Matter 中添加：

```yaml
cover: /images/cover.jpg
cover_alt: 图片内容描述
cover_credit: 摄影 作者名 · Unsplash
```

不设置 `cover` 时，文章列表不显示缩略图，文章页不显示封面。

## 部署

`pnpm build` 生成的 `public/` 是纯静态文件，可以部署到 GitHub Pages、Cloudflare Pages、Vercel、Netlify 或任意静态文件服务器，不需要服务端运行环境或数据库。

## 图片来源

封面图片来自 [Unsplash](https://unsplash.com/)，遵循 Unsplash License，作者与原图链接见 `design/images/CREDITS.md`。
