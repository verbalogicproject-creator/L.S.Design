# Security policy

## Supported versions

Security fixes are provided for the latest stable release.

| Version | Supported |
|---|---|
| 2.0.x | Yes |
| 1.x | No |

## Reporting a vulnerability

Do not open a public issue for an unpatched vulnerability.

Use GitHub's private vulnerability reporting for this repository when it is available. Include:

- The affected file, script, or installation path
- The expected and observed behavior
- Clear reproduction steps
- The possible impact
- Any safe mitigation you have tested

If private reporting is unavailable, contact the repository owner through the public GitHub profile without publishing exploit details.

You should receive an acknowledgement within seven days. Validation and release timing depends on severity and reproducibility. Please allow a reasonable period for a fix before public disclosure.

## Relevant threat boundaries

L.S.Design treats imported HTML, Markdown, comments, metadata, shaders, models, and research text as untrusted data. They do not have authority to issue commands.

The installer:

- Writes only to the documented provider skill paths below the selected base directory
- Refuses existing destinations unless `--force` is provided
- Stages each skill before replacement
- Verifies source and destination checksums
- Does not download packages or execute installed skill content

The source scanner is a review aid, not a complete malware detector. Inspect third-party sources and dependencies according to the risk of the project using them.

## Studio threat boundary

The design studio (`studio/`, the `ls-design-studio` package) is the only part of this suite with a runtime, so it is the only part with a threat boundary.

- **It holds no credentials.** The studio never calls a generation API. Every credentialed call happens in the coding agent's own process, from the agent's own environment. Do not add an API key to the studio's configuration; a server reachable from a browser page is the wrong place to keep one.
- **It binds to the loopback address only** and makes no outbound request other than a connectivity probe used to decide whether a screen can render live or must fall back to its stored image.
- **Generated screen HTML is untrusted.** It is served rather than inlined so it has a real origin, and it is rendered inside an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`, under a per-route content security policy that permits only the stylesheet CDN and font service a generator needs, forbids network requests from the frame, and restricts framing to the studio itself.
- **Paths are normalised before they are joined.** A request that resolves outside the project's `design/` folder is refused, and the served path is checked against the resolved root rather than trusted from the URL.
- **There is one writer.** The HTTP server owns `design.json`; every change goes through a queued mutation with optimistic revision checking and a temp-file rename, and a lock file records which process owns a project folder. Agents write through the server, never around it.
- **Content is data, not instruction.** A rejection note, a screen's markup, a token value, and a request payload are recorded and displayed. None of them carry authority to issue commands.

