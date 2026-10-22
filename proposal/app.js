(() => {
  const $ = s => document.querySelector(s);
  const sidebar = $('.sidebar');
  $('#menuBtn').onclick = () => {
    sidebar.classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', sidebar.classList.contains('open'));
  };
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    sidebar.classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
  }));
  $('#themeBtn').onclick = () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
  };
  const items = [...document.querySelectorAll('.item')];
  $('#search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    const matches = q ? items.filter(el => q.split(/\s+/).every(w => el.textContent.toLowerCase().includes(w))) : [];
    $('#results').replaceChildren();
    for (const el of matches.slice(0, 12)) {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + el.id; a.textContent = el.querySelector('h3').textContent;
      a.onclick = () => { sidebar.classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded','false'); };
      li.append(a); $('#results').append(li);
    }
    $('#searchStatus').textContent = q ? `${matches.length} matching items` : '';
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); sidebar.classList.add('open'); $('#menuBtn').setAttribute('aria-expanded','true'); $('#search').focus();
    }
    if(e.key === 'Escape') { sidebar.classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded','false'); }
  });
  const sections = [...document.querySelectorAll('section.section')];
  addEventListener('scroll', () => {
    let active = sections[0].id;
    sections.forEach(s => { if(s.getBoundingClientRect().top < 180) active=s.id; });
    document.querySelectorAll('.contents a').forEach(a=>a.classList.toggle('active', a.hash==='#'+active));
  }, {passive:true});
  document.querySelectorAll('.download').forEach(a => a.addEventListener('click', async e => {
    e.preventDefault(); $('#status').textContent = 'Preparing download…';
    try {
      const r = await fetch(a.href); if(!r.ok) throw Error(r.status);
      const url = URL.createObjectURL(await r.blob()), link = document.createElement('a');
      link.href=url; link.download=a.download; link.click(); setTimeout(()=>URL.revokeObjectURL(url),3000);
      $('#status').textContent = 'Download ready';
    } catch { $('#status').textContent = 'Download unavailable; please retry shortly.'; }
    setTimeout(()=>$('#status').textContent='',5000);
  }));
})();
