(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function a(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(s){if(s.ep)return;s.ep=!0;const o=a(s);fetch(s.href,o)}})();function C(e){const a=`; ${document.cookie}`.split(`; ${e}=`);if(a.length===2)return a.pop()?.split(";").shift()}async function f(e,t){const a=t?.method?.toUpperCase()||"GET",n=["POST","PUT","DELETE"].includes(a),s=new Headers(t?.headers||{});if(n){const o=C("csrf_token");o&&s.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:s,credentials:"include"})}function H(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function P(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function M(){const e=H();return e!==null?e:window.innerWidth>1024}class O extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";styleTheme=localStorage.getItem("neko-style-theme")||"default";sidebarVisible=M();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,a=!1){a?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setHeadingFontTheme(t){this.headingFontTheme=t,localStorage.setItem("neko-heading-font-theme",t),this.emit("theme-updated")}setStyleTheme(t){this.styleTheme=t,localStorage.setItem("neko-style-theme",t),this.emit("style-theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,P(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,a){this.dispatchEvent(new CustomEvent(t,{detail:a}))}on(t,a){this.addEventListener(t,a)}}const i=new O;class x extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),n=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const o={};return n[0]==="feed"&&n[1]?(s="/feed",o.feedId=n[1]):n[0]==="tag"&&n[1]?(s="/tag",o.tagName=decodeURIComponent(n[1])):n[0]==="settings"&&(s="/settings"),{path:s,params:o,query:t.searchParams}}navigate(t,a){let n=`/v3${t}`;if(a){const s=new URLSearchParams(a);n+=`?${s.toString()}`}window.history.pushState({},"",n),this.handleRouteChange()}updateQuery(t){const a=new URL(window.location.href);for(const[n,s]of Object.entries(t))s?a.searchParams.set(n,s):a.searchParams.delete(n);window.history.pushState({},"",a.toString()),this.handleRouteChange()}}const r=new x;function q(e,t=!1){const a=new Date(e.publish_date).toLocaleDateString();return`
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
          ${a}
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
  `}const T=["default","refined","terminal","codex","sakura"];function $(e){const t=document.getElementById("style-theme-link");if(t&&t.remove(),e==="default")return;const a=document.createElement("link");a.id="style-theme-link",a.rel="stylesheet",a.href=`/v3/themes/${e}.css`,document.head.appendChild(a)}let c=null,g=null;function D(){g=document.querySelector("#app"),g&&(g.className=`theme-${i.theme} font-${i.fontTheme} heading-font-${i.headingFontTheme}`,g.innerHTML=`
    <div class="layout ${i.sidebarVisible?"sidebar-visible":"sidebar-hidden"}">
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
            <input type="search" id="search-input" placeholder="Search..." value="${i.searchQuery}">
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
            <button id="sidebar-theme-toggle" class="sidebar-icon-btn" title="${i.theme==="light"?"Switch to dark mode":"Switch to light mode"}">${i.theme==="light"?"☽":"☀"}</button>
            <button id="sidebar-style-cycle" class="sidebar-icon-btn" title="Style: ${i.styleTheme}">${i.styleTheme==="default"?"◯":"◉"} ${i.styleTheme}</button>
          </div>
          <a href="/v3/settings" data-nav="settings">Settings</a>
          <a href="#" id="logout-button">Logout</a>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div id="content-area"></div>
      </main>
    </div>
  `,N())}function N(){document.getElementById("search-input")?.addEventListener("input",s=>{const o=s.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),W()}),document.getElementById("sidebar-theme-toggle")?.addEventListener("click",()=>{i.setTheme(i.theme==="light"?"dark":"light")}),document.getElementById("sidebar-style-cycle")?.addEventListener("click",()=>{const s=T.indexOf(i.styleTheme),o=T[(s+1)%T.length];i.setStyleTheme(o)}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{i.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{i.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const o=s.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(s.preventDefault(),r.navigate("/",{}));return}const h=d.getAttribute("data-nav"),m=Object.fromEntries(r.getCurrentRoute().query.entries());if(h==="filter"){s.preventDefault();const u=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...m,filter:u}):r.updateQuery({filter:u})}else if(h==="tag"){s.preventDefault();const u=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,m)}else if(h==="feed"){s.preventDefault();const u=d.getAttribute("data-value"),l=r.getCurrentRoute();i.activeFeedId===parseInt(u)&&l.path!=="/settings"?r.navigate("/",m):r.navigate(`/feed/${u}`,m)}else h==="settings"&&(s.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",m):r.navigate("/settings",m));window.innerWidth<=768&&i.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const o=s.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));V(v)}return}const h=o.closest('[data-action="scrape"]');if(h){const l=h.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));X(v)}return}const m=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!m){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(y=>{const B=parseInt(y.getAttribute("data-id")||"0");y.classList.toggle("selected",B===c)});const v=i.items.find(y=>y._id===l);v&&!v.read&&p(l,{read:!0})}})}function F(){const{feeds:e,activeFeedId:t}=i,a=document.getElementById("feed-list");a&&(a.innerHTML=e.map(n=>`
    <li class="${n._id===t?"active":""}">
      <a href="/v3/feed/${n._id}" data-nav="feed" data-value="${n._id}">
        ${n.title||n.url}
      </a>
    </li>
  `).join(""))}function _(){}function R(){const{filter:e}=i,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(a=>{a.classList.toggle("active",a.getAttribute("data-filter")===e)})}function w(){const{items:e,loading:t}=i,a=document.getElementById("content-area");if(!a||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){a.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){a.innerHTML='<p class="empty">No items found.</p>';return}a.innerHTML=`
    <ul class="item-list">
      ${e.map(s=>q(s,s._id===c)).join("")}
    </ul>
    ${i.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const n=document.getElementById("main-content");if(n){let s=null;n.onscroll=()=>{!i.loading&&i.hasMore&&n.scrollHeight>n.clientHeight&&n.scrollHeight-n.scrollTop-n.clientHeight<200&&S(),s===null&&(s=window.setTimeout(()=>{A(n),s=null},250))}}}function A(e){const t=e.getBoundingClientRect();i.items.forEach(a=>{if(a.read)return;const n=document.querySelector(`.feed-item[data-id="${a._id}"]`);n&&n.getBoundingClientRect().bottom<t.top&&p(a._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(i.loading||!i.hasMore)return;if(e&&(A(e),e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200)){S();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,a=window.innerHeight,n=window.scrollY||document.documentElement.scrollTop;t>a&&t-a-n<200&&S()},1e3);function b(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
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
              <button class="${i.theme==="light"?"active":""}" data-theme="light">Light</button>
              <button class="${i.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Style</h3>
          <div class="settings-group">
            <div class="theme-options" id="style-theme-options">
              ${T.map(n=>`<button class="${i.styleTheme===n?"active":""}" data-style-theme="${n}">${n.charAt(0).toUpperCase()+n.slice(1)}</button>`).join(`
              `)}
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Fonts</h3>
          <div class="settings-group">
            <label>System & headings</label>
            <select id="heading-font-selector" style="margin-bottom: 1rem;">
              <option value="default" ${i.headingFontTheme==="default"?"selected":""}>System (Helvetica Neue)</option>
              <option value="serif" ${i.headingFontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
              <option value="sans" ${i.headingFontTheme==="sans"?"selected":""}>Sans-Serif (Inter/System)</option>
              <option value="mono" ${i.headingFontTheme==="mono"?"selected":""}>Monospace</option>
            </select>

            <label>article body</label>
            <select id="font-selector">
              <option value="default" ${i.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
              <option value="serif" ${i.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
              <option value="sans" ${i.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
              <option value="mono" ${i.fontTheme==="mono"?"selected":""}>Monospace</option>
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
          ${i.feeds.map(n=>`
            <li class="manage-feed-item">
              <div class="feed-info">
                <div class="feed-title">${n.title||n.url}</div>
                <div class="feed-url">${n.url}</div>
              </div>
              <div class="feed-actions">
                <!-- FIXME: Tags feature is broken/unused in V3. Soft deprecated for now.
                <input type="text" class="feed-tag-input" data-id="${n._id}" value="${n.category||""}" placeholder="Tag">
                <button class="update-feed-tag-btn" data-id="${n._id}">SAVE</button>
                -->
                <button class="delete-feed-btn" data-id="${n._id}">DELETE</button>
              </div>
            </li>
          `).join("")}
        </ul>
      </section>
    </div>
  `,document.getElementById("theme-options")?.addEventListener("click",n=>{const s=n.target.closest("button");s&&(i.setTheme(s.getAttribute("data-theme")),b())}),document.getElementById("style-theme-options")?.addEventListener("click",n=>{const s=n.target.closest("button");s&&i.setStyleTheme(s.getAttribute("data-style-theme"))}),document.getElementById("heading-font-selector")?.addEventListener("change",n=>{i.setHeadingFontTheme(n.target.value)}),document.getElementById("font-selector")?.addEventListener("change",n=>{i.setFontTheme(n.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const n=document.getElementById("new-feed-url"),s=n.value.trim();s&&(await j(s)?(n.value="",alert("Feed added successfully!"),E()):alert("Failed to add feed."))});let t="opml";const a=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(n=>{n.addEventListener("click",s=>{t=s.currentTarget.getAttribute("data-format")||"opml",a.click()})}),a?.addEventListener("change",async n=>{const s=n.target.files?.[0];s&&(await Q(s,t)?(alert(`Import (${t}) started! check logs.`),E()):alert("Failed to import.")),a.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(n=>{n.addEventListener("click",async s=>{const o=parseInt(s.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await U(o),await E(),b())})})}async function j(e){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function Q(e,t){try{const a=new FormData;a.append("file",e),a.append("format",t);const n=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":n||""},body:a})).ok}catch(a){return console.error("Failed to import",a),!1}}async function U(e){try{return(await f(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function V(e){const t=i.items.find(a=>a._id===e);t&&p(e,{starred:!t.starred})}async function X(e){if(i.items.find(a=>a._id===e))try{const a=await f(`/api/item/${e}/content`);if(a.ok){const n=await a.json();n.full_content&&p(e,{full_content:n.full_content})}}catch(a){console.error("Failed to fetch full content",a)}}async function p(e,t){try{if((await f(`/api/item/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const n=i.items.find(s=>s._id===e);if(n){Object.assign(n,t);const s=document.querySelector(`.feed-item[data-id="${e}"]`);if(s){if(t.read!==void 0&&s.classList.toggle("read",t.read),t.starred!==void 0){const o=s.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",t.starred),o.classList.toggle("is-unstarred",!t.starred),o.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&w()}}}}catch(a){console.error("Failed to update item",a)}}async function E(){const e=await f("/api/feed/");if(e.ok){const t=await e.json();i.setFeeds(t)}}async function J(){const e=await f("/api/tag");if(e.ok){const t=await e.json();i.setTags(t)}}async function I(e,t,a=!1){i.setLoading(!0);try{const n=new URLSearchParams;e&&n.append("feed_id",e),t&&n.append("tag",t),i.searchQuery&&n.append("q",i.searchQuery),(i.filter==="starred"||i.filter==="all")&&n.append("read_filter","all"),i.filter==="starred"&&n.append("starred","true"),a&&i.items.length>0&&n.append("max_id",String(i.items[i.items.length-1]._id));const s=await f(`/api/stream?${n.toString()}`);if(s.ok){const o=await s.json();i.setHasMore(o.length>0),i.setItems(o,a)}}finally{i.setLoading(!1)}}async function S(){const e=r.getCurrentRoute();I(e.params.feedId,e.params.tagName,!0)}async function W(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function k(){const e=r.getCurrentRoute(),t=e.query.get("filter");i.setFilter(t||"unread");const a=e.query.get("q");if(a!==null&&i.setSearchQuery(a),e.path==="/settings"){b();return}if(e.path==="/feed"&&e.params.feedId){const n=parseInt(e.params.feedId);i.setActiveFeed(n),I(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(i.setActiveTag(e.params.tagName),I(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(i.setActiveFeed(null),i.setActiveTag(null),I())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":L(1);break;case"k":L(-1);break;case"r":if(c){const t=i.items.find(a=>a._id===c);t&&p(t._id,{read:!t.read})}break;case"s":if(c){const t=i.items.find(a=>a._id===c);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function L(e){if(i.items.length===0)return;const t=i.items.findIndex(n=>n._id===c);let a;if(t===-1?a=e>0?0:i.items.length-1:a=t+e,a>=0&&a<i.items.length){c=i.items[a]._id,document.querySelectorAll(".feed-item").forEach(s=>{const o=parseInt(s.getAttribute("data-id")||"0");s.classList.toggle("selected",o===c)});const n=document.querySelector(`.feed-item[data-id="${c}"]`);n&&n.scrollIntoView({block:"start",behavior:"smooth"}),i.items[a].read||p(c,{read:!0})}}i.on("feeds-updated",F);i.on("tags-updated",_);i.on("active-feed-updated",F);i.on("active-tag-updated",_);i.on("filter-updated",R);i.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==i.searchQuery&&(e.value=i.searchQuery),k()});i.on("theme-updated",()=>{g||(g=document.querySelector("#app")),g&&(g.className=`theme-${i.theme} font-${i.fontTheme} heading-font-${i.headingFontTheme}`);const e=document.getElementById("sidebar-theme-toggle");e&&(e.textContent=i.theme==="light"?"☽":"☀",e.title=i.theme==="light"?"Switch to dark mode":"Switch to light mode"),r.getCurrentRoute().path==="/settings"&&b()});i.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(i.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});i.on("style-theme-updated",()=>{$(i.styleTheme);const e=document.getElementById("sidebar-style-cycle");e&&(e.textContent=`${i.styleTheme==="default"?"◯":"◉"} ${i.styleTheme}`,e.title=`Style: ${i.styleTheme}`),r.getCurrentRoute().path==="/settings"&&b()});i.on("items-updated",w);i.on("loading-state-changed",w);r.addEventListener("route-changed",k);window.app={navigate:e=>r.navigate(e)};async function G(){const e=await f("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}D(),$(i.styleTheme),R();try{await Promise.all([E(),J()])}catch(t){console.error("Initial fetch failed",t)}k()}typeof window<"u"&&!window.__VITEST__&&G();
