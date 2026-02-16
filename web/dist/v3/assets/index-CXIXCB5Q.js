(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function a(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=a(s);fetch(s.href,r)}})();function F(t){const a=`; ${document.cookie}`.split(`; ${t}=`);if(a.length===2)return a.pop()?.split(";").shift()}async function g(t,e){const a=e?.method?.toUpperCase()||"GET",i=["POST","PUT","DELETE"].includes(a),s=new Headers(e?.headers||{});if(i){const r=F("csrf_token");r&&s.set("X-CSRF-Token",r)}return fetch(t,{...e,headers:s,credentials:"include"})}class A extends EventTarget{feeds=[];tags=[];items=[];activeFeedId=null;activeTagName=null;filter="unread";searchQuery="";loading=!1;hasMore=!0;theme=localStorage.getItem("neko-theme")||"light";fontTheme=localStorage.getItem("neko-font-theme")||"default";setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setTags(e){this.tags=e,this.emit("tags-updated")}setItems(e,a=!1){a?this.items=[...this.items,...e]:this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.activeTagName=null,this.emit("active-feed-updated")}setActiveTag(e){this.activeTagName=e,this.activeFeedId=null,this.emit("active-tag-updated")}setFilter(e){this.filter!==e&&(this.filter=e,this.emit("filter-updated"))}setSearchQuery(e){this.searchQuery!==e&&(this.searchQuery=e,this.emit("search-updated"))}setLoading(e){this.loading=e,this.emit("loading-state-changed")}setHasMore(e){this.hasMore=e}setTheme(e){this.theme=e,localStorage.setItem("neko-theme",e),this.emit("theme-updated")}setFontTheme(e){this.fontTheme=e,localStorage.setItem("neko-font-theme",e),this.emit("theme-updated")}emit(e,a){this.dispatchEvent(new CustomEvent(e,{detail:a}))}on(e,a){this.addEventListener(e,a)}}const n=new A;class R extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const e=new URL(window.location.href),i=e.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let s="/";const r={};return i[0]==="feed"&&i[1]?(s="/feed",r.feedId=i[1]):i[0]==="tag"&&i[1]?(s="/tag",r.tagName=decodeURIComponent(i[1])):i[0]==="settings"&&(s="/settings"),{path:s,params:r,query:e.searchParams}}navigate(e,a){let i=`/v3${e}`;if(a){const s=new URLSearchParams(a);i+=`?${s.toString()}`}window.history.pushState({},"",i),this.handleRouteChange()}updateQuery(e){const a=new URL(window.location.href);for(const[i,s]of Object.entries(e))s?a.searchParams.set(i,s):a.searchParams.delete(i);window.history.pushState({},"",a.toString()),this.handleRouteChange()}}const d=new R;function B(t){const e=new Date(t.publish_date).toLocaleDateString();return`
    <li class="feed-item ${t.read?"read":"unread"}" data-id="${t._id}">
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
          ${e}
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
  `}let c=null,h=null;function C(){h=document.querySelector("#app"),h&&(h.className=`theme-${n.theme} font-${n.fontTheme}`,h.innerHTML=`
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <h2 id="logo-link">Neko v3</h2>
        </div>
        <div class="sidebar-search">
          <input type="search" id="search-input" placeholder="Search..." value="${n.searchQuery}">
        </div>
        <div class="sidebar-scroll">
          <section class="sidebar-section">
            <h3>Filters</h3>
            <ul id="filter-list">
              <li class="filter-item" data-filter="unread"><a href="/v3/?filter=unread" data-nav="filter" data-value="unread">Unread</a></li>
              <li class="filter-item" data-filter="all"><a href="/v3/?filter=all" data-nav="filter" data-value="all">All</a></li>
              <li class="filter-item" data-filter="starred"><a href="/v3/?filter=starred" data-nav="filter" data-value="starred">Starred</a></li>
            </ul>
          </section>
          <section class="sidebar-section">
            <h3>Tags</h3>
            <ul id="tag-list"></ul>
          </section>
          <section class="sidebar-section">
            <h3>Feeds</h3>
            <ul id="feed-list"></ul>
          </section>
        </div>
        <div class="sidebar-footer">
          <a href="/v3/settings" id="settings-link">Settings</a>
          <a href="#" id="logout-button">Logout</a>
        </div>
      </aside>
      <main class="main-content" id="main-content">
        <div id="content-area"></div>
      </main>
    </div>
  `,N())}function N(){document.getElementById("search-input")?.addEventListener("input",o=>{const m=o.target.value;d.updateQuery({q:m})}),document.getElementById("logo-link")?.addEventListener("click",()=>d.navigate("/")),document.getElementById("logout-button")?.addEventListener("click",o=>{o.preventDefault(),U()}),document.getElementById("settings-link")?.addEventListener("click",o=>{o.preventDefault(),d.navigate("/settings")}),document.getElementById("sidebar")?.addEventListener("click",o=>{const l=o.target.closest("a");if(!l)return;const p=l.getAttribute("data-nav"),b=Object.fromEntries(d.getCurrentRoute().query.entries());if(p==="filter"){o.preventDefault();const u=l.getAttribute("data-value");d.updateQuery({filter:u})}else if(p==="tag"){o.preventDefault();const u=l.getAttribute("data-value");d.navigate(`/tag/${encodeURIComponent(u)}`,b)}else if(p==="feed"){o.preventDefault();const u=l.getAttribute("data-value");d.navigate(`/feed/${u}`,b)}}),document.getElementById("content-area")?.addEventListener("click",o=>{const m=o.target,l=m.closest('[data-action="toggle-star"]');if(l){const f=l.closest("[data-id]");if(f){const v=parseInt(f.getAttribute("data-id"));P(v)}return}const p=m.closest('[data-action="scrape"]');if(p){const f=p.closest("[data-id]");if(f){const v=parseInt(f.getAttribute("data-id"));M(v)}return}const b=m.closest('[data-action="open"]'),u=m.closest(".feed-item");if(u&&!b){const f=parseInt(u.getAttribute("data-id")),v=n.items.find(_=>_._id===f);v&&!v.read&&y(f,{read:!0})}})}function E(){const{feeds:t,activeFeedId:e}=n,a=document.getElementById("feed-list");a&&(a.innerHTML=t.map(i=>`
    <li class="${i._id===e?"active":""}">
      <a href="/v3/feed/${i._id}" data-nav="feed" data-value="${i._id}">
        ${i.title||i.url}
      </a>
    </li>
  `).join(""))}function $(){const{tags:t,activeTagName:e}=n,a=document.getElementById("tag-list");a&&(a.innerHTML=t.map(i=>`
    <li class="${i.title===e?"active":""}">
      <a href="/v3/tag/${encodeURIComponent(i.title)}" data-nav="tag" data-value="${i.title}">
        ${i.title}
      </a>
    </li>
  `).join(""))}function k(){const{filter:t}=n,e=document.getElementById("filter-list");e&&e.querySelectorAll("li").forEach(a=>{a.classList.toggle("active",a.getAttribute("data-filter")===t)})}function w(){const{items:t,loading:e}=n,a=document.getElementById("content-area");if(!a||d.getCurrentRoute().path==="/settings")return;if(e&&t.length===0){a.innerHTML='<p class="loading">Loading items...</p>';return}if(t.length===0){a.innerHTML='<p class="empty">No items found.</p>';return}a.innerHTML=`
    <ul class="item-list">
      ${t.map(s=>B(s)).join("")}
    </ul>
    ${n.hasMore?'<div id="load-more-sentinel" class="loading-more">Loading more...</div>':""}
  `;const i=document.getElementById("load-more-sentinel");i&&new IntersectionObserver(r=>{r[0].isIntersecting&&!n.loading&&n.hasMore&&O()},{threshold:.1}).observe(i)}function S(){const t=document.getElementById("content-area");if(!t)return;t.innerHTML=`
        <div class="settings-view">
            <h2>Settings</h2>
            <section class="settings-section">
                <h3>Theme</h3>
                <div class="theme-options" id="theme-options">
                    <button class="${n.theme==="light"?"active":""}" data-theme="light">Light</button>
                    <button class="${n.theme==="dark"?"active":""}" data-theme="dark">Dark</button>
                </div>
            </section>
            <section class="settings-section">
                <h3>Font</h3>
                <select id="font-selector">
                    <option value="default" ${n.fontTheme==="default"?"selected":""}>Default (Palatino)</option>
                    <option value="serif" ${n.fontTheme==="serif"?"selected":""}>Serif (Georgia)</option>
                    <option value="sans" ${n.fontTheme==="sans"?"selected":""}>Sans-Serif (Helvetica)</option>
                    <option value="mono" ${n.fontTheme==="mono"?"selected":""}>Monospace</option>
                </select>
            </section>
        </div>
    `,document.getElementById("theme-options")?.addEventListener("click",i=>{const s=i.target.closest("button");if(s){const r=s.getAttribute("data-theme");n.setTheme(r),S()}});const a=document.getElementById("font-selector");a?.addEventListener("change",()=>{n.setFontTheme(a.value)})}async function P(t){const e=n.items.find(a=>a._id===t);e&&y(t,{starred:!e.starred})}async function M(t){if(n.items.find(a=>a._id===t))try{const a=await g(`/api/item/${t}/content`);if(a.ok){const i=await a.json();i.full_content&&y(t,{full_content:i.full_content})}}catch(a){console.error("Failed to fetch full content",a)}}async function y(t,e){try{if((await g(`/api/item/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).ok){const i=n.items.find(s=>s._id===t);if(i){Object.assign(i,e);const s=document.querySelector(`.feed-item[data-id="${t}"]`);if(s){if(e.read!==void 0&&s.classList.toggle("read",e.read),e.starred!==void 0){const r=s.querySelector(".star-btn");r&&(r.classList.toggle("is-starred",e.starred),r.classList.toggle("is-unstarred",!e.starred),r.setAttribute("title",e.starred?"Unstar":"Star"))}e.full_content&&w()}}}}catch(a){console.error("Failed to update item",a)}}async function Q(){const t=await g("/api/feed/");if(t.ok){const e=await t.json();n.setFeeds(e)}}async function q(){const t=await g("/api/tag");if(t.ok){const e=await t.json();n.setTags(e)}}async function I(t,e,a=!1){n.setLoading(!0);try{const i=new URLSearchParams;t&&i.append("feed_id",t),e&&i.append("tag",e),n.searchQuery&&i.append("q",n.searchQuery),(n.filter==="starred"||n.filter==="all")&&i.append("read_filter","all"),n.filter==="starred"&&i.append("starred","true"),a&&n.items.length>0&&i.append("max_id",String(n.items[n.items.length-1]._id));const s=await g(`/api/stream?${i.toString()}`);if(s.ok){const r=await s.json();n.setHasMore(r.length>=50),n.setItems(r,a)}}finally{n.setLoading(!1)}}async function O(){const t=d.getCurrentRoute();I(t.params.feedId,t.params.tagName,!0)}async function U(){await g("/api/logout",{method:"POST"}),window.location.href="/login/"}function L(){const t=d.getCurrentRoute(),e=t.query.get("filter");n.setFilter(e||"unread");const a=t.query.get("q");if(a!==null&&n.setSearchQuery(a),t.path==="/settings"){S();return}if(t.path==="/feed"&&t.params.feedId){const i=parseInt(t.params.feedId);n.setActiveFeed(i),I(t.params.feedId)}else t.path==="/tag"&&t.params.tagName?(n.setActiveTag(t.params.tagName),I(void 0,t.params.tagName)):(n.setActiveFeed(null),n.setActiveTag(null),I())}window.addEventListener("keydown",t=>{if(!["INPUT","TEXTAREA"].includes(t.target.tagName))switch(t.key){case"j":T(1);break;case"k":T(-1);break;case"r":if(c){const e=n.items.find(a=>a._id===c);e&&y(e._id,{read:!e.read})}break;case"s":if(c){const e=n.items.find(a=>a._id===c);e&&y(e._id,{starred:!e.starred})}break;case"/":t.preventDefault(),document.getElementById("search-input")?.focus();break}});function T(t){if(n.items.length===0)return;let e=n.items.findIndex(a=>a._id===c);if(e+=t,e>=0&&e<n.items.length){c=n.items[e]._id;const a=document.querySelector(`.feed-item[data-id="${c}"]`);a&&a.scrollIntoView({block:"nearest"}),n.items[e].read||y(c,{read:!0})}else if(e===-1){c=n.items[0]._id;const a=document.querySelector(`.feed-item[data-id="${c}"]`);a&&a.scrollIntoView({block:"nearest"})}}n.on("feeds-updated",E);n.on("tags-updated",$);n.on("active-feed-updated",E);n.on("active-tag-updated",$);n.on("filter-updated",k);n.on("search-updated",()=>{const t=document.getElementById("search-input");t&&t.value!==n.searchQuery&&(t.value=n.searchQuery),L()});n.on("theme-updated",()=>{h||(h=document.querySelector("#app")),h&&(h.className=`theme-${n.theme} font-${n.fontTheme}`)});n.on("items-updated",w);n.on("loading-state-changed",w);d.addEventListener("route-changed",L);window.app={navigate:t=>d.navigate(t)};async function j(){const t=await g("/api/auth");if(!t||t.status===401){window.location.href="/login/";return}C(),k();try{await Promise.all([Q(),q()])}catch(e){console.error("Initial fetch failed",e)}L()}typeof window<"u"&&!window.__VITEST__&&j();
