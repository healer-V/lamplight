---
title: 前端转全栈从 0 到 1（二）：接入数据库，完成一个待办应用
date: 2026-11-25 19:00:00
cover: /images/2026-11-25_post-02-cover.jpg
cover_alt: 木桌上的笔记本电脑和手写笔记
cover_credit: 摄影 Galymzhan Abdugalimov · Unsplash
categories:
  - 前端转全栈
tags:
  - 全栈
  - Node.js
  - Express
  - SQLite
  - SQL
---

上一篇用 Express 写出了增删查接口，但数据存放在内存数组里，服务一重启就丢失。这一篇把数据存进 SQLite 数据库，学习够用的 SQL，再写一个调用这些接口的前端页面，从空目录开始完成一个能真正使用的待办清单应用。

<!-- more -->

## 一、为什么需要数据库

### 1. 内存、文件和数据库

保存数据大致有三种做法：

| 做法 | 问题或优势 |
|------|------------|
| 存在内存变量里 | 进程退出即丢失，也无法在多台服务器之间共享 |
| 自己写 JSON 文件 | 能持久保存，但每次修改都要读出整个文件再写回；两个请求同时写入时可能互相覆盖，查询和筛选都要自己实现 |
| 存进数据库 | 数据持久保存；支持按条件查询、排序和并发读写；保证写入要么完整成功、要么完全不生效 |

后端开发中最常用的是**关系型数据库**：数据以“表”的形式组织，每张表有固定的列，每一行是一条记录，形式上很像一张 Excel 表格。常见的关系型数据库有 MySQL、PostgreSQL 和 SQLite，它们都使用 SQL 语言操作数据。

### 2. 为什么入门选 SQLite

MySQL 和 PostgreSQL 需要单独安装并启动数据库服务。SQLite 不需要服务进程，整个数据库就是磁盘上的一个文件，程序直接读写这个文件即可，非常适合学习、个人项目和小型应用。

Node.js 从 22.5.0 开始内置了 `node:sqlite` 模块，22.13.0 起无需额外启动参数即可使用，所以这一篇**不需要安装任何数据库软件**。先确认版本：

```bash
node -v
```

输出 `v22.13.0` 或更高版本即可。

`node:sqlite` 在 Node.js 22 中仍标记为实验性功能，运行时会输出一行 `ExperimentalWarning: SQLite is an experimental feature`。这只是提醒 API 未来可能调整，不影响本文的使用。正式项目可以换成成熟的第三方库 `better-sqlite3`，它的 `prepare`、`run`、`get`、`all` 用法与本文几乎一致。

## 二、创建项目

### 1. 初始化

新建一个空目录：

```bash
mkdir todo-app
cd todo-app
npm init -y
npm pkg set type=module
npm pkg set scripts.dev="node --watch server.js" scripts.start="node server.js"
npm install express@5
mkdir public
```

这里额外配置了两个脚本：`npm start` 正常启动服务；`npm run dev` 使用 Node.js 自带的 `--watch` 模式，修改代码保存后会自动重启服务，作用类似前端开发服务器的热更新。

### 2. 最终的目录结构

完成本文后，项目结构如下：

```text
todo-app/
├── package.json
├── db.js          # 数据库连接与数据操作
├── server.js      # Express 服务与接口
├── todo.db        # 首次运行后自动生成的数据库文件
└── public/        # 前端页面，由 Express 直接提供
    ├── index.html
    └── app.js
```

后端分成 `db.js` 和 `server.js` 两个文件：`db.js` 只负责和数据库打交道，`server.js` 只负责处理 HTTP 请求。这样以后更换数据库时，只需要修改 `db.js`。

## 三、先学会够用的 SQL

### 1. 表结构与增删改查

SQL 是操作关系型数据库的语言。写待办应用只需要掌握建表和增删改查五种语句。先在项目里新建 `sql-demo.js` 练习：

```js
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(':memory:')

db.exec(`
  CREATE TABLE todos (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`)

const insert = db.prepare('INSERT INTO todos (title) VALUES (?)')
insert.run('学习 SELECT')
insert.run('学习 UPDATE')
insert.run('学习 DELETE')

db.prepare('UPDATE todos SET done = 1 WHERE id = ?').run(1)
db.prepare('DELETE FROM todos WHERE id = ?').run(3)

console.log(db.prepare('SELECT * FROM todos').all())
console.log(db.prepare('SELECT title FROM todos WHERE done = ?').get(0))
```

运行 `node sql-demo.js`，输出如下（`[Object: null prototype]` 表示这是一个没有原型的普通对象，可以忽略）：

```text
[
  [Object: null prototype] { id: 1, title: '学习 SELECT', done: 1 },
  [Object: null prototype] { id: 2, title: '学习 UPDATE', done: 0 }
]
[Object: null prototype] { title: '学习 UPDATE' }
```

`':memory:'` 表示把数据库建在内存中，程序结束就消失，适合练习。逐句看这段代码：

| 语句 | 作用 |
|------|------|
| `CREATE TABLE todos (...)` | 建一张名为 `todos` 的表，定义三列：`id` 是自动递增的主键，用来唯一标识每一行；`title` 是不能为空的文本；`done` 是整数，默认值 0 |
| `INSERT INTO todos (title) VALUES (?)` | 插入一行，只给 `title` 赋值，`id` 和 `done` 使用自动值和默认值 |
| `UPDATE todos SET done = 1 WHERE id = ?` | 把指定 `id` 那一行的 `done` 改为 1 |
| `DELETE FROM todos WHERE id = ?` | 删除指定 `id` 的行 |
| `SELECT * FROM todos` | 查询所有行的所有列；`WHERE done = ?` 用来加筛选条件 |

SQLite 没有布尔类型，习惯用整数 1 和 0 表示 true 和 false，后面的代码会把它转换成 JavaScript 的布尔值再返回给前端。

### 2. 用占位符防止 SQL 注入

注意 SQL 里的 `?`：它是**占位符**，真正的值通过 `run(值)`、`get(值)` 单独传入。千万不要用字符串拼接 SQL：

```js
// 危险：用户输入被当成 SQL 代码的一部分
db.exec(`INSERT INTO todos (title) VALUES ('${title}')`)
```

如果用户提交的标题是 `'); DROP TABLE todos; --`，拼接后就变成了“插入一行，然后删除整张表”。这种攻击叫做 **SQL 注入**。使用占位符时，数据库会把传入的值始终当作普通数据，无论内容是什么都不会被执行。后面测试时会实际验证这一点。

### 3. prepare、run、get、all 的区别

`db.prepare(sql)` 把 SQL 预编译成一条语句对象，然后按用途调用：

- `run(...)`：执行写操作（INSERT、UPDATE、DELETE），返回 `changes`（影响了几行）和 `lastInsertRowid`（新插入行的 id）；
- `get(...)`：查询并返回第一行，没有结果时返回 `undefined`；
- `all(...)`：查询并返回所有行组成的数组。

`db.exec(sql)` 直接执行 SQL，不支持占位符，只用于建表这类不包含用户输入的语句。

练习完可以删掉 `sql-demo.js`。

## 四、编写后端

### 1. 数据层 db.js

新建 `db.js`：

```js
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('todo.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`)

const toTodo = (row) => row && { ...row, done: row.done === 1 }

export function listTodos() {
  return db.prepare('SELECT * FROM todos ORDER BY id DESC').all().map(toTodo)
}

export function createTodo(title) {
  const result = db.prepare('INSERT INTO todos (title) VALUES (?)').run(title)
  return getTodo(result.lastInsertRowid)
}

export function getTodo(id) {
  return toTodo(db.prepare('SELECT * FROM todos WHERE id = ?').get(id))
}

export function updateTodo(id, done) {
  const result = db
    .prepare('UPDATE todos SET done = ? WHERE id = ?')
    .run(done ? 1 : 0, id)
  return result.changes > 0 ? getTodo(id) : undefined
}

export function deleteTodo(id) {
  return db.prepare('DELETE FROM todos WHERE id = ?').run(id).changes > 0
}
```

和练习代码相比，有几处变化：

- `new DatabaseSync('todo.db')` 使用文件数据库。文件不存在时会自动创建，这就是数据能跨重启保存的原因。
- `CREATE TABLE IF NOT EXISTS` 只在表不存在时建表。每次启动服务都会执行这句，但不会覆盖已有数据。
- 新增 `created_at` 列，默认值为插入时的本地时间。
- `toTodo` 把数据库里的 0 和 1 转成 `false` 和 `true`。前端拿到的是自然的布尔值，不需要关心数据库怎么存。
- `updateTodo` 和 `deleteTodo` 通过 `changes` 判断是否真的修改了数据。为 0 说明对应 id 不存在，接口层据此返回 404。

### 2. 接口层 server.js

新建 `server.js`：

```js
import express from 'express'
import { listTodos, createTodo, updateTodo, deleteTodo } from './db.js'

const app = express()
app.use(express.json())
app.use(express.static('public'))

app.get('/api/todos', (req, res) => {
  res.json(listTodos())
})

app.post('/api/todos', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) {
    return res.status(400).json({ error: 'title 不能为空' })
  }
  res.status(201).json(createTodo(title))
})

app.patch('/api/todos/:id', (req, res) => {
  if (typeof req.body?.done !== 'boolean') {
    return res.status(400).json({ error: 'done 必须是布尔值' })
  }
  const todo = updateTodo(Number(req.params.id), req.body.done)
  if (!todo) {
    return res.status(404).json({ error: '待办不存在' })
  }
  res.json(todo)
})

app.delete('/api/todos/:id', (req, res) => {
  if (!deleteTodo(Number(req.params.id))) {
    return res.status(404).json({ error: '待办不存在' })
  }
  res.status(204).end()
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(3000, () => {
  console.log('服务已启动：http://localhost:3000')
})
```

接口设计如下：

| 方法与路径 | 请求体 | 作用 | 成功状态码 |
|------------|--------|------|------------|
| `GET /api/todos` | 无 | 获取全部待办，新的在前 | 200 |
| `POST /api/todos` | `{"title":"..."}` | 新建待办 | 201 |
| `PATCH /api/todos/:id` | `{"done":true}` | 修改完成状态 | 200 |
| `DELETE /api/todos/:id` | 无 | 删除待办 | 204 |

这里用 `PATCH` 而不是 `PUT`：`PUT` 的语义是用请求体整体替换资源，`PATCH` 是只修改其中一部分字段，这里只改 `done`，所以用 `PATCH` 更准确。

代码中有两处新内容：

- `express.static('public')`：把 `public` 目录作为静态文件目录。访问 `http://localhost:3000/` 时，Express 会返回 `public/index.html`。页面和接口来自同一个源，前端调用接口时不存在跨域问题。
- 最后的 `app.use((err, req, res, next) => ...)` 是**错误处理中间件**，Express 通过“四个参数”识别它。任何路由里抛出的异常，例如数据库文件损坏导致的报错，都会被它捕获：详细错误打印在服务端日志里，前端只收到一句通用提示，避免把内部信息暴露给用户。

## 五、编写前端页面

### 1. 页面结构 index.html

新建 `public/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>待办清单</title>
  <style>
    body { max-width: 480px; margin: 40px auto; font-family: system-ui, sans-serif; }
    form { display: flex; gap: 8px; }
    input[type="text"] { flex: 1; padding: 6px; }
    li { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    li.done span { text-decoration: line-through; color: #999; }
    li button { margin-left: auto; }
  </style>
</head>
<body>
  <h1>待办清单</h1>
  <form id="form">
    <input id="title" type="text" placeholder="要做什么？" required>
    <button>添加</button>
  </form>
  <ul id="list"></ul>
  <script src="app.js"></script>
</body>
</html>
```

### 2. 交互逻辑 app.js

新建 `public/app.js`：

```js
const list = document.querySelector('#list')
const form = document.querySelector('#form')
const input = document.querySelector('#title')

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok && res.status !== 204) {
    const data = await res.json()
    throw new Error(data.error)
  }
  return res.status === 204 ? null : res.json()
}

async function render() {
  const todos = await request('/api/todos')
  list.innerHTML = ''
  for (const todo of todos) {
    const li = document.createElement('li')
    li.className = todo.done ? 'done' : ''

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = todo.done
    checkbox.onchange = async () => {
      await request(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: checkbox.checked }),
      })
      render()
    }

    const span = document.createElement('span')
    span.textContent = todo.title

    const remove = document.createElement('button')
    remove.textContent = '删除'
    remove.onclick = async () => {
      await request(`/api/todos/${todo.id}`, { method: 'DELETE' })
      render()
    }

    li.append(checkbox, span, remove)
    list.append(li)
  }
}

form.onsubmit = async (event) => {
  event.preventDefault()
  try {
    await request('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title: input.value }),
    })
    input.value = ''
    render()
  } catch (err) {
    alert(err.message)
  }
}

render()
```

这部分是前端开发者最熟悉的内容，有三点和后端直接相关：

- `request` 函数统一封装了 `fetch`：自动带上 JSON 请求头；状态码不是 2xx 时，读出后端返回的 `error` 字段并抛出异常；204 没有响应体，直接返回 `null`，否则调用 `res.json()` 会报错。
- 接口地址写的是相对路径 `/api/todos`，因为页面和接口同源。
- 待办标题用 `textContent` 而不是 `innerHTML` 写入页面。标题是用户输入的内容，如果用 `innerHTML`，有人提交 `<img src=x onerror=alert(1)>` 这样的标题，脚本就会在其他人的浏览器中执行，这就是 XSS 攻击。

页面的工作方式是“操作后重新拉取”：每次新增、勾选或删除，都在接口成功后调用 `render()` 重新获取列表。页面展示的永远是数据库里的真实数据，逻辑简单，适合入门。

## 六、运行与验证

### 1. 用 curl 测试接口

启动服务：

```bash
npm start
```

终端输出：

```text
> todo-app@1.0.0 start
> node server.js

(node:35202) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
服务已启动：http://localhost:3000
```

另开终端测试接口（`created_at` 会是你执行时的时间）：

```bash
curl -X POST http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"学会 SQL 基础"}'
# {"id":1,"title":"学会 SQL 基础","done":false,"created_at":"2026-11-25 17:46:42"}

curl -X POST http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"完成待办应用"}'
# {"id":2,"title":"完成待办应用","done":false,"created_at":"2026-11-25 17:46:42"}

curl -X PATCH http://localhost:3000/api/todos/1 \
  -H 'Content-Type: application/json' \
  -d '{"done":true}'
# {"id":1,"title":"学会 SQL 基础","done":true,"created_at":"2026-11-25 17:46:42"}

curl -i -X PATCH http://localhost:3000/api/todos/1 \
  -H 'Content-Type: application/json' \
  -d '{"done":"yes"}'
# HTTP/1.1 400 Bad Request
# {"error":"done 必须是布尔值"}

curl -i -X DELETE http://localhost:3000/api/todos/99
# HTTP/1.1 404 Not Found
# {"error":"待办不存在"}
```

### 2. 验证数据持久化

在服务终端按 `Ctrl + C` 停止服务，再执行 `npm start` 重新启动，然后查询：

```bash
curl http://localhost:3000/api/todos
```

输出仍然包含重启前的两条数据，并且第 1 条保持已完成状态：

```text
[{"id":2,"title":"完成待办应用","done":false,"created_at":"2026-11-25 17:46:42"},{"id":1,"title":"学会 SQL 基础","done":true,"created_at":"2026-11-25 17:46:42"}]
```

项目目录里多出的 `todo.db` 就是保存这些数据的数据库文件。上一篇里“重启就丢数据”的问题解决了。

### 3. 验证 SQL 注入无效

提交一个包含攻击语句的标题：

```bash
curl -X POST http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"'); DROP TABLE todos; --\"}"
```

接口返回 201，这段文字被原样保存成了一条普通待办；再查询列表，三条数据都在，表没有被删除。这说明占位符确实把用户输入当作数据处理。

### 4. 在浏览器中使用

打开 `http://localhost:3000/`，可以看到待办清单页面：在输入框中输入内容后点击“添加”，新待办出现在列表顶部；勾选复选框，标题会变灰并加上删除线；点击“删除”移除该条。刷新页面或重启服务后，列表内容保持不变。

打开浏览器开发者工具的 Network 面板，可以看到每个操作对应的 `POST`、`PATCH`、`DELETE` 请求和状态码，和刚才用 curl 测试的结果一致。到这里，前端页面、后端接口和数据库已经完整串联起来。

## 七、常见错误与处理

### 1. 找不到 node:sqlite 模块

启动时报错 `No such built-in module: node:sqlite`，说明 Node.js 版本低于 22.5.0。如果版本在 22.5.0 到 22.13.0 之间，模块存在但需要加启动参数 `--experimental-sqlite`。最简单的处理方式是把 Node.js 升级到 22 的最新版本。

### 2. 想清空数据重新开始

停止服务后删除项目里的 `todo.db` 文件，再次启动时会自动创建一个空数据库。注意要先停止服务，再删除文件。

### 3. 修改表结构后不生效

如果你在 `CREATE TABLE IF NOT EXISTS` 里新增了一列，重启后数据库并没有出现这一列。因为表已经存在，这句 SQL 会被整体跳过。学习阶段可以直接删除 `todo.db` 让表重新创建；正式项目里修改表结构要使用 `ALTER TABLE` 语句，或者借助数据库迁移工具（如 Prisma、Drizzle 提供的迁移功能）管理每一次结构变化，保证已有数据不丢失。

### 4. 页面能打开，但列表一直是空的

先在浏览器直接访问 `http://localhost:3000/api/todos`，确认接口能返回数据；再打开开发者工具的 Console 和 Network 面板，查看请求是否报错、状态码是什么。如果直接双击打开了 `index.html`（地址栏以 `file://` 开头），相对路径 `/api/todos` 找不到服务器，必须通过 `http://localhost:3000/` 访问页面。

## 八、小结与下一步

这一篇完成了一个最小但完整的全栈应用：

- 理解了为什么需要数据库，并用 Node.js 内置的 SQLite 实现了数据持久化；
- 学会了建表和增删改查的 SQL，以及用占位符防止 SQL 注入；
- 把后端拆分成数据层和接口层，用错误处理中间件兜底异常；
- 用 Express 托管前端页面，通过 `fetch` 调用接口，并用 `textContent` 防止 XSS。

这个应用离上线还差几块拼图，也就是路线图中的后续阶段：

1. **用户系统**：注册、登录、密码加密存储，让每个人只看到自己的待办；
2. **TypeScript 与工程化**：给接口参数和数据库记录加上类型，用 ORM 管理数据表和迁移；
3. **部署上线**：把应用部署到云服务器或 Serverless 平台，把 SQLite 换成 PostgreSQL 等托管数据库。

把这三块补齐，你就能独立完成一个从页面到数据库、再到公网访问的完整产品。
