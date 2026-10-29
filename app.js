(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Matrix ---------- */
  const stClass = { Live: 'st-live', Designed: 'st-design', Gap: 'st-gap', Change: 'st-change' };
  const areaLabel = { Foundations: 'Foundations', IAM: 'IAM', Detection: 'Detection', Infrastructure: 'Infrastructure', Data: 'Data', IR: 'Incident response', AppSec: 'Application security' };
  const body = $('#matrixBody');
  if (body && window.CONTROLS) {
    body.innerHTML = window.CONTROLS.map(([id, name, area, cis, bench, iso, st, pri, risks]) => {
      const rid = id.toLowerCase();
      const rl = risks.map((r) => `<a href="#${r}">${r.toUpperCase()}</a>`).join(' ');
      return `<tr id="${rid}" data-area="${area}" data-status="${st}" data-pri="${pri}">
        <td class="id">${id}</td>
        <td>${name}<small class="refs">Risks: ${rl}</small></td>
        <td>${areaLabel[area]}</td>
        <td class="mono ref-col">${cis}</td>
        <td class="ref-col bench">${bench}</td>
        <td class="mono ref-col">${iso}</td>
        <td><span class="pill ${stClass[st]}">${st}</span></td>
        <td><span class="pri ${pri.toLowerCase()}">${pri}</span></td></tr>`;
    }).join('') + '<tr class="empty-row" hidden><td colspan="8">No controls match the current filter.</td></tr>';
  }

  /* ---------- TOC (sidebar + print) ---------- */
  const sections = $$('main .section[id]');
  const toc = $('#toc');
  const ptoc = $('#printToc');
  sections.forEach((sec) => {
    const num = ($('.sec-num', sec)?.textContent || '').split('·')[0].trim();
    const title = sec.dataset.title || $('h2', sec).textContent;
    const subs = $$('h3[id]', sec);
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${sec.id}" data-sec="${sec.id}"><span class="n">${num}</span><span>${esc(title)}</span></a>` +
      (subs.length ? `<ol class="sub">${subs.map((h) => `<li><a href="#${h.id}" data-sub="${h.id}">${esc(h.textContent)}</a></li>`).join('')}</ol>` : '');
    toc.appendChild(li);
    const pli = document.createElement('li');
    pli.innerHTML = `<a href="#${sec.id}"><span class="n">${num}</span>${esc(title)}</a>` +
      (subs.length ? `<ol>${subs.map((h) => `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join('')}</ol>` : '');
    ptoc.appendChild(pli);
  });

  /* ---------- Scrollspy ---------- */
  const tocLinks = $$('#toc a[data-sec]');
  const setActive = (id) => {
    tocLinks.forEach((a) => {
      const on = a.dataset.sec === id;
      a.classList.toggle('active', on);
      a.parentElement.classList.toggle('open', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  const onScroll = () => {
    let cur = sections[0]?.id;
    const y = window.scrollY + 120;
    sections.forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
    setActive(cur);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const sidebar = $('#sidebar');
  const menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) { sidebar.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeBtn = $('#themeBtn');
  const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  let theme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; // set before paint by the shared theme-boot script
  const applyTheme = () => {
    root.setAttribute('data-theme', theme);
    themeBtn.innerHTML = theme === 'dark' ? sun : moon;
    themeBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    themeBtn.title = themeBtn.getAttribute('aria-label');
    themeBtn.querySelector('svg').setAttribute('aria-hidden', 'true');
    themeBtn.querySelector('svg').setAttribute('focusable', 'false');
  };
  themeBtn.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); try { localStorage.setItem('theme', theme); } catch {} });
  window.addEventListener('beforeprint', () => root.setAttribute('data-theme', 'light'));
  window.addEventListener('afterprint', () => root.setAttribute('data-theme', theme));
  applyTheme();

  /* ---------- Heat map ---------- */
  const heat = $('#heat');
  if (heat) {
    const rows = $$('#riskTable tbody tr[id]');
    let html = '';
    for (let l = 5; l >= 1; l--) {
      html += `<div class="ax">${l}</div>`;
      for (let i = 1; i <= 5; i++) {
        const s = l * i;
        const cls = s >= 20 ? 'h5' : s >= 12 ? 'h4' : s >= 8 ? 'h3' : s >= 4 ? 'h2' : 'h1';
        const ids = rows.filter((r) => +r.dataset.l === l && +r.dataset.i === i).map((r) => `<a href="#${r.id}">${r.id.toUpperCase()}</a>`).join('');
        html += `<div class="cell ${cls}" title="Likelihood ${l} × Impact ${i} = ${s}">${ids}</div>`;
      }
    }
    heat.innerHTML = html;
  }

  /* ---------- Table filters ---------- */
  const filterState = {};
  const applyFilters = (tableId) => {
    const st = filterState[tableId] || {};
    const rows = $$(`#${tableId} tbody tr[id]`);
    let shown = 0;
    rows.forEach((r) => {
      let ok = true;
      for (const [k, set] of Object.entries(st.chips || {})) {
        if (set.size && !set.has(r.dataset[k])) { ok = false; break; }
      }
      if (ok && st.q) {
        const t = r.textContent.toLowerCase();
        ok = st.q.split(/\s+/).every((w) => t.includes(w));
      }
      r.hidden = !ok;
      if (ok) shown++;
    });
    const empty = $(`#${tableId} tr.empty-row`);
    if (empty) empty.hidden = shown !== 0;
    const c = $(`#${tableId}-count`);
    if (c) c.textContent = `${shown} of ${rows.length}`;
  };
  const clearFilters = (tableId) => {
    filterState[tableId] = { chips: {}, q: '' };
    $$(`.fgroup[data-target="${tableId}"] .chip`).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $$(`.filter-input[data-target="${tableId}"]`).forEach((i) => (i.value = ''));
    applyFilters(tableId);
  };
  $$('.fgroup').forEach((g) => {
    const t = g.dataset.target, k = g.dataset.filter;
    filterState[t] = filterState[t] || { chips: {}, q: '' };
    filterState[t].chips[k] = new Set();
    g.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      const set = filterState[t].chips[k];
      on ? set.add(b.dataset.v) : set.delete(b.dataset.v);
      applyFilters(t);
    });
  });
  $$('.filter-input').forEach((inp) => {
    const t = inp.dataset.target;
    inp.addEventListener('input', () => { filterState[t].q = inp.value.trim().toLowerCase(); applyFilters(t); });
  });
  ['riskTable', 'matrixTable'].forEach(applyFilters);

  /* ---------- Gates ---------- */
  const gates = $$('#gateList li');
  const updGates = () => {
    const n = gates.filter((li) => $('input', li).checked).length;
    gates.forEach((li) => li.classList.toggle('done', $('input', li).checked));
    $('#gateText').textContent = `${n} of ${gates.length} gates checked`;
    $('#gateBar').style.width = `${(n / gates.length) * 100}%`;
  };
  gates.forEach((li) => $('input', li).addEventListener('change', updGates));
  updGates();

  /* ---------- Jump helper (expands, unfilters, flashes) ---------- */
  const reveal = (id, push = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    const tbl = el.closest('table[id]');
    if (tbl && el.hidden) clearFilters(tbl.id);
    let d = el.closest('details');
    while (d) { d.open = true; d = d.parentElement.closest('details'); }
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (push) history.replaceState(null, '', '#' + id);
    const target = el.tagName === 'TR' ? $$('td', el) : [el];
    target.forEach((t) => { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('.results')) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || id === 'top') return;
    if (document.getElementById(id)) { e.preventDefault(); reveal(id); }
  });

  /* ---------- Search ---------- */
  const index = [];
  const secTitle = (el) => el.closest('.section')?.dataset.title || 'Overview';
  const txt = (el) => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); while (w.nextNode()) out.push(w.currentNode.nodeValue); return out.join(' '); };
  const add = (el, title, text) => {
    if (!el.id) return;
    index.push({ id: el.id, crumb: secTitle(el), title: title.trim().replace(/\s+/g, ' '), text: text.trim().replace(/\s+/g, ' ') });
  };
  sections.forEach((s) => add(s, s.dataset.title + ' — ' + $('h2', s).textContent, $('.intro', s) ? txt($('.intro', s)) : ''));
  $$('main h3[id]').forEach((h) => {
    const box = h.closest('.domain') || h.parentElement;
    add(h, h.textContent, txt(box).slice(0, 3000));
  });
  $$('main tr[id]').forEach((r) => {
    const cells = $$('td', r);
    const idt = cells[0]?.textContent || '';
    const main = cells[1]?.querySelector('strong')?.textContent || cells[1]?.childNodes[0]?.textContent || cells[1]?.textContent || '';
    add(r, `${idt} · ${main}`, txt(r));
  });
  $$('main .card[id], #gateList li[id], #principles li[id]').forEach((c) => {
    const k = $('.k', c)?.textContent;
    const h = $('h4', c)?.textContent || $('strong', c)?.textContent || '';
    add(c, k ? `${k} — ${h}` : h, txt(c));
  });

  const palette = $('#palette'), backdrop = $('#paletteBackdrop'), input = $('#searchInput'), results = $('#results');
  let sel = 0, current = [];
  const hl = (s, terms) => {
    let out = esc(s);
    terms.forEach((t) => { if (t) out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  };
  const snippet = (text, terms) => {
    const lower = text.toLowerCase();
    let pos = -1;
    for (const t of terms) { pos = lower.indexOf(t); if (pos >= 0) break; }
    if (pos < 0) return text.slice(0, 120);
    const start = Math.max(0, pos - 50);
    return (start > 0 ? '…' : '') + text.slice(start, start + 150) + '…';
  };
  const search = (q) => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      current = index.filter((e) => e.id.match(/^(summary|scope|frameworks|threats|risks|principles|domains|changes|matrix|roadmap|metrics|decisions|references)$/));
    } else {
      current = index.map((e) => {
        const T = e.title.toLowerCase(), X = e.text.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (T.includes(t)) score += T.startsWith(t) ? 6 : 4;
          else if (X.includes(t)) score += 1;
          else return null;
        }
        return { e, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 30).map((x) => x.e);
    }
    sel = 0;
    if (!current.length) { results.innerHTML = `<li class="none">No results for “${esc(q)}”. Try a risk ID (R05), a control (SC-12) or a reference (A.8.15).</li>`; return; }
    results.innerHTML = current.map((e, i) => `<li role="option" aria-selected="${i === 0}"><a href="#${e.id}" data-i="${i}" class="${i === 0 ? 'sel' : ''}">
      <span class="crumb">${esc(e.crumb)}</span><span class="title">${hl(e.title, terms)}</span>${terms.length ? `<span class="snip">${hl(snippet(e.text, terms), terms)}</span>` : ''}</a></li>`).join('');
  };
  const moveSel = (d) => {
    const links = $$('a', results);
    if (!links.length) return;
    links[sel]?.classList.remove('sel'); links[sel]?.parentElement.setAttribute('aria-selected', 'false');
    sel = (sel + d + links.length) % links.length;
    links[sel].classList.add('sel'); links[sel].parentElement.setAttribute('aria-selected', 'true');
    links[sel].scrollIntoView({ block: 'nearest' });
  };
  const openP = () => { palette.classList.add('open'); backdrop.classList.add('open'); input.value = ''; search(''); setTimeout(() => input.focus(), 10); };
  const closeP = () => { palette.classList.remove('open'); backdrop.classList.remove('open'); };
  const go = (i) => { const e = current[i]; if (!e) return; closeP(); setTimeout(() => reveal(e.id), 30); };
  $('#searchBtn').addEventListener('click', openP);
  backdrop.addEventListener('click', closeP);
  input.addEventListener('input', () => search(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    else if (e.key === 'Escape') closeP();
  });
  results.addEventListener('click', (e) => { const a = e.target.closest('a[data-i]'); if (a) { e.preventDefault(); go(+a.dataset.i); } });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.classList.contains('open') ? closeP() : openP(); }
    else if (e.key === '/' && !e.target.closest('input, textarea')) { e.preventDefault(); openP(); }
    else if (e.key === 'Escape' && palette.classList.contains('open')) closeP();
  });

  /* ---------- PDF export ---------- */
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); };
  // Both exports are pre-rendered files. The PDF falls back to the print dialog if its file is unavailable;
  // the Markdown export falls back to opening the file in a new tab.
  const wireExport = (btn, okMsg, fallback) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const r = await fetch(btn.getAttribute('href'), { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement('a');
        a.href = url; a.download = btn.getAttribute('download') || '';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast(okMsg);
      } catch (_) { fallback(); }
    });
  };
  wireExport($('#pdfBtn'), 'Downloading the PDF. Internal links and bookmarks are included.', () => {
    toast('Opening the print dialog. Choose “Save as PDF”.');
    setTimeout(() => window.print(), 400);
  });
  wireExport($('#mdBtn'), 'Downloading the Markdown file. Internal and external links are included.', () => {
    toast('Opening the Markdown file in a new tab.');
    window.open($('#mdBtn').getAttribute('href'), '_blank', 'noopener');
  });
  wireExport($('#designBtn'), 'Downloading DESIGN.md: structure, typography and light/dark themes.', () => {
    toast('Design download unavailable. Please retry shortly.');
  });

  /* ---------- Initial hash ---------- */
  document.querySelectorAll('a[href^="https://"], a[href^="http://"]').forEach(a => {
    a.target = '_blank'; a.rel = 'noopener noreferrer';
  });
  const params = new URLSearchParams(location.search);
  if (params.get('from') === 'proposal') {
    const back = document.querySelector('#proposalReturn');
    const item = params.get('item') || 'top';
    if (back && /^[a-z0-9-]+$/.test(item)) {
      back.href = 'proposal/index.html#' + item;
      back.hidden = false;
    }
  }
  if (location.hash.length > 1) setTimeout(() => reveal(decodeURIComponent(location.hash.slice(1)), false), 60);
  // Small screens stack table rows, so each cell carries its column header for the stacked layout.
  document.querySelectorAll('table').forEach(t=>{const heads=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());if(!heads.length)return;t.querySelectorAll('tbody tr').forEach(tr=>{let i=0;for(const cell of tr.children){if(cell.tagName==='TD'&&heads[i]&&!cell.dataset.label)cell.dataset.label=heads[i];i+=cell.colSpan||1;}});});
})();
