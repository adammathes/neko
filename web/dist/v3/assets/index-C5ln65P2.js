(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function s(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(n){if(n.ep)return;n.ep=!0;const o=s(n);fetch(n.href,o)}})();function C(e){const s=`; ${document.cookie}`.split(`; ${e}=`);if(s.length===2)return s.pop()?.split(";").shift()}async function f(e,t){const s=t?.method?.toUpperCase()||"GET",i=["POST","PUT","DELETE"].includes(s),n=new Headers(t?.headers||{});if(i){const o=C("csrf_token");o&&n.set("X-CSRF-Token",o)}return fetch(e,{...t,headers:n,credentials:"include"})}function B(){const e=document.cookie.split("; ").find(t=>t.startsWith("neko_sidebar="));return e?e.split("=")[1]==="1":null}function H(e){document.cookie=`neko_sidebar=${e?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function P(){const e=B();return e!==null?e:window.innerWidth>1024}class M extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";styleTheme=localStorage.getItem("neko-style-theme")||"default";sidebarVisible=P();setFeeds(t){this.feeds=t,this.emit("feeds-updated")}setTags(t){this.tags=t,this.emit("tags-updated")}setItems(t,s=!1){s?this.items=[...this.items,...t]:this.items=t,this.emit("items-updated")}setActiveFeed(t){this.activeFeedId=t,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(t){this.activeTagName=t,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(t){this.filter!==t&&(this.filter=t,this.emit("filter-updated"))}setSearchQuery(t){this.searchQuery!==t&&(this.searchQuery=t,this.emit("search-updated"))}setLoading(t){this.loading=t,this.emit("loading-state-changed")}setHasMore(t){this.hasMore=t}setTheme(t){this.theme=t,localStorage.setItem("neko-theme",t),this.emit("theme-updated")}setFontTheme(t){this.fontTheme=t,localStorage.setItem("neko-font-theme",t),this.emit("theme-updated")}setHeadingFontTheme(t){this.headingFontTheme=t,localStorage.setItem("neko-heading-font-theme",t),this.emit("theme-updated")}setStyleTheme(t){this.styleTheme=t,localStorage.setItem("neko-style-theme",t),this.emit("style-theme-updated")}setSidebarVisible(t){this.sidebarVisible=t,H(t),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(t,s){this.dispatchEvent(new CustomEvent(t,{detail:s}))}on(t,s){this.addEventListener(t,s)}}const a=new M;class O extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=new URL(window.location.href),i=t.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const o={};return i[0]==="feed"&&i[1]?(n="/feed",o.feedId=i[1]):i[0]==="tag"&&i[1]?(n="/tag",o.tagName=decodeURIComponent(i[1])):i[0]==="settings"&&(n="/settings"),{path:n,params:o,query:t.searchParams}}navigate(t,s){let i=`/v3${t}`;if(s){const n=new URLSearchParams(s);i+=`?${n.toString()}`}window.history.pushState({},"",i),this.handleRouteChange()}updateQuery(t){const s=new URL(window.location.href);for(const[i,n]of Object.entries(t))n?s.searchParams.set(i,n):s.searchParams.delete(i);window.history.pushState({},"",s.toString()),this.handleRouteChange()}}const r=new O;function q(e,t=!1){const s=new Date(e.publish_date).toLocaleDateString();return`
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
          ${s}
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
  `}const x=["default","refined","terminal","codex","sakura"];function L(e){const t=document.getElementById("style-theme-link");if(t&&t.remove(),e==="default")return;const s=document.createElement("link");s.id="style-theme-link",s.rel="stylesheet",s.href=`/v3/themes/${e}.css`,document.head.appendChild(s)}let c=null,h=null;function D(){h=document.querySelector("#app"),h&&(h.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`,h.innerHTML=`
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
            <button id="sidebar-theme-toggle" class="sidebar-icon-btn" title="${a.theme==="light"?"Switch to dark mode":"Switch to light mode"}">${a.theme==="light"?"☽":"☀"}</button>
            <span class="sidebar-controls-divider"></span>
            <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="default"?"active":""}" data-style-theme="default" title="Default">○</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="refined"?"active":""}" data-style-theme="refined" title="Refined">◆</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="terminal"?"active":""}" data-style-theme="terminal" title="Terminal">▮</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="codex"?"active":""}" data-style-theme="codex" title="Codex">❧</button>
            <button class="sidebar-icon-btn sidebar-style-btn ${a.styleTheme==="sakura"?"active":""}" data-style-theme="sakura" title="Sakura">❀</button>
          </div>
          <a href="/v3/settings" data-nav="settings">Settings</a>
          <a href="#" id="logout-button">Logout</a>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div id="content-area"></div>
      </main>
    </div>
  `,N())}function N(){document.getElementById("search-input")?.addEventListener("input",n=>{const o=n.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",n=>{n.preventDefault(),W()}),document.getElementById("sidebar-theme-toggle")?.addEventListener("click",()=>{a.setTheme(a.theme==="light"?"dark":"light")}),document.querySelectorAll(".sidebar-style-btn").forEach(n=>{n.addEventListener("click",()=>{const o=n.getAttribute("data-style-theme");o&&a.setStyleTheme(o)})}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{a.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{a.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(n=>{n.addEventListener("click",()=>{n.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",n=>{const o=n.target,l=o.closest("a");if(!l){o.classList.contains("logo")&&(n.preventDefault(),r.navigate("/",{}));return}const g=l.getAttribute("data-nav"),m=Object.fromEntries(r.getCurrentRoute().query.entries());if(g==="filter"){n.preventDefault();const u=l.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...m,filter:u}):r.updateQuery({filter:u})}else if(g==="tag"){n.preventDefault();const u=l.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,m)}else if(g==="feed"){n.preventDefault();const u=l.getAttribute("data-value"),d=r.getCurrentRoute();a.activeFeedId===parseInt(u)&&d.path!=="/settings"?r.navigate("/",m):r.navigate(`/feed/${u}`,m)}else g==="settings"&&(n.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",m):r.navigate("/settings",m));window.innerWidth<=768&&a.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",n=>{const o=n.target,l=o.closest('[data-action="toggle-star"]');if(l){const d=l.closest("[data-id]");if(d){const b=parseInt(d.getAttribute("data-id"));V(b)}return}const g=o.closest('[data-action="scrape"]');if(g){const d=g.closest("[data-id]");if(d){const b=parseInt(d.getAttribute("data-id"));X(b)}return}const m=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!m){const d=parseInt(u.getAttribute("data-id"));c=d,document.querySelectorAll(".feed-item").forEach(y=>{const A=parseInt(y.getAttribute("data-id")||"0");y.classList.toggle("selected",A===c)});const b=a.items.find(y=>y._id===d);b&&!b.read&&p(d,{read:!0})}})}function $(){const{feeds:e,activeFeedId:t}=a,s=document.getElementById("feed-list");s&&(s.innerHTML=e.map(i=>`
    <li class="${i._id===t?"active":""}">
      <a href="/v3/feed/${i._id}" data-nav="feed" data-value="${i._id}">
        ${i.title||i.url}
      </a>
    </li>
  `).join(""))}function F(){}function R(){const{filter:e}=a,t=document.getElementById("filter-list");t&&t.querySelectorAll("li").forEach(s=>{s.classList.toggle("active",s.getAttribute("data-filter")===e)})}function I(){const{items:e,loading:t}=a,s=document.getElementById("content-area");if(!s||r.getCurrentRoute().path==="/settings")return;if(t&&e.length===0){s.innerHTML='<p class="loading">Loading items...</p>';return}if(e.length===0){s.innerHTML='<p class="empty">No items found.</p>';return}s.innerHTML=`
    <ul class="item-list">
      ${e.map(n=>q(n,n._id===c)).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const i=document.getElementById("main-content");if(i){let n=null;i.onscroll=()=>{!a.loading&&a.hasMore&&i.scrollHeight>i.clientHeight&&i.scrollHeight-i.scrollTop-i.clientHeight<200&&S(),n===null&&(n=window.setTimeout(()=>{_(i),n=null},250))}}}function _(e){const t=e.getBoundingClientRect();a.items.forEach(s=>{if(s.read)return;const i=document.querySelector(`.feed-item[data-id="${s._id}"]`);i&&i.getBoundingClientRect().bottom<t.top&&p(s._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const e=document.getElementById("main-content");if(a.loading||!a.hasMore)return;if(e&&(_(e),e.scrollHeight>e.clientHeight&&e.scrollHeight-e.scrollTop-e.clientHeight<200)){S();return}const t=document.documentElement.scrollHeight||document.body.scrollHeight,s=window.innerHeight,i=window.scrollY||document.documentElement.scrollTop;t>s&&t-s-i<200&&S()},1e3);function v(){const e=document.getElementById("content-area");if(!e)return;e.innerHTML=`
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
              ${x.map(i=>`<button class="${a.styleTheme===i?"active":""}" data-style-theme="${i}">${i.charAt(0).toUpperCase()+i.slice(1)}</button>`).join(`
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
  `,document.getElementById("theme-options")?.addEventListener("click",i=>{const n=i.target.closest("button");n&&(a.setTheme(n.getAttribute("data-theme")),v())}),document.getElementById("style-theme-options")?.addEventListener("click",i=>{const n=i.target.closest("button");n&&a.setStyleTheme(n.getAttribute("data-style-theme"))}),document.getElementById("heading-font-selector")?.addEventListener("change",i=>{a.setHeadingFontTheme(i.target.value)}),document.getElementById("font-selector")?.addEventListener("change",i=>{a.setFontTheme(i.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const i=document.getElementById("new-feed-url"),n=i.value.trim();n&&(await j(n)?(i.value="",alert("Feed added successfully!"),T()):alert("Failed to add feed."))});let t="opml";const s=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(i=>{i.addEventListener("click",n=>{t=n.currentTarget.getAttribute("data-format")||"opml",s.click()})}),s?.addEventListener("change",async i=>{const n=i.target.files?.[0];n&&(await Q(n,t)?(alert(`Import (${t}) started! check logs.`),T()):alert("Failed to import.")),s.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(i=>{i.addEventListener("click",async n=>{const o=parseInt(n.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await U(o),await T(),v())})})}async function j(e){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e})})).ok}catch(t){return console.error("Failed to add feed",t),!1}}async function Q(e,t){try{const s=new FormData;s.append("file",e),s.append("format",t);const i=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:s})).ok}catch(s){return console.error("Failed to import",s),!1}}async function U(e){try{return(await f(`/api/feed/${e}`,{method:"DELETE"})).ok}catch(t){return console.error("Failed to delete feed",t),!1}}async function V(e){const t=a.items.find(s=>s._id===e);t&&p(e,{starred:!t.starred})}async function X(e){if(a.items.find(s=>s._id===e))try{const s=await f(`/api/item/${e}/content`);if(s.ok){const i=await s.json();i.full_content&&p(e,{full_content:i.full_content})}}catch(s){console.error("Failed to fetch full content",s)}}async function p(e,t){try{if((await f(`/api/item/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok){const i=a.items.find(n=>n._id===e);if(i){Object.assign(i,t);const n=document.querySelector(`.feed-item[data-id="${e}"]`);if(n){if(t.read!==void 0&&n.classList.toggle("read",t.read),t.starred!==void 0){const o=n.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",t.starred),o.classList.toggle("is-unstarred",!t.starred),o.setAttribute("title",t.starred?"Unstar":"Star"))}t.full_content&&I()}}}}catch(s){console.error("Failed to update item",s)}}async function T(){const e=await f("/api/feed/");if(e.ok){const t=await e.json();a.setFeeds(t)}}async function J(){const e=await f("/api/tag");if(e.ok){const t=await e.json();a.setTags(t)}}async function E(e,t,s=!1){a.setLoading(!0);try{const i=new URLSearchParams;e&&i.append("feed_id",e),t&&i.append("tag",t),a.searchQuery&&i.append("q",a.searchQuery),(a.filter==="starred"||a.filter==="all")&&i.append("read_filter","all"),a.filter==="starred"&&i.append("starred","true"),s&&a.items.length>0&&i.append("max_id",String(a.items[a.items.length-1]._id));const n=await f(`/api/stream?${i.toString()}`);if(n.ok){const o=await n.json();a.setHasMore(o.length>0),a.setItems(o,s)}}finally{a.setLoading(!1)}}async function S(){const e=r.getCurrentRoute();E(e.params.feedId,e.params.tagName,!0)}async function W(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function k(){const e=r.getCurrentRoute(),t=e.query.get("filter");a.setFilter(t||"unread");const s=e.query.get("q");if(s!==null&&a.setSearchQuery(s),e.path==="/settings"){v();return}if(e.path==="/feed"&&e.params.feedId){const i=parseInt(e.params.feedId);a.setActiveFeed(i),E(e.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else e.path==="/tag"&&e.params.tagName?(a.setActiveTag(e.params.tagName),E(void 0,e.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(a.setActiveFeed(null),a.setActiveTag(null),E())}window.addEventListener("keydown",e=>{if(!["INPUT","TEXTAREA"].includes(e.target.tagName))switch(e.key){case"j":w(1);break;case"k":w(-1);break;case"r":if(c){const t=a.items.find(s=>s._id===c);t&&p(t._id,{read:!t.read})}break;case"s":if(c){const t=a.items.find(s=>s._id===c);t&&p(t._id,{starred:!t.starred})}break;case"/":e.preventDefault(),document.getElementById("search-input")?.focus();break}});function w(e){if(a.items.length===0)return;const t=a.items.findIndex(i=>i._id===c);let s;if(t===-1?s=e>0?0:a.items.length-1:s=t+e,s>=0&&s<a.items.length){c=a.items[s]._id,document.querySelectorAll(".feed-item").forEach(n=>{const o=parseInt(n.getAttribute("data-id")||"0");n.classList.toggle("selected",o===c)});const i=document.querySelector(`.feed-item[data-id="${c}"]`);i&&i.scrollIntoView({block:"start",behavior:"smooth"}),a.items[s].read||p(c,{read:!0})}}a.on("feeds-updated",$);a.on("tags-updated",F);a.on("active-feed-updated",$);a.on("active-tag-updated",F);a.on("filter-updated",R);a.on("search-updated",()=>{const e=document.getElementById("search-input");e&&e.value!==a.searchQuery&&(e.value=a.searchQuery),k()});a.on("theme-updated",()=>{h||(h=document.querySelector("#app")),h&&(h.className=`theme-${a.theme} font-${a.fontTheme} heading-font-${a.headingFontTheme}`);const e=document.getElementById("sidebar-theme-toggle");e&&(e.textContent=a.theme==="light"?"☽":"☀",e.title=a.theme==="light"?"Switch to dark mode":"Switch to light mode"),r.getCurrentRoute().path==="/settings"&&v()});a.on("sidebar-toggle",()=>{const e=document.querySelector(".layout");e&&(a.sidebarVisible?(e.classList.remove("sidebar-hidden"),e.classList.add("sidebar-visible")):(e.classList.remove("sidebar-visible"),e.classList.add("sidebar-hidden")))});a.on("style-theme-updated",()=>{L(a.styleTheme),document.querySelectorAll(".sidebar-style-btn").forEach(e=>{e.classList.toggle("active",e.getAttribute("data-style-theme")===a.styleTheme)}),r.getCurrentRoute().path==="/settings"&&v()});a.on("items-updated",I);a.on("loading-state-changed",I);r.addEventListener("route-changed",k);window.app={navigate:e=>r.navigate(e)};async function G(){const e=await f("/api/auth");if(!e||e.status===401){window.location.href="/login/";return}D(),L(a.styleTheme),R();try{await Promise.all([T(),J()])}catch(t){console.error("Initial fetch failed",t)}k()}typeof window<"u"&&!window.__VITEST__&&G();
