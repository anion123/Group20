# 前端目录

十类前端页面已齐备。`index.html` 是点击“豆瓣电影”返回的首页；`showing.html` 才是“影讯&购票”。顶部导航按原站截图排列，Top 250 入口位于排行榜右栏。

## 本地预览

在仓库根目录执行 `python3 -m http.server 8765 --directory frontend`，然后用 Chrome 打开 `http://localhost:8765/`。在 Windows PowerShell 中如无 `python3`，可试 `py -m http.server 8765 --directory frontend`。不要直接双击 HTML，因为浏览器可能阻止读取本地 JSON。

该预览服务展示本地页面和浏览器内的演示交互。`assets/data/demo-movies.json` 是样例数据；演示账号为 `demo1`、`demo2`、`demo3`，密码均为 `demo123`，仅供本地使用。登录、标记和短评暂存于当前浏览器，不等于 Java 服务已经完成。

## 共同约定

- 公共导航和原有页面逻辑位于 `assets/js/site.js`；新增页面与本地演示交互位于 `assets/js/pages.js`。公共样式位于 `assets/css/site.css`。
- 搜索表单提交至 `search.html?keyword=关键词`；电影卡片跳转 `movie.html?id=本地电影ID`；短评入口跳转 `comments.html?movieId=本地电影ID`。
- 前端会优先尝试冻结说明中的 `/api` 接口；当前接口不存在时使用本地演示数据。B 接入后，仍须针对 API 逐项复测与验收。
- `demo-movies.json` 的新片榜、Top 250、影讯和剧集条目仅供课程演示，其中部分标题与详细资料尚未经原站核实。B 应按冻结说明准备正式样例数据，`newChartRank` 与 `rank` 分别维护。完整状态见 `../资料/页面实现与验收说明.md`。
