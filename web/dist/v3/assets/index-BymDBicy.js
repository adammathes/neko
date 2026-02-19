(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function n(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=n(s);fetch(s.href,o)}})();function C(e){const n=`; ${document.cookie}`.split(`; ${e}=`);if(n.length===2)return n.pop()?.split(";").shift()}async function h(e,t){const n=t?.method?.toUpperCase()||"GET",i=["POST","PUT","DELETE"].includes(n),s=new Headers(t?.headers||{});if(i){const o=C("csrf_token");o&&s.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:s,credentials:"include"})}function P(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function H(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function M(){const e=P();return e!==null?e:window.innerWidth>1024}class D extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";styleTheme=localStorage.getItem("neko-style-theme")||"default";sidebarVisible=M();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,n=!1){n?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setHeadingFontTheme(t){this.headingFontTheme=t,localStorage.setItem("neko-heading-font-theme",t),this.emit("theme-updated")}setStyleTheme(t){this.styleTheme=t,localStorage.setItem("neko-style-theme",t),this.emit("style-theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,H(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,n){this.dispatchEvent(new CustomEvent(t,{detail:n}))}on(t,n){this.addEventListener(t,n)}}const a=new D;class O extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),i=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const o={};return i[0]==="feed"&&i[1]?(s="/feed",o.feedId=i[1]):i[0]==="tag"&&i[1]?(s="/tag",o.tagName=decodeURIComponent(i[1])):i[0]==="settings"&&(s="/settings"),{path:s,params:o,query:t.searchParams}}navigate(t,n){let i=`/v3${t}`;if(n){const s=new URLSearchParams(n);i+=`?${s.toString()}`}window.history.pushState({},"",i),this.handleRouteChange()}updateQuery(t){const n=new URL(window.location.href);for(const[i,s]of Object.entries(t))s?n.searchParams.set(i,s):n.searchParams.delete(i);window.history.pushState({},"",n.toString()),this.handleRouteChange()}}const r=new O;function q(e){const t=new Date(e.publish_date).toLocaleDateString();return`
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
  `}const x=new URLSearchParams(window.location.search),L=x.has("debug");function v(...e){L&&console.log("[NEKO-DEBUG]",...e)}typeof window<"u"&&(window.app=window.app||{},window.app.debug=()=>{const e=new URL(window.location.href);e.searchParams.set("debug","1"),window.location.href=e.toString()});const N=["default","refined","terminal","codex","sakura"];function $(e){const t=document.getElementById("style-theme-link");if(t&&t.remove(),e==="default")return;const n=document.createElement("link");n.id="style-theme-link",n.rel="stylesheet",n.href=`/v3/themes/${e}.css`,document.head.appendChild(n)}let m=null,g=null;function U(){g=document.querySelector("#app"),g&&(g.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`,g.innerHTML=`
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
  `,j())}function j(){document.getElementById("search-input")?.addEventListener("input",s=>{const o=s.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),K()}),document.querySelectorAll(".sidebar-theme-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-theme");o&&a.setTheme(o)})}),document.querySelectorAll(".sidebar-style-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-style-theme");o&&a.setStyleTheme(o)})}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{a.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{a.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const o=s.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(s.preventDefault(),r.navigate("/",{}));return}const u=d.getAttribute("data-nav"),f=Object.fromEntries(r.getCurrentRoute().query.entries());if(u==="filter"){s.preventDefault();const l=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...f,filter:l}):r.updateQuery({filter:l})}else if(u==="tag"){s.preventDefault();const l=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(l)}`,f)}else if(u==="feed"){s.preventDefault();const l=d.getAttribute("data-value"),c=r.getCurrentRoute();a.activeFeedId===parseInt(l)&&c.path!=="/settings"?r.navigate("/",f):r.navigate(`/feed/${l}`,f)}else u==="settings"&&(s.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",f):r.navigate("/settings",f));window.innerWidth<=768&&a.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const o=s.target,d=o.closest('[data-action="toggle-star"]');if(d){const c=d.closest("[data-id]");if(c){const b=parseInt(c.getAttribute("data-id"));G(b)}return}const u=o.closest('[data-action="scrape"]');if(u){const c=u.closest("[data-id]");if(c){const b=parseInt(c.getAttribute("data-id"));J(b)}return}const f=o.closest('[data-action="open"]'),l=o.closest(".feed-item");if(l&&!f){const c=parseInt(l.getAttribute("data-id"));m=c;const b=a.items.find(B=>B._id===c);b&&!b.read&&p(c,{read:!0})}})}function F(){const{feeds:e,activeFeedId:t}=a,n=document.getElementById("feed-list");n&&(n.innerHTML=e.map(i=>`
    <li class="${i._id===t?"active":""}">
      <a href="/v3/feed/${i._id}" data-nav="feed" data-value="${i._id}">
        ${i.title||i.url}
      </a>
    </li>
  `).join(""))}function R(){}function _(){const{filter:e}=a,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(n=>{n.classList.toggle("active",n.getAttribute("data-filter")===e)})}function S(){const{items:e,loading:t}=a,n=document.getElementById("content-area");if(!n||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){n.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){n.innerHTML='<p class="empty">No items found.</p>';return}n.innerHTML=`
    <ul class="item-list">
      ${e.map(s=>q(s)).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const i=document.getElementById("main-content");if(i){let s=null;i.onscroll=()=>{!a.loading&&a.hasMore&&i.scrollHeight>i.clientHeight&&i.scrollHeight-i.scrollTop-i.clientHeight<200&&w(),s===null&&(s=window.setTimeout(()=>{v("onscroll trigger checkReadItems"),A(i),s=null},250))}}}function A(e){const t=e.getBoundingClientRect();v("checkReadItems start",{containerTop:t.top});const n=e.querySelectorAll(".feed-item");for(const i of n){const s=i.getAttribute("data-id");if(!s)continue;const o=parseInt(s),d=a.items.find(l=>l._id===o);if(!d||d.read)continue;const u=i.getBoundingClientRect(),f=u.bottom<t.top+5;L&&v(`Item ${o} check`,{rectTop:u.top,rectBottom:u.bottom,containerTop:t.top,isPast:f}),f&&(v(`Marking as read (scrolled past): ${o}`),p(o,{read:!0}))}}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(e&&A(e),a.loading||!a.hasMore)return;if(e&&e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200){w();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,n=window.innerHeight,i=window.scrollY||document.documentElement.scrollTop;t>n&&t-n-i<200&&w()},1e3);function y(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
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
              ${N.map(i=>`<button class="${a.styleTheme===i?"active":""}" data-style-theme="${i}">${i.charAt(0).toUpperCase()+i.slice(1)}</button>`).join(`
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
  `,document.getElementById("theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");s&&(a.setTheme(s.getAttribute("data-theme")),y())}),document.getElementById("style-theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");s&&a.setStyleTheme(s.getAttribute("data-style-theme"))}),document.getElementById("heading-font-selector")?.addEventListener("change",i=>{a.setHeadingFontTheme(i.target.value)}),document.getElementById("font-selector")?.addEventListener("change",i=>{a.setFontTheme(i.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const i=document.getElementById("new-feed-url"),s=i.value.trim();s&&(await Q(s)?(i.value="",alert("Feed added successfully!"),T()):alert("Failed to add feed."))});let t="opml";const n=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(i=>{i.addEventListener("click",s=>{t=s.currentTarget.getAttribute("data-format")||"opml",n.click()})}),n?.addEventListener("change",async i=>{const s=i.target.files?.[0];s&&(await V(s,t)?(alert(`Import (${t}) started! check logs.`),T()):alert("Failed to import.")),n.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(i=>{i.addEventListener("click",async s=>{const o=parseInt(s.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await X(o),await T(),y())})})}async function Q(e){try{return(await h("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function V(e,t){try{const n=new FormData;n.append("file",e),n.append("format",t);const i=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:n})).ok}catch(n){return console.error("Failed to import",n),!1}}async function X(e){try{return(await h(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function G(e){const t=a.items.find(n=>n._id===e);t&&p(e,{starred:!t.starred})}async function J(e){if(a.items.find(n=>n._id===e))try{const n=await h(`/api/item/${e}/content`);if(n.ok){const i=await n.json();i.full_content&&p(e,{full_content:i.full_content})}}catch(n){console.error("Failed to fetch full content",n)}}async function p(e,t){const n=String(e);v("updateItem called",n,t);try{if((await h(`/api/item/${n}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const s=a.items.find(o=>String(o._id)===n);if(s){Object.assign(s,t);const o=document.querySelector(`.feed-item[data-id="${e}"]`);if(o){if(t.read!==void 0&&o.classList.toggle("read",t.read),t.starred!==void 0){const d=o.querySelector(".star-btn");d&&(d.classList.toggle("is-starred",t.starred),d.classList.toggle("is-unstarred",!t.starred),d.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&S()}}}}catch(i){console.error("Failed to update item",i)}}async function T(){const e=await h("/api/feed/");if(e.ok){const t=await e.json();a.setFeeds(t)}}async function W(){const e=await h("/api/tag");if(e.ok){const t=await e.json();a.setTags(t)}}async function E(e,t,n=!1){a.setLoading(!0);try{const i=new URLSearchParams;e&&i.append("feed_id",e),t&&i.append("tag",t),a.searchQuery&&i.append("q",a.searchQuery),(a.filter==="starred"||a.filter==="all")&&i.append("read_filter","all"),a.filter==="starred"&&i.append("starred","true"),n&&a.items.length>0&&i.append("max_id",String(a.items[a.items.length-1]._id));const s=await h(`/api/stream?${i.toString()}`);if(s.ok){const o=await s.json();a.setHasMore(o.length>0),a.setItems(o,n)}}finally{a.setLoading(!1)}}async function w(){const e=r.getCurrentRoute();E(e.params.feedId,e.params.tagName,!0)}async function K(){await h("/api/logout",{method:"POST"}),window.location.href="/login/"}function I(){const e=r.getCurrentRoute(),t=e.query.get("filter");a.setFilter(t||"unread");const n=e.query.get("q");if(n!==null&&a.setSearchQuery(n),e.path==="/settings"){y();return}if(e.path==="/feed"&&e.params.feedId){const i=parseInt(e.params.feedId);a.setActiveFeed(i),E(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(a.setActiveTag(e.params.tagName),E(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(a.setActiveFeed(null),a.setActiveTag(null),E())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":k(1);break;case"k":k(-1);break;case"r":if(m){const t=a.items.find(n=>n._id===m);t&&p(t._id,{read:!t.read})}break;case"s":if(m){const t=a.items.find(n=>n._id===m);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function k(e){if(a.items.length===0)return;const t=a.items.findIndex(i=>i._id===m);let n;if(t===-1?n=e>0?0:a.items.length-1:n=t+e,n>=0&&n<a.items.length){m=a.items[n]._id;const i=document.querySelector(`.feed-item[data-id="${m}"]`);i&&i.scrollIntoView({block:"start",behavior:"instant"}),a.items[n].read||p(m,{read:!0})}}a.on("feeds-updated",F);a.on("tags-updated",R);a.on("active-feed-updated",F);a.on("active-tag-updated",R);a.on("filter-updated",_);a.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==a.searchQuery&&(e.value=a.searchQuery),I()});a.on("theme-updated",()=>{g||(g=document.querySelector("#app")),g&&(g.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`),document.querySelectorAll(".sidebar-theme-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-theme")===a.theme)}),r.getCurrentRoute().path==="/settings"&&y()});a.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(a.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});a.on("style-theme-updated",()=>{$(a.styleTheme),document.querySelectorAll(".sidebar-style-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-style-theme")===a.styleTheme)}),r.getCurrentRoute().path==="/settings"&&y()});a.on("items-updated",S);a.on("loading-state-changed",S);r.addEventListener("route-changed",I);window.app={navigate:e=>r.navigate(e)};async function Y(){const e=await h("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}U(),$(a.styleTheme),_();try{await Promise.all([T(),W()])}catch(t){console.error("Initial fetch failed",t)}I()}typeof window<"u"&&!window.__VITEST__&&Y();
