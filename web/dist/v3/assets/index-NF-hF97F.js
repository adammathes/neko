(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function a(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=a(s);fetch(s.href,r)}})();function F(t){const a=`; ${document.cookie}`.split(`; ${t}=`);if(a.length===2)return a.pop()?.split(";").shift()}async function m(t,e){const a=e?.method?.toUpperCase()||"GET",n=["POST","PUT","DELETE"].includes(a),s=new Headers(e?.headers||{});if(n){const r=F("csrf_token");r&&s.set("X-CSRF-Token",r)}return fetch(t,{...e,headers:s,credentials:"include"})}class _ extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=window.innerWidth>768;setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,a=!1){a?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}setSidebarVisible(e){this.sidebarVisible=e,this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(e,a){this.dispatchEvent(new CustomEvent(e,{detail:a}))}on(e,a){this.addEventListener(e,a)}}const i=new _;class A extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),n=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const r={};return n[0]==="feed"&&n[1]?(s="/feed",r.feedId=n[1]):n[0]==="tag"&&n[1]?(s="/tag",r.tagName=decodeURIComponent(n[1])):n[0]==="settings"&&(s="/settings"),{path:s,params:r,query:e.searchParams}}navigate(e,a){let n=`/v3${e}`;if(a){const s=new URLSearchParams(a);n+=`?${s.toString()}`}window.history.pushState({},"",n),this.handleRouteChange()}updateQuery(e){const a=new URL(window.location.href);for(const[n,s]of Object.entries(e))s?a.searchParams.set(n,s):a.searchParams.delete(n);window.history.pushState({},"",a.toString()),this.handleRouteChange()}}const o=new A;function B(t){const e=new Date(t.publish_date).toLocaleDateString();return`
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
  `,P())}function P(){document.getElementById("search-input")?.addEventListener("input",s=>{const r=s.target.value;o.updateQuery({q:r})}),document.getElementById("logo-link")?.addEventListener("click",()=>o.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),D()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{i.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{i.setSidebarVisible(!1)}),window.addEventListener("resize",()=>{window.innerWidth>768&&!i.sidebarVisible&&i.setSidebarVisible(!0)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const d=s.target.closest("a");if(!d)return;const g=d.getAttribute("data-nav"),h=Object.fromEntries(o.getCurrentRoute().query.entries());if(g==="filter"){s.preventDefault();const c=d.getAttribute("data-value");o.updateQuery({filter:c})}else if(g==="tag"){s.preventDefault();const c=d.getAttribute("data-value");o.navigate(`/tag/${encodeURIComponent(c)}`,h)}else if(g==="feed"){s.preventDefault();const c=d.getAttribute("data-value");i.activeFeedId===parseInt(c)?o.navigate("/",h):o.navigate(`/feed/${c}`,h)}else g==="settings"&&(s.preventDefault(),o.navigate("/settings",h));window.innerWidth<=768&&i.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const r=s.target,d=r.closest('[data-action="toggle-star"]');if(d){const u=d.closest("[data-id]");if(u){const p=parseInt(u.getAttribute("data-id"));O(p)}return}const g=r.closest('[data-action="scrape"]');if(g){const u=g.closest("[data-id]");if(u){const p=parseInt(u.getAttribute("data-id"));N(p)}return}const h=r.closest('[data-action="open"]'),c=r.closest(".feed-item");if(c&&!h){const u=parseInt(c.getAttribute("data-id")),p=i.items.find($=>$._id===u);p&&!p.read&&v(u,{read:!0})}})}function E(){const{feeds:t,activeFeedId:e}=i,a=document.getElementById("feed-list");a&&(a.innerHTML=t.map(n=>`
    <li class="${n._id===e?"active":""}">
      <a href="/v3/feed/${n._id}" data-nav="feed" data-value="${n._id}">
        ${n.title||n.url}
      </a>
    </li>
  `).join(""))}function S(){const{tags:t,activeTagName:e}=i,a=document.getElementById("tag-list");a&&(a.innerHTML=t.map(n=>`
    <li class="${n.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(n.title)}" data-nav="tag" data-value="${n.title}">
        ${n.title}
      </a>
    </li>
  `).join(""))}function T(){const{filter:t}=i,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(a=>{a.classList.toggle("active",a.getAttribute("data-filter")===t)})}function w(){const{items:t,loading:e}=i,a=document.getElementById("content-area");if(!a||o.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){a.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){a.innerHTML='<p class="empty">No items found.</p>';return}a.innerHTML=`
    <ul class="item-list">
      ${t.map(s=>B(s)).join("")}
    </ul>
    ${i.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const n=document.getElementById("load-more-sentinel");n&&new IntersectionObserver(r=>{r[0].isIntersecting&&!i.loading&&i.hasMore&&Q()},{threshold:.1}).observe(n)}function k(){const t=document.getElementById("content-area");t&&(t.innerHTML=`
    <div class="settings-view">
      <h2>Settings</h2>
      
      <section class="settings-section">
        <h3>Add Feed</h3>
        <div class="add-feed-form">
          <input type="url" id="new-feed-url" placeholder="https://example.com/rss.xml">
          <button id="add-feed-btn">Add Feed</button>
        </div>
      </section>

      <section class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-group">
          <label>Theme</label>
          <div class="theme-options" id="theme-options">
            <button class="${i.theme==="light"?"active":""}" data-theme="light">Light</button>
            <button class="${i.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
          </div>
        </div>
        <div class="settings-group" style="margin-top: 1rem;">
          <label>Font</label>
          <select id="font-selector">
            <option value="default" ${i.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
            <option value="serif" ${i.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
            <option value="sans" ${i.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
            <option value="mono" ${i.fontTheme==="mono"?"selected":""}>Monospace</option>
          </select>
        </div>
      </section>

      <section class="settings-section">
        <h3>Data Management</h3>
        <div class="data-actions">
          <button id="export-opml-btn">Export OPML</button>
          <div class="import-section" style="margin-top: 1rem;">
            <label for="import-opml-file" class="button">Import OPML</label>
            <input type="file" id="import-opml-file" accept=".opml,.xml" style="display: none;">
          </div>
        </div>
      </section>
    </div>
  `,document.getElementById("theme-options")?.addEventListener("click",e=>{const a=e.target.closest("button");if(a){const n=a.getAttribute("data-theme");i.setTheme(n),k()}}),document.getElementById("font-selector")?.addEventListener("change",e=>{i.setFontTheme(e.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const e=document.getElementById("new-feed-url"),a=e.value.trim();a&&(await C(a)?(e.value="",alert("Feed added successfully!"),y()):alert("Failed to add feed."))}),document.getElementById("export-opml-btn")?.addEventListener("click",()=>{window.location.href="/api/export/opml"}),document.getElementById("import-opml-file")?.addEventListener("change",async e=>{const a=e.target.files?.[0];a&&(await M(a)?(alert("OPML imported successfully! Crawling started."),y()):alert("Failed to import OPML."))}))}async function C(t){try{return(await m("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})})).ok}catch(e){return console.error("Failed to add feed",e),!1}}async function M(t){try{const e=new FormData;e.append("file",t),e.append("format","opml");const a=document.cookie.split("; ").find(s=>s.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":a||""},body:e})).ok}catch(e){return console.error("Failed to import OPML",e),!1}}async function O(t){const e=i.items.find(a=>a._id===t);e&&v(t,{starred:!e.starred})}async function N(t){if(i.items.find(a=>a._id===t))try{const a=await m(`/api/item/${t}/content`);if(a.ok){const n=await a.json();n.full_content&&v(t,{full_content:n.full_content})}}catch(a){console.error("Failed to fetch full content",a)}}async function v(t,e){try{if((await m(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const n=i.items.find(s=>s._id===t);if(n){Object.assign(n,e);const s=document.querySelector(`.feed-item[data-id="${t}"]`);if(s){if(e.read!==void 0&&s.classList.toggle("read",e.read),e.starred!==void 0){const r=s.querySelector(".star-btn");r&&(r.classList.toggle("is-starred",e.starred),r.classList.toggle("is-unstarred",!e.starred),r.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&w()}}}}catch(a){console.error("Failed to update item",a)}}async function y(){const t=await m("/api/feed/");if(t.ok){const e=await t.json();i.setFeeds(e)}}async function q(){const t=await m("/api/tag");if(t.ok){const e=await t.json();i.setTags(e)}}async function b(t,e,a=!1){i.setLoading(!0);try{const n=new URLSearchParams;t&&n.append("feed_id",t),e&&n.append("tag",e),i.searchQuery&&n.append("q",i.searchQuery),(i.filter==="starred"||i.filter==="all")&&n.append("read_filter","all"),i.filter==="starred"&&n.append("starred","true"),a&&i.items.length>0&&n.append("max_id",String(i.items[i.items.length-1]._id));const s=await m(`/api/stream?${n.toString()}`);if(s.ok){const r=await s.json();i.setHasMore(r.length>=50),i.setItems(r,a)}}finally{i.setLoading(!1)}}async function Q(){const t=o.getCurrentRoute();b(t.params.feedId,t.params.tagName,!0)}async function D(){await m("/api/logout",{method:"POST"}),window.location.href="/login/"}function L(){const t=o.getCurrentRoute(),e=t.query.get("filter");i.setFilter(e||"unread");const a=t.query.get("q");if(a!==null&&i.setSearchQuery(a),t.path==="/settings"){k();return}if(t.path==="/feed"&&t.params.feedId){const n=parseInt(t.params.feedId);i.setActiveFeed(n),b(t.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else t.path==="/tag"&&t.params.tagName?(i.setActiveTag(t.params.tagName),b(void 0,t.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(i.setActiveFeed(null),i.setActiveTag(null),b())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":I(1);break;case"k":I(-1);break;case"r":if(l){const e=i.items.find(a=>a._id===l);e&&v(e._id,{read:!e.read})}break;case"s":if(l){const e=i.items.find(a=>a._id===l);e&&v(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function I(t){if(i.items.length===0)return;let e=i.items.findIndex(a=>a._id===l);if(e+=t,e>=0&&e<i.items.length){l=i.items[e]._id;const a=document.querySelector(`.feed-item[data-id="${l}"]`);a&&a.scrollIntoView({block:"nearest"}),i.items[e].read||v(l,{read:!0})}else if(e===-1){l=i.items[0]._id;const a=document.querySelector(`.feed-item[data-id="${l}"]`);a&&a.scrollIntoView({block:"nearest"})}}i.on("feeds-updated",E);i.on("tags-updated",S);i.on("active-feed-updated",E);i.on("active-tag-updated",S);i.on("filter-updated",T);i.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==i.searchQuery&&(t.value=i.searchQuery),L()});i.on("theme-updated",()=>{f||(f=document.querySelector("#app")),f&&(f.className=`theme-${i.theme} font-${i.fontTheme}`)});i.on("sidebar-toggle",()=>{const t=document.querySelector(".layout");t&&(i.sidebarVisible?(t.classList.remove("sidebar-hidden"),t.classList.add("sidebar-visible")):(t.classList.remove("sidebar-visible"),t.classList.add("sidebar-hidden")))});i.on("items-updated",w);i.on("loading-state-changed",w);o.addEventListener("route-changed",L);window.app={navigate:t=>o.navigate(t)};async function U(){const t=await m("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}R(),T();try{await Promise.all([y(),q()])}catch(e){console.error("Initial fetch failed",e)}L()}typeof window<"u"&&!window.__VITEST__&&U();
