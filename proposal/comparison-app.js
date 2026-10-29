(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const sidebar=$('#sidebar');
  function closeMenu(){sidebar.classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');}
  function searchFocus(){
    if(matchMedia('(max-width:900px)').matches){sidebar.classList.add('open');$('#menuBtn').setAttribute('aria-expanded','true');}
    $('#search').focus();
  }
  $('#menuBtn').onclick=()=>{const open=sidebar.classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',String(open));};
  $('#searchBtn').onclick=searchFocus;
  const moon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const sun='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  // The icon always shows the theme the next click activates, also when the page opens already in dark mode.
  function applyTheme(dark,persist){
    document.documentElement.dataset.theme=dark?'dark':'light';
    if(persist)try{localStorage.setItem('theme',dark?'dark':'light');}catch{}
    $('#themeBtn').innerHTML=dark?sun:moon;
    $('#themeBtn').setAttribute('aria-label',`Switch to ${dark?'light':'dark'} theme`);
    $('#themeBtn').title=$('#themeBtn').getAttribute('aria-label');
  }
  applyTheme(document.documentElement.dataset.theme==='dark');
  $('#themeBtn').onclick=()=>applyTheme(document.documentElement.dataset.theme!=='dark',true);
  // Search matches table rows, findings, diagrams and source entries; each result links to the nearest heading above it.
  const blocks=$$('.comparison tbody tr, .comparison .finding, .comparison figure, .comparison .callout, .comparison ol.src li');
  const headingFor=el=>{
    const container=el.closest('.tbl, .findings, figure, .callout, ol.src')||el;
    for(let n=container;n;n=n.previousElementSibling)if(n.matches('h3[id], h2'))return n;
    return el.closest('section').querySelector('h2');
  };
  const rowLabel=el=>{
    const own=el.querySelector('th[scope=row], h4, .fh');
    return own?own.textContent.trim():'';
  };
  $('#search').addEventListener('input',()=>{
    const terms=$('#search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches=terms.length?blocks.filter(b=>terms.every(t=>b.textContent.toLowerCase().includes(t))):[];
    $('#results').replaceChildren();
    for(const b of matches.slice(0,12)){
      const heading=headingFor(b), section=b.closest('section');
      const li=document.createElement('li'),a=document.createElement('a');
      a.href='#'+(heading.id||section.id);
      const label=rowLabel(b);
      a.textContent=(label?label+' · ':'')+heading.textContent.trim();
      li.append(a);$('#results').append(li);
    }
    $('#searchStatus').textContent=terms.length?`${matches.length} matching rows`:'';
  });
  document.addEventListener('click',e=>{if(e.target.closest('a[href^="#"]'))closeMenu();});
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchFocus();}
    if(e.key==='Escape'){closeMenu();$('#search').blur();}
  });
  // Small screens stack table rows, so each cell carries its column header for the stacked layout.
  document.querySelectorAll('table').forEach(t=>{const heads=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());if(!heads.length)return;t.querySelectorAll('tbody tr').forEach(tr=>{let i=0;for(const cell of tr.children){if(cell.tagName==='TD'&&heads[i]&&!cell.dataset.label)cell.dataset.label=heads[i];i+=cell.colSpan||1;}});});
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries)if(e.isIntersecting)$$('.contents a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));
  },{rootMargin:'-12% 0px -70% 0px'});
  $$('section.section').forEach(s=>observer.observe(s));
  $$('.download').forEach(a=>a.addEventListener('click',async e=>{
    e.preventDefault();$('#status').textContent='Preparing comparison download…';
    try{
      const response=await fetch(a.href,{cache:'no-store'});
      if(!response.ok)throw Error(response.status);
      const blob=a.id==='pdfBtn'?await DocumentLinks.pdf(await response.arrayBuffer()):a.id==='mdBtn'?new Blob([DocumentLinks.markdown(await response.text())],{type:'text/markdown;charset=utf-8'}):await response.blob();
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=a.download;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      $('#status').textContent='Download ready';
    }catch{
      $('#status').textContent='Download unavailable; please retry shortly.';
      if(a.id==='pdfBtn')window.print();
    }
  }));
  let before;
  addEventListener('beforeprint',()=>{before=document.documentElement.dataset.theme;document.documentElement.dataset.theme='light';});
  addEventListener('afterprint',()=>{document.documentElement.dataset.theme=before||'light';});
})();
