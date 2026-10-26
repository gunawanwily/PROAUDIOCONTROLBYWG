
'use strict';
const $=id=>document.getElementById(id);
const padColors=['#0ea5ff','#7b3cff','#00d99a','#12d8ff','#ff8618','#ff2380','#9b35ff','#12d8ff','#ffd21a','#ff3b4b','#7b4cff','#12d8ff','#ff2fb3','#168cff','#00d084'];
const padNames=['Jingle Opening','Backing Track 01','Crowd Ambience','Siren','Applause','Sweep Down','Stinger','Laser','Kickbeat','Snare','Promo Video','Background Music','Effect 01','Effect 02','Instrumental'];
const pads=[];
const shortcutKeys=['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t'];
let allPadsLocked=false, lastPlayedIndex=-1;
const padLocks=Array(15).fill(false);
function setLastPlayed(i){lastPlayedIndex=i;const el=$('lastPlayedText');if(el)el.textContent='PAD '+(i+1)+' • '+($('name'+i)?.textContent||'Audio');}
function updatePadLockUI(i){const locked=allPadsLocked||padLocks[i];const pad=$('pads')?.children[i];if(!pad)return;pad.classList.toggle('padLocked',locked);const btn=$('lock'+i);if(btn){btn.setAttribute('aria-pressed',String(locked));btn.title=locked?'Buka kunci Pad '+(i+1):'Kunci Pad '+(i+1);}const controls=pad.querySelectorAll('button,input,label');controls.forEach(el=>{if(el!==btn)el.disabled=locked;});pad.setAttribute('aria-disabled',String(locked));}
function setAllPadLock(v){allPadsLocked=v;for(let i=0;i<15;i++)updatePadLockUI(i);const b=$('lockAllPads');if(b){b.classList.toggle('active',v);b.setAttribute('aria-pressed',String(v));const t=b.querySelector('.lockText');if(t)t.textContent=v?'LOCKED':'LOCK EDIT';}}
function updateActivePads(){const list=$('activePadsList'),count=$('activePadsCount');if(!list||!count)return;const active=pads.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.audio&&(!x.p.audio.paused||fadeJobs.has(x.p.audio)));count.textContent=String(active.length);list.innerHTML=active.length?active.map(({i})=>{const name=escapeHtml($('name'+i)?.textContent||'Audio');return `<span class="activePadChip" title="PAD ${i+1}"><span class="activePadText" data-full="PAD ${i+1} · ${name}">PAD ${i+1} · ${name}</span></span>`}).join(''):'<span class="activePadsEmpty">Tidak ada pad yang aktif</span>';requestAnimationFrame(()=>{list.querySelectorAll('.activePadText').forEach(el=>{if(el.scrollWidth>el.clientWidth){el.classList.add('running');el.style.setProperty('--marquee-shift',(el.scrollWidth-el.clientWidth)+'px');}});});}
function renderShortcutCard(){}
function triggerPadShortcut(i){ if(Number.isInteger(i)&&pads[i]) playPadWithCrossfade(i); }
let masterGain=.7, muted=false, fadeDuration=1500, masterFadeRunning=false;
function fmt(s){if(!Number.isFinite(s)||s<0)s=0;return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')}
let pacToastSeq=0;
function showPacToast(message,kind='info',title=''){
  if(!message)return;
  const host=$('pacToastHost');if(!host)return;
  const text=String(message);const type=['success','error','warning'].includes(kind)?kind:'info';
  const heading=title||(type==='success'?'Berhasil':type==='error'?'Perlu perhatian':type==='warning'?'Perhatian':'PRO AUDIO CONTROL');
  const icon=type==='success'?'✓':type==='error'?'!':type==='warning'?'⚠':'i';
  const node=document.createElement('div');node.className='pacToast '+type;node.setAttribute('role',type==='error'?'alert':'status');
  const ico=document.createElement('div');ico.className='pacToastIcon';ico.textContent=icon;
  const content=document.createElement('div');const h=document.createElement('div');h.className='pacToastTitle';h.textContent=heading;const m=document.createElement('div');m.className='pacToastMessage';m.textContent=text;content.append(h,m);
  const close=document.createElement('button');close.className='pacToastClose';close.type='button';close.setAttribute('aria-label','Tutup notifikasi');close.textContent='×';
  const bar=document.createElement('div');bar.className='pacToastBar';node.append(ico,content,close,bar);host.appendChild(node);
  const duration=type==='error'?6500:4000;bar.style.animationDuration=duration+'ms';
  let timer=setTimeout(dismiss,duration);function dismiss(){if(!node.isConnected)return;clearTimeout(timer);node.style.animation='pacToastOut .18s ease-in forwards';setTimeout(()=>node.remove(),180)}
  close.addEventListener('click',dismiss);while(host.children.length>4)host.firstElementChild.remove();
}
function status(msg){const e=$('playbackStatus');if(e){e.textContent=msg||'';e.style.display='none'}if(msg)showPacToast(msg,/gagal|error|tidak dapat|failed/i.test(msg)?'error':'info');}

let pacConfirmResolver=null;
function pacConfirm({title='KONFIRMASI AKSI',message='Apakah Anda yakin ingin melanjutkan?',confirmText='LANJUTKAN',cancelText='BATAL',danger=true,icon='⚠'}={}){
  const overlay=$('pacConfirmOverlay');
  if(!overlay)return Promise.resolve(window.confirm(message));
  if(pacConfirmResolver)pacConfirmResolver(false);
  $('pacConfirmTitle').textContent=title;$('pacConfirmText').textContent=message;
  $('pacConfirmProceed').textContent=confirmText;$('pacConfirmCancel').textContent=cancelText;
  $('pacConfirmProceed').classList.toggle('safe',!danger);$('pacConfirmIcon').textContent=icon;
  overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
  const cancel=$('pacConfirmCancel'),proceed=$('pacConfirmProceed');
  return new Promise(resolve=>{
    let finished=false;
    const finish=value=>{if(finished)return;finished=true;if(pacConfirmResolver===finish)pacConfirmResolver=null;overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');cancel.removeEventListener('click',onCancel);proceed.removeEventListener('click',onProceed);overlay.removeEventListener('click',onBackdrop);document.removeEventListener('keydown',onKey);resolve(value)};
    pacConfirmResolver=value=>finish(value);
    const onCancel=()=>finish(false),onProceed=()=>finish(true),onBackdrop=e=>{if(e.target===overlay)finish(false)};
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(false)}else if(e.key==='Enter'&&overlay.classList.contains('open')){e.preventDefault();finish(document.activeElement===cancel?false:true)}};
    cancel.addEventListener('click',onCancel);proceed.addEventListener('click',onProceed);overlay.addEventListener('click',onBackdrop);document.addEventListener('keydown',onKey);cancel.focus();
  });
}
function mediaError(label,m){const e=m&&m.error;let detail='';if(e){const codes={1:'aborted',2:'network',3:'decode',4:'format tidak didukung'};detail=' ['+(codes[e.code]||('code '+e.code))+']'}status(label+' gagal diputar'+detail+'. Coba MP3/WAV/M4A/OGG. Pastikan volume perangkat tidak mute.');}
function makeAudio(label){
  const a=document.createElement('audio');
  a.preload='auto'; a.autoplay=false; a.muted=false; a.defaultMuted=false; a.volume=.7;
  a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline',''); a.setAttribute('x-webkit-airplay','allow');
  a.controls=false; a.setAttribute('aria-hidden','true'); a.tabIndex=-1; a.style.position='fixed'; a.style.left='-10000px'; a.style.top='-10000px'; a.style.width='1px'; a.style.height='1px'; a.style.opacity='0.01'; a.dataset.pacLabel=label||'Audio';
  a.addEventListener('error',()=>mediaError(a.dataset.pacLabel,a));
  document.body.appendChild(a);
  return a;
}
function revokeMediaURL(media){if(media&&media.__pacURL){try{URL.revokeObjectURL(media.__pacURL)}catch(e){}media.__pacURL=null}}
function setSource(media,file,label){
  if(!media||!file)return false;
  try{
    cancelFade(media);
    media.pause();
    revokeMediaURL(media);
    media.removeAttribute('src');
    media.load();
    const u=URL.createObjectURL(file);
    media.__pacURL=u;
    media.__pacLabel=label||file.name;
    media.muted=false; media.defaultMuted=false; media.autoplay=false; media.preload='auto';
    media.src=u;
    media.load();
    return true;
  }catch(e){status('Gagal memuat '+(label||file.name)+'.');return false}
}
async function playNative(media,label){
  // Initialize/resume the analyzer BEFORE playback so the visualizer receives the same audio stream.
  try{ await resumeVizAudio(media); }catch(e){}
  if(!media||!media.src){status('Belum ada file pada '+(label||'player')+'. Pilih file audio terlebih dahulu.');return false}
  try{
    media.muted=false;
    media.defaultMuted=false;
    media.autoplay=false;
    media.setAttribute('playsinline','');
    // Pastikan elemen benar-benar siap sebelum playback.
    if(media.readyState===0) media.load();
    let promise;
    try{ promise=media.play(); }catch(err){ promise=null; throw err; }
    if(promise&&typeof promise.then==='function') await promise;
    status('');
    return true;
  }catch(err){
    // Beberapa browser perlu satu kali reload source setelah file lokal selesai dipilih.
    try{
      if(media.readyState<2){
        await new Promise((resolve,reject)=>{
          let done=false;
          const ok=()=>{if(done)return;done=true;cleanup();resolve()};
          const bad=()=>{if(done)return;done=true;cleanup();reject(media.error||new Error('media error'))};
          const timer=setTimeout(()=>{if(done)return;done=true;cleanup();reject(new Error('timeout'))},2500);
          function cleanup(){clearTimeout(timer);media.removeEventListener('canplay',ok);media.removeEventListener('error',bad)}
          media.addEventListener('canplay',ok,{once:true});
          media.addEventListener('error',bad,{once:true});
          media.load();
        });
      }
      media.muted=false;
      const retry=media.play();
      if(retry&&typeof retry.then==='function') await retry;
      status('');
      return true;
    }catch(retryErr){
      const name=(retryErr&&retryErr.name)||(err&&err.name)||'PlaybackError';
      const code=media&&media.error&&media.error.code;
      const detail=code===4?'Format audio tidak didukung browser.':code===3?'File audio gagal di-decode.':name==='NotAllowedError'?'Browser memblokir playback. Tekan PLAY sekali lagi setelah memilih file.':'Pastikan file audio valid dan volume perangkat tidak mute.';
      status((label||'Media')+' tidak dapat diputar — '+detail);
      return false;
    }
  }
}
function targetPadVolume(i){return muted?0:Math.max(0,Math.min(1,(parseFloat($('vol'+i).value)||0)*masterGain))}
function targetMusicVolume(){return muted?0:Math.max(0,Math.min(1,(parseFloat($('musicVol').value)||0)*masterGain))}

// Robust fade engine: every media element gets a generation token so an old
// fade callback can never restore/stop a pad after a newer PLAY/STOP action.
const fadeJobs=new WeakMap();
const fadeSeq=new WeakMap();
function nextFadeSeq(m){const n=(fadeSeq.get(m)||0)+1;fadeSeq.set(m,n);return n}
function cancelFade(m){if(!m)return;nextFadeSeq(m);const j=fadeJobs.get(m);if(j){j.cancelled=true;fadeJobs.delete(m)}}
function fadeOut(m,dur,reset=true){
  if(!m)return false;
  const active=!m.paused || fadeJobs.has(m);
  if(!active)return false;
  const restore=targetVolumeForMedia(m);
  fadeTo(m,0,dur,()=>{
    // Only this fade may stop the media. A newer PLAY cancels this callback.
    m.pause();
    if(reset){try{m.currentTime=0}catch(e){}}
    m.volume=muted?0:restore;
  });
  return true;
}
function targetVolumeForMedia(m){
  const p=pads.find(x=>x.audio===m);
  if(p){const i=pads.indexOf(p);return targetPadVolume(i)}
  return targetMusicVolume();
}

function crossfadeToPad(except){
  const dur=Math.max(80,Number(fadeDuration)||1000);
  pads.forEach((p,i)=>{
    if(i===except||!p||!p.audio)return;
    const a=p.audio;
    // A pad is considered active while playing OR while its previous fade is
    // still running. This makes Pad A -> B -> C reliable even when pressed fast.
    if(a.paused && !fadeJobs.has(a))return;
    const restore=targetPadVolume(i);
    fadeTo(a,0,dur,()=>{
      a.pause();
      try{a.currentTime=0}catch(e){}
      setMediaGain(a,restore);
      updatePad(i);
    });
  });
}

function playPadWithCrossfade(i){
  const p=pads[i],a=p&&p.audio;
  if(!a)return false;
  setLastPlayed(i);
  if(!a.src){$('file'+i).click();return false}

  // PLAY on an already playing pad = fade it out.
  if(!a.paused){fadeOut(a,fadeDuration,false);return true}

  // Cancel any stale fade on the destination pad before starting it.
  cancelFade(a);
  if(a.ended || (Number.isFinite(a.duration)&&a.currentTime>=Math.max(0,a.duration-.05))){try{a.currentTime=0}catch(e){}}

  // First fade every other active pad down. The destination is excluded.
  crossfadeToPad(i);

  const target=targetPadVolume(i);
  a.muted=false;a.defaultMuted=false;a.autoplay=false;
  const st=ensureAnalyzer(a); if(st&&st.ctx.state==='suspended'){try{st.ctx.resume()}catch(e){}}
  setMediaGain(a,0);

  // Do not await anything before calling play(): preserve the user's click
  // gesture on Android/mobile browsers.
  let pr;
  try{
    if(a.readyState===0)a.load();
    pr=a.play();
  }catch(err){
    setMediaGain(a,target);
    status('Pad '+(i+1)+' tidak dapat diputar. Coba PLAY lagi atau muat ulang file audio.');
    return false;
  }

  const startFade=()=>{
    if(a.paused){
      // If playback was rejected/stopped before the promise settled, don't
      // leave the pad silently sitting at zero volume.
      setMediaGain(a,target);
      updatePad(i);
      return;
    }
    status('');
    if(target>0)fadeTo(a,target,fadeDuration,()=>updatePad(i));
    else setMediaGain(a,0);
    updatePad(i);
  };
  if(pr&&typeof pr.then==='function'){
    pr.then(startFade).catch(err=>{
      setMediaGain(a,target);
      const name=err&&err.name||'';
      status('Pad '+(i+1)+' tidak dapat mengeluarkan suara — '+(name==='NotAllowedError'?'browser memblokir playback. Tekan PLAY lagi.':'file audio belum siap/format tidak didukung.'));
      updatePad(i);
    });
  }else startFade();
  return true;
}

// REAL-TIME AUDIO VISUALIZER ENGINE
// Uses Web Audio AnalyserNode when supported, while keeping native HTML5 Audio
// as the playback fallback. The analyzer reads the actual audio spectrum rather
// than generating decorative bars from currentTime, so the animation follows
// bass/mids/highs and reacts to transients in the material.
const vizState = new WeakMap();
let vizAudioCtx = null;
function getVizContext(){
  if(vizAudioCtx) return vizAudioCtx;
  try{ vizAudioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
  catch(e){ vizAudioCtx = null; }
  return vizAudioCtx;
}
function ensureAnalyzer(audio){
  if(!audio) return null;
  let st=vizState.get(audio);
  if(st) return st;
  const ctx=getVizContext();
  if(!ctx) return null;
  try{
    const source=ctx.createMediaElementSource(audio);
    const analyser=ctx.createAnalyser();
    const gain=ctx.createGain();
    analyser.fftSize=1024;
    analyser.minDecibels=-100;
    analyser.maxDecibels=-10;
    analyser.smoothingTimeConstant=.38;
    gain.gain.value=Number.isFinite(audio.volume)?audio.volume:.7;
    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);
    st={ctx,source,analyser,gain,freq:new Uint8Array(analyser.frequencyBinCount),time:new Uint8Array(analyser.fftSize),bass:0,mid:0,high:0,peak:0,energy:0,beat:0};
    vizState.set(audio,st);
    // Once Web Audio owns the output, keep the element at unity and control
    // loudness through the GainNode. This makes fade and visualizer use one path.
    audio.volume=1;
    return st;
  }catch(e){ return null; }
}
function setMediaGain(audio,value){
  const v=Math.max(0,Math.min(1,Number(value)||0));
  const st=vizState.get(audio);
  if(st&&st.gain){
    const now=st.ctx.currentTime;
    try{st.gain.gain.cancelScheduledValues(now);st.gain.gain.setValueAtTime(v,now)}catch(e){st.gain.gain.value=v}
    audio.volume=1;
  }else audio.volume=v;
}
function getMediaGain(audio){
  const st=vizState.get(audio);
  return st&&st.gain?st.gain.gain.value:(Number.isFinite(audio?.volume)?audio.volume:0);
}
function fadeTo(m,to,dur,done){
  if(!m)return;
  const token=nextFadeSeq(m);
  const target=Math.max(0,Math.min(1,Number(to)||0));
  const from=getMediaGain(m);
  const ms=Math.max(80,Number(dur)||1000);
  const job={cancelled:false,token}; fadeJobs.set(m,job);
  const t0=performance.now();
  const step=t=>{
    if(job.cancelled || fadeSeq.get(m)!==token)return;
    const q=Math.min(1,(t-t0)/ms);
    setMediaGain(m,from+(target-from)*q);
    if(q<1){requestAnimationFrame(step);return}
    setMediaGain(m,target);
    if(fadeJobs.get(m)===job)fadeJobs.delete(m);
    if(fadeSeq.get(m)===token&&typeof done==='function')done();
  };
  requestAnimationFrame(step);
}
async function resumeVizAudio(audio){
  const st=ensureAnalyzer(audio);
  if(st&&st.ctx.state==='suspended'){
    try{st.ctx.resume()}catch(e){}
  }
  return st;
}

function avgBand(data,a,b){
  let sum=0,n=0; const end=Math.min(data.length,b);
  for(let i=Math.max(0,a);i<end;i++){sum+=data[i];n++}
  return n?sum/n/255:0;
}
function drawGraph(canvas,audio,accent,active){
  const c=canvas?.getContext('2d'); if(!c)return;
  const dpr=window.devicePixelRatio||1;
  const w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  c.clearRect(0,0,w,h);
  const st=vizState.get(audio);
  let bass=0,mid=0,high=0,energy=0,beat=0;
  if(st){
    try{
      st.analyser.getByteFrequencyData(st.freq);
      st.analyser.getByteTimeDomainData(st.time);
      const n=st.freq.length;
      bass=avgBand(st.freq,1,Math.max(8,Math.floor(n*.055)));
      mid=avgBand(st.freq,Math.floor(n*.055),Math.floor(n*.30));
      high=avgBand(st.freq,Math.floor(n*.30),n);
      energy=bass*.62+mid*.28+high*.10;
      const rise=Math.max(0,energy-(st.energy||0));
      st.energy += (energy-st.energy)*(energy>st.energy?.48:.12);
      st.bass += (bass-st.bass)*.38;
      st.mid += (mid-st.mid)*.30;
      st.high += (high-st.high)*.24;
      st.beat=Math.max(st.beat*.80,Math.min(1,rise*8));
      beat=st.beat;
    }catch(e){}
  }
  const live=!!(active&&st);
  const style=window.pacVizStyle||'bars';
  const count=Math.max(36,Math.min(96,Math.floor(w/(4*dpr))));
  const values=[];
  for(let i=0;i<count;i++){
    const f=i/(count-1);
    const bin=st?Math.min(st.freq.length-1,Math.floor(Math.pow(f,1.65)*(st.freq.length-1))):0;
    const raw=st?(st.freq[bin]/255):0;
    const band=f<.28?(st?.bass||0):f<.70?(st?.mid||0):(st?.high||0);
    values.push(Math.max(.025,Math.min(1,.06+raw*.58+band*.42+beat*(f<.35?1.25:.55))));
  }
  c.globalAlpha=1;c.shadowBlur=0;
  if(style==='wave'){
    c.beginPath();
    for(let x=0;x<w;x++){
      const idx=Math.min((st?.time?.length||1)-1,Math.floor(x/w*(st?.time?.length||1)));
      const y=live&&st?h*.5+(st.time[idx]-128)/128*h*.34:h*.5;
      if(x===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.strokeStyle=accent;c.lineWidth=Math.max(1.5,2*dpr);c.globalAlpha=live?.95:.15;c.shadowBlur=live?8*dpr:0;c.shadowColor=accent;c.stroke();
  }else if(style==='mirror'){
    const gap=Math.max(1*dpr,w/(count*20)),bw=Math.max(1.2*dpr,(w-gap*(count-1))/count);
    values.forEach((v,i)=>{
      const bh=v*h*.42, x=i*(bw+gap);
      c.fillStyle=accent;c.globalAlpha=live?Math.min(1,.45+v*.5):.10;c.fillRect(x,h/2-bh,bw,bh);c.fillRect(x,h/2,bw,bh);
    });
  }else if(style==='pulse'){
    const cx=w/2,cy=h/2, maxR=Math.min(w,h)*.42;
    c.strokeStyle=accent;c.lineWidth=Math.max(1.5,2*dpr);
    for(let k=0;k<12;k++){
      const v=values[Math.floor(k*count/12)]||0;
      const r=(maxR*(.18+k*.065))*(live?(1+v*.22):.72);
      c.globalAlpha=live?Math.min(1,.12+v*.65):.08;
      c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
    }
    c.globalAlpha=live?.9:.12;c.fillStyle=accent;c.beginPath();c.arc(cx,cy,Math.max(3*dpr,8*dpr*(.35+beat)),0,Math.PI*2);c.fill();
  }else if(style==='matrix'){
    const cols=Math.max(24,Math.min(64,Math.floor(w/(7*dpr)))), cw=w/cols;
    for(let i=0;i<cols;i++){
      const v=values[Math.floor(i*count/cols)]||.025, rows=10, activeRows=Math.max(1,Math.floor(v*rows));
      for(let r=0;r<rows;r++){
        c.fillStyle=accent;c.globalAlpha=live&&r>=rows-activeRows?(.22+.07*(r%3)):.035;
        c.fillRect(i*cw+1*dpr,h-(r+1)*(h/(rows+1)),Math.max(1,cw-2*dpr),Math.max(1,h/(rows+1)-2*dpr));
      }
    }
  }else{
    const gap=Math.max(1*dpr,w/(count*20)),bw=Math.max(1.2*dpr,(w-gap*(count-1))/count);
    values.forEach((v,i)=>{
      const bh=v*h*.92,x=i*(bw+gap),y=(h-bh)/2;
      c.fillStyle=accent;c.globalAlpha=live?Math.min(1,.38+v*.58):.12;c.shadowBlur=live?(3+beat*14)*dpr:0;c.shadowColor=accent;c.fillRect(x,y,bw,bh);
    });
    if(live&&st){
      c.beginPath();
      for(let x=0;x<w;x++){
        const idx=Math.min(st.time.length-1,Math.floor(x/w*st.time.length));
        const y=h*.5+(st.time[idx]-128)/128*h*.22;
        if(x===0)c.moveTo(x,y);else c.lineTo(x,y);
      }
      c.globalAlpha=.65;c.strokeStyle=accent;c.lineWidth=Math.max(1,dpr);c.shadowBlur=3*dpr;c.stroke();
    }
  }
  c.globalAlpha=1;c.shadowBlur=0;
}
function renderVisualizers(){
  pads.forEach((p,i)=>{if(!p.audio.paused)ensureAnalyzer(p.audio);drawGraph($('canvas'+i),p.audio,p.color,!p.audio.paused);});
  if(!music.paused)ensureAnalyzer(music);
  drawGraph($('musicVisualizer'),music,'#12d8ff',!music.paused);
  requestAnimationFrame(renderVisualizers);
}
function updatePad(i){const p=pads[i],a=p.audio,d=Number.isFinite(a.duration)?a.duration:0,c=a.currentTime||0;const isPlaying=!a.paused&&d>0;const padEl=$('pads')?.children[i];if(padEl)padEl.classList.toggle('padPlaying',isPlaying);$('time'+i).textContent=fmt(c)+' / '+fmt(d);const rem=Math.max(0,d-c);$('tc'+i).textContent='TIME -'+fmt(rem);$('tc'+i).classList.toggle('on',isPlaying);$('tc'+i).classList.toggle('warn',isPlaying&&rem<=10&&rem>3);$('tc'+i).classList.toggle('danger',isPlaying&&rem<=3);const liveTimer=$('liveTimer'+i);if(liveTimer){liveTimer.textContent='−'+fmt(rem);liveTimer.classList.toggle('active',isPlaying);liveTimer.classList.toggle('urgent',isPlaying&&rem<=5);} $('prog'+i).style.width=(d?c/d*100:0)+'%';$('play'+i).textContent=a.paused?'▶ PLAY':'❚❚ PAUSE';$('play'+i).classList.toggle('active',isPlaying);$('fadeState'+i).classList.toggle('on',isPlaying);updateActivePads();}
function padTemplate(i){return `<article class="pad" style="--accent:${padColors[i]}" data-i="${i}"><div class="dropBadge">DROP AUDIO HERE • PAD ${i+1}</div><div class="padhead"><div class="num">${i+1}</div><span class="fadeState" id="fadeState${i}">FADE</span><div class="name" id="name${i}">${padNames[i]}</div><span class="padLiveTimer" id="liveTimer${i}" aria-label="Sisa durasi materi">−00:00</span><button class="rename" title="Rename">✎</button><button class="padLock" id="lock${i}" title="Lock pad editing" aria-label="Lock pad editing"></button></div><div class="wave"><canvas id="canvas${i}"></canvas><div class="meter"></div><span class="vizLabel">LIVE AUDIO</span></div><div class="timeRow"><span class="time" id="time${i}">00:00 / 00:00</span><span class="timecode" id="tc${i}">TIME -00:00</span></div><div class="progress"><i id="prog${i}"></i></div><div class="controls"><button class="play" id="play${i}">▶ PLAY</button><button class="stop" id="stop${i}">■ STOP</button><button id="cue${i}">◉ CUE</button></div><div class="padVolume"><span>VOL</span><input id="vol${i}" type="range" min="0" max="1" step=".01" value=".7"><b id="volText${i}">70%</b></div><div class="subcontrols"><button id="fade${i}">♧ FADE</button><button id="loop${i}">↻ LOOP</button></div><label class="load">▱ LOAD AUDIO<input id="file${i}" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.webm,.flac"></label></article>`}
$('pads').innerHTML=Array.from({length:15},(_,i)=>padTemplate(i)).join('');
function isAudioFile(f){return !!f && ((f.type||'').startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|webm|flac)$/i.test(f.name||''));}
function setPadFile(i,f){
  if(allPadsLocked||padLocks[i]) return false;
  if(!isAudioFile(f)) { status('Pad '+(i+1)+': file harus berupa audio.'); return false; }
  const a=pads[i]?.audio; if(!a) return false;
  try{
    cancelFade(a); a.pause();
    if(a.__pacURL){try{URL.revokeObjectURL(a.__pacURL)}catch(err){} a.__pacURL=null;}
    pads[i].file=f; const url=URL.createObjectURL(f); a.__pacURL=url; a.src=url; a.preload='auto'; a.muted=false; a.defaultMuted=false; ensureAnalyzer(a); setMediaGain(a,targetPadVolume(i)); a.load();
    $('name'+i).textContent=(f.name||'Audio').replace(/\.[^.]+$/,'');
    updatePad(i); return true;
  }catch(err){status('Gagal memuat audio Pad '+(i+1)+'.'); return false;}
}
function addMusicFiles(fs){
  const audioFiles=[...fs].filter(isAudioFile);
  if(!audioFiles.length){status('Tidak ada file audio yang ditemukan.'); return 0;}
  audioFiles.forEach(f=>tracks.push({source:'local',name:f.name,url:URL.createObjectURL(f),file:f,type:f.type||''}));
  renderPlaylist(); if(cur<0) selectTrack(0,false); return audioFiles.length;
}
function bindFileDrop(zone,handler){
  if(!zone) return;
  ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{
    if(!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault(); e.stopPropagation(); zone.classList.add('fileDropActive');
  }));
  ['dragleave','dragend'].forEach(ev=>zone.addEventListener(ev,e=>{
    if(e.relatedTarget && zone.contains(e.relatedTarget)) return;
    zone.classList.remove('fileDropActive');
  }));
  zone.addEventListener('drop',e=>{
    if(!e.dataTransfer || !e.dataTransfer.files?.length) return;
    e.preventDefault(); e.stopPropagation(); zone.classList.remove('fileDropActive'); handler([...e.dataTransfer.files]);
  });
}
for(let i=0;i<15;i++){
  // Audio Pad engine intentionally uses the same simple native HTML5 Audio
  // pattern as the known-working reference file: new Audio() + object URL +
  // direct play() from the user's click event. No Web Audio routing is used.
  const a=makeAudio('Pad '+(i+1));
  a.preload='auto';
  a.autoplay=false;
  a.muted=false;
  a.defaultMuted=false;
  a.__pacURL=null;
  a.volume=1;
  const p={audio:a,loop:false,color:padColors[i],file:null};
  pads.push(p);

  $('file'+i).addEventListener('change',e=>{if(allPadsLocked||padLocks[i]){e.target.value='';return;}const f=e.target.files&&e.target.files[0];if(f)setPadFile(i,f);e.target.value='';});
  bindFileDrop($('pads').querySelector('.pad[data-i="'+i+'"]'),files=>{if(allPadsLocked||padLocks[i])return;setPadFile(i,files[0]);});

  $('pads').children[i].addEventListener('dblclick',e=>{
    if(e.target.closest('button,input,label,.rename')) return;
    if(allPadsLocked||padLocks[i]) return;
    playPadWithCrossfade(i);
  });

  $('play'+i).onclick=()=>{
    if(allPadsLocked||padLocks[i]) return;
    status('');
    playPadWithCrossfade(i);
  };

  $('stop'+i).onclick=()=>{
    if(allPadsLocked||padLocks[i]) return;
    cancelFade(a);
    a.pause();
    try{a.currentTime=0}catch(e){}
    setMediaGain(a,targetPadVolume(i));
    updatePad(i);
  };

  $('cue'+i).onclick=()=>{
    if(allPadsLocked||padLocks[i]) return;
    setLastPlayed(i);
    status('');
    void resumeVizAudio(a);
       crossfadeToPad(i);
    cancelFade(a);
    try{a.currentTime=0}catch(e){}
    a.muted=false;
    setMediaGain(a,targetPadVolume(i));
    let pr;
    try{pr=a.play()}catch(err){status('Pad '+(i+1)+' tidak dapat diputar.');return;}
    if(pr&&typeof pr.catch==='function')pr.catch(err=>status('Pad '+(i+1)+' tidak dapat mengeluarkan suara.'));
  };

  $('fade'+i).onclick=()=>{if(allPadsLocked||padLocks[i])return;fadeOut(a,fadeDuration,true)};
  $('loop'+i).onclick=()=>{if(allPadsLocked||padLocks[i])return;togglePadLoop(i)};
  $('vol'+i).oninput=e=>{
    if(allPadsLocked||padLocks[i])return;
    const v=Math.max(0,Math.min(1,parseFloat(e.target.value)||0));
    $('volText'+i).textContent=Math.round(v*100)+'%';
    if(!muted&&!a.paused&&!fadeJobs.has(a))setMediaGain(a,v*masterGain);
    else if(a.paused)setMediaGain(a,targetPadVolume(i));
  };
  $('pads').children[i].querySelector('.rename').onclick=()=>{if(allPadsLocked||padLocks[i])return;
    const n=prompt('Nama pad:',$('name'+i).textContent);
    if(n&&n.trim())$('name'+i).textContent=n.trim();
  };
  $('lock'+i).onclick=()=>{padLocks[i]=!padLocks[i];updatePadLockUI(i);};
  const padEl=$('pads').children[i];
  a.addEventListener('ended',()=>{
    cancelFade(a);
    if(p.loop){
      try{a.currentTime=0}catch(e){}
      const target=targetPadVolume(i);
      setMediaGain(a,0);
      const pr=a.play();
      const restart=()=>{if(!a.paused&&target>0)fadeTo(a,target,fadeDuration);else setMediaGain(a,target);updatePad(i)};
      if(pr&&typeof pr.then==='function')pr.then(restart).catch(()=>{setMediaGain(a,target);updatePad(i)});else restart();
    }
    updatePad(i);
  });
  a.addEventListener('stalled',()=>{ if(!a.paused) status('Pad '+(i+1)+' sedang menunggu data audio…'); });
  a.addEventListener('canplay',()=>{ if(!a.paused) status(''); });
  a.addEventListener('error',()=>mediaError('Pad '+(i+1),a));
  ['timeupdate','loadedmetadata','durationchange','play','pause','volumechange'].forEach(ev=>a.addEventListener(ev,()=>updatePad(i)));
  updatePad(i);
}
// Desktop keyboard control: 1–9 / 0 / Q-W-E-R-T = Pads 1–15; Z=Stop last pad; X=Loop; C=Fade Out; Space=Fade All; Shift+Space=instant Stop All.
function hasEditableKeyboardTarget(target){
  if(!target)return false;
  const tag=(target.tagName||'').toLowerCase();
  if(tag==='textarea'||tag==='select')return true;
  if(tag==='input'){
    const type=(target.type||'').toLowerCase();
    return !['range','file','button','checkbox','radio','submit','reset','color'].includes(type);
  }
  return !!target.isContentEditable||!!target.closest?.('[contenteditable="true"],[contenteditable=""]');
}
function togglePadLoop(i){
  const p=pads[i]; if(!p)return;
  p.loop=!p.loop;
  const b=$('loop'+i); if(b)b.style.background=p.loop?'#17608a':'';
}
function stopPadByShortcut(i){
  const p=pads[i]; if(!p?.audio)return;
  const a=p.audio; cancelFade(a); a.pause(); try{a.currentTime=0}catch(err){}
  setMediaGain(a,targetPadVolume(i)); updatePad(i);
}
function isDesktopShortcutDevice(){
  try{return window.matchMedia('(any-pointer: fine)').matches && window.matchMedia('(min-width: 821px)').matches}catch(e){return window.innerWidth>=821}
}
document.addEventListener('keydown',e=>{
  if(!isDesktopShortcutDevice()||hasEditableKeyboardTarget(e.target))return;
  if(e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;
  const k=(e.key||'').toLowerCase();
  if(k===' '||k==='spacebar'){
    e.preventDefault();
    if(e.shiftKey){$('stopAll')?.click();return;}
    $('masterFadeBtn')?.click();return;
  }
  if(e.shiftKey)return;
  const i=shortcutKeys.indexOf(k);
  if(i>=0&&i<15){e.preventDefault();triggerPadShortcut(i);return;}
  if(k==='z'){
    e.preventDefault();
    if(lastPlayedIndex>=0)stopPadByShortcut(lastPlayedIndex);
    else $('stopAll')?.click();
    return;
  }
  if(k==='x'){
    e.preventDefault();
    if(lastPlayedIndex>=0)togglePadLoop(lastPlayedIndex);
    return;
  }
  if(k==='c'){
    e.preventDefault();
    if(lastPlayedIndex>=0&&pads[lastPlayedIndex]?.audio)fadeOut(pads[lastPlayedIndex].audio,fadeDuration,true);
  }
});
$('lockAllPads').onclick=()=>setAllPadLock(!allPadsLocked);
let tracks=[],cur=-1;const music=makeAudio('Music Player');music.volume=.7;
let dragFrom=-1;
function renderPlaylist(){
  const box=$('playlist');
  box.innerHTML=tracks.map((t,i)=>`<div class="track ${i===cur?'active':''}" draggable="true" data-track="${i}" title="Geser untuk mengubah urutan"><span class="dragHandle" aria-hidden="true">☷</span><span class="idx">${String(i+1).padStart(2,'0')}</span><span class="tnWrap"><span class="tn">${escapeHtml(t.name||'Untitled')}</span><small class="sourceBadge">LOCAL</small></span><button class="removeTrack" data-remove="${i}" aria-label="Hapus" title="Hapus lagu">×</button></div>`).join('');
  box.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>selectTrack(Number(b.dataset.i),true));
  box.querySelectorAll('button[data-remove]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const i=Number(b.dataset.remove),track=tracks[i];if(!track)return;const ok=await pacConfirm({title:'HAPUS TRACK?',message:`Track “${track.name||'Untitled'}” akan dihapus dari playlist. Urutan track lainnya tidak berubah.`,confirmText:'HAPUS TRACK',danger:true,icon:'♫'});if(ok)removeTrack(i)});
  box.querySelectorAll('button[data-up]').forEach(b=>b.onclick=e=>{e.stopPropagation();moveTrack(Number(b.dataset.up),-1)});
  box.querySelectorAll('button[data-down]').forEach(b=>b.onclick=e=>{e.stopPropagation();moveTrack(Number(b.dataset.down),1)});
  box.querySelectorAll('.track').forEach(row=>{
    row.addEventListener('dblclick',e=>{
      // Double-click the playlist row (not its action buttons) to load and play that track.
      if(e.target.closest('button')) return;
      const i=Number(row.dataset.track);
      if(Number.isInteger(i) && i>=0 && i<tracks.length){
        selectTrack(i,true);
      }
    });
    row.addEventListener('dragstart',e=>{dragFrom=Number(row.dataset.track);row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragFrom))});
    row.addEventListener('dragend',()=>{dragFrom=-1;box.querySelectorAll('.track').forEach(x=>x.classList.remove('dragging','dropTarget'))});
    row.addEventListener('dragover',e=>{e.preventDefault();if(Number(row.dataset.track)!==dragFrom)row.classList.add('dropTarget');e.dataTransfer.dropEffect='move'});
    row.addEventListener('dragleave',()=>row.classList.remove('dropTarget'));
    row.addEventListener('drop',e=>{e.preventDefault();const to=Number(row.dataset.track);row.classList.remove('dropTarget');if(dragFrom>=0&&to!==dragFrom)moveTrack(dragFrom,to-dragFrom)});
  });
}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function moveTrack(from,delta){const to=from+delta;if(from<0||from>=tracks.length||to<0||to>=tracks.length)return;const wasCurrent=cur===from;const [item]=tracks.splice(from,1);tracks.splice(to,0,item);if(cur===from)cur=to;else if(cur>from&&cur<=to)cur--;else if(cur<from&&cur>=to)cur++;renderPlaylist();status('URUTAN PLAYLIST DIPINDAHKAN');setTimeout(()=>status(''),900)}

function removeTrack(i){if(i<0||i>=tracks.length)return;const wasCurrent=i===cur;const wasPlaying=!music.paused;const [removed]=tracks.splice(i,1);try{if(removed&&removed.url)URL.revokeObjectURL(removed.url)}catch(e){}
  if(!tracks.length){cancelFade(music);music.pause();try{music.currentTime=0}catch(e){}music.removeAttribute('src');music.load();music.__pacURL=null;cur=-1;renderPlaylist();$('musicTime').textContent='00:00 / 00:00';$('musicTc').textContent='TIME -00:00';$('musicTc').classList.remove('on');$('musicSeek').value=0;$('musicSeekCurrent').textContent='00:00';$('musicSeekDuration').textContent='00:00';return}
  if(i<cur)cur--;
  else if(i===cur){cur=Math.min(i,tracks.length-1);cancelFade(music);music.pause();try{music.currentTime=0}catch(e){}music.removeAttribute('src');music.load();music.__pacURL=null;selectTrack(cur,wasPlaying)}
  renderPlaylist();}
function currentTrack(){return cur>=0?tracks[cur]:null}
function selectTrack(i,autoplay){
  const t=tracks[i];if(!t)return;
  cur=i;renderPlaylist();
  cancelFade(music);music.pause();music.removeAttribute('src');music.load();music.__pacURL=t.url;music.src=t.url;music.preload='auto';music.muted=false;music.load();music.volume=targetMusicVolume();
  if(autoplay){ void playNative(music,'Music Player'); }
}
function clearAllMusic(){
  cancelFade(music);music.pause();try{music.currentTime=0}catch(e){}
  tracks.forEach(t=>{try{if(t.url)URL.revokeObjectURL(t.url)}catch(e){}});
  tracks=[];cur=-1;music.removeAttribute('src');music.load();music.__pacURL=null;music.volume=targetMusicVolume();$('musicFiles').value='';renderPlaylist();$('musicTime').textContent='00:00 / 00:00';$('musicTc').textContent='TIME -00:00';$('musicTc').classList.remove('on');$('musicSeek').value=0;$('musicSeekCurrent').textContent='00:00';$('musicSeekDuration').textContent='00:00';status('')
}
$('musicFiles').onchange=e=>{const fs=[...(e.target.files||[])];if(fs.length)addMusicFiles(fs);e.target.value='';};
bindFileDrop($('musicPlayerDropZone'),files=>addMusicFiles(files));
$('clearAllMusic').onclick=async()=>{if(!tracks.length){showPacToast('Playlist sudah kosong.','info','TIDAK ADA MATERI');return}const ok=await pacConfirm({title:'KOSONGKAN PLAYLIST?',message:`Semua ${tracks.length} track akan dihapus dari sesi aktif. Tindakan ini tidak bisa dibatalkan kecuali Anda memiliki file SAVE SESSION.`,confirmText:'KOSONGKAN PLAYLIST',danger:true,icon:'♫'});if(ok){clearAllMusic();showPacToast('Semua track dihapus dari playlist.','success','PLAYLIST DIKOSONGKAN')}};
const noteKey='pac_operator_notes_v2';
const musicNotes=$('musicNotes'),clearNote=$('clearNote');
try{
  const saved=localStorage.getItem(noteKey);
  if(saved)musicNotes.innerHTML=saved;
  else {const legacy=localStorage.getItem('pac_operator_notes_v1');if(legacy)musicNotes.textContent=legacy;}
}catch(e){}
function saveNotes(){try{localStorage.setItem(noteKey,musicNotes.innerHTML)}catch(e){}}
function formatNote(cmd,value=null){musicNotes.focus();try{document.execCommand(cmd,false,value)}catch(e){}saveNotes()}
document.querySelectorAll('.noteToolbar [data-cmd]').forEach(btn=>btn.addEventListener('click',()=>formatNote(btn.dataset.cmd)));
$('noteFontSize').addEventListener('change',e=>formatNote('fontSize',e.target.value));
musicNotes.addEventListener('input',saveNotes);
musicNotes.addEventListener('blur',saveNotes);
clearNote.onclick=async()=>{if(!musicNotes.textContent.trim()){showPacToast('Catatan sudah kosong.','info','TIDAK ADA CATATAN');return}const ok=await pacConfirm({title:'HAPUS CATATAN?',message:'Seluruh catatan/rundown akan dihapus dari aplikasi. Pastikan sudah disalin jika masih diperlukan.',confirmText:'HAPUS CATATAN',danger:true,icon:'✎'});if(!ok)return;musicNotes.innerHTML='';try{localStorage.removeItem(noteKey);localStorage.removeItem('pac_operator_notes_v1')}catch(e){}musicNotes.focus();showPacToast('Catatan berhasil dikosongkan.','success','CATATAN DIHAPUS')};

$('musicOnlyPanel')?.addEventListener('dblclick',e=>{
  if(e.target.closest('button,input,label,.playlist,.notesBlock,.track,.noteToolbar')) return;
  if(!music.src) return;
  if(music.paused){
    if(music.ended)try{music.currentTime=0}catch(err){}
    music.volume=targetMusicVolume();
    void resumeVizAudio(music);
    void playNative(music,'Music Player');
  }else{
    fadeOutMusicPlayer();
  }
});

$('musicPlay').onclick=()=>{if(musicFadeTimer){clearInterval(musicFadeTimer);musicFadeTimer=null;}status('');if(!tracks.length){$('musicFiles').click();return}if(cur<0){selectTrack(0,false);return}if(music.paused){if(music.ended)try{music.currentTime=0}catch(e){}music.volume=targetMusicVolume();void resumeVizAudio(music);void playNative(music,'Music Player')}else music.pause()};
$('musicStop').onclick=()=>{if(musicFadeTimer){clearInterval(musicFadeTimer);musicFadeTimer=null;}cancelFade(music);music.pause();try{music.currentTime=0}catch(e){}music.volume=targetMusicVolume()};
$('next').onclick=()=>{if(tracks.length)selectTrack((cur+1)%tracks.length,true)};
$('prev').onclick=()=>{if(tracks.length)selectTrack((cur-1+tracks.length)%tracks.length,true)};
let shuffleEnabled=false;
$('shuffle').onclick=()=>{shuffleEnabled=!shuffleEnabled;$('shuffle').classList.toggle('active',shuffleEnabled);$('shuffle').setAttribute('aria-pressed',shuffleEnabled?'true':'false')};
$('musicLoop').onclick=()=>{music.loop=!music.loop;$('musicLoop').style.background=music.loop?'#17608a':''};
let musicFadeTimer=null;
function fadeOutMusicPlayer(){
  if(!music || music.paused) return;
  if(musicFadeTimer){clearInterval(musicFadeTimer);musicFadeTimer=null;}
  // Reuse the same requestAnimationFrame-based fade engine as the PADs.
  // It starts from the effective gain (including WebAudio analyser gain),
  // moves monotonically to zero, then pauses and restores the ready volume.
  const duration=Math.max(80,Number(fadeDuration)||1000);
  fadeOut(music,duration,false);
}
$('musicFade').onclick=fadeOutMusicPlayer;
$('musicVol').oninput=e=>{
  const v=Math.max(0,Math.min(1,parseFloat(e.target.value)||0));$('musicVolText').textContent=Math.round(v*100)+'%';
  if(!muted){ensureAnalyzer(music);setMediaGain(music,v*masterGain)}
};
$('musicSeek').oninput=e=>{
  const d=Number.isFinite(music.duration)?music.duration:0;
  if(d>0){const pos=(parseFloat(e.target.value)||0)/1000*d;music.currentTime=pos;updateMusic(true)}
};
music.addEventListener('play',()=>{$('musicPlay').textContent='❚❚ PAUSE'});
music.addEventListener('pause',()=>$('musicPlay').textContent='▶ PLAY');
music.addEventListener('ended',()=>{
  if(music.loop){try{music.currentTime=0}catch(e){};void resumeVizAudio(music);void playNative(music,'Music Player');return;}
  if(!tracks.length)return;
  let nextIndex;
  if(shuffleEnabled&&tracks.length>1){do{nextIndex=Math.floor(Math.random()*tracks.length)}while(nextIndex===cur)}else nextIndex=(cur+1)%tracks.length;
  selectTrack(nextIndex,true);
});
music.addEventListener('error',()=>mediaError('Music Player',music));
function updateMusic(force=false){
  const d=Number.isFinite(music.duration)?music.duration:0,c=music.currentTime||0;
  $('musicTime').textContent=fmt(c)+' / '+fmt(d);$('musicTc').textContent='TIME -'+fmt(Math.max(0,d-c));$('musicTc').classList.toggle('on',!music.paused&&d>0);$('musicSeek').value=d?Math.round(c/d*1000):0;$('musicSeekCurrent').textContent=fmt(c);$('musicSeekDuration').textContent=fmt(d);
  $('musicPlay').textContent=music.paused?'▶ PLAY':'❚❚ PAUSE';
  requestAnimationFrame(updateMusic)
}
requestAnimationFrame(updateMusic);
requestAnimationFrame(renderVisualizers);

function applyVolumes(){pads.forEach((p,i)=>{if(!fadeJobs.has(p.audio)){ensureAnalyzer(p.audio);setMediaGain(p.audio,targetPadVolume(i))}});ensureAnalyzer(music);setMediaGain(music,targetMusicVolume())}
$('master').oninput=e=>{masterGain=parseFloat(e.target.value)||0;$('masterText').textContent=Math.round(masterGain*100)+'%';if(!muted)applyVolumes()};

const FADE_TIME_MIN=1.0;
const FADE_TIME_MAX=10.0;
const FADE_TIME_STEP=0.5;
let masterFadeSeconds=1.0;
fadeDuration=Math.round(masterFadeSeconds*1000);
function setFadeTime(seconds){
  const snapped=Math.round((Number(seconds)||FADE_TIME_MIN)/FADE_TIME_STEP)*FADE_TIME_STEP;
  masterFadeSeconds=Math.max(FADE_TIME_MIN,Math.min(FADE_TIME_MAX,snapped));
  fadeDuration=Math.round(masterFadeSeconds*1000);
  updateFadeText();
}
function updateFadeText(){
  const el=$('masterFadeText');
  if(el) el.textContent=masterFadeSeconds.toFixed(1)+'s';
}
$('fadeMinus').onclick=()=>setFadeTime(masterFadeSeconds-FADE_TIME_STEP);
$('fadePlus').onclick=()=>setFadeTime(masterFadeSeconds+FADE_TIME_STEP);
updateFadeText();
function clearAllPads(){
  if(!pads.length)return;
  pads.forEach((p,i)=>{
    cancelFade(p.audio);
    p.audio.pause();
    try{p.audio.currentTime=0}catch(e){}
    revokeMediaURL(p.audio);
    p.file=null;
    p.audio.removeAttribute('src');
    p.audio.load();
    p.audio.volume=targetPadVolume(i);
    p.loop=false;
    const file=$('file'+i);
    if(file)file.value='';
    const name=$('name'+i);
    if(name)name.textContent=padNames[i];
    const loopBtn=$('loop'+i);
    if(loopBtn)loopBtn.style.background='';
    updatePad(i);
  });
  masterFadeRunning=false;
  $('masterFadeBtn')?.classList.remove('active');
}
$('clearAllPads').onclick=async()=>{const loaded=pads.filter(p=>p&&p.file).length;if(!loaded){showPacToast('Tidak ada materi PAD untuk dihapus.','info','PAD KOSONG');return}const ok=await pacConfirm({title:'KOSONGKAN SEMUA PAD?',message:`${loaded} materi PAD akan dihentikan dan dilepas dari slotnya. Nama slot dan susunan PAD tetap dipertahankan. Tindakan ini tidak bisa dibatalkan kecuali Anda memiliki file SAVE SESSION.`,confirmText:'KOSONGKAN PAD',danger:true,icon:'▦'});if(ok){clearAllPads();showPacToast('Semua materi PAD telah dilepas.','success','PAD DIKOSONGKAN')}};

$('masterFadeBtn').onclick=()=>{
  if(masterFadeRunning)return;
  const active=pads.filter(p=>p&&p.audio&&(!p.audio.paused||fadeJobs.has(p.audio)));
  if(!active.length)return;
  masterFadeRunning=true;
  $('masterFadeBtn').classList.add('active');
  const dur=Math.max(80,Number(fadeDuration)||1000);
  // Take exclusive control of the active pads for this master fade so an
  // older per-pad fade cannot fight the master fade animation.
  active.forEach(p=>cancelFade(p.audio));
  const starts=active.map(p=>getMediaGain(p.audio));
  const t0=performance.now();
  function step(t){
    const q=Math.min(1,(t-t0)/dur);
    active.forEach((p,i)=>{
      const a=p.audio;
      // Fade the actual Web Audio gain used by the V26 audio engine.
      // Do not use HTMLMediaElement.volume here because setMediaGain()
      // keeps that property at 1 when the analyser/gain path is active.
      if(a) setMediaGain(a,starts[i]*(1-q));
      updatePad(pads.indexOf(p));
    });
    if(q<1){
      requestAnimationFrame(step);
      return;
    }
    active.forEach(p=>{
      const a=p.audio;
      if(!a)return;
      cancelFade(a);
      setMediaGain(a,0);
      a.pause();
      try{a.currentTime=0}catch(e){}
      setMediaGain(a,targetPadVolume(pads.indexOf(p)));
      updatePad(pads.indexOf(p));
    });
    masterFadeRunning=false;
    $('masterFadeBtn').classList.remove('active');
  }
  requestAnimationFrame(step);
};
$('stopAll').onclick=()=>{pads.forEach((p,i)=>{cancelFade(p.audio);p.audio.pause();try{p.audio.currentTime=0}catch(e){}});music.pause();try{music.currentTime=0}catch(e){};applyVolumes()};
$('muteAll').onclick=()=>{muted=!muted;applyVolumes();$('muteAll').textContent=muted?'🔊 UNMUTE':'🔇 MUTE';$('muteAll').classList.toggle('muted',muted)};
$('topStopAll').onclick=()=>$('stopAll').click(); $('topMute').onclick=()=>$('muteAll').click();

const playerSkinKey='pac_player_skin_v1';
function applyPlayerSkin(skin){const allowed=['neon','studio','purple','red','gold'];if(!allowed.includes(skin))skin='neon';const panel=document.querySelector('.musicOnlyPanel');if(panel){panel.classList.remove('playerSkin-neon','playerSkin-studio','playerSkin-purple','playerSkin-red','playerSkin-gold');panel.classList.add('playerSkin-'+skin)}document.querySelectorAll('.playerSkinOption').forEach(b=>b.classList.toggle('active',b.dataset.playerSkin===skin));try{localStorage.setItem(playerSkinKey,skin)}catch(e){}}
document.querySelectorAll('.playerSkinOption').forEach(b=>b.onclick=()=>{applyPlayerSkin(b.dataset.playerSkin);status('MUSIC PLAYER SKIN: '+b.querySelector('b').textContent.replace(/^\d+\s*•\s*/,''));setTimeout(()=>status(''),900)});
let savedPlayerSkin='neon';try{savedPlayerSkin=localStorage.getItem(playerSkinKey)||'neon'}catch(e){}applyPlayerSkin(savedPlayerSkin);
const skinKey='pac_skin_v1';
function applySkin(skin){const allowed=['broadcast','midnight','red','green','amber','glassy'];if(!allowed.includes(skin))skin='broadcast';document.body.classList.remove('skin-midnight','skin-red','skin-green','skin-amber','glassy-dashboard');if(skin==='glassy')document.body.classList.add('glassy-dashboard');else if(skin!=='broadcast')document.body.classList.add('skin-'+skin);document.querySelectorAll('.skinOption').forEach(b=>b.classList.toggle('active',b.dataset.skin===skin));try{localStorage.setItem(skinKey,skin)}catch(e){}}
function openSettings(){const m=$('settingsModal');m.classList.add('open');m.setAttribute('aria-hidden','false')}
function closeSettings(){const m=$('settingsModal');m.classList.remove('open');m.setAttribute('aria-hidden','true')}
$('settingsBtn').onclick=openSettings;$('settingsClose').onclick=closeSettings;$('settingsModal').addEventListener('click',e=>{if(e.target.id==='settingsModal')closeSettings()});
// Minimize/close controls stay inside browser security rules. Minimize keeps audio alive.
function pacRestoreApp(){document.body.classList.remove('pac-minimized','pac-view-closed');$('pacClosedScreen').setAttribute('aria-hidden','true');}
function pacMinimizeApp(){closeSettings();document.body.classList.add('pac-minimized');showPacToast('Dashboard diminimalkan. Audio yang sedang berjalan tetap diproses oleh halaman.','info','MINIMIZED');}
function pacCloseAppView(){
  // One click hides the app view without an in-app confirmation dialog.
  // Browsers do not permit scripts to force-close a normal tab/window.
  closeSettings();document.body.classList.remove('pac-minimized');document.body.classList.add('pac-view-closed');$('pacClosedScreen').setAttribute('aria-hidden','false');
}
// Page zoom controls (10% steps, clamped for safe responsive layout).
const pacZoomKey='pac_page_zoom_v1';let pacZoom=100;
try{pacZoom=Math.max(70,Math.min(130,Number(localStorage.getItem(pacZoomKey))||100))}catch(e){}
function pacApplyZoom(){document.documentElement.style.zoom=(pacZoom/100);const label=$('pacZoomLabel');if(label)label.textContent=pacZoom+'%';const out=$('pacZoomOutBtn'),inn=$('pacZoomInBtn');if(out)out.disabled=pacZoom<=70;if(inn)inn.disabled=pacZoom>=130;try{localStorage.setItem(pacZoomKey,String(pacZoom))}catch(e){}}
function pacChangeZoom(delta){pacZoom=Math.max(70,Math.min(130,pacZoom+delta));pacApplyZoom();}
$('pacZoomOutBtn').addEventListener('click',()=>pacChangeZoom(-10));
$('pacZoomInBtn').addEventListener('click',()=>pacChangeZoom(10));pacApplyZoom();
// Maximize toggles browser fullscreen when supported; otherwise uses a full-window layout class.
async function pacToggleMaximize(){
  const isFull=!!document.fullscreenElement;
  if(isFull){try{await document.exitFullscreen()}catch(e){}document.body.classList.remove('pac-fullscreen');$('pacMaximizeBtn').textContent='□';$('pacMaximizeBtn').title='Perbesar jendela';return}
  if(document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();document.body.classList.add('pac-fullscreen');$('pacMaximizeBtn').textContent='❐';$('pacMaximizeBtn').title='Pulihkan ukuran jendela';return}catch(e){}}
  document.body.classList.toggle('pac-fullscreen');const maximized=document.body.classList.contains('pac-fullscreen');$('pacMaximizeBtn').textContent=maximized?'❐':'□';$('pacMaximizeBtn').title=maximized?'Pulihkan ukuran jendela':'Perbesar jendela';showPacToast(maximized?'Mode tampilan penuh diaktifkan.':'Mode tampilan penuh dinonaktifkan.','info','TAMPILAN');
}
$('pacMaximizeBtn').addEventListener('click',pacToggleMaximize);
document.addEventListener('fullscreenchange',()=>{const b=$('pacMaximizeBtn');if(!b)return;const on=!!document.fullscreenElement;document.body.classList.toggle('pac-fullscreen',on);b.textContent=on?'❐':'□';b.title=on?'Pulihkan ukuran jendela':'Perbesar jendela'});
$('pacMinimizeBtn').addEventListener('click',pacMinimizeApp);
$('pacCloseBtn').addEventListener('click',pacCloseAppView);
$('pacRestoreBtn').addEventListener('click',pacRestoreApp);
$('pacMiniCloseBtn').addEventListener('click',pacCloseAppView);
$('pacReopenBtn').addEventListener('click',pacRestoreApp);
$('pacExitAttemptBtn').addEventListener('click',()=>{showPacToast('Silakan tutup tab atau jendela melalui kontrol browser/perangkat.','info','KONTROL BROWSER');});
document.querySelectorAll('.skinOption').forEach(b=>b.onclick=()=>{applySkin(b.dataset.skin);status('SKIN: '+b.querySelector('b').textContent.replace(/^\d+\s*•\s*/,''));setTimeout(()=>status(''),900)});let savedSkin='broadcast';try{savedSkin=localStorage.getItem(skinKey)||'broadcast'}catch(e){}applySkin(savedSkin);
function clock(){const d=new Date();$('clock').innerHTML=d.toLocaleTimeString('id-ID',{hour12:false})+'<small>'+d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})+'</small>'}clock();setInterval(clock,1000);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSettings()});

;
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
;

const vizStyleKey='pac_viz_style_v1';
let vizStyle='bars';try{vizStyle=localStorage.getItem(vizStyleKey)||'bars'}catch(e){} window.pacVizStyle=vizStyle
function setVizStyle(v){
 const ok=['bars','mirror','wave','pulse','matrix']; if(!ok.includes(v))v='bars';
 vizStyle=v; window.pacVizStyle=v; document.querySelectorAll('.vizOption').forEach(b=>b.classList.toggle('active',b.dataset.vizStyle===v));
 try{localStorage.setItem(vizStyleKey,v)}catch(e){}
}
document.querySelectorAll('.vizOption').forEach(b=>b.onclick=()=>setVizStyle(b.dataset.vizStyle));setVizStyle(vizStyle);
const fontKey='pac_font_v1';let savedFont='inter';try{savedFont=localStorage.getItem(fontKey)||'inter'}catch(e){}
function setFont(f){
 const ok=['inter','orbitron','rajdhani','mono','serif'];if(!ok.includes(f))f='inter';
 document.body.classList.remove(...ok.map(x=>'font-'+x));document.body.classList.add('font-'+f);
 document.querySelectorAll('.fontOption').forEach(b=>b.classList.toggle('active',b.dataset.font===f));
 try{localStorage.setItem(fontKey,f)}catch(e){}
}
document.querySelectorAll('.fontOption').forEach(b=>b.onclick=()=>setFont(b.dataset.font));setFont(savedFont);

;

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
