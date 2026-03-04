diff --git a/script.js b/script.js
new file mode 100644
index 0000000000000000000000000000000000000000..aa568ea3e71ae2577351be6a9335756fc6fd3339
--- /dev/null
+++ b/script.js
@@ -0,0 +1,197 @@
+import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
+import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';
+import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/OBJLoader.js';
+import { STLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/STLLoader.js';
+
+const canvas = document.getElementById('viewer-canvas');
+const uploadInput = document.getElementById('model-upload');
+const wireframeToggle = document.getElementById('wireframe-toggle');
+const triangleCountEl = document.getElementById('triangle-count');
+const vertexCountEl = document.getElementById('vertex-count');
+const statusTextEl = document.getElementById('status-text');
+
+const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
+renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
+renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
+renderer.outputColorSpace = THREE.SRGBColorSpace;
+
+const scene = new THREE.Scene();
+scene.background = new THREE.Color(0x0b0d12);
+
+const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
+camera.position.set(0, 2, 5);
+
+const controls = new OrbitControls(camera, renderer.domElement);
+controls.enableDamping = true;
+controls.dampingFactor = 0.08;
+controls.target.set(0, 0, 0);
+
+scene.add(new THREE.AmbientLight(0xffffff, 1.2));
+const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
+dirLight.position.set(3, 5, 2);
+scene.add(dirLight);
+
+const grid = new THREE.GridHelper(20, 20, 0x2f3642, 0x232934);
+scene.add(grid);
+
+const objLoader = new OBJLoader();
+const stlLoader = new STLLoader();
+
+let currentModel = null;
+
+function setStatus(message) {
+  statusTextEl.textContent = message;
+}
+
+function setWireframeForObject(root, enabled) {
+  root.traverse((child) => {
+    if (!child.isMesh) return;
+
+    if (Array.isArray(child.material)) {
+      child.material.forEach((material) => {
+        material.wireframe = enabled;
+      });
+    } else if (child.material) {
+      child.material.wireframe = enabled;
+    }
+  });
+}
+
+function calculateStats(root) {
+  let triangles = 0;
+  let vertices = 0;
+
+  root.traverse((child) => {
+    if (!child.isMesh || !child.geometry) return;
+    const geometry = child.geometry;
+
+    if (geometry.index) {
+      triangles += geometry.index.count / 3;
+      vertices += geometry.attributes.position.count;
+    } else if (geometry.attributes.position) {
+      const count = geometry.attributes.position.count;
+      triangles += count / 3;
+      vertices += count;
+    }
+  });
+
+  triangleCountEl.textContent = Math.round(triangles).toLocaleString();
+  vertexCountEl.textContent = Math.round(vertices).toLocaleString();
+}
+
+function focusCameraOnObject(object) {
+  const box = new THREE.Box3().setFromObject(object);
+  const size = box.getSize(new THREE.Vector3());
+  const center = box.getCenter(new THREE.Vector3());
+
+  const maxDim = Math.max(size.x, size.y, size.z);
+  const distance = maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));
+
+  camera.position.set(center.x + distance * 0.9, center.y + distance * 0.6, center.z + distance * 1.2);
+  camera.near = Math.max(0.01, distance / 200);
+  camera.far = Math.max(1000, distance * 20);
+  camera.updateProjectionMatrix();
+
+  controls.target.copy(center);
+  controls.update();
+}
+
+function clearCurrentModel() {
+  if (!currentModel) return;
+
+  scene.remove(currentModel);
+  currentModel.traverse((child) => {
+    if (child.isMesh) {
+      child.geometry?.dispose();
+      if (Array.isArray(child.material)) {
+        child.material.forEach((material) => material.dispose());
+      } else {
+        child.material?.dispose();
+      }
+    }
+  });
+  currentModel = null;
+}
+
+function addModelToScene(modelRoot) {
+  clearCurrentModel();
+  currentModel = modelRoot;
+  scene.add(currentModel);
+  setWireframeForObject(currentModel, wireframeToggle.checked);
+  calculateStats(currentModel);
+  focusCameraOnObject(currentModel);
+}
+
+function handleOBJ(text) {
+  const object = objLoader.parse(text);
+
+  object.traverse((child) => {
+    if (child.isMesh && !child.material) {
+      child.material = new THREE.MeshStandardMaterial({ color: 0x8ca9ff, metalness: 0.15, roughness: 0.7 });
+    }
+  });
+
+  addModelToScene(object);
+}
+
+function handleSTL(arrayBuffer) {
+  const geometry = stlLoader.parse(arrayBuffer);
+  geometry.computeVertexNormals();
+
+  const material = new THREE.MeshStandardMaterial({ color: 0x8ca9ff, metalness: 0.15, roughness: 0.7 });
+  const mesh = new THREE.Mesh(geometry, material);
+  const group = new THREE.Group();
+  group.add(mesh);
+
+  addModelToScene(group);
+}
+
+uploadInput.addEventListener('change', async (event) => {
+  const file = event.target.files?.[0];
+  if (!file) return;
+
+  const extension = file.name.split('.').pop()?.toLowerCase();
+
+  try {
+    setStatus(`Loading ${file.name}...`);
+
+    if (extension === 'obj') {
+      const text = await file.text();
+      handleOBJ(text);
+    } else if (extension === 'stl') {
+      const arrayBuffer = await file.arrayBuffer();
+      handleSTL(arrayBuffer);
+    } else {
+      throw new Error('Unsupported file type. Please upload OBJ or STL.');
+    }
+
+    setStatus(`Loaded ${file.name}`);
+  } catch (error) {
+    console.error(error);
+    setStatus(error.message || 'Failed to load file.');
+    triangleCountEl.textContent = '0';
+    vertexCountEl.textContent = '0';
+    clearCurrentModel();
+  }
+});
+
+wireframeToggle.addEventListener('change', () => {
+  if (!currentModel) return;
+  setWireframeForObject(currentModel, wireframeToggle.checked);
+});
+
+window.addEventListener('resize', () => {
+  const width = canvas.clientWidth;
+  const height = canvas.clientHeight;
+  camera.aspect = width / height;
+  camera.updateProjectionMatrix();
+  renderer.setSize(width, height, false);
+});
+
+function animate() {
+  controls.update();
+  renderer.render(scene, camera);
+  requestAnimationFrame(animate);
+}
+
+animate();
