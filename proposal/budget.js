// Shared calculations for the browser, generated HTML, Markdown and PDF.
(() => {
const defaults = Object.freeze({
  requests:10, monitoring:null, records:null, operations:null, licences:0,
  commonSetup:null, cloudfront:200, imperva:null, setup1:null, setup2:null, setup3:null,
  selected:'1'
});
const prices={hours:730, httpHour:0.27, tcpHour:0.20, acl:5, rules:10, million:0.60, adminMillions:1};
const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const money=n=>'USD '+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const show=n=>valid(n)?money(n):'Not priced';
const sources={
  va:'https://aws.amazon.com/verified-access/pricing/',
  waf:'https://aws.amazon.com/waf/pricing/',
  cf:'https://aws.amazon.com/cloudfront/pricing/',
  identity:'https://aws.amazon.com/iam/identity-center/faqs/',
  organizations:'https://docs.aws.amazon.com/organizations/latest/userguide/pricing.html',
  gd:'https://aws.amazon.com/guardduty/pricing/',
  logs:'https://aws.amazon.com/cloudwatch/pricing/'
};
function calculate(s=defaults){
  const shared=['monitoring','records','operations','licences'];
  const common=shared.reduce((n,k)=>n+(valid(s[k])?s[k]:0),0);
  const missingCommon=shared.filter(k=>!valid(s[k])).length;
  const access=prices.hours*(prices.httpHour+2*prices.tcpHour);
  const adminWaf=prices.acl+prices.rules+prices.adminMillions*prices.million;
  const publicWaf=valid(s.requests)?prices.acl+prices.rules+s.requests*prices.million:null;
  const result={common,missingCommon,access,adminWaf,publicWaf,options:{}};
  for(const id of ['1','2','3']){
    const additions=id==='1'?[publicWaf]:id==='2'?[s.cloudfront]:[publicWaf,s.imperva];
    const option=access+adminWaf+additions.reduce((n,v)=>n+(valid(v)?v:0),0);
    const missing=missingCommon+additions.filter(v=>!valid(v)).length;
    const upfront=[s.commonSetup,s['setup'+id]];
    const oneTime=upfront.reduce((n,v)=>n+(valid(v)?v:0),0);
    const oneTimeMissing=upfront.filter(v=>!valid(v)).length;
    result.options[id]={option,monthly:common+option,missing,oneTime,oneTimeMissing,
      annual:(common+option)*12,firstYear:(common+option)*12+oneTime};
  }
  return result;
}
const cite=(url,name)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`;
const field=(key,label,value)=>`<label class="budget-field"><span class="sr-only">${label}</span><input data-budget="${key}" aria-label="${label}" type="number" min="0" step="${key==='requests'?'0.1':'0.01'}" value="${value??''}" placeholder="Not priced"><span class="print-value">${key==='requests'?(value??'Not priced'):show(value)}</span></label>`;
const priced=(key,value)=>`<span data-budget-value="${key}">${valid(value)?money(value):'Not priced'}</span>`;
const row=(name,amount,note)=>`<tr><th scope="row">${name}</th><td>${amount}</td><td>${note}</td></tr>`;
const table=rows=>`<div class="budget-table-wrap"><table class="budget-table"><thead><tr><th>Cost item</th><th>Monthly USD</th><th>Basis</th></tr></thead><tbody>${rows}</tbody></table></div>`;
function budgetHTML(){
  const s=defaults,c=calculate(s);
  const commonRows=
    row('Account safeguards',money(0),`${cite(sources.organizations,'Organizations')} has no additional service charge; configuration work is below.`)+
    row('Threat detection and security checks',field('monitoring','Common: detection and security checks monthly',s.monitoring),`${cite(sources.gd,'GuardDuty')} plus Security Hub, Inspector and Config; enter a usage estimate.`)+
    row('Logs, backups and other security usage',field('records','Common: logs backups and other usage monthly',s.records),`${cite(sources.logs,'Logs')}, storage, backup copies, keys, secrets and access data/connection charges; enter an allowance.`)+
    row('Ongoing security operations',field('operations','Common: security operations monthly',s.operations),'Policy reviews, patching and incident response; include internal time or a support quote.')+
    row('Additional identity licences',field('licences','Common: additional identity licences monthly',s.licences),`${cite(sources.identity,'IAM Identity Center')} has no extra charge; replace zero if the chosen identity solution needs paid licences.`);
  const upfront=(id,label)=>`<div class="budget-upfront"><span>${label} · one-time USD</span>${field(id,label,s[id])}</div>`;
  const panel=(id,title,rows,setup)=>`<div class="budget-block" id="budget-${id}"><h3>${title}</h3>${table(rows)}${upfront(setup,'Implementation and testing for this option')}<p class="budget-subtotal">Option-only priced subtotal: <strong data-option-subtotal="${id}"></strong> per month, before Common.</p></div>`;
  const adminRows=
    row('Verified Access web application',money(prices.hours*prices.httpHour),'730 hours × USD 0.27; private administrator website.')+
    row('Verified Access technical connections',money(prices.hours*2*prices.tcpHour),'Two endpoints × 730 hours × USD 0.20; cluster and database.')+
    row('Administrator web firewall',money(c.adminWaf),'One ACL, ten billable rule entries, one million requests.');
  return `<section class="section budget-section" id="budget"><div class="eyebrow">Budget worksheet · inside this proposal</div><h2>Common costs + your chosen option</h2>
<p>Use the four breakdowns below to compare the same packages described above. Blank fields mean <strong>not priced</strong>, not free; enter zero only when a cost is genuinely absent or already included elsewhere.</p>
<div class="budget-assumptions"><h3>Simple planning assumptions</h3><p>USD per month, 730 hours, at most 100 administrators, one web access application and two technical endpoints. Rates were checked on 22 October 2026 against ${cite(sources.va,'Verified Access pricing')} and ${cite(sources.waf,'WAF pricing')}; confirm deployment-region rates before approval.</p>
<label class="budget-traffic">Public requests per month, in millions ${field('requests','Public requests per month in millions',s.requests)}</label>
<p class="budget-note">Ten million requests is a comparison example, not a forecast from the administrator count or the emergency-user count. WAF examples assume one ACL and ten billable rule entries per inspected layer; advanced rules, challenges and extra inspection can cost more.</p></div>
<div class="budget-block" id="budget-common"><h3>Common · pay once, whichever option you choose</h3>${table(commonRows)}${upfront('commonSetup','Shared setup and security assessment')}<p class="budget-subtotal">Common priced subtotal: <strong data-common-subtotal></strong> per month.</p></div>
${panel('1','Proposal 1 · Lean AWS',adminRows+row('Public web firewall',priced('publicWaf',c.publicWaf),'USD 5 + ten rule entries + USD 0.60 per million public requests.'),'setup1')}
${panel('2','Proposal 2 · AWS edge',adminRows+row('CloudFront package including public WAF',field('cloudfront','Proposal 2: CloudFront package monthly',s.cloudfront),`${cite(sources.cf,'Business plan example: USD 200')}; confirm required features and traffic limits before choosing it.`),'setup2')}
<p class="budget-note">Proposal 2 counts public WAF inside the example CloudFront package, not again as a separate charge. If choosing pay-as-you-go instead, enter the combined CDN and public WAF estimate in that field.</p>
${panel('3','Proposal 3 · Existing edge',adminRows+row('AWS firewall at the public origin',priced('publicWaf',c.publicWaf),'Conservative example: all entered public requests reach this inspection layer.')+row('Imperva service and support',field('imperva','Proposal 3: Imperva quote monthly',s.imperva),'Enter the contract quote, including agreed traffic and support; no assumed price.'),'setup3')}
<div class="budget-summary" id="budget-total"><h3>Decision total</h3><label class="no-print">Compare Common with <select id="budget-option" aria-label="Select budget option"><option value="1">Proposal 1 · Lean AWS</option><option value="2">Proposal 2 · AWS edge</option><option value="3">Proposal 3 · Existing edge</option></select></label>
<div id="budget-selected" aria-live="polite"></div><div class="budget-table-wrap"><table class="budget-table comparison"><thead><tr><th>Common + option</th><th>Monthly</th><th>Yearly recurring</th><th>One-time</th></tr></thead><tbody>${['1','2','3'].map(id=>`<tr><th scope="row">Proposal ${id}</th><td data-total="${id}-monthly"></td><td data-total="${id}-annual"></td><td data-total="${id}-oneTime"></td></tr>`).join('')}</tbody></table></div>
<p class="budget-note">Totals are incremental security planning estimates, not a full website-running-cost quote. Existing application hosting, load balancers, database and cluster capacity, taxes and general internet delivery are excluded unless explicitly included in a package; do not count the same cost twice.</p>
<p class="budget-note">Add Verified Access data processing, excess connection charges and relevant transfer costs to the Common usage allowance. Confirm the licensed identity-provider choice, emergency traffic capacity, any paid support, and one-time assessment and migration work before approval.</p>
<button type="button" id="budget-reset" class="no-print">Reset worksheet</button><p class="budget-note no-print">Edits stay only in this tab and are not published or saved. Markdown export includes your edits; PDF export opens the print dialog when values change so you can save the current proposal as PDF.</p></div></section>`;
}
function budgetMarkdown(s=defaults){
  const c=calculate(s),partial=(v,n)=>money(v)+(n?' + unpriced items':' (estimate)');
  const commonNames={monitoring:'Threat detection and security checks',records:'Logs, backups and other security usage',operations:'Ongoing security operations',licences:'Additional identity licences'};
  let md='<a id="budget"></a>\n\n## Budget worksheet\n\nCommon + one option, not all three options added together. USD; 730 hours per month; maximum 100 administrators. Rates checked 22 October 2026; confirm deployment-region prices. Blank amounts mean not priced, not zero.\n\n';
  md+=`Public requests: ${s.requests??'not priced'} million per month (illustrative input, not a traffic forecast). WAF example: one ACL and ten billable rule entries per inspected layer, plus one million administrator requests.\n\n`;
  md+='<a id="budget-common"></a>\n\n### Common\n\n| Cost item | Monthly USD |\n|---|---:|\n| Account safeguards | '+money(0)+` ([AWS Organizations](${sources.organizations})) |\n`;
  for(const [key,name]of Object.entries(commonNames))md+=`| ${name} | ${show(s[key])}${key==='licences'?` ([IAM Identity Center](${sources.identity}))`:''} |\n`;
  md+=`\nCommon priced subtotal: ${partial(c.common,c.missingCommon)} per month.\n\nShared setup and assessment, one-time: ${show(s.commonSetup)}.\n\n`;
  for(const id of ['1','2','3']){
    md+=`<a id="budget-${id}"></a>\n\n### Proposal ${id} · ${id==='1'?'Lean AWS':id==='2'?'AWS edge':'Existing edge'}\n\n| Cost item | Monthly USD |\n|---|---:|\n| Verified Access web application | ${money(prices.hours*prices.httpHour)} ([AWS pricing](${sources.va})) |\n| Two technical access endpoints | ${money(prices.hours*2*prices.tcpHour)} ([AWS pricing](${sources.va})) |\n| Administrator web firewall | ${money(c.adminWaf)} ([WAF pricing](${sources.waf})) |\n`;
    if(id!=='2')md+=`| ${id==='1'?'Public web firewall':'AWS firewall at the public origin'} | ${show(c.publicWaf)} ([WAF pricing](${sources.waf})) |\n`;
    if(id==='2')md+=`| CloudFront including public WAF | ${show(s.cloudfront)} ([CloudFront pricing](${sources.cf})) |\n`;
    if(id==='3')md+=`| Imperva service and support | ${show(s.imperva)} |\n`;
    md+=`\nOption-only priced subtotal: ${partial(c.options[id].option,c.options[id].missing-c.missingCommon)} per month, before Common.\n\nImplementation and testing, one-time: ${show(s['setup'+id])}.\n\n`;
  }
  md+='CloudFront starts with an illustrative Business plan at USD 200, not a confirmed fit for emergency traffic; if using pay-as-you-go, enter CDN plus public WAF together without double counting. The Imperva price must come from a quote.\n\n<a id="budget-total"></a>\n\n### Decision total\n\n';
  const selected=c.options[s.selected]||c.options['1'];
  md+=`Selected: Proposal ${s.selected}. Monthly: ${partial(selected.monthly,selected.missing)}; yearly recurring: ${partial(selected.annual,selected.missing)}; one-time: ${partial(selected.oneTime,selected.oneTimeMissing)}.\n\n`;
  md+='| Common + option | Monthly | Yearly recurring | One-time |\n|---|---:|---:|---:|\n';
  for(const id of ['1','2','3']){const o=c.options[id];md+=`| Proposal ${id} | ${partial(o.monthly,o.missing)} | ${partial(o.annual,o.missing)} | ${partial(o.oneTime,o.oneTimeMissing)} |\n`;}
  md+='\nInclude detection, logging, backups, keys, secrets, access usage and operations in the Common allowances. Existing hosting, load balancers, cluster/database capacity, taxes and general internet delivery are excluded unless explicitly included; confirm licence, support, peak-traffic and migration costs before approval.\n\n';
  md+=`Prices: [Verified Access](${sources.va}), [AWS WAF](${sources.waf}), [CloudFront](${sources.cf}), [IAM Identity Center](${sources.identity}), [Organizations](${sources.organizations}), [GuardDuty](${sources.gd}), [CloudWatch](${sources.logs}).\n\n[Back to contents](#top)\n`;
  return md;
}
const api={defaults,prices,money,calculate,budgetHTML,budgetMarkdown};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else globalThis.SecurityBudget=api;
})();
