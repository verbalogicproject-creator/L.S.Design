# Production 3D

## Asset pipeline

Use glTF/GLB as the normal runtime delivery format. Preserve editable source files separately. Validate exports, remove unused content, deduplicate, simplify where visually safe, and compress geometry and textures with project-local, version-pinned tooling. Verify the final result in the target renderer; compression is not successful if it changes required appearance or compatibility.

Select texture dimensions, channels, color spaces, mipmaps, and formats by visible need. Avoid many unique materials and textures when instancing, atlases, or shared materials preserve the design.

Primary references: [Khronos glTF](https://www.khronos.org/gltf/), [glTF Transform](https://gltf-transform.dev/), and [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

## Rendering and color

Set an explicit color-management and tone-mapping strategy. Treat color textures, data textures, normal maps, environment maps, and display output according to their actual roles. Match the host palette under the final lighting rather than by copying raw hex values into a material.

Use the fewest lights and post-processing passes that achieve the art direction. Bake stable lighting or detail when it materially lowers runtime work without preventing required configuration.

Primary reference: [Three.js color management](https://threejs.org/manual/en/color-management.html).

## Adaptive quality

Create scene-specific tiers, for example:

- **Full:** intended assets, effects, resolution range, and animation.
- **Reduced:** lower resolution, cheaper material or shadow path, reduced effects, simplified geometry or animation.
- **Fallback:** static media or non-spatial presentation with the same essential content and actions.

Choose tiers from measured frame behavior, interaction delay, memory pressure, asset load, thermal stability where testable, visibility, and user preferences. Use hysteresis and cooldowns so quality does not oscillate. In React Three Fiber, a performance monitor is only useful when scene consumers actually respond to its factor.

Relevant references: [Drei PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor) and [AdaptiveDpr](https://drei.docs.pmnd.rs/performances/adaptive-dpr).

## Interaction and accessibility

- Keep essential controls in DOM and synchronize their state with the scene.
- Provide keyboard and single-pointer alternatives, a visible reset view, and a structured hotspot or option list.
- Describe purpose and state; expose equivalent values or summaries for meaningful data.
- Respect reduced motion by removing nonessential camera travel, parallax, auto-rotation, and scrubbed animation.
- Do not capture page scrolling unless explicitly required; provide a clear entry and exit.
- Announce loading and errors without trapping focus.

Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [MDN canvas accessibility guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage) as baselines.

## Lifecycle and resilience

Size from the actual container and cap resolution through a measured policy. Render on demand when possible. Pause or lower work when offscreen, hidden, or backgrounded. Handle renderer and asset failure without losing essential product functionality.

Track ownership of geometries, materials, textures, render targets, controls, workers, observers, and event listeners. Dispose owned resources at teardown; caches and shared resources need explicit ownership rules.

Primary references: [Three.js disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html), [responsive rendering](https://threejs.org/manual/en/responsive.html), and [rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html).
