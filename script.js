import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const $ = (id) => document.getElementById(id);
const dom = {
  app: $("app-shell"), canvas: $("viewer-canvas"), viewer: $("viewer"), upload: $("model-upload"),
  browse: $("browse-button"), emptyBrowse: $("empty-browse"), empty: $("empty-state"), dropZone: $("drop-zone"),
  loading: $("loading-overlay"), loadingMessage: $("loading-message"), status: $("viewport-status"), toast: $("toast"),
  wire: $("wireframe-toggle"), textures: $("texture-toggle"), rotate: $("auto-rotate"), grid: $("grid-toggle"), axes: $("axes-toggle"), fit: $("fit-view"),
  inspector: $("inspector"), panelToggle: $("panel-toggle"), closePanel: $("close-panel"),
  info: ["name", "format", "size", "meshes", "vertices", "triangles", "dimensions"].reduce((out, key) => ({ ...out, [key]: $("info-" + key) }), {})
};
const state = { model: null, radius: 10, loadId: 0, animationFrame: null, light: "studio", materialStates: new Map(), toastTimer: null, rotateToken: 0 };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce5e6);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, matchMedia("(max-width: 800px)").matches ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.screenSpacePanning = true;
controls.addEventListener("change", requestRender);

const grid = new THREE.GridHelper(24, 24, 0x81999d, 0xb9c9cb);
grid.material.opacity = 0.62; grid.material.transparent = true; scene.add(grid);
const axes = new THREE.AxesHelper(4); axes.visible = false; scene.add(axes);
const hemi = new THREE.HemisphereLight(0xf3fbff, 0x59676b, 1.4); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(8, 12, 8); scene.add(key);
const fill = new THREE.DirectionalLight(0xc8e6ea, 1.1); fill.position.set(-8, 4, -6); scene.add(fill);

function requestRender() { if (!state.animationFrame) state.animationFrame = requestAnimationFrame(render); }
function render() { state.animationFrame = null; renderer.render(scene, camera); }
function setStatus(message) { dom.status.textContent = message; }
function showToast(message) { clearTimeout(state.toastTimer); dom.toast.textContent = message; dom.toast.hidden = false; state.toastTimer = setTimeout(() => { dom.toast.hidden = true; }, 6500); }
function setLoading(visible, message = "Reading model…") { dom.loading.hidden = !visible; dom.loadingMessage.textContent = message; dom.upload.disabled = visible; dom.browse.disabled = visible; dom.emptyBrowse.disabled = visible; }
function formatBytes(bytes) { if (!Number.isFinite(bytes)) return "—"; if (bytes < 1024) return `${bytes} B`; const units = ["KB", "MB", "GB"]; let value = bytes / 1024; let index = 0; while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; } return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`; }
function formatDimension(value) { return Number.isFinite(value) ? (Math.abs(value) >= 1000 || Math.abs(value) < .01 ? value.toExponential(2) : value.toFixed(2)) : "—"; }

function setLighting(mode) {
  state.light = mode;
  const presets = { studio: [0xdce5e6, 1.4, 2.2, 1.1], bright: [0xe8eeee, 1.8, 2.8, 1.5], dim: [0x738084, .75, 1.1, .45] };
  const [background, hemiIntensity, keyIntensity, fillIntensity] = presets[mode];
  scene.background.set(background); hemi.intensity = hemiIntensity; key.intensity = keyIntensity; fill.intensity = fillIntensity;
  document.querySelectorAll("[data-light]").forEach(button => button.classList.toggle("is-active", button.dataset.light === mode));
  requestRender();
}

function textureFromValue(value, textureSet) {
  if (!value) return; if (value.isTexture) textureSet.add(value);
  if (Array.isArray(value)) value.forEach(item => textureFromValue(item, textureSet));
}
function disposeObject(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(child => {
    if (!child.isMesh) return;
    if (child.geometry) geometries.add(child.geometry);
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    meshMaterials.filter(Boolean).forEach(material => { materials.add(material); Object.values(material).forEach(value => textureFromValue(value, textures)); });
  });
  geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose());
}
function clearModel() {
  if (!state.model) return;
  scene.remove(state.model); disposeObject(state.model); state.model = null; state.materialStates.clear();
}
function normalMaterial() { return new THREE.MeshStandardMaterial({ color: 0x73aab0, roughness: .6, metalness: .05 }); }
function rememberMaterials(root) {
  state.materialStates.clear();
  root.traverse(child => {
    if (!child.isMesh) return;
    if (!child.material) child.material = normalMaterial();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => state.materialStates.set(material, { map: material.map || null, wireframe: material.wireframe, color: material.color?.clone() || null }));
  });
}
function applyAppearance() {
  state.materialStates.forEach((saved, material) => {
    material.wireframe = dom.wire.checked;
    if ("map" in material) { material.map = dom.textures.checked ? saved.map : null; material.needsUpdate = true; }
  });
  requestRender();
}
function inspectModel(root) {
  let meshes = 0, vertices = 0, triangles = 0;
  root.traverse(child => {
    if (!child.isMesh || !child.geometry?.attributes.position) return;
    meshes++; const geometry = child.geometry; vertices += geometry.attributes.position.count;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
  });
  return { meshes, vertices, triangles };
}
function updateInfo(file, extension, dimensions, stats) {
  const info = dom.info;
  info.name.textContent = file.name; info.name.title = file.name; info.format.textContent = extension.toUpperCase(); info.size.textContent = formatBytes(file.size);
  info.meshes.textContent = stats.meshes.toLocaleString(); info.vertices.textContent = Math.round(stats.vertices).toLocaleString(); info.triangles.textContent = Math.round(stats.triangles).toLocaleString();
  info.dimensions.textContent = `${formatDimension(dimensions.x)} × ${formatDimension(dimensions.y)} × ${formatDimension(dimensions.z)}`;
}

function addModel(source, file, extension) {
  source.updateMatrixWorld(true);
  const originalBox = new THREE.Box3().setFromObject(source);
  const originalSize = originalBox.getSize(new THREE.Vector3());
  const sphere = originalBox.getBoundingSphere(new THREE.Sphere());
  if (!Number.isFinite(sphere.radius) || sphere.radius <= Number.EPSILON) throw new Error("This file does not contain a model with visible dimensions.");
  const stats = inspectModel(source);
  if (!stats.meshes) throw new Error("No renderable mesh data was found in this file.");
  source.position.sub(originalBox.getCenter(new THREE.Vector3()));
  const root = new THREE.Group(); root.name = "Loaded model"; root.add(source);
  const targetRadius = 10; root.scale.setScalar(targetRadius / sphere.radius); root.updateMatrixWorld(true);
  clearModel(); state.model = root; state.radius = targetRadius; scene.add(root); rememberMaterials(root); dom.wire.checked = false; dom.textures.checked = true; applyAppearance();
  updateInfo(file, extension, originalSize, stats); dom.empty.hidden = true; frameCamera();
  setStatus(`${file.name} loaded · ${stats.meshes} mesh${stats.meshes === 1 ? "" : "es"}`);
}
function frameCamera(direction = new THREE.Vector3(1, .75, 1)) {
  if (!state.model) { camera.position.set(13, 10, 13); controls.target.set(0, 0, 0); controls.update(); requestRender(); return; }
  const distance = state.radius * 2.6; const normalized = direction.clone().normalize();
  camera.position.copy(normalized.multiplyScalar(distance)); camera.near = Math.max(.01, state.radius / 100); camera.far = state.radius * 100; camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0); controls.minDistance = state.radius * .15; controls.maxDistance = state.radius * 25; controls.update(); requestRender();
}
const viewDirections = { front: new THREE.Vector3(0, 0, 1), left: new THREE.Vector3(-1, 0, 0), top: new THREE.Vector3(0, 1, 0) };

async function parseFile(file, extension) {
  const buffer = await file.arrayBuffer();
  if (!buffer.byteLength) throw new Error("This file is empty. Choose a model file with geometry.");
  if (extension === "obj") return new OBJLoader().parse(new TextDecoder().decode(buffer));
  if (extension === "stl") return new THREE.Mesh(new STLLoader().parse(buffer), normalMaterial());
  if (extension === "fbx") return new FBXLoader().parse(buffer, "./");
  throw new Error("Only OBJ, STL, and FBX models are supported.");
}
// STL has no embedded coordinate-system or up-axis metadata. The CAD files used
// by this viewer are exported Z-up, whereas Three.js uses Y-up. Keep this at the
// format boundary so every STL is normalized before bounds/camera processing.
function normalizeImportOrientation(model, extension) {
  if (extension !== "stl") return model;
  const normalized = new THREE.Group();
  normalized.name = "STL Z-up to Y-up conversion";
  normalized.rotation.x = -Math.PI / 2;
  normalized.add(model);
  return normalized;
}
async function loadFile(file) {
  const extension = file?.name.split(".").pop()?.toLowerCase();
  if (!file || !["obj", "stl", "fbx"].includes(extension)) { showToast("Choose an OBJ, STL, or FBX model file."); return; }
  if (!file.size) { showToast("That file is empty. Choose a model file with geometry."); return; }
  if (file.size > 250 * 1024 * 1024) { showToast("This file is larger than 250 MB and may not load reliably in a browser."); return; }
  const loadId = ++state.loadId; setLoading(true, `Loading ${file.name}…`); setStatus("Loading model…");
  try { const parsedModel = await parseFile(file, extension); const model = normalizeImportOrientation(parsedModel, extension); if (loadId !== state.loadId) { disposeObject(model); return; } addModel(model, file, extension); }
  catch (error) { console.error("Model load failed", error); if (loadId === state.loadId) { const message = error.message?.includes("No renderable") || error.message?.includes("visible dimensions") || error.message?.includes("empty") ? error.message : "We couldn’t read that model. Check that the file is a valid, self-contained OBJ, STL, or FBX file."; showToast(message); setStatus("Model could not be loaded"); } }
  finally { if (loadId === state.loadId) { setLoading(false); dom.upload.value = ""; } }
}

function togglePanel(open) { dom.inspector.classList.toggle("is-open", open); dom.panelToggle.setAttribute("aria-expanded", String(open)); }
function toggleAutoRotate() { const token = ++state.rotateToken; if (!dom.rotate.checked) { requestRender(); return; } const spin = () => { if (!dom.rotate.checked || token !== state.rotateToken) return; if (state.model) { state.model.rotation.y += .006; requestRender(); } requestAnimationFrame(spin); }; requestAnimationFrame(spin); }

dom.browse.addEventListener("click", () => dom.upload.click()); dom.emptyBrowse.addEventListener("click", () => dom.upload.click()); dom.upload.addEventListener("change", event => loadFile(event.target.files[0]));
["dragenter", "dragover"].forEach(type => dom.app.addEventListener(type, event => { event.preventDefault(); if (!dom.loading.hidden) return; dom.dropZone.classList.add("is-active"); }));
["dragleave", "drop"].forEach(type => dom.app.addEventListener(type, event => { event.preventDefault(); if (type === "dragleave" && event.relatedTarget && dom.app.contains(event.relatedTarget)) return; dom.dropZone.classList.remove("is-active"); }));
dom.app.addEventListener("drop", event => { const file = event.dataTransfer.files[0]; if (event.dataTransfer.files.length > 1) showToast("Loading the first dropped file only."); loadFile(file); });
dom.wire.addEventListener("change", applyAppearance); dom.textures.addEventListener("change", applyAppearance); dom.rotate.addEventListener("change", toggleAutoRotate);
dom.grid.addEventListener("click", () => { grid.visible = !grid.visible; dom.grid.classList.toggle("is-active", grid.visible); dom.grid.setAttribute("aria-pressed", String(grid.visible)); requestRender(); });
dom.axes.addEventListener("click", () => { axes.visible = !axes.visible; dom.axes.classList.toggle("is-active", axes.visible); dom.axes.setAttribute("aria-pressed", String(axes.visible)); requestRender(); });
dom.fit.addEventListener("click", () => frameCamera()); document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => frameCamera(viewDirections[button.dataset.view]))); document.querySelectorAll("[data-light]").forEach(button => button.addEventListener("click", () => setLighting(button.dataset.light)));
dom.panelToggle.addEventListener("click", () => togglePanel(!dom.inspector.classList.contains("is-open"))); dom.closePanel.addEventListener("click", () => togglePanel(false));
window.addEventListener("keydown", event => { if (event.target.matches("input,button,select,textarea")) return; if (event.key.toLowerCase() === "f") frameCamera(); if (event.key.toLowerCase() === "g") dom.grid.click(); if (event.key.toLowerCase() === "w") { dom.wire.checked = !dom.wire.checked; applyAppearance(); } });
new ResizeObserver(() => { const { width, height } = dom.viewer.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); requestRender(); }).observe(dom.viewer);
window.addEventListener("beforeunload", () => { ++state.loadId; clearModel(); controls.dispose(); renderer.dispose(); });
setLighting("studio"); frameCamera();
