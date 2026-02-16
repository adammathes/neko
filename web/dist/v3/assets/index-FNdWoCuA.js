(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&s(d)}).observe(document,{childList:!0,subtree:!0});function i(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(n){if(n.ep)return;n.ep=!0;const r=i(n);fetch(n.href,r)}})();function k(t){const i=`; ${document.cookie}`.split(`; ${t}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function c(t,e){const i=e?.method?.toUpperCase()||"GET",s=["POST","PUT","DELETE"].includes(i),n=new Headers(e?.headers||{});if(s){const r=k("csrf_token");r&&n.set("X-CSRF-Token",r)}return fetch(t,{...e,headers:n,credentials:"include"})}class F extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,i=!1){i?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}emit(e,i){this.dispatchEvent(new CustomEvent(e,{detail:i}))}on(e,i){this.addEventListener(e,i)}}const a=new F;class _ extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),s=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const r={};return s[0]==="feed"&&s[1]?(n="/feed",r.feedId=s[1]):s[0]==="tag"&&s[1]&&(n="/tag",r.tagName=decodeURIComponent(s[1])),{path:n,params:r,query:e.searchParams}}navigate(e,i){let s=`/v3${e}`;if(i){const n=new URLSearchParams(i);s+=`?${n.toString()}`}window.history.pushState({},"",s),this.handleRouteChange()}updateQuery(e){const i=new URL(window.location.href);for(const[s,n]of Object.entries(e))n?i.searchParams.set(s,n):i.searchParams.delete(s);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const u=new _;function R(t,e){return`
    <li class="feed-item ${e?"active":""}" data-id="${t._id}">
      <a href="/v3/feed/${t._id}" class="feed-link" onclick="event.preventDefault(); window.app.navigate('/feed/${t._id}')">
        ${t.title||t.url}
      </a>
    </li>
  `}const v=document.querySelector("#app");function C(){v.className=`theme-${a.theme} font-${a.fontTheme}`,v.innerHTML=`
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 onclick="window.app.navigate('/')" style="cursor: pointer">Neko v3</h2>
        </div>
        <div class="sidebar-search">
          <input type="search" id="search-input" placeholder="Search..." value="${a.searchQuery}">
        </div>
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <h3>Filters</h3>
            <ul id="filter-list" class="filter-list">
              <li class="filter-item" data-filter="unread"><a href="#" onclick="event.preventDefault(); window.app.setFilter('unread')">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="#" onclick="event.preventDefault(); window.app.setFilter('all')">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="#" onclick="event.preventDefault(); window.app.setFilter('starred')">Starred</a></li>
            </ul>
          </section>
          <section class="sidebar-section">
            <h3>Tags</h3>
            <ul id="tag-list" class="tag-list"></ul>
          </section>
          <section class="sidebar-section">
            <h3>Feeds</h3>
            <ul id="feed-list" class="feed-list"></ul>
          </section>
        </div>
        <div class="sidebar-footer">
          <a href="#" onclick="event.preventDefault(); window.app.navigate('/settings')">Settings</a>
          <a href="#" onclick="event.preventDefault(); window.app.logout()">Logout</a>
        </div>
      </aside>
      <section class="item-list-pane">
        <header class="top-bar">
          <h1 id="view-title">All Items</h1>
        </header>
        <div id="item-list-container" class="item-list-container"></div>
      </section>
      <main class="item-detail-pane" id="main-pane">
        <div id="item-detail-content" class="item-detail-content">
          <div class="empty-state">Select an item to read</div>
        </div>
      </main>
    </div>
  `,document.getElementById("search-input")?.addEventListener("input",e=>{const i=e.target.value;window.app.setSearch(i)})}C();const w=document.getElementById("feed-list"),y=document.getElementById("tag-list"),T=document.getElementById("filter-list"),h=document.getElementById("view-title"),l=document.getElementById("item-list-container"),p=document.getElementById("item-detail-content");let o=null;function $(){const{feeds:t,activeFeedId:e}=a;w&&(w.innerHTML=t.map(i=>R(i,i._id===e)).join(""))}function E(){const{tags:t,activeTagName:e}=a;y&&(y.innerHTML=t.map(i=>`
    <li class="tag-item ${i.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(i.title)}" class="tag-link" onclick="event.preventDefault(); window.app.navigate('/tag/${encodeURIComponent(i.title)}')">
        ${i.title}
      </a>
    </li>
  `).join(""))}function L(){const{filter:t}=a;T&&T.querySelectorAll(".filter-item").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-filter")===t)})}function S(){const{items:t,loading:e}=a;if(!l)return;if(e&&t.length===0){l.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){l.innerHTML='<p class="empty">No items found.</p>';return}l.innerHTML=`
    <ul class="item-list">
      ${t.map(s=>`
        <li class="item-row ${s.read?"read":""} ${s._id===o?"active":""}" data-id="${s._id}">
          <div class="item-title">${s.title}</div>
          <div class="item-meta">${s.feed_title||""}</div>
        </li>
      `).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more" class="load-more">Loading more...</div>':""}
  `,l.querySelectorAll(".item-row").forEach(s=>{s.addEventListener("click",()=>{const n=parseInt(s.getAttribute("data-id")||"0");b(n)})});const i=document.getElementById("load-more");i&&new IntersectionObserver(n=>{n[0].isIntersecting&&!a.loading&&a.hasMore&&P()},{threshold:.1}).observe(i)}async function b(t,e=!1){o=t;const i=a.items.find(s=>s._id===t);if(i&&(l.querySelectorAll(".item-row").forEach(s=>{const n=parseInt(s.getAttribute("data-id")||"0");s.classList.toggle("active",n===t),e&&n===t&&s.scrollIntoView({block:"nearest"})}),p.innerHTML=`
    <article class="item-detail">
      <header>
        <h1><a href="${i.url}" target="_blank">${i.title}</a></h1>
        <div class="item-meta">
          From ${i.feed_title||"Unknown"} on ${new Date(i.publish_date).toLocaleString()}
        </div>
        <div class="item-actions">
           <button onclick="window.app.toggleStar(${i._id})">${i.starred?"★ Unstar":"☆ Star"}</button>
           <button onclick="window.app.toggleRead(${i._id})">${i.read?"Unread":"Read"}</button>
        </div>
      </header>
      <div id="full-content" class="full-content">
        ${i.description||"No description available."}
      </div>
    </article>
  `,i.read||f(i._id,{read:!0}),i.url&&(!i.full_content||i.full_content===i.description)))try{const s=await c(`/api/item/${i._id}/content`);if(s.ok){const n=await s.json();if(n.full_content){i.full_content=n.full_content;const r=document.getElementById("full-content");r&&(r.innerHTML=n.full_content)}}}catch(s){console.error("Failed to fetch full content",s)}}async function f(t,e){try{if((await c(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const s=a.items.find(n=>n._id===t);if(s){Object.assign(s,e);const n=l.querySelector(`.item-row[data-id="${t}"]`);if(n&&e.read!==void 0&&n.classList.toggle("read",e.read),o===t){const r=p.querySelector(".item-actions button");r&&e.starred!==void 0&&(r.textContent=e.starred?"★ Unstar":"☆ Star")}}}}catch(i){console.error("Failed to update item",i)}}function M(){h.textContent="Settings",l.innerHTML="",p.innerHTML=`
        <div class="settings-view">
            <h2>Settings</h2>
            <section class="settings-section">
                <h3>Theme</h3>
                <div class="theme-options">
                    <button class="${a.theme==="light"?"active":""}" onclick="window.app.setTheme('light')">Light</button>
                    <button class="${a.theme==="dark"?"active":""}" onclick="window.app.setTheme('dark')">Dark</button>
                </div>
            </section>
            <section class="settings-section">
                <h3>Font</h3>
                <select onchange="window.app.setFontTheme(this.value)">
                    <option value="default" ${a.fontTheme==="default"?"selected":""}>Default</option>
                    <option value="serif" ${a.fontTheme==="serif"?"selected":""}>Serif</option>
                    <option value="mono" ${a.fontTheme==="mono"?"selected":""}>Monospace</option>
                </select>
            </section>
        </div>
    `}async function N(){try{const t=await c("/api/feed/");if(!t.ok)throw new Error("Failed to fetch feeds");const e=await t.json();a.setFeeds(e)}catch(t){console.error(t)}}async function A(){try{const t=await c("/api/tag");if(!t.ok)throw new Error("Failed to fetch tags");const e=await t.json();a.setTags(e)}catch(t){console.error(t)}}async function m(t,e,i=!1){a.setLoading(!0);try{let s="/api/stream";const n=new URLSearchParams;t&&n.append("feed_id",t),e&&n.append("tag",e),a.searchQuery&&n.append("q",a.searchQuery),a.filter==="unread"&&n.append("read","false"),a.filter==="starred"&&n.append("starred","true"),i&&a.items.length>0&&n.append("max_id",String(a.items[a.items.length-1]._id));const r=await c(`${s}?${n.toString()}`);if(!r.ok)throw new Error("Failed to fetch items");const d=await r.json();a.setHasMore(d.length>=50),a.setItems(d,i),i||(o=null,p.innerHTML='<div class="empty-state">Select an item to read</div>')}catch(s){console.error(s),i||a.setItems([])}finally{a.setLoading(!1)}}async function P(){const t=u.getCurrentRoute();m(t.params.feedId,t.params.tagName,!0)}function g(){const t=u.getCurrentRoute(),e=t.query.get("filter");e&&["unread","all","starred"].includes(e)&&a.setFilter(e);const i=t.query.get("q");if(i!==null&&a.setSearchQuery(i),t.path==="/settings"){M();return}if(t.path==="/feed"&&t.params.feedId){const s=parseInt(t.params.feedId);a.setActiveFeed(s);const n=a.feeds.find(r=>r._id===s);h.textContent=n?n.title:`Feed ${s}`,m(t.params.feedId)}else t.path==="/tag"&&t.params.tagName?(a.setActiveTag(t.params.tagName),h.textContent=`Tag: ${t.params.tagName}`,m(void 0,t.params.tagName)):(a.setActiveFeed(null),a.setActiveTag(null),h.textContent="All Items",m())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":I(1);break;case"k":I(-1);break;case"r":if(o){const e=a.items.find(i=>i._id===o);e&&f(e._id,{read:!e.read})}break;case"s":if(o){const e=a.items.find(i=>i._id===o);e&&f(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function I(t){if(a.items.length===0)return;let e=a.items.findIndex(i=>i._id===o);e+=t,e>=0&&e<a.items.length&&b(a.items[e]._id,!0)}a.on("feeds-updated",$);a.on("tags-updated",E);a.on("active-feed-updated",$);a.on("active-tag-updated",E);a.on("filter-updated",()=>{L(),g()});a.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==a.searchQuery&&(t.value=a.searchQuery),g()});a.on("theme-updated",()=>{v.className=`theme-${a.theme} font-${a.fontTheme}`});a.on("items-updated",S);a.on("loading-state-changed",S);u.addEventListener("route-changed",g);window.app={navigate:t=>u.navigate(t),setFilter:t=>u.updateQuery({filter:t}),setSearch:t=>{u.updateQuery({q:t})},setTheme:t=>a.setTheme(t),setFontTheme:t=>a.setFontTheme(t),toggleStar:t=>{const e=a.items.find(i=>i._id===t);e&&f(t,{starred:!e.starred})},toggleRead:t=>{const e=a.items.find(i=>i._id===t);e&&f(t,{read:!e.read})},logout:async()=>{await c("/api/logout",{method:"POST"}),window.location.href="/login/"}};async function U(){if((await c("/api/auth")).status===401){window.location.href="/login/";return}L(),await Promise.all([N(),A()]),g()}U();
