(() => {
  const $ = s => document.querySelector(s);
  const budget=globalThis.SecurityBudget;
  let budgetState={...budget.defaults};
  let budgetDirty=false;
  const amount=(v,n)=>budget.money(v)+(n?' + unpriced items':' (estimate)');
  function updateBudget(){
    document.querySelectorAll('[data-budget]').forEach(input=>{
      const key=input.dataset.budget;
      budgetState[key]=input.value!==''&&input.validity.valid&&Number.isFinite(Number(input.value))?Number(input.value):null;
      input.nextElementSibling.textContent=key==='requests'?(budgetState[key]??'Not priced'):(budgetState[key]===null?'Not priced':budget.money(budgetState[key]));
    });
    budgetState.selected=$('#budget-option').value;
    const c=budget.calculate(budgetState);
    $('[data-common-subtotal]').textContent=amount(c.common,c.missingCommon);
    document.querySelectorAll('[data-budget-value="publicWaf"]').forEach(el=>el.textContent=c.publicWaf===null?'Not priced':budget.money(c.publicWaf));
    for(const id of ['1','2','3']){
      const o=c.options[id];
      $(`[data-option-subtotal="${id}"]`).textContent=amount(o.option,o.missing-c.missingCommon);
      $(`[data-total="${id}-monthly"]`).textContent=amount(o.monthly,o.missing);
      $(`[data-total="${id}-annual"]`).textContent=amount(o.annual,o.missing);
      $(`[data-total="${id}-oneTime"]`).textContent=amount(o.oneTime,o.oneTimeMissing);
    }
    const chosen=c.options[budgetState.selected];
    $('#budget-selected').textContent=`Common + Proposal ${budgetState.selected}: ${amount(chosen.monthly,chosen.missing)} per month. First year, including one-time costs: ${amount(chosen.firstYear,chosen.missing+chosen.oneTimeMissing)}.`;
    budgetDirty=JSON.stringify(budgetState)!==JSON.stringify(budget.defaults);
    $('#pdfBtn').textContent=budgetDirty?'Print PDF':'PDF';
  }
  document.querySelectorAll('[data-budget]').forEach(input=>input.addEventListener('input',updateBudget));
  $('#budget-option').addEventListener('change',updateBudget);
  $('#budget-reset').onclick=()=>{
    document.querySelectorAll('[data-budget]').forEach(input=>input.value=budget.defaults[input.dataset.budget]??'');
    $('#budget-option').value=budget.defaults.selected;
    updateBudget();
  };
  updateBudget();
  let themeBeforePrint;
  const printRefs=[];
  addEventListener('beforeprint',()=>{
    themeBeforePrint=document.documentElement.dataset.theme;
    document.documentElement.dataset.theme='light';
    document.querySelectorAll('a[data-strategy]').forEach(a=>{
      printRefs.push([a,a.href]);
      a.href='https://talorlik.github.io/cloud-and-web-security/#'+a.dataset.strategy;
    });
  });
  addEventListener('afterprint',()=>{
    document.documentElement.dataset.theme=themeBeforePrint||'light';
    printRefs.splice(0).forEach(([a,url])=>a.href=url);
  });
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
  const items = [...document.querySelectorAll('.item, .budget-block, .budget-summary')];
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
    if(a.id==='pdfBtn'&&budgetDirty){
      $('#status').textContent='Choose Save as PDF to export the proposal with your current worksheet.';
      window.print();
      return;
    }
    try {
      const r = await fetch(a.href); if(!r.ok) throw Error(r.status);
      let blob;
      if(a.id==='mdBtn'){
        const md=await r.text(), start=md.indexOf('<a id="budget"></a>');
        if(start<0)throw Error('Worksheet export missing');
        blob=new Blob([md.slice(0,start)+budget.budgetMarkdown(budgetState)],{type:'text/markdown;charset=utf-8'});
      }else blob=await r.blob();
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href=url; link.download=a.download; link.click(); setTimeout(()=>URL.revokeObjectURL(url),3000);
      $('#status').textContent = 'Download ready';
    } catch { $('#status').textContent = 'Download unavailable; please retry shortly.'; }
    setTimeout(()=>$('#status').textContent='',5000);
  }));
})();
