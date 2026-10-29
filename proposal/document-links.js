/* Internal sources follow the current hosting environment, never a different edition. */
(() => {
  const publicRoot='https://talorlik.github.io/cloud-and-web-security/';
  const root=new URL('../',location.href);
  function resolve(value){
    if(value.startsWith('#'))return value;
    const bare=publicRoot.slice(0,-1);
    if(value===bare||value.startsWith(bare+'#')||value.startsWith(bare+'?'))value=publicRoot+value.slice(bare.length);
    if(value.startsWith(publicRoot)){
      const suffix=value.slice(publicRoot.length);
      return new URL(suffix.startsWith('#')?'index.html'+suffix:suffix.startsWith('proposal/#')?suffix.replace('proposal/#','proposal/index.html#'):suffix,root).href;
    }
    if(/^(?:\.\.\/index\.html|index\.html|questions\.html|comparison\.html|management-(?:proposal|qa|comparison)\.(?:pdf|md))(?:[?#]|$)/.test(value))return new URL(value,location.href).href;
    return value;
  }
  function markdown(text){return text.replace(/(\]\()([^\s)]+)(\))/g,(all,open,url,close)=>open+resolve(url)+close);}
  let library;
  async function pdf(bytes){
    if(!window.PDFLib){
      library??=new Promise((yes,no)=>{
        const script=document.createElement('script');
        script.src=new URL('pdf-lib.min.js',location.href).href;
        script.onload=yes;script.onerror=()=>{library=null;no(Error('PDF link helper unavailable'));};
        document.head.append(script);
      });
      await library;
    }
    const {PDFDocument,PDFName,PDFString,PDFHexString,PDFDict,PDFArray}=window.PDFLib;
    const doc=await PDFDocument.load(bytes,{updateMetadata:false});
    for(const page of doc.getPages()){
      const annotations=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);
      if(!annotations)continue;
      for(let i=0;i<annotations.size();i++){
        const annotation=doc.context.lookup(annotations.get(i));
        if(!(annotation instanceof PDFDict))continue;
        const action=annotation.lookupMaybe(PDFName.of('A'),PDFDict);
        if(!action||action.get(PDFName.of('S'))?.toString()!=='/URI')continue;
        const uri=action.lookup(PDFName.of('URI'));
        if(!(uri instanceof PDFString)&&!(uri instanceof PDFHexString))continue;
        const original=uri.decodeText(),updated=resolve(original);
        if(updated!==original)action.set(PDFName.of('URI'),PDFString.of(updated));
      }
    }
    return new Blob([await doc.save()],{type:'application/pdf'});
  }
  window.DocumentLinks={resolve,markdown,pdf,source:path=>new URL(path,root).href};
  document.querySelectorAll('[data-source-path]').forEach(a=>{
    if(a.href.startsWith(publicRoot))a.href=resolve(a.href);
  });
})();
