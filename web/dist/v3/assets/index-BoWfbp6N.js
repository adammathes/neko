(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function i(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(a){if(a.ep)return;a.ep=!0;const r=i(a);fetch(a.href,r)}})();function y(t){const i=`; ${document.cookie}`.split(`; ${t}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function d(t,e){const i=e?.method?.toUpperCase()||"GET",s=["POST","PUT","DELETE"].includes(i),a=new Headers(e?.headers||{});if(s){const r=y("csrf_token");r&&a.set("X-CSRF-Token",r)}return fetch(t,{...e,headers:a,credentials:"include"})}class E extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";loading=!1;hasMore=!0;setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,i=!1){i?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}emit(e,i){this.dispatchEvent(new CustomEvent(e,{detail:i}))}on(e,i){this.addEventListener(e,i)}}const n=new E;class L extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),s=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let a="/";const r={};return s[0]==="feed"&&s[1]?(a="/feed",r.feedId=s[1]):s[0]==="tag"&&s[1]&&(a="/tag",r.tagName=decodeURIComponent(s[1])),{path:a,params:r,query:e.searchParams}}navigate(e,i){let s=`/v3${e}`;if(i){const a=new URLSearchParams(i);s+=`?${a.toString()}`}window.history.pushState({},"",s),this.handleRouteChange()}updateQuery(e){const i=new URL(window.location.href);for(const[s,a]of Object.entries(e))a?i.searchParams.set(s,a):i.searchParams.delete(s);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const c=new L;function I(t,e){return`
    <li class="feed-item ${e?"active":""}" data-id="${t._id}">
      <a href="/v3/feed/${t._id}" class="feed-link" onclick="event.preventDefault(); window.app.navigate('/feed/${t._id}')">
        ${t.title||t.url}
      </a>
    </li>
  `}const F=document.querySelector("#app");F.innerHTML=`
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 onclick="window.app.navigate('/')" style="cursor: pointer">Neko v3</h2>
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
    </aside>
    <section class="item-list-pane">
      <header class="top-bar">
        <h1 id="view-title">All Items</h1>
      </header>
      <div id="item-list-container" class="item-list-container"></div>
    </section>
    <main class="item-detail-pane">
      <div id="item-detail-content" class="item-detail-content">
        <div class="empty-state">Select an item to read</div>
      </div>
    </main>
  </div>
`;const T=document.getElementById("feed-list"),$=document.getElementById("tag-list"),S=document.getElementById("filter-list"),f=document.getElementById("view-title"),l=document.getElementById("item-list-container"),h=document.getElementById("item-detail-content");function p(){const{feeds:t,activeFeedId:e}=n;T.innerHTML=t.map(i=>I(i,i._id===e)).join("")}function g(){const{tags:t,activeTagName:e}=n;$.innerHTML=t.map(i=>`
    <li class="tag-item ${i.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(i.title)}" class="tag-link" onclick="event.preventDefault(); window.app.navigate('/tag/${encodeURIComponent(i.title)}')">
        ${i.title}
      </a>
    </li>
  `).join("")}function v(){const{filter:t}=n;S.querySelectorAll(".filter-item").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-filter")===t)})}function w(){const{items:t,loading:e}=n;if(e&&t.length===0){l.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){l.innerHTML='<p class="empty">No items found.</p>';return}l.innerHTML=`
    <ul class="item-list">
      ${t.map(s=>`
        <li class="item-row ${s.read?"read":""}" data-id="${s._id}">
          <div class="item-title">${s.title}</div>
          <div class="item-meta">${s.feed_title||""}</div>
        </li>
      `).join("")}
    </ul>
    ${n.hasMore?'<div id="load-more" class="load-more">Loading more...</div>':""}
  `,l.querySelectorAll(".item-row").forEach(s=>{s.addEventListener("click",()=>{const a=parseInt(s.getAttribute("data-id")||"0");_(a)})});const i=document.getElementById("load-more");i&&new IntersectionObserver(a=>{a[0].isIntersecting&&!n.loading&&n.hasMore&&R()},{threshold:.1}).observe(i)}async function _(t){const e=n.items.find(i=>i._id===t);if(e){if(l.querySelectorAll(".item-row").forEach(i=>{i.classList.toggle("active",parseInt(i.getAttribute("data-id")||"0")===t)}),h.innerHTML=`
    <article class="item-detail">
      <header>
        <h1><a href="${e.url}" target="_blank">${e.title}</a></h1>
        <div class="item-meta">
          From ${e.feed_title||"Unknown"} on ${new Date(e.publish_date).toLocaleString()}
        </div>
      </header>
      <div id="full-content" class="full-content">
        ${e.description||"No description available."}
      </div>
    </article>
  `,!e.read)try{await d(`/api/item/${e._id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({read:!0})}),e.read=!0;const i=l.querySelector(`.item-row[data-id="${t}"]`);i&&i.classList.add("read")}catch(i){console.error("Failed to mark as read",i)}if(e.url&&(!e.full_content||e.full_content===e.description))try{const i=await d(`/api/item/${e._id}/content`);if(i.ok){const s=await i.json();if(s.full_content){e.full_content=s.full_content;const a=document.getElementById("full-content");a&&(a.innerHTML=s.full_content)}}}catch(i){console.error("Failed to fetch full content",i)}}}async function b(){try{const t=await d("/api/feed/");if(!t.ok)throw new Error("Failed to fetch feeds");const e=await t.json();n.setFeeds(e)}catch(t){console.error(t)}}async function C(){try{const t=await d("/api/tag");if(!t.ok)throw new Error("Failed to fetch tags");const e=await t.json();n.setTags(e)}catch(t){console.error(t)}}async function u(t,e,i=!1){n.setLoading(!0);try{let s="/api/stream";const a=new URLSearchParams;t&&a.append("feed_id",t),e&&a.append("tag",e),n.filter==="unread"&&a.append("read","false"),n.filter==="starred"&&a.append("starred","true"),i&&n.items.length>0&&a.append("max_id",String(n.items[n.items.length-1]._id));const r=await d(`${s}?${a.toString()}`);if(!r.ok)throw new Error("Failed to fetch items");const o=await r.json();n.setHasMore(o.length>=50),n.setItems(o,i),i||(h.innerHTML='<div class="empty-state">Select an item to read</div>')}catch(s){console.error(s),i||n.setItems([])}finally{n.setLoading(!1)}}async function R(){const t=c.getCurrentRoute();u(t.params.feedId,t.params.tagName,!0)}function m(){const t=c.getCurrentRoute(),e=t.query.get("filter");if(e&&["unread","all","starred"].includes(e)&&n.setFilter(e),t.path==="/feed"&&t.params.feedId){const i=parseInt(t.params.feedId);n.setActiveFeed(i);const s=n.feeds.find(a=>a._id===i);f.textContent=s?s.title:`Feed ${i}`,u(t.params.feedId)}else t.path==="/tag"&&t.params.tagName?(n.setActiveTag(t.params.tagName),f.textContent=`Tag: ${t.params.tagName}`,u(void 0,t.params.tagName)):(n.setActiveFeed(null),n.setActiveTag(null),f.textContent="All Items",u())}n.on("feeds-updated",p);n.on("tags-updated",g);n.on("active-feed-updated",p);n.on("active-tag-updated",g);n.on("filter-updated",()=>{v(),m()});n.on("items-updated",w);n.on("loading-state-changed",w);c.addEventListener("route-changed",m);window.app={navigate:t=>c.navigate(t),setFilter:t=>c.updateQuery({filter:t})};async function k(){if((await d("/api/auth")).status===401){window.location.href="/login/";return}v(),await Promise.all([b(),C()]),m()}k();
