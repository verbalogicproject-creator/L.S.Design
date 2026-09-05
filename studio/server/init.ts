import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";

import { StudioError } from "../shared/schema.ts";
import { slugify } from "../shared/ids.ts";
import { sha256 } from "../shared/hash.ts";
import { buildTokenModel, tokensHash } from "../shared/tokens.ts";
import { designDir, designJsonPath, designMdPath, screensDir } from "../shared/paths.ts";
import { DesignStore, DEFAULT_CONTRAST_PAIRS, emptyState } from "./store.ts";
import { parseDesignMd, writeDesignMd } from "./design-md.ts";
import { readTemplate } from "./preview.ts";
import { StudioService } from "./service.ts";

export interface InitOptions {
  projectRoot: string;
  name?: string | undefined;
  description?: string | undefined;
  lang?: string | undefined;
  dir?: "ltr" | "rtl" | undefined;
  force?: boolean | undefined;
}

export interface InitResult {
  created: string[];
  existing: string[];
  projectRoot: string;
}

const TEMPLATE_DEFAULTS: Record<string, string> = {
  project_description: "A design contract created by ls-design-studio.",
  display_font: "Fraunces",
  body_font: "Inter",
  premise_sentence: "State the premise in one sentence before the first build.",
  premise_evidence: "Name the brand assets, content, or conversation this rests on.",
  direction_family: "Choose one primary family.",
  direction_counterpoint: "Choose one quiet counterpoint.",
  signature_element: "Name the one element this design will be remembered by.",
  direction_exclusions: "List the treatments this design deliberately rejects.",
  contrast_content_background: "verify in the preview",
  contrast_muted_background: "verify in the preview",
  contrast_content_surface: "verify in the preview",
  contrast_onprimary_primary: "verify in the preview",
  contrast_border_surface: "verify in the preview",
  typography_rationale: "Explain why this pairing fits the product.",
  layout_notes: "Add the layout templates this project actually needs.",
  shape_signature: "Name any signature shape treatment.",
  component_notes: "Add one row per meaningful component.",
  content_notes: "Add one table per content type, with provenance.",
  accessibility_notes: "Name the statement page and any additional requirement.",
  performance_targets: "State the performance targets this project commits to.",
  do_one: "Keep the accent rare enough to still mean something.",
  do_two: "Let composition carry distinction before effects do.",
  do_three: "Recompose on small screens instead of shrinking.",
  dont_one: "Do not introduce a colour outside the token map.",
  dont_two: "Do not repeat one section shape across the whole page.",
  dont_three: "Do not add motion that survives reduced-motion.",
};

/**
 * Creates `design/` from the packaged templates. Existing files are kept unless
 * `force` is set, so running init twice never destroys a written contract.
 */
export async function initProject(options: InitOptions): Promise<InitResult> {
  const root = options.projectRoot;
  const created: string[] = [];
  const existing: string[] = [];

  await mkdir(designDir(root), { recursive: true });
  await mkdir(screensDir(root), { recursive: true });

  /*
    A contract that already exists is authoritative. Someone else wrote it -
    ls-design-plan, a teammate, a cloned repo - so its own name and description
    are read from it rather than replaced by a default. This is what lets the
    studio adopt a design instead of only ever creating one.
  */
  const designPath = designMdPath(root);
  const adopting = existsSync(designPath) && !options.force;
  let name = options.name ?? "Untitled project";
  let description = options.description;

  if (adopting) {
    const contract = parseDesignMd(await readFile(designPath, "utf8"));
    const declaredName = contract.frontmatter.name;
    const declaredDescription = contract.frontmatter.description;
    if (typeof declaredName === "string" && declaredName.trim().length > 0) {
      name = options.name ?? declaredName.trim();
    }
    if (typeof declaredDescription === "string" && declaredDescription.trim().length > 0) {
      description = options.description ?? declaredDescription.trim();
    }
  }
  const slug = slugify(name, "project");

  if (adopting) {
    existing.push("DESIGN.md");
  } else {
    const template = await readTemplate("DESIGN.template.md");
    const filled = fillTemplate(template, {
      ...TEMPLATE_DEFAULTS,
      project_name: name,
      ...(description ? { project_description: description } : {}),
    });
    const document = parseDesignMd(filled);
    await writeDesignMd(designPath, document);
    created.push("DESIGN.md");
  }

  const statePath = designJsonPath(root);
  let store: DesignStore;
  if (existsSync(statePath) && !options.force) {
    existing.push("design.json");
    store = await DesignStore.open(root);
  } else {
    const state = emptyState({
      name,
      slug,
      lang: options.lang ?? "en",
      dir: options.dir ?? "ltr",
      contrastPairs: DEFAULT_CONTRAST_PAIRS,
    });
    store = await DesignStore.create(root, state);
    created.push("design.json");
  }

  const service = new StudioService(store);
  const { model, designMd } = await service.tokenModel();
  const generated = await service.regenerate(model, service.state());
  created.push("tokens.css", "tailwind.theme.css", "preview.html");

  await store.mutate((context) => {
    context.state.tokensHash = tokensHash(model);
    context.state.provenance = {
      "DESIGN.md": sha256(designMd),
      "tokens.css": sha256(generated.tokensCss),
      "tailwind.theme.css": sha256(generated.tailwindCss),
      "preview.html": sha256(generated.previewHtml),
    };
    context.emit("project_initialized", { name });
    return undefined;
  });

  return { created, existing, projectRoot: root };
}

/** Verifies a template can still be parsed into a token model before it is written. */
export async function assertTemplatesUsable(): Promise<void> {
  const template = await readTemplate("DESIGN.template.md");
  const filled = fillTemplate(template, { ...TEMPLATE_DEFAULTS, project_name: "Check" });
  const document = parseDesignMd(filled);
  buildTokenModel(document.frontmatter);
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export function requireDesign(projectRoot: string): void {
  if (!existsSync(designMdPath(projectRoot))) {
    throw new StudioError(
      "E_NO_STUDIO",
      `no design/DESIGN.md under ${projectRoot}; run "ls-design-studio init --project ${projectRoot}" first`,
    );
  }
}
