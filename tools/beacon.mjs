// Beacon-ul de deschideri, identic cu cel din src/layouts/Layout.astro, pentru paginile statice din static/<slug>/.
export const beacon = (name) => `<script>
(function(){try{var qs=new URLSearchParams(location.search);if(qs.get("eu")==="0")localStorage.removeItem("dga_owner");if(qs.get("eu")==="1")localStorage.setItem("dga_owner","1");var owner=localStorage.getItem("dga_owner")==="1";if(owner){var b=document.createElement("div");b.textContent="Deschideri ignorate (eu=1) · ?eu=0 ca să fii numărat";b.style.cssText="position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:6px 10px;border-radius:6px;background:rgba(23,19,15,.85);color:#F3EEE6;font:12px/1.3 -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none";document.body.appendChild(b)}var key="dga_seen:"+location.pathname;if(!owner&&!sessionStorage.getItem(key)&&location.hostname.indexOf("digitalguild.agency")>-1){sessionStorage.setItem(key,"1");setTimeout(function(){fetch("/api/view",{method:"POST",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify({path:location.pathname,r:qs.get("r")||"",name:${JSON.stringify(name)},silent:qs.get("via")==="propunere"})}).catch(function(){})},1500)}}catch(e){}})();
</script>`;

// „Ion Popescu” + „Clinica Zâmbet SRL” → "Ion-Popescu_Clinica-Zambet-SRL" (fără diacritice, URL-safe)
export const refTag = (contact, company) => [contact, company]
  .map((s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
  .filter(Boolean).join("_");
