(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sceneHost = $('scene');
  if (!window.THREE) {
    sceneHost.innerHTML = '<div style="color:white;padding:30px;font:18px sans-serif">3D engine could not load. Please check your internet connection and refresh.</div>';
    return;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071020);
  scene.fog = new THREE.FogExp2(0x071020, 0.012);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 260);
  camera.position.set(0, 5.4, 11.5);
  camera.lookAt(0, 0.7, -12);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  sceneHost.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x9ccfff, 0x121627, 1.45));
  const moon = new THREE.DirectionalLight(0x8abfff, 1.45); moon.position.set(-7, 14, 8); moon.castShadow = true; moon.shadow.mapSize.set(1024,1024); scene.add(moon);
  const pinkLight = new THREE.PointLight(0xff337e, 3, 28); pinkLight.position.set(7, 3, -15); scene.add(pinkLight);
  const cyanLight = new THREE.PointLight(0x36eaff, 3, 30); cyanLight.position.set(-8, 3, -28); scene.add(cyanLight);

  const mat = (color, roughness=.55, metalness=.15, emissive=null) => new THREE.MeshStandardMaterial({color, roughness, metalness, ...(emissive ? {emissive:new THREE.Color(emissive), emissiveIntensity:1.2}: {})});
  const asphalt = mat(0x151d2b,.94), laneMat = mat(0xa9d7e7,.5,.1,0x163949), curbPink = mat(0xff3e86,.45,.25,0x6d092c), curbCyan = mat(0x41eaff,.45,.25,0x064c5c), dark = mat(0x070d17,.7,.4), glass = new THREE.MeshStandardMaterial({color:0x15354b,metalness:.7,roughness:.17,emissive:0x071b2b}), rubber = mat(0x080a0f,.9), alloy = mat(0x9cb3c8,.25,.85), bodyMat = mat(0xe5f3fa,.24,.72), redBody = mat(0xd51f4e,.25,.72), gold = mat(0xffba54,.3,.55,0x452008), lamp = new THREE.MeshBasicMaterial({color:0xbefaff}), tailLamp = new THREE.MeshBasicMaterial({color:0xff164d});

  // Road and ground are real 3D meshes, not a flat racing illustration.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240,280), mat(0x080f1b,.98)); ground.rotation.x=-Math.PI/2; ground.position.set(0,-.13,-75); ground.receiveShadow=true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(13,250), asphalt); road.rotation.x=-Math.PI/2; road.position.set(0,-.08,-91); road.receiveShadow=true; scene.add(road);
  const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(.22,.16,250), curbPink); shoulderL.position.set(-6.55,.02,-91); scene.add(shoulderL);
  const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(.22,.16,250), curbCyan); shoulderR.position.set(6.55,.02,-91); scene.add(shoulderR);
  const dashMeshes=[];
  for(let z=-210;z<25;z+=9){for(const x of [-2.15,2.15]){const d=new THREE.Mesh(new THREE.BoxGeometry(.075,.025,3.8),laneMat);d.position.set(x,.012,z);scene.add(d);dashMeshes.push(d)}}
  // Skyline and street lamps
  const scenery=[];
  const buildingMats=[mat(0x101d34,.85,.3),mat(0x17223d,.8,.35),mat(0x211a37,.8,.3),mat(0x132c3c,.8,.25)];
  function makeBuilding(x,z){const h=THREE.MathUtils.randFloat(5,21),w=THREE.MathUtils.randFloat(2.5,6),d=THREE.MathUtils.randFloat(3,7);const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMats[Math.floor(Math.random()*buildingMats.length)]);b.position.y=h/2-.1;b.castShadow=true;g.add(b);const signMat=Math.random()>.5?curbPink:curbCyan;for(let y=1.1;y<h-1;y+=2.1){const strip=new THREE.Mesh(new THREE.BoxGeometry(.07,.8,d+.025),signMat);strip.position.set((Math.random()-.5)*w*.7,y,0);g.add(strip)}g.position.set(x,0,z);scene.add(g);scenery.push({group:g,kind:'building',span:220+Math.random()*35});}
  for(let side of [-1,1]) for(let i=0;i<22;i++) makeBuilding(side*(10+Math.random()*15),-i*10-5);
  const lampPosts=[];
  function makeLamp(x,z){const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,4.8,7),dark);pole.position.y=2.4;g.add(pole);const arm=new THREE.Mesh(new THREE.BoxGeometry(1.1,.07,.08),dark);arm.position.set(-x*.1,4.7,0);g.add(arm);const bulb=new THREE.Mesh(new THREE.BoxGeometry(.75,.1,.25),lamp);bulb.position.set(-x*.1,4.62,0);g.add(bulb);const glow=new THREE.PointLight(0x7defff,1.1,9);glow.position.set(-x*.1,4.2,0);g.add(glow);g.position.set(x,0,z);scene.add(g);lampPosts.push(g)}
  for(let z=-205;z<15;z+=18){makeLamp(-7.1,z);makeLamp(7.1,z-9)}

  function makeCar(color=0xeaf5ff, player=false){
    const group=new THREE.Group();const carPaint=player?bodyMat:mat(color,.28,.68);const lower= new THREE.Mesh(new THREE.BoxGeometry(1.65,.38,3.25),player?bodyMat:mat(color,.28,.68));lower.position.y=.62;lower.castShadow=true;group.add(lower);
    const hood=new THREE.Mesh(new THREE.BoxGeometry(1.53,.22,1.15),carPaint);hood.position.set(0,.82,-.93);hood.castShadow=true;group.add(hood);
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.15,.53,1.45),glass);cabin.position.set(0,1.03,.1);cabin.castShadow=true;group.add(cabin);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(.92,.12,.84),carPaint);roof.position.set(0,1.34,.1);group.add(roof);
    const rear=new THREE.Mesh(new THREE.BoxGeometry(1.5,.2,.72),carPaint);rear.position.set(0,.82,1.15);group.add(rear);
    const frontBumper=new THREE.Mesh(new THREE.BoxGeometry(1.62,.17,.2),dark);frontBumper.position.set(0,.48,-1.62);group.add(frontBumper);
    for(const x of [-.56,.56]){const head=new THREE.Mesh(new THREE.BoxGeometry(.34,.13,.08),lamp);head.position.set(x,.73,-1.61);group.add(head);const tail=new THREE.Mesh(new THREE.BoxGeometry(.38,.13,.08),tailLamp);tail.position.set(x,.73,1.62);group.add(tail)}
    const wheels=[];for(const x of [-.88,.88])for(const z of [-1.05,1.05]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.22,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.4,z);wheel.castShadow=true;group.add(wheel);const rim=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.235,12),alloy);rim.rotation.z=Math.PI/2;rim.position.copy(wheel.position);group.add(rim);wheels.push(wheel)}
    if(player){const under=new THREE.Mesh(new THREE.BoxGeometry(1.9,.045,2.5),new THREE.MeshBasicMaterial({color:0x28dff7,transparent:true,opacity:.72}));under.position.y=.16;group.add(under);const spoiler=new THREE.Group();const wing=new THREE.Mesh(new THREE.BoxGeometry(1.45,.09,.28),carPaint);wing.position.y=1.23;wing.position.z=1.36;spoiler.add(wing);for(const x of [-.48,.48]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.08,.3,.08),alloy);leg.position.set(x,1.08,1.35);spoiler.add(leg)}group.add(spoiler);const flames=[];for(const x of [-.42,.42]){const f=new THREE.Mesh(new THREE.ConeGeometry(.13,.85,8),new THREE.MeshBasicMaterial({color:0x41eaff,transparent:true,opacity:.8}));f.rotation.x=-Math.PI/2;f.position.set(x,.52,2.03);f.visible=false;group.add(f);flames.push(f)}group.userData.flames=flames}
    group.userData.wheels=wheels;return group;
  }
  const player=makeCar(0xffffff,true);player.position.set(0,0,3.2);scene.add(player);
  const traffic=[];const trafficColors=[0xff477e,0x39c6ff,0xffbd57,0x9a82ff,0xe8f3ff,0x4dffbb];
  function spawnTraffic(z=-150){const lane=[-4.25,-2.1,2.1,4.25][Math.floor(Math.random()*4)];const car=makeCar(trafficColors[Math.floor(Math.random()*trafficColors.length)]);car.scale.setScalar(THREE.MathUtils.randFloat(.9,1.03));car.position.set(lane,0,z);car.rotation.y=(Math.random()-.5)*.06;scene.add(car);traffic.push({mesh:car,speed:THREE.MathUtils.randFloat(3,9),lane});}
  const pickups=[];
  function spawnPickup(z=-145){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.09,8,20),curbCyan);ring.rotation.x=Math.PI/2;g.add(ring);const core=new THREE.Mesh(new THREE.OctahedronGeometry(.25),lamp);g.add(core);g.position.set([-4.2,-2.1,2.1,4.2][Math.floor(Math.random()*4)],1.2,z);scene.add(g);pickups.push(g)}

  let running=false,paused=false,gameEnded=false,keys={},steerTouch=0,nitroTouch=false,speed=0,distance=0,score=0,nitro=100,spawnTimer=0,pickupTimer=7,warningTimer=0,shake=0,last=performance.now(),soundOn=true,audioCtx=null,best=Number(localStorage.getItem('apexDriftBest')||0);
  $('best-score').textContent=String(best).padStart(6,'0');
  function beep(freq=220,duration=.07,type='sine',vol=.025){if(!soundOn)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration)}catch(e){}}
  function show(id,on){$(id).classList.toggle('hidden',!on)}
  function resetGame(){traffic.forEach(o=>scene.remove(o.mesh));traffic.length=0;pickups.forEach(o=>scene.remove(o));pickups.length=0;speed=0;distance=0;score=0;nitro=100;spawnTimer=1.2;pickupTimer=5;warningTimer=0;shake=0;player.position.set(0,0,3.2);player.rotation.set(0,0,0);camera.position.set(0,5.4,11.5);keys={};$('distance').textContent='0000';$('score').textContent='000000';$('speed').textContent='0';$('nitro-fill').style.width='100%';show('menu',false);show('pause',false);show('gameover',false);show('hud',true);running=true;paused=false;gameEnded=false;last=performance.now();beep(330,.14,'triangle');}
  function endGame(){running=false;gameEnded=true;show('hud',false);$('final-distance').textContent=Math.floor(distance)+' M';$('final-score').textContent=String(score).padStart(6,'0');if(score>best){best=score;localStorage.setItem('apexDriftBest',String(best));$('best-score').textContent=String(best).padStart(6,'0')}show('gameover',true);beep(95,.45,'sawtooth',.05)}
  function pauseGame(){if(!running||gameEnded)return;paused=!paused;show('pause',paused);last=performance.now();}
  $('start-btn').addEventListener('click',resetGame);$('retry-btn').addEventListener('click',resetGame);$('resume-btn').addEventListener('click',pauseGame);$('quit-btn').addEventListener('click',()=>{running=false;paused=false;show('pause',false);show('hud',false);show('menu',true)});$('garage-btn').addEventListener('click',()=>{show('gameover',false);show('menu',true)});
  $('sound-btn').addEventListener('click',()=>{soundOn=!soundOn;$('sound-btn').innerHTML=soundOn?'♪ <span>SOUND ON</span>':'♪ <span>SOUND OFF</span>';if(soundOn)beep(520,.07)});
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;if(k==='p'||k==='escape')pauseGame();if(k==='enter'&&(!running||gameEnded))resetGame();});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
  function bindTouch(id,down,up){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);down()});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();up()}))}
  bindTouch('left-touch',()=>steerTouch=-1,()=>{if(steerTouch===-1)steerTouch=0});bindTouch('right-touch',()=>steerTouch=1,()=>{if(steerTouch===1)steerTouch=0});bindTouch('nitro-touch',()=>nitroTouch=true,()=>nitroTouch=false);

  let carX=0,steer=0;
  function update(dt){if(!running||paused)return;dt=Math.min(dt,.035);
    const accelerating=keys.arrowup||keys.w,braking=keys.arrowdown||keys.s,boost=(keys.shift||nitroTouch)&&nitro>0;
    const target=accelerating?31:braking?8:22;speed=THREE.MathUtils.damp(speed,target+(boost?13:0),accelerating?1.9:1.2,dt);if(boost){nitro=Math.max(0,nitro-30*dt);player.userData.flames.forEach(f=>f.visible=true);if(Math.random()<dt*9)beep(95+Math.random()*35,.04,'sawtooth',.009)}else{nitro=Math.min(100,nitro+10*dt);player.userData.flames.forEach(f=>f.visible=false)}
    const steerInput=((keys.arrowright||keys.d)?1:0)-((keys.arrowleft||keys.a)?1:0)+steerTouch;steer=THREE.MathUtils.damp(steer,Math.max(-1,Math.min(1,steerInput)),8,dt);carX+=steer*dt*(4.2+speed*.12);carX=THREE.MathUtils.clamp(carX,-5.05,5.05);player.position.x=THREE.MathUtils.damp(player.position.x,carX,10,dt);player.rotation.z=THREE.MathUtils.damp(player.rotation.z,-steer*.13,6,dt);player.rotation.y=THREE.MathUtils.damp(player.rotation.y,-steer*.07,5,dt);
    const travel=speed*dt;distance+=travel*1.6;score+=Math.floor(travel*2);$('distance').textContent=String(Math.floor(distance)).padStart(4,'0');$('score').textContent=String(score).padStart(6,'0');$('speed').textContent=String(Math.round(speed*6.2));$('nitro-fill').style.width=nitro+'%';
    dashMeshes.forEach(d=>{d.position.z+=travel;if(d.position.z>18)d.position.z-=234});scenery.forEach(s=>{s.group.position.z+=travel;if(s.group.position.z>22)s.group.position.z-=s.span});lampPosts.forEach(l=>{l.position.z+=travel;if(l.position.z>17)l.position.z-=225});
    spawnTimer-=dt;if(spawnTimer<=0){spawnTraffic(-150-Math.random()*35);if(Math.random()<.2)spawnTraffic(-183-Math.random()*12);spawnTimer=THREE.MathUtils.randFloat(1.15,2.05)*Math.max(.62,1-speed/95)}
    pickupTimer-=dt;if(pickupTimer<=0){spawnPickup(-160);pickupTimer=THREE.MathUtils.randFloat(8,13)}
    for(let i=traffic.length-1;i>=0;i--){const o=traffic[i];o.mesh.position.z+=travel-o.speed*dt*.36;o.mesh.userData.wheels.forEach(w=>w.rotation.x+=dt*speed);if(o.mesh.position.z>16){scene.remove(o.mesh);traffic.splice(i,1);score+=100;continue}const dz=Math.abs(o.mesh.position.z-player.position.z),dx=Math.abs(o.mesh.position.x-player.position.x);if(dz<2.05&&dx<1.48){scene.remove(o.mesh);traffic.splice(i,1);speed*=.46;shake=.55;warningTimer=1.4;score=Math.max(0,score-120);beep(70,.24,'square',.06);}}
    for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.position.z+=travel;p.rotation.y+=dt*1.6;p.children[0].rotation.z+=dt*1.8;if(p.position.z>15){scene.remove(p);pickups.splice(i,1);continue}if(Math.abs(p.position.z-player.position.z)<1.8&&Math.abs(p.position.x-player.position.x)<1.35){scene.remove(p);pickups.splice(i,1);nitro=Math.min(100,nitro+35);score+=250;beep(660,.12,'sine',.04);}}
    if(Math.abs(carX)>4.85){speed=Math.max(9,speed-18*dt);warningTimer=Math.max(warningTimer,.4)}
    warningTimer=Math.max(0,warningTimer-dt);show('warning',warningTimer>0);if(shake>0){shake=Math.max(0,shake-dt);camera.position.x=(Math.random()-.5)*shake*.7;camera.position.y=5.4+(Math.random()-.5)*shake*.5}else camera.position.x=THREE.MathUtils.damp(camera.position.x,player.position.x*.24,2.5,dt);
    camera.position.z=THREE.MathUtils.damp(camera.position.z,11.5+(boost?-1.0:0),2,dt);camera.lookAt(player.position.x*.38,.8,-12);player.userData.wheels.forEach(w=>w.rotation.x+=dt*speed*1.4);
    pinkLight.position.z=-15+Math.sin(performance.now()*.0005)*7;cyanLight.position.z=-28+Math.cos(performance.now()*.0004)*8;
  }
  function render(now){requestAnimationFrame(render);const dt=(now-last)/1000;last=now;update(dt);renderer.render(scene,camera)}
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7))});
  // Gentle idle motion while the garage screen is open.
  function idle(){if(!running){player.position.y=.025*Math.sin(performance.now()*.0015);player.rotation.y=.025*Math.sin(performance.now()*.0008)}requestAnimationFrame(idle)}idle();requestAnimationFrame(render);
})();
