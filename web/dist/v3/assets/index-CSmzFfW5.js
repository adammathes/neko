(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function i(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(s){if(s.ep)return;s.ep=!0;const o=i(s);fetch(s.href,o)}})();function A(t){const i=`; ${document.cookie}`.split(`; ${t}=`);if(i.length===2)return i.pop()?.split(";").shift()}async function f(t,e){const i=e?.method?.toUpperCase()||"GET",a=["POST","PUT","DELETE"].includes(i),s=new Headers(e?.headers||{});if(a){const o=A("csrf_token");o&&s.set("X-CSRF-Token",o)}return fetch(t,{...e,headers:s,credentials:"include"})}function C(){const t=document.cookie.split("; ").find(e=>e.startsWith("neko_sidebar="));return t?t.split("=")[1]==="1":null}function B(t){document.cookie=`neko_sidebar=${t?"1":"0"}; path=/; max-age=31536000; SameSite=Lax`}function P(){const t=C();return t!==null?t:window.innerWidth>1024}class H extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";headingFontTheme=localStorage.getItem("neko-heading-font-theme")||"default";sidebarVisible=P();setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,i=!1){i?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}setHeadingFontTheme(e){this.headingFontTheme=e,localStorage.setItem("neko-heading-font-theme",e),this.emit("theme-updated")}setSidebarVisible(e){this.sidebarVisible=e,B(e),this.emit("sidebar-toggle")}toggleSidebar(){this.setSidebarVisible(!this.sidebarVisible)}emit(e,i){this.dispatchEvent(new CustomEvent(e,{detail:i}))}on(e,i){this.addEventListener(e,i)}}const n=new H;class M extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),a=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const o={};return a[0]==="feed"&&a[1]?(s="/feed",o.feedId=a[1]):a[0]==="tag"&&a[1]?(s="/tag",o.tagName=decodeURIComponent(a[1])):a[0]==="settings"&&(s="/settings"),{path:s,params:o,query:e.searchParams}}navigate(e,i){let a=`/v3${e}`;if(i){const s=new URLSearchParams(i);a+=`?${s.toString()}`}window.history.pushState({},"",a),this.handleRouteChange()}updateQuery(e){const i=new URL(window.location.href);for(const[a,s]of Object.entries(e))s?i.searchParams.set(a,s):i.searchParams.delete(a);window.history.pushState({},"",i.toString()),this.handleRouteChange()}}const r=new M;function O(t,e=!1){const i=new Date(t.publish_date).toLocaleDateString();return`
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
  `}let c=null,m=null;function D(){m=document.querySelector("#app"),m&&(m.className=`theme-${n.theme} font-${n.fontTheme} heading-font-${n.headingFontTheme}`,m.innerHTML=`
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
  `,q())}function q(){document.getElementById("search-input")?.addEventListener("input",s=>{const o=s.target.value;r.updateQuery({q:o})}),document.getElementById("logo-link")?.addEventListener("click",()=>r.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",s=>{s.preventDefault(),X()}),document.getElementById("sidebar-toggle-btn")?.addEventListener("click",()=>{n.toggleSidebar()}),document.getElementById("sidebar-backdrop")?.addEventListener("click",()=>{n.setSidebarVisible(!1)}),document.querySelectorAll(".sidebar-section.collapsible h3").forEach(s=>{s.addEventListener("click",()=>{s.parentElement?.classList.toggle("collapsed")})}),document.getElementById("sidebar")?.addEventListener("click",s=>{const o=s.target,d=o.closest("a");if(!d){o.classList.contains("logo")&&(s.preventDefault(),r.navigate("/",{}));return}const h=d.getAttribute("data-nav"),g=Object.fromEntries(r.getCurrentRoute().query.entries());if(h==="filter"){s.preventDefault();const u=d.getAttribute("data-value");r.getCurrentRoute().path==="/settings"?r.navigate("/",{...g,filter:u}):r.updateQuery({filter:u})}else if(h==="tag"){s.preventDefault();const u=d.getAttribute("data-value");r.navigate(`/tag/${encodeURIComponent(u)}`,g)}else if(h==="feed"){s.preventDefault();const u=d.getAttribute("data-value"),l=r.getCurrentRoute();n.activeFeedId===parseInt(u)&&l.path!=="/settings"?r.navigate("/",g):r.navigate(`/feed/${u}`,g)}else h==="settings"&&(s.preventDefault(),r.getCurrentRoute().path==="/settings"?r.navigate("/",g):r.navigate("/settings",g));window.innerWidth<=768&&n.setSidebarVisible(!1)}),document.getElementById("content-area")?.addEventListener("click",s=>{const o=s.target,d=o.closest('[data-action="toggle-star"]');if(d){const l=d.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));j(v)}return}const h=o.closest('[data-action="scrape"]');if(h){const l=h.closest("[data-id]");if(l){const v=parseInt(l.getAttribute("data-id"));V(v)}return}const g=o.closest('[data-action="open"]'),u=o.closest(".feed-item");if(u&&!g){const l=parseInt(u.getAttribute("data-id"));c=l,document.querySelectorAll(".feed-item").forEach(b=>{const R=parseInt(b.getAttribute("data-id")||"0");b.classList.toggle("selected",R===c)});const v=n.items.find(b=>b._id===l);v&&!v.read&&p(l,{read:!0})}})}function k(){const{feeds:t,activeFeedId:e}=n,i=document.getElementById("feed-list");i&&(i.innerHTML=t.map(a=>`
    <li class="${a._id===e?"active":""}">
      <a href="/v3/feed/${a._id}" data-nav="feed" data-value="${a._id}">
        ${a.title||a.url}
      </a>
    </li>
  `).join(""))}function $(){}function F(){const{filter:t}=n,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-filter")===t)})}function w(){const{items:t,loading:e}=n,i=document.getElementById("content-area");if(!i||r.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){i.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){i.innerHTML='<p class="empty">No items found.</p>';return}i.innerHTML=`
    <ul class="item-list">
      ${t.map(s=>O(s,s._id===c)).join("")}
    </ul>
    ${n.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const a=document.getElementById("main-content");if(a){let s=null;a.onscroll=()=>{!n.loading&&n.hasMore&&a.scrollHeight>a.clientHeight&&a.scrollHeight-a.scrollTop-a.clientHeight<200&&T(),s===null&&(s=window.setTimeout(()=>{_(a),s=null},250))}}}function _(t){const e=t.getBoundingClientRect();n.items.forEach(i=>{if(i.read)return;const a=document.querySelector(`.feed-item[data-id="${i._id}"]`);a&&a.getBoundingClientRect().bottom<e.top&&p(i._id,{read:!0})})}typeof window<"u"&&setInterval(()=>{const t=document.getElementById("main-content");if(n.loading||!n.hasMore)return;if(t&&(_(t),t.scrollHeight>t.clientHeight&&t.scrollHeight-t.scrollTop-t.clientHeight<200)){T();return}const e=document.documentElement.scrollHeight||document.body.scrollHeight,i=window.innerHeight,a=window.scrollY||document.documentElement.scrollTop;e>i&&e-i-a<200&&T()},1e3);function I(){const t=document.getElementById("content-area");if(!t)return;t.innerHTML=`
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
            <label>System & headings</label>
            <select id="heading-font-selector" style="margin-bottom: 1rem;">
              <option value="default" ${n.headingFontTheme==="default"?"selected":""}>System (Helvetica Neue)</option>
              <option value="serif" ${n.headingFontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
              <option value="sans" ${n.headingFontTheme==="sans"?"selected":""}>Sans-Serif (Inter/System)</option>
              <option value="mono" ${n.headingFontTheme==="mono"?"selected":""}>Monospace</option>
            </select>

            <label>article body</label>
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
  `,document.getElementById("theme-options")?.addEventListener("click",a=>{const s=a.target.closest("button");s&&(n.setTheme(s.getAttribute("data-theme")),I())}),document.getElementById("heading-font-selector")?.addEventListener("change",a=>{n.setHeadingFontTheme(a.target.value)}),document.getElementById("font-selector")?.addEventListener("change",a=>{n.setFontTheme(a.target.value)}),document.getElementById("add-feed-btn")?.addEventListener("click",async()=>{const a=document.getElementById("new-feed-url"),s=a.value.trim();s&&(await N(s)?(a.value="",alert("Feed added successfully!"),y()):alert("Failed to add feed."))});let e="opml";const i=document.getElementById("import-file");document.querySelectorAll(".import-btn").forEach(a=>{a.addEventListener("click",s=>{e=s.currentTarget.getAttribute("data-format")||"opml",i.click()})}),i?.addEventListener("change",async a=>{const s=a.target.files?.[0];s&&(await x(s,e)?(alert(`Import (${e}) started! check logs.`),y()):alert("Failed to import.")),i.value=""}),document.querySelectorAll(".delete-feed-btn").forEach(a=>{a.addEventListener("click",async s=>{const o=parseInt(s.target.getAttribute("data-id"));confirm("Delete this feed?")&&(await Q(o),await y(),I())})})}async function N(t){try{return(await f("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})})).ok}catch(e){return console.error("Failed to add feed",e),!1}}async function x(t,e){try{const i=new FormData;i.append("file",t),i.append("format",e);const a=document.cookie.split("; ").find(o=>o.startsWith("csrf_token="))?.split("=")[1];return(await fetch("/api/import",{method:"POST",headers:{"X-CSRF-Token":a||""},body:i})).ok}catch(i){return console.error("Failed to import",i),!1}}async function Q(t){try{return(await f(`/api/feed/${t}`,{method:"DELETE"})).ok}catch(e){return console.error("Failed to delete feed",e),!1}}async function j(t){const e=n.items.find(i=>i._id===t);e&&p(t,{starred:!e.starred})}async function V(t){if(n.items.find(i=>i._id===t))try{const i=await f(`/api/item/${t}/content`);if(i.ok){const a=await i.json();a.full_content&&p(t,{full_content:a.full_content})}}catch(i){console.error("Failed to fetch full content",i)}}async function p(t,e){try{if((await f(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const a=n.items.find(s=>s._id===t);if(a){Object.assign(a,e);const s=document.querySelector(`.feed-item[data-id="${t}"]`);if(s){if(e.read!==void 0&&s.classList.toggle("read",e.read),e.starred!==void 0){const o=s.querySelector(".star-btn");o&&(o.classList.toggle("is-starred",e.starred),o.classList.toggle("is-unstarred",!e.starred),o.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&w()}}}}catch(i){console.error("Failed to update item",i)}}async function y(){const t=await f("/api/feed/");if(t.ok){const e=await t.json();n.setFeeds(e)}}async function U(){const t=await f("/api/tag");if(t.ok){const e=await t.json();n.setTags(e)}}async function E(t,e,i=!1){n.setLoading(!0);try{const a=new URLSearchParams;t&&a.append("feed_id",t),e&&a.append("tag",e),n.searchQuery&&a.append("q",n.searchQuery),(n.filter==="starred"||n.filter==="all")&&a.append("read_filter","all"),n.filter==="starred"&&a.append("starred","true"),i&&n.items.length>0&&a.append("max_id",String(n.items[n.items.length-1]._id));const s=await f(`/api/stream?${a.toString()}`);if(s.ok){const o=await s.json();n.setHasMore(o.length>0),n.setItems(o,i)}}finally{n.setLoading(!1)}}async function T(){const t=r.getCurrentRoute();E(t.params.feedId,t.params.tagName,!0)}async function X(){await f("/api/logout",{method:"POST"}),window.location.href="/login/"}function S(){const t=r.getCurrentRoute(),e=t.query.get("filter");n.setFilter(e||"unread");const i=t.query.get("q");if(i!==null&&n.setSearchQuery(i),t.path==="/settings"){I();return}if(t.path==="/feed"&&t.params.feedId){const a=parseInt(t.params.feedId);n.setActiveFeed(a),E(t.params.feedId),document.getElementById("section-feeds")?.classList.remove("collapsed")}else t.path==="/tag"&&t.params.tagName?(n.setActiveTag(t.params.tagName),E(void 0,t.params.tagName),document.getElementById("section-tags")?.classList.remove("collapsed")):(n.setActiveFeed(null),n.setActiveTag(null),E())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":L(1);break;case"k":L(-1);break;case"r":if(c){const e=n.items.find(i=>i._id===c);e&&p(e._id,{read:!e.read})}break;case"s":if(c){const e=n.items.find(i=>i._id===c);e&&p(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function L(t){if(n.items.length===0)return;const e=n.items.findIndex(a=>a._id===c);let i;if(e===-1?i=t>0?0:n.items.length-1:i=e+t,i>=0&&i<n.items.length){c=n.items[i]._id,document.querySelectorAll(".feed-item").forEach(s=>{const o=parseInt(s.getAttribute("data-id")||"0");s.classList.toggle("selected",o===c)});const a=document.querySelector(`.feed-item[data-id="${c}"]`);a&&a.scrollIntoView({block:"start",behavior:"smooth"}),n.items[i].read||p(c,{read:!0})}}n.on("feeds-updated",k);n.on("tags-updated",$);n.on("active-feed-updated",k);n.on("active-tag-updated",$);n.on("filter-updated",F);n.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==n.searchQuery&&(t.value=n.searchQuery),S()});n.on("theme-updated",()=>{m||(m=document.querySelector("#app")),m&&(m.className=`theme-${n.theme} font-${n.fontTheme} heading-font-${n.headingFontTheme}`),r.getCurrentRoute().path==="/settings"&&I()});n.on("sidebar-toggle",()=>{const t=document.querySelector(".layout");t&&(n.sidebarVisible?(t.classList.remove("sidebar-hidden"),t.classList.add("sidebar-visible")):(t.classList.remove("sidebar-visible"),t.classList.add("sidebar-hidden")))});n.on("items-updated",w);n.on("loading-state-changed",w);r.addEventListener("route-changed",S);window.app={navigate:t=>r.navigate(t)};async function J(){const t=await f("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}D(),F();try{await Promise.all([y(),U()])}catch(e){console.error("Initial fetch failed",e)}S()}typeof window<"u"&&!window.__VITEST__&&J();
