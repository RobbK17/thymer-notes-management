# Thymer Notes Management Plugin

Unified Thymer custom panel for bulk note operations and advanced tag workflows.

## Version

- **Current version:** `1.0.3`

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

(List order matches the Home screen and menu: A–Z by label.)

- **Assign subpages**
- **Bulk move notes**
- **Tag analyzer**
- **Tag merge**
- **Tag rename (quick)**
- **Tag review (advanced)**

## Feature Overview

### Shared Panel UX

- Native custom panel with top menu and breadcrumb path (`Home / ...`).
- **Home** and the **menu** list tools in **A–Z** order by label (menu keeps **Home** first, then tools alphabetically).
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

### Tag Review (Advanced)

- Tag trace workflow with collapsible trace output and copy button.
- Review Grid workflow:
  - Source and default target (`#source-tag`, `#default-target`) with tag suggestions; **Enter** runs or re-runs **Find matches** where applicable; clearing the source clears the queue.
  - Queue **build**, **preview** (detailed plan), and **rename** (apply).
  - **Meta line:** visible vs total rows, plus counts for default / skip / override.
  - Filter and sort, including **Group by tag** (per matched tag, with group default/skip and open-record from the title when grouped).
  - Sticky grid header + sticky first column.
  - Per-row **Default** / **Skip** / **Override** (suggestions from the tag index; **×** to clear an override).
  - Header-level default/skip checkboxes for visible rows.
- After a successful grid **Rename**, the queue clears and the tag index updates quietly; read the summary in the grid output area.
- Review Grid preview/apply outputs mirrored to review log.

### Tag analyzer

- Opens from **Home** or the command palette. Tag names and counts come from the **same tag index** as rename/review (no manual paste).
- **Usage threshold:** tags at or below this use-count are “low-use” seeds for clustering (slider max grows with your data).
- **Similarity sensitivity:** 15–70% (same role as the reference tool: lower = looser string/token matches, higher = stricter). Clustering blends normalized Levenshtein, token Jaccard, and a small bonus when one tag contains the other (tokenization uses letters and numbers in any language).
- **Analyze** builds clusters (expand a row to pick a target tag or type one), lists **orphan** low-use tags that matched no cluster, and shows **Potential savings** (same count formula as the reference).
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

1. Open one of the tools from the top menu (or command palette).
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

- Built on Thymer SDK APIs (`AppPlugin`, UI panel APIs, data/record APIs).
- Single-file implementation for runtime logic: `notes-manager-plugin.js`.
