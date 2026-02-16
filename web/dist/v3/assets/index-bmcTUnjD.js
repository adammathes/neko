(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function a(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=a(s);fetch(s.href,r)}})();function k(t){const a=`; ${document.cookie}`.split(`; ${t}=`);if(a.length===2)return a.pop()?.split(";").shift()}async function h(t,e){const a=e?.method?.toUpperCase()||"GET",n=["POST","PUT","DELETE"].includes(a),s=new Headers(e?.headers||{});if(n){const r=k("csrf_token");r&&s.set("X-CSRF-Token",r)}return fetch(t,{...e,headers:s,credentials:"include"})}class _ extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=window.innerWidth>768;setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,a=!1){a?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}setSidebarVisible(e){this.sidebarVisible=e,this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(e,a){this.dispatchEvent(new CustomEvent(e,{detail:a}))}on(e,a){this.addEventListener(e,a)}}const i=new _;class F extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),n=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const r={};return n[0]==="feed"&&n[1]?(s="/feed",r.feedId=n[1]):n[0]==="tag"&&n[1]?(s="/tag",r.tagName=decodeURIComponent(n[1])):n[0]==="settings"&&(s="/settings"),{path:s,params:r,query:e.searchParams}}navigate(e,a){let n=`/v3${e}`;if(a){const s=new URLSearchParams(a);n+=`?${s.toString()}`}window.history.pushState({},"",n),this.handleRouteChange()}updateQuery(e){const a=new URL(window.location.href);for(const[n,s]of Object.entries(e))s?a.searchParams.set(n,s):a.searchParams.delete(n);window.history.pushState({},"",a.toString()),this.handleRouteChange()}}const d=new F;function A(t){const e=new Date(t.publish_date).toLocaleDateString();return`
    <li class="feed-item ${t.read?"read":"unread"}" data-id="${t._id}">
      <div class="item-header">
        <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="item-title" data-action="open">
          ${t.title||"(No Title)"}
        </a>
        <button class="star-btn ${t.starred?"is-starred":"is-unstarred"}" title="${t.starred?"Unstar":"Star"}" data-action="toggle-star">
          ★
        </button>
      </div>
      <div class="dateline">
        <a href="${t.url}" target="_blank" rel="noopener noreferrer">
          ${e}
          ${t.feed_title?` - ${t.feed_title}`:""}
        </a>
        <div class="item-actions" style="display: inline-block; float: right;">
          ${t.full_content?"":`
            <button class="scrape-btn" title="Load Full Content" data-action="scrape">
              text
            </button>
          `}
        </div>
      </div>
      ${t.full_content||t.description?`
        <div class="item-description">
          ${t.full_content||t.description}
        </div>
      `:""}
    </li>
  `}let l=null,f=null;function R(){f=document.querySelector("#app"),f&&(f.className=`theme-${i.theme} font-${i.fontTheme}`,f.innerHTML=`
    <div class="layout ${i.sidebarVisible?"sidebar-visible":"sidebar-hidden"}">
      <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Toggle Sidebar">🐱</button>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <h2 id="logo-link">Neko v3</h2>
        </div>
        <div class="sidebar-search">
          <input type="search" id="search-input" placeholder="Search..." value="${i.searchQuery}">
        </div>
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <h3>Filters</h3>
            <ul id="filter-list">
              <li class="filter-item" data-filter="unread"><a href="/v3/?filter=unread" data-nav="filter" data-value="unread">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="/v3/?filter=all" data-nav="filter" data-value="all">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="/v3/?filter=starred" data-nav="filter" data-value="starred">Starred</a></li>
            </ul>
          </section>
          <section class="sidebar-section collapsible collapsed" id="section-tags">
            <h3>Tags <span class="caret">▶</span></h3>
            <ul id="tag-list"></ul>
          </section>
          <section class="sidebar-section collapsible collapsed" id="section-feeds">
            <h3>Feeds <span class="caret">▶</span></h3>
            <ul id="feed-list"></ul>
          </section>
        </div>
        <div class="sidebar-footer">
          <a href="/v3/settings" data-nav="settings">Settings</a>
          <a href="#" id="logout-button">Logout</a>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div id="content-area"></div>
      </main>
    </div>
  `,B())}function B(){document.getElementById("search-input")?.addEventListener("input",s=>{const r=s.target.value;d.updateQuery({q:r})}),document.getElementById("logo-link")?.addEventListener("click",()=>d.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),Q()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{i.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{i.setSidebarVisible(!1)}),window.addEventListener("resize",()=>{window.innerWidth>768&&!i.sidebarVisible&&i.setSidebarVisible(!0)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const o=s.target.closest("a");if(!o)return;const m=o.getAttribute("data-nav"),v=Object.fromEntries(d.getCurrentRoute().query.entries());if(m==="filter"){s.preventDefault();const c=o.getAttribute("data-value");d.updateQuery({filter:c})}else if(m==="tag"){s.preventDefault();const c=o.getAttribute("data-value");d.navigate(`/tag/${encodeURIComponent(c)}`,v)}else if(m==="feed"){s.preventDefault();const c=o.getAttribute("data-value");d.navigate(`/feed/${c}`,v)}else m==="settings"&&(s.preventDefault(),d.navigate("/settings",v));window.innerWidth<=768&&i.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const r=s.target,o=r.closest('[data-action="toggle-star"]');if(o){const u=o.closest("[data-id]");if(u){const g=parseInt(u.getAttribute("data-id"));C(g)}return}const m=r.closest('[data-action="scrape"]');if(m){const u=m.closest("[data-id]");if(u){const g=parseInt(u.getAttribute("data-id"));N(g)}return}const v=r.closest('[data-action="open"]'),c=r.closest(".feed-item");if(c&&!v){const u=parseInt(c.getAttribute("data-id")),g=i.items.find($=>$._id===u);g&&!g.read&&p(u,{read:!0})}})}function L(){const{feeds:t,activeFeedId:e}=i,a=document.getElementById("feed-list");a&&(a.innerHTML=t.map(n=>`
    <li class="${n._id===e?"active":""}">
      <a href="/v3/feed/${n._id}" data-nav="feed" data-value="${n._id}">
        ${n.title||n.url}
      </a>
    </li>
  `).join(""))}function E(){const{tags:t,activeTagName:e}=i,a=document.getElementById("tag-list");a&&(a.innerHTML=t.map(n=>`
    <li class="${n.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(n.title)}" data-nav="tag" data-value="${n.title}">
        ${n.title}
      </a>
    </li>
  `).join(""))}function S(){const{filter:t}=i,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(a=>{a.classList.toggle("active",a.getAttribute("data-filter")===t)})}function y(){const{items:t,loading:e}=i,a=document.getElementById("content-area");if(!a||d.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){a.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){a.innerHTML='<p class="empty">No items found.</p>';return}a.innerHTML=`
    <ul class="item-list">
      ${t.map(s=>A(s)).join("")}
    </ul>
    ${i.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const n=document.getElementById("load-more-sentinel");n&&new IntersectionObserver(r=>{r[0].isIntersecting&&!i.loading&&i.hasMore&&M()},{threshold:.1}).observe(n)}function T(){const t=document.getElementById("content-area");if(!t)return;t.innerHTML=`
    <div class="settings-view">
      <h2>Settings</h2>
      <section class="settings-section">
        <h3>Theme</h3>
        <div class="theme-options" id="theme-options">
          <button class="${i.theme==="light"?"active":""}" data-theme="light">Light</button>
          <button class="${i.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
        </div>
      </section>
      <section class="settings-section">
        <h3>Font</h3>
        <select id="font-selector">
          <option value="default" ${i.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
          <option value="serif" ${i.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
          <option value="sans" ${i.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
          <option value="mono" ${i.fontTheme==="mono"?"selected":""}>Monospace</option>
        </select>
      </section>
    </div>
  `,document.getElementById("theme-options")?.addEventListener("click",n=>{const s=n.target.closest("button");if(s){const r=s.getAttribute("data-theme");i.setTheme(r),T()}});const a=document.getElementById("font-selector");a?.addEventListener("change",()=>{i.setFontTheme(a.value)})}async function C(t){const e=i.items.find(a=>a._id===t);e&&p(t,{starred:!e.starred})}async function N(t){if(i.items.find(a=>a._id===t))try{const a=await h(`/api/item/${t}/content`);if(a.ok){const n=await a.json();n.full_content&&p(t,{full_content:n.full_content})}}catch(a){console.error("Failed to fetch full content",a)}}async function p(t,e){try{if((await h(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const n=i.items.find(s=>s._id===t);if(n){Object.assign(n,e);const s=document.querySelector(`.feed-item[data-id="${t}"]`);if(s){if(e.read!==void 0&&s.classList.toggle("read",e.read),e.starred!==void 0){const r=s.querySelector(".star-btn");r&&(r.classList.toggle("is-starred",e.starred),r.classList.toggle("is-unstarred",!e.starred),r.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&y()}}}}catch(a){console.error("Failed to update item",a)}}async function q(){const t=await h("/api/feed/");if(t.ok){const e=await t.json();i.setFeeds(e)}}async function P(){const t=await h("/api/tag");if(t.ok){const e=await t.json();i.setTags(e)}}async function b(t,e,a=!1){i.setLoading(!0);try{const n=new URLSearchParams;t&&n.append("feed_id",t),e&&n.append("tag",e),i.searchQuery&&n.append("q",i.searchQuery),(i.filter==="starred"||i.filter==="all")&&n.append("read_filter","all"),i.filter==="starred"&&n.append("starred","true"),a&&i.items.length>0&&n.append("max_id",String(i.items[i.items.length-1]._id));const s=await h(`/api/stream?${n.toString()}`);if(s.ok){const r=await s.json();i.setHasMore(r.length>=50),i.setItems(r,a)}}finally{i.setLoading(!1)}}async function M(){const t=d.getCurrentRoute();b(t.params.feedId,t.params.tagName,!0)}async function Q(){await h("/api/logout",{method:"POST"}),window.location.href="/login/"}function w(){const t=d.getCurrentRoute(),e=t.query.get("filter");i.setFilter(e||"unread");const a=t.query.get("q");if(a!==null&&i.setSearchQuery(a),t.path==="/settings"){T();return}if(t.path==="/feed"&&t.params.feedId){const n=parseInt(t.params.feedId);i.setActiveFeed(n),b(t.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else t.path==="/tag"&&t.params.tagName?(i.setActiveTag(t.params.tagName),b(void 0,t.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(i.setActiveFeed(null),i.setActiveTag(null),b())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":I(1);break;case"k":I(-1);break;case"r":if(l){const e=i.items.find(a=>a._id===l);e&&p(e._id,{read:!e.read})}break;case"s":if(l){const e=i.items.find(a=>a._id===l);e&&p(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function I(t){if(i.items.length===0)return;let e=i.items.findIndex(a=>a._id===l);if(e+=t,e>=0&&e<i.items.length){l=i.items[e]._id;const a=document.querySelector(`.feed-item[data-id="${l}"]`);a&&a.scrollIntoView({block:"nearest"}),i.items[e].read||p(l,{read:!0})}else if(e===-1){l=i.items[0]._id;const a=document.querySelector(`.feed-item[data-id="${l}"]`);a&&a.scrollIntoView({block:"nearest"})}}i.on("feeds-updated",L);i.on("tags-updated",E);i.on("active-feed-updated",L);i.on("active-tag-updated",E);i.on("filter-updated",S);i.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==i.searchQuery&&(t.value=i.searchQuery),w()});i.on("theme-updated",()=>{f||(f=document.querySelector("#app")),f&&(f.className=`theme-${i.theme} font-${i.fontTheme}`)});i.on("sidebar-toggle",()=>{const t=document.querySelector(".layout");t&&(i.sidebarVisible?(t.classList.remove("sidebar-hidden"),t.classList.add("sidebar-visible")):(t.classList.remove("sidebar-visible"),t.classList.add("sidebar-hidden")))});i.on("items-updated",y);i.on("loading-state-changed",y);d.addEventListener("route-changed",w);window.app={navigate:t=>d.navigate(t)};async function O(){const t=await h("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}R(),S();try{await Promise.all([q(),P()])}catch(e){console.error("Initial fetch failed",e)}w()}typeof window<"u"&&!window.__VITEST__&&O();
