# ham-exam-cn · 半部电台考试

西安电子科技大学「半部电台」业余无线电社的业余无线电操作证考试练习站。

纯前端、无账号、无上传、无后端。题库随站点一起部署，练习进度、错题本、收藏和统计都保存在浏览器本地。

## 功能

- A / B / C 三类题库，按真实规则抽题
- 顺序练习、随机练习、断点续做
- 题号 / 关键词搜索（顺序练习）
- 模拟考试：计时、答题卡、标记、交卷、成绩、逐题回顾
- 答案解析与助记（来自公开数据集）
- 错题本：练习/考试答错自动收录，错题练习答对后移出
- 收藏：星标题目，随时组成收藏练习
- 学习统计：练习正确率、模考次数、最佳成绩、通过次数
- 手机优先，深色 / 浅色跟随系统

## 技术栈

- Vite 8 + React 19 + TypeScript 6
- 一个 CSS 文件，无路由库、状态库、UI 库
- 纯静态，构建产物在 `dist/`

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

`data/` 是题库源数据，采用 **WTFPL**（见 `data/COPYING`）。来源、上游 commit 和图片说明见 `data/SOURCE.md`。

- `data/class_a.csv`、`class_b.csv`、`class_c.csv`：A / B / C 题库
- `data/ai_explanations.json`：按题目 `I` 代码索引的解析与助记
- `data/images/<J>.jpg`：按题号命名的题目图片
- `data/key-map.json`：题目稳定 key 的唯一事实来源

生成前端使用的 JSON：

```bash
npm run data:build
```

脚本会：

1. 解析 CSV，合并 AI 解析与助记。
2. 按 `key-map.json` 复用已有 key，给新题分配 `A-0001` 这样的下一个序号。
3. 复制图片，输出 `public/questions/{A,B,C}.json`。

生成后的 `public/questions/` 需要提交。app 构建只跑 `vite build`，不依赖 `data:build`；题库 3–5 年才动一次，手动跑即可。

> 上游 `images/` 目录里的 `0.jpg` 等文件是 LFS 指针，不是图片；真实图片在 `images_2/<J>.jpg`，本项目按 `J` 直接下载 `images_2` 中的文件。

## 品牌层

品牌全部放在 `branding/`，应用代码不写死社团名称、颜色或域名：

- `branding/branding.json`：站点名、描述、Logo、主题色、页脚、源码地址
- `branding/logo.svg`、`favicon.svg`、`og-image.svg`
- 构建时 Vite 插件会把图片复制到 `public/branding/`，并把 `index.html` 中的占位符替换掉

字段和替换方法见 `branding/README.md`。

## 部署到 EdgeOne Makers

仓库根目录的 `edgeone.json`：

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": "dist",
  "nodeVersion": "24.18.0"
}
```

在 EdgeOne Makers 中导入仓库，设置：

- 框架预设：Vite（或自定义）
- 安装命令：`npm ci`
- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：`24.18.0`
- 环境变量：
  - `VITE_SITE_URL=https://exam.xduham.club`
  - `VITE_BASE_PATH=/`

题库和图片与站点同源，部署后自动走 EdgeOne 边缘缓存；每次部署会失效旧缓存。没有前端路由，不需要 SPA rewrite。

## 自部署到其他静态托管

1. Fork 本仓库。
2. 替换 `branding/` 为你的组织品牌。
3. 可选：替换 `data/` 为你的题库，然后运行 `npm run data:build`。
4. 设置 `VITE_SITE_URL` 和 `VITE_BASE_PATH`（子路径部署时例如 `/ham-exam-cn/`）。
5. `npm ci && npm run build`，把 `dist/` 部署到任意静态托管。

所有资源路径都经过 `import.meta.env.BASE_URL`，因此 GitHub Pages 子路径也能工作。

Windows Git Bash 会把 `/ham-exam-cn/` 当成文件路径转换，构建子路径时请加 `MSYS_NO_PATHCONV=1`：

```bash
MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/ham-exam-cn/ npm run build
```

## 许可

- **代码**：MPL-2.0，见 `LICENSE`。
- **题库数据**：WTFPL，见 `data/COPYING`。
- **品牌素材**：版权归社团所有，不随 MPL-2.0 授权；自部署前请替换。

MPL-2.0 是文件级 copyleft：修改过的 MPL 文件需要继续以 MPL-2.0 提供源码，新增文件可以按其他许可发布。页脚的“源代码”链接由 `branding.sourceUrl` 控制；如果你部署修改版，请把它改成你的源码地址，并按 MPL-2.0 向用户提供对应源码。

## 声明

本项目是社团自测工具，不是 CRAC 官方应用。题库来自公开的 CRAC 题库转换项目，解析与助记由 AI 生成，仅供参考；考试规则和分数仅用于练习，不代表真实考试结果。
