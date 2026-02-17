(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function i(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=i(n);fetch(n.href,o)}})();function C(t){const i=`; ${document.cookie}`.split(`; ${t}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function f(t,e){const i=e?.method?.toUpperCase()||"GET",a=["POST","PUT","DELETE"].includes(i),n=new Headers(e?.headers||{});if(a){const o=C("csrf_token");o&&n.set("X-CSRF-Token",o)}return fetch(t,{...e,headers:n,credentials:"include"})}function B(){const t=document.cookie.split("; ").find(e=>e.startsWith("neko_sidebar="));return t?t.split("=")[1]==="1":null}function P(t){document.cookie=`neko_sidebar=${t?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function x(){const t=B();return t!==null?t:window.innerWidth>1024}class M extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=x();setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,i=!1){i?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}setSidebarVisible(e){this.sidebarVisible=e,P(e),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(e,i){this.dispatchEvent(new CustomEvent(e,{detail:i}))}on(e,i){this.addEventListener(e,i)}}const s=new M;class H extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),a=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const o={};return a[0]==="feed"&&a[1]?(n="/feed",o.feedId=a[1]):a[0]==="tag"&&a[1]?(n="/tag",o.tagName=decodeURIComponent(a[1])):a[0]==="settings"&&(n="/settings"),{path:n,params:o,query:e.searchParams}}navigate(e,i){let a=`/v3${e}`;if(i){const n=new URLSearchParams(i);a+=`?${n.toString()}`}window.history.pushState({},"",a),this.handleRouteChange()}updateQuery(e){const i=new URL(window.location.href);for(const[a,n]of Object.entries(e))n?i.searchParams.set(a,n):i.searchParams.delete(a);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const r=new H;function q(t,e=!1){const i=new Date(t.publish_date).toLocaleDateString();return`
    <li class="feed-item ${t.read?"read":"unread"} ${e?"selected":""}" data-id="${t._id}">
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
          ${i}
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
  `}let c=null,g=null;function O(){g=document.querySelector("#app"),g&&(g.className=`theme-${s.theme} font-${s.fontTheme}`,g.innerHTML=`
    <div class="layout ${s.sidebarVisible?"sidebar-visible":"sidebar-hidden"}">
      <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Toggle Sidebar">🐱</button>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <ul id="filter-list">
              <li class="filter-item" data-filter="unread"><a href="/v3/?filter=unread" data-nav="filter" data-value="unread">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="/v3/?filter=all" data-nav="filter" data-value="all">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="/v3/?filter=starred" data-nav="filter" data-value="starred">Starred</a></li>
            </ul>
          </section>
          <div class="sidebar-search">
            <input type="search" id="search-input" placeholder="Search..." value="${s.searchQuery}">
          </div>
          <section class="sidebar-section">
            <ul>
              <li><a href="/v3/settings" data-nav="settings" class="new-feed-link">+ new</a></li>
            </ul>
          </section>
          <section class="sidebar-section collapsible collapsed" id="section-feeds">
            <h3>Feeds <span class="caret">▶</span></h3>
            <ul id="feed-list"></ul>
          </section>
          <section class="sidebar-section collapsible collapsed" id="section-tags">
            <h3>Tags <span class="caret">▶</span></h3>
            <ul id="tag-list"></ul>
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
  `,N())}function N(){document.getElementById("search-input")?.addEventListener("input",n=>{const o=n.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",n=>{n.preventDefault(),J()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{s.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{s.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(n=>{n.addEventListener("click",()=>{n.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",n=>{const o=n.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(n.preventDefault(),r.navigate("/",{}));return}const p=d.getAttribute("data-nav"),m=Object.fromEntries(r.getCurrentRoute().query.entries());if(p==="filter"){n.preventDefault();const u=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...m,filter:u}):r.updateQuery({filter:u})}else if(p==="tag"){n.preventDefault();const u=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,m)}else if(p==="feed"){n.preventDefault();const u=d.getAttribute("data-value"),l=r.getCurrentRoute();s.activeFeedId===parseInt(u)&&l.path!=="/settings"?r.navigate("/",m):r.navigate(`/feed/${u}`,m)}else p==="settings"&&(n.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",m):r.navigate("/settings",m));window.innerWidth<=768&&s.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",n=>{const o=n.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));V(v)}return}const p=o.closest('[data-action="scrape"]');if(p){const l=p.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));W(v)}return}const m=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!m){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(y=>{const A=parseInt(y.getAttribute("data-id")||"0");y.classList.toggle("selected",A===c)});const v=s.items.find(y=>y._id===l);v&&!v.read&&h(l,{read:!0})}})}function k(){const{feeds:t,activeFeedId:e}=s,i=document.getElementById("feed-list");i&&(i.innerHTML=t.map(a=>`
    <li class="${a._id===e?"active":""}">
      <a href="/v3/feed/${a._id}" data-nav="feed" data-value="${a._id}">
        ${a.title||a.url}
      </a>
    </li>
  `).join(""))}function $(){const{tags:t,activeTagName:e}=s,i=document.getElementById("tag-list");i&&(i.innerHTML=t.map(a=>`
    <li class="${a.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(a.title)}" data-nav="tag" data-value="${a.title}">
        ${a.title}
      </a>
    </li>
  `).join(""))}function _(){const{filter:t}=s,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-filter")===t)})}function L(){const{items:t,loading:e}=s,i=document.getElementById("content-area");if(!i||r.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){i.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){i.innerHTML='<p class="empty">No items found.</p>';return}i.innerHTML=`
    <ul class="item-list">
      ${t.map(n=>q(n,n._id===c)).join("")}
    </ul>
    ${s.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const a=document.getElementById("main-content");if(a){let n=null;a.onscroll=()=>{!s.loading&&s.hasMore&&a.scrollHeight>a.clientHeight&&a.scrollHeight-a.scrollTop-a.clientHeight<200&&E(),n===null&&(n=window.setTimeout(()=>{F(a),n=null},250))}}}function F(t){const e=t.getBoundingClientRect();s.items.forEach(i=>{if(i.read)return;const a=document.querySelector(`.feed-item[data-id="${i._id}"]`);a&&a.getBoundingClientRect().bottom<e.top&&h(i._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const t=document.getElementById("main-content");if(s.loading||!s.hasMore)return;if(t&&(F(t),t.scrollHeight>t.clientHeight&&t.scrollHeight-t.scrollTop-t.clientHeight<200)){E();return}const e=document.documentElement.scrollHeight||document.body.scrollHeight,i=window.innerHeight,a=window.scrollY||document.documentElement.scrollTop;e>i&&e-i-a<200&&E()},1e3);function w(){const t=document.getElementById("content-area");t&&(t.innerHTML=`
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
            <button class="${s.theme==="light"?"active":""}" data-theme="light">Light</button>
            <button class="${s.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
          </div>
        </div>
        <div class="settings-group" style="margin-top: 1rem;">
          <label>Font</label>
          <select id="font-selector">
            <option value="default" ${s.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
            <option value="serif" ${s.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
            <option value="sans" ${s.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
            <option value="mono" ${s.fontTheme==="mono"?"selected":""}>Monospace</option>
          </select>
        </div>
      </section>

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        <ul class="manage-feed-list" style="list-style: none; padding: 0;">
          ${s.feeds.map(e=>`
            <li class="manage-feed-item" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.5rem;">
              <div class="feed-info">
                <div class="feed-title" style="font-weight: bold;">${e.title||e.url}</div>
                <div class="feed-url" style="font-size: 0.8em; color: var(--text-color); opacity: 0.6; overflow: hidden; text-overflow: ellipsis;">${e.url}</div>
              </div>
              <div class="feed-actions" style="display: flex; gap: 0.5rem;">
                <input type="text" class="feed-tag-input" data-id="${e._id}" value="${e.category||""}" placeholder="Tag" style="flex: 1;">
                <button class="update-feed-tag-btn" data-id="${e._id}">Save</button>
                <button class="delete-feed-btn" data-id="${e._id}" style="color: var(--error-color, #ff4444);">Delete</button>
              </div>
            </li>
          `).join("")}
        </ul>
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
  `,document.getElementById("theme-options")?.addEventListener("click",e=>{const i=e.target.closest("button");if(i){const a=i.getAttribute("data-theme");s.setTheme(a),w()}}),document.getElementById("font-selector")?.addEventListener("change",e=>{s.setFontTheme(e.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const e=document.getElementById("new-feed-url"),i=e.value.trim();i&&(await D(i)?(e.value="",alert("Feed added successfully!"),b()):alert("Failed to add feed."))}),document.getElementById("export-opml-btn")?.addEventListener("click",()=>{window.location.href="/api/export/opml"}),document.getElementById("import-opml-file")?.addEventListener("change",async e=>{const i=e.target.files?.[0];i&&(await Q(i)?(alert("OPML imported successfully! Crawling started."),b()):alert("Failed to import OPML."))}),document.querySelectorAll(".delete-feed-btn").forEach(e=>{e.addEventListener("click",async i=>{const a=parseInt(i.target.getAttribute("data-id"));confirm("Are you sure you want to delete this feed?")&&(await j(a),b(),await b(),w())})}),document.querySelectorAll(".update-feed-tag-btn").forEach(e=>{e.addEventListener("click",async i=>{const a=parseInt(i.target.getAttribute("data-id")),o=document.querySelector(`.feed-tag-input[data-id="${a}"]`).value.trim();await U(a,{category:o}),await b(),await R(),w(),alert("Feed updated")})}))}async function D(t){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})})).ok}catch(e){return console.error("Failed to add feed",e),!1}}async function Q(t){try{const e=new FormData;e.append("file",t),e.append("format","opml");const i=document.cookie.split("; ").find(n=>n.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:e})).ok}catch(e){return console.error("Failed to import OPML",e),!1}}async function j(t){try{return(await f(`/api/feed/${t}`,{method:"DELETE"})).ok}catch(e){return console.error("Failed to delete feed",e),!1}}async function U(t,e){try{return(await f("/api/feed",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,_id:t})})).ok}catch(i){return console.error("Failed to update feed",i),!1}}async function V(t){const e=s.items.find(i=>i._id===t);e&&h(t,{starred:!e.starred})}async function W(t){if(s.items.find(i=>i._id===t))try{const i=await f(`/api/item/${t}/content`);if(i.ok){const a=await i.json();a.full_content&&h(t,{full_content:a.full_content})}}catch(i){console.error("Failed to fetch full content",i)}}async function h(t,e){try{if((await f(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const a=s.items.find(n=>n._id===t);if(a){Object.assign(a,e);const n=document.querySelector(`.feed-item[data-id="${t}"]`);if(n){if(e.read!==void 0&&n.classList.toggle("read",e.read),e.starred!==void 0){const o=n.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",e.starred),o.classList.toggle("is-unstarred",!e.starred),o.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&L()}}}}catch(i){console.error("Failed to update item",i)}}async function b(){const t=await f("/api/feed/");if(t.ok){const e=await t.json();s.setFeeds(e)}}async function R(){const t=await f("/api/tag");if(t.ok){const e=await t.json();s.setTags(e)}}async function I(t,e,i=!1){s.setLoading(!0);try{const a=new URLSearchParams;t&&a.append("feed_id",t),e&&a.append("tag",e),s.searchQuery&&a.append("q",s.searchQuery),(s.filter==="starred"||s.filter==="all")&&a.append("read_filter","all"),s.filter==="starred"&&a.append("starred","true"),i&&s.items.length>0&&a.append("max_id",String(s.items[s.items.length-1]._id));const n=await f(`/api/stream?${a.toString()}`);if(n.ok){const o=await n.json();s.setHasMore(o.length>0),s.setItems(o,i)}}finally{s.setLoading(!1)}}async function E(){const t=r.getCurrentRoute();I(t.params.feedId,t.params.tagName,!0)}async function J(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function S(){const t=r.getCurrentRoute(),e=t.query.get("filter");s.setFilter(e||"unread");const i=t.query.get("q");if(i!==null&&s.setSearchQuery(i),t.path==="/settings"){w();return}if(t.path==="/feed"&&t.params.feedId){const a=parseInt(t.params.feedId);s.setActiveFeed(a),I(t.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else t.path==="/tag"&&t.params.tagName?(s.setActiveTag(t.params.tagName),I(void 0,t.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(s.setActiveFeed(null),s.setActiveTag(null),I())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":T(1);break;case"k":T(-1);break;case"r":if(c){const e=s.items.find(i=>i._id===c);e&&h(e._id,{read:!e.read})}break;case"s":if(c){const e=s.items.find(i=>i._id===c);e&&h(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function T(t){if(s.items.length===0)return;const e=s.items.findIndex(a=>a._id===c);let i;if(e===-1?i=t>0?0:s.items.length-1:i=e+t,i>=0&&i<s.items.length){c=s.items[i]._id,document.querySelectorAll(".feed-item").forEach(n=>{const o=parseInt(n.getAttribute("data-id")||"0");n.classList.toggle("selected",o===c)});const a=document.querySelector(`.feed-item[data-id="${c}"]`);a&&a.scrollIntoView({block:"start",behavior:"smooth"}),s.items[i].read||h(c,{read:!0})}}s.on("feeds-updated",k);s.on("tags-updated",$);s.on("active-feed-updated",k);s.on("active-tag-updated",$);s.on("filter-updated",_);s.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==s.searchQuery&&(t.value=s.searchQuery),S()});s.on("theme-updated",()=>{g||(g=document.querySelector("#app")),g&&(g.className=`theme-${s.theme} font-${s.fontTheme}`)});s.on("sidebar-toggle",()=>{const t=document.querySelector(".layout");t&&(s.sidebarVisible?(t.classList.remove("sidebar-hidden"),t.classList.add("sidebar-visible")):(t.classList.remove("sidebar-visible"),t.classList.add("sidebar-hidden")))});s.on("items-updated",L);s.on("loading-state-changed",L);r.addEventListener("route-changed",S);window.app={navigate:t=>r.navigate(t)};async function X(){const t=await f("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}O(),_();try{await Promise.all([b(),R()])}catch(e){console.error("Initial fetch failed",e)}S()}typeof window<"u"&&!window.__VITEST__&&X();
