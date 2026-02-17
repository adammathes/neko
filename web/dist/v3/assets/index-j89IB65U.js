(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&s(d)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();function A(t){const a=`; ${document.cookie}`.split(`; ${t}=`);if(a.length===2)return a.pop()?.split(";").shift()}async function m(t,e){const a=e?.method?.toUpperCase()||"GET",s=["POST","PUT","DELETE"].includes(a),n=new Headers(e?.headers||{});if(s){const o=A("csrf_token");o&&n.set("X-CSRF-Token",o)}return fetch(t,{...e,headers:n,credentials:"include"})}function R(){const t=document.cookie.split("; ").find(e=>e.startsWith("neko_sidebar="));return t?t.split("=")[1]==="1":null}function C(t){document.cookie=`neko_sidebar=${t?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function B(){const t=R();return t!==null?t:window.innerWidth>1024}class P extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=B();setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,a=!1){a?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}setSidebarVisible(e){this.sidebarVisible=e,C(e),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(e,a){this.dispatchEvent(new CustomEvent(e,{detail:a}))}on(e,a){this.addEventListener(e,a)}}const i=new P;class x extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),s=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const o={};return s[0]==="feed"&&s[1]?(n="/feed",o.feedId=s[1]):s[0]==="tag"&&s[1]?(n="/tag",o.tagName=decodeURIComponent(s[1])):s[0]==="settings"&&(n="/settings"),{path:n,params:o,query:e.searchParams}}navigate(e,a){let s=`/v3${e}`;if(a){const n=new URLSearchParams(a);s+=`?${n.toString()}`}window.history.pushState({},"",s),this.handleRouteChange()}updateQuery(e){const a=new URL(window.location.href);for(const[s,n]of Object.entries(e))n?a.searchParams.set(s,n):a.searchParams.delete(s);window.history.pushState({},"",a.toString()),this.handleRouteChange()}}const r=new x;function M(t,e=!1){const a=new Date(t.publish_date).toLocaleDateString();return`
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
          ${a}
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
  `}let c=null,p=null;function q(){p=document.querySelector("#app"),p&&(p.className=`theme-${i.theme} font-${i.fontTheme}`,p.innerHTML=`
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
  `,O())}function O(){document.getElementById("search-input")?.addEventListener("input",n=>{const o=n.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",n=>{n.preventDefault(),W()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{i.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{i.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(n=>{n.addEventListener("click",()=>{n.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",n=>{const o=n.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(n.preventDefault(),r.navigate("/",{}));return}const f=d.getAttribute("data-nav"),g=Object.fromEntries(r.getCurrentRoute().query.entries());if(f==="filter"){n.preventDefault();const u=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...g,filter:u}):r.updateQuery({filter:u})}else if(f==="tag"){n.preventDefault();const u=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,g)}else if(f==="feed"){n.preventDefault();const u=d.getAttribute("data-value"),l=r.getCurrentRoute();i.activeFeedId===parseInt(u)&&l.path!=="/settings"?r.navigate("/",g):r.navigate(`/feed/${u}`,g)}else f==="settings"&&(n.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",g):r.navigate("/settings",g));window.innerWidth<=768&&i.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",n=>{const o=n.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));H(v)}return}const f=o.closest('[data-action="scrape"]');if(f){const l=f.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));U(v)}return}const g=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!g){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(y=>{const F=parseInt(y.getAttribute("data-id")||"0");y.classList.toggle("selected",F===c)});const v=i.items.find(y=>y._id===l);v&&!v.read&&h(l,{read:!0})}})}function T(){const{feeds:t,activeFeedId:e}=i,a=document.getElementById("feed-list");a&&(a.innerHTML=t.map(s=>`
    <li class="${s._id===e?"active":""}">
      <a href="/v3/feed/${s._id}" data-nav="feed" data-value="${s._id}">
        ${s.title||s.url}
      </a>
    </li>
  `).join(""))}function k(){const{tags:t,activeTagName:e}=i,a=document.getElementById("tag-list");a&&(a.innerHTML=t.map(s=>`
    <li class="${s.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(s.title)}" data-nav="tag" data-value="${s.title}">
        ${s.title}
      </a>
    </li>
  `).join(""))}function $(){const{filter:t}=i,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(a=>{a.classList.toggle("active",a.getAttribute("data-filter")===t)})}function I(){const{items:t,loading:e}=i,a=document.getElementById("content-area");if(!a||r.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){a.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){a.innerHTML='<p class="empty">No items found.</p>';return}a.innerHTML=`
    <ul class="item-list">
      ${t.map(n=>M(n,n._id===c)).join("")}
    </ul>
    ${i.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const s=document.getElementById("main-content");if(s){let n=null;s.onscroll=()=>{!i.loading&&i.hasMore&&s.scrollHeight>s.clientHeight&&s.scrollHeight-s.scrollTop-s.clientHeight<200&&V(),n===null&&(n=window.setTimeout(()=>{const o=s.getBoundingClientRect();i.items.forEach(d=>{if(d.read)return;const f=document.querySelector(`.feed-item[data-id="${d._id}"]`);f&&f.getBoundingClientRect().bottom<o.top&&h(d._id,{read:!0})}),n=null},250))}}}function w(){const t=document.getElementById("content-area");t&&(t.innerHTML=`
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

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        <ul class="manage-feed-list" style="list-style: none; padding: 0;">
          ${i.feeds.map(e=>`
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
  `,document.getElementById("theme-options")?.addEventListener("click",e=>{const a=e.target.closest("button");if(a){const s=a.getAttribute("data-theme");i.setTheme(s),w()}}),document.getElementById("font-selector")?.addEventListener("change",e=>{i.setFontTheme(e.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const e=document.getElementById("new-feed-url"),a=e.value.trim();a&&(await N(a)?(e.value="",alert("Feed added successfully!"),b()):alert("Failed to add feed."))}),document.getElementById("export-opml-btn")?.addEventListener("click",()=>{window.location.href="/api/export/opml"}),document.getElementById("import-opml-file")?.addEventListener("change",async e=>{const a=e.target.files?.[0];a&&(await D(a)?(alert("OPML imported successfully! Crawling started."),b()):alert("Failed to import OPML."))}),document.querySelectorAll(".delete-feed-btn").forEach(e=>{e.addEventListener("click",async a=>{const s=parseInt(a.target.getAttribute("data-id"));confirm("Are you sure you want to delete this feed?")&&(await Q(s),b(),await b(),w())})}),document.querySelectorAll(".update-feed-tag-btn").forEach(e=>{e.addEventListener("click",async a=>{const s=parseInt(a.target.getAttribute("data-id")),o=document.querySelector(`.feed-tag-input[data-id="${s}"]`).value.trim();await j(s,{category:o}),await b(),await _(),w(),alert("Feed updated")})}))}async function N(t){try{return(await m("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})})).ok}catch(e){return console.error("Failed to add feed",e),!1}}async function D(t){try{const e=new FormData;e.append("file",t),e.append("format","opml");const a=document.cookie.split("; ").find(n=>n.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":a||""},body:e})).ok}catch(e){return console.error("Failed to import OPML",e),!1}}async function Q(t){try{return(await m(`/api/feed/${t}`,{method:"DELETE"})).ok}catch(e){return console.error("Failed to delete feed",e),!1}}async function j(t,e){try{return(await m("/api/feed",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,_id:t})})).ok}catch(a){return console.error("Failed to update feed",a),!1}}async function H(t){const e=i.items.find(a=>a._id===t);e&&h(t,{starred:!e.starred})}async function U(t){if(i.items.find(a=>a._id===t))try{const a=await m(`/api/item/${t}/content`);if(a.ok){const s=await a.json();s.full_content&&h(t,{full_content:s.full_content})}}catch(a){console.error("Failed to fetch full content",a)}}async function h(t,e){try{if((await m(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const s=i.items.find(n=>n._id===t);if(s){Object.assign(s,e);const n=document.querySelector(`.feed-item[data-id="${t}"]`);if(n){if(e.read!==void 0&&n.classList.toggle("read",e.read),e.starred!==void 0){const o=n.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",e.starred),o.classList.toggle("is-unstarred",!e.starred),o.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&I()}}}}catch(a){console.error("Failed to update item",a)}}async function b(){const t=await m("/api/feed/");if(t.ok){const e=await t.json();i.setFeeds(e)}}async function _(){const t=await m("/api/tag");if(t.ok){const e=await t.json();i.setTags(e)}}async function L(t,e,a=!1){i.setLoading(!0);try{const s=new URLSearchParams;t&&s.append("feed_id",t),e&&s.append("tag",e),i.searchQuery&&s.append("q",i.searchQuery),(i.filter==="starred"||i.filter==="all")&&s.append("read_filter","all"),i.filter==="starred"&&s.append("starred","true"),a&&i.items.length>0&&s.append("max_id",String(i.items[i.items.length-1]._id));const n=await m(`/api/stream?${s.toString()}`);if(n.ok){const o=await n.json();i.setHasMore(o.length>=50),i.setItems(o,a)}}finally{i.setLoading(!1)}}async function V(){const t=r.getCurrentRoute();L(t.params.feedId,t.params.tagName,!0)}async function W(){await m("/api/logout",{method:"POST"}),window.location.href="/login/"}function E(){const t=r.getCurrentRoute(),e=t.query.get("filter");i.setFilter(e||"unread");const a=t.query.get("q");if(a!==null&&i.setSearchQuery(a),t.path==="/settings"){w();return}if(t.path==="/feed"&&t.params.feedId){const s=parseInt(t.params.feedId);i.setActiveFeed(s),L(t.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else t.path==="/tag"&&t.params.tagName?(i.setActiveTag(t.params.tagName),L(void 0,t.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(i.setActiveFeed(null),i.setActiveTag(null),L())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":S(1);break;case"k":S(-1);break;case"r":if(c){const e=i.items.find(a=>a._id===c);e&&h(e._id,{read:!e.read})}break;case"s":if(c){const e=i.items.find(a=>a._id===c);e&&h(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function S(t){if(i.items.length===0)return;const e=i.items.findIndex(s=>s._id===c);let a;if(e===-1?a=t>0?0:i.items.length-1:a=e+t,a>=0&&a<i.items.length){c=i.items[a]._id,document.querySelectorAll(".feed-item").forEach(n=>{const o=parseInt(n.getAttribute("data-id")||"0");n.classList.toggle("selected",o===c)});const s=document.querySelector(`.feed-item[data-id="${c}"]`);s&&s.scrollIntoView({block:"start",behavior:"smooth"}),i.items[a].read||h(c,{read:!0})}}i.on("feeds-updated",T);i.on("tags-updated",k);i.on("active-feed-updated",T);i.on("active-tag-updated",k);i.on("filter-updated",$);i.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==i.searchQuery&&(t.value=i.searchQuery),E()});i.on("theme-updated",()=>{p||(p=document.querySelector("#app")),p&&(p.className=`theme-${i.theme} font-${i.fontTheme}`)});i.on("sidebar-toggle",()=>{const t=document.querySelector(".layout");t&&(i.sidebarVisible?(t.classList.remove("sidebar-hidden"),t.classList.add("sidebar-visible")):(t.classList.remove("sidebar-visible"),t.classList.add("sidebar-hidden")))});i.on("items-updated",I);i.on("loading-state-changed",I);r.addEventListener("route-changed",E);window.app={navigate:t=>r.navigate(t)};async function J(){const t=await m("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}q(),$();try{await Promise.all([b(),_()])}catch(e){console.error("Initial fetch failed",e)}E()}typeof window<"u"&&!window.__VITEST__&&J();
