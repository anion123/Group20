# Group20 Java 后端

本目录交付 11 月 14 日的第二阶段 B 任务。Java 21、Spring Boot 4.1.2、Maven Wrapper 和文件型 H2。电影列表和详情遵循《第一阶段冻结说明》的 JSON v1。

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

首次启动会在空的电影表中导入 `frontend/assets/data/demo-movies.json` 的 89 条课程演示记录，保留现有链接使用的 ID。H2 文件位于启动目录的 `data/group20.mv.db`。已有电影记录时，重启直接读取数据库。样例中的名次、评分和影讯沿用课程演示数据。

首页、排行榜和详情页可通过原有脚本读取 API。Top 250、搜索结果和选电影页面目前读取电影列表后在浏览器中分页或筛选，API 也支持直接在服务端搜索和分页。影讯、剧集及登录和短评演示继续使用前端既有逻辑。真实登录、标记、评分、短评和个人观影筛选安排在后续阶段。

## 查询接口

| 请求 | 行为 |
| --- | --- |
| `GET /api/movies` | 列表，返回 `{items, page, size, total}`。默认第 1 页、每页 25 条，`size` 支持 1–250。超出页数时 `items` 为空，`total` 保留条件匹配总数。 |
| `GET /api/movies/6` | 返回一条电影记录。未知 ID 返回 404。 |
| `GET /api/movies?keyword=Titanic` | 不区分大小写，匹配片名、原名、导演、地区或类型文本。 |
| `GET /api/movies?region=美国&genre=犯罪&minRating=9&maxRating=10` | 条件同时生效，地区和类型精确匹配，评分边界包含端点。 |
| `GET /api/movies?sort=rank&page=2&size=25` | 只返回有 Top 250 名次的条目，按 `rank` 升序。 |
| `GET /api/movies?chart=new` | 只返回有新片榜名次的条目，按 `newChartRank` 升序。 |

普通列表按 ID 排序，还可用 `sort=rating_desc` 或 `sort=year_desc`。同分或同年按 ID 排序。参数错误返回 400。请求 `unwatched=true` 返回 401。电影接口的错误正文为 `{error, message}`。

Movie 包含 `id`、`title`、`originalTitle`、`year`、`region`、`genres`、`director`、`originalRating`、`rank`、`newChartRank`、`posterUrl`、`synopsis`。`genres` 为字符串数组，评分和两种名次可以是 `null`。现有页面另有 `mediaType`、`releaseStatus`、`playable` 三个演示字段，API 一并返回。
