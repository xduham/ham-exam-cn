# ham-exam-cn

XDUham-club 的业余无线电操作证考试练习站。

在线站点：<https://exam.xduham.club>  

纯前端、无账号、无上传、无后端。题库随站点部署，练习进度、错题本、收藏和统计都保存在浏览器本地。

## 功能

- A / B / C 三类题库，按真实规则练习与组卷
- 练习：顺序 / 随机、断点续做、进度条拖动跳题、选项乱序开关、模糊标记（随练习断点保存）
- 题号 / 关键词搜索（顺序练习）
- 模拟考试：计时、答题卡、标记、交卷、成绩、逐题回顾
- 解析与助记；错题本、收藏、学习统计
- 手机优先，浅色 / 深色切换，默认跟随系统

## 技术栈

Vite 8 + React 19 + TypeScript 6；单个 CSS 文件，无路由/状态/UI 库；纯静态 `dist/`。

## 本地开发

Node 24.18.0（见 `.nvmrc`），npm。

```bash
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

## 题库数据

`data/` 采用 WTFPL（`data/COPYING`）。来源、上游 commit 和图片说明见 `data/SOURCE.md`。

- `class_a.csv` / `class_b.csv` / `class_c.csv`：原始题库
- `ai_explanations.json`：按 `I` 代码索引的解析/助记
- `images/<J>.jpg`：题目图片
- `key-map.json`：稳定题目 key 的唯一来源

生成前端 JSON：

```bash
npm run data:build
```

脚本按 `key-map.json` 复用/分配题目 key，把选项写成数字 id（1–4），`answer_keys` 使用同一组 id，并把解析中的选项字母引用转成 `{{id}}` / `{{1,3}}` token（`A类`、`D层` 等技术字母保持原文）。产物提交到 `public/questions/`。

```json
{
  "key": "A-0001",
  "code": "MC2-0001",
  "question": "……",
  "type": "multiple",
  "options": [
    { "key": 1, "text": "……" },
    { "key": 2, "text": "……" },
    { "key": 3, "text": "……" },
    { "key": 4, "text": "……" }
  ],
  "answer_keys": [1, 3],
  "explanation": "……（{{1,3}}）……故{{4}}错……"
}
```

示例省略 `number` / `imageUrl` / `mnemonic`。`options` 是题库源顺序；前端负责显示顺序：练习默认乱序、可关闭，模拟考试始终乱序。显示标签按位置生成 A/B/C/D。解析中的 token 由前端替换为当前显示字母；没有 token 的 A–D 是内容字母，不会被替换。

> 选项 id 从字母改为数字后，旧版练习/考试断点会自动失效；错题本、收藏和统计保留。

`npm run build` 不运行数据管线；题库变化时先运行 `npm run data:build`，再提交 `public/questions/` 和 `data/key-map.json`。

## 品牌层

品牌在 `branding/`，代码不写死社团名、颜色或域名；替换 `branding.json` 和三个 SVG 后重新构建即可。字段见 `branding/README.md`。

## 部署

### EdgeOne Makers

导入 `xduham/ham-exam-cn`，使用仓库内的 `edgeone.json`：

- `npm ci` / `npm run build` / 输出 `dist` / Node `24.18.0`
- 环境变量：`VITE_SITE_URL=https://exam.xduham.club`、`VITE_BASE_PATH=/`
- 绑定域名 `exam.xduham.club`

`edgeone.json` 为题库 JSON 和图片设置 6 个月浏览器/边缘缓存；构建时对题库内容生成 hash 并拼到 URL（`?v=<hash>`），数据更新自动换新 URL。无前端路由，不需要 SPA rewrite。

### 其他静态托管

Fork 后替换 `branding/`（可选替换 `data/` 并运行 `npm run data:build`），设置 `VITE_SITE_URL` 和 `VITE_BASE_PATH`，然后：

```bash
npm ci && npm run build
```

部署 `dist/`。子路径构建示例：

```bash
MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/ham-exam-cn/ npm run build
```

## 许可

- 代码：MPL-2.0（`LICENSE`，归属见 `NOTICE`）。修改过的 MPL 文件需继续以 MPL-2.0 提供源码；页脚“源代码”链接由 `branding.sourceUrl` 控制。
- 题库数据：WTFPL（`data/COPYING`）。
- 品牌素材：版权归社团所有，不随 MPL-2.0 授权；自部署前请替换。

## 声明

本项目是社团自测工具，不是 CRAC 官方应用。题库来自公开的 CRAC 题库转换项目，解析与助记由 AI 生成，仅供参考；考试规则和分数仅用于练习，不代表真实考试结果。
