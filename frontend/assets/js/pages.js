/* Group20 扩展页面与离线演示交互。真实 Java API 可用时优先使用 API。 */
(() => {
  const G = window.Group20;
  if (!G) return;
  const {getLocalMovies,requestJson,escapeHtml,movieUrl,poster,card} = G;
  const page = document.body.dataset.page;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const sessionKey = 'group20-demo-session-v1';
  const statusKey = 'group20-demo-status-v1';
  const reviewKey = 'group20-demo-reviews-v1';
  const votesKey = 'group20-demo-votes-v1';
  const accounts = [
    {username:'demo1',password:'demo123',user:{id:1,displayName:'演示用户1'}},
    {username:'demo2',password:'demo123',user:{id:2,displayName:'演示用户2'}},
    {username:'demo3',password:'demo123',user:{id:3,displayName:'演示用户3'}}
  ];
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => localStorage.setItem(key,JSON.stringify(value));
  const demoUser = () => read(sessionKey,null);
  async function user() {
    try { const data=await requestJson('/api/session'); return data?.user || null; }
    catch (error) { return error.status === 401 ? null : demoUser(); }
  }
  async function login(username,password) {
    const entry=accounts.find((a)=>a.username===username&&a.password===password);
    if (!entry) { const error=new Error('用户名或密码不正确。'); error.status=401; throw error; }
    write(sessionKey,entry.user); return entry.user;
  }
  function logout() { localStorage.removeItem(sessionKey); }
  function localStatus(movieId,uid) { return read(statusKey,{})[`${uid}:${movieId}`] || null; }
  function setLocalStatus(movieId,uid,status) {
    const all=read(statusKey,{}); const key=`${uid}:${movieId}`;
    if (status) all[key]=status; else delete all[key];
    write(statusKey,all); return status;
  }
  window.Group20Auth={user,login,logout,demoUser,localStatus,setLocalStatus};
  const allMovies=async()=>{
    const local=await getLocalMovies();
    if(page==='showing'||page==='tv') return local;
    const result=await G.getMovies({page:1,size:250});
    if(result.demo) return local;
    const extras=new Map(local.map((m)=>[String(m.id),m]));
    return result.movies.map((m)=>({...extras.get(String(m.id)),...m,mediaType:m.mediaType||'movie',releaseStatus:m.releaseStatus||extras.get(String(m.id))?.releaseStatus||'archive',playable:m.playable??true}));
  };
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
    const films=(await allMovies()).filter((m)=>m.mediaType==='movie');
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
  async function explore(kind) {
    const isTv=kind==='tv'; const prefix=isTv?'tv':'explore';
    const all=(await allMovies()).filter((m)=>m.mediaType===(isTv?'tv':'movie') && (isTv || m.releaseStatus!=='upcoming'));
    let sort='all',region='',genre=new URLSearchParams(location.search).get('genre') || '',minRating='',unwatched=false,playable=false,limit=20;
    const $results=$(`#${prefix}-results`),$more=$(`#${prefix}-more`);
    const tabs=$(`#${prefix}-tabs`),filters=$(`#${isTv?'tv-filter':'region-filter'}`);
    if(isTv&&genre) filters.querySelectorAll('button').forEach((b)=>b.classList.toggle('active',b.dataset.genre===genre));
    const draw=async()=>{
      let list=all.filter((m)=>{
        if(!isTv&&region){
          const match=region==='中国大陆'?m.region.startsWith('中国'):region==='美国'?['美国','英国','法国','德国','意大利','西班牙'].includes(m.region):m.region===region;
          if(!match) return false;
        }
        if(!isTv&&genre&&!m.genres.includes(genre)) return false;
        if(isTv&&genre&&!m.genres.includes(genre)) return false;
        if(minRating&&(m.originalRating==null||m.originalRating<Number(minRating))) return false;
        if(playable&&!m.playable) return false;
        if(unwatched){const current=demoUser();if(current&&localStatus(m.id,current.id)==='WATCHED') return false;}
        return true;
      });
      if(sort==='latest') list.sort((a,b)=>b.year-a.year||b.id-a.id);
      if(sort==='rating_desc'||sort==='popular') list.sort((a,b)=>(b.originalRating||0)-(a.originalRating||0));
      if(sort==='cold') list=list.filter((m)=>(m.originalRating||0)>=7).sort((a,b)=>a.year-b.year||(b.originalRating||0)-(a.originalRating||0));
      $results.innerHTML=list.slice(0,limit).map(mediaCard).join('')||empty('没有符合条件的条目，请调整筛选。');
      $more.hidden=limit>=list.length;
    };
    tabs.addEventListener('click',(e)=>{const b=e.target.closest('button[data-sort]');if(!b)return;sort=b.dataset.sort;limit=20;tabs.querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===b));draw();});
    filters.addEventListener('click',(e)=>{const b=e.target.closest('button');if(!b)return;if(isTv)genre=b.dataset.genre;else region=b.dataset.region;limit=20;filters.querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===b));savePage({genre:isTv?genre:null,region:!isTv?region:null});draw();});
    $(`#${isTv?'tv-rating-filter':'rating-filter'}`).addEventListener('change',(e)=>{minRating=e.target.value;limit=20;draw();});
    $(`#${isTv?'tv-unwatched':'unwatched-filter'}`).addEventListener('change',async(e)=>{if(e.target.checked&&!await user()){e.target.checked=false;alert('请先使用演示账号登录。');return;}unwatched=e.target.checked;limit=20;draw();});
    $(`#${isTv?'tv-playable':'playable-filter'}`).addEventListener('change',(e)=>{playable=e.target.checked;limit=20;draw();});
    $more.addEventListener('click',()=>{limit+=20;draw();});
    if(isTv) $('#tv-groups').innerHTML=['米饭大电视','美剧 fans','日剧 fans','看日剧','BBC','电影爱看','日本电影','TVB'].map((t,i)=>`<a class="group-item" href="tv.html"><div class="group-icon">${['☕','▣','映','剧','BBC','✦','花','TV'][i]}</div>${escapeHtml(t)}</a>`).join('');
    draw();
  }
  async function top250() {
    const ranked=(await allMovies()).filter((m)=>m.rank!=null).sort((a,b)=>a.rank-b.rank);
    let current=Math.max(1,Number(new URLSearchParams(location.search).get('page'))||1),unwatched=false;
    const draw=()=>{
      const account=demoUser();
      const list=unwatched&&account?ranked.filter((m)=>localStatus(m.id,account.id)!=='WATCHED'):ranked;
      const max=Math.max(1,Math.ceil(list.length/25)); current=Math.min(current,max);
      $('#top-list').innerHTML=list.slice((current-1)*25,current*25).map((m)=>`<article class="top-item"><span class="top-rank">${m.rank}</span>${poster(m)}<div class="top-content"><a href="${movieUrl(m)}">${escapeHtml(m.title)}${m.originalTitle?` / ${escapeHtml(m.originalTitle)}`:''}</a><p>导演: ${escapeHtml(m.director)} / ${m.year} / ${escapeHtml(m.region)} / ${escapeHtml(m.genres.join(' '))}</p>${rating(m)} <small>（本地演示评分）</small><p>${escapeHtml(m.synopsis)}</p><div class="top-actions"><button data-status="WANT" data-id="${m.id}">想看</button><button data-status="WATCHED" data-id="${m.id}">看过</button></div></div></article>`).join('')||empty('当前筛选没有电影。');
      pages($('#top-pagination'),current,list.length,(n)=>{current=n;savePage({page:n});draw();window.scrollTo({top:0,behavior:'smooth'});});
    };
    $('#top-unwatched').addEventListener('change',async(e)=>{if(e.target.checked&&!await user()){e.target.checked=false;alert('请先登录后筛选未看过的电影。');return;}unwatched=e.target.checked;current=1;draw();});
    $('#top-list').addEventListener('click',async(e)=>{const b=e.target.closest('button[data-status]');if(!b)return;const account=await user();if(!account){location.href=`login.html?next=${encodeURIComponent(`top250.html?page=${current}`)}`;return;}setLocalStatus(b.dataset.id,account.id,b.dataset.status);b.textContent=b.dataset.status==='WANT'?'已想看':'已看过';if(unwatched)draw();});
    draw();
  }
  async function search() {
    const query=(new URLSearchParams(location.search).get('keyword')||'').trim();
    $('#search-title').textContent=query?`搜索 ${query}`:'搜索电影';
    const input=$('#site-search input');if(input)input.value=query;
    const all=await allMovies();
    const list=query?all.filter((m)=>[m.title,m.originalTitle,m.director,m.region,...m.genres].join(' ').toLowerCase().includes(query.toLowerCase())):[];
    let current=Math.max(1,Number(new URLSearchParams(location.search).get('page'))||1);
    const draw=()=>{
      const slice=list.slice((current-1)*25,current*25);
      $('#search-results').innerHTML=slice.length?slice.map((m)=>`<article class="search-item">${poster(m)}<div><h2><a href="${movieUrl(m)}">${escapeHtml(m.title)} (${m.year})</a> <span style="color:#008b4d;font-size:12px">[可播放]</span></h2>${rating(m)}<p>${escapeHtml(m.region)} / ${escapeHtml(m.genres.join(' / '))} / ${escapeHtml(m.originalTitle)}</p><p>${escapeHtml(m.director)}</p><div class="search-actions"><button data-id="${m.id}" data-status="WANT">想看</button><button data-id="${m.id}" data-status="WATCHED">看过</button></div></div></article>`).join(''):empty(query?'没有找到相关电影或剧集，请尝试其他关键词。':'在顶部输入关键词开始搜索。');
      pages($('#search-pagination'),current,list.length,(n)=>{current=n;savePage({page:n});draw();});
    };
    $('#search-results').addEventListener('click',async(e)=>{const b=e.target.closest('button[data-status]');if(!b)return;const account=await user();if(!account){location.href=`login.html?next=${encodeURIComponent(location.pathname.split('/').pop()+location.search)}`;return;}setLocalStatus(b.dataset.id,account.id,b.dataset.status);b.textContent=b.dataset.status==='WANT'?'已想看':'已看过';});
    $('#related-searches').innerHTML=query?`<div class="related-item"><a href="search.html?keyword=${encodeURIComponent(query)}">› 搜索“${escapeHtml(query)}”的电影</a></div><div class="related-item"><a href="explore.html">› 浏览更多电影</a></div>`:'';
    draw();
  }
  function demoReviews(movieId) {
    if(String(movieId)!=='6') return [];
    const names=['鱼桥木','青墨树','豆瓣看过','庸所闻','一一','北子','Ed Reborning','午睡','Atopos','柚仔','夏の终わり','LiBB','bsxkjgcy','芝士'];
    const texts=['细腻的亲情故事，看到最后一幕才明白前面的伏笔。','人物关系写得很真诚，很多生活细节让人想起自己的家人。','节奏有点慢，但这种安静也很适合故事。','最感动我的是两代人之间那些没有说出口的话。','从前半段很轻，到后半段慢慢沉下来。','画面和音乐都很温柔，适合静静看完。'];
    return names.map((name,i)=>({id:`seed-${i}`,movieId:Number(movieId),userId:100+i,author:name,stars:5-i%3,content:texts[i%texts.length],createdAt:new Date(Date.now()-(i+1)*86400000).toISOString(),useful:25-i}));
  }
  async function allReviews(movieId) {
    try { const data=await requestJson(`/api/movies/${encodeURIComponent(movieId)}/reviews?page=1&size=200`); return {items:data.items||[],api:true}; }
    catch (error) { if(error.status&&error.status!==404) return {items:[],api:true,error}; return {items:[...read(reviewKey,[]).filter((r)=>String(r.movieId)===String(movieId)),...demoReviews(movieId)],api:false}; }
  }
  async function comments() {
    const movieId=new URLSearchParams(location.search).get('movieId')||'6';
    const movie=(await allMovies()).find((m)=>String(m.id)===String(movieId));
    if(!movie){$('#comments-title').textContent='电影不存在';return;}
    document.title=`${movie.title} 短评 · 豆瓣电影`;
    $('#comments-title').textContent=`${movie.title} 短评`;
    $('#comments-back').href=movieUrl(movie);
    $('#comments-movie-card').innerHTML=`<div class="comment-side-movie">${poster(movie)}<div><a href="${movieUrl(movie)}">${escapeHtml(movie.title)}</a><p>导演: ${escapeHtml(movie.director)}<br>类型: ${escapeHtml(movie.genres.join('/'))}<br>地区: ${escapeHtml(movie.region)}<br>片长: 118分钟</p></div></div>`;
    let order='hot',starFilter=0,current=1,editor=false,currentItems=[];
    const draw=async()=>{
      const result=await allReviews(movieId);
      const account=await user();
      currentItems=result.items;
      let list=result.items.filter((r)=>starFilter===0||(starFilter===5?r.stars>=4:starFilter===3?r.stars===3:r.stars<=2));
      if(order==='latest') list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      if(order==='hot') list.sort((a,b)=>(b.useful||0)-(a.useful||0));
      if(order==='friends') list=account?list.filter((r)=>r.userId===account.id):[];
      $('#comments-count').textContent=`看过(${result.items.length})　想看(${Math.max(0,result.items.length*2)})`;
      const shown=list.slice((current-1)*25,current*25);
      const votes=read(votesKey,{});
      $('#comments-list').innerHTML=shown.length?shown.map((r)=>`<article class="comment-row"><div class="avatar">${escapeHtml(r.author[0]||'影')}</div><div class="comment-body"><div class="meta"><a href="#">${escapeHtml(r.author)}</a><span>看过</span><span class="rating">${'★'.repeat(Math.max(1,Math.min(5,r.stars)))}</span><span>${escapeHtml(String(r.createdAt).slice(0,16).replace('T',' '))}</span></div><p>${escapeHtml(r.content)}</p><div class="comment-actions">${account&&r.userId===account.id?`<button data-edit="${escapeHtml(r.id)}">修改</button><button data-delete="${escapeHtml(r.id)}">删除</button>`:''}<button class="useful" data-vote="${escapeHtml(r.id)}">${(r.useful||0)+Object.keys(votes).filter((k)=>k.endsWith(`:${r.id}`)&&votes[k]).length} 有用</button></div></div></article>`).join(''):empty('当前条件下没有短评。');
      pages($('#comments-pagination'),current,list.length,(n)=>{current=n;draw();});
    };
    const openEditor=async(review=null)=>{
      const account=await user();if(!account){location.href=`login.html?next=${encodeURIComponent(`comments.html?movieId=${movieId}`)}`;return;}
      editor=true;
      $('#review-form-container').innerHTML=`<form class="review-editor" id="review-editor"><strong>${review?'修改我的短评':'写一条短评'}</strong><label>评分 <select name="stars">${[5,4,3,2,1].map((n)=>`<option value="${n}" ${review?.stars===n?'selected':''}>${n} 星</option>`).join('')}</select></label><label>短评内容<textarea name="content" maxlength="500" required placeholder="说说你的观影感受">${escapeHtml(review?.content||'')}</textarea></label><div class="feedback" role="status"></div><button type="submit">${review?'保存修改':'发表短评'}</button><button type="button" class="cancel">取消</button></form>`;
      const form=$('#review-editor');form.querySelector('.cancel').addEventListener('click',()=>{$('#review-form-container').innerHTML='';editor=false;});
      form.addEventListener('submit',async(e)=>{
        e.preventDefault();const stars=Number(form.elements.stars.value),content=form.elements.content.value.trim();
        if(!content){form.querySelector('.feedback').textContent='请输入短评内容。';return;}
        try { await requestJson(`/api/movies/${encodeURIComponent(movieId)}/review`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({stars,content})}); }
        catch(error){if(error.status&&error.status!==404){form.querySelector('.feedback').textContent=error.message;return;}
          const all=read(reviewKey,[]);const idx=all.findIndex((r)=>String(r.movieId)===String(movieId)&&r.userId===account.id);
          const item={id:idx>=0?all[idx].id:`local-${Date.now()}`,movieId:Number(movieId),userId:account.id,author:account.displayName,stars,content,createdAt:idx>=0?all[idx].createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),useful:idx>=0?all[idx].useful:0};
          if(idx>=0)all[idx]=item;else all.unshift(item);write(reviewKey,all);
        }
        $('#review-form-container').innerHTML='';editor=false;current=1;draw();
      });
    };
    $('#write-review').addEventListener('click',()=>{if(!editor)openEditor();});
    $('#comment-sort').addEventListener('click',(e)=>{const b=e.target.closest('button[data-order]');if(!b)return;order=b.dataset.order;current=1;$$('#comment-sort button').forEach((x)=>x.classList.toggle('active',x===b));draw();});
    $('#comment-stars').addEventListener('change',(e)=>{starFilter=Number(e.target.value);current=1;draw();});
    $('#comments-list').addEventListener('click',async(e)=>{
      const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]'),vote=e.target.closest('[data-vote]');
      if(edit){const review=currentItems.find((r)=>String(r.id)===edit.dataset.edit);if(review)openEditor(review);return;}
      if(del){if(!confirm('删除自己的这条短评？'))return;const account=await user();if(!account)return;
        try{await requestJson(`/api/movies/${encodeURIComponent(movieId)}/review`,{method:'DELETE'});}catch(error){if(error.status&&error.status!==404){alert(error.message);return;}
          write(reviewKey,read(reviewKey,[]).filter((r)=>!(String(r.id)===del.dataset.delete&&r.userId===account.id)));
        }draw();return;}
      if(vote){const account=await user();if(!account){alert('请先登录后投票。');return;}const key=`${account.id}:${vote.dataset.vote}`;const votes=read(votesKey,{});votes[key]=!votes[key];write(votesKey,votes);draw();}
    });
    draw();
  }
  const run=()=>{if(page==='showing')showing();if(page==='explore')explore('movie');if(page==='tv')explore('tv');if(page==='top250')top250();if(page==='search')search();if(page==='comments')comments();};
  run();
})();
