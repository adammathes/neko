<<<<<<<< HEAD:web/dist/v3/assets/index-DZsQUXOH.js
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function n(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=n(s);fetch(s.href,o)}})();function A(e){const n=`; ${document.cookie}`.split(`; ${e}=`);if(n.length===2)return n.pop()?.split(";").shift()}async function m(e,t){const n=t?.method?.toUpperCase()||"GET",i=["POST","PUT","DELETE"].includes(n),s=new Headers(t?.headers||{});if(i){const o=A("csrf_token");o&&s.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:s,credentials:"include"})}function C(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function B(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function H(){const e=C();return e!==null?e:window.innerWidth>1024}class P extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";styleTheme=localStorage.getItem("neko-style-theme")||"default";sidebarVisible=H();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,n=!1){n?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setHeadingFontTheme(t){this.headingFontTheme=t,localStorage.setItem("neko-heading-font-theme",t),this.emit("theme-updated")}setStyleTheme(t){this.styleTheme=t,localStorage.setItem("neko-style-theme",t),this.emit("style-theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,B(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,n){this.dispatchEvent(new CustomEvent(t,{detail:n}))}on(t,n){this.addEventListener(t,n)}}const a=new P;class M extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),i=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const o={};return i[0]==="feed"&&i[1]?(s="/feed",o.feedId=i[1]):i[0]==="tag"&&i[1]?(s="/tag",o.tagName=decodeURIComponent(i[1])):i[0]==="settings"&&(s="/settings"),{path:s,params:o,query:t.searchParams}}navigate(t,n){let i=`/v3${t}`;if(n){const s=new URLSearchParams(n);i+=`?${s.toString()}`}window.history.pushState({},"",i),this.handleRouteChange()}updateQuery(t){const n=new URL(window.location.href);for(const[i,s]of Object.entries(t))s?n.searchParams.set(i,s):n.searchParams.delete(i);window.history.pushState({},"",n.toString()),this.handleRouteChange()}}const r=new M;function O(e){const t=new Date(e.publish_date).toLocaleDateString();return`
========
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function n(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=n(s);fetch(s.href,o)}})();function C(e){const n=`; ${document.cookie}`.split(`; ${e}=`);if(n.length===2)return n.pop()?.split(";").shift()}async function f(e,t){const n=t?.method?.toUpperCase()||"GET",i=["POST","PUT","DELETE"].includes(n),s=new Headers(t?.headers||{});if(i){const o=C("csrf_token");o&&s.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:s,credentials:"include"})}function P(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function H(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function M(){const e=P();return e!==null?e:window.innerWidth>1024}class D extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";styleTheme=localStorage.getItem("neko-style-theme")||"default";sidebarVisible=M();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,n=!1){n?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setHeadingFontTheme(t){this.headingFontTheme=t,localStorage.setItem("neko-heading-font-theme",t),this.emit("theme-updated")}setStyleTheme(t){this.styleTheme=t,localStorage.setItem("neko-style-theme",t),this.emit("style-theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,H(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,n){this.dispatchEvent(new CustomEvent(t,{detail:n}))}on(t,n){this.addEventListener(t,n)}}const a=new D;class O extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),i=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const o={};return i[0]==="feed"&&i[1]?(s="/feed",o.feedId=i[1]):i[0]==="tag"&&i[1]?(s="/tag",o.tagName=decodeURIComponent(i[1])):i[0]==="settings"&&(s="/settings"),{path:s,params:o,query:t.searchParams}}navigate(t,n){let i=`/v3${t}`;if(n){const s=new URLSearchParams(n);i+=`?${s.toString()}`}window.history.pushState({},"",i),this.handleRouteChange()}updateQuery(t){const n=new URL(window.location.href);for(const[i,s]of Object.entries(t))s?n.searchParams.set(i,s):n.searchParams.delete(i);window.history.pushState({},"",n.toString()),this.handleRouteChange()}}const r=new O;function q(e){const t=new Date(e.publish_date).toLocaleDateString();return`
>>>>>>>> 7fd8f48 (Fix mark-as-read regression and add debugging tools):web/dist/v3/assets/index-BOsbJuB-.js
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
<<<<<<<< HEAD:web/dist/v3/assets/index-DZsQUXOH.js
  `}const q=["default","refined","terminal","codex","sakura"];function w(e){const t=document.getElementById("style-theme-link");if(t&&t.remove(),e==="default")return;const n=document.createElement("link");n.id="style-theme-link",n.rel="stylesheet",n.href=`/v3/themes/${e}.css`,document.head.appendChild(n)}let u=null,g=null;function D(){g=document.querySelector("#app"),g&&(g.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`,g.innerHTML=`
========
  `}const x=new URLSearchParams(window.location.search),L=x.has("debug");function v(...e){L&&console.log("[NEKO-DEBUG]",...e)}typeof window<"u"&&(window.app=window.app||{},window.app.debug=()=>{const e=new URL(window.location.href);e.searchParams.set("debug","1"),window.location.href=e.toString()});const N=["default","refined","terminal","codex","sakura"];function $(e){const t=document.getElementById("style-theme-link");if(t&&t.remove(),e==="default")return;const n=document.createElement("link");n.id="style-theme-link",n.rel="stylesheet",n.href=`/v3/themes/${e}.css`,document.head.appendChild(n)}let u=null,h=null;function U(){h=document.querySelector("#app"),h&&(h.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`,h.innerHTML=`
>>>>>>>> 7fd8f48 (Fix mark-as-read regression and add debugging tools):web/dist/v3/assets/index-BOsbJuB-.js
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
<<<<<<<< HEAD:web/dist/v3/assets/index-DZsQUXOH.js
  `,x())}function x(){document.getElementById("search-input")?.addEventListener("input",s=>{const o=s.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),J()}),document.querySelectorAll(".sidebar-theme-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-theme");o&&a.setTheme(o)})}),document.querySelectorAll(".sidebar-style-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-style-theme");o&&a.setStyleTheme(o)})}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{a.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{a.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const o=s.target,l=o.closest("a");if(!l){o.classList.contains("logo")&&(s.preventDefault(),r.navigate("/",{}));return}const f=l.getAttribute("data-nav"),h=Object.fromEntries(r.getCurrentRoute().query.entries());if(f==="filter"){s.preventDefault();const c=l.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...h,filter:c}):r.updateQuery({filter:c})}else if(f==="tag"){s.preventDefault();const c=l.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(c)}`,h)}else if(f==="feed"){s.preventDefault();const c=l.getAttribute("data-value"),d=r.getCurrentRoute();a.activeFeedId===parseInt(c)&&d.path!=="/settings"?r.navigate("/",h):r.navigate(`/feed/${c}`,h)}else f==="settings"&&(s.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",h):r.navigate("/settings",h));window.innerWidth<=768&&a.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const o=s.target,l=o.closest('[data-action="toggle-star"]');if(l){const d=l.closest("[data-id]");if(d){const b=parseInt(d.getAttribute("data-id"));U(b)}return}const f=o.closest('[data-action="scrape"]');if(f){const d=f.closest("[data-id]");if(d){const b=parseInt(d.getAttribute("data-id"));V(b)}return}const h=o.closest('[data-action="open"]'),c=o.closest(".feed-item");if(c&&!h){const d=parseInt(c.getAttribute("data-id"));u=d,u=d;const b=a.items.find(_=>_._id===d);b&&!b.read&&p(d,{read:!0})}})}function L(){const{feeds:e,activeFeedId:t}=a,n=document.getElementById("feed-list");n&&(n.innerHTML=e.map(i=>`
========
  `,j())}function j(){document.getElementById("search-input")?.addEventListener("input",s=>{const o=s.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),K()}),document.querySelectorAll(".sidebar-theme-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-theme");o&&a.setTheme(o)})}),document.querySelectorAll(".sidebar-style-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-style-theme");o&&a.setStyleTheme(o)})}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{a.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{a.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const o=s.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(s.preventDefault(),r.navigate("/",{}));return}const g=d.getAttribute("data-nav"),m=Object.fromEntries(r.getCurrentRoute().query.entries());if(g==="filter"){s.preventDefault();const c=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...m,filter:c}):r.updateQuery({filter:c})}else if(g==="tag"){s.preventDefault();const c=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(c)}`,m)}else if(g==="feed"){s.preventDefault();const c=d.getAttribute("data-value"),l=r.getCurrentRoute();a.activeFeedId===parseInt(c)&&l.path!=="/settings"?r.navigate("/",m):r.navigate(`/feed/${c}`,m)}else g==="settings"&&(s.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",m):r.navigate("/settings",m));window.innerWidth<=768&&a.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const o=s.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const b=parseInt(l.getAttribute("data-id"));G(b)}return}const g=o.closest('[data-action="scrape"]');if(g){const l=g.closest("[data-id]");if(l){const b=parseInt(l.getAttribute("data-id"));J(b)}return}const m=o.closest('[data-action="open"]'),c=o.closest(".feed-item");if(c&&!m){const l=parseInt(c.getAttribute("data-id"));u=l,u=l;const b=a.items.find(B=>B._id===l);b&&!b.read&&p(l,{read:!0})}})}function F(){const{feeds:e,activeFeedId:t}=a,n=document.getElementById("feed-list");n&&(n.innerHTML=e.map(i=>`
>>>>>>>> 7fd8f48 (Fix mark-as-read regression and add debugging tools):web/dist/v3/assets/index-BOsbJuB-.js
    <li class="${i._id===t?"active":""}">
      <a href="/v3/feed/${i._id}" data-nav="feed" data-value="${i._id}">
        ${i.title||i.url}
      </a>
    </li>
<<<<<<<< HEAD:web/dist/v3/assets/index-DZsQUXOH.js
  `).join(""))}function $(){}function F(){const{filter:e}=a,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(n=>{n.classList.toggle("active",n.getAttribute("data-filter")===e)})}function S(){const{items:e,loading:t}=a,n=document.getElementById("content-area");if(!n||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){n.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){n.innerHTML='<p class="empty">No items found.</p>';return}n.innerHTML=`
    <ul class="item-list">
      ${e.map(s=>O(s)).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const i=document.getElementById("main-content");if(i){let s=null;i.onscroll=()=>{!a.loading&&a.hasMore&&i.scrollHeight>i.clientHeight&&i.scrollHeight-i.scrollTop-i.clientHeight<200&&E(),s===null&&(s=window.setTimeout(()=>{R(i),s=null},250))}}}function R(e){const t=e.getBoundingClientRect(),n=e.querySelectorAll(".feed-item");for(const i of n){const s=parseInt(i.getAttribute("data-id")),o=a.items.find(f=>f._id===s);if(!o||o.read)continue;i.getBoundingClientRect().bottom<t.top&&p(o._id,{read:!0})}}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(a.loading||!a.hasMore)return;if(e&&(R(e),e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200)){E();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,n=window.innerHeight,i=window.scrollY||document.documentElement.scrollTop;t>n&&t-n-i<200&&E()},1e3);function v(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
========
  `).join(""))}function R(){}function _(){const{filter:e}=a,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(n=>{n.classList.toggle("active",n.getAttribute("data-filter")===e)})}function S(){const{items:e,loading:t}=a,n=document.getElementById("content-area");if(!n||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){n.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){n.innerHTML='<p class="empty">No items found.</p>';return}n.innerHTML=`
    <ul class="item-list">
      ${e.map(s=>q(s)).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const i=document.getElementById("main-content");if(i){let s=null;i.onscroll=()=>{!a.loading&&a.hasMore&&i.scrollHeight>i.clientHeight&&i.scrollHeight-i.scrollTop-i.clientHeight<200&&w(),s===null&&(s=window.setTimeout(()=>{v("onscroll trigger checkReadItems"),A(i),s=null},250))}}}function A(e){const t=e.getBoundingClientRect();v("checkReadItems start",{containerTop:t.top}),a.items.forEach(n=>{if(n.read)return;const i=document.querySelector(`.feed-item[data-id="${n._id}"]`);if(i){const s=i.getBoundingClientRect(),o=s.bottom<t.top+5;L&&v(`Item ${n._id} check`,{rectTop:s.top,rectBottom:s.bottom,containerTop:t.top,isPast:o}),o&&(v(`Marking as read (scrolled past): ${n._id}`),p(n._id,{read:!0}))}})}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(e&&A(e),a.loading||!a.hasMore)return;if(e&&e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200){w();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,n=window.innerHeight,i=window.scrollY||document.documentElement.scrollTop;t>n&&t-n-i<200&&w()},1e3);function y(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
>>>>>>>> 7fd8f48 (Fix mark-as-read regression and add debugging tools):web/dist/v3/assets/index-BOsbJuB-.js
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
<<<<<<<< HEAD:web/dist/v3/assets/index-DZsQUXOH.js
  `,document.getElementById("theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");s&&(a.setTheme(s.getAttribute("data-theme")),v())}),document.getElementById("style-theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");s&&a.setStyleTheme(s.getAttribute("data-style-theme"))}),document.getElementById("heading-font-selector")?.addEventListener("change",i=>{a.setHeadingFontTheme(i.target.value)}),document.getElementById("font-selector")?.addEventListener("change",i=>{a.setFontTheme(i.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const i=document.getElementById("new-feed-url"),s=i.value.trim();s&&(await N(s)?(i.value="",alert("Feed added successfully!"),y()):alert("Failed to add feed."))});let t="opml";const n=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(i=>{i.addEventListener("click",s=>{t=s.currentTarget.getAttribute("data-format")||"opml",n.click()})}),n?.addEventListener("change",async i=>{const s=i.target.files?.[0];s&&(await j(s,t)?(alert(`Import (${t}) started! check logs.`),y()):alert("Failed to import.")),n.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(i=>{i.addEventListener("click",async s=>{const o=parseInt(s.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await Q(o),await y(),v())})})}async function N(e){try{return(await m("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function j(e,t){try{const n=new FormData;n.append("file",e),n.append("format",t);const i=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:n})).ok}catch(n){return console.error("Failed to import",n),!1}}async function Q(e){try{return(await m(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function U(e){const t=a.items.find(n=>n._id===e);t&&p(e,{starred:!t.starred})}async function V(e){if(a.items.find(n=>n._id===e))try{const n=await m(`/api/item/${e}/content`);if(n.ok){const i=await n.json();i.full_content&&p(e,{full_content:i.full_content})}}catch(n){console.error("Failed to fetch full content",n)}}async function p(e,t){try{if((await m(`/api/item/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const i=a.items.find(s=>s._id===e);if(i){Object.assign(i,t);const s=document.querySelector(`.feed-item[data-id="${e}"]`);if(s){if(t.read!==void 0&&s.classList.toggle("read",t.read),t.starred!==void 0){const o=s.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",t.starred),o.classList.toggle("is-unstarred",!t.starred),o.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&S()}}}}catch(n){console.error("Failed to update item",n)}}async function y(){const e=await m("/api/feed/");if(e.ok){const t=await e.json();a.setFeeds(t)}}async function X(){const e=await m("/api/tag");if(e.ok){const t=await e.json();a.setTags(t)}}async function T(e,t,n=!1){a.setLoading(!0);try{const i=new URLSearchParams;e&&i.append("feed_id",e),t&&i.append("tag",t),a.searchQuery&&i.append("q",a.searchQuery),(a.filter==="starred"||a.filter==="all")&&i.append("read_filter","all"),a.filter==="starred"&&i.append("starred","true"),n&&a.items.length>0&&i.append("max_id",String(a.items[a.items.length-1]._id));const s=await m(`/api/stream?${i.toString()}`);if(s.ok){const o=await s.json();a.setHasMore(o.length>0),a.setItems(o,n)}}finally{a.setLoading(!1)}}async function E(){const e=r.getCurrentRoute();T(e.params.feedId,e.params.tagName,!0)}async function J(){await m("/api/logout",{method:"POST"}),window.location.href="/login/"}function I(){const e=r.getCurrentRoute(),t=e.query.get("filter");a.setFilter(t||"unread");const n=e.query.get("q");if(n!==null&&a.setSearchQuery(n),e.path==="/settings"){v();return}if(e.path==="/feed"&&e.params.feedId){const i=parseInt(e.params.feedId);a.setActiveFeed(i),T(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(a.setActiveTag(e.params.tagName),T(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(a.setActiveFeed(null),a.setActiveTag(null),T())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":k(1);break;case"k":k(-1);break;case"r":if(u){const t=a.items.find(n=>n._id===u);t&&p(t._id,{read:!t.read})}break;case"s":if(u){const t=a.items.find(n=>n._id===u);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function k(e){if(a.items.length===0)return;const t=a.items.findIndex(i=>i._id===u);let n;if(t===-1?n=e>0?0:a.items.length-1:n=t+e,n>=0&&n<a.items.length){u=a.items[n]._id;const i=document.querySelector(`.feed-item[data-id="${u}"]`);i&&i.scrollIntoView({block:"start",behavior:"instant"}),a.items[n].read||p(u,{read:!0})}}a.on("feeds-updated",L);a.on("tags-updated",$);a.on("active-feed-updated",L);a.on("active-tag-updated",$);a.on("filter-updated",F);a.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==a.searchQuery&&(e.value=a.searchQuery),I()});a.on("theme-updated",()=>{g||(g=document.querySelector("#app")),g&&(g.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`),document.querySelectorAll(".sidebar-theme-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-theme")===a.theme)}),r.getCurrentRoute().path==="/settings"&&v()});a.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(a.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});a.on("style-theme-updated",()=>{w(a.styleTheme),document.querySelectorAll(".sidebar-style-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-style-theme")===a.styleTheme)}),r.getCurrentRoute().path==="/settings"&&v()});a.on("items-updated",S);a.on("loading-state-changed",S);r.addEventListener("route-changed",I);window.app={navigate:e=>r.navigate(e)};async function W(){const e=await m("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}D(),w(a.styleTheme),F();try{await Promise.all([y(),X()])}catch(t){console.error("Initial fetch failed",t)}I()}typeof window<"u"&&!window.__VITEST__&&W();
========
  `,document.getElementById("theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");s&&(a.setTheme(s.getAttribute("data-theme")),y())}),document.getElementById("style-theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");s&&a.setStyleTheme(s.getAttribute("data-style-theme"))}),document.getElementById("heading-font-selector")?.addEventListener("change",i=>{a.setHeadingFontTheme(i.target.value)}),document.getElementById("font-selector")?.addEventListener("change",i=>{a.setFontTheme(i.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const i=document.getElementById("new-feed-url"),s=i.value.trim();s&&(await Q(s)?(i.value="",alert("Feed added successfully!"),T()):alert("Failed to add feed."))});let t="opml";const n=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(i=>{i.addEventListener("click",s=>{t=s.currentTarget.getAttribute("data-format")||"opml",n.click()})}),n?.addEventListener("change",async i=>{const s=i.target.files?.[0];s&&(await V(s,t)?(alert(`Import (${t}) started! check logs.`),T()):alert("Failed to import.")),n.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(i=>{i.addEventListener("click",async s=>{const o=parseInt(s.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await X(o),await T(),y())})})}async function Q(e){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function V(e,t){try{const n=new FormData;n.append("file",e),n.append("format",t);const i=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:n})).ok}catch(n){return console.error("Failed to import",n),!1}}async function X(e){try{return(await f(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function G(e){const t=a.items.find(n=>n._id===e);t&&p(e,{starred:!t.starred})}async function J(e){if(a.items.find(n=>n._id===e))try{const n=await f(`/api/item/${e}/content`);if(n.ok){const i=await n.json();i.full_content&&p(e,{full_content:i.full_content})}}catch(n){console.error("Failed to fetch full content",n)}}async function p(e,t){const n=String(e);v("updateItem called",n,t);try{if((await f(`/api/item/${n}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const s=a.items.find(o=>String(o._id)===n);if(s){Object.assign(s,t);const o=document.querySelector(`.feed-item[data-id="${e}"]`);if(o){if(t.read!==void 0&&o.classList.toggle("read",t.read),t.starred!==void 0){const d=o.querySelector(".star-btn");d&&(d.classList.toggle("is-starred",t.starred),d.classList.toggle("is-unstarred",!t.starred),d.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&S()}}}}catch(i){console.error("Failed to update item",i)}}async function T(){const e=await f("/api/feed/");if(e.ok){const t=await e.json();a.setFeeds(t)}}async function W(){const e=await f("/api/tag");if(e.ok){const t=await e.json();a.setTags(t)}}async function E(e,t,n=!1){a.setLoading(!0);try{const i=new URLSearchParams;e&&i.append("feed_id",e),t&&i.append("tag",t),a.searchQuery&&i.append("q",a.searchQuery),(a.filter==="starred"||a.filter==="all")&&i.append("read_filter","all"),a.filter==="starred"&&i.append("starred","true"),n&&a.items.length>0&&i.append("max_id",String(a.items[a.items.length-1]._id));const s=await f(`/api/stream?${i.toString()}`);if(s.ok){const o=await s.json();a.setHasMore(o.length>0),a.setItems(o,n)}}finally{a.setLoading(!1)}}async function w(){const e=r.getCurrentRoute();E(e.params.feedId,e.params.tagName,!0)}async function K(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function I(){const e=r.getCurrentRoute(),t=e.query.get("filter");a.setFilter(t||"unread");const n=e.query.get("q");if(n!==null&&a.setSearchQuery(n),e.path==="/settings"){y();return}if(e.path==="/feed"&&e.params.feedId){const i=parseInt(e.params.feedId);a.setActiveFeed(i),E(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(a.setActiveTag(e.params.tagName),E(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(a.setActiveFeed(null),a.setActiveTag(null),E())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":k(1);break;case"k":k(-1);break;case"r":if(u){const t=a.items.find(n=>n._id===u);t&&p(t._id,{read:!t.read})}break;case"s":if(u){const t=a.items.find(n=>n._id===u);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function k(e){if(a.items.length===0)return;const t=a.items.findIndex(i=>i._id===u);let n;if(t===-1?n=e>0?0:a.items.length-1:n=t+e,n>=0&&n<a.items.length){u=a.items[n]._id;const i=document.querySelector(`.feed-item[data-id="${u}"]`);i&&i.scrollIntoView({block:"start",behavior:"instant"}),a.items[n].read||p(u,{read:!0})}}a.on("feeds-updated",F);a.on("tags-updated",R);a.on("active-feed-updated",F);a.on("active-tag-updated",R);a.on("filter-updated",_);a.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==a.searchQuery&&(e.value=a.searchQuery),I()});a.on("theme-updated",()=>{h||(h=document.querySelector("#app")),h&&(h.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`),document.querySelectorAll(".sidebar-theme-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-theme")===a.theme)}),r.getCurrentRoute().path==="/settings"&&y()});a.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(a.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});a.on("style-theme-updated",()=>{$(a.styleTheme),document.querySelectorAll(".sidebar-style-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-style-theme")===a.styleTheme)}),r.getCurrentRoute().path==="/settings"&&y()});a.on("items-updated",S);a.on("loading-state-changed",S);r.addEventListener("route-changed",I);window.app={navigate:e=>r.navigate(e)};async function Y(){const e=await f("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}U(),$(a.styleTheme),_();try{await Promise.all([T(),W()])}catch(t){console.error("Initial fetch failed",t)}I()}typeof window<"u"&&!window.__VITEST__&&Y();
>>>>>>>> 7fd8f48 (Fix mark-as-read regression and add debugging tools):web/dist/v3/assets/index-BOsbJuB-.js
