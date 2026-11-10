/* Group20 共用前端：B 的 /api 接口可用时优先读取接口，未启动时使用明确标注的本地展示数据。 */
(() => {
  const page = document.body.dataset.page;
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const movieUrl = (movie) => `movie.html?id=${encodeURIComponent(movie.id)}`;
  const palette = ['#1e526d,#172431','#a0453d,#251928','#52643b,#202c2f','#a3733c,#3c2934','#2c6781,#162c46','#886857,#233944','#724a6e,#24283c'];
  const artStyle = (movie) => `background:linear-gradient(155deg,${palette[Number(movie.id) % palette.length]})`;
  const poster = (movie, className = '') => `<a class="poster-art ${className}" style="${artStyle(movie)}" href="${movieUrl(movie)}" aria-label="查看${escapeHtml(movie.title)}的电影详情"><span>${escapeHtml(movie.title)}</span></a>`;
  const rating = (movie) => movie.originalRating == null ? '<span class="muted">暂无评分</span>' : `<span class="rating">★★★★★ <strong>${escapeHtml(movie.originalRating.toFixed(1))}</strong></span>`;
  const note = '<div class="demo-note">当前显示本地演示电影资料；登录、标记和短评可在此浏览器演示，Java 后端由 B 后续接入。</div>';

  function header() {
    if (page === 'login') return;
    const active = (name) => page === name ? ' class="active" aria-current="page"' : '';
    $('#site-header').innerHTML = `<div class="global-bar"><div class="global-inner"><div class="global-links"><a href="index.html">豆瓣</a><a href="index.html">读书</a><a href="index.html">电影</a><a href="index.html">音乐</a><a href="index.html">播客</a><a href="index.html">同城</a><a href="index.html">小组</a><a href="index.html">阅读</a><a href="index.html">FM</a><a href="index.html">时间</a><a href="index.html">豆品</a></div><div class="account-area"><a href="login.html">下载豆瓣客户端</a><span id="session-area"><a href="login.html">登录/注册</a></span></div></div></div><div class="site-top"><div class="site-top-inner"><a href="index.html" class="brand">豆瓣电影</a><form id="site-search" class="site-search" action="search.html" method="get"><input name="keyword" type="search" placeholder="搜索电影、电视剧、综艺、影人" aria-label="搜索电影" required><button type="submit" aria-label="搜索">⌕</button></form><div class="year-banner"><strong>2025</strong> 豆瓣<br>年度电影榜单</div></div></div><nav class="site-nav" aria-label="电影导航"><div class="site-nav-inner"><a href="index.html">我看</a><a href="showing.html"${active('showing')}>影讯&购票</a><a href="explore.html"${active('explore')}>选电影</a><a href="tv.html"${active('tv')}>选剧集</a><a href="chart.html"${active('chart')}>排行榜</a><a href="comments.html?movieId=6">影评</a><a href="chart.html">2025年度榜单</a><a href="chart.html">2025年度报告</a></div></nav>`;
    $('#site-footer').innerHTML = '<span>© 2026 Group20 · 豆瓣电影课程项目本地演示</span><span>原站参考：movie.douban.com</span>';
    loadSession();
  }
  async function requestJson(url, options) {
    const response = await fetch(url, {...options, credentials: 'same-origin'});
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(data?.message || `请求失败 (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function loadSession() {
    const area = $('#session-area');
    if (!area) return;
    let current = null, local = false;
    try { current = (await requestJson('/api/session'))?.user || null; }
    catch (error) {
      if (error.status !== 401) {
        try { current = JSON.parse(localStorage.getItem('group20-demo-session-v1')); local = !!current; } catch (_) {}
      }
    }
    if (!current) return;
    area.innerHTML = `<span>${escapeHtml(current.displayName)}</span> <button id="logout-button" type="button">退出</button>`;
    $('#logout-button').addEventListener('click', async () => {
      if (local) { localStorage.removeItem('group20-demo-session-v1'); location.reload(); return; }
      try { await fetch('/api/session', {method:'DELETE', credentials:'same-origin'}); location.reload(); }
      catch (_) { alert('退出失败，请重试。'); }
    });
  }
  let localMovies = null;
  async function getLocalMovies() {
    if (!localMovies) localMovies = await requestJson('assets/data/demo-movies.json');
    return localMovies;
  }
  async function getMovies(params = {}) {
    const search = new URLSearchParams(params);
    try {
      const data = await requestJson(`/api/movies?${search}`);
      return {movies: Array.isArray(data) ? data : (data.items || []), demo:false};
    } catch (error) {
      if (error.status && error.status !== 404) throw error;
      const movies = await getLocalMovies();
      let items = [...movies];
      if (params.chart === 'new') items = items.filter((movie) => movie.newChartRank != null).sort((a,b) => a.newChartRank - b.newChartRank);
      if (params.sort === 'rank') items = items.filter((movie) => movie.rank != null).sort((a,b) => a.rank - b.rank);
      return {movies:items,demo:true};
    }
  }
  async function getMovie(id) {
    try { return {movie:await requestJson(`/api/movies/${encodeURIComponent(id)}`),demo:false}; }
    catch (error) {
      if (error.status && error.status !== 404) throw error;
      // B 的接口存在但电影编号无效时，应展示真实 404，而不是静态样例。
      if (error.status === 404) {
        try { await requestJson('/api/movies?page=1&size=1'); throw error; }
        catch (probe) { if (probe === error) throw error; if (probe.status && probe.status !== 404) throw probe; }
      }
      const movie = (await getLocalMovies()).find((item) => String(item.id) === String(id));
      if (!movie) throw new Error('没有找到这部电影。');
      return {movie,demo:true};
    }
  }
  function card(movie, showing = false) {
    return `<article class="poster-card">${poster(movie)}<a class="poster-title" href="${movieUrl(movie)}">${escapeHtml(movie.title)}</a><div class="poster-meta">${movie.originalRating == null ? '暂无评分' : `★ ${escapeHtml(movie.originalRating.toFixed(1))}`}</div>${showing ? `<a class="poster-action" href="${movieUrl(movie)}">查看详情</a>` : ''}</article>`;
  }
  function rankList(items) { return items.map((movie) => `<li><a href="${movieUrl(movie)}">${escapeHtml(movie.title)}</a></li>`).join(''); }

  async function renderHome() {
    const {movies,demo} = await getMovies({page:1,size:25});
    const all = movies.length ? movies : await getLocalMovies();
    const local = await getLocalMovies();
    const showing = local.filter((movie) => movie.releaseStatus === 'showing' && movie.mediaType === 'movie').slice(0,10);
    const popular = [...all].filter((movie) => movie.year >= 2025 && movie.mediaType !== 'tv' && movie.releaseStatus !== 'upcoming').sort((a,b) => (b.originalRating || 0)-(a.originalRating || 0));
    if (demo) $('.main-column').insertAdjacentHTML('afterbegin', note);
    let showingIndex = 0;
    const drawShowing = () => {
      $('#showing-grid').innerHTML = showing.slice(showingIndex*5, showingIndex*5+5).map((movie) => card(movie,true)).join('') || '<p>暂时没有正在热映的演示电影。</p>';
      $('#showing-page').textContent = `${showingIndex+1} / ${Math.max(1,Math.ceil(showing.length/5))}`;
    };
    drawShowing();
    document.querySelectorAll('[data-rotate="showing"]').forEach((button) => button.addEventListener('click', () => { showingIndex = (showingIndex + Number(button.dataset.dir) + Math.max(1,Math.ceil(showing.length/5))) % Math.max(1,Math.ceil(showing.length/5)); drawShowing(); }));
    const drawPopular = (filter) => {
      const filtered = filter === 'all' ? popular : popular.filter((movie) => filter === '2026' ? movie.year >= 2026 : movie.region === filter);
      $('#popular-grid').innerHTML = filtered.slice(0,10).map((movie) => card(movie)).join('') || '<p>此分类暂无电影。</p>';
    };
    drawPopular('all');
    $('#home-tv-grid').innerHTML = local.filter((movie) => movie.mediaType === 'tv').slice(0,10).map((movie) => card(movie)).join('');
    document.querySelectorAll('[data-home-filter]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-home-filter]').forEach((tab) => tab.classList.remove('active')); button.classList.add('active'); drawPopular(button.dataset.homeFilter); }));
    $('#weekly-list').innerHTML = rankList(popular.slice(0,10));
  }
  async function renderChart() {
    const [{movies,demo},{movies:top}] = await Promise.all([getMovies({chart:'new',page:1,size:10}),getMovies({sort:'rank',page:1,size:8})]);
    if (demo) $('.main-column').insertAdjacentHTML('afterbegin', note);
    $('#chart-list').innerHTML = movies.length ? movies.map((movie) => `<article class="chart-item">${poster(movie)}<div class="chart-info"><a href="${movieUrl(movie)}">${escapeHtml(movie.title)}${movie.originalTitle ? ` / ${escapeHtml(movie.originalTitle)}` : ''}</a><p>${escapeHtml(movie.year)} / ${escapeHtml(movie.region)} / ${escapeHtml(movie.genres.join(' · '))} / ${escapeHtml(movie.director)}<br>${escapeHtml(movie.synopsis)}</p>${rating(movie)}</div></article>`).join('') : '<p>新片榜暂无数据，请等待 B 导入电影数据。</p>';
    $('#chart-weekly').innerHTML = rankList(movies.slice(0,10));
    $('#box-office').innerHTML = rankList(movies.slice().reverse().slice(0,10));
    $('#top-mini').innerHTML = top.slice(0,8).map((movie) => card(movie)).join('');
  }
  async function renderMovie() {
    const id = new URLSearchParams(location.search).get('id') || '6';
    try {
      const {movie,demo} = await getMovie(id);
      document.title = `${movie.title} · 豆瓣电影 Group20 本地演示`;
      const facts = [['导演',movie.director],['类型',movie.genres.join(' / ')],['制片国家/地区',movie.region],['上映年份',movie.year],['原名',movie.originalTitle || '—']];
      $('#movie-content').innerHTML = `${demo ? note : ''}<h1 class="movie-title">${escapeHtml(movie.title)} <span>(${escapeHtml(movie.year)})</span></h1><div class="movie-summary">${poster(movie)}<div class="movie-facts">${facts.map(([key,value]) => `<div><b>${key}: </b>${escapeHtml(value)}</div>`).join('')}</div><div class="movie-score">豆瓣评分<div class="score-number">${movie.originalRating == null ? '—' : escapeHtml(movie.originalRating.toFixed(1))}</div><div class="score-stars">★★★★★</div><small>原站评分快照，仅供页面展示</small></div></div><div class="movie-actions"><button id="want-button" type="button">想看</button><button id="watched-button" type="button">看过</button><span class="action-status" id="movie-status" role="status">尚未标记</span></div><section class="movie-section"><h2>${escapeHtml(movie.title)}的剧情简介 · · · · · ·</h2><p>${escapeHtml(movie.synopsis)}</p></section><section class="movie-section"><h2>演职员 · · · · · ·</h2><div class="cast-list"><div class="cast-person">${escapeHtml(movie.director)}</div><div class="cast-person">演员资料</div><div class="cast-person">演员资料</div></div></section><section class="movie-section"><h2>${escapeHtml(movie.title)}的预告片和图片 · · · · · ·</h2><div class="media-tiles"><a class="media-tile" href="comments.html?movieId=${encodeURIComponent(movie.id)}"><span>▶</span><small>预告片展示位</small></a><a class="media-tile alt" href="comments.html?movieId=${encodeURIComponent(movie.id)}"><span>▣</span><small>剧照展示位</small></a><a class="media-tile blue" href="comments.html?movieId=${encodeURIComponent(movie.id)}"><span>▣</span><small>海报展示位</small></a></div></section><section class="movie-section"><h2>喜欢这部电影的人也喜欢 · · · · · ·</h2><div id="movie-recommendations" class="poster-grid"></div></section><section class="movie-section"><h2>${escapeHtml(movie.title)}的短评 · · · · · · <a href="comments.html?movieId=${encodeURIComponent(movie.id)}">全部短评 ›</a></h2><div id="review-preview" class="review-line"><a href="comments.html?movieId=${encodeURIComponent(movie.id)}">查看全部短评，或登录发表自己的短评 ›</a></div></section>`;
      const related = (await getLocalMovies()).filter((item) => item.id !== movie.id && item.mediaType === movie.mediaType);
      $('#related-movies').innerHTML = related.slice(0,8).map((item) => card(item)).join('');
      $('#movie-recommendations').innerHTML = related.slice(0,5).map((item) => card(item)).join('');
      const statusLabel = $('#movie-status');
      try {
        const data = await requestJson(`/api/movies/${encodeURIComponent(movie.id)}/status`);
        statusLabel.textContent = data.status === 'WANT' ? '已标记：想看' : data.status === 'WATCHED' ? '已标记：看过' : '尚未标记';
      } catch (error) {
        if (!error.status || error.status === 404) {
          const current = await window.Group20Auth?.user();
          const local = current ? window.Group20Auth.localStatus(movie.id,current.id) : null;
          statusLabel.textContent = local === 'WANT' ? '已标记：想看' : local === 'WATCHED' ? '已标记：看过' : '尚未标记';
        } else if (error.status === 401) statusLabel.textContent = '请登录后标记';
      }
      for (const [buttonId,value] of [['want-button','WANT'],['watched-button','WATCHED']]) {
        $(`#${buttonId}`).addEventListener('click', async () => {
          const current = await window.Group20Auth?.user();
          if (!current) { location.href = `login.html?next=${encodeURIComponent(`movie.html?id=${movie.id}`)}`; return; }
          const active = statusLabel.textContent === (value === 'WANT' ? '已标记：想看' : '已标记：看过');
          const nextStatus = active ? null : value;
          try {
            const data = await requestJson(`/api/movies/${encodeURIComponent(movie.id)}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:nextStatus})});
            statusLabel.textContent = data.status === 'WANT' ? '已标记：想看' : data.status === 'WATCHED' ? '已标记：看过' : '尚未标记';
            statusLabel.className = 'action-status status-good';
          } catch (error) {
            if (!error.status || error.status === 404) {
              window.Group20Auth.setLocalStatus(movie.id,current.id,nextStatus);
              statusLabel.textContent = nextStatus === 'WANT' ? '已标记：想看' : nextStatus === 'WATCHED' ? '已标记：看过' : '尚未标记';
              statusLabel.className = 'action-status status-good';
            } else {
              statusLabel.textContent = error.status === 401 ? '请先登录' : error.message;
              statusLabel.className = 'action-status status-error';
            }
          }
        });
      }
      try {
        const result = await requestJson(`/api/movies/${encodeURIComponent(movie.id)}/reviews?page=1&size=3`);
        const reviews = result.items || [];
        if (reviews.length) $('#review-preview').innerHTML = reviews.map((review) => `<div class="review-line"><a href="comments.html?movieId=${encodeURIComponent(movie.id)}">${escapeHtml(review.author)}</a> <span class="rating">${'★'.repeat(Math.max(1,Math.min(5,review.stars)))}</span><p>${escapeHtml(review.content)}</p></div>`).join('');
      } catch (_) {}
    } catch (error) {
      $('#movie-content').innerHTML = `<div class="error-box"><h1>没有找到这部电影</h1><p>${escapeHtml(error.message)}</p><a href="index.html">返回首页</a></div>`;
    }
  }
  function renderLogin() {
    let mode = 'password';
    const tabs = document.querySelectorAll('[data-login-tab]');
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      mode = tab.dataset.loginTab;
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      $('#username-label').textContent = mode === 'sms' ? '手机号' : '用户名';
      $('#password-label').textContent = mode === 'sms' ? '验证码' : '密码';
      $('#username').placeholder = mode === 'sms' ? '手机号（暂不支持短信发送）' : '演示账号用户名';
      $('#password').placeholder = mode === 'sms' ? '验证码' : '密码';
      $('#password').type = mode === 'sms' ? 'text' : 'password';
      $('#login-hint').textContent = mode === 'sms' ? '课程演示不接入真实短信服务；请切换到密码登录。' : '本地演示账号 demo1 / demo123；正式账号由 Java 后端提供。';
      $('#login-feedback').textContent = '';
    }));
    $('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const feedback = $('#login-feedback');
      if (mode === 'sms') { feedback.textContent = '短信登录未接入，请切换密码登录。'; return; }
      const username = $('#username').value.trim();
      const password = $('#password').value;
      if (!username || !password) { feedback.textContent = '请输入用户名和密码。'; return; }
      const submit = $('.login-submit');
      submit.disabled = true;
      feedback.textContent = '正在登录…';
      try {
        let data;
        try { data = await requestJson('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}); }
        catch (error) { if (error.status && error.status !== 404) throw error; data = {user:await window.Group20Auth.login(username,password)}; }
        if (!data?.user) throw new Error('登录返回数据不完整。');
        const next = new URLSearchParams(location.search).get('next');
        location.href = next && /^(index|showing|tv|chart|movie|top250|explore|search|comments)\.html(?:\?|$)/.test(next) ? next : 'index.html';
      } catch (error) { feedback.textContent = error.status === 401 ? '用户名或密码不正确。' : '登录暂时不可用，请稍后重试。'; }
      finally { submit.disabled = false; }
    });
  }
  async function main() {
    header();
    try {
      if (page === 'home') await renderHome();
      if (page === 'chart') await renderChart();
      if (page === 'movie') await renderMovie();
      if (page === 'login') renderLogin();
    } catch (error) {
      const target = $('.main-column');
      if (target) target.insertAdjacentHTML('afterbegin', `<div class="error-box">页面数据加载失败：${escapeHtml(error.message)}。请通过本地服务打开页面。</div>`);
    }
  }
  window.Group20 = {getMovies,getMovie,getLocalMovies,requestJson,escapeHtml,movieUrl,poster,card,rankList,note};
  main();
})();
