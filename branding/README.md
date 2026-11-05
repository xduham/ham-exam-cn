# 品牌素材

这个目录是站点的品牌层。应用代码不写死社团名称、域名或颜色；自部署时替换本目录即可。

## 字段

`branding.json`：

| 字段 | 说明 |
| --- | --- |
| `siteName` | 完整站点名，用于标题、页头、页脚 |
| `shortName` | 手机端短名称 |
| `description` | 站点描述，用于 HTML meta / Open Graph |
| `locale` | `<html lang>`，默认 `zh-CN` |
| `logo` | 页头 Logo 路径，相对 `branding/` |
| `favicon` | favicon 路径 |
| `ogImage` | 社交分享图路径；建议用 1200×630 的 PNG |
| `themeColor` / `themeColorDark` | 浏览器地址栏主题色（浅色 / 深色） |
| `primaryColor` / `primaryColorDark` | 主色，注入为 `--brand-primary`（浅色 / 深色） |
| `primaryForeground` / `primaryForegroundDark` | 主色上的文字颜色（浅色 / 深色） |
| `sourceUrl` | 源码仓库地址，页脚显示“源代码” |
| `footer.copyright` | 页脚版权 |
| `footer.links` | 页脚链接数组 `{ label, href }` |
| `footer.notice` | 页脚提示 / 数据来源声明 |

## 替换

1. 修改 `branding.json`。
2. 替换 `logo.svg`、`favicon.svg`、`og-image.svg`（建议把 og-image 换成 PNG）。
3. 重新构建。

资源文件在构建时由 Vite 插件复制到 `public/branding/`，不需要手动复制。

## 许可

品牌素材（社团名称、Logo、视觉标识）版权归社团所有，**不随代码的 MPL-2.0 许可授权**。其他组织或个人自部署前请替换为本组织的品牌素材。
