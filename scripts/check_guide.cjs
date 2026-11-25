const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve('app/src/main/assets/index.html')).href;
const dir='visual-check';
(async()=>{
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const report=[];
try{
 for(const [width,height] of [[320,568],[360,640],[390,740],[390,844],[480,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const images=page.locator('main img[src]:not([hidden])');
  async function verifyScreen(name){
   const n=await images.count();
   let ready=false;
   for(let i=0;i<100;i++){ready=await images.evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0));if(ready)break;await new Promise(resolve=>setTimeout(resolve,150))}
   assert.ok(ready,'Broken image: '+name+' at '+width);
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(dimensions.scroll<=dimensions.width+1,'Horizontal overflow: '+name+' '+JSON.stringify(dimensions));
   assert.equal(await page.locator('nav button').count(),5);
   if(name==='home'){
    const fit=await page.evaluate(()=>{const m=document.querySelector('main'),nav=document.querySelector('nav'),header=document.querySelector('header');const bounds=[...m.querySelectorAll('.tile,.guide-banner,.hero,.specs')].map(el=>({name:el.className,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));const mr=m.getBoundingClientRect();return {scroll:m.scrollHeight,client:m.clientHeight,doc:document.documentElement.scrollHeight,viewport:innerHeight,header:header.getBoundingClientRect().bottom,nav:nav.getBoundingClientRect().top,mainBottom:mr.bottom,bounds}});assert.ok(fit.scroll<=fit.client+1,'Home scroll: '+width+'x'+height+' '+JSON.stringify(fit));assert.ok(fit.doc<=fit.viewport+1,'Document vertical scroll');assert.ok(fit.bounds.every(b=>b.top>=fit.header-1&&b.bottom<=fit.nav+1),'Home element obscured: '+JSON.stringify(fit));
   }
   await page.screenshot({path:dir+'/'+width+'x'+height+'-'+name+'.png',fullPage:true});
   report.push({width,height,screen:name,images:n,decoded:true,horizontalOverflow:false,homeNoScroll:name==='home'?true:null});
  }
  assert.equal(await page.evaluate(()=>recommendations.length),100);
  assert.equal(await page.evaluate(()=>articles.length),26);
  assert.equal(await page.evaluate(()=>new Set(allArticles.map(a=>a[1])).size),126);
  assert.equal(await page.evaluate(()=>articles.filter(a=>mediaFor(a[1]).length>0).length),26);
  assert.equal(await page.evaluate(()=>Object.keys(practicePhotos).length),10);
  assert.equal(await page.evaluate(()=>Object.keys(practicePhotos).filter(id=>mediaFor(id)[0].src.startsWith('data:image/')&&mediaFor(id)[0].source&&mediaFor(id)[0].license).length),10);
  assert.equal(await page.locator('.tile').count(),9);
  await verifyScreen('home');
  for(const cat of ['device','config','electric','house','floor','reference','photo','fault','video']){
   await page.evaluate(c=>go(c),cat);
   await verifyScreen(cat);
   if(cat==='device'){
    assert.equal(await page.locator('.instruction-figure').count(),7);
    await page.locator('.instruction-figure img').first().click();
    assert.equal(await page.locator('#photoZoom').count(),1);
    await page.screenshot({path:dir+'/'+width+'x'+height+'-zoom.png'});
    await page.evaluate(()=>guideBack());
    assert.equal(await page.locator('#photoZoom').count(),0);
   }
   if(cat==='config')assert.equal(await page.locator('.photo-gallery img').count(),10);
   if(cat==='photo'){
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKecAAAAASUVORK5CYII=','base64');
    await page.locator('input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});
    await page.locator('#preview').evaluate(img=>img.decode());
    assert.equal(await page.locator('#preview').isVisible(),true);
    await verifyScreen('photo-preview');
   }
  }
  await page.evaluate(()=>go('home'));
  await page.locator('.guide-banner').click();
  assert.equal(await page.locator('details').count(),10);
  await page.locator('details summary').first().click();
  assert.equal(await page.locator('details').first().locator('.panel').count(),10);
  await verifyScreen('recommendations');
  await page.evaluate(()=>go('search'));
  await verifyScreen('search-empty');
  await page.locator('input[type=search]').fill('Захист від опадів');
  assert.equal(await page.locator('#results .panel').count(),1);
  await verifyScreen('search-result');
  await page.locator('#results .star').click();
  assert.equal(await page.locator('#results .star').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>go('saved'));
  assert.equal(await page.locator('main .panel').count(),1);
  assert.equal(await page.locator('main h3').first().innerText(),'Захист від опадів');
  await verifyScreen('saved');
  await page.reload();await page.evaluate(()=>go('saved'));
  assert.equal(await page.locator('main .panel').count(),1,'Favorites persistence');
  await page.evaluate(()=>go('settings'));await verifyScreen('settings');
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Очистити обране'}).click();
  assert.equal(await page.locator('main .panel').count(),0);
  await page.evaluate(()=>go('search'));
  await page.locator('input[type=search]').fill('zzzzzzzz');
  assert.equal(await page.locator('#results .panel').count(),0);
  assert.ok(await page.locator('#results').innerText().then(s=>s.includes('Нічого не знайдено')));
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: all screens at five phone viewport sizes; home no-scroll and all cards visible; image decode, search, persistent favorites, image preview and zoom');
}finally{fs.writeFileSync(dir+'/screen-report.json',JSON.stringify(report,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
