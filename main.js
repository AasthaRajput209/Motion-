/* ==========================================================================
   MOTION — Interactive 3D WebGL, Audio & Animation Script
   Powered by Three.js (GLTF Loader) and GSAP (ScrollTrigger)
   ========================================================================== */

// Global Variables
let scene, camera, renderer;
let mainMesh; // Centerpiece garment Group (Torso, sleeves, collar, stitches)
let galleryMeshes = []; // Array of 4 gallery garment Groups
let activeGalleryItem = null; // Currently clicked/zoomed item
let isGalleryZoomed = false;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Audio context and oscillators
let audioCtx = null;
let osc, filter, gainNode;

// Light Coordinates
let pointLight;
let directionalLight;

// Ambient Museum Dust particles
let dustParticles;
const particleCount = 200;

// Background Fabric Clouds Sculptures
let cloudSculptures = [];

// Exploded Shirt state tracker (GSAP will animate this value)
let shirtExplode = { value: 0 };
let mainMeshOpacity = { value: 1.0 };
let driftIntensity = { value: 1.0 }; // Starts at 1.0 in gallery, animates to 0 in final section

// Lighting Environments state tracker
let activeLightState = 0; // 0 = Morning, 1 = Studio, 2 = Night
const lightEnvironments = [
    {
        name: "Telemetry Amber",
        dirColor: new THREE.Color(0xffb03a), // glowing amber
        pointColor: new THREE.Color(0xffa500),
        ambient: 0.18
    },
    {
        name: "Tactical Red",
        dirColor: new THREE.Color(0xff3b30), // deep hazard red
        pointColor: new THREE.Color(0xcc1100),
        ambient: 0.12
    },
    {
        name: "Cyan Blueprint",
        dirColor: new THREE.Color(0x00f3ff), // cyber blueprint cyan
        pointColor: new THREE.Color(0x00a8cc),
        ambient: 0.15
    }
];

// Mouse coordinates for parallax & raycasting
const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();
let cameraDrift = { x: 0, y: 0 };

// Clock for time-based animations
const clock = new THREE.Clock();

// Garments Metadata mapping to loaded GLTF files
const garmentsData = [
    {
        id: 0,
        title: "The Balenciaga Hoodie",
        num: "01",
        desc: "An oversized luxury silhouette featuring double-lined weight, a spacious architectural hood, and a signature heavy drape.",
        material: "100% Terry Cotton",
        origin: "Paris Atelier",
        modelPath: "assets/balenciaga_hoodie.glb",
        scale: [1.0, 1.0, 1.0],
        galPos: [-1.8, 0.2, -0.5]
    },
    {
        id: 1,
        title: "The Panel Sports Hoodie",
        num: "02",
        desc: "A signature double-breasted colorblock hoodie made from heavyweight loopback cotton. Designed with raw seams and structural panel details.",
        material: "Organic Loopback Cotton",
        origin: "Studio Hand-Stitched",
        modelPath: "assets/green_and_white_hoodie.glb",
        scale: [1.0, 1.0, 1.0],
        galPos: [-0.6, 0.2, -0.5]
    },
    {
        id: 2,
        title: "The Flame Print Hoodie",
        num: "03",
        desc: "A heavy-weight cybernetic street essential featuring manual flame screenprints, ribbed cuffs, and oversized technical hood.",
        material: "80% Cotton, 20% Polyester",
        origin: "Tokyo Workshop",
        modelPath: "assets/classic_black_flame_hoodie.glb",
        scale: [1.0, 1.0, 1.0],
        galPos: [0.6, 0.2, -0.5]
    },
    {
        id: 3,
        title: "The Muscle Hoodie",
        num: "04",
        desc: "A structural sleeveless gym silhouette with dropped armholes, featuring a lightweight, breathable build for dynamic movement.",
        material: "100% Giza Cotton",
        origin: "Milan Workshop",
        modelPath: "assets/muscle_hoodie.glb",
        scale: [1.0, 1.0, 1.0],
        galPos: [1.8, 0.2, -0.5]
    }
];

// Initialize application on load
window.addEventListener('DOMContentLoaded', init);

function init() {
    setupThree();
    loadAssets();
    setupEvents();
    startLightingCycle();
}

// Set opacity of all child materials in a Group hierarchy (safe for nested GLTFs)
function setGroupOpacity(group, val) {
    if (!group) return;
    
    // If we cached parts previously
    if (group.userData && group.userData.parts) {
        group.userData.parts.forEach(part => {
            if (part.material) {
                part.material.opacity = val;
            }
        });
    } else {
        group.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.opacity = val;
            }
        });
    }
}

// Set up Three.js scene, camera, and renderer
function setupThree() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.15); // Deep Obsidian Fog

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 4.5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Light setups
    pointLight = new THREE.PointLight(0xffb03a, 0, 10); // Amber Point Light
    scene.add(pointLight);

    directionalLight = new THREE.DirectionalLight(0xffb03a, 1.6); // Amber Directional Key Light
    directionalLight.position.set(2, 4, 5);
    scene.add(directionalLight);

    // Hemisphere Fill Light to prevent dark side model silhouetting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111115, 0.7);
    scene.add(hemiLight);

    // Setup dust particles
    const particleGeometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.015,
        color: 0xffb03a, // Glowing Amber data-dust particles
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    dustParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(dustParticles);

    // Setup Abstract background fabric clouds sculptures
    const cloudGeom = new THREE.IcosahedronGeometry(2.5, 3);
    const cloudMat = new THREE.MeshPhysicalMaterial({
        color: 0x141416,
        roughness: 0.95,
        metalness: 0.1,
        transmission: 0.15,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 2; i++) {
        const cloud = new THREE.Mesh(cloudGeom.clone(), cloudMat.clone());
        cloud.position.set((i === 0 ? -4.5 : 4.5), (i === 0 ? 1.5 : -1.5), -5.0);
        scene.add(cloud);
        cloudSculptures.push(cloud);
    }
}

// Load real 3D GLTF/GLB assets and manage loader screen
function loadAssets() {
    const manager = new THREE.LoadingManager();
    const loaderBar = document.querySelector('.loader-bar');
    
    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        loaderBar.style.width = progress + '%';
    };

    manager.onLoad = function () {
        // Temporarily make all gallery meshes visible for shader compilation
        galleryMeshes.forEach(mesh => mesh.visible = true);
        if (mainMesh) mainMesh.visible = true;

        // Pre-compile shaders and geometries to GPU to completely avoid scroll stutters
        renderer.compile(scene, camera);
        
        // Restore correct visibility states (gallery meshes start invisible on load)
        galleryMeshes.forEach(mesh => mesh.visible = false);
        if (mainMesh) mainMesh.visible = true;

        setTimeout(() => {
            gsap.to('#loader', {
                opacity: 0,
                duration: 1.2,
                ease: 'power3.inOut',
                onComplete: () => {
                    document.getElementById('loader').style.visibility = 'hidden';
                    triggerEnterAnimation();
                }
            });
        }, 600);
    };

    const gltfLoader = new THREE.GLTFLoader(manager);
    
    garmentsData.forEach((data, index) => {
        gltfLoader.load(data.modelPath, (gltf) => {
            const modelScene = gltf.scene;

            // Calculate scale factor to normalize sizes programmatically
            const box = new THREE.Box3().setFromObject(modelScene);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 1.6; // Uniform max dimension for all models
            const scaleFactor = (targetSize / (maxDim || 1)) * data.scale[0];

            // Center geometry bounding box
            const center = new THREE.Vector3();
            box.getCenter(center);
            modelScene.position.sub(center); // center model geometry

            // Create parent pivot Group
            const pivotGroup = new THREE.Group();
            pivotGroup.add(modelScene);
            
            // Apply normalized scale
            pivotGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
            pivotGroup.userData = data;

            // Cache child meshes and their original transforms for exploded view calculations
            const parts = [];
            modelScene.traverse(child => {
                // Inconsistent model cleanup: hide mannequin bodies, legs, and shoes to keep styles identical (floating clothes only)
                const nameLower = (child.name || "").toLowerCase();
                if (nameLower.includes("body") || nameLower.includes("shoes") || nameLower.includes("mannequin")) {
                    child.visible = false;
                    return; // skip adding to parts list
                }

                if (child.isMesh) {
                    child.userData.initPos = child.position.clone();
                    child.userData.initRot = child.rotation.clone();
                    
                    // Enable transparent controls for overlay fade actions
                    if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = (index === 0) ? 1.0 : 0.0;
                        child.material.roughness = 0.85;
                        child.material.metalness = 0.1;
                        child.material.depthWrite = true;
                        
                        // Enable custom double sided rendering for collars/hoods
                        child.material.side = THREE.DoubleSide;
                    }
                    parts.push(child);
                }
            });
            pivotGroup.userData.parts = parts;

            if (index === 0) {
                mainMesh = pivotGroup;
                scene.add(mainMesh);
            }

            // Create exhibition copy for the gallery overlay
            const galGroup = pivotGroup.clone();
            galGroup.userData = data;
            
            // Re-cache parts for cloned group to ensure independent material instances
            const galParts = [];
            galGroup.traverse(child => {
                // Inconsistent model cleanup: hide mannequin bodies, legs, and shoes in gallery clones
                const nameLower = (child.name || "").toLowerCase();
                if (nameLower.includes("body") || nameLower.includes("shoes") || nameLower.includes("mannequin")) {
                    child.visible = false;
                    return; // skip
                }

                if (child.isMesh) {
                    child.userData.initPos = child.position.clone();
                    child.userData.initRot = child.rotation.clone();
                    child.material = child.material.clone();
                    child.material.opacity = 0.0; // starts hidden in gallery overlay
                    galParts.push(child);
                }
            });
            galGroup.userData.parts = galParts;
            
            // Set base position for GSAP coordinates control
            galGroup.userData.basePos = new THREE.Vector3(data.galPos[0], data.galPos[1], data.galPos[2]);
            galGroup.position.copy(galGroup.userData.basePos);
            galGroup.visible = false; // Starts invisible to prevent overlapping on hero page
            scene.add(galGroup);
            galleryMeshes.push(galGroup);
        });
    }, undefined, (error) => {
        console.error("An error occurred loading the GLB file: ", error);
    });
}

// Start ambient audio drone procedurally
function startAmbientSound() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 55; // low A drone

        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 160;
        filter.Q.value = 1.5;

        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 3.0);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(0);

        // LFO to create slow floating filter sweeps
        let lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; 
        let lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 35;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(0);
    } catch(e) {
        console.warn("Web Audio API not supported or blocked");
    }
}

// Fade in first page elements
function triggerEnterAnimation() {
    setGroupOpacity(mainMesh, 1.0);
    gsap.to('.hero-statement', { opacity: 1, duration: 2.0, delay: 0.5, ease: 'power2.out' });
    gsap.to('.hero-cta-btn', { opacity: 1, duration: 1.5, delay: 1.0, ease: 'power2.out' });
    setupScrollTriggerAnimations();
}

// Bind scrolling behaviors with GSAP ScrollTrigger
function setupScrollTriggerAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Coordinated Timeline mapping WebGL properties to scroll coordinates
    const globalTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#scroll-container",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.2,
            onUpdate: (self) => {
                const p = self.progress;
                
                // Continuous Visibility Toggle (completely immune to fast/reverse scrolling)
                if (p < 0.51) {
                    if (mainMesh) mainMesh.visible = true;
                    galleryMeshes.forEach(mesh => {
                        if (mesh.visible) mesh.visible = false;
                    });
                } else {
                    if (mainMesh) mainMesh.visible = false;
                    if (!isGalleryZoomed) {
                        galleryMeshes.forEach(mesh => {
                            if (!mesh.visible) mesh.visible = true;
                        });
                    }
                }

                // Auto-reset active gallery zoom if scrolling away from gallery section
                if (p < 0.48 || p > 0.85) {
                    if (isGalleryZoomed) {
                        resetGalleryZoom();
                    }
                }
            }
        }
    });

    // --- SCENE 1 TO 2: HERO TO HOTSPOTS SCAN ---
    gsap.set([".detail-hotspot", ".radar-dot"], { opacity: 0 });
    gsap.set(".radar-dot", { scale: 0 });

    // Initial Zoom in Hero
    globalTimeline.to(camera.position, {
        x: 0,
        y: 0,
        z: 2.6,
        ease: 'none'
    }, 0);

    // Hotspot 1: Fabric detail zoom
    globalTimeline.to(camera.position, {
        x: 0.22,
        y: 0.26,
        z: 1.45,
        ease: 'power1.inOut'
    }, 0.08);

    globalTimeline.to(mainMesh.rotation, {
        y: 0.85,
        ease: 'power1.inOut'
    }, 0.08);

    globalTimeline.to("#hotspot-1", { opacity: 1, y: 0, ease: 'power2.out' }, 0.08);
    globalTimeline.to("#radar-1", { opacity: 1, scale: 1, ease: 'power2.out' }, 0.08);

    // Fade out Hotspot 1
    globalTimeline.to("#hotspot-1", { opacity: 0, y: -10, ease: 'power2.in' }, 0.14);
    globalTimeline.to("#radar-1", { opacity: 0, scale: 0, ease: 'power2.in' }, 0.14);


    // Hotspot 2: Stitching detail zoom & rotate sleeves out (unfold sleeve discovery)
    globalTimeline.to(camera.position, {
        x: -0.25,
        y: 0.0,
        z: 1.35,
        ease: 'power1.inOut'
    }, 0.17);

    globalTimeline.to(mainMesh.rotation, {
        y: 0.45,
        ease: 'power1.inOut'
    }, 0.17);

    // Rotate sleeves slightly out during stitching scan (gently unfolds)
    globalTimeline.to(shirtExplode, {
        value: 0.2,
        ease: 'power1.inOut'
    }, 0.17);

    globalTimeline.to("#hotspot-2", { opacity: 1, y: 0, ease: 'power2.out' }, 0.17);
    globalTimeline.to("#radar-2", { opacity: 1, scale: 1, ease: 'power2.out' }, 0.17);

    // Fade out Hotspot 2
    globalTimeline.to("#hotspot-2", { opacity: 0, y: -10, ease: 'power2.in' }, 0.23);
    globalTimeline.to("#radar-2", { opacity: 0, scale: 0, ease: 'power2.in' }, 0.23);


    // Hotspot 3: Silhouette cut zoom & lift collar
    globalTimeline.to(camera.position, {
        x: 0.2,
        y: -0.38,
        z: 1.3,
        ease: 'power1.inOut'
    }, 0.26);

    globalTimeline.to(mainMesh.rotation, {
        y: 1.1,
        ease: 'power1.inOut'
    }, 0.26);

    globalTimeline.to("#hotspot-3", { opacity: 1, y: 0, ease: 'power2.out' }, 0.26);
    globalTimeline.to("#radar-3", { opacity: 1, scale: 1, ease: 'power2.out' }, 0.26);

    // Fade out Hotspot 3
    globalTimeline.to("#hotspot-3", { opacity: 0, y: -10, ease: 'power2.in' }, 0.32);
    globalTimeline.to("#radar-3", { opacity: 0, scale: 0, ease: 'power2.in' }, 0.32);


    // --- SCENE 3: BEHIND THE DESIGN (EXPLODED T-SHIRT STUDY) ---
    // Camera zooms close and goes through weave at 0.35 -> 0.42
    // We increase shirt explosion state value to 1.0 (explodes torso, sleeves, and collar apart)
    globalTimeline.to(shirtExplode, {
        value: 1.0,
        duration: 0.1,
        ease: 'power2.out'
    }, 0.35);

    globalTimeline.to(camera.position, {
        x: 0,
        y: 0,
        z: 3.2,
        ease: 'power1.inOut'
    }, 0.35);

    globalTimeline.to(mainMesh.position, {
        x: -0.9,
        y: 0.1,
        z: -0.3,
        ease: 'power1.inOut'
    }, 0.35);

    globalTimeline.to(mainMesh.rotation, {
        y: -0.5,
        ease: 'power1.inOut'
    }, 0.35);


    // --- SCENE 3 TO 4: BEHIND TO INTERACTIVE GALLERY ---
    // Fade out centerpiece Group completely
    globalTimeline.to(mainMeshOpacity, {
        value: 0,
        ease: 'none'
    }, 0.5);

    globalTimeline.to(mainMesh.position, {
        y: -3,
        ease: 'none'
    }, 0.5);

    // Fade in all 4 gallery meshes
    galleryMeshes.forEach((mesh, index) => {
        globalTimeline.to(meshOpacityObject(mesh), {
            value: 1.0,
            ease: 'none'
        }, 0.52);
    });


    // --- SCENE 4 TO 6: GALLERY TO FINAL ---
    const finalXCoords = [-1.8, -0.6, 0.6, 1.8];
    galleryMeshes.forEach((mesh, index) => {
        globalTimeline.to(mesh.userData.basePos, {
            x: finalXCoords[index],
            y: 0.2,
            z: -0.5,
            ease: 'none'
        }, 0.78);

        globalTimeline.to(mesh.rotation, {
            x: 0,
            y: 0,
            z: 0,
            ease: 'none'
        }, 0.78);
    });

    // Fade out drift intensity as garments align in final archive grid
    globalTimeline.to(driftIntensity, {
        value: 0.0,
        ease: 'none'
    }, 0.78);

    // Zoom out camera for final neat archive composition
    globalTimeline.to(camera.position, {
        z: 3.8,
        x: 0,
        y: 0,
        ease: 'none'
    }, 0.78);


    /* ----------------------------------------------------------------------
       HTML Overlays triggers
       ---------------------------------------------------------------------- */
    
    // Behind the Design cards floating parallax offsets using optimized ScrollTrigger
    gsap.utils.toArray('.float-element').forEach(el => {
        const speed = parseFloat(el.getAttribute('data-speed')) * 220; // translate range
        gsap.to(el, {
            y: speed,
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    });

    // Brand Philosophy word highlighter
    const words = document.querySelectorAll('.word-trigger');
    words.forEach((word, idx) => {
        ScrollTrigger.create({
            trigger: word,
            start: "top 75%",
            end: "bottom 40%",
            onEnter: () => word.classList.add('active'),
            onLeave: () => word.classList.remove('active'),
            onEnterBack: () => word.classList.add('active'),
            onLeaveBack: () => word.classList.remove('active')
        });
    });
}

// Helper object to animate opacity of a group in GSAP
function meshOpacityObject(mesh) {
    const obj = {
        get value() {
            if (mesh.userData && mesh.userData.parts && mesh.userData.parts[0] && mesh.userData.parts[0].material) {
                return mesh.userData.parts[0].material.opacity;
            }
            return 0;
        },
        set value(val) {
            setGroupOpacity(mesh, val);
        }
    };
    return obj;
}

// Lighting environment cycle controller (loops Morning, Studio, Night every 20 seconds)
function startLightingCycle() {
    setInterval(() => {
        activeLightState = (activeLightState + 1) % 3;
        const env = lightEnvironments[activeLightState];
        
        // Dynamic lighting colors transition smoothly over 2.5 seconds
        if (directionalLight) {
            gsap.to(directionalLight.color, {
                r: env.dirColor.r,
                g: env.dirColor.g,
                b: env.dirColor.b,
                duration: 2.5
            });
        }
        if (pointLight) {
            gsap.to(pointLight.color, {
                r: env.pointColor.r,
                g: env.pointColor.g,
                b: env.pointColor.b,
                duration: 2.5
            });
        }

        // Slow ambient fog colors shift
        if (scene && scene.fog) {
            gsap.to(scene.fog, {
                density: env.ambient,
                duration: 2.5
            });
        }

    }, 20000);
}

// Setup event listeners for mouse interactions
function setupEvents() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    // Audio context start trigger on first interaction
    window.addEventListener('scroll', startAmbientSound, { once: true });
    window.addEventListener('click', startAmbientSound, { once: true });

    // Close button click on active card overlay
    document.querySelector('.gallery-close').addEventListener('click', (e) => {
        e.stopPropagation();
        resetGalleryZoom();
    });

    // Wire product cards clicks to 3D focus actions
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(card.getAttribute('data-id'));
            const mesh = galleryMeshes.find(m => m.userData.id === id);
            if (mesh) {
                focusOnGalleryItem(mesh);
            }
        });
    });

    // Wire size selector buttons toggles
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.parentElement.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Zoomed-in 3D model Drag-to-Rotate events
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onMouseUp);

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    targetMouse.x = mouse.x * 0.4;
    targetMouse.y = mouse.y * 0.4;

    // Specular print hover & seam stitching glows checks (if custom shaders exist)
    if (mainMesh && !isGalleryZoomed && mainMesh.userData.parts) {
        const mouseNearPrint = (Math.abs(mouse.x) < 0.25 && Math.abs(mouse.y) < 0.25);
        mainMesh.userData.parts.forEach(part => {
            if (part.material && part.material.uniforms && part.material.uniforms.uInkGloss) {
                gsap.to(part.material.uniforms.uInkGloss, {
                    value: mouseNearPrint ? 1.4 : 0.4,
                    duration: 0.5,
                    overwrite: "auto"
                });
            }
        });
    }
}

// Raycaster detection to zoom on floating clothes in Scene 4
function onClick(event) {
    if (event && event.target) {
        if (event.target.closest('.cta-button') || 
            event.target.closest('.nav-link') || 
            event.target.closest('.gallery-overlay-card') || 
            event.target.closest('.behind-card') ||
            event.target.closest('.gallery-close') ||
            event.target.closest('.main-header')) {
            return;
        }
    }

    const gallerySection = document.getElementById('gallery');
    const rect = gallerySection.getBoundingClientRect();
    const isGalleryVisible = (rect.top < window.innerHeight && rect.bottom > 0);

    if (!isGalleryVisible || isGalleryZoomed) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Gather child meshes from gallery Groups for raycasting hitboxes
    const hitObjects = [];
    galleryMeshes.forEach(group => {
        group.traverse(child => {
            if (child.isMesh) {
                hitObjects.push(child);
            }
        });
    });

    const intersects = raycaster.intersectObjects(hitObjects);

    if (intersects.length > 0) {
        // Retrieve the parent group that matches a gallery mesh group
        let clickedMeshGroup = intersects[0].object;
        while (clickedMeshGroup && !galleryMeshes.includes(clickedMeshGroup)) {
            clickedMeshGroup = clickedMeshGroup.parent;
        }
        
        if (clickedMeshGroup) {
            focusOnGalleryItem(clickedMeshGroup);
        }
    }
}

// Zoom camera close into active piece in gallery
function focusOnGalleryItem(group) {
    isGalleryZoomed = true;
    activeGalleryItem = group;

    // Add body class for lighter background
    document.body.classList.add('inspect-mode');

    // Intensify directional and point lights for better model visibility
    if (directionalLight) {
        gsap.to(directionalLight, { intensity: 2.2, duration: 1.2 });
        gsap.to(directionalLight.color, { r: 1.0, g: 0.95, b: 0.9, duration: 1.2 }); // Soft warm white spotlight
    }
    if (pointLight) {
        gsap.to(pointLight, { intensity: 3.5, duration: 1.2 });
        gsap.to(pointLight.color, { r: 1.0, g: 0.95, b: 0.9, duration: 1.2 });
    }
    if (scene && scene.fog) {
        gsap.to(scene.fog, { density: 0.05, duration: 1.2 }); // reduce fog density to make model clearer
    }

    // Hide other gallery meshes entirely to keep the view clean
    galleryMeshes.forEach(item => {
        if (item !== group) {
            setGroupOpacity(item, 0.0);
            item.visible = false;
        }
    });

    // Hide products card grid to make space for the details drawer
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) productsGrid.classList.add('hidden');

    // Smoothly animate active group to focus coordinates (screen-width responsive layout)
    const isMobile = window.innerWidth <= 768;
    const targetX = isMobile ? 0 : -0.6;
    const targetY = isMobile ? 0.45 : 0;
    const targetZ = isMobile ? 0.1 : 0.5;

    gsap.to(group.position, {
        x: targetX,
        y: targetY,
        z: targetZ,
        duration: 1.2,
        ease: 'power3.inOut'
    });

    gsap.to(group.rotation, {
        y: 0.4,
        duration: 1.2,
        ease: 'power3.inOut'
    });

    const data = group.userData;
    document.getElementById('g-item-num').innerText = data.num;
    document.getElementById('g-item-title').innerText = data.title;
    document.getElementById('g-item-desc').innerText = data.desc;
    document.getElementById('g-item-material').innerText = data.material;
    document.getElementById('g-item-origin').innerText = data.origin;

    document.getElementById('gallery-card').classList.add('active');
}

// Reset camera and meshes back to gallery layout
function resetGalleryZoom() {
    if (!isGalleryZoomed || !activeGalleryItem) return;

    document.body.classList.remove('inspect-mode');

    // Restore standard environment lights
    const env = lightEnvironments[activeLightState];
    if (directionalLight) {
        gsap.to(directionalLight, { intensity: 1.4, duration: 1.0 });
        gsap.to(directionalLight.color, { r: env.dirColor.r, g: env.dirColor.g, b: env.dirColor.b, duration: 1.0 });
    }
    if (pointLight) {
        gsap.to(pointLight, { intensity: 2.5, duration: 1.0 });
        gsap.to(pointLight.color, { r: env.pointColor.r, g: env.pointColor.g, b: env.pointColor.b, duration: 1.0 });
    }
    if (scene && scene.fog) {
        gsap.to(scene.fog, { density: env.ambient, duration: 1.0 });
    }

    document.getElementById('gallery-card').classList.remove('active');
    
    // Show products card grid again
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) productsGrid.classList.remove('hidden');

    const data = activeGalleryItem.userData;
    
    gsap.to(activeGalleryItem.position, {
        x: activeGalleryItem.userData.basePos.x,
        y: activeGalleryItem.userData.basePos.y,
        z: activeGalleryItem.userData.basePos.z,
        duration: 1.0,
        ease: 'power3.inOut'
    });

    gsap.to(activeGalleryItem.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.0,
        ease: 'power3.inOut'
    });

    // Make all other meshes visible and restore opacity
    galleryMeshes.forEach(item => {
        item.visible = true;
        setGroupOpacity(item, 1.0);
    });

    setTimeout(() => {
        isGalleryZoomed = false;
        activeGalleryItem = null;
    }, 1000);
}

// Handle window resizing cleanly
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Main Render/Animation Loop (60 FPS)
const animate = function () {
    requestAnimationFrame(animate);

    if (!renderer || !scene || !camera) return;

    const time = clock.getElapsedTime();

    // 1. Update dust particles vertical & horizontal drift
    if (dustParticles) {
        const positions = dustParticles.geometry.attributes.position.array;
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i + 1] += 0.0012; 
            positions[i] += Math.sin(time * 0.4 + i) * 0.0006; 

            if (positions[i + 1] > 4.5) {
                positions[i + 1] = -4.5;
                positions[i] = (Math.random() - 0.5) * 10;
            }
        }
        dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Slow breathing & components offset drift in main centerpiece T-shirt
    if (mainMesh) {
        const exp = shirtExplode.value;
        setGroupOpacity(mainMesh, mainMeshOpacity.value);

        // Apply slow breathing rotation/drift to the model
        mainMesh.rotation.y = -0.5 * exp + Math.sin(time * 0.4) * 0.04;
        mainMesh.position.y = 0.1 * exp + Math.sin(time * 0.5) * 0.05;

        // Perform programmatic mathematical component explosion/separation
        // Projects child meshes outwards from the center of the loaded GLTF model scene Group
        if (mainMesh.userData.parts) {
            mainMesh.userData.parts.forEach((part, index) => {
                const initPos = part.userData.initPos;
                if (initPos) {
                    const dir = initPos.clone().normalize();
                    if (dir.length() < 0.05) {
                        dir.set(0, 0, 1);
                    }
                    // Displace parts outwards based on initial coordinates
                    part.position.copy(initPos).add(dir.multiplyScalar(exp * 0.38));
                    
                    // Slow out of phase rotations
                    part.rotation.y = part.userData.initRot.y + Math.sin(time * 0.6 + index) * 0.05 * exp;
                }
            });
        }
    }
    
    // 3. Update gallery meshes time values & slow floating animation (relative to basePos & scaled by driftIntensity)
    galleryMeshes.forEach(group => {
        if (group.userData && group.userData.basePos) {
            const base = group.userData.basePos;
            const intensity = driftIntensity.value;
            
            // Only update position/rotation drift if this mesh is not the currently zoomed one
            if (!isGalleryZoomed || group !== activeGalleryItem) {
                const offset = group.userData.id * 10.0;
                group.position.x = base.x + Math.cos(time * 0.6 + offset) * 0.05 * intensity;
                group.position.y = base.y + Math.sin(time * 0.8 + offset) * 0.08 * intensity;
                group.position.z = base.z;
                
                // If driftIntensity is fading, group rotation should return to GSAP controlled/aligned state
                if (intensity > 0.01) {
                    group.rotation.y = Math.sin(time * 0.4 + offset) * 0.05 * intensity;
                }
            }
        }
    });

    // 4. Update background fabric cloud shapes
    cloudSculptures.forEach((cloud, index) => {
        const offset = index * 5.0;
        cloud.rotation.y = time * 0.02 + offset;
        cloud.rotation.x = Math.sin(time * 0.01 + offset) * 0.15;
        cloud.position.y = (index === 0 ? 1.5 : -1.5) + Math.sin(time * 0.05 + offset) * 0.3;
    });

    // 5. Smooth camera drift from mouse position
    cameraDrift.x += (targetMouse.x - cameraDrift.x) * 0.05;
    cameraDrift.y += (targetMouse.y - cameraDrift.y) * 0.05;

    if (!isGalleryZoomed) {
        camera.position.x += (cameraDrift.x * 0.6 - camera.position.x * 0.1) * 0.1;
        camera.position.y += (cameraDrift.y * 0.6 - camera.position.y * 0.1) * 0.1;
        camera.lookAt(0, 0, 0);
    }

    // 6. Update point light position mapping coordinates
    if (pointLight) {
        pointLight.position.x = camera.position.x + mouse.x * 3.0;
        pointLight.position.y = camera.position.y + mouse.y * 3.0;
        pointLight.position.z = camera.position.z - 0.5;
        pointLight.intensity = THREE.MathUtils.lerp(pointLight.intensity, 2.5, 0.05);
    }

    // Render Frame
    renderer.render(scene, camera);
};

// Start renderer
animate();

/* ----------------------------------------------------------------------
   Zoomed-in 3D Model Drag-to-Rotate Controls
   ---------------------------------------------------------------------- */
function onMouseDown(event) {
    if (!isGalleryZoomed || !activeGalleryItem) return;
    
    // Ignore drag start if clicking on overlay card or header elements
    if (event.target.closest('.gallery-overlay-card') || 
        event.target.closest('.main-header') ||
        event.target.closest('.gallery-close') ||
        event.target.closest('.cta-button') ||
        event.target.closest('.nav-link')) {
        return;
    }

    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onDragMove(event) {
    if (!isDragging || !isGalleryZoomed || !activeGalleryItem) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Rotate active item around Y (horizontal drag) and X (vertical drag)
    activeGalleryItem.rotation.y += deltaX * 0.008;
    activeGalleryItem.rotation.x += deltaY * 0.008;

    // Clamp vertical rotation (X-axis) so it does not flip upside down
    activeGalleryItem.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, activeGalleryItem.rotation.x));

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}

function onTouchStart(event) {
    if (event.touches.length !== 1) return;
    if (!isGalleryZoomed || !activeGalleryItem) return;

    if (event.target.closest('.gallery-overlay-card') || 
        event.target.closest('.main-header') ||
        event.target.closest('.gallery-close') ||
        event.target.closest('.cta-button') ||
        event.target.closest('.nav-link')) {
        return;
    }

    isDragging = true;
    previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

function onTouchMove(event) {
    if (!isDragging || !isGalleryZoomed || !activeGalleryItem || event.touches.length !== 1) return;

    const deltaX = event.touches[0].clientX - previousMousePosition.x;
    const deltaY = event.touches[0].clientY - previousMousePosition.y;

    activeGalleryItem.rotation.y += deltaX * 0.008;
    activeGalleryItem.rotation.x += deltaY * 0.008;
    activeGalleryItem.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, activeGalleryItem.rotation.x));

    previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

function onTouchEnd() {
    isDragging = false;
}
