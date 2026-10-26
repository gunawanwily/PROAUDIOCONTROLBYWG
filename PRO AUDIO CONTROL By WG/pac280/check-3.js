
// PRO-AUDIO-CONTROL V27.3 — custom filename and save location for sessions.
(function(){
  const $session=id=>document.getElementById(id);
  const SESSION_FORMAT='PAC_SESSION';
  const SESSION_SCHEMA=1;
  const sessionBtn=$session('saveSessionBtn');
  const loadBtn=$session('loadSessionBtn');
  const loadInput=$session('loadSessionFile');
  const sessionStatus=$session('sessionStatus');
  const saveOverlay=$session('pacSaveOverlay');
  const saveNameInput=$session('pacSaveFilename');
  const saveConfirmBtn=$session('pacSaveConfirm');
  const saveCancelBtn=$session('pacSaveCancel');
  const saveHint=$session('pacSaveHint');

  function setSessionStatus(message,kind=''){
    if(!sessionStatus)return;
    sessionStatus.textContent=message||'';
    sessionStatus.classList.remove('success','error');
    if(kind)sessionStatus.classList.add(kind);
    sessionStatus.title=message||'';
    if(message && (kind==='success'||kind==='error')) showPacToast(message,kind,kind==='success'?'Sesi siap':'Sesi bermasalah');
  }
  function clamp01(value,fallback=.7){
    const n=Number(value);
    return Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
  }
  function audioTypeFor(name,provided=''){
    if(provided)return provided;
    const ext=(String(name||'').split('.').pop()||'').toLowerCase();
    return ({mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',oga:'audio/ogg',webm:'audio/webm',flac:'audio/flac'})[ext]||'application/octet-stream';
  }
  function safeFileName(name,fallback='audio.bin'){
    const simple=String(name||fallback).split(/[\\/]/).pop().replace(/[\u0000-\u001f:*?"<>|]/g,'_').trim();
    return simple||fallback;
  }
  async function blobToBase64(blob){
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const chunks=[];
    const chunkSize=0x8000;
    for(let i=0;i<bytes.length;i+=chunkSize)chunks.push(String.fromCharCode(...bytes.subarray(i,Math.min(i+chunkSize,bytes.length))));
    return btoa(chunks.join(''));
  }
  function base64ToBlob(encoded,type){
    if(typeof encoded!=='string')throw new Error('Data audio di sesi tidak valid.');
    const binary=atob(encoded);
    const chunks=[];
    const chunkSize=0x8000;
    for(let i=0;i<binary.length;i+=chunkSize){
      const part=binary.slice(i,Math.min(i+chunkSize,binary.length));
      const bytes=new Uint8Array(part.length);
      for(let j=0;j<part.length;j++)bytes[j]=part.charCodeAt(j);
      chunks.push(bytes);
    }
    return new Blob(chunks,{type:type||'application/octet-stream'});
  }
  async function mediaToPayload(file,url,fallbackName){
    let blob=file instanceof Blob?file:null;
    let name=(file&&file.name)||fallbackName||'audio.bin';
    if(!blob&&url){
      const response=await fetch(url);
      if(!response.ok)throw new Error('Audio tidak bisa dibaca saat menyimpan: '+name);
      blob=await response.blob();
    }
    if(!blob)return null;
    const type=audioTypeFor(name,blob.type||'');
    return {fileName:safeFileName(name),type,size:blob.size,lastModified:Number(file&&file.lastModified)||Date.now(),data:await blobToBase64(blob)};
  }
  async function payloadToFile(payload){
    if(!payload||typeof payload.data!=='string')return null;
    const fileName=safeFileName(payload.fileName,'audio.bin');
    const mime=audioTypeFor(fileName,payload.type||'');
    const blob=base64ToBlob(payload.data,mime);
    if(Number.isFinite(Number(payload.size))&&Number(payload.size)!==blob.size)throw new Error('Ukuran audio tidak cocok: '+fileName);
    try{return new File([blob],fileName,{type:mime,lastModified:Number(payload.lastModified)||Date.now()})}
    catch(e){Object.defineProperty(blob,'name',{value:fileName});return blob;}
  }
  function readLocalSetting(key,fallback){
    try{return localStorage.getItem(key)||fallback}catch(e){return fallback}
  }
  function collectSettings(){
    return {
      masterVolume:clamp01(masterGain,.7),
      musicVolume:clamp01($session('musicVol').value,.7),
      fadeSeconds:Number(masterFadeSeconds)||1,
      skin:readLocalSetting('pac_skin_v1','broadcast'),
      playerSkin:readLocalSetting('pac_player_skin_v1','neon'),
      visualizer:readLocalSetting('pac_viz_style_v1','bars'),
      font:readLocalSetting('pac_font_v1','inter'),
      musicLoop:!!music.loop,
      shuffle:!!shuffleEnabled,
      padLocks:padLocks.map(Boolean),
      allPadsLocked:!!allPadsLocked,
      lastPlayedIndex:Number.isInteger(lastPlayedIndex)?lastPlayedIndex:-1
    };
  }
  async function buildSession(){
    const session={
      format:SESSION_FORMAT,
      schemaVersion:SESSION_SCHEMA,
      app:'PRO-AUDIO-CONTROL',
      appVersion:'V27.3',
      savedAt:new Date().toISOString(),
      pads:[],
      tracks:[],
      currentTrackIndex:Number.isInteger(cur)?cur:-1,
      notesHtml:musicNotes?musicNotes.innerHTML:'',
      settings:collectSettings()
    };
    for(let i=0;i<pads.length;i++){
      setSessionStatus(`Menyimpan Pad ${i+1}/${pads.length}…`);
      const p=pads[i];
      const payload=await mediaToPayload(p.file,p.audio&&p.audio.src,$session('name'+i)?.textContent||`Pad ${i+1}`);
      session.pads.push({index:i,name:$session('name'+i)?.textContent||`Pad ${i+1}`,audio:payload,volume:clamp01($session('vol'+i)?.value,.7),loop:!!p.loop,locked:!!padLocks[i]});
    }
    for(let i=0;i<tracks.length;i++){
      setSessionStatus(`Menyimpan playlist ${i+1}/${tracks.length}…`);
      const track=tracks[i];
      const payload=await mediaToPayload(track.file,track.url,track.name||`Track ${i+1}`);
      session.tracks.push({name:track.name||payload?.fileName||`Track ${i+1}`,audio:payload});
    }
    return session;
  }
  function timestampForName(){
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'_'+[String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0')].join('-');
  }
  function cleanSessionFilename(value){
    let name=String(value||'').trim().replace(/\\/g,'-').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/\s+/g,' ').replace(/[. ]+$/,'');
    name=name.replace(/\.pacsession$/i,'').replace(/\.json$/i,'').trim();
    return name.slice(0,100)||`PRO-AUDIO-CONTROL-SESSION-${timestampForName()}`;
  }
  function openSaveDialog(){
    if(!saveOverlay||!saveNameInput){saveSession();return;}
    saveNameInput.value=`PRO-AUDIO-CONTROL-SESSION-${timestampForName()}`;
    saveOverlay.classList.add('open');saveOverlay.setAttribute('aria-hidden','false');
    if(saveHint)saveHint.textContent=('showSaveFilePicker' in window)?'Klik PILIH LOKASI & SIMPAN untuk memilih folder dan nama file melalui dialog penyimpanan perangkat.':'Browser ini tidak mendukung pemilih folder langsung. Nama file dapat diatur di sini; lokasi mengikuti pengaturan download browser.';
    setTimeout(()=>{saveNameInput.focus();saveNameInput.select()},30);
  }
  function closeSaveDialog(){if(saveOverlay){saveOverlay.classList.remove('open');saveOverlay.setAttribute('aria-hidden','true')}}
  async function saveSession(){
    if(!sessionBtn)return;
    const filenameBase=cleanSessionFilename(saveNameInput&&saveNameInput.value);
    const filename=filenameBase+'.pacsession';
    sessionBtn.disabled=true;
    const oldLabel=sessionBtn.textContent;
    sessionBtn.textContent='SAVING…';
    if(saveConfirmBtn)saveConfirmBtn.disabled=true;
    let fileHandle=null;
    try{
      // Open the native file picker directly from the user click, before any await.
      if('showSaveFilePicker' in window){
        try{fileHandle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'PRO-AUDIO-CONTROL Session',accept:{'application/json':['.pacsession']}}]});}
        catch(err){if(err&&err.name==='AbortError'){setSessionStatus('Penyimpanan dibatalkan.');return;}throw err;}
      }
      setSessionStatus('Mengemas audio dan pengaturan…');
      const session=await buildSession();
      const json=JSON.stringify(session);
      const blob=new Blob([json],{type:'application/json'});
      if(fileHandle){
        const writable=await fileHandle.createWritable();
        try{await writable.write(blob);await writable.close();}catch(err){try{await writable.abort()}catch(_){}throw err;}
      }else{
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      }
      closeSaveDialog();
      const mb=blob.size/(1024*1024);
      setSessionStatus(`Tersimpan: ${filename} • ${mb.toFixed(1)} MB`,'success');
    }catch(err){
      console.error('Save session failed',err);
      setSessionStatus('Gagal menyimpan sesi: '+(err&&err.message?err.message:'kesalahan file/audio'),'error');
    }finally{
      sessionBtn.disabled=false;sessionBtn.textContent=oldLabel||'⬇ SAVE SESSION';
      if(saveConfirmBtn)saveConfirmBtn.disabled=false;
    }
  }
  function sanitizeNotesHtml(input){
    const parser=new DOMParser();
    const doc=parser.parseFromString('<div>'+String(input||'')+'</div>','text/html');
    const root=doc.body.firstElementChild||doc.body;
    const allowed=new Set(['B','STRONG','I','EM','U','BR','DIV','P','UL','OL','LI','FONT','SPAN','SUB','SUP']);
    const dangerous=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','VIDEO','AUDIO','IMG','FORM','INPUT']);
    const allowedStyles=new Set(['text-align','font-size','font-family','font-weight','font-style','text-decoration','color','background-color']);
    function clean(parent){
      [...parent.childNodes].forEach(node=>{
        if(node.nodeType===Node.COMMENT_NODE){node.remove();return;}
        if(node.nodeType!==Node.ELEMENT_NODE){if(node.nodeType!==Node.TEXT_NODE)node.remove();return;}
        const el=node;
        if(dangerous.has(el.tagName)){el.remove();return;}
        clean(el);
        if(!allowed.has(el.tagName)){
          el.replaceWith(...el.childNodes);
          return;
        }
        const oldStyle=el.getAttribute('style')||'';
        const oldFontSize=el.tagName==='FONT'?el.getAttribute('size'):null;
        const safeStyles=[];
        oldStyle.split(';').forEach(part=>{
          const at=part.indexOf(':');if(at<1)return;
          const prop=part.slice(0,at).trim().toLowerCase();
          const val=part.slice(at+1).trim();
          if(allowedStyles.has(prop)&&val&&!/url\s*\(|expression|javascript:/i.test(val))safeStyles.push(prop+':'+val);
        });
        [...el.attributes].forEach(attr=>el.removeAttribute(attr.name));
        if(safeStyles.length)el.setAttribute('style',safeStyles.join(';'));
        if(el.tagName==='FONT'&&oldFontSize)el.setAttribute('size',oldFontSize);
      });
    }
    clean(root);
    return root.innerHTML;
  }
  async function validateAndStage(session){
    if(!session||session.format!==SESSION_FORMAT||session.schemaVersion!==SESSION_SCHEMA)throw new Error('Format/versi SESSION tidak dikenali. Pilih file .pacsession dari PRO-AUDIO-CONTROL V27.');
    if(!Array.isArray(session.pads)||session.pads.length!==15)throw new Error('SESSION harus memuat 15 slot PAD.');
    if(!Array.isArray(session.tracks))throw new Error('Daftar playlist di SESSION tidak valid.');
    const seen=new Set();
    session.pads.forEach(p=>{if(!Number.isInteger(p.index)||p.index<0||p.index>=15||seen.has(p.index))throw new Error('Posisi Pad di SESSION tidak valid.');seen.add(p.index)});
    const padEntries=[...session.pads].sort((a,b)=>a.index-b.index);
    const stagedPads=[];
    for(let i=0;i<padEntries.length;i++){
      setSessionStatus(`Memeriksa audio Pad ${i+1}/15…`);
      const entry=padEntries[i];
      stagedPads.push({entry,file:entry.audio?await payloadToFile(entry.audio):null});
    }
    const stagedTracks=[];
    for(let i=0;i<session.tracks.length;i++){
      setSessionStatus(`Memeriksa playlist ${i+1}/${session.tracks.length}…`);
      const entry=session.tracks[i];
      if(!entry||!entry.audio)throw new Error(`Track ${i+1} tidak memiliki audio di SESSION.`);
      stagedTracks.push({entry,file:await payloadToFile(entry.audio)});
    }
    return {session,pads:stagedPads,tracks:stagedTracks};
  }
  function restoreVisualSettings(settings){
    const s=settings||{};
    if(typeof applySkin==='function')applySkin(s.skin||'broadcast');
    if(typeof applyPlayerSkin==='function')applyPlayerSkin(s.playerSkin||'neon');
    if(typeof setVizStyle==='function')setVizStyle(s.visualizer||'bars');
    if(typeof setFont==='function')setFont(s.font||'inter');
  }
  async function applySession(staged){
    const session=staged.session, settings=session.settings||{};
    // Clear the edit lock before replacing materials; keyboard trigger shortcuts remain available afterward.
    setAllPadLock(false);
    padLocks.fill(false);
    for(let i=0;i<15;i++)updatePadLockUI(i);
    clearAllPads();
    clearAllMusic();
    masterGain=clamp01(settings.masterVolume,.7);
    $session('master').value=String(masterGain);
    $session('masterText').textContent=Math.round(masterGain*100)+'%';
    const musicVolume=clamp01(settings.musicVolume,.7);
    $session('musicVol').value=String(musicVolume);
    $session('musicVolText').textContent=Math.round(musicVolume*100)+'%';
    muted=false;
    $session('muteAll').textContent='🔇 MUTE';
    $session('muteAll').classList.remove('muted');
    setFadeTime(Number(settings.fadeSeconds)||1);
    restoreVisualSettings(settings);
    for(let i=0;i<staged.pads.length;i++){
      const {entry,file}=staged.pads[i];
      $session('vol'+i).value=String(clamp01(entry.volume,.7));
      $session('volText'+i).textContent=Math.round(clamp01(entry.volume,.7)*100)+'%';
      if(file)setPadFile(i,file);
      $session('name'+i).textContent=String(entry.name||file?.name||padNames[i]);
      pads[i].loop=!!entry.loop;
      $session('loop'+i).style.background=pads[i].loop?'#17608a':'';
    }
    tracks=staged.tracks.map(({entry,file})=>({source:'local',name:String(entry.name||file.name),url:URL.createObjectURL(file),file,type:file.type||''}));
    cur=-1;
    renderPlaylist();
    const selected=Number.isInteger(session.currentTrackIndex)?session.currentTrackIndex:-1;
    if(tracks.length){cur=selected>=0&&selected<tracks.length?selected:0;selectTrack(cur,false);}
    music.loop=!!settings.musicLoop;
    $session('musicLoop').style.background=music.loop?'#17608a':'';
    shuffleEnabled=!!settings.shuffle;
    $session('shuffle').classList.toggle('active',shuffleEnabled);
    $session('shuffle').setAttribute('aria-pressed',shuffleEnabled?'true':'false');
    if(musicNotes){musicNotes.innerHTML=sanitizeNotesHtml(session.notesHtml||'');if(typeof saveNotes==='function')saveNotes();}
    const individualLocks=Array.isArray(settings.padLocks)?settings.padLocks:staged.pads.map(x=>!!x.entry.locked);
    for(let i=0;i<15;i++)padLocks[i]=!!individualLocks[i];
    const requestedLast=Number(settings.lastPlayedIndex);
    lastPlayedIndex=Number.isInteger(requestedLast)&&requestedLast>=0&&requestedLast<15?requestedLast:-1;
    if(lastPlayedIndex>=0)setLastPlayed(lastPlayedIndex);
    else $session('lastPlayedText').textContent='—';
    setAllPadLock(!!settings.allPadsLocked);
    for(let i=0;i<15;i++)updatePadLockUI(i);
    applyVolumes();
    for(let i=0;i<15;i++)updatePad(i);
  }
  async function loadSessionFile(file){
    if(!file)return;
    const existingPads=pads.filter(p=>p&&p.file).length,existingTracks=tracks.length;
    if(existingPads||existingTracks){
      const ok=await pacConfirm({title:'GANTI SESI AKTIF?',message:`Sesi baru akan mengganti ${existingPads} materi PAD dan ${existingTracks} track playlist yang sedang aktif, termasuk pengaturan terkait. Simpan sesi sekarang terlebih dahulu jika ingin menyimpannya.`,confirmText:'GANTI SESI',danger:true,icon:'⇄'});
      if(!ok){if(loadInput)loadInput.value='';return}
    }
    if(loadBtn)loadBtn.disabled=true;
    const oldLabel=loadBtn?loadBtn.textContent:'';
    if(loadBtn)loadBtn.textContent='LOADING…';
    try{
      setSessionStatus('Membaca file SESSION…');
      const session=JSON.parse(await file.text());
      const staged=await validateAndStage(session);
      setSessionStatus('Memulihkan materi dan urutan…');
      await applySession(staged);
      const padCount=staged.pads.filter(p=>p.file).length;
      setSessionStatus(`SESSION siap • ${padCount}/15 PAD • ${staged.tracks.length} track`,'success');
    }catch(err){
      console.error('Load session failed',err);
      setSessionStatus('Gagal memuat sesi: '+(err&&err.message?err.message:'file tidak valid'),'error');
    }finally{
      if(loadBtn){loadBtn.disabled=false;loadBtn.textContent=oldLabel||'⬆ LOAD SESSION';}
      if(loadInput)loadInput.value='';
    }
  }
  if(sessionBtn)sessionBtn.addEventListener('click',openSaveDialog);
  if(saveConfirmBtn)saveConfirmBtn.addEventListener('click',saveSession);
  if(saveCancelBtn)saveCancelBtn.addEventListener('click',closeSaveDialog);
  if(saveOverlay)saveOverlay.addEventListener('click',e=>{if(e.target===saveOverlay)closeSaveDialog()});
  if(saveNameInput)saveNameInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveSession()}if(e.key==='Escape'){e.preventDefault();closeSaveDialog()}});
  if(loadBtn&&loadInput){loadBtn.addEventListener('click',()=>loadInput.click());loadInput.addEventListener('change',e=>loadSessionFile(e.target.files&&e.target.files[0]));}
})();
