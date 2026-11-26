---
title: 前端转全栈从 0 到 1（一）：理解后端，写出第一个 API
date: 2026-11-25 18:00:00
cover: /images/2026-11-25_post-01-cover.jpg
cover_alt: 在咖啡桌上用笔记本电脑工作的人
cover_credit: 摄影 Alejandro Escamilla · Unsplash
categories:
  - 前端转全栈
tags:
  - 全栈
  - Node.js
  - Express
  - HTTP
---

前端开发者转全栈，最大的门槛通常不是新语言，而是视角：过去你站在浏览器里调用接口，现在要站到服务器那一侧，决定接口收到请求后做什么、返回什么。这篇文章用你已经熟悉的 JavaScript，从 Node.js 原生模块写出第一个 HTTP 服务，再用 Express 实现一组完整的增删查接口。

<!-- more -->

## 一、全栈到底多了哪些工作

### 1. 一次请求的完整链路

用户在页面上点击“保存”，背后会经过这样一条链路：

```text
浏览器（页面、fetch）
   │  HTTP 请求：方法 + 路径 + 请求头 + 请求体
   ▼
服务器（路由 → 校验 → 业务逻辑）
   │  读写数据
   ▼
数据库（持久保存数据）
   │
   ▼
服务器把结果包装成 HTTP 响应：状态码 + 响应头 + 响应体
   ▼
浏览器拿到 JSON，更新页面
```

前端开发者平时负责第一步和最后一步。全栈要补上的，是中间的服务器和数据库：接收请求、校验参数、执行业务逻辑、保存数据，再按约定返回结果。

### 2. 你已经具备的能力

转全栈并不是从零开始，下面这些前端经验可以直接迁移：

| 前端经验 | 在后端的用途 |
|----------|--------------|
| JavaScript / TypeScript | Node.js 使用同一门语言，语法和异步写法（`async`/`await`）完全通用 |
| 调用接口、看 Network 面板 | 已经理解 HTTP 方法、状态码、请求头和 JSON，现在只是换成“实现方” |
| npm、模块化、构建工具 | 后端项目同样用 `package.json` 管理依赖，ESM 的 `import` 写法一致 |
| 浏览器调试 | Node.js 同样支持断点调试，日志输出在终端里 |

### 3. 需要补的能力

真正要新学的内容，可以按依赖顺序排成一条路线：

| 阶段 | 内容 | 能做到什么 |
|------|------|------------|
| 1 | Node.js 运行时、HTTP 服务端、Express | 写出能被前端调用的接口（本篇） |
| 2 | 数据库与 SQL | 数据重启后不丢失，完成一个真正的全栈小应用（第二篇） |
| 3 | 用户注册登录、Cookie / Token、密码加密 | 区分“谁在请求”，保护私有数据 |
| 4 | TypeScript、分层架构、ORM、测试 | 让项目在变大后依然好维护 |
| 5 | Linux、Nginx、Docker、云服务器或 Serverless 部署 | 把应用发布到公网，让别人能访问 |

本系列前两篇覆盖阶段 1 和阶段 2。学完之后，你能独立做出一个前端页面 + 后端接口 + 数据库的完整应用。

## 二、准备 Node.js 环境

### 1. 安装并确认版本

后端代码运行在 Node.js 上。到 [Node.js 官网](https://nodejs.org/) 下载 LTS（长期支持）版本，本文示例使用 Node.js 22。安装后在终端执行：

```bash
node -v
npm -v
```

能输出版本号（例如 `v22.23.4`）就说明安装成功。第二篇会用到 Node.js 内置的 SQLite 模块，它要求 Node.js 22.13 或更高版本，建议现在就装到 22 的最新版。

### 2. 浏览器 JavaScript 和 Node.js 的区别

两者语言相同，运行环境不同：

- **浏览器**提供 `window`、`document`、DOM 等页面相关的能力，代码运行在用户的电脑上，出于安全原因不能随意读写本地文件。
- **Node.js** 没有 DOM，但提供了 `http`（网络服务）、`fs`（文件读写）、`process`（进程信息）等模块，代码运行在服务器上，可以监听端口、读写文件、连接数据库。

所以写后端时，你用的还是熟悉的 JavaScript，只是可调用的 API 换成了服务器那一套。

## 三、用原生 http 模块写第一个服务

### 1. 创建项目

新建一个空目录并进入：

```bash
mkdir hello-api
cd hello-api
```

### 2. 编写服务器代码

在目录中新建 `server.js`：

```js
const http = require('node:http')

const server = http.createServer((req, res) => {
  console.log(req.method, req.url)

  if (req.method === 'GET' && req.url === '/api/hello') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ message: '你好，全栈' }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(3000, () => {
  console.log('服务已启动：http://localhost:3000')
})
```

这段代码做了三件事：

1. `http.createServer` 创建服务器，传入的回调函数会在**每次收到请求时**执行一次。`req` 是请求对象，能读到方法和路径；`res` 是响应对象，用来写入要返回的内容。
2. 判断方法和路径：如果是 `GET /api/hello`，返回状态码 200 和一段 JSON；其他请求一律返回 404。
3. `server.listen(3000)` 让服务器监听本机 3000 端口，等待请求进来。

### 3. 运行并测试

在终端启动服务：

```bash
node server.js
```

终端会输出 `服务已启动：http://localhost:3000`，并且不会退出，因为服务器需要一直等待请求。

另开一个终端，用 `curl` 发送请求（`-i` 表示同时显示响应头）：

```bash
curl -i http://localhost:3000/api/hello
```

预期输出（日期会不同）：

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Date: Wed, 25 Nov 2026 09:45:42 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"message":"你好，全栈"}
```

访问不存在的路径 `curl -i http://localhost:3000/abc`，会得到 `HTTP/1.1 404 Not Found` 和 `{"error":"Not Found"}`。回到启动服务的终端，可以看到每次请求都打印了一行 `GET /api/hello`、`GET /abc`，这就是服务端日志。

直接在浏览器打开 `http://localhost:3000/api/hello` 也能看到这段 JSON。你平时在前端 `fetch` 的接口，本质上就是这样一段程序返回的内容。

### 4. 原生写法的局限

接口一多，原生写法很快会变得难以维护：要手动解析路径里的参数（例如 `/api/notes/42` 中的 `42`），要自己拼接请求体数据流再解析 JSON，每个响应都要重复写响应头。实际项目通常使用 Web 框架来处理这些重复工作，Express 是 Node.js 生态中最常用的一个。

## 四、用 Express 实现一组增删查接口

### 1. 初始化项目并安装 Express

新建另一个空目录：

```bash
mkdir notes-api
cd notes-api
npm init -y
npm pkg set type=module
npm install express@5
```

- `npm init -y` 生成 `package.json`；
- `npm pkg set type=module` 让项目使用 ESM 模块语法，也就是前端熟悉的 `import`/`export`；
- `express@5` 安装 Express 5，本文验证时的版本是 5.3.0。

### 2. 设计接口

我们实现一个“笔记”资源的接口。REST 风格的约定是：**用路径表示资源，用 HTTP 方法表示动作**。

| 方法与路径 | 作用 | 成功状态码 |
|------------|------|------------|
| `GET /api/notes` | 获取全部笔记 | 200 OK |
| `GET /api/notes/:id` | 获取一条笔记 | 200 OK |
| `POST /api/notes` | 新建笔记 | 201 Created |
| `DELETE /api/notes/:id` | 删除笔记 | 204 No Content |

请求出错时，参数不合法返回 400 Bad Request，找不到资源返回 404 Not Found。前端拿到状态码，就能判断该提示“参数有误”还是“内容不存在”。

### 3. 编写代码

新建 `app.js`：

```js
import express from 'express'

const app = express()
app.use(express.json())

let nextId = 3
const notes = [
  { id: 1, title: '学习 HTTP 方法' },
  { id: 2, title: '写出第一个 API' },
]

app.get('/api/notes', (req, res) => {
  res.json(notes)
})

app.get('/api/notes/:id', (req, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id))
  if (!note) {
    return res.status(404).json({ error: '笔记不存在' })
  }
  res.json(note)
})

app.post('/api/notes', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    return res.status(400).json({ error: 'title 不能为空' })
  }
  const note = { id: nextId++, title }
  notes.push(note)
  res.status(201).json(note)
})

app.delete('/api/notes/:id', (req, res) => {
  const index = notes.findIndex((n) => n.id === Number(req.params.id))
  if (index === -1) {
    return res.status(404).json({ error: '笔记不存在' })
  }
  notes.splice(index, 1)
  res.status(204).end()
})

app.listen(3000, () => {
  console.log('服务已启动：http://localhost:3000')
})
```

对照原生写法，Express 带来了这些便利：

- **路由**：`app.get`、`app.post`、`app.delete` 直接按“方法 + 路径”注册处理函数，不用再写一长串 `if` 判断。
- **路径参数**：路径中的 `:id` 会被解析到 `req.params.id`。注意它永远是字符串，所以和数字 `id` 比较前要先用 `Number()` 转换。
- **中间件**：`app.use(express.json())` 注册了一个中间件。中间件是在路由处理函数之前执行的函数，`express.json()` 负责把 JSON 格式的请求体解析成对象，放到 `req.body` 上。
- **响应工具**：`res.json()` 会自动设置 `Content-Type` 并序列化对象；`res.status(201)` 设置状态码，可以链式调用。

`POST` 接口里的校验值得多看一眼：先判断 `title` 是不是字符串，再去掉首尾空格，最后检查是否为空。**后端永远不能信任前端传来的数据**，即使前端表单做了校验，别人也可以绕过页面，直接用 `curl` 发送任意内容。

### 4. 测试接口

启动服务：

```bash
node app.js
```

另开终端逐个测试：

```bash
# 获取全部笔记
curl http://localhost:3000/api/notes
# 输出：[{"id":1,"title":"学习 HTTP 方法"},{"id":2,"title":"写出第一个 API"}]

# 新建笔记，-X 指定方法，-H 设置请求头，-d 是请求体
curl -i -X POST http://localhost:3000/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"理解状态码"}'
# 输出首行：HTTP/1.1 201 Created
# 输出正文：{"id":3,"title":"理解状态码"}

# 提交空标题
curl -i -X POST http://localhost:3000/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":""}'
# 输出首行：HTTP/1.1 400 Bad Request
# 输出正文：{"error":"title 不能为空"}

# 查询不存在的笔记
curl -i http://localhost:3000/api/notes/99
# 输出首行：HTTP/1.1 404 Not Found

# 删除 id 为 1 的笔记，成功时没有响应体
curl -i -X DELETE http://localhost:3000/api/notes/1
# 输出首行：HTTP/1.1 204 No Content
```

最后再获取一次全部笔记，结果是 `[{"id":2,"title":"写出第一个 API"},{"id":3,"title":"理解状态码"}]`，说明新增和删除都生效了。

### 5. 数据为什么重启就没了

现在按 `Ctrl + C` 停止服务再重新启动，刚才新增的“理解状态码”消失了，删掉的笔记又回来了。原因是笔记存放在 `notes` 这个数组里，数组位于进程内存中，进程退出后内存被释放，数据也就没了。

要让数据在重启、甚至服务器宕机后依然存在，就要把它保存到数据库。这正是下一篇要解决的问题。

## 五、常见错误与处理

### 1. 端口被占用

启动时报错：

```text
Error: listen EADDRINUSE: address already in use :::3000
```

说明 3000 端口已经被另一个进程占用，最常见的原因是之前启动的服务没有关掉。回到那个终端按 `Ctrl + C` 停止它；找不到的话，在 macOS 或 Linux 上执行 `lsof -i :3000` 查出进程号（PID），再用 `kill <PID>` 结束。也可以把代码里的 3000 改成其他端口。

### 2. req.body 是 undefined

如果忘记写 `app.use(express.json())`，Express 不会解析请求体，`req.body` 就是 `undefined`。此时直接访问 `req.body.title` 会抛出异常，接口返回 500：

```text
TypeError: Cannot read properties of undefined (reading 'title')
```

另一个原因是请求没有带 `Content-Type: application/json` 请求头，`express.json()` 只解析声明为 JSON 的请求体。用 `curl` 测试时不要漏掉 `-H 'Content-Type: application/json'`；前端 `fetch` 发送 JSON 时，也要在 `headers` 里设置它。

### 3. 前端页面调用接口报跨域错误

如果你的前端项目运行在 `http://localhost:5173`（Vite 默认端口），直接 `fetch('http://localhost:3000/api/notes')`，浏览器控制台会报 CORS 错误。这是因为两者端口不同，属于不同的“源”，浏览器默认禁止页面读取其他源的响应。

处理方式有两种：开发阶段在 Vite 中配置 `server.proxy`，把 `/api` 开头的请求转发到 3000 端口，浏览器看到的就是同源请求；或者让后端安装 `cors` 中间件，明确允许前端所在的源访问。第二篇会采用第三种做法：让 Express 同时提供页面和接口，从根本上避免跨域。

## 六、小结

这一篇完成了从前端到后端的第一步：

- 理解了一次请求从浏览器到服务器、再到数据库的完整链路；
- 用 Node.js 原生 `http` 模块写出了能返回 JSON 的服务；
- 用 Express 实现了带参数校验和正确状态码的增删查接口；
- 知道了内存数据会随进程退出而丢失。

下一篇会接入 SQLite 数据库，学习基础 SQL，并写一个前端页面调用这些接口，完成一个可以真正使用的待办清单应用。
