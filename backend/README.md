# Group20 Java 后端

本目录包含 11 月 14 日的电影数据接口和 11 月 20 日的第三阶段联调。使用 Java 21、Spring Boot 4.1.2、Maven Wrapper 和文件型 H2。电影列表、详情、会话、观影标记和短评沿用《第一阶段冻结说明》的 JSON v1。

## Windows 启动

在仓库根目录打开 PowerShell，运行：

```powershell
java -version
cd backend
.\mvnw.cmd spring-boot:run
```

Java 应显示 21。首次运行需要联网下载 Maven 和依赖。启动后用 Chrome 打开 <http://localhost:8080/>。在终端按 Ctrl+C 停止服务。macOS/Linux 使用 `./mvnw spring-boot:run`。

在 `backend` 目录运行 `.\mvnw.cmd clean verify` 可执行集成测试并打包。打包后的 JAR 已包含构建时的前端页面和资源，可在同一目录用 `java -jar target/group20-backend-0.1.0.jar` 启动。前端文件更新后重新构建即可刷新 JAR 中的页面。

## 数据与页面

首次启动会在空的电影表中导入 `frontend/assets/data/demo-movies.json` 的 89 条课程演示记录，保留现有链接使用的 ID。H2 文件位于启动目录的 `data/group20.mv.db`。服务可为第二阶段数据库补建账号、标记与短评表，已有电影记录会保留。样例中的名次、评分和影讯沿用课程演示数据。

首页、排行榜、详情、Top 250、搜索结果、选电影、选剧集和短评读取同源 API。影讯和购票按钮保留课程展示。演示账号 `demo1`、`demo2`、`demo3` 的密码都是 `demo123`。账号密码在 H2 中存为 BCrypt 哈希。登录后浏览器使用 Cookie 会话。重启服务后重新登录可读取之前保存的标记和短评。

若 8080 已用于第二阶段，从 `backend` 运行 `java -jar target/group20-backend-0.1.0.jar --server.port=8081`，访问 <http://127.0.0.1:8081/>。

## 查询接口

| 请求 | 行为 |
| --- | --- |
| `GET /api/movies` | 列表，返回 `{items, page, size, total}`。默认第 1 页、每页 25 条，`size` 支持 1–250。超出页数时 `items` 为空，`total` 保留条件匹配总数。 |
| `GET /api/movies/6` | 返回一条电影记录。未知 ID 返回 404。 |
| `GET /api/movies?keyword=Titanic` | 不区分大小写，匹配片名、原名、导演、地区或类型文本。 |
| `GET /api/movies?region=美国&genre=犯罪&minRating=9&maxRating=10` | 条件同时生效，地区和类型精确匹配，评分边界包含端点。 |
| `GET /api/movies?sort=rank&page=2&size=25` | 只返回有 Top 250 名次的条目，按 `rank` 升序。 |
| `GET /api/movies?chart=new` | 只返回有新片榜名次的条目，按 `newChartRank` 升序。 |

普通列表按 ID 排序，还可用 `sort=rating_desc`、`sort=year_desc` 或 `sort=year_asc`。选电影和选剧集使用 `mediaType`、`regionGroup`、`playable` 等参数。已登录可用 `unwatched=true` 排除自己的看过记录。未登录使用该参数返回 401。API 错误正文为 `{error, message}`。

Movie 包含 `id`、`title`、`originalTitle`、`year`、`region`、`genres`、`director`、`originalRating`、`rank`、`newChartRank`、`posterUrl`、`synopsis`。`genres` 为字符串数组，评分和两种名次可以是 `null`。现有页面另有 `mediaType`、`releaseStatus`、`playable` 三个演示字段，API 一并返回。

## 登录、标记和短评

| 请求 | 行为 |
| --- | --- |
| `POST /api/session` | 接收 `{username,password}`，返回 `{user:{id,displayName}}` 并创建 Cookie 会话。 |
| `GET /api/session`、`DELETE /api/session` | 查询当前用户、退出。 |
| `GET /api/movies/{id}/status`、`PUT /api/movies/{id}/status` | 当前账号的观影状态。PUT 接收 `{status}`，值为 WANT、WATCHED 或 null。 |
| `GET /api/movies/{id}/reviews` | 公开短评列表，支持 page、size 和星级分组。登录后可用 `mine=true` 查看本人短评。 |
| `GET /api/movies/{id}/review`、`PUT /api/movies/{id}/review`、`DELETE /api/movies/{id}/review` | 查询、保存、删除本人短评。PUT 接收 `{stars,content}`，每账号每电影保留一条，星级为 1–5，内容上限 500。 |
| `PUT /api/movies/{id}/reviews/{reviewId}`、`DELETE /api/movies/{id}/reviews/{reviewId}` | 按编号编辑和删除。操作别人的短评返回 403。 |

演示路线为首页 → 排行榜 → Top 250 翻页 → 搜索“给阿嬷的情书” → 详情 → 登录 → 想看／看过 → 全部短评 → 评分和发表。切换 `demo2` 可检查权限，重启服务后重新登录 `demo1` 可检查持久化。短评页支持最新和本人视图。豆瓣长影评页仅作为列表布局参考。

## 第四阶段补充

电影列表继续使用现有参数组合查询，未看过仅排除当前用户的 WATCHED。类型和最高评分现已接入选电影页面。筛选 URL 会保存地区、类型、评分上下限、排序、未看过和可播放条件。短评按电影、评论、当前账号共同限定写入目标。

数据库初始化脚本用 CREATE INDEX IF NOT EXISTS 为观影排除和短评列表补建索引，已有数据保留。回归测试覆盖组合筛选与两个账号隔离。运行预览可使用 java -jar target/group20-backend-0.1.0.jar --server.port=8082。
