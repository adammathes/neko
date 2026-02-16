(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&a(c)}).observe(document,{childList:!0,subtree:!0});function t(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(n){if(n.ep)return;n.ep=!0;const s=t(n);fetch(n.href,s)}})();function v(i){const t=`; ${document.cookie}`.split(`; ${i}=`);if(t.length===2)return t.pop()?.split(";").shift()}async function d(i,e){const t=e?.method?.toUpperCase()||"GET",a=["POST","PUT","DELETE"].includes(t),n=new Headers(e?.headers||{});if(a){const s=v("csrf_token");s&&n.set("X-CSRF-Token",s)}return fetch(i,{...e,headers:n,credentials:"include"})}class w extends EventTarget{feeds=[];items=[];activeFeedId=null;loading=!1;setFeeds(e){this.feeds=e,this.emit("feeds-updated")}setItems(e){this.items=e,this.emit("items-updated")}setActiveFeed(e){this.activeFeedId=e,this.emit("active-feed-updated")}setLoading(e){this.loading=e,this.emit("loading-state-changed")}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t}))}on(e,t){this.addEventListener(e,t)}}const o=new w;class y extends EventTarget{constructor(){super(),window.addEventListener("popstate",()=>this.handleRouteChange())}handleRouteChange(){this.dispatchEvent(new CustomEvent("route-changed",{detail:this.getCurrentRoute()}))}getCurrentRoute(){const t=window.location.pathname.replace(/^\/v3\//,"").split("/").filter(Boolean);let a="/";const n={};return t[0]==="feed"&&t[1]?(a="/feed",n.feedId=t[1]):t[0]==="tag"&&t[1]&&(a="/tag",n.tagName=t[1]),{path:a,params:n}}navigate(e){window.history.pushState({},"",`/v3${e}`),this.handleRouteChange()}}const f=new y;function E(i,e){return`
    <li class="feed-item ${e?"active":""}" data-id="${i._id}">
      <a href="/v3/feed/${i._id}" class="feed-link" onclick="event.preventDefault(); window.app.navigate('/feed/${i._id}')">
        ${i.title||i.url}
      </a>
    </li>
  `}const L=document.querySelector("#app");L.innerHTML=`
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Neko v3</h2>
      </div>
      <ul id="feed-list" class="feed-list"></ul>
    </aside>
    <section class="item-list-pane">
      <header class="top-bar">
        <h1 id="view-title">All Items</h1>
      </header>
      <div id="item-list-container" class="item-list-container"></div>
    </section>
    <main class="item-detail-pane">
      <div id="item-detail-content" class="item-detail-content">
        <div class="empty-state">Select an item to read</div>
      </div>
    </main>
  </div>
`;const $=document.getElementById("feed-list"),l=document.getElementById("view-title"),r=document.getElementById("item-list-container"),m=document.getElementById("item-detail-content");function p(){const{feeds:i,activeFeedId:e}=o;$.innerHTML=i.map(t=>E(t,t._id===e)).join("")}function h(){const{items:i,loading:e}=o;if(e){r.innerHTML='<p class="loading">Loading items...</p>';return}if(i.length===0){r.innerHTML='<p class="empty">No items found.</p>';return}r.innerHTML=`
    <ul class="item-list">
      ${i.map(t=>`
        <li class="item-row ${t.read?"read":""}" data-id="${t._id}">
          <div class="item-title">${t.title}</div>
          <div class="item-meta">${t.feed_title||""}</div>
        </li>
      `).join("")}
    </ul>
  `,r.querySelectorAll(".item-row").forEach(t=>{t.addEventListener("click",()=>{const a=parseInt(t.getAttribute("data-id")||"0");I(a)})})}async function I(i){const e=o.items.find(t=>t._id===i);if(e){if(r.querySelectorAll(".item-row").forEach(t=>{t.classList.toggle("active",parseInt(t.getAttribute("data-id")||"0")===i)}),m.innerHTML=`
    <article class="item-detail">
      <header>
        <h1><a href="${e.url}" target="_blank">${e.title}</a></h1>
        <div class="item-meta">
          From ${e.feed_title||"Unknown"} on ${new Date(e.publish_date).toLocaleString()}
        </div>
      </header>
      <div id="full-content" class="full-content">
        ${e.description||"No description available."}
      </div>
    </article>
  `,!e.read)try{await d(`/api/item/${e._id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({read:!0})}),e.read=!0;const t=r.querySelector(`.item-row[data-id="${i}"]`);t&&t.classList.add("read")}catch(t){console.error("Failed to mark as read",t)}if(e.url&&(!e.full_content||e.full_content===e.description))try{const t=await d(`/api/item/${e._id}/content`);if(t.ok){const a=await t.json();if(a.full_content){e.full_content=a.full_content;const n=document.getElementById("full-content");n&&(n.innerHTML=a.full_content)}}}catch(t){console.error("Failed to fetch full content",t)}}}async function F(){try{const i=await d("/api/feed/");if(!i.ok)throw new Error("Failed to fetch feeds");const e=await i.json();o.setFeeds(e)}catch(i){console.error(i)}}async function u(i,e){o.setLoading(!0);try{let t="/api/stream";const a=new URLSearchParams;i&&a.append("feed_id",i),e&&a.append("tag",e);const n=await d(`${t}?${a.toString()}`);if(!n.ok)throw new Error("Failed to fetch items");const s=await n.json();o.setItems(s),m.innerHTML='<div class="empty-state">Select an item to read</div>'}catch(t){console.error(t),o.setItems([])}finally{o.setLoading(!1)}}function g(){const i=f.getCurrentRoute();if(i.path==="/feed"&&i.params.feedId){const e=parseInt(i.params.feedId);o.setActiveFeed(e);const t=o.feeds.find(a=>a._id===e);l.textContent=t?t.title:`Feed ${e}`,u(i.params.feedId)}else i.path==="/tag"&&i.params.tagName?(o.setActiveFeed(null),l.textContent=`Tag: ${i.params.tagName}`,u(void 0,i.params.tagName)):(o.setActiveFeed(null),l.textContent="All Items",u())}o.on("feeds-updated",p);o.on("active-feed-updated",p);o.on("items-updated",h);o.on("loading-state-changed",h);f.addEventListener("route-changed",g);window.app={navigate:i=>f.navigate(i)};async function _(){if((await d("/api/auth")).status===401){window.location.href="/login/";return}await F(),g()}_();
