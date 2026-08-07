# WebCAD Viewer

A browser-based 3D model inspection tool built with Three.js. Models are parsed locally in the browser; files are not uploaded by the viewer.

## Supported files

- OBJ
- STL
- FBX

Use **Open model** or drag one file into the viewport. After loading, use the viewport controls to fit the model, choose a front/left/top view, toggle the grid or axes, and use the Inspector for appearance and lighting controls.

## Notes

- For reliable browser performance, files larger than 250 MB are declined.
- Self-contained model files work best. OBJ/FBX files that depend on separate material or texture files may render without those external assets when opened through a standard browser file picker.
- STL imports are normalized from the portfolio's Z-up CAD convention to Three.js's Y-up scene convention. OBJ and FBX imports are left unchanged.
- The app is a static site and imports Three.js from unpkg; no build step is required.
