# 题库数据来源

- 上游仓库：<https://github.com/AlliotTech/crac-amateur-radio-exam-questions-2025-csv>
- 固定 commit：`f05c9c4963f307265905a23f32b6af5c8df0ecb4`
- 许可：WTFPL，见 `COPYING`
- 内容：2025 年 10 月生效的《新版业余无线电台操作技术能力验证题库（2025 年版）》，包含 A / B / C 三类题、图片、AI 解析与助记。

## 文件说明

- `class_a.csv` / `class_b.csv` / `class_c.csv`：题库原始 CSV。
- `ai_explanations.json`：按题目 `I` 代码索引的解析与助记。
- `images.csv`：上游的题号到图片路径映射。
- `images/`：按题号 `J` 命名的图片，取自上游 `images_2/<J>.jpg`。

> 上游 `images/` 目录中的 `0.jpg` 等文件是 LFS 指针，不是图片；真实图片在 `images_2/<J>.jpg`，因此本项目按 `J` 直接复制 `images_2` 中的文件。

## 重新生成

题库变动时：

```bash
npm run data:build
```

脚本会复用 `data/key-map.json` 中的稳定 key，并为新题分配下一个序号。提交 `key-map.json` 和 `public/questions/` 的产物即可。

`key-map.json` 由脚本维护，不要手动删除或重置；否则已保存的练习进度、错题本和收藏会对不上题目。上游 commit 记录在 `UPSTREAM_COMMIT`。
