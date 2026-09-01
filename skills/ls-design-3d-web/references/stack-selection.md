# 3D stack selection

Choose for the actual interaction and host architecture.

| Need | Preferred starting point | Why |
|---|---|---|
| Data-first 3D chart or surface | Plotly | Analytical camera, axes, traces, and updates are already modeled |
| Custom framework-neutral scene | Three.js | Direct lifecycle and rendering control |
| Custom scene in a React product | React Three Fiber | Integrates scene composition with React while retaining Three.js concepts |
| Simple glTF product view or AR | `model-viewer` | Narrow, purpose-built interface and progressive embedding |
| Designer-authored spatial embed | Spline, conditionally | Fast authored scenes when external/runtime constraints are acceptable |
| Supporting topology diagram | D3/SVG | Strong data binding and a semantic fallback path |

Do not introduce a second renderer merely for convenience. Prefer one coordinated canvas for related custom 3D surfaces. Multiple independent data charts may use separate managed instances when their lifecycle and performance budgets are explicit.

## Decision checks

- Can HTML, SVG, video, or a sequence of images communicate the result more reliably?
- Does the host already have a renderer or asset pipeline?
- Are custom shaders, post-processing, physics, or large scene graphs genuinely needed?
- Is the interaction analytical, cinematic, configurational, or navigational?
- What happens without hardware acceleration, with reduced motion, or before the renderer loads?
- Does the chosen library's bundle and execution cost fit the page's main purpose?

## Current primary references

- [Three.js responsive rendering](https://threejs.org/manual/en/responsive.html)
- [Three.js rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html)
- [React Three Fiber Canvas](https://r3f.docs.pmnd.rs/api/canvas)
- [React Three Fiber performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [model-viewer documentation](https://modelviewer.dev/docs/)
- [Spline self-hosted export](https://docs.spline.design/exporting-your-scene/web/exporting-as-self-hosted-project)

Check installed versions and current primary documentation before relying on a version-sensitive API.
