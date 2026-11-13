/* Group20 扩展页面与离线演示交互。真实 Java API 可用时优先使用 API。 */
(() => {
  const G = window.Group20;
  if (!G) return;
  const {getLocalMovies,requestJson,escapeHtml,movieUrl,poster,card} = G;
  const page = document.body.dataset.page;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const rating=(movie)=>movie.originalRating == null ? '<span class="muted">暂无评分</span>' : `<span class="rating">★★★★★ <strong>${Number(movie.originalRating).toFixed(1)}</strong></span>`;
  const savePage=(params)=>{ const u=new URL(location.href); for(const [k,v] of Object.entries(params)) v == null || v === '' ? u.searchParams.delete(k) : u.searchParams.set(k,String(v)); history.replaceState(null,'',u); };
  const mediaCard=(m)=>`<article class="dual-item">${poster(m)}<div class="dual-copy"><a href="${movieUrl(m)}">${escapeHtml(m.title)}</a><p>${m.year} / ${escapeHtml(m.region)} / ${escapeHtml(m.genres.join(' '))} / ${escapeHtml(m.director)}</p>${rating(m)}</div></article>`;
  const empty=(message)=>`<div class="empty-state">${escapeHtml(message)}</div>`;
  function pages(container,current,total,update) {
    if (!container) return;
    const count=Math.max(1,Math.ceil(total/25));
    container.innerHTML='';
    const button=(label,value,disabled=false,active=false)=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.className=active?'active':'';
      b.addEventListener('click',()=>update(value));container.appendChild(b);
    };
    button('‹前页',current-1,current<=1);
    for(let n=1;n<=count;n++) button(String(n),n,false,n===current);
    button('后页›',current+1,current>=count);
  }
  async function showing() {
    const films=(await getLocalMovies()).filter((m)=>m.mediaType==='movie');
    const now=films.filter((m)=>m.releaseStatus==='showing');
    const soon=films.filter((m)=>m.releaseStatus==='upcoming');
    let count=15;
    const ticket=(m,upcoming=false)=>`<article class="poster-card">${poster(m)}<a class="poster-title" href="${movieUrl(m)}">${escapeHtml(m.title)}</a><div class="poster-meta">${upcoming ? '即将上映' : m.originalRating==null?'暂无评分':`★★★★★ ${Number(m.originalRating).toFixed(1)}`}</div><button type="button" class="poster-action ticket-action" data-id="${m.id}">选座购票</button></article>`;
    const draw=()=>{$('#now-showing').innerHTML=now.slice(0,count).map((m)=>ticket(m)).join(''); $('#show-all-showing').hidden=count>=now.length;};
    draw();$('#coming-soon').innerHTML=soon.map((m)=>ticket(m,true)).join('');
    $('#show-all-showing').addEventListener('click',()=>{count=now.length;draw();});
    $('#change-city').addEventListener('click',()=>{const city=prompt('输入演示城市名称','上海');if(city?.trim()) $('.ticket-title').firstChild.textContent=`电影票 - ${city.trim()} `;});
    document.addEventListener('click',(e)=>{if(e.target.matches('.ticket-action')) alert('课程演示版不接入真实购票服务。可点击海报查看电影详情。');});
  }

  const markButtons = (id) => ['WANT','WATCHED'].map((status) =>
    '<button type="button" aria-pressed="false" data-status="' + status + '" data-id="' + id + '">' +
    (status === 'WANT' ? '想看' : '看过') + '</button>').join('');

  function bindMarks(container, onChange = () => {}) {
    const statuses = new Map();
    const markGroup = '.top-actions, .search-actions';
    container.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-status]');
      if (!button) return;
      const group = button.closest(markGroup);
      const id = button.dataset.id;
      group.querySelectorAll('button').forEach((item) => { item.disabled = true; });
      try {
        const {status} = await G.markMovie(id, button.dataset.status);
        statuses.set(id, status);
        G.updateMarkButtons(group, status);
        onChange();
      } catch (error) {
        if (error.status === 401) G.loginHere();
        else alert(error.message);
      } finally {
        group.querySelectorAll('button').forEach((item) => { item.disabled = false; });
      }
    });
    return async () => {
      if (!(await G.currentUser())) return;
      await Promise.all([...container.querySelectorAll(markGroup)].map(async (group) => {
        const id = group.querySelector('button').dataset.id;
        if (!statuses.has(id)) {
          const {status} = await requestJson('/api/movies/' + encodeURIComponent(id) + '/status');
          statuses.set(id, status);
        }
        G.updateMarkButtons(group, statuses.get(id));
      }));
    };
  }

  const positivePage = (value) => /^[1-9]\d*$/.test(value || '') && Number(value) <= 2147483647 ? Number(value) : 1;
  const listingError = (target, error) => { target.innerHTML = empty(error.message); };

  function explore(kind) {
    const isTv = kind === 'tv';
    const prefix = isTv ? 'tv' : 'explore';
    const filters = $(isTv ? '#tv-filter' : '#region-filter');
    const query = new URLSearchParams(location.search);
    let genre = query.get('genre') || '';
    let region = isTv ? '' : query.get('region') || '';
    const results = $('#' + prefix + '-results');
    const more = $('#' + prefix + '-more');
    const tabs = $('#' + prefix + '-tabs');
    const ratingFilter = $('#' + (isTv ? 'tv-rating-filter' : 'rating-filter'));
    const unwatched = $('#' + (isTv ? 'tv-unwatched' : 'unwatched-filter'));
    const playable = $('#' + (isTv ? 'tv-playable' : 'playable-filter'));
    let sort = tabs.querySelector('.active')?.dataset.sort || 'all';
    let current = 0;
    let revision = 0;
    filters.querySelectorAll('button').forEach((button) =>
      button.classList.toggle('active', isTv ? button.dataset.genre === genre : button.dataset.region === region));

    async function draw(append = false) {
      const request = ++revision;
      const next = append ? current + 1 : 1;
      const params = {mediaType:kind, page:next, size:20};
      if (region === '中国大陆' || region === '美国') params.regionGroup = region === '美国' ? 'western' : 'chinese';
      else if (region) params.region = region;
      if (genre) params.genre = genre;
      if (ratingFilter.value || sort === 'cold') params.minRating = Math.max(Number(ratingFilter.value), sort === 'cold' ? 7 : 0);
      if (sort === 'latest') params.sort = 'year_desc';
      if (sort === 'popular' || sort === 'rating_desc') params.sort = 'rating_desc';
      if (sort === 'cold') params.sort = 'year_asc';
      if (playable.checked) params.playable = true;
      if (unwatched.checked) params.unwatched = true;
      more.disabled = true;
      if (!append) results.innerHTML = empty('正在加载…');
      try {
        const data = await requestJson('/api/movies?' + new URLSearchParams(params));
        if (request !== revision) return;
        const html = data.items.map(mediaCard).join('');
        if (append) results.insertAdjacentHTML('beforeend', html);
        else results.innerHTML = html || empty('没有符合条件的条目，请调整筛选。');
        current = next;
        more.hidden = next * 20 >= data.total;
      } catch (error) {
        if (request !== revision) return;
        if (error.status === 401) { G.loginHere(); return; }
        if (append) alert(error.message);
        else listingError(results, error);
      } finally {
        if (request === revision) more.disabled = false;
      }
    }

    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-sort]');
      if (!button) return;
      sort = button.dataset.sort;
      tabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      draw();
    });
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (isTv) genre = button.dataset.genre;
      else region = button.dataset.region;
      filters.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      savePage({genre,region});
      draw();
    });
    ratingFilter.addEventListener('change', () => draw());
    playable.addEventListener('change', () => draw());
    unwatched.addEventListener('change', () => draw());
    more.addEventListener('click', () => draw(true));
    if (isTv) {
      $('#tv-groups').innerHTML=['米饭大电视','美剧 fans','日剧 fans','看日剧','BBC','电影爱看','日本电影','TVB'].map((t,i)=>`<a class="group-item" href="tv.html"><div class="group-icon">${['☕','▣','映','剧','BBC','✦','花','TV'][i]}</div>${escapeHtml(t)}</a>`).join('');
    }
    draw();
  }

  function movieResults({container, pagination, params, render, noResults, unwatched}) {
    let current = positivePage(new URLSearchParams(location.search).get('page'));
    let revision = 0;
    const restoreMarks = bindMarks(container, () => { if (unwatched?.checked) draw(); });
    async function draw() {
      const request = ++revision;
      try {
        const filters = new URLSearchParams({...params, page:current, size:25});
        if (unwatched?.checked) filters.set('unwatched', 'true');
        const data = await requestJson('/api/movies?' + filters);
        if (request !== revision) return;
        container.innerHTML = data.items.map(render).join('') || empty(noResults);
        pages(pagination,current,data.total,(next) => {
          current = next;
          savePage({page:next});
          draw();
        });
        restoreMarks().catch((error) => console.warn(error.message));
      } catch (error) {
        if (request !== revision) return;
        if (error.status === 401) { G.loginHere(); return; }
        listingError(container,error);
      }
    }
    unwatched?.addEventListener('change', () => {
      current = 1;
      savePage({page:1});
      draw();
    });
    draw();
  }

  function top250() {
    movieResults({
      container:$('#top-list'), pagination:$('#top-pagination'), params:{sort:'rank'},
      unwatched:$('#top-unwatched'), noResults:'当前页没有电影。',
      render:(m) => `<article class="top-item"><span class="top-rank">${m.rank}</span>${poster(m)}<div class="top-content"><a href="${movieUrl(m)}">${escapeHtml(m.title)}${m.originalTitle ? ` / ${escapeHtml(m.originalTitle)}` : ""}</a><p>导演: ${escapeHtml(m.director)} / ${m.year} / ${escapeHtml(m.region)} / ${escapeHtml(m.genres.join(" "))}</p>${rating(m)} <small>（本地演示评分）</small><p>${escapeHtml(m.synopsis)}</p><div class="top-actions">${markButtons(m.id)}</div></div></article>`
    });
  }

  function search() {
    const query = (new URLSearchParams(location.search).get('keyword') || '').trim();
    $('#search-title').textContent = query ? '搜索 ' + query : '搜索电影';
    $('#site-search input').value = query;
    if (!query) {
      $('#search-results').innerHTML = empty('在顶部输入关键词开始搜索。');
      return;
    }
    $('#related-searches').innerHTML = '<div class="related-item"><a href="explore.html">› 浏览更多电影</a></div>';
    movieResults({
      container:$('#search-results'), pagination:$('#search-pagination'), params:{keyword:query},
      noResults:'当前页没有相关条目，请尝试其他关键词或页码。',
      render:(m) => `<article class="search-item">${poster(m)}<div><h2><a href="${movieUrl(m)}">${escapeHtml(m.title)} (${m.year})</a></h2>${rating(m)}<p>${escapeHtml(m.region)} / ${escapeHtml(m.genres.join(" / "))} / ${escapeHtml(m.originalTitle)}</p><p>${escapeHtml(m.director)}</p><div class="search-actions">${markButtons(m.id)}</div></div></article>`
    });
  }

  async function comments() {
    const movieId = new URLSearchParams(location.search).get('movieId') || '6';
    const path = '/api/movies/' + encodeURIComponent(movieId);
    const list = $('#comments-list');
    let movie, account;
    try {
      [movie,account] = await Promise.all([requestJson(path),G.currentUser()]);
    } catch (error) {
      listingError(list,error);
      $('#write-review').disabled = true;
      return;
    }
    document.title = movie.title + ' 短评 · 豆瓣电影';
    $('#comments-title').textContent = movie.title + ' 短评';
    $('#comments-back').href = movieUrl(movie);
    $('#comments-movie-card').innerHTML = '<div class="comment-side-movie">' + poster(movie) + '<div><a href="' +
      movieUrl(movie) + '">' + escapeHtml(movie.title) + '</a><p>导演: ' + escapeHtml(movie.director) +
      '<br>类型: ' + escapeHtml(movie.genres.join(' / ')) + '<br>地区: ' + escapeHtml(movie.region) + '</p></div></div>';
    let order = 'latest', stars = 0, current = 1, revision = 0, items = [];

    async function draw() {
      const request = ++revision;
      try {
        const params = new URLSearchParams({page:current,size:25,stars,mine:order === 'mine'});
        const data = await requestJson(path + '/reviews?' + params);
        if (request !== revision) return;
        if (!data.items.length && data.total && current > 1) {
          current = Math.ceil(data.total / 25);
          draw();
          return;
        }
        items = data.items;
        $('#comments-count').textContent = '短评（' + data.total + '）';
        list.innerHTML = items.map((review) => `<article class="comment-row"><div class="avatar">${escapeHtml(review.author[0] || "影")}</div><div class="comment-body"><div class="meta"><strong>${escapeHtml(review.author)}</strong><span class="rating" aria-label="${review.stars} 星">${"★".repeat(review.stars)}</span><time datetime="${escapeHtml(review.createdAt)}">${escapeHtml(new Date(review.createdAt).toLocaleString("zh-CN"))}</time></div><p>${escapeHtml(review.content)}</p>${account?.id === review.userId ? `<div class="comment-actions"><button data-edit="${review.id}">修改</button><button data-delete="${review.id}">删除</button></div>` : ""}</div></article>`).join('') || empty('当前条件下没有短评。');
        pages($('#comments-pagination'),current,data.total,(next) => { current = next; draw(); });
      } catch (error) {
        if (request === revision) listingError(list,error);
      }
    }

    function openEditor(review) {
      const target = $('#review-form-container');
      target.innerHTML = `<form class="review-editor" id="review-editor"><strong>${review ? "修改我的短评" : "写一条短评"}</strong><label>评分 <select name="stars">${[5,4,3,2,1].map((n) => `<option value="${n}" ${review?.stars === n ? "selected" : ""}>${n} 星</option>`).join("")}</select></label><label>短评内容<textarea name="content" maxlength="500" required placeholder="说说你的观影感受">${escapeHtml(review?.content || "")}</textarea></label><div class="feedback" role="status"></div><button type="submit">${review ? "保存修改" : "发表短评"}</button><button type="button" class="cancel">取消</button></form>`;
      const form = $('#review-editor');
      form.querySelector('.cancel').addEventListener('click', () => { target.innerHTML = ''; });
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = form.querySelector('[type=submit]');
        const feedback = form.querySelector('.feedback');
        submit.disabled = true;
        try {
          await requestJson(path + (review ? '/reviews/' + review.id : '/review'), {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({stars:Number(form.elements.stars.value),content:form.elements.content.value.trim()})
          });
          target.innerHTML = '';
          current = 1;
          draw();
        } catch (error) {
          if (error.status === 401) G.loginHere();
          else feedback.textContent = error.message;
        } finally {
          submit.disabled = false;
        }
      });
      form.elements.content.focus();
    }

    $('#write-review').addEventListener('click', async () => {
      if (!account) { G.loginHere(); return; }
      try {
        openEditor(await requestJson(path + '/review'));
      } catch (error) {
        if (error.status === 404) openEditor(null);
        else if (error.status === 401) G.loginHere();
        else alert(error.message);
      }
    });
    $('#comment-sort').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-order]');
      if (!button) return;
      if (button.dataset.order === 'mine' && !account) { G.loginHere(); return; }
      order = button.dataset.order;
      current = 1;
      $$('#comment-sort button').forEach((item) => item.classList.toggle('active', item === button));
      draw();
    });
    $('#comment-stars').addEventListener('change', (event) => { stars = Number(event.target.value); current = 1; draw(); });
    list.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-edit], [data-delete]');
      if (!button) return;
      if (button.dataset.edit) {
        const review = items.find((item) => String(item.id) === button.dataset.edit);
        if (review) openEditor(review);
        return;
      }
      if (!confirm('删除自己的这条短评？')) return;
      button.disabled = true;
      try {
        await requestJson(path + '/reviews/' + encodeURIComponent(button.dataset.delete), {method:'DELETE'});
        $('#review-form-container').innerHTML = '';
        draw();
      } catch (error) {
        if (error.status === 401) G.loginHere();
        else alert(error.message);
      } finally {
        button.disabled = false;
      }
    });
    draw();
  }
  const run=()=>{if(page==='showing')showing();if(page==='explore')explore('movie');if(page==='tv')explore('tv');if(page==='top250')top250();if(page==='search')search();if(page==='comments')comments();};
  run();
})();
