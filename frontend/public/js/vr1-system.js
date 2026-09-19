// ==========================================
// VR1 DIGITAL STUDIO - WEBGL SYSTEM
// "WE ARE ONE" - PRECISION INTERLOCKING REFINEMENT PASS
// ==========================================

class VR1System {
  constructor() {
    this.canvas = document.getElementById('vr1-webgl');
    this.loader = document.getElementById('vr1-loader');
    
    if (!this.canvas || !window.THREE || !window.gsap) return;
    
    // Feature detection for reduced motion
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.brandColor = new THREE.Color("#22C55E");
    this.darkBg = new THREE.Color("#080808");
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;
    this.targetY = 0;
    
    this.initLenis();
    this.initThree();
    this.createGeometry();
    this.initLights();
    this.playLoader();
    this.initScrollTriggers();
    this.bindEvents();
    
    this.animate();
  }

  initLenis() {
    if (this.prefersReducedMotion || !window.Lenis) return;
    
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    const raf = (time) => {
      this.lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.darkBg, 0.012);

    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 18;
    this.camera.position.x = 0;

    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  createGeometry() {
    this.systemGroup = new THREE.Group();
    this.scene.add(this.systemGroup);

    // ==========================================
    // DUAL-INTERLOCKING ARCHITECTURAL GEOMETRY (A + B -> AB)
    // Engineered Complementary Keyway Profiles
    // ==========================================

    const extrudeSettings = {
      depth: 2.4,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.14,
      bevelThickness: 0.14
    };

    // --- STRUCTURE ALPHA (Pylon Alpha with Key Tongue & Lower Slot) ---
    const shapeA = new THREE.Shape();
    shapeA.moveTo(-3.2, -4.5);
    shapeA.lineTo(-0.4, -4.5);
    shapeA.lineTo(-0.4, -3.8); // Lower Recessed Slot Entry
    shapeA.lineTo(-1.2, -3.8); // Lower Recessed Slot Interior
    shapeA.lineTo(-1.2, -2.2);
    shapeA.lineTo(-0.4, -2.2); // Back to inner seam face
    shapeA.lineTo(-0.4, -1.2);
    shapeA.lineTo(0.8, -1.2);  // Central Interlocking Key Tongue
    shapeA.lineTo(0.8, 1.2);
    shapeA.lineTo(-0.4, 1.2);  // Back to inner seam face
    shapeA.lineTo(-0.4, 4.5);
    shapeA.lineTo(-3.2, 4.5);
    shapeA.lineTo(-3.2, 2.0);
    shapeA.lineTo(-2.0, 0.0);  // Outer Architectural Chamfer Cut
    shapeA.lineTo(-3.2, -2.0);
    shapeA.closePath();

    // --- STRUCTURE BETA (Pylon Beta with Key Socket & Lower Tongue) ---
    const shapeB = new THREE.Shape();
    shapeB.moveTo(0.4, -4.5);
    shapeB.lineTo(3.2, -4.5);
    shapeB.lineTo(3.2, -2.0);
    shapeB.lineTo(2.0, 0.0);   // Matching Outer Chamfer Cut
    shapeB.lineTo(3.2, 2.0);
    shapeB.lineTo(3.2, 4.5);
    shapeB.lineTo(0.4, 4.5);
    shapeB.lineTo(0.4, 1.2);
    shapeB.lineTo(-0.8, 1.2);  // Matching Central Key Socket
    shapeB.lineTo(-0.8, -1.2);
    shapeB.lineTo(0.4, -1.2);  // Back to inner seam face
    shapeB.lineTo(0.4, -2.2);
    shapeB.lineTo(-0.4, -2.2); // Lower Interlocking Guide Tongue
    shapeB.lineTo(-0.4, -3.8);
    shapeB.lineTo(0.4, -3.8);  // Back to inner seam face
    shapeB.closePath();

    const geoA = new THREE.ExtrudeGeometry(shapeA, extrudeSettings);
    const geoB = new THREE.ExtrudeGeometry(shapeB, extrudeSettings);

    geoA.center();
    geoB.center();

    // --- REFINED MATERIALS: Matte Dark Titanium & Obsidian Crystal ---
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x202328,
      metalness: 0.82,
      roughness: 0.35,
    });

    const obsidianMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e1013,
      metalness: 0.75,
      roughness: 0.2,
      transmission: 0.3,
      ior: 1.55,
      transparent: true,
      opacity: 0.95
    });

    // --- RESTRAINED SEAM WAVEGUIDE (Internal Energy Core) ---
    const seamGeo = new THREE.BoxGeometry(0.75, 2.5, 2.3);
    this.seamMat = new THREE.MeshBasicMaterial({
      color: this.brandColor,
      transparent: true,
      opacity: 0
    });
    this.seamWaveguide = new THREE.Mesh(seamGeo, this.seamMat);

    // Build Groups
    this.entity1Group = new THREE.Group();
    this.entity2Group = new THREE.Group();

    this.meshA = new THREE.Mesh(geoA, titaniumMat);
    this.meshA.castShadow = true;
    this.meshA.receiveShadow = true;
    this.entity1Group.add(this.meshA);

    this.meshB = new THREE.Mesh(geoB, obsidianMat);
    this.meshB.castShadow = true;
    this.meshB.receiveShadow = true;
    this.entity2Group.add(this.meshB);

    // Initial Hero Positions (TWO distinct forms showcasing keyway details)
    this.entity1Group.position.set(-2.6, 1.0, -0.8);
    this.entity1Group.rotation.set(0.2, -0.3, 0.1);

    this.entity2Group.position.set(2.6, -1.0, 0.8);
    this.entity2Group.rotation.set(-0.18, 0.25, -0.08);

    this.systemGroup.add(this.entity1Group);
    this.systemGroup.add(this.entity2Group);
    this.systemGroup.add(this.seamWaveguide);

    this.updateHeroPosition();
  }

  updateHeroPosition() {
    if (window.innerWidth > 992) {
      this.systemGroup.position.set(6.5, 0, 0);
    } else {
      this.systemGroup.position.set(0, -1, 0);
    }
  }

  initLights() {
    // 1. Ambient Fill Light (Lift dark pitch-black shadows so silhouettes read clearly)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    // 2. Main Studio Key Spotlight
    this.spotLight = new THREE.SpotLight(0xffffff, 4.5);
    this.spotLight.position.set(12, 18, 16);
    this.spotLight.angle = Math.PI / 4;
    this.spotLight.penumbra = 0.7;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 2048;
    this.spotLight.shadow.mapSize.height = 2048;
    this.scene.add(this.spotLight);

    // 3. Directional Soft Fill Light (Highlights left bevels and facets)
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.2);
    fillLight.position.set(-12, 10, 12);
    this.scene.add(fillLight);

    // 4. Directional Back Rim Light (Highlights outer bevel silhouettes against dark background)
    const rimLightBack = new THREE.DirectionalLight(0xf1f5f9, 1.5);
    rimLightBack.position.set(10, -8, -12);
    this.scene.add(rimLightBack);

    // 5. Dynamic Seam Rim Light (Neutral default, turns green on connect/lock)
    this.rimLight = new THREE.PointLight(0xffffff, 1.5, 30);
    this.rimLight.position.set(0, 0, -6);
    this.scene.add(this.rimLight);
  }

  playLoader() {
    if (!this.loader) return;
    
    const tl = gsap.timeline({
      onComplete: () => {
        this.loader.style.display = 'none';
      }
    });

    const dots = this.loader.querySelectorAll('.loader-dot');
    const line = this.loader.querySelector('.loader-line');
    const text = this.loader.querySelector('.loader-text');

    tl.to(dots, { opacity: 1, duration: 0.4, stagger: 0.15 })
      .to(dots, { x: 0, duration: 0.7, ease: "power3.inOut" }, "-=0.1")
      .to(line, { width: 40, opacity: 1, duration: 0.7, ease: "power3.inOut" }, "-=0.7")
      .to(text, { opacity: 1, y: -4, duration: 0.7, ease: "power2.out" })
      .to(this.loader, { opacity: 0, duration: 0.7, delay: 0.2 });
  }

  initScrollTriggers() {
    if (this.prefersReducedMotion || !window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    const badge = document.getElementById('unionStageBadge');
    const heading = document.getElementById('unionStageHeading');
    const desc = document.getElementById('unionStageDesc');
    const finalReveal = document.getElementById('unionFinalReveal');

    const stages = [
      { badge: "01 / TWO", heading: "Two distinct forces.", desc: "Independent perspectives built around a shared standard." },
      { badge: "02 / APPROACH", heading: "Drawing closer.", desc: "Moving toward a common operational frequency." },
      { badge: "03 / ALIGN", heading: "Synchronizing direction.", desc: "Geometry and intent align in exact parallel." },
      { badge: "04 / CONNECT", heading: "Internal activation.", desc: "A shared energy waveguide links the two structures." },
      { badge: "05 / LOCK", heading: "Physical lock.", desc: "Alpha and Beta interlock into a single cohesive monolith." },
      { badge: "06 / ONE", heading: "We Are One.", desc: "VR1 — Digital Growth & Web Studio." }
    ];

    const updateStageUI = (index) => {
      if (index === 5) {
        if (badge) badge.style.opacity = '0';
        if (heading) heading.style.opacity = '0';
        if (desc) desc.style.opacity = '0';
        if (finalReveal) finalReveal.classList.add('active');
      } else {
        if (finalReveal) finalReveal.classList.remove('active');
        if (badge) { badge.style.opacity = '1'; badge.textContent = stages[index].badge; }
        if (heading) { heading.style.opacity = '1'; heading.textContent = stages[index].heading; }
        if (desc) { desc.style.opacity = '1'; desc.textContent = stages[index].desc; }
      }
    };

    // ==========================================
    // SIX-STAGE SIGNATURE MOMENT (WHY VR1)
    // TWO -> APPROACH -> ALIGN -> CONNECT -> LOCK -> ONE
    // ==========================================
    const lockTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#unionSection",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress;
          if (p < 0.18) updateStageUI(0);
          else if (p < 0.38) updateStageUI(1);
          else if (p < 0.58) updateStageUI(2);
          else if (p < 0.72) updateStageUI(3);
          else if (p < 0.88) updateStageUI(4);
          else updateStageUI(5);
        }
      }
    });

    // 1. Move System to Center Screen
    lockTl.to(this.systemGroup.position, { x: 0, y: 0, z: 0, duration: 1.5 }, 0);
    lockTl.to(this.camera.position, { z: 16, duration: 1.5 }, 0);

    // STAGE 1 -> 2: APPROACH (Distance decreases)
    lockTl.to(this.entity1Group.position, { x: -1.8, y: 0.4, z: 0, duration: 1.5 }, 0.5);
    lockTl.to(this.entity2Group.position, { x: 1.8, y: -0.4, z: 0, duration: 1.5 }, 0.5);

    // STAGE 2 -> 3: ALIGN (Rotations reset to 0; Keyway tongue & socket face each other in parallel)
    lockTl.to(this.entity1Group.rotation, { x: 0, y: 0, z: 0, duration: 1.5 }, 1.8);
    lockTl.to(this.entity2Group.rotation, { x: 0, y: 0, z: 0, duration: 1.5 }, 1.8);
    lockTl.to(this.entity1Group.position, { x: -0.75, y: 0, z: 0, duration: 1.5 }, 1.8);
    lockTl.to(this.entity2Group.position, { x: 0.75, y: 0, z: 0, duration: 1.5 }, 1.8);

    // STAGE 3 -> 4: CONNECT (Internal Seam Energy Activates with restrained green pulse)
    lockTl.to(this.seamMat, { opacity: 0.8, duration: 1.0 }, 3.0);
    lockTl.to(this.rimLight.color, { r: 0.13, g: 0.77, b: 0.37, duration: 1.0 }, 3.0);
    lockTl.to(this.rimLight, { intensity: 3.5, duration: 1.0 }, 3.0);

    // STAGE 4 -> 5: LOCK (Physical Keyway Lock with tactile weight snap)
    lockTl.to(this.entity1Group.position, { x: 0, y: 0, z: 0, duration: 1.5, ease: "back.out(1.2)" }, 4.0);
    lockTl.to(this.entity2Group.position, { x: 0, y: 0, z: 0, duration: 1.5, ease: "back.out(1.2)" }, 4.0);

    // STAGE 5 -> 6: ONE (Unified Monolith stabilizes, turns 18° heroically, green settles)
    lockTl.to(this.systemGroup.rotation, { y: Math.PI * 0.1, duration: 1.5 }, 5.2);
    lockTl.to(this.seamMat, { opacity: 0.35, duration: 1.5 }, 5.2); // Calm, stable internal heartbeat

    // ==========================================
    // SERVICES (FLANK BACKGROUND MODULE)
    // ==========================================
    gsap.to(this.systemGroup.position, {
      x: -4.5, z: -6, y: 0,
      scrollTrigger: {
        trigger: "#services",
        start: "top bottom",
        end: "top center",
        scrub: 1
      }
    });

    // ==========================================
    // PROCESS (ARCHITECTURAL TRANSFORMATION)
    // ==========================================
    gsap.to(this.systemGroup.rotation, {
      y: Math.PI * 1.5,
      scrollTrigger: {
        trigger: ".process-section",
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    });

    // ==========================================
    // PROBLEM -> SOLUTION (CONTROLLED FRAGMENTATION & SNAP)
    // ==========================================
    const chaosTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".problem-section",
        start: "top bottom",
        end: "bottom center",
        scrub: 1
      }
    });

    chaosTl.to(this.entity1Group.position, { x: -1.6, y: 1.2, z: 1.8, duration: 1 }, 0);
    chaosTl.to(this.entity2Group.position, { x: 1.6, y: -1.2, z: -1.8, duration: 1 }, 0);
    chaosTl.to(this.seamMat, { opacity: 0.1, duration: 1 }, 0);

    chaosTl.to(this.entity1Group.position, { x: 0, y: 0, z: 0, duration: 1, ease: "power4.out" }, 1);
    chaosTl.to(this.entity2Group.position, { x: 0, y: 0, z: 0, duration: 1, ease: "power4.out" }, 1);
    chaosTl.to(this.seamMat, { opacity: 0.4, duration: 1 }, 1);

    // ==========================================
    // CONTACT (UNIFIED FINAL CORE)
    // ==========================================
    gsap.to(this.systemGroup.position, {
      x: 0, y: 0, z: 2,
      scrollTrigger: {
        trigger: "#contact",
        start: "top bottom",
        end: "bottom bottom",
        scrub: 1
      }
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.updateHeroPosition();
    });

    // Subtle physical mouse parallax
    document.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener("visibilitychange", () => {
      this.isPaused = document.hidden;
    });

    // Service Card Hover Interactions
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(this.seamMat, { opacity: 0.85, duration: 0.3 });
        gsap.to(this.rimLight, { intensity: 3.5, duration: 0.3 });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(this.seamMat, { opacity: 0.3, duration: 0.5 });
        gsap.to(this.rimLight, { intensity: 1.5, duration: 0.5 });
      });
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    if (this.isPaused || this.prefersReducedMotion) return;

    // Very subtle breathing movement
    const time = Date.now() * 0.0006;
    this.systemGroup.position.y += Math.sin(time) * 0.0012;

    // Subtle Mouse Parallax
    this.targetX = this.mouseX * 0.35;
    this.targetY = this.mouseY * 0.35;
    
    this.camera.position.x += (this.targetX - this.camera.position.x) * 0.04;
    this.camera.position.y += (this.targetY - this.camera.position.y) * 0.04;
    this.camera.lookAt(this.scene.position);

    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new VR1System();
});
