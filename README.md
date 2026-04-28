# Thymer Notes Management Plugin

Unified Thymer custom panel for bulk note operations and advanced tag workflows.

## Version

- **Current version:** `1.0.0`

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

- Incremental parent note search with in-field clear button.
- Child filtering with in-field clear button.
- Supports assign and unassign flows.
- All-visible checkbox support.
- Optional hide rows already marked `child of:`.
- Preview-first workflow, then apply with row-level logging.

### Tag Rename (Quick)

- `Current tag` (`#current-tag`) and `New tag` inputs.
- Incremental suggestions for current tag.
- Matching options (collapsible):
  - Case-sensitive matching
  - Exclude choice/enum values from tag index
  - Exclude collections by name or GUID
- Refresh index action with toast feedback.
- Preview and apply workflows with detailed multi-line outputs.
- Preview/apply outputs mirrored to review log.

### Tag Review (Advanced)

- Tag trace workflow with collapsible trace output and copy button.
- Review Grid workflow:
  - Source/default target inputs (`#source-tag`, `#default-target`)
  - Queue build, preview, and apply
  - Filter and sort controls, including **Group by tag**
  - Sticky grid header + sticky first column
  - Per-row `Default` / `Skip` / `Override tag` controls
  - Header-level default/skip checkboxes for visible rows
  - Queue meta shows **visible vs total** rows
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
