# Production 3D

## Asset pipeline

Use glTF/GLB as the normal runtime delivery format. Preserve editable source files separately. Validate exports, remove unused content, deduplicate, simplify where visually safe, and compress geometry and textures with project-local, version-pinned tooling. Verify the final result in the target renderer; compression is not successful if it changes required appearance or compatibility.

Select texture dimensions, channels, color spaces, mipmaps, and formats by visible need. Avoid many unique materials and textures when instancing, atlases, or shared materials preserve the design.

Primary references: [Khronos glTF](https://www.khronos.org/gltf/), [glTF Transform](https://gltf-transform.dev/), and [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

## Rendering and color

Set an explicit color-management and tone-mapping strategy. Treat color textures, data textures, normal maps, environment maps, and display output according to their actual roles. Match the host palette under the final lighting rather than by copying raw hex values into a material.

Use the fewest lights and post-processing passes that achieve the art direction. Bake stable lighting or detail when it materially lowers runtime work without preventing required configuration.

Primary reference: [Three.js color management](https://threejs.org/manual/en/color-management.html).

## Product-scene craft

Make the object understandable before making the scene spectacular. Establish a readable silhouette, credible scale, useful view, grounded contact, and lighting that reveals the materials. Use environmental context, annotations, or synchronized DOM controls when they explain construction, configuration, or use.

- Prefer a guided camera range for product inspection when unrestricted orbiting adds no value. Provide a visible reset and never rely on drag alone.
- Use physically richer materials selectively. Sheen can support woven fabric and anisotropy can support brushed metal, but both need final-lighting review and measured performance. See [Three.js `MeshPhysicalMaterial`](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).
- Bloom and emissive edges imply luminous energy. Use them only when the object or art direction supplies that source; do not use post-processing as a default premium treatment.
- Avoid constant rotation, particle fields, deep parallax, and camera drift unless they communicate state, construction, sound, or another product-specific behavior.
- Distinguish CSS or SVG depth from a real renderer. Choose the cheaper representation when it communicates equally well; do not describe a transformed illustration as an interactive 3D model.
- Keep the page composition useful around the scene. A canvas is media, not a replacement for semantic product content.

For mostly static product viewers, render when interaction, animation, assets, camera, material, or container state changes rather than maintaining an idle loop. See [Three.js rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html) and [React Three Fiber scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

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

## Anti-patterns that circulate as advice

These four appear in widely copied Three.js example code, which is where they enter a project. Each contradicts an invariant this skill already states; naming the concrete shape makes the invariant checkable.

- **A user-agent test standing in for a quality strategy.** Matching the platform string against a device pattern to decide whether to add an effect pass or halve a texture size. The string describes a browser, not a frame budget: a recent phone is refused work it could do, and a struggling laptop is given work it cannot. Measure frame behavior instead and move between the tiers above.
- **A device-pixel-ratio cap pasted as boilerplate.** Clamping to two, copied unchanged into every scene, is a guess presented as a policy. Cap resolution from a measured budget for this scene on representative devices.
- **Hover as the whole interaction model.** Recoloring or selecting an object on pointer move, with no keyboard path and no visible affordance, leaves the scene inoperable for anyone not using a mouse. Pair every pointer interaction with a focusable control and a visible reset.
- **An animation loop with no motion-preference gate.** A continuously rotating object is the standard first example and almost never checks the reduced-motion preference. Query it once, respond to changes, and hold the scene at a readable resting state when it is set.
