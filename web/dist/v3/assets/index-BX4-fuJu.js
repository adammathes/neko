(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&s(d)}).observe(document,{childList:!0,subtree:!0});function i(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=i(n);fetch(n.href,o)}})();function A(t){const i=`; ${document.cookie}`.split(`; ${t}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function m(t,e){const i=e?.method?.toUpperCase()||"GET",s=["POST","PUT","DELETE"].includes(i),n=new Headers(e?.headers||{});if(s){const o=A("csrf_token");o&&n.set("X-CSRF-Token",o)}return fetch(t,{...e,headers:n,credentials:"include"})}function C(){const t=document.cookie.split("; ").find(e=>e.startsWith("neko_sidebar="));return t?t.split("=")[1]==="1":null}function B(t){document.cookie=`neko_sidebar=${t?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function P(){const t=C();return t!==null?t:window.innerWidth>1024}class x extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";sidebarVisible=P();setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,i=!1){i?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}setSidebarVisible(e){this.sidebarVisible=e,B(e),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(e,i){this.dispatchEvent(new CustomEvent(e,{detail:i}))}on(e,i){this.addEventListener(e,i)}}const a=new x;class M extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),s=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let n="/";const o={};return s[0]==="feed"&&s[1]?(n="/feed",o.feedId=s[1]):s[0]==="tag"&&s[1]?(n="/tag",o.tagName=decodeURIComponent(s[1])):s[0]==="settings"&&(n="/settings"),{path:n,params:o,query:e.searchParams}}navigate(e,i){let s=`/v3${e}`;if(i){const n=new URLSearchParams(i);s+=`?${n.toString()}`}window.history.pushState({},"",s),this.handleRouteChange()}updateQuery(e){const i=new URL(window.location.href);for(const[s,n]of Object.entries(e))n?i.searchParams.set(s,n):i.searchParams.delete(s);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const r=new M;function H(t,e=!1){const i=new Date(t.publish_date).toLocaleDateString();return`
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
  `}let c=null,p=null;function q(){p=document.querySelector("#app"),p&&(p.className=`theme-${a.theme} font-${a.fontTheme}`,p.innerHTML=`
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
  `,O())}function O(){document.getElementById("search-input")?.addEventListener("input",n=>{const o=n.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",n=>{n.preventDefault(),W()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{a.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{a.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(n=>{n.addEventListener("click",()=>{n.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",n=>{const o=n.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(n.preventDefault(),r.navigate("/",{}));return}const f=d.getAttribute("data-nav"),g=Object.fromEntries(r.getCurrentRoute().query.entries());if(f==="filter"){n.preventDefault();const u=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...g,filter:u}):r.updateQuery({filter:u})}else if(f==="tag"){n.preventDefault();const u=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,g)}else if(f==="feed"){n.preventDefault();const u=d.getAttribute("data-value"),l=r.getCurrentRoute();a.activeFeedId===parseInt(u)&&l.path!=="/settings"?r.navigate("/",g):r.navigate(`/feed/${u}`,g)}else f==="settings"&&(n.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",g):r.navigate("/settings",g));window.innerWidth<=768&&a.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",n=>{const o=n.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));U(v)}return}const f=o.closest('[data-action="scrape"]');if(f){const l=f.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));V(v)}return}const g=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!g){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(y=>{const R=parseInt(y.getAttribute("data-id")||"0");y.classList.toggle("selected",R===c)});const v=a.items.find(y=>y._id===l);v&&!v.read&&h(l,{read:!0})}})}function k(){const{feeds:t,activeFeedId:e}=a,i=document.getElementById("feed-list");i&&(i.innerHTML=t.map(s=>`
    <li class="${s._id===e?"active":""}">
      <a href="/v3/feed/${s._id}" data-nav="feed" data-value="${s._id}">
        ${s.title||s.url}
      </a>
    </li>
  `).join(""))}function $(){const{tags:t,activeTagName:e}=a,i=document.getElementById("tag-list");i&&(i.innerHTML=t.map(s=>`
    <li class="${s.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(s.title)}" data-nav="tag" data-value="${s.title}">
        ${s.title}
      </a>
    </li>
  `).join(""))}function _(){const{filter:t}=a,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-filter")===t)})}function L(){const{items:t,loading:e}=a,i=document.getElementById("content-area");if(!i||r.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){i.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){i.innerHTML='<p class="empty">No items found.</p>';return}i.innerHTML=`
    <ul class="item-list">
      ${t.map(n=>H(n,n._id===c)).join("")}
    </ul>
    ${a.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const s=document.getElementById("main-content");if(s){let n=null;s.onscroll=()=>{!a.loading&&a.hasMore&&s.scrollHeight>s.clientHeight&&s.scrollHeight-s.scrollTop-s.clientHeight<200&&I(),n===null&&(n=window.setTimeout(()=>{const o=s.getBoundingClientRect();a.items.forEach(d=>{if(d.read)return;const f=document.querySelector(`.feed-item[data-id="${d._id}"]`);f&&f.getBoundingClientRect().bottom<o.top&&h(d._id,{read:!0})}),n=null},250))}}}typeof window<"u"&&setInterval(()=>{const t=document.getElementById("main-content");if(a.loading||!a.hasMore)return;if(t&&t.scrollHeight>t.clientHeight&&t.scrollHeight-t.scrollTop-t.clientHeight<200){I();return}const e=document.documentElement.scrollHeight||document.body.scrollHeight,i=window.innerHeight,s=window.scrollY||document.documentElement.scrollTop;e>i&&e-i-s<200&&I()},1e3);function w(){const t=document.getElementById("content-area");t&&(t.innerHTML=`
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
            <button class="${a.theme==="light"?"active":""}" data-theme="light">Light</button>
            <button class="${a.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
          </div>
        </div>
        <div class="settings-group" style="margin-top: 1rem;">
          <label>Font</label>
          <select id="font-selector">
            <option value="default" ${a.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
            <option value="serif" ${a.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
            <option value="sans" ${a.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
            <option value="mono" ${a.fontTheme==="mono"?"selected":""}>Monospace</option>
          </select>
        </div>
      </section>

      <section class="settings-section manage-feeds-section">
        <h3>Manage Feeds</h3>
        <ul class="manage-feed-list" style="list-style: none; padding: 0;">
          ${a.feeds.map(e=>`
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
  `,document.getElementById("theme-options")?.addEventListener("click",e=>{const i=e.target.closest("button");if(i){const s=i.getAttribute("data-theme");a.setTheme(s),w()}}),document.getElementById("font-selector")?.addEventListener("change",e=>{a.setFontTheme(e.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const e=document.getElementById("new-feed-url"),i=e.value.trim();i&&(await N(i)?(e.value="",alert("Feed added successfully!"),b()):alert("Failed to add feed."))}),document.getElementById("export-opml-btn")?.addEventListener("click",()=>{window.location.href="/api/export/opml"}),document.getElementById("import-opml-file")?.addEventListener("change",async e=>{const i=e.target.files?.[0];i&&(await D(i)?(alert("OPML imported successfully! Crawling started."),b()):alert("Failed to import OPML."))}),document.querySelectorAll(".delete-feed-btn").forEach(e=>{e.addEventListener("click",async i=>{const s=parseInt(i.target.getAttribute("data-id"));confirm("Are you sure you want to delete this feed?")&&(await Q(s),b(),await b(),w())})}),document.querySelectorAll(".update-feed-tag-btn").forEach(e=>{e.addEventListener("click",async i=>{const s=parseInt(i.target.getAttribute("data-id")),o=document.querySelector(`.feed-tag-input[data-id="${s}"]`).value.trim();await j(s,{category:o}),await b(),await F(),w(),alert("Feed updated")})}))}async function N(t){try{return(await m("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})})).ok}catch(e){return console.error("Failed to add feed",e),!1}}async function D(t){try{const e=new FormData;e.append("file",t),e.append("format","opml");const i=document.cookie.split("; ").find(n=>n.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":i||""},body:e})).ok}catch(e){return console.error("Failed to import OPML",e),!1}}async function Q(t){try{return(await m(`/api/feed/${t}`,{method:"DELETE"})).ok}catch(e){return console.error("Failed to delete feed",e),!1}}async function j(t,e){try{return(await m("/api/feed",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,_id:t})})).ok}catch(i){return console.error("Failed to update feed",i),!1}}async function U(t){const e=a.items.find(i=>i._id===t);e&&h(t,{starred:!e.starred})}async function V(t){if(a.items.find(i=>i._id===t))try{const i=await m(`/api/item/${t}/content`);if(i.ok){const s=await i.json();s.full_content&&h(t,{full_content:s.full_content})}}catch(i){console.error("Failed to fetch full content",i)}}async function h(t,e){try{if((await m(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const s=a.items.find(n=>n._id===t);if(s){Object.assign(s,e);const n=document.querySelector(`.feed-item[data-id="${t}"]`);if(n){if(e.read!==void 0&&n.classList.toggle("read",e.read),e.starred!==void 0){const o=n.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",e.starred),o.classList.toggle("is-unstarred",!e.starred),o.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&L()}}}}catch(i){console.error("Failed to update item",i)}}async function b(){const t=await m("/api/feed/");if(t.ok){const e=await t.json();a.setFeeds(e)}}async function F(){const t=await m("/api/tag");if(t.ok){const e=await t.json();a.setTags(e)}}async function E(t,e,i=!1){a.setLoading(!0);try{const s=new URLSearchParams;t&&s.append("feed_id",t),e&&s.append("tag",e),a.searchQuery&&s.append("q",a.searchQuery),(a.filter==="starred"||a.filter==="all")&&s.append("read_filter","all"),a.filter==="starred"&&s.append("starred","true"),i&&a.items.length>0&&s.append("max_id",String(a.items[a.items.length-1]._id));const n=await m(`/api/stream?${s.toString()}`);if(n.ok){const o=await n.json();a.setHasMore(o.length>0),a.setItems(o,i)}}finally{a.setLoading(!1)}}async function I(){const t=r.getCurrentRoute();E(t.params.feedId,t.params.tagName,!0)}async function W(){await m("/api/logout",{method:"POST"}),window.location.href="/login/"}function S(){const t=r.getCurrentRoute(),e=t.query.get("filter");a.setFilter(e||"unread");const i=t.query.get("q");if(i!==null&&a.setSearchQuery(i),t.path==="/settings"){w();return}if(t.path==="/feed"&&t.params.feedId){const s=parseInt(t.params.feedId);a.setActiveFeed(s),E(t.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else t.path==="/tag"&&t.params.tagName?(a.setActiveTag(t.params.tagName),E(void 0,t.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(a.setActiveFeed(null),a.setActiveTag(null),E())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":T(1);break;case"k":T(-1);break;case"r":if(c){const e=a.items.find(i=>i._id===c);e&&h(e._id,{read:!e.read})}break;case"s":if(c){const e=a.items.find(i=>i._id===c);e&&h(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function T(t){if(a.items.length===0)return;const e=a.items.findIndex(s=>s._id===c);let i;if(e===-1?i=t>0?0:a.items.length-1:i=e+t,i>=0&&i<a.items.length){c=a.items[i]._id,document.querySelectorAll(".feed-item").forEach(n=>{const o=parseInt(n.getAttribute("data-id")||"0");n.classList.toggle("selected",o===c)});const s=document.querySelector(`.feed-item[data-id="${c}"]`);s&&s.scrollIntoView({block:"start",behavior:"smooth"}),a.items[i].read||h(c,{read:!0})}}a.on("feeds-updated",k);a.on("tags-updated",$);a.on("active-feed-updated",k);a.on("active-tag-updated",$);a.on("filter-updated",_);a.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==a.searchQuery&&(t.value=a.searchQuery),S()});a.on("theme-updated",()=>{p||(p=document.querySelector("#app")),p&&(p.className=`theme-${a.theme} font-${a.fontTheme}`)});a.on("sidebar-toggle",()=>{const t=document.querySelector(".layout");t&&(a.sidebarVisible?(t.classList.remove("sidebar-hidden"),t.classList.add("sidebar-visible")):(t.classList.remove("sidebar-visible"),t.classList.add("sidebar-hidden")))});a.on("items-updated",L);a.on("loading-state-changed",L);r.addEventListener("route-changed",S);window.app={navigate:t=>r.navigate(t)};async function J(){const t=await m("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}q(),_();try{await Promise.all([b(),F()])}catch(e){console.error("Initial fetch failed",e)}S()}typeof window<"u"&&!window.__VITEST__&&J();
