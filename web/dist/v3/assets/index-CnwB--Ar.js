(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function s(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(n){if(n.ep)return;n.ep=!0;const o=s(n);fetch(n.href,o)}})();function A(e){const s=`; ${document.cookie}`.split(`; ${e}=`);if(s.length===2)return s.pop()?.split(";").shift()}async function f(e,t){const s=t?.method?.toUpperCase()||"GET",i=["POST","PUT","DELETE"].includes(s),n=new Headers(t?.headers||{});if(i){const o=A("csrf_token");o&&n.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:n,credentials:"include"})}function C(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function B(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function H(){const e=C();return e!==null?e:window.innerWidth>1024}class P extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";styleTheme=localStorage.getItem("neko-style-theme")||"default";sidebarVisible=H();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,s=!1){s?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setHeadingFontTheme(t){this.headingFontTheme=t,localStorage.setItem("neko-heading-font-theme",t),this.emit("theme-updated")}setStyleTheme(t){this.styleTheme=t,localStorage.setItem("neko-style-theme",t),this.emit("style-theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,B(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,s){this.dispatchEvent(new CustomEvent(t,{detail:s}))}on(t,s){this.addEventListener(t,s)}}const a=new P;class M extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),i=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const o={};return i[0]==="feed"&&i[1]?(n="/feed",o.feedId=i[1]):i[0]==="tag"&&i[1]?(n="/tag",o.tagName=decodeURIComponent(i[1])):i[0]==="settings"&&(n="/settings"),{path:n,params:o,query:t.searchParams}}navigate(t,s){let i=`/v3${t}`;if(s){const n=new URLSearchParams(s);i+=`?${n.toString()}`}window.history.pushState({},"",i),this.handleRouteChange()}updateQuery(t){const s=new URL(window.location.href);for(const[i,n]of Object.entries(t))n?s.searchParams.set(i,n):s.searchParams.delete(i);window.history.pushState({},"",s.toString()),this.handleRouteChange()}}const r=new M;function O(e){const t=new Date(e.publish_date).toLocaleDateString();return`
    <li class="feed-item ${e.read?"read":"unread"}" data-id="${e._id}">
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
          ${t}
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
  `}const q=["default","refined","terminal","codex","sakura"];function w(e){const t=document.getElementById("style-theme-link");if(t&&t.remove(),e==="default")return;const s=document.createElement("link");s.id="style-theme-link",s.rel="stylesheet",s.href=`/v3/themes/${e}.css`,document.head.appendChild(s)}let u=null,h=null;function D(){h=document.querySelector("#app"),h&&(h.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`,h.innerHTML=`
    <div class="layout ${a.sidebarVisible?"sidebar-visible":"sidebar-hidden"}">
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
            <input type="search" id="search-input" placeholder="Search..." value="${a.searchQuery}">
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
          <div class="sidebar-quick-controls">
            <div class="sidebar-controls-row">
              <button class="sidebar-icon-btn sidebar-theme-btn ${a.theme==="light"?"active":""}" data-theme="light" title="Light mode">☀</button>
              <button class="sidebar-icon-btn sidebar-theme-btn ${a.theme==="dark"?"active":""}" data-theme="dark" title="Dark mode">☽</button>
            </div>
            <hr class="sidebar-controls-rule">
            <div class="sidebar-controls-row">
              <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="default"?"active":""}" data-style-theme="default" title="Default">○</button>
              <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="refined"?"active":""}" data-style-theme="refined" title="Refined">◆</button>
              <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="terminal"?"active":""}" data-style-theme="terminal" title="Terminal">▮</button>
              <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="codex"?"active":""}" data-style-theme="codex" title="Codex">❧</button>
              <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="sakura"?"active":""}" data-style-theme="sakura" title="Sakura">❀</button>
            </div>
          </div>
          <a href="/v3/settings" data-nav="settings">Settings</a>
          <a href="#" id="logout-button">Logout</a>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div id="content-area"></div>
      </main>
    </div>
  `,x())}function x(){document.getElementById("search-input")?.addEventListener("input",n=>{const o=n.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",n=>{n.preventDefault(),J()}),document.querySelectorAll(".sidebar-theme-btn").forEach(n=>{n.addEventListener("click",()=>{const o=n.getAttribute("data-theme");o&&a.setTheme(o)})}),document.querySelectorAll(".sidebar-style-btn").forEach(n=>{n.addEventListener("click",()=>{const o=n.getAttribute("data-style-theme");o&&a.setStyleTheme(o)})}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{a.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{a.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(n=>{n.addEventListener("click",()=>{n.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",n=>{const o=n.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(n.preventDefault(),r.navigate("/",{}));return}const g=d.getAttribute("data-nav"),m=Object.fromEntries(r.getCurrentRoute().query.entries());if(g==="filter"){n.preventDefault();const c=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...m,filter:c}):r.updateQuery({filter:c})}else if(g==="tag"){n.preventDefault();const c=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(c)}`,m)}else if(g==="feed"){n.preventDefault();const c=d.getAttribute("data-value"),l=r.getCurrentRoute();a.activeFeedId===parseInt(c)&&l.path!=="/settings"?r.navigate("/",m):r.navigate(`/feed/${c}`,m)}else g==="settings"&&(n.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",m):r.navigate("/settings",m));window.innerWidth<=768&&a.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",n=>{const o=n.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const b=parseInt(l.getAttribute("data-id"));U(b)}return}const g=o.closest('[data-action="scrape"]');if(g){const l=g.closest("[data-id]");if(l){const b=parseInt(l.getAttribute("data-id"));V(b)}return}const m=o.closest('[data-action="open"]'),c=o.closest(".feed-item");if(c&&!m){const l=parseInt(c.getAttribute("data-id"));u=l,u=l;const b=a.items.find(_=>_._id===l);b&&!b.read&&p(l,{read:!0})}})}function L(){const{feeds:e,activeFeedId:t}=a,s=document.getElementById("feed-list");s&&(s.innerHTML=e.map(i=>`
    <li class="${i._id===t?"active":""}">
      <a href="/v3/feed/${i._id}" data-nav="feed" data-value="${i._id}">
        ${i.title||i.url}
      </a>
    </li>
  `).join(""))}function $(){}function F(){const{filter:e}=a,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(s=>{s.classList.toggle("active",s.getAttribute("data-filter")===e)})}function S(){const{items:e,loading:t}=a,s=document.getElementById("content-area");if(!s||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){s.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){s.innerHTML='<p class="empty">No items found.</p>';return}s.innerHTML=`
    <ul class="item-list">
      ${e.map(n=>O(n)).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const i=document.getElementById("main-content");if(i){let n=null;i.onscroll=()=>{!a.loading&&a.hasMore&&i.scrollHeight>i.clientHeight&&i.scrollHeight-i.scrollTop-i.clientHeight<200&&E(),n===null&&(n=window.setTimeout(()=>{R(i),n=null},250))}}}function R(e){const t=e.getBoundingClientRect();a.items.forEach(s=>{if(s.read)return;const i=document.querySelector(`.feed-item[data-id="${s._id}"]`);i&&i.getBoundingClientRect().bottom<t.top&&p(s._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(a.loading||!a.hasMore)return;if(e&&(R(e),e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200)){E();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,s=window.innerHeight,i=window.scrollY||document.documentElement.scrollTop;t>s&&t-s-i<200&&E()},1e3);function v(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
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
              <button class="${a.theme==="light"?"active":""}" data-theme="light">Light</button>
              <button class="${a.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Style</h3>
          <div class="settings-group">
            <div class="theme-options" id="style-theme-options">
              ${q.map(i=>`<button class="${a.styleTheme===i?"active":""}" data-style-theme="${i}">${i.charAt(0).toUpperCase()+i.slice(1)}</button>`).join(`
              `)}
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Fonts</h3>
          <div class="settings-group">
            <label>System & headings</label>
            <select id="heading-font-selector" style="margin-bottom: 1rem;">
              <option value="default" ${a.headingFontTheme==="default"?"selected":""}>System (Helvetica Neue)</option>
              <option value="serif" ${a.headingFontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
              <option value="sans" ${a.headingFontTheme==="sans"?"selected":""}>Sans-Serif (Inter/System)</option>
              <option value="mono" ${a.headingFontTheme==="mono"?"selected":""}>Monospace</option>
            </select>

            <label>article body</label>
            <select id="font-selector">
              <option value="default" ${a.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
              <option value="serif" ${a.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
              <option value="sans" ${a.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
              <option value="mono" ${a.fontTheme==="mono"?"selected":""}>Monospace</option>
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
          ${a.feeds.map(i=>`
            <li class="manage-feed-item">
              <div class="feed-info">
                <div class="feed-title">${i.title||i.url}</div>
                <div class="feed-url">${i.url}</div>
              </div>
              <div class="feed-actions">
                <!-- FIXME: Tags feature is broken/unused in V3. Soft deprecated for now.
                <input type="text" class="feed-tag-input" data-id="${i._id}" value="${i.category||""}" placeholder="Tag">
                <button class="update-feed-tag-btn" data-id="${i._id}">SAVE</button>
                -->
                <button class="delete-feed-btn" data-id="${i._id}">DELETE</button>
              </div>
            </li>
          `).join("")}
        </ul>
      </section>
    </div>
  `,document.getElementById("theme-options")?.addEventListener("click",i=>{const n=i.target.closest("button");n&&(a.setTheme(n.getAttribute("data-theme")),v())}),document.getElementById("style-theme-options")?.addEventListener("click",i=>{const n=i.target.closest("button");n&&a.setStyleTheme(n.getAttribute("data-style-theme"))}),document.getElementById("heading-font-selector")?.addEventListener("change",i=>{a.setHeadingFontTheme(i.target.value)}),document.getElementById("font-selector")?.addEventListener("change",i=>{a.setFontTheme(i.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const i=document.getElementById("new-feed-url"),n=i.value.trim();n&&(await N(n)?(i.value="",alert("Feed added successfully!"),y()):alert("Failed to add feed."))});let t="opml";const s=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(i=>{i.addEventListener("click",n=>{t=n.currentTarget.getAttribute("data-format")||"opml",s.click()})}),s?.addEventListener("change",async i=>{const n=i.target.files?.[0];n&&(await j(n,t)?(alert(`Import (${t}) started! check logs.`),y()):alert("Failed to import.")),s.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(i=>{i.addEventListener("click",async n=>{const o=parseInt(n.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await Q(o),await y(),v())})})}async function N(e){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function j(e,t){try{const s=new FormData;s.append("file",e),s.append("format",t);const i=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:s})).ok}catch(s){return console.error("Failed to import",s),!1}}async function Q(e){try{return(await f(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function U(e){const t=a.items.find(s=>s._id===e);t&&p(e,{starred:!t.starred})}async function V(e){if(a.items.find(s=>s._id===e))try{const s=await f(`/api/item/${e}/content`);if(s.ok){const i=await s.json();i.full_content&&p(e,{full_content:i.full_content})}}catch(s){console.error("Failed to fetch full content",s)}}async function p(e,t){try{if((await f(`/api/item/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const i=a.items.find(n=>n._id===e);if(i){Object.assign(i,t);const n=document.querySelector(`.feed-item[data-id="${e}"]`);if(n){if(t.read!==void 0&&n.classList.toggle("read",t.read),t.starred!==void 0){const o=n.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",t.starred),o.classList.toggle("is-unstarred",!t.starred),o.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&S()}}}}catch(s){console.error("Failed to update item",s)}}async function y(){const e=await f("/api/feed/");if(e.ok){const t=await e.json();a.setFeeds(t)}}async function X(){const e=await f("/api/tag");if(e.ok){const t=await e.json();a.setTags(t)}}async function T(e,t,s=!1){a.setLoading(!0);try{const i=new URLSearchParams;e&&i.append("feed_id",e),t&&i.append("tag",t),a.searchQuery&&i.append("q",a.searchQuery),(a.filter==="starred"||a.filter==="all")&&i.append("read_filter","all"),a.filter==="starred"&&i.append("starred","true"),s&&a.items.length>0&&i.append("max_id",String(a.items[a.items.length-1]._id));const n=await f(`/api/stream?${i.toString()}`);if(n.ok){const o=await n.json();a.setHasMore(o.length>0),a.setItems(o,s)}}finally{a.setLoading(!1)}}async function E(){const e=r.getCurrentRoute();T(e.params.feedId,e.params.tagName,!0)}async function J(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function I(){const e=r.getCurrentRoute(),t=e.query.get("filter");a.setFilter(t||"unread");const s=e.query.get("q");if(s!==null&&a.setSearchQuery(s),e.path==="/settings"){v();return}if(e.path==="/feed"&&e.params.feedId){const i=parseInt(e.params.feedId);a.setActiveFeed(i),T(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(a.setActiveTag(e.params.tagName),T(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(a.setActiveFeed(null),a.setActiveTag(null),T())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":k(1);break;case"k":k(-1);break;case"r":if(u){const t=a.items.find(s=>s._id===u);t&&p(t._id,{read:!t.read})}break;case"s":if(u){const t=a.items.find(s=>s._id===u);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function k(e){if(a.items.length===0)return;const t=a.items.findIndex(i=>i._id===u);let s;if(t===-1?s=e>0?0:a.items.length-1:s=t+e,s>=0&&s<a.items.length){u=a.items[s]._id;const i=document.querySelector(`.feed-item[data-id="${u}"]`);i&&i.scrollIntoView({block:"start",behavior:"instant"}),a.items[s].read||p(u,{read:!0})}}a.on("feeds-updated",L);a.on("tags-updated",$);a.on("active-feed-updated",L);a.on("active-tag-updated",$);a.on("filter-updated",F);a.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==a.searchQuery&&(e.value=a.searchQuery),I()});a.on("theme-updated",()=>{h||(h=document.querySelector("#app")),h&&(h.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`),document.querySelectorAll(".sidebar-theme-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-theme")===a.theme)}),r.getCurrentRoute().path==="/settings"&&v()});a.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(a.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});a.on("style-theme-updated",()=>{w(a.styleTheme),document.querySelectorAll(".sidebar-style-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-style-theme")===a.styleTheme)}),r.getCurrentRoute().path==="/settings"&&v()});a.on("items-updated",S);a.on("loading-state-changed",S);r.addEventListener("route-changed",I);window.app={navigate:e=>r.navigate(e)};async function W(){const e=await f("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}D(),w(a.styleTheme),F();try{await Promise.all([y(),X()])}catch(t){console.error("Initial fetch failed",t)}I()}typeof window<"u"&&!window.__VITEST__&&W();
