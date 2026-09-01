# Security policy

## Supported versions

Security fixes are provided for the latest stable release.

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| Earlier versions | No |

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
