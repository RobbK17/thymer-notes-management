# Thymer Notes Management Plugin

Unified Thymer custom panel for bulk note operations and advanced tag workflows.

## Version

- **Current version:** `1.0.17`
- **Full per-release notes:** [changelog.md](./changelog.md) (detailed archive). Current behavior is also described under **Feature Overview** below.

### What’s new in 1.0.17

- **Bulk Delete — empty property values:** With a **Property** selected, **Empty only — no value / blank** matches notes where that property has no non-empty displayable value (for example an unset **Calendar**). **Property contains** is disabled while this mode is on.

### What’s new in 1.0.16

- **Bulk Delete — property filter:** **Property** dropdown (names from loaded notes) plus **Property contains** (case-insensitive substring over texts, values, and choice selections). Composes with title filter, sub-page filter, and **Show only selected**.
- **Bulk Delete — TRASH confirmation:** Typing `TRASH` in the confirm modal no longer resets the caret each character (in-place enable/disable of **Move to Trash** instead of full panel re-render on each keystroke).

### What’s new in 1.0.15

- **Delete tree selection UX:** Bulk Delete now supports tree-based row selection with per-row **children** subtree checkboxes (tri-state) and a header-level **All children** toggle.
- **Mode-specific hierarchy rendering:** In **All notes**, rows render as an always-expanded indented hierarchy with path-preserving filtering; in other sub-page modes, chevrons remain for manual expand/collapse.
- **Select-visible semantics update:** Header **All parents** now toggles only visible parent/root rows.
- **Bulk Delete scope counters:** Header pills now summarize `visible`, `selected parents`, `selected children`, and `total selected`.
- **Bulk Delete terminology and filter polish:** Sub-page filter label **Only root notes** is now **Only parent notes**. **Parent note** dropdown now lists only notes that actually have children and is alphabetically sorted.
- **Children-only row clarity:** In **Only notes with parent** mode, row titles now append `(parent: <title>)`.

### What’s new in 1.0.14

- **Delete preview log details:** Bulk Delete preview now logs a tree-style list of selected roots plus selected child titles for each root when **Delete children** is enabled.
- **Delete preview one-line summary:** Preview status now reads as counts for roots selected, descendants, and total records to trash (with plural-aware wording), and this summary is also the first line of the preview log entry.
- **Delete confirmation UX:** Replaced browser `confirm/prompt` with an in-panel **Confirm Move to Trash** modal (Cancel / Move to Trash, Esc/backdrop close, Enter submit in typed field).
- **Large-run safety kept in-panel:** For large delete runs, typed `TRASH` confirmation now happens inside the modal before apply.
- **Header toggle scope simplification:** Removed the temporary **selected only** scope option from the Delete-children header control; **Delete children (visible)** now consistently targets visible eligible rows.

### What’s new in 1.0.13

- **Delete notes header controls:** Replaced old select-all/select-none flow with **Select visible** and kept the children toggle on the same header row; child count pills reflect descendant totals for visible eligible rows.
- **Delete preview detail:** Bulk delete preview status/log now includes a compact root-level tree summary (`self only` vs `self + N descendants`) so subtree impact is visible before apply.
- **Safer large deletes + failure retention:** Apply now asks for typed confirmation (`TRASH`) on large runs, and failed root selections (plus their delete-children flags) are preserved after refresh for retry.

### What’s new in 1.0.12

- **Bulk tools split:** The previous **Bulk move** entry is now **Move**, and a new sibling **Delete** view is added under the **Bulk** group.
- **Delete notes (bulk):** Uses the same list/filter/select UX as Move (source collection, title filter, show-only-selected, preview, refresh) and applies with **Move to Trash** via `record.trash()`, including row-level log entries and a summary line.
- **Delete filters:** Added a relationship dropdown for **All notes**, **Only notes with parent**, **Only root notes**, and **Match selected parent**; when matching parent, a parent-note picker appears.
- **Naming updates:** Menu/command labels now use **Move notes** and **Delete notes**; Home quick-search collection hits now route to **Move** with that source preselected.

### What’s new in 1.0.11

- **Home quick search — footer:** The panel footer (**`nm-status`**) is updated **before** the home UI re-renders when a search finishes, so the bottom line matches the in-page match counts and summary.
- **Search everywhere — Tags:** **Reindex tags & refresh search** on the same line as the **Tags** header rebuilds the tag index (same scope as **Refresh index** in tag tools) and re-runs the current query.
- **Quick search — sort order:** Note rows sort **A–Z by title** (then collection). **Tags** sort **A–Z by tag name**. **Collections** sort **A–Z by collection name**. With **Search everywhere**, the **Notes** list is the **alphabetically first 25** title matches (after scanning all notes in scope).

### What’s new in 1.0.10

- **Help:** Overview / Structure / Bulk / Tags text moved into a **☰ → Help** modal (with Esc, ×, backdrop, or switching tools to close). Home focuses on **Quick search**.
- **Home — Quick search:** **Notes:** word-AND over title + body, same excluded-collection scope as tag tools; **full match count**, **25-row pages** with **First / Prev / Next / Last** (up to **500** hits kept for paging; total still correct beyond that). **Search everywhere:** one query fills **Notes**, **Tags**, and **Collections** (25 rows each); row clicks open the note elsewhere, jump to **Tag rename** with that tag, or **Bulk move** with that collection as source.

### What’s new in 1.0.9

- **Home — Quick search (first drop):** Debounced field, word-AND note search over title + body, dense result list; foundation for the 1.0.10 extensions above.

### What’s new in 1.0.8

- **Status vs toasts:** Heavy tools prefer **review log + `nm-status`** for the main story; duplicate completion toasts dropped where the log already narrates the outcome (merge, bulk move, assign, review workflows, trace, tag index refresh).

### What’s new in 1.0.7

- **Rename / review / merge:** Preview and apply summaries include **per-target tag index counts** (distinct notes with that tag before vs predicted or actual after), aligned across Tag rename, Review Grid, and Tag merge.

### What’s new in 1.0.6

- **Shell:** Single **header + grouped nav + main + shared review log** layout across all tools.
- **Tag analyzer:** **Per-member exclude/restore**, **Convert to manual**, **inline + picker add tags** on manual clusters, clearer cluster summaries, and **skipped** clusters when too few active members remain.

### What’s new in 1.0.5

- **Tag review — Add tag:** Full third workflow (filter, queue, preview/apply, logging) plus **practical Tags / hashtag column handling** via the Thymer record API (`prop`, `addValue`, `set`, multi-value rules, body fallback).

### What’s new in 1.0.4

- **Tag review — Remove tag:** New advanced workflow (body + text properties, preview/apply, logging) alongside Review Grid; **one row per record** when multiple hits exist in the same note.

### What’s new in 1.0.3

- **Tag analyzer & navigation polish:** Target terminology, export JSON toggle/jumps, orphan copy, collapsible manual cluster section, improved suggestions, A–Z tool ordering in menu and palette.

### What was new in 1.0.2

- **Tag analyzer** (clustering + export plan) and **Tag merge** (load plan, preview/apply) added as first-class tools; **shared keyboard** behavior for suggestion lists across rename, assign, and review.

### What was new in 1.0.1

- **Tag rename** shortcuts (⌘/Ctrl+Enter preview / apply); **Review Grid** queue/preview/override UX, Enter to find matches, **Group by tag**, and clearer post-rename summaries.

## Included Tools

(Tools appear in the panel **navigation bar** by group. The header **menu** (☰) lists **Home**, then the same tools in **A–Z** order by label, then **Help** — not a separate mode, but a short overview dialog.)

- **Assign subpages**
- **Move notes**
- **Delete notes**
- **Tag analyzer**
- **Tag merge**
- **Tag rename (quick)**
- **Tag review (advanced)**

## Feature Overview

### Shared Panel UX

- Native custom panel: **breadcrumb** (`Home / …`), grouped **navigation bar**, **main** content, and shared **Review log** on every mode. **Home** adds **Quick search** (notes by default, with optional paging and totals; optional **Search everywhere** for notes + tags + collections in three sections — details below).
- Header **menu** (☰): **Home**, then tools in **A–Z** order by label, then **Help** (after a divider) — opens a modal with the four tool-group overview lines. Help is menu-only (not duplicated in the palette list below).
- Command palette entries for:
  - `Notes Manager: Open`
  - `Notes Manager: Assign subpages`
  - `Notes Manager: Move notes`
  - `Notes Manager: Delete notes`
  - `Notes Manager: Tag analyzer`
  - `Notes Manager: Tag merge`
  - `Notes Manager: Tag rename (quick)`
  - `Notes Manager: Tag review (advanced)`
- Sidebar shortcut: `Notes Manager`.
- Consistent button, input, and table styling across all tools.

### Home — Quick search

- **Input:** Debounced while typing; **Enter** or **Search** runs immediately; **Clear** resets the field and results. **Search everywhere** is a saved checkbox.
- **Notes only (checkbox off):** Every scannable note in scope is walked; matches use **word-AND** on **title + body** (body text is capped per note for speed), with the same **excluded collections** rules as tag tools. The UI shows the **total number of matches**, how many notes were **scanned**, and a **page of up to 25** rows. **First** / **Prev 25** / **Next 25** / **Last** sit on the same line as that summary. Up to **500** matching rows are retained for paging; if there are more hits than that, the **total** is still correct and the UI notes that only the first 500 are listed for paging. Listed rows are sorted **A–Z by note title** (then collection); the 500 retained are still the first 500 hits in **scan** order, then sorted for display.
- **Search everywhere (checkbox on):** One query fills **Notes**, **Tags**, and **Collections** sections (up to **25** rows each; tag hits come from the **tag index**). Tags and collections appear first; the **Notes** block may show **Searching…** until the note scan finishes. **Tags** are sorted **A–Z**; **collections** **A–Z**; **notes** are the first **25** matches when ordered **A–Z by title** (then collection). The **Tags** header includes **Reindex tags & refresh search** to rebuild the index and re-run the query.
- **Footer line:** After each home search completes, the bottom **`nm-status`** line is set to the same summary as logged for the run, then the panel HTML is rebuilt so the footer matches the on-page counts.
- **When you click a row**
  - **Note** (notes-only list or **Notes** section): Opens that note in **another** Thymer panel (the plugin creates/opens an edit panel and navigates to that record — same helper as Review Grid **open in other panel**).
  - **Tag** (**Tags** section): Leaves Home and opens **Tag rename (quick)** with **Current tag** set to the clicked tag (with `#` as in that tool).
  - **Collection** (**Collections** section): Leaves Home and opens **Move** with that collection selected as **source**, provided it is still in the loaded source list.

### Move Notes

- Source/target collection selectors.
- Title filter and optional **show only selected** mode.
- Select all/select none for visible rows.
- Preview-first workflow, then apply.
- Row-level result logging for moved/failed records.
- Refresh action updates **`nm-status`** and appends a **review log** line (no separate completion toast).

### Delete Notes

- Source collection selector.
- Sub-page relationship filter: **All notes**, **Only notes with parent**, **Only parent notes**, **Match selected parent**.
- Parent-note selector appears when **Match selected parent** is chosen; dropdown includes only true parent notes and is sorted A-Z.
- Optional **Property** filter: pick a column name (from `getAllProperties()` on notes in the source collection), then either **Property contains** (case-insensitive substring) or **Empty only — no value / blank** to match notes with no displayed value for that property (for example empty Calendar). **`(none)`** clears property filtering.
- Title filter and optional **show only selected** mode.
- Tree-aware list with per-row checkboxes and per-row **children** subtree checkbox (tri-state) for rows that have descendants.
- In **All notes**, hierarchy is rendered fully expanded with indentation and path-preserving filter behavior.
- In other sub-page modes, chevrons expand/collapse descendants on demand.
- Header controls: **All parents** (toggles visible parent/root rows) and **All children** (toggles descendants for visible parent rows).
- Scope pills show: `visible`, `selected parents`, `selected children`, and `total selected`.
- Preview-first workflow, then **Move to Trash**.
- Preview status shows **roots selected**, **descendants**, and **total records to trash**; preview log also includes a tree-style listing of root and child record titles selected.
- Move to Trash opens an in-panel confirmation modal; large runs require typed confirmation (`TRASH`) inside that modal before apply (the typed field updates without resetting the text cursor each keystroke).
- Failed root selections are retained after apply for quick retry.
- Row-level result logging for moved-to-trash / failed records.
- Refresh action updates **`nm-status`** and appends a **review log** line.

### Assign Subpages

- Incremental parent note search with in-field clear button; when the hit list is open, use arrow keys and **Enter** to pick, **Esc** to close the list.
- Child filtering with in-field clear button.
- Supports assign and unassign flows.
- All-visible checkbox support.
- Optional hide rows already marked `child of:`.
- Preview-first workflow, then apply with row-level logging.

### Tag Rename (Quick)

- `Current tag` (`#current-tag`) and `New tag` inputs.
- Incremental suggestions for current tag (arrows + **Enter** to pick, **Esc** to close the list).
- **Keyboard:** **⌘/Ctrl+Enter** = preview, **⌘/Ctrl+Shift+Enter** = apply (from either tag field when you’re on this screen).
- Matching options (collapsible):
  - Case-sensitive matching
  - Exclude choice/enum values from tag index
  - Exclude collections via **Choose collections to exclude…** (checkbox list + filter); saved as comma-separated names or GUIDs (same as before)
- Refresh index updates **`nm-status`** and the **review log** (no separate “refreshed” toast on success).
- Preview and apply workflows with detailed multi-line outputs.
- **Target tag record counts:** Preview shows index **before** vs **predicted after** for the New tag; apply shows **before** vs **actual after** (post quiet index refresh).
- Preview/apply outputs mirrored to review log.
- **Properties:** For each record, **`prop.texts()`** is read, matching values are rewritten, then **`prop.set([...])`** replaces the full list (multi-value hashtag / text-like tag columns included when they pass the same “text-like for tags” rules as the index). Choice/enum columns use **`setChoice`** when `choices()` is an array.

### Tag Review (Advanced)

- Tag trace workflow with collapsible trace output and copy button.
- **Advanced workflow** toggles **Review Grid**, **Remove tag**, and **Add tag** (shared **Refresh index** and **Matching options**). Choosing **Remove tag** or **Add tag** clears Review Grid source/queue/target fields; **Review Grid** clears both other queues; **Remove tag** and **Add tag** clear each other’s queue when switching between them.
- Review Grid workflow:
  - Source and default target (`#source-tag`, `#default-target`) with tag suggestions; **Enter** runs or re-runs **Find matches** where applicable; clearing the source clears the queue.
  - Queue **build**, **preview** (detailed plan), and **rename** (apply). **Find matches** produces **one row per record** when the same note matches multiple times; the row notes how many tag locations were found.
  - **Preview / apply:** Per-target **record counts** in the tag index (distinct notes with that tag) — before vs predicted (preview) or before vs actual after refresh (apply), aggregated per default and override targets.
  - **Meta line:** visible vs total rows, plus counts for default / skip / override.
  - Filter and sort, including **Group by tag** (per matched tag, with group default/skip and open-record from the title when grouped).
  - Sticky grid header + sticky first column.
  - Per-row **Default** / **Skip** / **Override** (suggestions from the tag index; **×** to clear an override).
  - Header-level default/skip checkboxes for visible rows.
- **Remove tag:** Tag to remove (suggestions exclude choice-only tags), filter/sort, **Find matches** / **Preview** / **Apply**; one row per record with the same location-count hint; review log entries for remove-tag preview/summary.
- **Add tag:** New tag (plain input), record filter + table narrow filter, **Find matches** / **Preview** / **Apply**; opt-in **Add** / **Skip**; **`record.prop('Tags')`/`('Tag')`** first, then hashtag-typed or **Tags**/**Tag** columns (`addValue` / `texts`+`set`); hashtag fields persist the **token without `#`**; body fallback remains `#tag` + trailing space; detailed apply output + review log; preview/summary logged.
- After a successful grid **Rename**, the queue clears and the tag index updates quietly; read the summary in the grid output area.
- Review Grid preview/apply outputs mirrored to review log.

### Tag analyzer

- Opens from **Home** or the command palette. Tag names and counts come from the **same tag index** as rename/review (no manual paste).
- **Usage threshold:** tags at or below this use-count are “low-use” seeds for clustering (slider max grows with your data).
- **Similarity sensitivity:** 15–70% (same role as the reference tool: lower = looser string/token matches, higher = stricter). Clustering blends normalized Levenshtein, token Jaccard, and a small bonus when one tag contains the other (tokenization uses letters and numbers in any language).
- **Analyze** builds clusters (expand a row to pick a target tag or type one), lists **orphan** low-use tags that matched no cluster, and shows **Potential savings** (same count formula as the reference).
- **Per-member editing:** Each member pill has **×** to exclude that tag from the cluster (pill is shown struck-through; **↺** restores it). Excluded members are dropped from the exported `merging` and `combinedCount`. Excluding the current target shifts the target to the highest-count remaining active member. A cluster with fewer than 2 active members is automatically skipped in the export.
- **Convert auto cluster to manual:** Auto clusters expose a **Convert to manual** button next to **Omit from export**. The cluster gets a stable id so member exclusions and target choices persist across **Analyze** re-runs; manual clusters are already preserved.
- **Add tags to a manual cluster:** In the detail of any manual cluster, an inline **+ Add tag** input (with usage-sorted suggestions, Enter to accept the top match) and an **Add tags…** picker (filter + tickable list) let you grow the cluster after creation. Adds are restricted to the current tag index; auto clusters refuse with a toast that points you to **Convert to manual**.
- **Jump controls:** **Jump to export JSON** opens/scrolls to the export panel; **Jump to orphan tags** scrolls to the orphan section (disabled when there are no orphans).
- **Show export JSON** opens the consolidation plan and switches to **Close export JSON** while open. The preview shows **Clusters in export** and **JSON lines** (line count of the pretty-printed body) above the array, then the plan (`replacement`, `merging`, `combinedCount` per cluster). **Save export JSON** and **Copy** still output a valid JSON **array** only (for Tag merge and other tools). Applying merges in Thymer is still a manual or Tag-rename step.
- **Orphan tags:** Header includes a **Copy** action to copy orphan tags and counts to clipboard.
- **Add manual cluster:** Section is collapsible (chevron header) and closed by default.
- Index scope (case-sensitive, exclude choice/enum, excluded collections) is still controlled under **Matching options** on Tag rename / Tag review, then **Refresh index** here (refresh returns you to the threshold screen).

### Tag merge

- Opens from **Home** or the command palette to apply a consolidation plan generated from Tag analyzer or another workflow.
- Loads a JSON array where each cluster object includes `replacement`, `merging`, and `combinedCount`.
- Expands each `merging` tag into individual rows and supports per-row **Skip** before preview/apply.
- Uses the same scan/replace behavior as Tag rename for consistent hashtag replacement semantics.
- Includes **Preview** and **Apply**, row-level statuses, and a collapsible **Per-cluster totals** view.
- **Preview / apply:** Per-target **record counts** in the tag index before vs predicted (preview) or before vs actual after refresh (apply), for each distinct merge target (`to` tag) among non-skipped rows.
- Uses the same tag-index scope controls (case-sensitive, exclude choice/enum, excluded collections) via shared matching options + **Refresh index**.

### Review Log + Status + Toasts

- Collapsible review log (hidden by default).
- Newest entries shown first.
- Row-level and summary operation entries.
- Save log to JSON.
- **`nm-status`** at the bottom of the panel carries short summaries; **toasts** are used for quick feedback (clipboard, small analyzer actions, JSON load, etc.) and for status lines that are **not** marked as already reflected in the log (`logged: true` on `_setStatus` suppresses the duplicate toast when the detail lives in the review log).
- Preview outputs are mirrored to the log for all tools.

### Persistence

- Local settings persisted between sessions for:
  - Default mode
  - Bulk move/delete display preference
  - Assign-subpages hide-child-of preference
  - Tag matching options and excluded collections
  - Review log collapsed state

## Install / Load

1. Open Thymer plugin development for your workspace.
2. Add or point Thymer to:
   - `notes-manager-plugin.js`
   - `plugin.json`
3. Reload plugins in Thymer.
4. Open **Notes Manager** from the command palette or sidebar.

## Typical Workflow

1. Open a tool from the **navigation bar**, the header **menu**, or the **command palette**.
2. Configure filters/inputs and run **Preview** first.
3. Confirm preview output and row selection.
4. Run **Apply**.
5. Review details in the collapsible **Review log** (or export JSON).

## Troubleshooting

- **Tag index not loaded / suggestions missing**
  - Click **Refresh index** in tag tools.
  - Verify matching options (exclude choice/enum, excluded collections) are not too restrictive.

- **Preview shows no rows**
  - Confirm required inputs are set (source/target, parent note, current/new tag, or source tag).
  - Clear filters that may hide rows (`Filter`, `Show only selected`, `Hide child of:`).
  - In **Delete Notes**, if **Sub-page filter** is set to **Match selected parent**, choose a parent in the **Parent note** dropdown; otherwise no rows are shown.
  - In **Delete Notes**, to match an **empty** custom property (for example **Calendar**): pick **Property**, enable **Empty only — no value / blank**. Leaving **Property contains** blank **without** **Empty only** does not apply any property filter.

- **Apply appears to do nothing**
  - Run **Preview** first and confirm rows are included.
  - Check Review Grid row actions (`Default`, `Skip`, `Override tag`) to ensure rows are runnable.

- **Can’t find operation details**
  - Expand **Review log** (it is collapsed by default).
  - Use **Save log JSON** for full output/history export.

## Implementation Notes

- Built on Thymer SDK APIs (`AppPlugin`, UI panel APIs, data/record APIs). Property and segment **`hashtag`** handling follows [thymerapp/thymer-plugin-sdk](https://github.com/thymerapp/thymer-plugin-sdk) `types.d.ts` (`PluginProperty`, `PluginRecord.prop`, `PROP_TYPE_HASHTAG`).
- Single-file implementation for runtime logic: `notes-manager-plugin.js`.
- **Tag analyzer — duplicate “add tag” UI paths:** Manual cluster **+ Add tag** is wired in two places: the delegated **`click`** handler (`data-action` **`ta-add-from-input`** / **`ta-add-suggest`**, around the main `switch`) and a **`keydown`** listener on **`.nm-ta-add-input`** (Enter = same `_tagAnalyzerAddTagToCluster` + toasts). Behavior is intentionally identical; the strings are duplicated. **Suggestions if you touch this area:** extract a small helper, e.g. **`_tagAnalyzerApplyInlineAdd(cl, candidate)`**, that runs `_tagAnalyzerAddTagToCluster`, clears the per-cluster input on success, sets `tagAnalyzerOpenClusterId`, and shows the same toasts from one place; have both the switch cases and the keydown path call it. Alternatively, have Enter **`click()`** the existing **+ Add** control (or dispatch a synthetic event with the same `data-action`) so only one branch owns the logic. Same idea applies to the picker **Apply** toast block vs any future second entry point — keep outcomes in one function.
