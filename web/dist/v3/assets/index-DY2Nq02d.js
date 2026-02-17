(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function i(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=i(n);fetch(n.href,o)}})();function C(e){const i=`; ${document.cookie}`.split(`; ${e}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function f(e,t){const i=t?.method?.toUpperCase()||"GET",a=["POST","PUT","DELETE"].includes(i),n=new Headers(t?.headers||{});if(a){const o=C("csrf_token");o&&n.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:n,credentials:"include"})}function B(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function H(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function q(){const e=B();return e!==null?e:window.innerWidth>1024}class N extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=q();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,i=!1){i?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,H(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,i){this.dispatchEvent(new CustomEvent(t,{detail:i}))}on(t,i){this.addEventListener(t,i)}}const s=new N;class P extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),a=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const o={};return a[0]==="feed"&&a[1]?(n="/feed",o.feedId=a[1]):a[0]==="tag"&&a[1]?(n="/tag",o.tagName=decodeURIComponent(a[1])):a[0]==="settings"&&(n="/settings"),{path:n,params:o,query:t.searchParams}}navigate(t,i){let a=`/v3${t}`;if(i){const n=new URLSearchParams(i);a+=`?${n.toString()}`}window.history.pushState({},"",a),this.handleRouteChange()}updateQuery(t){const i=new URL(window.location.href);for(const[a,n]of Object.entries(t))n?i.searchParams.set(a,n):i.searchParams.delete(a);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const r=new P;function M(e,t=!1){const i=new Date(e.publish_date).toLocaleDateString();return`
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
  `}let c=null,m=null;function O(){m=document.querySelector("#app"),m&&(m.className=`theme-${s.theme} font-${s.fontTheme}`,m.innerHTML=`
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
  `,x())}function x(){document.getElementById("search-input")?.addEventListener("input",n=>{const o=n.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",n=>{n.preventDefault(),X()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{s.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{s.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(n=>{n.addEventListener("click",()=>{n.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",n=>{const o=n.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(n.preventDefault(),r.navigate("/",{}));return}const h=d.getAttribute("data-nav"),g=Object.fromEntries(r.getCurrentRoute().query.entries());if(h==="filter"){n.preventDefault();const u=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...g,filter:u}):r.updateQuery({filter:u})}else if(h==="tag"){n.preventDefault();const u=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,g)}else if(h==="feed"){n.preventDefault();const u=d.getAttribute("data-value"),l=r.getCurrentRoute();s.activeFeedId===parseInt(u)&&l.path!=="/settings"?r.navigate("/",g):r.navigate(`/feed/${u}`,g)}else h==="settings"&&(n.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",g):r.navigate("/settings",g));window.innerWidth<=768&&s.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",n=>{const o=n.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));V(v)}return}const h=o.closest('[data-action="scrape"]');if(h){const l=h.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));J(v)}return}const g=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!g){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(y=>{const A=parseInt(y.getAttribute("data-id")||"0");y.classList.toggle("selected",A===c)});const v=s.items.find(y=>y._id===l);v&&!v.read&&p(l,{read:!0})}})}function k(){const{feeds:e,activeFeedId:t}=s,i=document.getElementById("feed-list");i&&(i.innerHTML=e.map(a=>`
    <li class="${a._id===t?"active":""}">
      <a href="/v3/feed/${a._id}" data-nav="feed" data-value="${a._id}">
        ${a.title||a.url}
      </a>
    </li>
  `).join(""))}function $(){const{tags:e,activeTagName:t}=s,i=document.getElementById("tag-list");i&&(i.innerHTML=e.map(a=>`
    <li class="${a.title===t?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(a.title)}" data-nav="tag" data-value="${a.title}">
        ${a.title}
      </a>
    </li>
  `).join(""))}function _(){const{filter:e}=s,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-filter")===e)})}function L(){const{items:e,loading:t}=s,i=document.getElementById("content-area");if(!i||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){i.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){i.innerHTML='<p class="empty">No items found.</p>';return}i.innerHTML=`
    <ul class="item-list">
      ${e.map(n=>M(n,n._id===c)).join("")}
    </ul>
    ${s.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const a=document.getElementById("main-content");if(a){let n=null;a.onscroll=()=>{!s.loading&&s.hasMore&&a.scrollHeight>a.clientHeight&&a.scrollHeight-a.scrollTop-a.clientHeight<200&&E(),n===null&&(n=window.setTimeout(()=>{F(a),n=null},250))}}}function F(e){const t=e.getBoundingClientRect();s.items.forEach(i=>{if(i.read)return;const a=document.querySelector(`.feed-item[data-id="${i._id}"]`);a&&a.getBoundingClientRect().bottom<t.top&&p(i._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(s.loading||!s.hasMore)return;if(e&&(F(e),e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200)){E();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,i=window.innerHeight,a=window.scrollY||document.documentElement.scrollTop;t>i&&t-i-a<200&&E()},1e3);function w(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
    <div class="settings-view">
      <h2>Settings</h2>
      
      <div class="settings-grid">
        <section class="settings-section">
          <h3>Add Feed</h3>
          <div class="add-feed-form">
            <input type="url" id="new-feed-url" placeholder="https://example.com/rss.xml">
            <button id="add-feed-btn">Add Feed</button>
          </div>
        </section>

        <section class="settings-section">
          <h3>Data</h3>
          <div class="data-group">
            <label>Export</label>
            <div class="button-group">
              <a href="/api/export/opml" class="button" target="_blank">OPML</a>
              <a href="/api/export/text" class="button" target="_blank">TEXT</a>
              <a href="/api/export/json" class="button" target="_blank">JSON</a>
            </div>
          </div>
          <div class="data-group" style="margin-top: 1rem;">
             <label>Import</label>
             <div class="button-group">
               <button class="import-btn" data-format="opml">OPML</button>
               <button class="import-btn" data-format="text">TEXT</button>
               <button class="import-btn" data-format="json">JSON</button>
             </div>
             <input type="file" id="import-file" style="display: none;">
          </div>
        </section>

        <section class="settings-section">
          <h3>Theme</h3>
          <div class="settings-group">
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
      </div>

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        <ul class="manage-feed-list">
          ${s.feeds.map(a=>`
            <li class="manage-feed-item">
              <div class="feed-info">
                <div class="feed-title">${a.title||a.url}</div>
                <div class="feed-url">${a.url}</div>
              </div>
              <div class="feed-actions">
                <input type="text" class="feed-tag-input" data-id="${a._id}" value="${a.category||""}" placeholder="Tag">
                <button class="update-feed-tag-btn" data-id="${a._id}">Save</button>
                <button class="delete-feed-btn" data-id="${a._id}">Delete</button>
              </div>
            </li>
          `).join("")}
        </ul>
      </section>
    </div>
  `,document.getElementById("theme-options")?.addEventListener("click",a=>{const n=a.target.closest("button");n&&(s.setTheme(n.getAttribute("data-theme")),w())}),document.getElementById("font-selector")?.addEventListener("change",a=>{s.setFontTheme(a.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const a=document.getElementById("new-feed-url"),n=a.value.trim();n&&(await D(n)?(a.value="",alert("Feed added successfully!"),b()):alert("Failed to add feed."))});let t="opml";const i=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(a=>{a.addEventListener("click",n=>{t=n.currentTarget.getAttribute("data-format")||"opml",i.click()})}),i?.addEventListener("change",async a=>{const n=a.target.files?.[0];n&&(await j(n,t)?(alert(`Import (${t}) started! check logs.`),b()):alert("Failed to import.")),i.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(a=>{a.addEventListener("click",async n=>{const o=parseInt(n.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await Q(o),await b(),w())})}),document.querySelectorAll(".update-feed-tag-btn").forEach(a=>{a.addEventListener("click",async n=>{const o=parseInt(n.target.getAttribute("data-id")),d=document.querySelector(`.feed-tag-input[data-id="${o}"]`);await U(o,{category:d.value.trim()}),await b(),await R(),w(),alert("Feed updated")})})}async function D(e){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function j(e,t){try{const i=new FormData;i.append("file",e),i.append("format",t);const a=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":a||""},body:i})).ok}catch(i){return console.error("Failed to import",i),!1}}async function Q(e){try{return(await f(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function U(e,t){try{return(await f("/api/feed",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...t,_id:e})})).ok}catch(i){return console.error("Failed to update feed",i),!1}}async function V(e){const t=s.items.find(i=>i._id===e);t&&p(e,{starred:!t.starred})}async function J(e){if(s.items.find(i=>i._id===e))try{const i=await f(`/api/item/${e}/content`);if(i.ok){const a=await i.json();a.full_content&&p(e,{full_content:a.full_content})}}catch(i){console.error("Failed to fetch full content",i)}}async function p(e,t){try{if((await f(`/api/item/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const a=s.items.find(n=>n._id===e);if(a){Object.assign(a,t);const n=document.querySelector(`.feed-item[data-id="${e}"]`);if(n){if(t.read!==void 0&&n.classList.toggle("read",t.read),t.starred!==void 0){const o=n.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",t.starred),o.classList.toggle("is-unstarred",!t.starred),o.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&L()}}}}catch(i){console.error("Failed to update item",i)}}async function b(){const e=await f("/api/feed/");if(e.ok){const t=await e.json();s.setFeeds(t)}}async function R(){const e=await f("/api/tag");if(e.ok){const t=await e.json();s.setTags(t)}}async function I(e,t,i=!1){s.setLoading(!0);try{const a=new URLSearchParams;e&&a.append("feed_id",e),t&&a.append("tag",t),s.searchQuery&&a.append("q",s.searchQuery),(s.filter==="starred"||s.filter==="all")&&a.append("read_filter","all"),s.filter==="starred"&&a.append("starred","true"),i&&s.items.length>0&&a.append("max_id",String(s.items[s.items.length-1]._id));const n=await f(`/api/stream?${a.toString()}`);if(n.ok){const o=await n.json();s.setHasMore(o.length>0),s.setItems(o,i)}}finally{s.setLoading(!1)}}async function E(){const e=r.getCurrentRoute();I(e.params.feedId,e.params.tagName,!0)}async function X(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function S(){const e=r.getCurrentRoute(),t=e.query.get("filter");s.setFilter(t||"unread");const i=e.query.get("q");if(i!==null&&s.setSearchQuery(i),e.path==="/settings"){w();return}if(e.path==="/feed"&&e.params.feedId){const a=parseInt(e.params.feedId);s.setActiveFeed(a),I(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(s.setActiveTag(e.params.tagName),I(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(s.setActiveFeed(null),s.setActiveTag(null),I())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":T(1);break;case"k":T(-1);break;case"r":if(c){const t=s.items.find(i=>i._id===c);t&&p(t._id,{read:!t.read})}break;case"s":if(c){const t=s.items.find(i=>i._id===c);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function T(e){if(s.items.length===0)return;const t=s.items.findIndex(a=>a._id===c);let i;if(t===-1?i=e>0?0:s.items.length-1:i=t+e,i>=0&&i<s.items.length){c=s.items[i]._id,document.querySelectorAll(".feed-item").forEach(n=>{const o=parseInt(n.getAttribute("data-id")||"0");n.classList.toggle("selected",o===c)});const a=document.querySelector(`.feed-item[data-id="${c}"]`);a&&a.scrollIntoView({block:"start",behavior:"smooth"}),s.items[i].read||p(c,{read:!0})}}s.on("feeds-updated",k);s.on("tags-updated",$);s.on("active-feed-updated",k);s.on("active-tag-updated",$);s.on("filter-updated",_);s.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==s.searchQuery&&(e.value=s.searchQuery),S()});s.on("theme-updated",()=>{m||(m=document.querySelector("#app")),m&&(m.className=`theme-${s.theme} font-${s.fontTheme}`)});s.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(s.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});s.on("items-updated",L);s.on("loading-state-changed",L);r.addEventListener("route-changed",S);window.app={navigate:e=>r.navigate(e)};async function W(){const e=await f("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}O(),_();try{await Promise.all([b(),R()])}catch(t){console.error("Initial fetch failed",t)}S()}typeof window<"u"&&!window.__VITEST__&&W();
