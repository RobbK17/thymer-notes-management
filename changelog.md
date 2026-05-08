# Changelog (detailed archive)

This file holds the **full** per-release notes that previously lived under **Version** in [README.md](./README.md). [README.md](./README.md) now has a shorter summary; for **current** behavior, see **Feature Overview** there.

---

- **Current version:** `1.0.14`

### What’s new in 1.0.14

**Delete notes confirmation + preview clarity**

- Bulk delete preview now writes a detailed tree listing to the review log: selected root record titles plus selected child titles beneath each root when subtree delete is enabled.

- Preview status/summary now reports `roots selected`, `descendants`, and `total records to trash` with plural-aware wording; this same one-line summary is also the first line of the preview log entry.

- Browser `confirm()` / `prompt()` dialogs were replaced with an in-panel **Confirm Move to Trash** modal that includes Cancel/Apply actions and keyboard/backdrop close behavior.

- Large delete typed confirmation (`TRASH`) now occurs inside that modal before apply.

- The temporary **selected only** scope option for the Delete-children header toggle was removed; header toggle behavior is now consistently based on visible eligible rows.

### What’s new in 1.0.13

**Delete notes (bulk) follow-up**

- Header controls now emphasize visibility-based selection: **Select visible** for row selection, and **Delete children (visible)** for subtree toggles.

- Row-level **Delete children** checkboxes render only when a row truly has descendants.

- Children summary pills now report descendant totals in-scope (`records` and `selected`) instead of simple parent-row counts.

- Bulk delete preview now logs a compact root tree summary (`self only` / `self + N descendants`) so subtree impact is clearer before apply.

- Large delete runs now require typed confirmation (`TRASH`) after confirm when the preview set is big.

- After apply, failed root selections (and their delete-children intent) are preserved across record reload for retry.

### What’s new in 1.0.12

**Bulk operations**

- **Move** and **Delete** now appear as separate actions under the **Bulk** group. The previous **Bulk move** naming was shortened to **Move** across menu/nav/commands.

- New **Delete Notes** screen reuses the Move UX pattern (source collection, filter, show only selected, select all/none, preview, refresh) and applies with **Move to Trash** using `record.trash()`.

- Delete runs include row-level review-log entries (`applied`/`failed`) and a summary status line (`Bulk delete apply complete: X ok, Y failed.`).

### What’s new in 1.0.11

**Home — Quick search**

- **Footer (`nm-status`) vs in-page counts:** When a home search finishes, **`_setStatus`** now runs **before** **`_render`**, so the bottom status line is built from the same summary as the quick-search result line (no longer one render behind).

- **Search everywhere — Tags header:** On the same line as the **Tags** section title, **Reindex tags & refresh search** runs **`_ensureTagLoaded(true)`** (full tag index rebuild, same idea as **Refresh index** in tag tools) and then **`_runHomeSearch()`** when the query is non-empty. Disabled while a search is already running.

- **Alphabetical result ordering**
  - **Notes only:** After the scan, stored note rows (up to 500 for paging) are sorted **A–Z by note title**, then **collection name** (case-insensitive `localeCompare`). The 500 rows kept are still the first 500 **matches in collection/record walk order** before that sort.
  - **Search everywhere — Tags:** Matching tags are sorted **A–Z by tag name** (replacing sort by usage count descending).
  - **Search everywhere — Collections:** In-scope user collections are sorted **A–Z by name** before name matching, so the first 25 name hits follow alphabetical collection order.
  - **Search everywhere — Notes:** All matching notes in scope are collected, sorted **A–Z by title** (then collection), then the list is **capped at 25** for display with the usual “first 25” hint when there are more matches.

### What’s new in 1.0.10

**Menu → Help**

- The header **☰** menu ends with **Help** (after a divider), opening a modal with the **Overview**, **Structure**, **Bulk**, and **Tags** blurbs (the same text that used to sit under Home **Quick search**). Close with **Esc**, **×**, the dimmed backdrop, or by picking another tool from the menu or nav bar.

**Home — Quick search (notes default + Search everywhere)**

- **Intro:** Home points you to **menu → Help** for the tool-group overview; the page focuses on **Quick search** below the short welcome line.
- **Default (off):** Notes only: **title + body** word-AND, same **excluded collections** scope as tag tools. The scan **counts every match**; the list **pages in groups of 25** (**First** / **Prev 25** / **Next 25** / **Last** on the status line). Up to **500** hits are kept in memory for paging; if there are more matches than that, the total is still exact and a short note explains that paging covers the first 500 listed rows.
- **Search everywhere (notes, tags & collections):** Optional checkbox (saved in local settings). When on, one query fills **three sections**: **Notes** (same scan as default), **Tags** (substring match on **tag index** names, sorted by usage count; use any tag tool’s **Refresh index** if the list is empty), **Collections** (user collections not excluded by matching options; name substring match). Up to **25** rows per section; tags and collections render first, then notes (**Searching…** until the note scan finishes). **Try/catch** around both notes-only and everywhere runs so failures clear the “searching” state and show an error in **`nm-status`**.
- **Row clicks (what each hit does):** **Note** row → opens that note in the **other** Thymer panel (same behavior as Review Grid **open in other panel**). **Tag** row → switches to **Tag rename (quick)** with **Current tag** prefilled to that tag. **Collection** row → switches to **Bulk move** with that collection as **source** (only if it still appears in Bulk move’s source list after collections load).

### What’s new in 1.0.9

**Home — Quick search (initial)**

- On **Home**, below the intro paragraph: a compact **Quick search** field (debounced while typing, **Enter** or **Search** to run immediately, **Clear** to reset).
- Finds notes whose **title and/or body** (line-item text, capped per note for speed) contain **every** whitespace-separated word, case-insensitive. Same **collection scope** as tag tools (**excluded collections** from Tag rename matching options).
- Introduced a **dense scrollable** note list (title + collection). **Extended in 1.0.10:** optional **Search everywhere** (tags + collections) and **notes-only** paging with full match counts (see **What’s new in 1.0.10** and **Home — Quick search** under Feature Overview).

### What’s new in 1.0.8

**Status line vs toasts (consistent “log + footer” for heavy tools)**

- **`nm-status` and review log** are the primary place for preview/apply/find-match completion text. When the same story is already written to the **review log** (or the footer line is intentionally short), `_setStatus` is called with **`logged: true`**, which updates the footer **without** also firing a duplicate **toast**.
- Applies to: **Tag merge** preview/apply, **Bulk move** and **Assign subpages** apply summaries (plus a **`summary`** log row for each), **Review Grid / Add tag / Remove tag** “Find matches” meta line, and **Tag trace** (log full trace first, then one-line status).
- **Bulk move → Refresh:** Writes a short line to the **review log** and **`nm-status`** instead of a toaster-only message (includes how many rows are shown after filter).
- **Refresh index** (tag tools): The extra **“Index refreshed.”** toaster after a successful refresh was removed; the index run already updates **`nm-status`** and logs **`tag-index`**.
- **Unchanged:** Small **toasts** remain for things that are not full tool runs — validation nudges, clipboard/save/export, Tag analyzer inline adds, Tag merge JSON load feedback, etc.

### What’s new in 1.0.7

**Target tag — record counts in preview and apply**

- **Tag rename (quick):** Preview and apply summaries now include how many **distinct scannable notes** have the **New tag** in the current tag index **before** the run, plus a **predicted** after count (preview) or **actual** after count (apply, after a quiet index refresh). The delta counts notes that would gain / did gain that tag from this rename and did not already have it.
- **Tag review → Review Grid:** **Preview** and successful **Apply** append a **per-target** block (default target and each override target) with the same before / predicted or actual after semantics. Conflicts where one source maps to multiple targets on the same note are excluded from the prediction, matching apply behavior.
- **Tag merge:** After the per-row preview lines, a per-target **predicted** block is added. After apply, an **actual** block is added immediately after the index refresh (before residual source-tag checks). Merge preview prediction walks each distinct target and counts notes that would gain that tag from any non-skipped `from` row without already having the target.

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
