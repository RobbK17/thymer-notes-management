# Thymer Notes Management Plugin

Unified Thymer custom panel for bulk note operations and advanced tag workflows.

## Version

- **Current version:** `1.0.2`

### What’s new in 1.0.2

**Fixed**

- **Tag list with “Exclude choice/enum” on:** The tag index again matches the usual size you’d expect, while still keeping true choice/enum values out of the list. Label-style fields no longer sneak extra tags into the index through the wrong path.
- **Tag trace and Review Grid “Find matches”:** When choice/enum is excluded from the tag list, those views follow the same rules as the index so you don’t see stray matches from fields that shouldn’t count.

**Updates**

- **Suggestion lists everywhere:** Same idea on **Current tag**, **Assign subpages → Parent note**, **Review Grid** source/default/override fields: arrow keys move the highlight, **Enter** picks (or runs **Find matches** on the source field when the floating list isn’t open), **Esc** closes the list. The row under the keyboard is highlighted so you can see what you’re about to pick.

### What was new in 1.0.1

- **Tag rename (quick):** **⌘/Ctrl+Enter** for preview and **⌘/Ctrl+Shift+Enter** to apply from the Current or New tag fields. Buttons show the same shortcuts in their tooltips.
- **Tag review — Review Grid:** Clearer **queue summary**, **Preview** aligned with a detailed apply plan, **Override** with tag-index suggestions and a **×** to clear.
- **Tag review — finding matches:** **Enter** on the source tag runs **Find matches**; clearing the source drops the queue; default target **Enter** re-runs find when a source is set.
- **After grid rename:** Queue clears, tag index refreshes quietly, fuller summary in the grid output.
- **Group by tag:** Groups follow each row’s matched tag, with group actions and optional open-record from the title.

## Included Tools

- **Bulk move notes**
- **Assign subpages**
- **Tag rename (quick)**
- **Tag review (advanced)**

## Feature Overview

### Shared Panel UX

- Native custom panel with top menu and breadcrumb path (`Home / ...`).
- Command palette entries for:
  - `Open Notes Manager`
  - `Notes Manager: Bulk move notes`
  - `Notes Manager: Assign subpages`
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
