# 前端目录

十类前端页面已齐备。`index.html` 是点击“豆瓣电影”返回的首页；`showing.html` 才是“影讯&购票”。顶部导航按原站截图排列，Top 250 入口位于排行榜右栏。

## 第三阶段运行

启动 Java 服务后，通过同一个端口打开页面和 API。Windows 和 macOS 的命令见 [后端运行说明](../backend/README.md)。

`assets/data/demo-movies.json` 提供课程演示数据。演示账号为 `demo1`、`demo2`、`demo3`，密码均为 `demo123`。登录由后端 Cookie 会话维护，标记、评分和短评保存在文件型 H2 中。

## 共同约定

- 公共导航和原有页面逻辑位于 `assets/js/site.js`；新增页面与本地演示交互位于 `assets/js/pages.js`。公共样式位于 `assets/css/site.css`。
- 搜索表单提交至 `search.html?keyword=关键词`；电影卡片跳转 `movie.html?id=本地电影ID`；短评入口跳转 `comments.html?movieId=本地电影ID`。
- 搜索、筛选、Top 250 翻页和短评列表使用同源 `/api`。详情和搜索、榜单的观影按钮读取并更新当前账号的状态。
- `demo-movies.json` 的新片榜、Top 250、影讯和剧集条目仅供课程演示，其中部分标题与详细资料尚未经原站核实。B 应按冻结说明准备正式样例数据，`newChartRank` 与 `rank` 分别维护。完整状态见 `../资料/页面实现与验收说明.md`。
