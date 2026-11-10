# 第二阶段 A 页面交接说明

更新：2026 年 11 月 9 日。A（组长，Mac）负责的页面雏形已写入 `frontend`。本文件说明已完成、未完成和下一步接入方式。

## 已完成

| 页面 | 文件 | 当前可查看的内容 |
|---|---|---|
| 首页 | `frontend/index.html` | 公共导航、搜索入口、正在热映卡片与翻页、热门电影分类切换、右侧榜单、排行榜入口。 |
| 排行榜 | `frontend/chart.html` | 新片榜主列表、分类入口、右侧榜单、Top 250 的“全部”入口。 |
| 电影详情 | `frontend/movie.html?id=6` | 标题、海报占位设计、基本资料、评分、简介、演职员占位、短评入口；不同 `id` 可切换电影。 |
| 演示登录 | `frontend/login.html` | 参照密码登录截图制作左右布局、密码登录表单、短信标签状态和错误提示。短信发送不在项目范围。 |

公共样式位于 `frontend/assets/css/site.css`，共用逻辑位于 `frontend/assets/js/site.js`。海报目前用原创 CSS 色块和电影名作占位，没有直接复制原站截图当作页面。`frontend/assets/data/demo-movies.json` 含原冻结包六条电影及十条仅供排行榜布局展示的样例条目；页面读取后会标明“本地展示数据”。这十条的简介、导演等不是核实过的电影资料。

## 预览方法

在 `group20` 目录打开终端，Mac 运行 `python3 -m http.server 8765 --directory frontend`，Windows PowerShell 可运行 `py -m http.server 8765 --directory frontend`。Chrome 打开 `http://localhost:8765/`。依次检查首页、排行榜、电影详情和登录。停止服务按 `Ctrl+C`。不能直接双击 HTML 打开，浏览器可能无法读取 JSON。

## 接口接入与验收边界

A 页面会先请求同源 `/api`，请求不可用时才显示本地展示数据。真实登录会向 `POST /api/session` 发送用户名和密码；后端未建好时会显示接口未接入，不会保存真实账号。详情页的“想看”和“看过”向 `PUT /api/movies/{id}/status` 发送请求；后端未建好时只提示，不会伪造保存结果。短评列表可读取 `GET /api/movies/{id}/reviews`。B 实现接口后再验证登录、退出、标记及刷新后保留，届时才算 P0 完成。

当前导航中的 `top250.html`、`explore.html`、`search.html`、`comments.html` 是 C 的文件，C 尚未交付前会出现未找到页面。C 按冻结说明实现时需保留查询参数格式。B 的正式样例至少应覆盖 `newChartRank` 和 `rank` 两种榜单，不要把排行榜新片榜直接等同 Top 250。

## 环境说明

本机已检测到 JDK 21 位于 `/opt/homebrew/opt/openjdk@21/bin/java`，Maven 3.10 位于 `/opt/homebrew/bin/mvn`。当前终端的 `java` 仍指向 JDK 26，且直接输入 `mvn` 仍可能提示找不到。B 开始后端构建前，可在当前终端运行 `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` 与 `export PATH="/opt/homebrew/bin:$JAVA_HOME/bin:$PATH"`，随后检查 `java -version` 和 `mvn -version`。这只是本机终端的路径设置，不代表两台 Windows 已配置。

## 与原站截图的差异

当前阶段重现主要页面区块、两栏排版与导航路径；海报、广告、详细演职员、长篇影评和动态数据尚未达到原站视觉精度。排行榜记录使用本地展示数据。登录页左侧手机是 CSS 示意图，不是原站应用素材。下一阶段合并 B/C 工作后，再针对实际 Chrome 截图做精细对照和交互验收。
