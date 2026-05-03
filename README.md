# Thymer Notes Management Plugin

Unified Thymer custom panel for bulk note operations and advanced tag workflows.

## Version

- **Current version:** `1.0.6`

### What’s new in 1.0.6

**Shared shell and navigation**

- **One frame everywhere:** Header (menu + breadcrumb), grouped **tool navigation** (Overview → Home; Structure → Assign subpages; Bulk → Bulk move; Tags → Rename, **Trace & Review**, Analyzer, Merge), **main** content, then the shared **Review log**—same layout for every mode so switching tools feels more continuous.

**Tag analyzer — per-member editing**

- **Exclude individual tags from a cluster:** Each member pill now has an **×** to drop just that tag from the cluster. Excluded members are shown struck-through; click **↺** on the same pill to restore. Excluded members are removed from the export plan’s `merging` list and from `combinedCount`. Clicking the **text** of an excluded pill (to pick it as the target) auto-restores it.
- **Auto-pick fallback:** Excluding the current target shifts the target to the highest-count remaining active member automatically; you can always override via pill click or the **Target tag** input.
- **Skipped clusters:** Once a cluster has fewer than 2 active members it is automatically skipped in the export, with a header note (`Skipped in export — fewer than 2 active members`).
- **Convert to manual:** Auto clusters now show a small **Convert to manual** button next to **Omit from export**. Conversion gives the cluster a stable id so member exclusions, target picks, and custom target text **survive re-Analyze** (manual clusters are already preserved by the existing `prevManual` carry-over). The cluster then displays the existing **Manual** badge.
- **Add tags to a manual cluster:** Each manual cluster (including auto clusters that were Converted to manual) now exposes an inline **+ Add tag** input plus an **Add tags…** picker in its detail pane. The inline input shows top suggestions (sorted by usage count) as you type — Enter accepts the top match, click a suggestion pill, or click **+ Add** to add the typed tag. The picker opens a tickable list (filter + checklist) for bulk adds. Adds are restricted to tags that exist in the current tag index. Toasts report `added` / `restored` / `already member` / `not in index`. Refusing on auto clusters: a toast asks you to **Convert to manual** first.
- **Cluster header summary:** Shows `N/M active → 1` when any members are excluded (versus `N tags → 1` previously) and the detail pane lists the excluded tag names plus active-vs-total combined counts.

**Performance**

- **Debounced filter typing:** Filter and slider inputs across Bulk move, Assign subpages, Tag review (Review Grid / Remove tag / Add tag, plus the excluded-collections picker filter) and the Tag analyzer (manual cluster filter, threshold + similarity sliders) now coalesce rapid keystrokes through a shared 120 ms debounce instead of re-rendering the whole panel on every character. State updates remain synchronous so values stay correct, but the costly DOM rewrite is deferred until typing pauses.
- **Tag review — render-scoped memoization:** The Review Grid / Remove tag / Add tag display rows (filter + sort) are now memoized per render and only the active sub-mode is computed. Switching tabs or reaching them with large queues skips two redundant filter-and-sort passes per render.
- **Tag review — review-log work skipped when collapsed:** The shared Review log only slices/reverses `_activityLog` and renders rows when it is actually expanded. Default-collapsed renders no longer pay for that work.
- **Tag index refresh — single pass:** `_refreshTagIndex` now collects choice-inclusive and choice-exclusive tag sets in one walk over each record’s line items and properties (via a new `collectTagsFromRecordWithChoiceVariants` helper), removing a second full record scan and the duplicate `getLineItems(true)` calls.
- **Excluded-collections check:** `shouldExcludeCollection` lowercases the configured exclude list once per scan instead of on every iteration of the inner `some()` loop.
- **Review Grid apply — O(N+M) lookup:** `_reviewGridApply` indexes per-row targets in a `Map<guid, Map<src, Set<target>>>` and joins by record GUID instead of scanning the full overrides table for each scanned record.
- **Tag analyzer — Levenshtein 2-row DP:** `_tagAnalyzerLevenshtein` now uses a two-row dynamic-programming table (O(min(m, n)) memory) instead of the full O(m·n) matrix, and similarity calculations reuse precomputed per-tag signatures (lowercased token / length cache) so the O(N²) cluster scan stops re-tokenizing the same tags.

**Fixed**

- **Remove tag — body text segments:** `_applyRemoveTagHitsOnRecord` no longer throws `ReferenceError: text is not defined` when removing a hashtag occurrence inside a `body-text-token` segment; the rewritten segment text is now captured from `_removeNthHashtagTokenFromText` and applied correctly.
- **Tag analyzer — manual cluster persistence:** **Change threshold / sensitivity** no longer wipes manual clusters (and clusters that were **Convert to manual**’d). Both that flow and an in-place re-Analyze now preserve manual clusters along with their target picks (`tagAnalyzerReplacements`), the open cluster id (when it points to a kept manual cluster), per-member exclusions, and the manual id counter so newly minted ids never collide.

### What’s new in 1.0.5

**Tag review (advanced) — Add tag, Remove tag, Thymer SDK**

- **Add tag — tab:** Third workflow after **Remove tag**: free-text tag, **Record filter** (title + first two body lines), **Narrow rows**, **Find matches** / **Preview** / **Apply**, review log.
- **Add tag — selection:** Queue rows start with **no** row checked for **Add**; use per-row **Add** or the **Add** column header for visible rows. **Preview** / **Apply** prompt if nothing is marked for add.
- **Add tag — after apply:** Clears the whole Add tab (tag, record filter, narrow rows, sort, queue), then shows the completion summary in the output area.
- **Add tag — apply output:** Summary **counts** (unique marked, attempts, writes, no-write, errors) plus **Updated records** (live title, placement, GUID). **Review log:** one **`applied`** or **`failed`** row per record, plus summary.
- **Remove tag — apply output:** Same summary + **Updated records** list and per-record **Review log** rows as Add tag apply.
- **Add tag — Tags / hashtag property (SDK):** **`record.prop('Tags')`** / **`record.prop('Tag')`** are tried first, then **`getAllProperties()`**. A column counts as **hashtag-typed** if **any** hint among `getType()`, `type`, `propertyType`, `fieldType`, or `kind` equals **`hashtag`** or contains the word **`hashtag`**. The queue also treats a **Tags** / **Tag** column as writable when it supports **`addValue`** or **`set`** + **`texts()`** / **`values()`**, is **not** a choice enum (`choices()` array), and either is hashtag-typed or uses that name (covers API quirks where the type string is not exactly `hashtag`). Among candidates, prefer **Tags** / **Tag**, then names containing `tag`, then **`isMultiValue()`**. Apply uses **`addValue`** when **`isMultiValue()`** is true, otherwise **`texts()`** / **`values()`** + **`set(array)`**. **Stored value:** hashtag-typed fields get the **tag token only** (no leading `#`; Thymer renders `#` — passing `#tag` could show as `##tag`). Plain text–style Tags columns follow existing entries (`#`-prefixed vs plain; empty column defaults to `#tag`). Duplicate checks scan every queueable property. If none qualify: new body line with `#tag` and one trailing space.
- **Tag index / trace:** **`shouldScanTextPropertyForTags`** is true for hashtag-typed properties **or** columns named **Tags** / **Tag**, even when the name does not otherwise contain “tag”.
- **Line items:** Body hashtag segments use the same **`hashtag`** constant as the SDK segment type.

### What’s new in 1.0.4

**Tag review (advanced)**

- **Remove tag:** Sub-workflow under **Advanced workflow** (next to **Review Grid**). Find matches on body hashtag segments, plain `#tags` in text segments, and tag-like **text** properties (same text-field rules as trace; choice/enum fields are not edited). **Preview** / **Apply** with skip/remove columns; apply summary reports **Records modified (writes applied)** based on actual writes (accurate when some rows are skipped). After apply, the remove queue and tag field clear, the tag index refreshes quietly, and the Review Grid inputs/queue reset.
- **Remove tag suggestions:** Tag index refresh also tags **choice-only** tags (present in the full index but not when choice/enum sources are excluded); those tags are omitted from the remove-tag suggestion list.
- **One row per record:** **Review Grid** and **Remove tag** queues collapse multiple hits in the same note to a single row, with a short hint when there are several locations. Rename/remove still apply across every matching location in that record.

### What’s new in 1.0.3

**Updated**

- **Tag analyzer wording:** Updated cluster editing terminology from canonical to target (for example, **Canonical tag** is now **Target tag**).
- **Export JSON toggle behavior:** The button now toggles between **Show export JSON** and **Close export JSON**; clicking again closes the export panel.
- **Tag analyzer quick jumps:** Added **Jump to export JSON** (opens and scrolls) and **Jump to orphan tags** (scrolls; disabled when there are no orphan tags).
- **Orphan tags copy action:** Added **Copy** on the Orphan tags header to copy orphan tags with counts to clipboard.
- **Manual cluster section UX:** **Add manual cluster** is now collapsible with a chevron preface header and starts collapsed by default.
- **Tag suggestion responsiveness:** Improved tag suggestion lookup to prioritize prefix matches and reduce unnecessary sorting work on large tag indexes.
- **Trace copy consistency:** Trace helper wording now matches the action label (**Trace tag source**) for a clearer, consistent UX.
- **Navigation order:** On **Home**, the header **menu** (after **Home**), and the **command palette** (after **Notes Manager: Open**), tool shortcuts are listed **A–Z** by label. The first Home shortcut is still the primary button style (**Assign subpages**).

### What was new in 1.0.2

**Fixed**

- **Tag list with “Exclude choice/enum” on:** The tag index again matches the usual size you’d expect, while still keeping true choice/enum values out of the list. Label-style fields no longer sneak extra tags into the index through the wrong path.
- **Tag trace and Review Grid “Find matches”:** When choice/enum is excluded from the tag list, those views follow the same rules as the index so you don’t see stray matches from fields that shouldn’t count.

**Updates**

- **Suggestion lists everywhere:** Same idea on **Current tag**, **Assign subpages → Parent note**, **Review Grid** source/default/override fields: arrow keys move the highlight, **Enter** picks (or runs **Find matches** on the source field when the floating list isn’t open), **Esc** closes the list. The row under the keyboard is highlighted so you can see what you’re about to pick.
- **Tag analyzer:** Tag index is filled in automatically; set a **usage threshold** and **similarity** slider, then **Analyze** to find merge-style clusters (same clustering idea as the standalone Tag Triage HTML tool). Export a JSON consolidation plan; apply renames separately in **Tag rename** / **Review Grid**.
- **Tag merge:** Added a dedicated **Tag merge** workflow to load/export consolidation-plan JSON and apply merge rows with the same preview/apply scan behavior used by Tag rename.

### What was new in 1.0.1

- **Tag rename (quick):** **⌘/Ctrl+Enter** for preview and **⌘/Ctrl+Shift+Enter** to apply from the Current or New tag fields. Buttons show the same shortcuts in their tooltips.
- **Tag review — Review Grid:** Clearer **queue summary**, **Preview** aligned with a detailed apply plan, **Override** with tag-index suggestions and a **×** to clear.
- **Tag review — finding matches:** **Enter** on the source tag runs **Find matches**; clearing the source drops the queue; default target **Enter** re-runs find when a source is set.
- **After grid rename:** Queue clears, tag index refreshes quietly, fuller summary in the grid output.
- **Group by tag:** Groups follow each row’s matched tag, with group actions and optional open-record from the title.

## Included Tools

(Tools appear in the panel **navigation bar** by group. The header **menu** lists the same tools in **A–Z** order by label, with **Home** first.)

- **Assign subpages**
- **Bulk move notes**
- **Tag analyzer**
- **Tag merge**
- **Tag rename (quick)**
- **Tag review (advanced)**

## Feature Overview

### Shared Panel UX

- Native custom panel: **breadcrumb** in the header (`Home / ...`), grouped **navigation bar** under the header for every mode, then **main** content and the shared **Review log**.
- The **menu** lists tools in **A–Z** order by label (**Home** first, then tools alphabetically).
- Command palette entries for:
  - `Notes Manager: Open`
  - `Notes Manager: Assign subpages`
  - `Notes Manager: Bulk move notes`
  - `Notes Manager: Tag analyzer`
  - `Notes Manager: Tag merge`
  - `Notes Manager: Tag rename (quick)`
  - `Notes Manager: Tag review (advanced)`
- Sidebar shortcut: `Notes Manager`.
- Consistent button, input, and table styling across all tools.

### Bulk Move Notes

- Source/target collection selectors.
- Title filter and optional **show only selected** mode.
- Select all/select none for visible rows.
- Preview-first workflow, then apply.
- Row-level result logging for moved/failed records.
- Refresh action with toast feedback.

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
- Refresh index action with toast feedback.
- Preview and apply workflows with detailed multi-line outputs.
- Preview/apply outputs mirrored to review log.
- **Properties:** For each record, **`prop.texts()`** is read, matching values are rewritten, then **`prop.set([...])`** replaces the full list (multi-value hashtag / text-like tag columns included when they pass the same “text-like for tags” rules as the index). Choice/enum columns use **`setChoice`** when `choices()` is an array.

### Tag Review (Advanced)

- Tag trace workflow with collapsible trace output and copy button.
- **Advanced workflow** toggles **Review Grid**, **Remove tag**, and **Add tag** (shared **Refresh index** and **Matching options**). Choosing **Remove tag** or **Add tag** clears Review Grid source/queue/target fields; **Review Grid** clears both other queues; **Remove tag** and **Add tag** clear each other’s queue when switching between them.
- Review Grid workflow:
  - Source and default target (`#source-tag`, `#default-target`) with tag suggestions; **Enter** runs or re-runs **Find matches** where applicable; clearing the source clears the queue.
  - Queue **build**, **preview** (detailed plan), and **rename** (apply). **Find matches** produces **one row per record** when the same note matches multiple times; the row notes how many tag locations were found.
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
- Uses the same tag-index scope controls (case-sensitive, exclude choice/enum, excluded collections) via shared matching options + **Refresh index**.

### Review Log + Status + Toasts

- Collapsible review log (hidden by default).
- Newest entries shown first.
- Row-level and summary operation entries.
- Save log to JSON.
- Status messages shown at bottom and toast notifications for non-logged status updates.
- Preview outputs are mirrored to the log for all tools.

### Persistence

- Local settings persisted between sessions for:
  - Default mode
  - Bulk move display preference
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

- **Apply appears to do nothing**
  - Run **Preview** first and confirm rows are included.
  - Check Review Grid row actions (`Default`, `Skip`, `Override tag`) to ensure rows are runnable.

- **Can’t find operation details**
  - Expand **Review log** (it is collapsed by default).
  - Use **Save log JSON** for full output/history export.

## Implementation Notes

- Built on Thymer SDK APIs (`AppPlugin`, UI panel APIs, data/record APIs). Property and segment **`hashtag`** handling follows [thymerapp/thymer-plugin-sdk](https://github.com/thymerapp/thymer-plugin-sdk) `types.d.ts` (`PluginProperty`, `PluginRecord.prop`, `PROP_TYPE_HASHTAG`).
- Single-file implementation for runtime logic: `notes-manager-plugin.js`.
