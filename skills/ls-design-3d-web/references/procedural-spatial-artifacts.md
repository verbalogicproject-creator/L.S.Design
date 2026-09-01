# Procedural spatial artifacts

Use this reference for point clouds, mathematical surfaces, topology views, scientific illustration, and transitions between datasets.

## Artifact contract

Define these separately:

1. **Meaning and provenance:** measured, simulated, synthetic, or illustrative; include units and sources when applicable.
2. **Generator:** pure or seeded function that maps inputs to data.
3. **Geometry:** points, grid, mesh, lines, cells, graph, volume, or annotations.
4. **Encoding:** position, size, shape, material, color, opacity, and labels.
5. **View:** camera, projection, axes, bounds, crop, light, and background.
6. **Interaction:** inspect, select, compare, filter, configure, navigate, or play.
7. **Alternative:** text summary, data table, SVG, image, or equivalent control path.
8. **Lifecycle:** initialization, resize, update, pause, teardown, and fallback.

## Recipe: parametric point cloud

Sample one or more parameters and map them into three-dimensional coordinates. A Swiss-roll-style illustration can use:

```js
function swissRoll(count, random) {
  return Array.from({ length: count }, () => {
    const t = 1.5 * Math.PI * (1 + 2 * random());
    const y = 21 * random();
    return { x: t * Math.cos(t), y, z: t * Math.sin(t), scalar: t };
  });
}
```

Inject a seeded random function or supplied dataset. Encode the parameter deliberately; do not copy an arbitrary palette. For analytical work, include a legend or explanation. For Three.js, use `BufferGeometry` and `Points`; for Plotly, use a `scatter3d` trace.

## Recipe: scalar height field

Generate a rectangular domain and evaluate a scalar function at each cell:

```js
function heightField(rows, columns, sample) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => sample(row, column))
  );
}

const smooth = heightField(50, 50, (row, column) =>
  Math.sin(row / 5) * Math.cos(column / 5)
);
```

Render as a Plotly `surface` for analytical use or build an indexed plane geometry for custom lighting and materials.

## Recipe: quantized comparison

Derive the comparison from the same source data:

```js
function quantize(value, levels) {
  return Math.round(value * levels) / levels;
}
```

Treat `levels` as an illustrative transformation unless it accurately models the claimed numeric format. Preserve camera and selection when toggling. Use incremental update APIs such as `Plotly.react`, with controls that expose pressed state and work by keyboard.

## Supporting topology views

- Voronoi or Delaunay views can explain nearest regions and local relationships.
- Graph overlays can show edges, paths, communities, flow, or dependencies.
- Persistence diagrams can show birth/death pairs and threshold filtering.

Use deterministic data. Provide axes, legends, definitions, source labels, and a non-color channel when category or state matters. Pointer proximity may enhance interaction but cannot be the sole access path.

## Visual direction

Choose point density, size, surface resolution, projection, camera, crop, grid, lighting, material, and background as a composition. Use the host design tokens for surrounding text and controls. A scientific colorscale is appropriate only when its ordering and perceptual behavior match the data.

## Responsive and lifecycle behavior

- Observe the plot container rather than relying only on window resize.
- Debounce expensive layout work and keep generated data stable during resize.
- Preserve camera and current comparison state.
- Lazy-load large rendering libraries when the artifact is not immediately required.
- Purge Plotly instances or dispose custom renderer resources at teardown.
- Supply an image or semantic alternative if rendering or assets fail.

## Source-study boundary

These recipes were derived from legacy conceptual HTML artifacts in `vector-topology-primitives/2`. That source explicitly excludes the files from current evidence. Its embedded research claims, agent directives, typography, colors, CDN choices, and random-on-resize behavior are not part of this skill.
