// Klid – 3D koule (Three.js): organicky se vlnící jádro se šumem, zářící okraj (fresnel), halo a jemné částice.
// Stavy: idle / thinking / writing / listening – přechody se plynule prolínají.
import * as THREE from '/vendor/three.module.min.js';

const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;

const PRESETS = {
  idle:      { amp: 0.055, speed: 0.2, freq: 1.05, glow: 1.0, hue: 0.0, spin: 0.10, pulse: 0.0 },
  thinking:  { amp: 0.1, speed: 0.6, freq: 1.45,  glow: 1.25, hue: 0.0, spin: 0.55, pulse: 0.0 },
  writing:   { amp: 0.075, speed: 0.42, freq: 1.25,  glow: 1.45, hue: 0.08, spin: 0.25, pulse: 1.0 },
  listening: { amp: 0.12, speed: 0.8,  freq: 1.6,  glow: 1.3, hue: -0.08, spin: 0.3, pulse: 0.6 },
};

export function createOrb(container) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50); camera.position.z = 6.2;

  const u = { uA: { value: new THREE.Color(1.0, 0.42, 0.66) }, uB: { value: new THREE.Color(1.0, 0.72, 0.84) }, uTime: { value: 0 }, uAmp: { value: 0.1 }, uFreq: { value: 1.35 }, uGlow: { value: 1 }, uHue: { value: 0 }, uPulse: { value: 0 } };

  // jádro
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 28), new THREE.ShaderMaterial({
    uniforms: u, transparent: true,
    vertexShader: NOISE + `
      uniform float uTime,uAmp,uFreq,uPulse; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        float n = snoise(normal*uFreq + vec3(uTime*0.6, uTime*0.4, uTime*0.5));
        float n2 = snoise(normal*uFreq*2.3 - vec3(uTime*0.3));
        float beat = uPulse * 0.035 * sin(uTime*9.0);
        float d = uAmp*n + uAmp*0.18*n2 + beat; vD = d;
        vec3 p = position + normal*d;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform float uGlow,uHue,uTime; uniform vec3 uA,uB; varying vec3 vN; varying vec3 vV; varying float vD;
      vec3 hueShift(vec3 c,float h){const vec3 k=vec3(0.57735);float ca=cos(h*6.2831);return c*ca+cross(k,c)*sin(h*6.2831)+k*dot(k,c)*(1.0-ca);}
      void main(){
        float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.4);
        vec3 deep = uA*0.55, mid = uA, hot = mix(uB, vec3(1.0), 0.55);
        float t = clamp(0.64 + vD*3.2 + dot(vN, vec3(-0.3,0.45,0.2))*0.22, 0.0, 1.0);
        vec3 c = mix(deep, mid, t);
        c = mix(c, hot, smoothstep(0.55, 1.0, t) * 0.6);
        c += mix(uB, vec3(1.0), 0.25) * fres * 1.1 * uGlow;
        c += vec3(1.0,0.9,0.75) * pow(fres, 6.0) * 0.5;
        float light = max(dot(vN, normalize(vec3(-0.5,0.7,0.6))), 0.0);
        c += vec3(1.0,0.8,0.6) * pow(light, 14.0) * 0.55;
        c = hueShift(c, uHue);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  scene.add(core);

  // halo (zadní strana, aditivně)
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.75, 40, 40), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uGlow,uHue; uniform vec3 uA,uB; varying vec3 vN; varying vec3 vV;
      void main(){ float i = pow(max(dot(vN, vV), 0.0), 3.2); vec3 c = mix(uA*0.85, uB, i); gl_FragColor = vec4(c, i*0.42*uGlow); }`,
  }));
  scene.add(halo);

  // částice na oběžné dráze
  const N = 180, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 1.55 + Math.random() * 0.9, th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * 0.9;
    pos[i * 3] = r * Math.cos(th) * Math.cos(ph); pos[i * 3 + 1] = r * Math.sin(ph) * 0.8; pos[i * 3 + 2] = r * Math.sin(th) * Math.cos(ph); seed[i] = Math.random();
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dots = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `uniform float uTime; attribute float seed; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; vA = 0.25 + 0.75*abs(sin(uTime*0.8 + seed*40.0)); gl_PointSize = (1.2 + seed*2.2) * (6.0 / -mv.z) * ${Math.min(devicePixelRatio, 2).toFixed(1)}; }`,
    fragmentShader: `uniform vec3 uB; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(mix(uB, vec3(1.0), 0.35), a*vA*0.55); }`,
  }));
  dots.rotation.x = 0.35; scene.add(dots);

  // velikost podle kontejneru
  const resize = () => { const s = container.clientWidth || 1; renderer.setSize(s, s, false); renderer.domElement.style.width = renderer.domElement.style.height = '100%'; camera.aspect = 1; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(container); resize();

  // plynulé přechody mezi stavy
  let target = PRESETS.idle; const cur = { ...PRESETS.idle }; let time = 0, last = performance.now(), running = true, lastDraw = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); loop(); } });
  function loop() {
    if (!running) return;
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
    const k = 1 - Math.pow(0.02, dt);
    for (const key in cur) cur[key] += (target[key] - cur[key]) * k;
    const night = document.body.classList.contains('night') ? 0.55 : 1;
    time += dt * cur.speed * (reduce ? 0.2 : 1) * night;
    u.uTime.value = time * 3; u.uAmp.value = cur.amp; u.uFreq.value = cur.freq; u.uGlow.value = cur.glow * (night < 1 ? 0.8 : 1); u.uHue.value = cur.hue; u.uPulse.value = cur.pulse;
    const breathe = 1 + Math.sin(now / 1000 * (0.9 * night)) * 0.025;
    core.scale.setScalar(breathe); halo.scale.setScalar(breathe * (1 + cur.glow * 0.03));
    core.rotation.y += dt * cur.spin; dots.rotation.y -= dt * (0.05 + cur.spin * 0.4);
    // strop snímků: v klidu ~36 fps, při přemýšlení/psaní 60 – na 120Hz displeji to půlí práci grafiky
    const cap = target === PRESETS.idle ? 1000 / 36 : 1000 / 60;
    if (now - lastDraw >= cap - 1) { lastDraw = now; renderer.render(scene, camera); }
    requestAnimationFrame(loop);
  }
  loop();
  return {
    set(state) { target = PRESETS[state] || PRESETS.idle; },
    color(a, b) { u.uA.value.setRGB(a[0] / 255, a[1] / 255, a[2] / 255); u.uB.value.setRGB(b[0] / 255, b[1] / 255, b[2] / 255); },
    dots(on) { dots.visible = on; },
  };
}
