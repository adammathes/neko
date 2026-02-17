(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function i(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(s){if(s.ep)return;s.ep=!0;const r=i(s);fetch(s.href,r)}})();function A(e){const i=`; ${document.cookie}`.split(`; ${e}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function f(e,t){const i=t?.method?.toUpperCase()||"GET",a=["POST","PUT","DELETE"].includes(i),s=new Headers(t?.headers||{});if(a){const r=A("csrf_token");r&&s.set("X-CSRF-Token",r)}return fetch(e,{...t,headers:s,credentials:"include"})}function C(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function B(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function P(){const e=C();return e!==null?e:window.innerWidth>1024}class O extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=P();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,i=!1){i?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,B(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,i){this.dispatchEvent(new CustomEvent(t,{detail:i}))}on(t,i){this.addEventListener(t,i)}}const n=new O;class M extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),a=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const r={};return a[0]==="feed"&&a[1]?(s="/feed",r.feedId=a[1]):a[0]==="tag"&&a[1]?(s="/tag",r.tagName=decodeURIComponent(a[1])):a[0]==="settings"&&(s="/settings"),{path:s,params:r,query:t.searchParams}}navigate(t,i){let a=`/v3${t}`;if(i){const s=new URLSearchParams(i);a+=`?${s.toString()}`}window.history.pushState({},"",a),this.handleRouteChange()}updateQuery(t){const i=new URL(window.location.href);for(const[a,s]of Object.entries(t))s?i.searchParams.set(a,s):i.searchParams.delete(a);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const o=new M;function H(e,t=!1){const i=new Date(e.publish_date).toLocaleDateString();return`
    <li class="feed-item ${e.read?"read":"unread"} ${t?"selected":""}" data-id="${e._id}">
      <div class="item-header">
        <a href="${e.url}" target="_blank" rel="noopener noreferrer" class="item-title" data-action="open">
          ${e.title||"(No Title)"}
        </a>
        <button class="star-btn ${e.starred?"is-starred":"is-unstarred"}" title="${e.starred?"Unstar":"Star"}" data-action="toggle-star">
          ★
        </button>
      </div>
      <div class="dateline">
        <a href="${e.url}" target="_blank" rel="noopener noreferrer">
          ${i}
          ${e.feed_title?` - ${e.feed_title}`:""}
        </a>
        <div class="item-actions" style="display: inline-block; float: right;">
          ${e.full_content?"":`
            <button class="scrape-btn" title="Load Full Content" data-action="scrape">
              text
            </button>
          `}
        </div>
      </div>
      ${e.full_content||e.description?`
        <div class="item-description">
          ${e.full_content||e.description}
        </div>
      `:""}
    </li>
  `}let c=null,m=null;function D(){m=document.querySelector("#app"),m&&(m.className=`theme-${n.theme} font-${n.fontTheme}`,m.innerHTML=`
    <div class="layout ${n.sidebarVisible?"sidebar-visible":"sidebar-hidden"}">
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
            <input type="search" id="search-input" placeholder="Search..." value="${n.searchQuery}">
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
          <!-- FIXME: Tags feature soft-deprecated 
          <section class="sidebar-section collapsible collapsed" id="section-tags">
            <h3>Tags <span class="caret">▶</span></h3>
            <ul id="tag-list"></ul>
          </section>
          -->
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
  `,q())}function q(){document.getElementById("search-input")?.addEventListener("input",s=>{const r=s.target.value;o.updateQuery({q:r})}),document.getElementById("logo-link")?.addEventListener("click",()=>o.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),X()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{n.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{n.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const r=s.target,d=r.closest("a");if(!d){r.classList.contains("logo")&&(s.preventDefault(),o.navigate("/",{}));return}const h=d.getAttribute("data-nav"),g=Object.fromEntries(o.getCurrentRoute().query.entries());if(h==="filter"){s.preventDefault();const u=d.getAttribute("data-value");o.getCurrentRoute().path==="/settings"?o.navigate("/",{...g,filter:u}):o.updateQuery({filter:u})}else if(h==="tag"){s.preventDefault();const u=d.getAttribute("data-value");o.navigate(`/tag/${encodeURIComponent(u)}`,g)}else if(h==="feed"){s.preventDefault();const u=d.getAttribute("data-value"),l=o.getCurrentRoute();n.activeFeedId===parseInt(u)&&l.path!=="/settings"?o.navigate("/",g):o.navigate(`/feed/${u}`,g)}else h==="settings"&&(s.preventDefault(),o.getCurrentRoute().path==="/settings"?o.navigate("/",g):o.navigate("/settings",g));window.innerWidth<=768&&n.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const r=s.target,d=r.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));j(v)}return}const h=r.closest('[data-action="scrape"]');if(h){const l=h.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));V(v)}return}const g=r.closest('[data-action="open"]'),u=r.closest(".feed-item");if(u&&!g){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(b=>{const F=parseInt(b.getAttribute("data-id")||"0");b.classList.toggle("selected",F===c)});const v=n.items.find(b=>b._id===l);v&&!v.read&&p(l,{read:!0})}})}function k(){const{feeds:e,activeFeedId:t}=n,i=document.getElementById("feed-list");i&&(i.innerHTML=e.map(a=>`
    <li class="${a._id===t?"active":""}">
      <a href="/v3/feed/${a._id}" data-nav="feed" data-value="${a._id}">
        ${a.title||a.url}
      </a>
    </li>
  `).join(""))}function $(){}function _(){const{filter:e}=n,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-filter")===e)})}function T(){const{items:e,loading:t}=n,i=document.getElementById("content-area");if(!i||o.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){i.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){i.innerHTML='<p class="empty">No items found.</p>';return}i.innerHTML=`
    <ul class="item-list">
      ${e.map(s=>H(s,s._id===c)).join("")}
    </ul>
    ${n.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const a=document.getElementById("main-content");if(a){let s=null;a.onscroll=()=>{!n.loading&&n.hasMore&&a.scrollHeight>a.clientHeight&&a.scrollHeight-a.scrollTop-a.clientHeight<200&&w(),s===null&&(s=window.setTimeout(()=>{R(a),s=null},250))}}}function R(e){const t=e.getBoundingClientRect();n.items.forEach(i=>{if(i.read)return;const a=document.querySelector(`.feed-item[data-id="${i._id}"]`);a&&a.getBoundingClientRect().bottom<t.top&&p(i._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(n.loading||!n.hasMore)return;if(e&&(R(e),e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200)){w();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,i=window.innerHeight,a=window.scrollY||document.documentElement.scrollTop;t>i&&t-i-a<200&&w()},1e3);function I(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
    <div class="settings-view">
      <h2>Settings</h2>
      
      <div class="settings-grid">
        <section class="settings-section">
          <h3>Data</h3>
          <div class="data-group">
            <div class="button-group">
              <a href="/api/export/opml" class="button" target="_blank">EXPORT OPML</a>
              <a href="/api/export/text" class="button" target="_blank">EXPORT TEXT</a>
              <a href="/api/export/json" class="button" target="_blank">EXPORT JSON</a>
            </div>
          </div>
          <div class="data-group" style="margin-top: 1rem;">
             <div class="button-group">
               <button class="import-btn" data-format="opml">IMPORT OPML</button>
               <button class="import-btn" data-format="text">IMPORT TEXT</button>
               <button class="import-btn" data-format="json">IMPORT JSON</button>
             </div>
             <input type="file" id="import-file" style="display: none;">
          </div>
        </section>

        <section class="settings-section">
          <h3>Theme</h3>
          <div class="settings-group">
            <div class="theme-options" id="theme-options">
              <button class="${n.theme==="light"?"active":""}" data-theme="light">Light</button>
              <button class="${n.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
            </div>
          </div>
          <div class="settings-group" style="margin-top: 1rem;">
            <select id="font-selector">
              <option value="default" ${n.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
              <option value="serif" ${n.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
              <option value="sans" ${n.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
              <option value="mono" ${n.fontTheme==="mono"?"selected":""}>Monospace</option>
            </select>
          </div>
        </section>
      </div>

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        
        <div class="add-feed-form" style="margin-bottom: 2rem;">
            <input type="url" id="new-feed-url" placeholder="https://example.com/rss.xml">
            <button id="add-feed-btn">ADD FEED</button>
        </div>

        <ul class="manage-feed-list">
          ${n.feeds.map(a=>`
            <li class="manage-feed-item">
              <div class="feed-info">
                <div class="feed-title">${a.title||a.url}</div>
                <div class="feed-url">${a.url}</div>
              </div>
              <div class="feed-actions">
                <!-- FIXME: Tags feature is broken/unused in V3. Soft deprecated for now.
                <input type="text" class="feed-tag-input" data-id="${a._id}" value="${a.category||""}" placeholder="Tag">
                <button class="update-feed-tag-btn" data-id="${a._id}">SAVE</button>
                -->
                <button class="delete-feed-btn" data-id="${a._id}">DELETE</button>
              </div>
            </li>
          `).join("")}
        </ul>
      </section>
    </div>
  `,document.getElementById("theme-options")?.addEventListener("click",a=>{const s=a.target.closest("button");s&&(n.setTheme(s.getAttribute("data-theme")),I())}),document.getElementById("font-selector")?.addEventListener("change",a=>{n.setFontTheme(a.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const a=document.getElementById("new-feed-url"),s=a.value.trim();s&&(await N(s)?(a.value="",alert("Feed added successfully!"),y()):alert("Failed to add feed."))});let t="opml";const i=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(a=>{a.addEventListener("click",s=>{t=s.currentTarget.getAttribute("data-format")||"opml",i.click()})}),i?.addEventListener("change",async a=>{const s=a.target.files?.[0];s&&(await x(s,t)?(alert(`Import (${t}) started! check logs.`),y()):alert("Failed to import.")),i.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(a=>{a.addEventListener("click",async s=>{const r=parseInt(s.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await Q(r),await y(),I())})})}async function N(e){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function x(e,t){try{const i=new FormData;i.append("file",e),i.append("format",t);const a=document.cookie.split("; ").find(r=>r.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":a||""},body:i})).ok}catch(i){return console.error("Failed to import",i),!1}}async function Q(e){try{return(await f(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function j(e){const t=n.items.find(i=>i._id===e);t&&p(e,{starred:!t.starred})}async function V(e){if(n.items.find(i=>i._id===e))try{const i=await f(`/api/item/${e}/content`);if(i.ok){const a=await i.json();a.full_content&&p(e,{full_content:a.full_content})}}catch(i){console.error("Failed to fetch full content",i)}}async function p(e,t){try{if((await f(`/api/item/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const a=n.items.find(s=>s._id===e);if(a){Object.assign(a,t);const s=document.querySelector(`.feed-item[data-id="${e}"]`);if(s){if(t.read!==void 0&&s.classList.toggle("read",t.read),t.starred!==void 0){const r=s.querySelector(".star-btn");r&&(r.classList.toggle("is-starred",t.starred),r.classList.toggle("is-unstarred",!t.starred),r.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&T()}}}}catch(i){console.error("Failed to update item",i)}}async function y(){const e=await f("/api/feed/");if(e.ok){const t=await e.json();n.setFeeds(t)}}async function U(){const e=await f("/api/tag");if(e.ok){const t=await e.json();n.setTags(t)}}async function E(e,t,i=!1){n.setLoading(!0);try{const a=new URLSearchParams;e&&a.append("feed_id",e),t&&a.append("tag",t),n.searchQuery&&a.append("q",n.searchQuery),(n.filter==="starred"||n.filter==="all")&&a.append("read_filter","all"),n.filter==="starred"&&a.append("starred","true"),i&&n.items.length>0&&a.append("max_id",String(n.items[n.items.length-1]._id));const s=await f(`/api/stream?${a.toString()}`);if(s.ok){const r=await s.json();n.setHasMore(r.length>0),n.setItems(r,i)}}finally{n.setLoading(!1)}}async function w(){const e=o.getCurrentRoute();E(e.params.feedId,e.params.tagName,!0)}async function X(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function L(){const e=o.getCurrentRoute(),t=e.query.get("filter");n.setFilter(t||"unread");const i=e.query.get("q");if(i!==null&&n.setSearchQuery(i),e.path==="/settings"){I();return}if(e.path==="/feed"&&e.params.feedId){const a=parseInt(e.params.feedId);n.setActiveFeed(a),E(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(n.setActiveTag(e.params.tagName),E(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(n.setActiveFeed(null),n.setActiveTag(null),E())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":S(1);break;case"k":S(-1);break;case"r":if(c){const t=n.items.find(i=>i._id===c);t&&p(t._id,{read:!t.read})}break;case"s":if(c){const t=n.items.find(i=>i._id===c);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function S(e){if(n.items.length===0)return;const t=n.items.findIndex(a=>a._id===c);let i;if(t===-1?i=e>0?0:n.items.length-1:i=t+e,i>=0&&i<n.items.length){c=n.items[i]._id,document.querySelectorAll(".feed-item").forEach(s=>{const r=parseInt(s.getAttribute("data-id")||"0");s.classList.toggle("selected",r===c)});const a=document.querySelector(`.feed-item[data-id="${c}"]`);a&&a.scrollIntoView({block:"start",behavior:"smooth"}),n.items[i].read||p(c,{read:!0})}}n.on("feeds-updated",k);n.on("tags-updated",$);n.on("active-feed-updated",k);n.on("active-tag-updated",$);n.on("filter-updated",_);n.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==n.searchQuery&&(e.value=n.searchQuery),L()});n.on("theme-updated",()=>{m||(m=document.querySelector("#app")),m&&(m.className=`theme-${n.theme} font-${n.fontTheme}`)});n.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(n.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});n.on("items-updated",T);n.on("loading-state-changed",T);o.addEventListener("route-changed",L);window.app={navigate:e=>o.navigate(e)};async function J(){const e=await f("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}D(),_();try{await Promise.all([y(),U()])}catch(t){console.error("Initial fetch failed",t)}L()}typeof window<"u"&&!window.__VITEST__&&J();
