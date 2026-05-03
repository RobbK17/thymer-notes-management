/** @see thymerapp/thymer-plugin-sdk types.d.ts PROP_TYPE_HASHTAG, PLUGIN_LINE_ITEM_SEGMENT_TYPE_HASHTAG */
const THYMER_TYPE_HASHTAG = 'hashtag';

const NOTES_MANAGER_VERSION = '1.0.6';

class NotesManagerPanel {
    constructor(plugin) {
        this.plugin = plugin;
        this._panel = null;
        this._mode = 'home';
        this._status = '';
        this._lastLoggedDetail = '';
        this._listenerAbort = null;
        // Per-render memoization for the three *RowsForDisplay helpers. Set to {} at the
        // start of _render(), cleared to null at the end so click handlers between renders
        // never see stale filtered/sorted snapshots after state mutations.
        this._displayRowsCache = null;

        this._settingsKey = 'notes-manager-settings-v1';
        this._settings = {
            defaultMode: 'home',
            bulkOnlySelectedDefault: false,
            assignHideChildOfDefault: false,
            tagCaseSensitiveDefault: true,
            tagExcludeChoiceValuesDefault: false,
            tagExcludedCollectionsDefault: '',
            reviewLogCollapsed: true,
        };

        this._activityLog = [];

        this._bulkMoveState = {
            initialized: false,
            loading: false,
            running: false,
            collections: [],
            sourceGuid: '',
            targetGuid: '',
            records: [],
            filtered: [],
            selectedGuids: new Set(),
            filterText: '',
            onlySelected: false,
            previewRows: [],
        };

        this._assignState = {
            initialized: false,
            loading: false,
            running: false,
            allRecords: [],
            recordMap: new Map(),
            parentGuid: '',
            parentQuery: '',
            parentSearchOpen: false,
            parentSuggestActiveIndex: -1,
            filterText: '',
            hideChildOfRows: false,
            rows: [],
            previewRows: [],
        };

        this._tagMergeState = {
            rows: [],
            parseNotes: [],
            fileName: '',
            output: '',
            running: false,
            rowIdSeq: 0,
            totalsOpen: false,
        };

        this._tagState = {
            initialized: false,
            running: false,
            oldTag: '',
            newTag: '',
            caseSensitive: true,
            excludeChoiceValues: false,
            excludedCollectionsRaw: '',
            oldSearchOpen: false,
            previewRows: [],
            advancedOpen: false,
            tagIndex: [],
            indexMeta: 'Tag index not loaded yet.',
            suggestActiveIndex: -1,
            refreshInFlight: false,
            refreshRerunWanted: false,
            refreshPromise: null,
            traceOutput: '',
            traceOpen: false,
            reviewGridSourceTag: '',
            reviewGridSourceSearchOpen: false,
            reviewGridDefaultTarget: '',
            reviewGridFilter: '',
            reviewGridSort: 'title-asc',
            reviewGridRows: [],
            reviewGridCollapsedSources: new Set(),
            reviewGridMeta: 'No queue built.',
            reviewGridOutput: '',
            tagReviewSubMode: 'grid',
            removeTagTag: '',
            removeTagSearchOpen: false,
            removeTagFilter: '',
            removeTagSort: 'title-asc',
            removeTagRows: [],
            removeTagMeta: 'No queue built.',
            removeTagOutput: '',
            addTagTag: '',
            addTagRecordFilter: '',
            addTagTableFilter: '',
            addTagSort: 'title-asc',
            addTagRows: [],
            addTagMeta: 'No queue built.',
            addTagOutput: '',
            /** Tags that appear in the full index but not when choice/enum sources are excluded (suggest filter for Remove tag). */
            tagChoiceOnlyTags: new Set(),
            excludedPickerOpen: false,
            excludedPickerFilter: '',
            excludePickerCollections: [],
            tagAnalyzerThreshold: 5,
            tagAnalyzerSimPercent: 35,
            tagAnalyzerPhase: 'setup',
            tagAnalyzerClusters: [],
            tagAnalyzerOrphans: [],
            tagAnalyzerOpenClusterId: null,
            tagAnalyzerReplacements: {},
            tagAnalyzerExportVisible: false,
            tagAnalyzerLastLowCount: 0,
            tagAnalyzerClusterOrder: 'processed',
            tagAnalyzerManualOpen: false,
            tagAnalyzerPickFilter: '',
            tagAnalyzerPickSelected: [],
            tagAnalyzerNextClusterId: 100000,
            // Per-cluster "+ Add tag" inline input value, keyed by cluster id.
            tagAnalyzerAddInputs: {},
            // Per-cluster picker (only one open at a time).
            tagAnalyzerAddPickerOpenId: null,
            tagAnalyzerAddPickerFilter: '',
            tagAnalyzerAddPickerSelected: [],
        };
    }

    load() {
        this._loadSettings();
        this._mode = this._settings.defaultMode || 'home';
        this.plugin.ui.injectCSS(
            '.nm-root{width:100%;height:100%;box-sizing:border-box;padding:0 0 20px;}' +
            '.nm-header{display:flex;align-items:center;padding:24px 0 20px;width:100%;box-sizing:border-box}' +
            '.nm-header-left{display:flex;align-items:center;gap:8px;flex:1}' +
            '.nm-header-right{display:flex;align-items:center;justify-content:flex-end;flex:1}' +
            '.nm-header-crumb{font-size:16px;opacity:.45;font-weight:500;padding:2px 0}' +
            '.nm-menu-wrap{position:relative;flex-shrink:0}' +
            '.nm-menu-trigger{display:flex;align-items:center;gap:8px;cursor:pointer}' +
            '.nm-hamburger{background:none;border:none;cursor:pointer;color:inherit;font-size:18px;line-height:1;padding:1px 5px;opacity:.3;transition:opacity .15s;border-radius:4px}' +
            '.nm-hamburger:hover{opacity:.7}' +
            '.nm-dropdown{position:absolute;top:calc(100% + 6px);left:0;background:var(--input-bg-color);border:1px solid var(--input-border-color);border-radius:var(--ed-radius-block);padding:4px;min-width:220px;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.35)}' +
            '.nm-dropdown-item{display:block;width:100%;text-align:left;background:none;border:none;cursor:pointer;color:inherit;font-size:14px;padding:10px 14px;border-radius:var(--ed-radius-normal);transition:background .1s,color .1s}' +
            '.nm-dropdown-item:hover{background:var(--ed-button-primary-bg);color:var(--ed-button-primary-text)}' +
            '.nm-card{padding:14px;background:var(--cards-bg);border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);box-shadow:var(--color-shadow-cards);margin-bottom:12px}' +
            '.nm-title{font-size:14px;font-weight:600;margin:0 0 10px}' +
            '.nm-text{font-size:13px;opacity:.7;line-height:1.45;margin:0 0 12px}' +
            '.nm-actions{display:flex;gap:8px;flex-wrap:wrap}' +
            '.nm-btn{background:color-mix(in srgb,var(--cards-bg) 70%, var(--input-bg-color) 30%);border:2px solid color-mix(in srgb,var(--sidebar-border-color) 60%, var(--input-text-color,#ffffff) 40%);color:inherit;cursor:pointer;font-size:13px;font-weight:600;padding:7px 12px;border-radius:var(--ed-radius-normal);box-shadow:0 2px 6px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.08);transition:background .1s,border-color .1s,box-shadow .1s,transform .05s}' +
            '.nm-btn:hover{background:color-mix(in srgb,var(--cards-hover-bg) 55%, var(--input-bg-color) 45%);border-color:color-mix(in srgb,var(--sidebar-border-color) 42%, var(--input-text-color,#ffffff) 58%);box-shadow:0 4px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.1)}' +
            '.nm-btn:active{transform:translateY(1px);box-shadow:0 2px 4px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.06)}' +
            '.nm-btn:focus-visible{outline:2px solid var(--ed-button-primary-bg,#4c8dff);outline-offset:2px}' +
            '.nm-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}' +
            '.nm-btn--secondary{background:color-mix(in srgb,var(--cards-bg) 78%, var(--input-bg-color) 22%)}' +
            '.nm-status{font-size:12px;opacity:.7;padding:4px 2px;white-space:pre-line}' +
            '.nm-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}' +
            '.nm-field{display:flex;flex-direction:column;gap:6px}' +
            '.nm-label{font-size:12px;opacity:.6}' +
            '.nm-select,.nm-input{width:100%;box-sizing:border-box;background:var(--input-bg-color);border:1px solid var(--input-border-color);color:inherit;border-radius:var(--ed-radius-normal);padding:7px 8px;font-size:13px;outline:none}' +
            '.nm-list{border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);overflow:hidden}' +
            '.nm-list-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--cards-border-color)}' +
            '.nm-pill{font-size:11px;opacity:.7;padding:2px 7px;border:1px solid var(--sidebar-border-color);border-radius:999px}' +
            '.nm-list-rows{max-height:280px;overflow:auto}' +
            '.nm-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--cards-border-color)}' +
            '.nm-row:last-child{border-bottom:none}' +
            '.nm-row-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}' +
            '.nm-row-meta{font-size:11px;opacity:.45}' +
            '.nm-inline{display:flex;align-items:center;gap:8px}' +
            '.nm-muted{font-size:12px;opacity:.55}' +
            '.nm-bulk-summary{margin:0 0 10px;font-size:12px;opacity:.7}' +
            '.nm-table{width:100%;border-collapse:collapse;font-size:13px}' +
            '.nm-table-wrap{border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);overflow:auto;max-height:280px}' +
            '.nm-table th,.nm-table td{padding:8px 10px;border-bottom:1px solid var(--cards-border-color);text-align:left}' +
            '.nm-table tbody tr:hover{background:var(--cards-hover-bg)}' +
            '.nm-table th{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:.04em}' +
            '.nm-rg-wrap{max-height:520px}' +
            '.nm-rg-table{min-width:920px;table-layout:fixed}' +
            '.nm-rg-table thead th{position:sticky;top:0;z-index:3;background:var(--cards-bg);opacity:.85}' +
            '.nm-rg-table thead th:first-child{z-index:6}' +
            '.nm-rg-table th:first-child,.nm-rg-table td:first-child{position:sticky;left:0;z-index:4;background:var(--cards-bg);box-shadow:6px 0 8px -8px rgba(0,0,0,.55);border-right:1px solid var(--cards-border-color)}' +
            '.nm-rg-table tbody tr:hover td{background:var(--cards-hover-bg)}' +
            '.nm-rg-table tbody tr:hover td:first-child{background:var(--cards-hover-bg)}' +
            '.nm-rg-table tr.nm-rg-group-row td:first-child{position:static;left:auto;z-index:auto;background:transparent;box-shadow:none;border-right:none}' +
            '.nm-rg-title-open{cursor:pointer;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentcolor 35%,transparent);text-underline-offset:2px}' +
            '.nm-rg-source-host,.nm-rg-override-wrap{position:relative}' +
            '.nm-rg-suggest{position:absolute;left:0;right:0;top:calc(100% + 2px);max-height:200px;overflow:auto;background:var(--cards-bg);border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);z-index:45;display:none;box-shadow:var(--color-shadow-cards)}' +
            '.nm-rg-suggest-row{display:block;width:100%;text-align:left;background:none;border:none;color:inherit;cursor:pointer;padding:8px 10px;font-size:13px;border-bottom:1px solid var(--cards-border-color)}' +
            '.nm-rg-suggest-row:last-child{border-bottom:none}' +
            '.nm-rg-suggest-row:hover,.nm-rg-suggest-row.nm-rg-suggest-row--active{background:var(--cards-hover-bg)}' +
            '.nm-status-ok{color:var(--ed-success-color,#2c8a2c)}' +
            '.nm-status-warn{color:var(--ed-warning-color,#b07b00)}' +
            '.nm-status-ico-row{display:inline-flex;align-items:center;gap:6px;vertical-align:middle}' +
            '.nm-status-tri,.nm-status-go{display:block;flex-shrink:0}' +
            '.nm-parent-search-wrap{position:relative}' +
            '.nm-input-wrap{position:relative;width:100%}' +
            '.nm-input-wrap .nm-input{padding-right:28px}' +
            '.nm-parent-list{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:30;max-height:220px;overflow:auto;background:var(--cards-bg);border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);box-shadow:var(--color-shadow-cards)}' +
            '.nm-parent-opt{display:block;width:100%;text-align:left;background:none;border:none;color:inherit;cursor:pointer;padding:8px 10px;font-size:13px;border-bottom:1px solid var(--cards-border-color)}' +
            '.nm-parent-opt:last-child{border-bottom:none}' +
            '.nm-parent-opt:hover,.nm-parent-opt.nm-parent-opt--active{background:var(--cards-hover-bg)}' +
            '.nm-parent-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:2;background:none;border:none;cursor:pointer;color:var(--ed-gray-text);font-size:15px;line-height:1;opacity:.7;padding:2px 4px;border-radius:4px}' +
            '.nm-parent-clear:hover{opacity:1;background:var(--cards-hover-bg)}' +
            '.nm-exclude-picker-host{position:relative;width:100%}' +
            '.nm-exclude-col-wrap{position:relative;width:100%}' +
            '.nm-exclude-col-wrap .nm-input{padding-right:28px}' +
            '.nm-exclude-picker-panel{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:35;max-height:260px;overflow:auto;background:var(--cards-bg);border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);box-shadow:var(--color-shadow-cards);padding:8px}' +
            '.nm-exclude-picker-row{display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--cards-border-color);cursor:pointer}' +
            '.nm-exclude-picker-row:last-child{border-bottom:none}' +
            '.nm-exclude-picker-row:hover{background:var(--cards-hover-bg)}' +
            '.nm-review{margin-top:12px;border-top:1px dashed var(--cards-border-color);padding-top:10px}' +
            '.nm-review-head{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}' +
            '.nm-review-title{font-size:13px;font-weight:600;opacity:.75}' +
            '.nm-review-body{margin-top:10px}' +
            '.nm-shell-nav{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 16px;padding:10px 0 14px;border-bottom:1px solid var(--cards-border-color);margin-bottom:4px}' +
            '.nm-shell-group{display:flex;flex-wrap:wrap;align-items:center;gap:6px}' +
            '.nm-shell-group-label{font-size:11px;font-weight:600;opacity:.45;text-transform:uppercase;letter-spacing:.04em;margin-right:4px}' +
            '.nm-shell-nav-item{background:color-mix(in srgb,var(--cards-bg) 75%, var(--input-bg-color) 25%);border:1px solid var(--sidebar-border-color);color:inherit;cursor:pointer;font-size:12px;font-weight:600;padding:5px 10px;border-radius:var(--ed-radius-normal)}' +
            '.nm-shell-nav-item:hover{background:var(--cards-hover-bg)}' +
            '.nm-shell-nav-item--on{border-color:color-mix(in srgb,var(--ed-button-primary-bg,#4c8dff) 55%, var(--sidebar-border-color));box-shadow:0 0 0 1px color-mix(in srgb,var(--ed-button-primary-bg,#4c8dff) 35%,transparent)}' +
            '.nm-shell-main{min-height:0}' +
            '.nm-log-table-wrap{border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);overflow:auto;max-height:200px}' +
            '.nm-log-table{width:100%;border-collapse:collapse;font-size:12px}' +
            '.nm-log-table th,.nm-log-table td{padding:6px 8px;border-bottom:1px solid var(--cards-border-color);text-align:left;white-space:nowrap}' +
            '.nm-log-table td:last-child{max-width:420px;white-space:normal}' +
            '.nm-adv{margin-top:10px;border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);padding:8px}' +
            '.nm-adv-head{display:flex;align-items:center;justify-content:space-between;cursor:pointer}' +
            '.nm-adv-body{margin-top:8px}' +
            '@media(max-width:700px){.nm-field-grid{grid-template-columns:1fr}}' +
            '.nm-ta-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}' +
            '@media(max-width:560px){.nm-ta-stat-grid{grid-template-columns:repeat(2,1fr)}}' +
            '.nm-ta-stat-grid--4{grid-template-columns:repeat(4,1fr)}' +
            '@media(max-width:560px){.nm-ta-stat-grid--4{grid-template-columns:repeat(2,1fr)}}' +
            '.nm-ta-stat-card{border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);padding:8px;text-align:center}' +
            '.nm-ta-stat-val{font-size:1.25rem;font-weight:700;line-height:1.2}' +
            '.nm-ta-stat-lbl{font-size:11px;opacity:.65;text-transform:uppercase;margin-top:4px}' +
            '.nm-ta-cluster{border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);margin-bottom:8px;overflow:hidden}' +
            '.nm-ta-cluster--open{border-color:color-mix(in srgb,var(--cards-border-color) 40%,var(--ed-accent-color,#5b9cf5))}' +
            '.nm-ta-cluster-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:pointer;gap:8px;flex-wrap:wrap}' +
            '.nm-ta-cluster-head:hover{background:var(--cards-hover-bg)}' +
            '.nm-ta-cluster-detail{padding:0 12px 12px;border-top:1px solid var(--cards-border-color);display:none}' +
            '.nm-ta-cluster-detail--open{display:block}' +
            '.nm-ta-pills{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
            '.nm-ta-pill{font-size:12px;padding:4px 10px;border:1px solid var(--cards-border-color);border-radius:6px;background:var(--cards-bg);cursor:pointer}' +
            '.nm-ta-pill--on{border-color:var(--cards-border-color);outline:2px solid color-mix(in srgb,currentcolor 35%,transparent)}' +
            '.nm-ta-mpill{display:inline-flex;align-items:stretch;font-size:12px;border:1px solid var(--cards-border-color);border-radius:6px;background:var(--cards-bg);overflow:hidden}' +
            '.nm-ta-mpill--on{outline:2px solid color-mix(in srgb,currentcolor 35%,transparent)}' +
            '.nm-ta-mpill--excluded{opacity:.55}' +
            '.nm-ta-mpill--excluded .nm-ta-mpill-text{text-decoration:line-through}' +
            '.nm-ta-mpill-text{padding:4px 10px;border:none;background:transparent;cursor:pointer;color:inherit;font:inherit}' +
            '.nm-ta-mpill-text:hover{background:var(--cards-hover-bg)}' +
            '.nm-ta-mpill-x{padding:4px 8px;border:none;border-left:1px solid var(--cards-border-color);background:transparent;cursor:pointer;color:inherit;font:inherit;line-height:1;opacity:.7}' +
            '.nm-ta-mpill-x:hover{background:var(--cards-hover-bg);opacity:1}' +
            '.nm-ta-convert-manual{font-size:11px;padding:2px 8px;border:1px solid var(--cards-border-color);border-radius:6px;background:var(--cards-bg);cursor:pointer;color:inherit}' +
            '.nm-ta-convert-manual:hover{background:var(--cards-hover-bg)}' +
            '.nm-ta-cluster-warn{font-size:11px;color:var(--ed-warn-color,#c98b1c);margin-left:6px}' +
            '.nm-ta-add-row{margin-top:10px;padding:8px;border:1px dashed var(--cards-border-color);border-radius:6px}' +
            '.nm-ta-add-input-wrap{display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
            '.nm-ta-add-input{flex:1 1 200px;min-width:160px}' +
            '.nm-ta-add-suggest{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
            '.nm-ta-add-suggest-pill{font-size:12px;padding:3px 8px;border:1px solid var(--cards-border-color);border-radius:6px;background:var(--cards-bg);cursor:pointer;color:inherit}' +
            '.nm-ta-add-suggest-pill:hover{background:var(--cards-hover-bg)}' +
            '.nm-ta-add-picker{margin-top:8px;padding:8px;border:1px solid var(--cards-border-color);border-radius:6px;background:var(--cards-bg)}' +
            '.nm-ta-export-pre{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:var(--cards-bg);border:1px solid var(--cards-border-color);border-radius:6px;padding:10px;overflow:auto;max-height:260px;white-space:pre-wrap;word-break:break-word}' +
            'input[type=range].nm-ta-range{width:100%}'
        );
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Open', icon: 'list-tree', onSelected: () => this._openPanel('home') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Assign subpages', icon: 'list-tree', onSelected: () => this._openPanel('assign-parent') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Bulk move notes', icon: 'list-tree', onSelected: () => this._openPanel('bulk-move') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Tag analyzer', icon: 'list-tree', onSelected: () => this._openPanel('tag-analyzer') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Tag merge', icon: 'list-tree', onSelected: () => this._openPanel('tag-merge') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Tag rename (quick)', icon: 'list-tree', onSelected: () => this._openPanel('tag-rename') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Tag review (advanced)', icon: 'list-tree', onSelected: () => this._openPanel('tag-review') });
        this.plugin.ui.addSidebarItem({ label: 'Notes Manager', icon: 'list-tree', tooltip: 'Open Notes Manager', onClick: () => this._openPanel() });
        this.plugin.ui.registerCustomPanelType('notes-manager-panel', panel => {
            this._panel = panel;
            panel.setTitle('Notes Manager');
            (async () => {
                if (this._mode === 'bulk-move') await this._ensureBulkMoveLoaded();
                if (this._mode === 'assign-parent') await this._ensureAssignLoaded();
                if (this._mode === 'tag-rename' || this._mode === 'tag-review' || this._mode === 'tag-analyzer' || this._mode === 'tag-merge') await this._ensureTagLoaded(true);
                this._render(panel);
            })();
        });
    }

    async _openPanel(mode = null) {
        if (mode) {
            this._mode = mode;
            this._settings.defaultMode = mode;
            this._saveSettings();
        }
        let panel = this.plugin.ui.getActivePanel();
        if (!panel) panel = await this.plugin.ui.createPanel();
        if (panel) panel.navigateToCustomType('notes-manager-panel');
    }

    _crumbForMode() {
        return {
            home: 'Home',
            'bulk-move': 'Bulk move notes',
            'assign-parent': 'Assign subpages',
            'tag-rename': 'Tag rename (quick)',
            'tag-review': 'Tag review (advanced)',
            'tag-analyzer': 'Tag analyzer',
            'tag-merge': 'Tag merge',
        }[this._mode] || 'Home';
    }

    _breadcrumbPath() {
        const current = this._crumbForMode();
        if (this._mode === 'home') return 'Home';
        return `Home / ${current}`;
    }

    _menuHTML() {
        const breadcrumb = this._breadcrumbPath();
        return `<div class="nm-menu-wrap"><div class="nm-menu-trigger"><button class="nm-hamburger"><i class="ti ti-menu-2"></i></button><span class="nm-header-crumb">${breadcrumb}</span></div><div class="nm-dropdown" hidden><button class="nm-dropdown-item" data-action="set-mode" data-mode="home">Home</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="assign-parent">Assign subpages</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="bulk-move">Bulk move notes</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="tag-analyzer">Tag analyzer</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="tag-merge">Tag merge</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="tag-rename">Tag rename (quick)</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="tag-review">Tag review (advanced)</button></div></div>`;
    }

    _statusHTML() {
        return this._status ? `<div class="nm-status">${this._escape(this._status)}</div>` : '';
    }

    _sharedTailHTML() {
        return `${this._buildReviewLogSection()}${this._statusHTML()}`;
    }

    _tagAdvancedState(st) {
        const bits = [];
        if (!st.caseSensitive) bits.push('Case-insensitive');
        if (!st.excludeChoiceValues) bits.push('Choice included');
        const excludedCount = this._parseExcludedCollections(st.excludedCollectionsRaw).length;
        if (excludedCount > 0) bits.push(`${excludedCount} excluded`);
        return bits.length ? bits.join(', ') : 'Defaults';
    }

    _collectionExcludedByTokens(coll, tokens) {
        const guid = String(coll?.guid || '').trim();
        const name = String(coll?.name || '').trim().toLowerCase();
        return tokens.some(t => {
            const tr = String(t || '').trim();
            if (!tr) return false;
            if (tr === guid) return true;
            return tr.toLowerCase() === name;
        });
    }

    _buildExcludedCollectionsFieldHTML() {
        const st = this._tagState;
        const tokens = this._parseExcludedCollections(st.excludedCollectionsRaw);
        const filtered = this._filteredExcludePickerCollections();
        const open = !!st.excludedPickerOpen;
        const pickerHtml = open
            ? `<div class="nm-exclude-picker-panel">
<input class="nm-input nm-tr-exclude-picker-filter" type="text" value="${this._escape(st.excludedPickerFilter || '')}" placeholder="Filter collections…">
<div class="nm-actions" style="margin-top:8px;margin-bottom:8px;">
<button type="button" class="nm-btn nm-btn--secondary" data-action="tr-exclude-select-filtered">Select filtered</button>
<button type="button" class="nm-btn nm-btn--secondary" data-action="tr-exclude-clear-all">Clear all</button>
</div>
${filtered.length ? filtered.map(c => {
                const checked = this._collectionExcludedByTokens(c, tokens) ? ' checked' : '';
                return `<label class="nm-exclude-picker-row"><input type="checkbox" class="nm-tr-exclude-col-cb" data-guid="${this._escape(c.guid)}"${checked}><span>${this._escape(c.name || '(untitled)')}</span><span class="nm-muted" style="margin-left:auto;font-size:11px;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this._escape(c.guid)}">${this._escape(c.guid)}</span></label>`;
            }).join('') : '<div class="nm-muted" style="padding:8px">No collections match filter.</div>'}
</div>`
            : '';
        return `<div class="nm-field" style="grid-column:1/-1">
<label class="nm-label">Exclude collections</label>
<div class="nm-exclude-picker-host">
<div class="nm-exclude-col-wrap nm-input-wrap">
<input class="nm-input nm-tr-excluded-collections" type="text" value="${this._escape(st.excludedCollectionsRaw)}" placeholder="None — choose collections below" readonly>
${st.excludedCollectionsRaw ? '<button type="button" class="nm-parent-clear" data-action="tr-exclude-clear-all" title="Clear exclusions">×</button>' : ''}
</div>
<button type="button" class="nm-btn nm-btn--secondary" data-action="tr-exclude-picker-toggle" style="margin-top:8px;width:100%">${open ? 'Close collection picker' : 'Choose collections to exclude…'}</button>
${pickerHtml}
</div>
<p class="nm-muted" style="margin-top:6px;font-size:12px">Saved as comma-separated collection names or GUIDs (same as before).</p>
</div>`;
    }

    _filteredExcludePickerCollections() {
        const st = this._tagState;
        const colls = Array.isArray(st.excludePickerCollections) ? st.excludePickerCollections : [];
        const f = (st.excludedPickerFilter || '').toLowerCase().trim();
        if (!f) return colls;
        return colls.filter(c => (c.name || '').toLowerCase().includes(f) || (c.guid || '').toLowerCase().includes(f));
    }

    async _loadExcludePickerCollections() {
        const collections = (await this.plugin.data.getAllCollections?.()) || [];
        this._tagState.excludePickerCollections = collections
            .filter(c => this.isUserCollection(c))
            .map(c => ({ guid: String(c.getGuid?.() || '').trim(), name: String(c.getName?.() || 'Untitled').trim() }))
            .filter(c => !!c.guid)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    _commitExcludedCollectionsRaw(raw) {
        this._tagState.excludedCollectionsRaw = String(raw || '');
        this._settings.tagExcludedCollectionsDefault = this._tagState.excludedCollectionsRaw;
        this._saveSettings();
    }

    async _excludeSelectFilteredCollections() {
        const tokens = [...this._parseExcludedCollections(this._tagState.excludedCollectionsRaw)];
        const filtered = this._filteredExcludePickerCollections();
        for (const c of filtered) {
            if (!this._collectionExcludedByTokens(c, tokens)) tokens.push((c.name || '').trim() || c.guid);
        }
        this._commitExcludedCollectionsRaw(tokens.join(', '));
        await this._refreshTagIndex();
    }

    _buildReviewLogSection() {
        const collapsed = !!this._settings.reviewLogCollapsed;
        const head = `<div class="nm-review"><div class="nm-review-head" data-action="toggle-review-log"><span class="nm-review-title">Review log (${this._activityLog.length} entries)</span><span class="nm-muted">${collapsed ? 'Show' : 'Hide'}</span></div>`;
        if (collapsed) return `${head}</div>`;
        const recent = this._activityLog.slice(-100).reverse();
        const rowsHtml = recent.map(r => `<tr><td>${this._escape(r.time)}</td><td>${this._escape(r.operation)}</td><td>${this._escape(r.status)}</td><td>${this._escape(r.recordName || r.recordGuid || '')}</td><td>${this._escape(r.detail || '')}</td></tr>`).join('') || '<tr><td colspan="5">No log entries yet.</td></tr>';
        return `${head}<div class="nm-review-body"><div class="nm-actions" style="margin-bottom:8px;"><button class="nm-btn nm-btn--secondary" data-action="export-log-json">Save log JSON</button><button class="nm-btn nm-btn--secondary" data-action="clear-log">Clear log</button></div><div class="nm-log-table-wrap"><table class="nm-log-table"><thead><tr><th>Time</th><th>Operation</th><th>Status</th><th>Record</th><th>Detail</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div></div>`;
    }

    _buildHomeHTML() {
        return `${this._shellFrameOpen()}<div class="nm-card"><p class="nm-title">Notes Manager</p><p class="nm-text">Use the navigation bar above to open any tool. The review log below is shared across operations.</p><p class="nm-muted" style="margin-top:12px;font-size:13px;line-height:1.55"><strong>Overview</strong> — this screen.<br><strong>Structure</strong> — assign subpages (collections with Sub-pages).<br><strong>Bulk</strong> — move many notes between collections.<br><strong>Tags</strong> — quick rename, advanced review (grid / remove / add / trace), analyzer, merge from plan JSON.</p></div>${this._shellFrameClose()}`;
    }

    _shellNavItem(mode, label) {
        const on = this._mode === mode ? ' nm-shell-nav-item--on' : '';
        return `<button type="button" class="nm-shell-nav-item${on}" data-action="set-mode" data-mode="${this._escape(mode)}">${this._escape(label)}</button>`;
    }

    _shellNavHTML() {
        return `<nav class="nm-shell-nav" role="navigation" aria-label="Notes Manager tools"><div class="nm-shell-group"><span class="nm-shell-group-label">Overview</span>${this._shellNavItem('home', 'Home')}</div><div class="nm-shell-group"><span class="nm-shell-group-label">Structure</span>${this._shellNavItem('assign-parent', 'Assign subpages')}</div><div class="nm-shell-group"><span class="nm-shell-group-label">Bulk</span>${this._shellNavItem('bulk-move', 'Bulk move')}</div><div class="nm-shell-group"><span class="nm-shell-group-label">Tags</span>${this._shellNavItem('tag-rename', 'Rename')}${this._shellNavItem('tag-review', 'Trace & Review')}${this._shellNavItem('tag-analyzer', 'Analyzer')}${this._shellNavItem('tag-merge', 'Merge')}</div></nav>`;
    }

    _shellFrameOpen() {
        return `<div class="nm-root"><div class="nm-header"><div class="nm-header-left">${this._menuHTML()}</div><div class="nm-header-right"></div></div>${this._shellNavHTML()}<div class="nm-shell-main">`;
    }

    _shellFrameClose() {
        return `</div>${this._sharedTailHTML()}</div>`;
    }

    _buildBulkMoveHTML() {
        const st = this._bulkMoveState;
        const source = this._bulkCollectionByGuid(st.sourceGuid);
        const target = this._bulkCollectionByGuid(st.targetGuid);
        const summary = source && target ? `From "${source.name}" -> "${target.name}"` : 'Select source and destination collections';
        const sourceOpts = st.collections.map(c => `<option value="${this._escape(c.guid)}"${st.sourceGuid === c.guid ? ' selected' : ''}>${this._escape(c.name)}</option>`).join('');
        const targetOpts = st.collections.map(c => `<option value="${this._escape(c.guid)}"${st.targetGuid === c.guid ? ' selected' : ''}>${this._escape(c.name)}</option>`).join('');
        const rows = st.filtered.map(rec => `<div class="nm-row"><input type="checkbox" data-action="bm-toggle" data-guid="${this._escape(rec.guid)}"${st.selectedGuids.has(rec.guid) ? ' checked' : ''}><span class="nm-row-name" title="${this._escape(rec.name)}">${this._escape(rec.name)}</span><span class="nm-row-meta">${this._escape(rec.guid)}</span></div>`).join('');
        return `${this._shellFrameOpen()}<div class="nm-card"><p class="nm-title">Bulk Move Notes</p><p class="nm-text">Preview first, then apply. Row-level results are logged.</p><p class="nm-bulk-summary">${this._escape(summary)}</p><div class="nm-field-grid"><div class="nm-field"><label class="nm-label">Source collection</label><select class="nm-select nm-bm-source">${sourceOpts}</select></div><div class="nm-field"><label class="nm-label">Target collection</label><select class="nm-select nm-bm-target">${targetOpts}</select></div><div class="nm-field"><label class="nm-label">Filter (title contains)</label><input class="nm-input nm-bm-filter" type="text" value="${this._escape(st.filterText)}"></div><div class="nm-field"><label class="nm-label">Display</label><label class="nm-inline"><input type="checkbox" class="nm-bm-only-selected"${st.onlySelected ? ' checked' : ''}> <span class="nm-muted">Show only selected</span></label></div></div><div class="nm-list"><div class="nm-list-head"><div class="nm-inline"><button class="nm-btn nm-btn--secondary" data-action="bm-select-all">Select all</button><button class="nm-btn nm-btn--secondary" data-action="bm-select-none">Select none</button><span class="nm-pill">${st.filtered.length} records</span><span class="nm-pill">${st.selectedGuids.size} selected</span></div><span class="nm-muted">${st.loading ? 'Loading records...' : ''}</span></div><div class="nm-list-rows">${rows || '<div class="nm-row"><span class="nm-row-name">No records found.</span></div>'}</div></div><div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="bm-preview">Preview</button><button class="nm-btn" data-action="run-bulk-move"${st.running ? ' disabled' : ''}>Apply</button><button class="nm-btn nm-btn--secondary" data-action="bm-refresh">Refresh</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${st.previewRows.length ? `<div class="nm-status">Preview rows: ${st.previewRows.length}</div>` : ''}</div>${this._shellFrameClose()}`;
    }

    _buildAssignParentHTML() {
        const st = this._assignState;
        const parentHits = st.parentSearchOpen ? this._assignParentHits().slice(0, 20) : [];
        const visibleRows = st.rows.filter(r => this._assignRowVisible(r));
        const allVisibleChecked = visibleRows.length > 0 && visibleRows.every(r => r.checked);
        const selectedCount = st.rows.filter(r => r.checked).length;
        return `${this._shellFrameOpen()}<div class="nm-card"><p class="nm-title">Assign Subpages</p><p class="nm-text">Preview assign/unassign actions before applying.</p><div class="nm-field-grid"><div class="nm-field"><label class="nm-label">Parent note</label><div class="nm-parent-search-wrap nm-input-wrap"><input class="nm-input nm-ap-parent-search" type="text" value="${this._escape(st.parentQuery)}" placeholder="Type to search parent..." title="Suggestions: ArrowDown/Up; Enter to pick; Esc to close.">${st.parentQuery ? '<button class="nm-parent-clear" data-action="ap-parent-clear" title="Clear parent">×</button>' : ''}${parentHits.length ? `<div class="nm-parent-list">${parentHits.map((r, i) => `<button type="button" class="nm-parent-opt${i === st.parentSuggestActiveIndex && st.parentSuggestActiveIndex >= 0 ? ' nm-parent-opt--active' : ''}" data-action="ap-parent-pick" data-guid="${this._escape(r.guid)}">${this._escape(r.fullTitle)}</button>`).join('')}</div>` : ''}</div></div><div class="nm-field"><label class="nm-label">Filter children</label><div class="nm-input-wrap"><input class="nm-input nm-ap-filter" type="text" value="${this._escape(st.filterText)}" placeholder="Filter by title...">${st.filterText ? '<button class="nm-parent-clear" data-action="ap-filter-clear" title="Clear filter">×</button>' : ''}</div></div></div><div class="nm-list-head"><div class="nm-inline"><label class="nm-inline"><input type="checkbox" class="nm-ap-all"${allVisibleChecked ? ' checked' : ''}> <span class="nm-muted">All visible</span></label><span class="nm-pill">${selectedCount} selected</span></div><div class="nm-inline"><label class="nm-inline"><input type="checkbox" class="nm-ap-hide-childof"${st.hideChildOfRows ? ' checked' : ''}> <span class="nm-muted">Hide child of:</span></label></div></div><div class="nm-table-wrap"><table class="nm-table"><thead><tr><th style="width:42px"></th><th>Title</th><th>Status</th></tr></thead><tbody>${visibleRows.map(r => `<tr><td><input type="checkbox" data-action="ap-toggle" data-guid="${this._escape(r.guid)}"${r.checked ? ' checked' : ''}></td><td>${this._escape(r.fullTitle)}</td><td>${this._assignStatusHtml(r)}</td></tr>`).join('') || '<tr><td colspan="3">No rows match.</td></tr>'}</tbody></table></div><div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="ap-preview">Preview</button><button class="nm-btn" data-action="run-assign-parent"${(st.running || !st.parentGuid) ? ' disabled' : ''}>Apply</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${st.previewRows.length ? `<div class="nm-status">Preview rows: ${st.previewRows.length}</div>` : ''}</div>${this._shellFrameClose()}`;
    }

    _buildTagRenameHTML() {
        const st = this._tagState;
        const suggestions = this._tagSuggestions().slice(0, 20);
        const advancedState = this._tagAdvancedState(st);
        return `${this._shellFrameOpen()}<div class="nm-card"><p class="nm-title">Tag Rename (Quick)</p><p class="nm-text">Fast preview/apply rename flow. Advanced review remains separate.</p><div class="nm-field-grid"><div class="nm-field"><label class="nm-label">Current tag</label><div class="nm-input-wrap"><input class="nm-input nm-tr-old" type="text" value="${this._escape(st.oldTag)}" placeholder="#current-tag" title="Cmd/Ctrl+Enter: preview. Cmd/Ctrl+Shift+Enter: apply. Suggestions: ArrowDown/Up; Enter pick; Esc close.">${st.oldTag ? '<button class="nm-parent-clear" data-action="tr-old-clear" title="Clear current tag">×</button>' : ''}${(st.oldSearchOpen && suggestions.length) ? `<div class="nm-parent-list">${suggestions.map((s, i) => `<button type="button" class="nm-parent-opt${st.suggestActiveIndex === i ? ' nm-parent-opt--active' : ''}" data-action="tr-old-pick" data-tag="${this._escape(s.tag)}">#${this._escape(s.tag)} (${s.count})</button>`).join('')}</div>` : ''}</div></div><div class="nm-field"><label class="nm-label">New tag</label><div class="nm-input-wrap"><input class="nm-input nm-tr-new" type="text" value="${this._escape(st.newTag)}" placeholder="#new-tag" title="Cmd/Ctrl+Enter: preview. Cmd/Ctrl+Shift+Enter: apply.">${st.newTag ? '<button class="nm-parent-clear" data-action="tr-new-clear" title="Clear new tag">×</button>' : ''}</div></div></div><div class="nm-inline" style="margin-bottom:8px;"><button class="nm-btn nm-btn--secondary" data-action="tr-refresh-index">Refresh index</button><span class="nm-muted">${this._escape(st.indexMeta)}</span></div><div class="nm-adv"><div class="nm-adv-head" data-action="tr-toggle-advanced"><span class="nm-muted">${st.advancedOpen ? '▾' : '▸'} Matching options</span><span class="nm-muted">${this._escape(advancedState)}</span></div>${st.advancedOpen ? `<div class="nm-adv-body"><div class="nm-field-grid"><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-case"${st.caseSensitive ? ' checked' : ''}> <span class="nm-muted">Case-sensitive matching</span></label></div><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-exclude-choice"${st.excludeChoiceValues ? ' checked' : ''}> <span class="nm-muted">Exclude choice/enum from tag list</span></label></div>${this._buildExcludedCollectionsFieldHTML()}</div></div>` : ''}</div><div style="height:12px;"></div><div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="tr-preview" title="Cmd/Ctrl+Enter">Preview</button><button class="nm-btn" data-action="tr-apply"${st.running ? ' disabled' : ''} title="Cmd/Ctrl+Shift+Enter">Apply</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${st.previewRows.length ? `<div class="nm-status">Preview rows: ${st.previewRows.length}</div>` : ''}</div>${this._shellFrameClose()}`;
    }

    _buildTagReviewHTML() {
        const st = this._tagState;
        const suggestions = this._tagSuggestions().slice(0, 20);
        const hasTrace = !!(st.traceOutput && st.traceOutput.trim());
        const trace = this._escape(st.traceOutput || 'Run "Trace tag source" to inspect where the current tag is found.');
        const advancedState = this._tagAdvancedState(st);
        const sub = st.tagReviewSubMode === 'remove' ? 'remove' : st.tagReviewSubMode === 'add' ? 'add' : 'grid';
        let reviewWorkflowCard;
        if (sub === 'grid') {
            const gridRows = this._reviewGridRowsForDisplay();
            const defaultHeaderLabel = (this.cleanTag(st.reviewGridDefaultTarget || st.newTag) || 'Default').toUpperCase();
            const reviewGridMeta = this._reviewGridMetaSummary(gridRows);
            reviewWorkflowCard = `<div class="nm-card nm-review-grid-output" style="margin-top:10px">
<p class="nm-title">Review Grid</p>
<p class="nm-text">Build a queue from a source tag, then preview/apply with default target and per-row overrides.</p>
<div class="nm-field-grid">
<div class="nm-field">
<label class="nm-label">#source-tag</label>
<div class="nm-input-wrap nm-rg-source-host">
<input class="nm-input nm-rg-source" type="text" value="${this._escape(st.reviewGridSourceTag)}" placeholder="#source-tag" title="Tag index: ArrowDown opens list; arrows navigate; Enter picks when list open, else Find matches; Esc closes list. Clear drops queue." autocomplete="off">
${st.reviewGridSourceTag ? '<button class="nm-parent-clear" data-action="tr-rg-source-clear" title="Clear source tag">×</button>' : ''}
<div class="nm-rg-source-suggest nm-rg-suggest" aria-hidden="true"></div>
</div>
</div>
<div class="nm-field">
<label class="nm-label">#default-target</label>
<div class="nm-input-wrap">
<input class="nm-input nm-rg-target" type="text" value="${this._escape(st.reviewGridDefaultTarget)}" placeholder="#default-target" title="Enter re-runs Find matches when a source tag is set." autocomplete="off">
${st.reviewGridDefaultTarget ? '<button class="nm-parent-clear" data-action="tr-rg-target-clear" title="Clear default target">×</button>' : ''}
</div>
</div>
<div class="nm-field"><label class="nm-label">Filter</label><input class="nm-input nm-rg-filter" type="text" value="${this._escape(st.reviewGridFilter)}" placeholder="title, source, preview..."></div>
<div class="nm-field"><label class="nm-label">Sort</label><select class="nm-select nm-rg-sort"><option value="title-asc"${st.reviewGridSort === 'title-asc' ? ' selected' : ''}>Title A-Z</option><option value="title-desc"${st.reviewGridSort === 'title-desc' ? ' selected' : ''}>Title Z-A</option><option value="source-asc"${st.reviewGridSort === 'source-asc' ? ' selected' : ''}>Source A-Z</option><option value="source-desc"${st.reviewGridSort === 'source-desc' ? ' selected' : ''}>Source Z-A</option><option value="tag-group"${st.reviewGridSort === 'tag-group' ? ' selected' : ''}>Group by tag</option></select></div>
</div>
<div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="tr-rg-build">Find matches</button><button class="nm-btn nm-btn--secondary" data-action="tr-rg-preview">Preview</button><button class="nm-btn" data-action="tr-rg-apply"${st.running ? ' disabled' : ''}>Rename</button></div>
<div class="nm-status">${this._escape(reviewGridMeta)}</div>
<div class="nm-table-wrap nm-rg-wrap"><table class="nm-table nm-rg-table"><thead><tr><th>Record title</th><th>First 2 lines</th><th style="width:90px"><label class="nm-inline"><input type="checkbox" data-action="tr-rg-default-all"${gridRows.length && gridRows.every(r => r.action === 'default') ? ' checked' : ''}> <span>${this._escape(defaultHeaderLabel)}</span></label></th><th style="width:80px"><label class="nm-inline"><input type="checkbox" data-action="tr-rg-skip-all"${gridRows.length && gridRows.every(r => r.action === 'skip') ? ' checked' : ''}> <span>Skip</span></label></th><th>Override tag</th></tr></thead><tbody>${this._reviewGridTableRowsHTML(gridRows)}</tbody></table></div>
<div class="nm-status">${this._escape(st.reviewGridOutput || '')}</div>
</div>`;
        } else if (sub === 'remove') {
            const rtRows = this._removeTagRowsForDisplay();
            const removeTagMeta = this._removeTagMetaSummary(rtRows);
            reviewWorkflowCard = `<div class="nm-card nm-remove-tag-output" style="margin-top:10px">
<p class="nm-title">Remove tag</p>
<p class="nm-text">Find hashtag segments, plain #tags in body text, and matching tag-like property values (same rules as trace for text fields). Choice/enum fields are not scanned; tags that only exist via choice/enum are omitted from suggestions.</p>
<div class="nm-field-grid">
<div class="nm-field">
<label class="nm-label">Tag to remove</label>
<div class="nm-input-wrap nm-rt-tag-host">
<input class="nm-input nm-rt-tag" type="text" value="${this._escape(st.removeTagTag)}" placeholder="#tag" title="Suggestions exclude choice-only tags. ArrowDown opens list. Clear drops the queue." autocomplete="off">
${st.removeTagTag ? '<button class="nm-parent-clear" data-action="tr-rt-tag-clear" title="Clear tag">×</button>' : ''}
<div class="nm-rt-tag-suggest nm-rg-suggest" aria-hidden="true"></div>
</div>
</div>
<div class="nm-field"><label class="nm-label">Filter</label><input class="nm-input nm-rt-filter" type="text" value="${this._escape(st.removeTagFilter)}" placeholder="title, source, preview..."></div>
<div class="nm-field"><label class="nm-label">Sort</label><select class="nm-select nm-rt-sort"><option value="title-asc"${st.removeTagSort === 'title-asc' ? ' selected' : ''}>Title A-Z</option><option value="title-desc"${st.removeTagSort === 'title-desc' ? ' selected' : ''}>Title Z-A</option><option value="source-asc"${st.removeTagSort === 'source-asc' ? ' selected' : ''}>Source A-Z</option><option value="source-desc"${st.removeTagSort === 'source-desc' ? ' selected' : ''}>Source Z-A</option></select></div>
</div>
<div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="tr-rt-build">Find matches</button><button class="nm-btn nm-btn--secondary" data-action="tr-rt-preview">Preview</button><button class="nm-btn" data-action="tr-rt-apply"${st.running ? ' disabled' : ''}>Apply</button></div>
<div class="nm-status">${this._escape(removeTagMeta)}</div>
<div class="nm-table-wrap nm-rg-wrap"><table class="nm-table nm-rg-table"><thead><tr><th>Record title</th><th>First 2 lines</th><th style="width:90px"><label class="nm-inline"><input type="checkbox" data-action="tr-rt-default-all"${rtRows.length && rtRows.every(r => r.action === 'default') ? ' checked' : ''}> <span>Remove</span></label></th><th style="width:80px"><label class="nm-inline"><input type="checkbox" data-action="tr-rt-skip-all"${rtRows.length && rtRows.every(r => r.action === 'skip') ? ' checked' : ''}> <span>Skip</span></label></th></tr></thead><tbody>${this._removeTagTableRowsHTML(rtRows)}</tbody></table></div>
<div class="nm-status">${this._escape(st.removeTagOutput || '')}</div>
</div>`;
        } else {
            const atRows = this._addTagRowsForDisplay();
            const addTagMeta = this._addTagMetaSummary(atRows);
            reviewWorkflowCard = `<div class="nm-card nm-add-tag-output" style="margin-top:10px">
<p class="nm-title">Add tag</p>
<p class="nm-text">Enter a new tag, optionally narrow by record filter (title and first lines of body). Tags already present on the note are skipped. If the record has a writable hashtag-type property (preferring one named Tags), the tag is stored there via addValue or by appending to the property’s value list (hashtag fields use the tag token without a leading #; the app shows #). Otherwise a new body line is appended at the bottom as #tag plus one trailing space.</p>
<div class="nm-field-grid">
<div class="nm-field">
<label class="nm-label">Tag to add</label>
<div class="nm-input-wrap">
<input class="nm-input nm-at-tag" type="text" value="${this._escape(st.addTagTag)}" placeholder="new-tag" title="Plain text; # is optional. Enter runs Find matches." autocomplete="off">
${st.addTagTag ? '<button class="nm-parent-clear" data-action="tr-at-tag-clear" title="Clear tag">×</button>' : ''}
</div>
</div>
<div class="nm-field">
<label class="nm-label">Record filter</label>
<input class="nm-input nm-at-record-filter" type="text" value="${this._escape(st.addTagRecordFilter)}" placeholder="title or body preview contains…" title="Only records whose title or first two body lines match this substring (case-insensitive) are queued. Leave empty for all records in scope.">
</div>
<div class="nm-field"><label class="nm-label">Narrow rows</label><input class="nm-input nm-at-table-filter" type="text" value="${this._escape(st.addTagTableFilter)}" placeholder="title, source, preview..."></div>
<div class="nm-field"><label class="nm-label">Sort</label><select class="nm-select nm-at-sort"><option value="title-asc"${st.addTagSort === 'title-asc' ? ' selected' : ''}>Title A-Z</option><option value="title-desc"${st.addTagSort === 'title-desc' ? ' selected' : ''}>Title Z-A</option><option value="source-asc"${st.addTagSort === 'source-asc' ? ' selected' : ''}>Source A-Z</option><option value="source-desc"${st.addTagSort === 'source-desc' ? ' selected' : ''}>Source Z-A</option></select></div>
</div>
<div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="tr-at-build">Find matches</button><button class="nm-btn nm-btn--secondary" data-action="tr-at-preview">Preview</button><button class="nm-btn" data-action="tr-at-apply"${st.running ? ' disabled' : ''}>Apply</button></div>
<div class="nm-status">${this._escape(addTagMeta)}</div>
<div class="nm-table-wrap nm-rg-wrap"><table class="nm-table nm-rg-table"><thead><tr><th>Record title</th><th>First 2 lines</th><th style="width:90px"><label class="nm-inline"><input type="checkbox" data-action="tr-at-default-all"${atRows.length && atRows.every(r => r.action === 'default') ? ' checked' : ''}> <span>Add</span></label></th><th style="width:80px"><label class="nm-inline"><input type="checkbox" data-action="tr-at-skip-all"${atRows.length && atRows.every(r => r.action === 'skip') ? ' checked' : ''}> <span>Skip</span></label></th></tr></thead><tbody>${this._addTagTableRowsHTML(atRows)}</tbody></table></div>
<div class="nm-status">${this._escape(st.addTagOutput || '')}</div>
</div>`;
        }
        return `${this._shellFrameOpen()}<div class="nm-card">
<p class="nm-title">Tag trace</p>
<p class="nm-text">Manage index scope, trace sources, and run review-grid rename workflows.</p>
<div class="nm-field-grid">
<div class="nm-field">
<label class="nm-label">Current tag</label>
<div class="nm-input-wrap">
<input class="nm-input nm-tr-old" type="text" value="${this._escape(st.oldTag)}" placeholder="#tag-to-trace" title="Suggestions: ArrowDown/Up; Enter pick; Esc close.">
${st.oldTag ? '<button class="nm-parent-clear" data-action="tr-old-clear" title="Clear current tag">×</button>' : ''}
${(st.oldSearchOpen && suggestions.length) ? `<div class="nm-parent-list">${suggestions.map((s, i) => `<button type="button" class="nm-parent-opt${st.suggestActiveIndex === i ? ' nm-parent-opt--active' : ''}" data-action="tr-old-pick" data-tag="${this._escape(s.tag)}">#${this._escape(s.tag)} (${s.count})</button>`).join('')}</div>` : ''}
</div>
</div>
</div>
<div class="nm-inline" style="margin-bottom:8px;">
<button class="nm-btn nm-btn--secondary" data-action="tr-refresh-index">Refresh index</button>
<span class="nm-muted">${this._escape(st.indexMeta)}</span>
</div>
<div class="nm-adv">
<div class="nm-adv-head" data-action="tr-toggle-advanced">
<span class="nm-muted">${st.advancedOpen ? '▾' : '▸'} Matching options</span>
<span class="nm-muted">${this._escape(advancedState)}</span>
</div>
${st.advancedOpen ? `<div class="nm-adv-body"><div class="nm-field-grid"><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-case"${st.caseSensitive ? ' checked' : ''}> <span class="nm-muted">Case-sensitive matching</span></label></div><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-exclude-choice"${st.excludeChoiceValues ? ' checked' : ''}> <span class="nm-muted">Exclude choice/enum from tag list</span></label></div>${this._buildExcludedCollectionsFieldHTML()}</div></div>` : ''}
</div>
<div style="height:12px;"></div>
<div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="tr-trace">Trace tag source</button></div>
<div class="nm-inline" style="margin:12px 0 0;flex-wrap:wrap;gap:8px;align-items:center">
<span class="nm-muted" style="font-size:12px">Advanced workflow</span>
<button type="button" class="nm-btn${sub === 'grid' ? '' : ' nm-btn--secondary'}" data-action="tr-submode-grid">Review Grid</button>
<button type="button" class="nm-btn${sub === 'remove' ? '' : ' nm-btn--secondary'}" data-action="tr-submode-remove">Remove tag</button>
<button type="button" class="nm-btn${sub === 'add' ? '' : ' nm-btn--secondary'}" data-action="tr-submode-add">Add tag</button>
</div>
${reviewWorkflowCard}
<div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>
<div class="nm-card" style="margin-top:10px">
<div class="nm-adv-head"${hasTrace ? ' data-action="tr-toggle-trace-output"' : ''}>
<span class="nm-title">${hasTrace ? (st.traceOpen ? '▾' : '▸') : '•'} Trace output</span>
${hasTrace ? '<button class="nm-btn nm-btn--secondary" data-action="tr-copy-trace">Copy output</button>' : '<span class="nm-muted"></span>'}
</div>
${(!hasTrace || st.traceOpen) ? `<div class="nm-status" style="margin-top:8px;">${trace}</div>` : ''}
</div>
</div>
${this._shellFrameClose()}`;
    }

    /**
     * Returns to the threshold/sensitivity screen. Manual clusters (and any auto clusters
     * that were Converted to manual) are preserved alongside their target picks and
     * per-member exclusions, so the work the user invested across re-Analyze cycles
     * isn't silently dropped. Auto clusters are cleared because they are recomputed
     * on the next Analyze. The id counter is preserved so newly minted manual cluster
     * ids never collide with surviving ones.
     */
    _tagAnalyzerClearResults() {
        const st = this._tagState;
        const keptClusters = (st.tagAnalyzerClusters || []).filter(c => c.manual);
        const keptIds = new Set(keptClusters.map(c => c.id));
        const keptReplacements = {};
        for (const [k, v] of Object.entries(st.tagAnalyzerReplacements || {})) {
            if (keptIds.has(Number(k))) keptReplacements[k] = v;
        }
        st.tagAnalyzerPhase = 'setup';
        st.tagAnalyzerClusters = keptClusters;
        st.tagAnalyzerOrphans = [];
        st.tagAnalyzerOpenClusterId = keptIds.has(st.tagAnalyzerOpenClusterId) ? st.tagAnalyzerOpenClusterId : null;
        st.tagAnalyzerReplacements = keptReplacements;
        st.tagAnalyzerExportVisible = false;
        st.tagAnalyzerLastLowCount = 0;
        st.tagAnalyzerPickFilter = '';
        st.tagAnalyzerPickSelected = [];
        st.tagAnalyzerAddInputs = {};
        st.tagAnalyzerAddPickerOpenId = null;
        st.tagAnalyzerAddPickerFilter = '';
        st.tagAnalyzerAddPickerSelected = [];
    }

    /**
     * Two-row Levenshtein DP over precomputed lowercased strings. The previous full m×n matrix
     * allocated O(mn) memory per pair; this allocates O(min(m,n)) and reuses two arrays per call.
     */
    _tagAnalyzerLevenshtein(a, b) {
        if (a === b) return 0;
        if (!a) return b.length;
        if (!b) return a.length;
        // Iterate over the longer string to keep the inner row small.
        if (a.length < b.length) { const tmp = a; a = b; b = tmp; }
        const n = b.length;
        let prev = new Array(n + 1);
        let curr = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= a.length; i++) {
            curr[0] = i;
            const ai = a.charCodeAt(i - 1);
            for (let j = 1; j <= n; j++) {
                const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
                const del = prev[j] + 1;
                const ins = curr[j - 1] + 1;
                const sub = prev[j - 1] + cost;
                curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
            }
            const tmp = prev; prev = curr; curr = tmp;
        }
        return prev[n];
    }

    _tagAnalyzerTokenize(tag) {
        return String(tag ?? '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .split(/\s+/)
            .filter(Boolean);
    }

    /** Builds {lower, tokens, len} for each tag once so similarity lookups never re-tokenize. */
    _tagAnalyzerBuildSignatures(tags) {
        const map = new Map();
        for (const t of tags) {
            const name = t.name;
            if (map.has(name)) continue;
            const lower = name.toLowerCase();
            map.set(name, { lower, tokens: new Set(this._tagAnalyzerTokenize(name)), len: lower.length });
        }
        return map;
    }

    _tagAnalyzerSimilarityFromSig(sigA, sigB) {
        const maxLen = sigA.len > sigB.len ? sigA.len : sigB.len;
        const levSim = maxLen === 0 ? 1 : 1 - this._tagAnalyzerLevenshtein(sigA.lower, sigB.lower) / maxLen;
        let inter = 0;
        const small = sigA.tokens.size <= sigB.tokens.size ? sigA.tokens : sigB.tokens;
        const large = small === sigA.tokens ? sigB.tokens : sigA.tokens;
        for (const tok of small) if (large.has(tok)) inter += 1;
        const union = sigA.tokens.size + sigB.tokens.size - inter;
        const jacSim = union === 0 ? 0 : inter / union;
        const bonus = (sigA.lower.includes(sigB.lower) || sigB.lower.includes(sigA.lower)) ? 0.3 : 0;
        const sim = (levSim > jacSim ? levSim : jacSim) + bonus;
        return sim > 1 ? 1 : sim;
    }

    /** Backwards-compatible API for any external caller — internal clustering uses signatures. */
    _tagAnalyzerSimilarity(a, b) {
        const sigA = { lower: String(a ?? '').toLowerCase(), tokens: new Set(this._tagAnalyzerTokenize(a)), len: String(a ?? '').length };
        const sigB = { lower: String(b ?? '').toLowerCase(), tokens: new Set(this._tagAnalyzerTokenize(b)), len: String(b ?? '').length };
        return this._tagAnalyzerSimilarityFromSig(sigA, sigB);
    }

    _tagAnalyzerBuildClusters(lowTags, allTags, simThreshold) {
        const result = [];
        const assigned = new Set();
        const sigs = this._tagAnalyzerBuildSignatures(allTags);
        for (const lt of lowTags) {
            if (assigned.has(lt.name)) continue;
            const members = [lt];
            const ltSig = sigs.get(lt.name);
            if (!ltSig) continue;
            for (const c of allTags) {
                if (c.name === lt.name || assigned.has(c.name)) continue;
                const cSig = sigs.get(c.name);
                if (!cSig) continue;
                if (this._tagAnalyzerSimilarityFromSig(ltSig, cSig) >= simThreshold) members.push(c);
            }
            if (members.length > 1) {
                members.forEach(m => assigned.add(m.name));
                const best = members.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a));
                result.push({
                    id: result.length,
                    members,
                    suggestedReplacement: best.name,
                    totalCount: members.reduce((s, m) => s + (m.count || 0), 0),
                    omitFromExport: false,
                    excludedMembers: [],
                    manual: false,
                });
            }
        }
        return result;
    }

    _runTagAnalyzerClustering() {
        const st = this._tagState;
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const allTags = idx.map(e => ({ name: String(e.tag ?? '').trim(), count: Number(e.count) || 0 })).filter(t => t.name);
        if (!allTags.length) return;
        const maxCount = Math.max(1, ...allTags.map(t => t.count));
        const thRaw = Number(st.tagAnalyzerThreshold);
        const threshold = Math.max(1, Math.min(Number.isFinite(thRaw) ? thRaw : 5, maxCount));
        st.tagAnalyzerThreshold = threshold;
        const simRaw = Number(st.tagAnalyzerSimPercent);
        const simPct = Math.max(15, Math.min(Number.isFinite(simRaw) ? simRaw : 35, 70));
        st.tagAnalyzerSimPercent = simPct;
        const lowTags = allTags.filter(t => t.count <= threshold);
        const simThreshold = simPct / 100;
        const autoClusters = this._tagAnalyzerBuildClusters(lowTags, allTags, simThreshold);
        const clustered = new Set(autoClusters.flatMap(c => c.members.map(m => m.name)));
        const orphans = lowTags.filter(t => !clustered.has(t.name));
        const prevManual = (st.tagAnalyzerClusters || []).filter(c => c.manual);
        const prevManualIds = new Set(prevManual.map(c => c.id));
        const keptReplacements = {};
        for (const [k, v] of Object.entries(st.tagAnalyzerReplacements || {})) {
            if (prevManualIds.has(Number(k))) keptReplacements[k] = v;
        }
        st.tagAnalyzerClusters = [...autoClusters, ...prevManual];
        st.tagAnalyzerOrphans = orphans;
        st.tagAnalyzerReplacements = keptReplacements;
        st.tagAnalyzerOpenClusterId = prevManualIds.has(st.tagAnalyzerOpenClusterId) ? st.tagAnalyzerOpenClusterId : null;
        st.tagAnalyzerExportVisible = false;
        st.tagAnalyzerLastLowCount = lowTags.length;
        st.tagAnalyzerPhase = 'results';
        this._logRow('tag-analyzer', 'applied', { recordGuid: '', recordName: '' }, `Low-use ≤${threshold}: ${lowTags.length}; clusters: ${st.tagAnalyzerClusters.length}; orphans: ${orphans.length}; similarity ${simPct}%`);
    }

    /** Members of `c` that have not been excluded by per-pill ×. */
    _tagAnalyzerActiveMembers(c) {
        const excluded = new Set(c.excludedMembers || []);
        return (c.members || []).filter(m => !excluded.has(m.name));
    }

    /**
     * Resolves the cluster's effective replacement target. Honors a user-typed custom
     * target (a non-member name) verbatim. If the picked target is a member that has
     * been excluded — or is missing/blank — falls back to the highest-count active
     * member (matching the rule used at cluster construction).
     */
    _tagAnalyzerEffectiveReplacement(c, active) {
        const st = this._tagState;
        const activeMembers = active || this._tagAnalyzerActiveMembers(c);
        const activeNames = new Set(activeMembers.map(m => m.name));
        const raw = st.tagAnalyzerReplacements[c.id];
        const picked = raw !== undefined ? String(raw).trim() : '';
        if (picked) {
            const isMember = c.members.some(m => m.name === picked);
            if (!isMember) return picked;
            if (activeNames.has(picked)) return picked;
        }
        if (!activeMembers.length) return c.suggestedReplacement;
        if (activeNames.has(c.suggestedReplacement)) return c.suggestedReplacement;
        return activeMembers.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a)).name;
    }

    _tagAnalyzerExportPlanJson() {
        const st = this._tagState;
        const clusters = this._tagAnalyzerSortedClusters(st).filter(c => !c.omitFromExport);
        const out = [];
        for (const c of clusters) {
            const active = this._tagAnalyzerActiveMembers(c);
            if (active.length < 2) continue;
            const replacement = this._tagAnalyzerEffectiveReplacement(c, active);
            const merging = active.map(m => m.name).filter(n => n !== replacement);
            if (!merging.length) continue;
            out.push({
                replacement,
                merging,
                combinedCount: active.reduce((s, m) => s + (m.count || 0), 0),
            });
        }
        return out;
    }

    /** Display text for export panel only (metadata lines + JSON). Save/Copy use `_tagAnalyzerExportPlanJson()` alone. */
    _tagAnalyzerExportPlanDisplayText() {
        const plan = this._tagAnalyzerExportPlanJson();
        const body = JSON.stringify(plan, null, 2);
        const clusterCount = plan.length;
        const jsonLines = body.split(/\r?\n/).length;
        return `Clusters in export: ${clusterCount}\nJSON lines: ${jsonLines}\n\n${body}`;
    }

    /**
     * Resolves a tag name against the current tag index. Returns the canonical
     * (case-preserved) name and count if found, otherwise `null`. Matching uses
     * the same `matchKey` rule as the rest of the tag tooling so the lookup
     * respects the `caseSensitive` matching option.
     */
    _tagAnalyzerLookupIndexedTag(name) {
        const st = this._tagState;
        const cleaned = this.cleanTag(name);
        if (!cleaned) return null;
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const target = this.matchKey(cleaned, st.caseSensitive);
        for (const e of idx) {
            const t = String(e.tag ?? '').trim();
            if (!t) continue;
            if (this.matchKey(t, st.caseSensitive) === target) return { name: t, count: Number(e.count) || 0 };
        }
        return null;
    }

    /**
     * Returns up to `limit` tag-index entries that match `query` (substring match,
     * case-insensitive) and are NOT already members of `cluster`. Sorted by usage
     * count (desc) so the most-used candidates surface first. When `query` is
     * empty an empty list is returned (the picker is the discovery UI; the
     * inline suggest only fires once the user starts typing).
     */
    _tagAnalyzerAddSuggestForCluster(cluster, query, limit = 6) {
        const st = this._tagState;
        const q = String(query || '').trim().replace(/^#+/, '').toLowerCase();
        if (!q) return [];
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const memberKeys = new Set((cluster.members || []).map(m => this.matchKey(m.name, st.caseSensitive)));
        const out = [];
        for (const e of idx) {
            const t = String(e.tag ?? '').trim();
            if (!t) continue;
            if (memberKeys.has(this.matchKey(t, st.caseSensitive))) continue;
            if (!t.toLowerCase().includes(q)) continue;
            out.push({ name: t, count: Number(e.count) || 0 });
        }
        out.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, undefined, { numeric: true }));
        return out.slice(0, limit);
    }

    /**
     * Adds a tag (resolved through the index) to a manual cluster. Returns one of:
     *   { ok: true, status: 'added' }    — newly inserted member
     *   { ok: true, status: 'restored' } — already a member but in `excludedMembers`; un-excluded
     *   { ok: false, reason: 'duplicate' }    — already an active member
     *   { ok: false, reason: 'not-manual' }   — refused on auto clusters
     *   { ok: false, reason: 'not-in-index' } — input did not resolve to any indexed tag
     */
    _tagAnalyzerAddTagToCluster(cluster, rawName) {
        if (!cluster) return { ok: false, reason: 'not-in-index' };
        if (!cluster.manual) return { ok: false, reason: 'not-manual' };
        const hit = this._tagAnalyzerLookupIndexedTag(rawName);
        if (!hit) return { ok: false, reason: 'not-in-index' };
        if (!Array.isArray(cluster.excludedMembers)) cluster.excludedMembers = [];
        const existing = (cluster.members || []).find(m => m.name === hit.name);
        if (existing) {
            if (cluster.excludedMembers.includes(hit.name)) {
                cluster.excludedMembers = cluster.excludedMembers.filter(n => n !== hit.name);
                existing.count = hit.count;
                cluster.totalCount = (cluster.members || []).reduce((s, m) => s + (m.count || 0), 0);
                return { ok: true, status: 'restored' };
            }
            return { ok: false, reason: 'duplicate' };
        }
        cluster.members.push({ name: hit.name, count: hit.count });
        cluster.totalCount = cluster.members.reduce((s, m) => s + (m.count || 0), 0);
        return { ok: true, status: 'added' };
    }

    _tagAnalyzerSortedClusters(st) {
        const raw = [...(st.tagAnalyzerClusters || [])];
        const order = st.tagAnalyzerClusterOrder || 'processed';
        if (order === 'size-desc') {
            return raw.sort((a, b) => (b.members.length - a.members.length) || (b.totalCount - a.totalCount) || (a.id - b.id));
        }
        if (order === 'combined-desc') {
            return raw.sort((a, b) => (b.totalCount - a.totalCount) || (b.members.length - a.members.length) || (a.id - b.id));
        }
        return raw;
    }

    _tagAnalyzerManualPickHTML() {
        const st = this._tagState;
        const open = st.tagAnalyzerManualOpen !== false;
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const q = (st.tagAnalyzerPickFilter || '').toLowerCase().trim();
        const picked = new Set(st.tagAnalyzerPickSelected || []);
        const byName = new Map(idx.map(e => [String(e.tag ?? '').trim(), e]));
        const filtered = idx
            .filter(e => {
                const t = String(e.tag ?? '').trim();
                if (!t) return false;
                return !q || t.toLowerCase().includes(q);
            })
            .slice(0, 80);
        const inSlice = new Set(filtered.map(e => String(e.tag ?? '').trim()));
        const hiddenPicked = [...picked].filter(t => !inSlice.has(t));
        const rowFor = (t, count) => {
            const on = picked.has(t);
            return `<label class="nm-inline" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--cards-border-color);cursor:pointer;width:100%;box-sizing:border-box"><input type="checkbox" class="nm-ta-manual-cb" data-tag="${encodeURIComponent(t)}"${on ? ' checked' : ''}><span><span class="nm-muted">#</span>${this._escape(t)}</span><span class="nm-muted" style="margin-left:auto">${count}</span></label>`;
        };
        const extraRows = hiddenPicked
            .map(t => {
                const e = byName.get(t);
                const count = e ? Number(e.count) || 0 : 0;
                return rowFor(t, count);
            })
            .join('');
        const rows =
            (hiddenPicked.length ? `<div class="nm-muted" style="font-size:11px;padding:4px 0">Selected (outside current filter)</div>${extraRows}` : '') +
            filtered
                .map(e => {
                    const t = String(e.tag ?? '').trim();
                    return rowFor(t, Number(e.count) || 0);
                })
                .join('');
        const sel = [...picked].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const selLine = sel.length ? `<p class="nm-muted" style="margin:6px 0;font-size:12px;">Selected (${sel.length}): ${sel.map(t => `#${this._escape(t)}`).join(', ')}</p>` : '<p class="nm-muted" style="margin:6px 0;font-size:12px;">Select at least two tags.</p>';
        const addDisabled = picked.size < 2 ? ' disabled' : '';
        const body = open
            ? `<p class="nm-muted" style="margin-bottom:8px;">Search the index, tick two or more tags, then create a cluster. Same export and target controls as auto clusters.</p><div class="nm-field"><label class="nm-label">Filter tags</label><input class="nm-input nm-ta-manual-filter" type="text" value="${this._escape(st.tagAnalyzerPickFilter)}" placeholder="Substring…"></div>${selLine}<div class="nm-table-wrap" style="max-height:200px;margin-top:6px">${rows || '<p class="nm-muted" style="padding:8px">No tags match.</p>'}</div><div class="nm-inline" style="margin-top:8px;gap:8px;"><button type="button" class="nm-btn"${addDisabled} data-action="ta-manual-add">Create cluster from selection</button><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-manual-pick-clear"${picked.size ? '' : ' disabled'}>Clear selection</button></div>`
            : '';
        return `<div class="nm-card" style="margin-top:12px;"><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-toggle-manual" style="margin-bottom:${open ? '8px' : '0'};display:flex;align-items:center;gap:8px;"><span>${open ? '▾' : '▸'}</span><span>Add manual cluster</span></button>${body}</div>`;
    }

    /**
     * Renders the per-cluster "+ Add tag" inline input + suggestions and the
     * "Add tags…" bulk picker for a manual cluster. Returns '' for auto clusters
     * (the cluster header already exposes a "Convert to manual" button — once
     * converted, this UI shows up automatically).
     */
    _tagAnalyzerAddMembersUIHTML(c) {
        if (!c.manual) return '';
        const st = this._tagState;
        const inputVal = (st.tagAnalyzerAddInputs && st.tagAnalyzerAddInputs[c.id] !== undefined)
            ? String(st.tagAnalyzerAddInputs[c.id])
            : '';
        const suggestions = this._tagAnalyzerAddSuggestForCluster(c, inputVal, 6);
        const suggestHTML = suggestions.length
            ? `<div class="nm-ta-add-suggest">${suggestions.map(s => `<button type="button" class="nm-ta-add-suggest-pill" data-action="ta-add-suggest" data-id="${c.id}" data-tag="${encodeURIComponent(s.name)}" title="Add #${this._escape(s.name)} to this cluster"><span class="nm-muted">#</span>${this._escape(s.name)} <span class="nm-muted">(${s.count})</span></button>`).join('')}</div>`
            : (inputVal.trim() ? '<div class="nm-muted" style="font-size:11px;margin-top:4px;">No matching tags in the index that aren\u2019t already members.</div>' : '');
        const pickerOpen = st.tagAnalyzerAddPickerOpenId === c.id;
        const memberKeys = new Set((c.members || []).map(m => this.matchKey(m.name, st.caseSensitive)));
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const pickerQ = (st.tagAnalyzerAddPickerFilter || '').toLowerCase().trim();
        const pickerSelected = new Set(st.tagAnalyzerAddPickerSelected || []);
        const candidates = pickerOpen
            ? idx.filter(e => {
                const t = String(e.tag ?? '').trim();
                if (!t) return false;
                if (memberKeys.has(this.matchKey(t, st.caseSensitive))) return false;
                return !pickerQ || t.toLowerCase().includes(pickerQ);
            })
            : [];
        const candidatesSlice = candidates.slice(0, 80);
        const inSlice = new Set(candidatesSlice.map(e => String(e.tag ?? '').trim()));
        const hiddenPicked = pickerOpen ? [...pickerSelected].filter(t => !inSlice.has(t)) : [];
        const byName = pickerOpen ? new Map(idx.map(e => [String(e.tag ?? '').trim(), e])) : new Map();
        const rowFor = (t, count) => {
            const on = pickerSelected.has(t);
            return `<label class="nm-inline" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--cards-border-color);cursor:pointer;width:100%;box-sizing:border-box"><input type="checkbox" class="nm-ta-add-picker-cb" data-cluster-id="${c.id}" data-tag="${encodeURIComponent(t)}"${on ? ' checked' : ''}><span><span class="nm-muted">#</span>${this._escape(t)}</span><span class="nm-muted" style="margin-left:auto">${count}</span></label>`;
        };
        const pickerRows = pickerOpen
            ? (
                (hiddenPicked.length ? `<div class="nm-muted" style="font-size:11px;padding:4px 0">Selected (outside current filter)</div>${hiddenPicked.map(t => { const e = byName.get(t); return rowFor(t, e ? Number(e.count) || 0 : 0); }).join('')}` : '')
                + candidatesSlice.map(e => rowFor(String(e.tag ?? '').trim(), Number(e.count) || 0)).join('')
            )
            : '';
        const pickerSelLine = pickerOpen
            ? (pickerSelected.size
                ? `<p class="nm-muted" style="margin:6px 0;font-size:12px;">Selected (${pickerSelected.size}): ${[...pickerSelected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(t => `#${this._escape(t)}`).join(', ')}</p>`
                : '<p class="nm-muted" style="margin:6px 0;font-size:12px;">Tick at least one tag.</p>')
            : '';
        const pickerBlock = pickerOpen
            ? `<div class="nm-ta-add-picker"><div class="nm-field" style="margin:0"><label class="nm-label">Filter tags</label><input class="nm-input nm-ta-add-picker-filter" type="text" data-cluster-id="${c.id}" value="${this._escape(st.tagAnalyzerAddPickerFilter || '')}" placeholder="Substring…"></div>${pickerSelLine}<div class="nm-table-wrap" style="max-height:200px;margin-top:6px">${pickerRows || '<p class="nm-muted" style="padding:8px">No tags match.</p>'}</div><div class="nm-inline" style="margin-top:8px;gap:8px;"><button type="button" class="nm-btn" data-action="ta-add-picker-apply" data-id="${c.id}"${pickerSelected.size ? '' : ' disabled'}>Add selected</button><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-add-picker-cancel" data-id="${c.id}">Close</button></div></div>`
            : '';
        const pickerBtnLabel = pickerOpen ? 'Close picker' : 'Add tags…';
        return `<div class="nm-ta-add-row"><div class="nm-ta-add-input-wrap"><input class="nm-input nm-ta-add-input" type="text" data-cluster-id="${c.id}" value="${this._escape(inputVal)}" placeholder="Add a tag from the index…" autocomplete="off"><button type="button" class="nm-btn nm-btn--secondary nm-ta-add-btn" data-action="ta-add-from-input" data-id="${c.id}"${inputVal.trim() ? '' : ' disabled'}>+ Add</button><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-add-picker-toggle" data-id="${c.id}">${pickerBtnLabel}</button></div>${suggestHTML}${pickerBlock}</div>`;
    }

    _tagAnalyzerClusterBlocksHTML() {
        const st = this._tagState;
        const clusters = this._tagAnalyzerSortedClusters(st);
        if (!clusters.length) {
            return '<p class="nm-muted">No clusters found. Try lowering similarity (looser matches) or raising the usage threshold.</p>';
        }
        return clusters.map(c => {
            const excluded = new Set(c.excludedMembers || []);
            const activeMembers = (c.members || []).filter(m => !excluded.has(m.name));
            const effectiveTarget = this._tagAnalyzerEffectiveReplacement(c, activeMembers);
            const rawRepl = st.tagAnalyzerReplacements[c.id];
            const replInputValue = rawRepl !== undefined ? String(rawRepl) : c.suggestedReplacement;
            const targetForOnHighlight = String(effectiveTarget).trim();
            const open = st.tagAnalyzerOpenClusterId === c.id;
            const pills = c.members.map(m => {
                const isExcluded = excluded.has(m.name);
                const on = !isExcluded && m.name === targetForOnHighlight;
                const wrapClasses = ['nm-ta-mpill'];
                if (on) wrapClasses.push('nm-ta-mpill--on');
                if (isExcluded) wrapClasses.push('nm-ta-mpill--excluded');
                const tagAttr = encodeURIComponent(m.name);
                const xLabel = isExcluded ? '↺' : '×';
                const xAction = isExcluded ? 'ta-restore-member' : 'ta-exclude-member';
                const xTitle = isExcluded ? 'Restore this tag to the cluster' : 'Exclude this tag from this cluster';
                return `<span class="${wrapClasses.join(' ')}"><button type="button" class="nm-ta-mpill-text" data-action="ta-pick-replacement" data-id="${c.id}" data-tag="${tagAttr}" title="Pick as target tag"><span class="nm-muted">#</span>${this._escape(m.name)} <span class="nm-muted">(${m.count})</span></button><button type="button" class="nm-ta-mpill-x" data-action="${xAction}" data-id="${c.id}" data-tag="${tagAttr}" title="${xTitle}" aria-label="${xTitle}">${xLabel}</button></span>`;
            }).join('');
            const manualBadge = c.manual
                ? '<span class="nm-muted" style="font-size:11px;margin-right:6px">Manual</span>'
                : `<button type="button" class="nm-ta-convert-manual" data-action="ta-convert-manual" data-id="${c.id}" title="Convert this auto cluster to a manual cluster so edits persist across re-analyze">Convert to manual</button>`;
            const omitChecked = c.omitFromExport ? ' checked' : '';
            const totalActiveCount = activeMembers.reduce((s, m) => s + (m.count || 0), 0);
            const headerCount = excluded.size > 0
                ? `${activeMembers.length}/${c.members.length} active → 1`
                : `${c.members.length} tags → 1`;
            const skipNote = (activeMembers.length < 2 && !c.omitFromExport)
                ? '<span class="nm-ta-cluster-warn">Skipped in export — fewer than 2 active members</span>'
                : '';
            const detailExcludedNote = excluded.size > 0
                ? `<p class="nm-muted" style="margin-top:4px;font-size:11px;">Excluded (${excluded.size}): ${[...excluded].map(n => `#${this._escape(n)}`).join(', ')}</p>`
                : '';
            const addMembersHTML = open ? this._tagAnalyzerAddMembersUIHTML(c) : '';
            return `<div class="nm-ta-cluster${open ? ' nm-ta-cluster--open' : ''}"><div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:6px 10px;border-bottom:1px solid var(--cards-border-color);flex-wrap:wrap">${manualBadge}<label class="nm-inline" style="margin:0"><input type="checkbox" class="nm-ta-omit-cb" data-cluster-id="${c.id}"${omitChecked}><span class="nm-muted">Omit from export</span></label></div><div class="nm-ta-cluster-head" data-action="ta-toggle-cluster" data-id="${c.id}"><span class="nm-muted" style="flex-shrink:0">${open ? '▲' : '▼'}</span><span style="flex:1;min-width:0">${this._escape(c.members.map(m => m.name).join(', '))}</span><span class="nm-muted" style="flex-shrink:0">${headerCount}${skipNote}</span></div><div class="nm-ta-cluster-detail${open ? ' nm-ta-cluster-detail--open' : ''}"><p class="nm-muted" style="margin:8px 0 4px;">Members — click a tag to pick it as the target, or × to exclude it from this cluster.</p><div class="nm-ta-pills">${pills}</div>${detailExcludedNote}${addMembersHTML}<div class="nm-field" style="margin-top:8px;"><label class="nm-label">Target tag</label><input class="nm-input nm-ta-target-input" type="text" data-cluster-id="${c.id}" value="${this._escape(replInputValue)}"></div><p class="nm-muted" style="margin-top:8px;">Combined record count: <strong>${totalActiveCount}</strong>${excluded.size > 0 ? ` <span class="nm-muted">(of ${c.totalCount} total)</span>` : ''}</p></div></div>`;
        }).join('');
    }

    _resetTagMergeState() {
        const m = this._tagMergeState;
        m.rows = [];
        m.parseNotes = [];
        m.fileName = '';
        m.output = '';
        m.running = false;
        m.rowIdSeq = 0;
        m.totalsOpen = false;
    }

    _tagMergeNextRowId() {
        this._tagMergeState.rowIdSeq += 1;
        return `tm-r-${this._tagMergeState.rowIdSeq}`;
    }

    _tagIndexLookupCount(tagName, idx) {
        const st = this._tagState;
        const target = this.cleanTag(tagName);
        if (!target) return 0;
        const arr = Array.isArray(idx) ? idx : st.tagIndex || [];
        for (const e of arr) {
            const t = String(e.tag ?? '').trim();
            if (!t) continue;
            if (this.matchKey(t, st.caseSensitive) === this.matchKey(target, st.caseSensitive)) return Number(e.count) || 0;
        }
        return 0;
    }

    _tagMergeRefreshRowIndexCounts() {
        const idx = this._tagState.tagIndex || [];
        for (const r of this._tagMergeState.rows) {
            r.fromIndexCount = this._tagIndexLookupCount(r.from, idx);
        }
    }

    _tagMergeNormalizePlan(plan) {
        const notes = [];
        const rows = [];
        if (!Array.isArray(plan)) {
            notes.push('File must be a JSON array of cluster objects.');
            return { rows, parseNotes: notes };
        }
        const st = this._tagState;
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const seenFrom = new Set();
        let clusterOrdinal = 0;
        plan.forEach((raw, fileIdx) => {
            const n = fileIdx + 1;
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                notes.push(`Entry ${n}: skipped (not an object).`);
                return;
            }
            const keys = Object.keys(raw);
            const allowed = new Set(['replacement', 'merging', 'combinedCount']);
            if (keys.length !== 3 || !keys.every(k => allowed.has(k))) {
                notes.push(`Entry ${n}: dropped (each object must contain only replacement, merging, and combinedCount).`);
                return;
            }
            const repRaw = raw.replacement;
            const merRaw = raw.merging;
            const combRaw = raw.combinedCount;
            if (typeof repRaw !== 'string' || !String(repRaw).trim()) {
                notes.push(`Entry ${n}: dropped (replacement must be a non-empty string).`);
                return;
            }
            if (!Array.isArray(merRaw)) {
                notes.push(`Entry ${n}: dropped (merging must be an array).`);
                return;
            }
            if (typeof combRaw !== 'number' || !Number.isFinite(combRaw) || combRaw < 0) {
                notes.push(`Entry ${n}: dropped (combinedCount must be a non-negative number).`);
                return;
            }
            const to = this.cleanTag(repRaw);
            if (!to) {
                notes.push(`Entry ${n}: dropped (replacement normalizes to empty).`);
                return;
            }
            const clusterRows = [];
            for (let mi = 0; mi < merRaw.length; mi++) {
                const m = merRaw[mi];
                if (typeof m !== 'string' || !String(m).trim()) {
                    notes.push(`Entry ${n} merging[${mi}]: skipped (non-string or empty).`);
                    continue;
                }
                const from = this.cleanTag(m);
                if (!from) continue;
                if (this.matchKey(from, st.caseSensitive) === this.matchKey(to, st.caseSensitive)) {
                    notes.push(`Entry ${n}: row dropped (#${from} → #${to}: same tag after normalization).`);
                    continue;
                }
                const fk = this.matchKey(from, st.caseSensitive);
                if (seenFrom.has(fk)) {
                    notes.push(`Entry ${n}: duplicate #${from} — row skipped (first cluster wins).`);
                    continue;
                }
                seenFrom.add(fk);
                clusterRows.push({ from, to });
            }
            if (!clusterRows.length) {
                notes.push(`Entry ${n}: dropped (no executable rows after validation).`);
                return;
            }
            clusterOrdinal += 1;
            const label = String(clusterOrdinal).padStart(2, '0');
            const combined = Math.trunc(combRaw);
            for (const cr of clusterRows) {
                rows.push({
                    id: this._tagMergeNextRowId(),
                    from: cr.from,
                    to: cr.to,
                    clusterLabel: label,
                    clusterCombinedCount: combined,
                    skip: false,
                    fromIndexCount: this._tagIndexLookupCount(cr.from, idx),
                    preview: null,
                });
            }
        });
        return { rows, parseNotes: notes };
    }

    _tagMergeClusterSummaryHtml() {
        const by = new Map();
        for (const r of this._tagMergeState.rows) {
            if (!by.has(r.clusterLabel)) {
                by.set(r.clusterLabel, { combined: r.clusterCombinedCount, indexSumAll: 0, indexSumActive: 0, userSkipped: 0 });
            }
            const g = by.get(r.clusterLabel);
            g.indexSumAll += Number(r.fromIndexCount) || 0;
            if (r.skip) g.userSkipped += 1;
            else g.indexSumActive += Number(r.fromIndexCount) || 0;
        }
        if (!by.size) return '';
        const lines = [...by.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
            .map(([label, g]) => {
                const drift = Math.abs(g.indexSumAll - g.combined) > 1;
                const skipPart = g.userSkipped
                    ? ` <span class="nm-muted">Excluded row notice: ${g.userSkipped} row(s) skipped in UI — effective index-use sum ${g.indexSumActive} vs export combinedCount ${g.combined}.</span>`
                    : '';
                const driftPart = drift ? ' <span class="nm-muted">Index-use sum for grid rows differs from export combinedCount (plan may be stale vs current index).</span>' : '';
                return `<li><strong>Cluster ${label}</strong> — export combinedCount: ${g.combined}; index-use sum at load (all grid rows): ${g.indexSumAll}.${skipPart}${driftPart}</li>`;
            });
        const open = !!this._tagMergeState.totalsOpen;
        const chev = open ? '▼' : '▶';
        const body = open ? `<ul class="nm-muted" style="margin:0;padding-left:18px;font-size:12px;line-height:1.45">${lines.join('')}</ul>` : '';
        return `<div class="nm-card" style="margin-top:12px;"><button type="button" class="nm-btn nm-btn--secondary" data-action="tm-toggle-totals" style="margin-bottom:${open ? '8px' : '0'};display:flex;align-items:center;gap:8px;"><span>${chev}</span><span>Per-cluster totals</span></button>${body}</div>`;
    }

    async _renameTagPairPass(oldTag, newTag, dryRun) {
        const st = this._tagState;
        const opts = this._tagScanOpts();
        let recordsScanned = 0;
        let recordsChanged = 0;
        let recordsUnchanged = 0;
        let lineItemsChanged = 0;
        let segmentsChanged = 0;
        let propertiesChanged = 0;
        let propertyValuesChanged = 0;
        let unchangedCaseMismatch = 0;
        let unchangedNoExactMatch = 0;
        const errors = [];
        await this.forEachScannableRecord(opts, async (record) => {
            recordsScanned += 1;
            try {
                const changed = await this._renameTagInRecord({
                    record,
                    oldTag,
                    newTag,
                    caseSensitive: st.caseSensitive,
                    dryRun,
                    collectRows: null,
                });
                if (changed.recordChanged) recordsChanged += 1;
                else {
                    recordsUnchanged += 1;
                    if (changed.unchangedReason === 'case-mismatch') unchangedCaseMismatch += 1;
                    else unchangedNoExactMatch += 1;
                }
                lineItemsChanged += changed.lineItemsChanged;
                segmentsChanged += changed.segmentsChanged;
                propertiesChanged += changed.propertiesChanged;
                propertyValuesChanged += changed.propertyValuesChanged;
            } catch (e) {
                errors.push({
                    recordGuid: record?.guid || '',
                    recordName: record.getName?.() || '(unknown)',
                    error: String(e?.message || e),
                });
            }
        });
        return {
            recordsScanned,
            recordsChanged,
            recordsUnchanged,
            lineItemsChanged,
            segmentsChanged,
            propertiesChanged,
            propertyValuesChanged,
            unchangedCaseMismatch,
            unchangedNoExactMatch,
            errors,
        };
    }

    async _previewTagMerge() {
        const m = this._tagMergeState;
        if (m.running || !m.rows.length) return;
        await this._ensureTagLoaded(true);
        this._tagMergeRefreshRowIndexCounts();
        m.running = true;
        if (this._panel) this._render(this._panel);
        const lines = [
            'Tag merge — Preview (no writes)',
            `Run timestamp: ${new Date().toLocaleString()}`,
            '',
        ];
        for (const row of m.rows) {
            if (row.skip) {
                lines.push(`SKIP (UI) #${row.from} → #${row.to} [cluster ${row.clusterLabel}]`);
                row.preview = null;
                continue;
            }
            const stats = await this._renameTagPairPass(row.from, row.to, true);
            row.preview = stats;
            lines.push(
                `#${row.from} → #${row.to} [cluster ${row.clusterLabel}] — records scanned: ${stats.recordsScanned}; changed: ${stats.recordsChanged}; unchanged: ${stats.recordsUnchanged}; line items: ${stats.lineItemsChanged}; occurrences: ${stats.segmentsChanged}; properties: ${stats.propertiesChanged}; property values: ${stats.propertyValuesChanged}; unchanged (case mismatch): ${stats.unchangedCaseMismatch}; unchanged (no exact tag): ${stats.unchangedNoExactMatch}; errors: ${stats.errors.length}`
            );
            if (stats.errors.length) {
                for (const er of stats.errors.slice(0, 5)) lines.push(`  - ${er.recordName} → ${er.error}`);
                if (stats.errors.length > 5) lines.push(`  ... +${stats.errors.length - 5} more`);
            }
        }
        lines.push('', 'Checksum (export combinedCount vs index-use sum at load for grid rows in that cluster): see Per-cluster totals card.');
        m.running = false;
        const out = lines.join('\n');
        m.output = out;
        this._logRow('tag-merge', 'preview', { recordGuid: '', recordName: '' }, out);
        this._setStatus('Preview complete. Detailed results are in the Tag merge output panel and review log.', { title: 'Tag merge', autoDestroyTime: 3500 });
        if (this._panel) this._render(this._panel);
    }

    async _applyTagMerge() {
        const m = this._tagMergeState;
        if (m.running || !m.rows.length) return;
        await this._ensureTagLoaded(true);
        this._tagMergeRefreshRowIndexCounts();
        m.running = true;
        if (this._panel) this._render(this._panel);
        const lines = [
            'Tag merge — Apply (writes)',
            `Run timestamp: ${new Date().toLocaleString()}`,
            '',
        ];
        const appliedFrom = [];
        for (const row of m.rows) {
            if (row.skip) {
                lines.push(`SKIP (UI) #${row.from} → #${row.to} [cluster ${row.clusterLabel}]`);
                continue;
            }
            const stats = await this._renameTagPairPass(row.from, row.to, false);
            row.preview = stats;
            appliedFrom.push(row.from);
            lines.push(
                `#${row.from} → #${row.to} [cluster ${row.clusterLabel}] — records changed: ${stats.recordsChanged}; unchanged: ${stats.recordsUnchanged}; occurrences: ${stats.segmentsChanged}; errors: ${stats.errors.length}`
            );
            if (stats.errors.length) {
                for (const er of stats.errors.slice(0, 8)) lines.push(`  - ${er.recordName} → ${er.error}`);
            }
        }
        await this._refreshTagIndex();
        lines.push('', 'Post-apply: index refreshed. Residual source tags:');
        for (const from of appliedFrom) {
            const cnt = this._tagIndexLookupCount(from, this._tagState.tagIndex);
            if (cnt > 0) lines.push(`  WARN #${from} still in index with count ${cnt}`);
            else lines.push(`  OK #${from} — index count 0`);
        }
        const by = new Map();
        for (const r of m.rows) {
            if (!by.has(r.clusterLabel)) {
                by.set(r.clusterLabel, { combined: r.clusterCombinedCount, appliedRows: 0, sumChanged: 0, sumIndexActive: 0, skipped: 0 });
            }
            const g = by.get(r.clusterLabel);
            if (r.skip) g.skipped += 1;
            else {
                g.appliedRows += 1;
                g.sumIndexActive += Number(r.fromIndexCount) || 0;
                g.sumChanged += Number(r.preview?.recordsChanged) || 0;
            }
        }
        lines.push('', 'Per-cluster apply summary (records changed sums per row; may double-count shared notes across rows):');
        for (const [label, g] of [...by.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))) {
            const note = g.skipped ? `; ${g.skipped} UI-skipped row(s); effective index-use sum at load ${g.sumIndexActive}` : '';
            lines.push(`  Cluster ${label}: export combinedCount ${g.combined}; sum of records-changed (this run) ${g.sumChanged}${note}`);
        }
        m.running = false;
        const out = lines.join('\n');
        m.output = out;
        this._logRow('tag-merge', 'summary', { recordGuid: '', recordName: '' }, out);
        this._setStatus('Apply complete. Detailed results are in the Tag merge output panel and review log.', { title: 'Tag merge', autoDestroyTime: 4000 });
        if (this._panel) this._render(this._panel);
    }

    _buildTagMergeHTML() {
        const st = this._tagState;
        const m = this._tagMergeState;
        const adv = this._tagAdvancedState(st);
        const runDisabled = m.running || !m.rows.length ? ' disabled' : '';
        const parseBlock = m.parseNotes.length
            ? `<div class="nm-card" style="margin-top:12px;"><p class="nm-title" style="font-size:13px;">Load notes</p><ul class="nm-muted" style="margin:0;padding-left:18px;font-size:12px;line-height:1.45">${m.parseNotes.map(t => `<li>${this._escape(t)}</li>`).join('')}</ul></div>`
            : '';
        const tableRows = m.rows.length
            ? m.rows
                  .map(r => {
                      const pr = r.preview;
                      const prevCol = r.skip
                          ? '—'
                          : pr
                            ? `${pr.recordsChanged} Δrec / ${pr.segmentsChanged} occ`
                            : '—';
                      return `<tr><td><span class="nm-muted">#</span>${this._escape(r.from)}</td><td><span class="nm-muted">#</span>${this._escape(r.to)}</td><td>cluster ${this._escape(r.clusterLabel)}</td><td style="text-align:center"><label class="nm-inline" style="margin:0;justify-content:center"><input type="checkbox" class="nm-tm-skip-cb" data-row-id="${this._escape(r.id)}"${r.skip ? ' checked' : ''}><span class="nm-muted">Skip</span></label></td><td class="nm-muted" style="font-size:12px">${this._escape(prevCol)}</td></tr>`;
                  })
                  .join('')
            : '';
        const totalRows = m.rows.length;
        const skippedRows = m.rows.filter(r => r.skip).length;
        const activeRows = totalRows - skippedRows;
        const gridMeta = totalRows ? `Rows: ${activeRows}/${totalRows} | Skip: ${skippedRows}` : 'Rows: 0/0 | Skip: 0';
        const allSkipped = m.rows.length > 0 && m.rows.every(r => r.skip);
        const table = m.rows.length
            ? `<div class="nm-table-wrap nm-tm-table-wrap" style="max-height:360px;margin-top:10px"><table class="nm-table"><thead><tr><th>From tag</th><th>To tag</th><th>Cluster</th><th style="width:120px;text-align:center"><label class="nm-inline" style="justify-content:center;align-items:center;margin:0"><input type="checkbox" data-action="tm-skip-all"${allSkipped ? ' checked' : ''}> <span class="nm-muted">Skip</span></label></th><th>Preview</th></tr></thead><tbody>${tableRows}</tbody></table></div>`
            : '<p class="nm-muted" style="margin-top:10px">No plan loaded yet.</p>';
        const outBlock = m.output.trim()
            ? `<div class="nm-card" style="margin-top:12px;"><p class="nm-title" style="font-size:13px;">Output</p><pre class="nm-ta-export-pre" style="max-height:220px">${this._escape(m.output)}</pre></div>`
            : '';
        return `${this._shellFrameOpen()}<div class="nm-card"><p class="nm-title">Tag merge</p><p class="nm-text">Load a <strong>tag-consolidation-plan</strong> JSON array (objects with <code>replacement</code>, <code>merging</code>, <code>combinedCount</code> only). Each <code>merging</code> entry becomes one row. Use <strong>Skip</strong> to exclude a row from preview/apply. Preview and apply use the same scan logic as Tag rename (quick).</p><p class="nm-muted" style="margin-top:6px;">Index scope: ${this._escape(adv)}</p><div class="nm-inline" style="margin:12px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;"><button type="button" class="nm-btn nm-btn--secondary" data-action="tr-refresh-index">Refresh index</button><span class="nm-muted">${this._escape(st.indexMeta)}</span></div><div class="nm-adv"><div class="nm-adv-head" data-action="tr-toggle-advanced"><span class="nm-muted">${st.advancedOpen ? '▾' : '▸'} Matching options</span><span class="nm-muted">${this._escape(adv)}</span></div>${st.advancedOpen ? `<div class="nm-adv-body"><div class="nm-field-grid"><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-case"${st.caseSensitive ? ' checked' : ''}> <span class="nm-muted">Case-sensitive matching</span></label></div><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-exclude-choice"${st.excludeChoiceValues ? ' checked' : ''}> <span class="nm-muted">Exclude choice/enum from tag list</span></label></div>${this._buildExcludedCollectionsFieldHTML()}</div></div>` : ''}</div><div class="nm-inline" style="gap:8px;flex-wrap:wrap;margin-top:8px"><input type="file" class="nm-tm-file" accept=".json,application/json" hidden><button type="button" class="nm-btn" data-action="tm-choose-file">Load consolidation plan…</button>${m.rows.length ? `<button type="button" class="nm-btn nm-btn--secondary" data-action="tm-clear-plan">Clear plan</button><span class="nm-muted" style="font-size:12px">${this._escape(m.fileName || 'loaded')}</span>` : ''}</div>${parseBlock}${this._tagMergeClusterSummaryHtml()}<div class="nm-status">${this._escape(gridMeta)}</div>${table}<div class="nm-actions" style="margin-top:12px;"><button type="button" class="nm-btn nm-btn--secondary"${runDisabled} data-action="tm-preview">Preview</button><button type="button" class="nm-btn"${runDisabled} data-action="tm-apply">Apply</button></div>${outBlock}</div><div class="nm-actions"><button type="button" class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${this._shellFrameClose()}`;
    }

    _buildTagAnalyzerHTML() {
        const st = this._tagState;
        const adv = this._tagAdvancedState(st);
        const idx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
        const allTags = idx.map(e => ({ name: String(e.tag ?? '').trim(), count: Number(e.count) || 0 })).filter(t => t.name);
        const maxCount = Math.max(20, ...allTags.map(t => t.count), 1);
        const th = Math.max(1, Math.min(Number(st.tagAnalyzerThreshold) || 5, maxCount));
        const simPct = Math.max(15, Math.min(Number(st.tagAnalyzerSimPercent) || 35, 70));
        const lowSetup = allTags.filter(t => t.count <= th);
        const highSetup = allTags.filter(t => t.count > th);
        const total = allTags.length;
        const head = `${this._shellFrameOpen()}<div class="nm-card"><p class="nm-title">Tag analyzer</p><p class="nm-text">Find merge candidates from your tag index: low-use tags seed clusters; similar tags (spelling, tokens, or substring overlap) group together. Adjust scope with <strong>Matching options</strong> on Tag rename or Tag review, then <strong>Refresh index</strong>.</p><p class="nm-muted" style="margin-top:6px;">Index scope: ${this._escape(adv)}</p><div class="nm-inline" style="margin:12px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;"><button type="button" class="nm-btn nm-btn--secondary" data-action="tr-refresh-index">Refresh index</button><span class="nm-muted">${this._escape(st.indexMeta)}</span></div>`;

        if (st.tagAnalyzerPhase !== 'results') {
            const statSetup = total
                ? `<div class="nm-ta-stat-grid"><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${total}</div><div class="nm-ta-stat-lbl">Total tags</div></div><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${lowSetup.length}</div><div class="nm-ta-stat-lbl">At or below threshold</div></div><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${highSetup.length}</div><div class="nm-ta-stat-lbl">Above threshold</div></div></div>`
                : '';
            const controls = `<div class="nm-field-grid" style="margin-top:12px;"><div class="nm-field"><label class="nm-label" for="nm-ta-th">Usage threshold ≤ ${th}</label><input id="nm-ta-th" class="nm-ta-range nm-ta-threshold-range" type="range" min="1" max="${maxCount}" value="${th}"><p class="nm-muted" style="margin-top:4px;font-size:12px;">Tags with this many uses or fewer are candidates for clustering.</p></div><div class="nm-field"><label class="nm-label" for="nm-ta-sim">Similarity sensitivity: ${simPct}%</label><input id="nm-ta-sim" class="nm-ta-range nm-ta-sim-range" type="range" min="15" max="70" value="${simPct}"><p class="nm-muted" style="margin-top:4px;font-size:12px;">Lower = looser matches. Higher = stricter (same idea as the standalone Tag Triage tool).</p></div></div>`;
            const analyzeDisabled = !total ? ' disabled' : '';
            const body = `${statSetup}${controls}<div class="nm-actions" style="margin-top:12px;"><button type="button" class="nm-btn"${analyzeDisabled} data-action="ta-analyze">Analyze &amp; find clusters</button></div>`;
            return `${head}${body}</div><div class="nm-actions"><button type="button" class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${this._shellFrameClose()}`;
        }

        const clusters = st.tagAnalyzerClusters || [];
        const orphans = st.tagAnalyzerOrphans || [];
        const lowN = st.tagAnalyzerLastLowCount || 0;
        const savings = lowN - clusters.length - orphans.length;
        const statsRes = `<div class="nm-ta-stat-grid nm-ta-stat-grid--4"><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${lowN}</div><div class="nm-ta-stat-lbl">Low-use tags</div></div><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${clusters.length}</div><div class="nm-ta-stat-lbl">Clusters</div></div><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${orphans.length}</div><div class="nm-ta-stat-lbl">Orphans</div></div><div class="nm-ta-stat-card"><div class="nm-ta-stat-val">${savings}</div><div class="nm-ta-stat-lbl">Potential savings</div></div></div><p class="nm-muted" style="font-size:12px;margin:-4px 0 8px;">Low-use count minus clusters minus orphans (same idea as the Tag Triage reference).</p>`;
        const order = st.tagAnalyzerClusterOrder || 'processed';
        const orderBtns = `<div class="nm-inline" style="margin:10px 0;gap:8px;flex-wrap:wrap;align-items:center;"><span class="nm-muted" style="font-size:12px">Order clusters:</span><button type="button" class="nm-btn${order === 'processed' ? '' : ' nm-btn--secondary'}" data-action="ta-cluster-order" data-order="processed">Processed</button><button type="button" class="nm-btn${order === 'size-desc' ? '' : ' nm-btn--secondary'}" data-action="ta-cluster-order" data-order="size-desc">Size (desc)</button><button type="button" class="nm-btn${order === 'combined-desc' ? '' : ' nm-btn--secondary'}" data-action="ta-cluster-order" data-order="combined-desc">Combined count (desc)</button></div>`;
        const clusterHtml = orderBtns + this._tagAnalyzerClusterBlocksHTML() + this._tagAnalyzerManualPickHTML();
        const orphanBlock = orphans.length
            ? `<div id="nm-ta-orphan-tags" class="nm-card" style="margin-top:12px;"><div class="nm-inline" style="justify-content:space-between;align-items:center;width:100%;margin-bottom:6px;gap:8px;"><p class="nm-title" style="font-size:14px;margin:0;">Orphan tags</p><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-copy-orphans">Copy</button></div><p class="nm-muted" style="margin-bottom:8px;">Low-use tags that did not join any cluster. Review or rename them manually.</p><div class="nm-ta-pills">${orphans.map(t => `<span class="nm-ta-pill" style="cursor:default"><span class="nm-muted">#</span>${this._escape(t.name)} <span class="nm-muted">(${t.count})</span></span>`).join('')}</div></div>`
            : '';
        const exportJson = st.tagAnalyzerExportVisible ? this._tagAnalyzerExportPlanDisplayText() : '';
        const exportBlock = st.tagAnalyzerExportVisible
            ? `<div id="nm-ta-export-json" class="nm-card" style="margin-top:12px;"><div class="nm-inline" style="justify-content:space-between;align-items:center;width:100%;margin-bottom:6px;gap:8px;"><span class="nm-label" style="margin:0;flex-shrink:0">Consolidation plan (JSON)</span><div class="nm-inline" style="gap:8px;flex-shrink:0;margin-left:auto"><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-save-plan">Save export JSON</button><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-copy-plan">Copy</button></div></div><pre class="nm-ta-export-pre">${this._escape(exportJson)}</pre></div>`
            : '';
        const exportToggleLabel = st.tagAnalyzerExportVisible ? 'Close export JSON' : 'Show export JSON';
        const jumpOrphansDisabled = orphans.length ? '' : ' disabled';
        const resBody = `<button type="button" class="nm-btn nm-btn--secondary" data-action="ta-back-analyzer" style="margin-bottom:10px;">← Change threshold / sensitivity</button>${statsRes}<div class="nm-actions" style="margin:8px 0 10px;"><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-jump-export">Jump to export JSON</button><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-jump-orphans"${jumpOrphansDisabled}>Jump to orphan tags</button></div><p class="nm-title" style="margin-top:8px;font-size:14px;">Consolidation clusters</p>${clusterHtml}${orphanBlock}<div class="nm-actions" style="margin-top:12px;"><button type="button" class="nm-btn nm-btn--secondary" data-action="ta-export-plan">${exportToggleLabel}</button></div>${exportBlock}`;
        return `${head}${resBody}</div><div class="nm-actions"><button type="button" class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${this._shellFrameClose()}`;
    }

    /**
     * Coalesces rapid filter / range typing into a single render. State mutations stay synchronous
     * so values are correct in the next render — only the costly innerHTML rewrite is deferred.
     * Any explicit `_render()` cancels the pending debounced one.
     */
    _scheduleDebouncedRender(ms = 120) {
        if (this._renderDebounceTimer) clearTimeout(this._renderDebounceTimer);
        this._renderDebounceTimer = setTimeout(() => {
            this._renderDebounceTimer = null;
            if (this._panel) this._render(this._panel);
        }, ms);
    }

    _render(panel) {
        const el = panel.getElement();
        if (!el) return;
        if (this._renderDebounceTimer) {
            clearTimeout(this._renderDebounceTimer);
            this._renderDebounceTimer = null;
        }
        const focusState = this._captureFocusState(el);
        const scrollState = this._captureScrollState(el);
        this._displayRowsCache = {};
        try {
            let html = '';
            if (this._mode === 'bulk-move') html = this._buildBulkMoveHTML();
            else if (this._mode === 'assign-parent') html = this._buildAssignParentHTML();
            else if (this._mode === 'tag-rename') html = this._buildTagRenameHTML();
            else if (this._mode === 'tag-review') html = this._buildTagReviewHTML();
            else if (this._mode === 'tag-analyzer') html = this._buildTagAnalyzerHTML();
            else if (this._mode === 'tag-merge') html = this._buildTagMergeHTML();
            else html = this._buildHomeHTML();
            el.innerHTML = html;
            if (this._listenerAbort) this._listenerAbort.abort();
            this._listenerAbort = new AbortController();
            this._attachListeners(el, this._listenerAbort.signal);
            this._restoreFocusState(el, focusState);
            this._restoreScrollState(el, scrollState);
        } finally {
            this._displayRowsCache = null;
        }
    }

    _attachListeners(el, signal) {
        const trigger = el.querySelector('.nm-menu-trigger');
        const drop = el.querySelector('.nm-dropdown');
        if (trigger && drop) {
            trigger.addEventListener('click', e => {
                e.stopPropagation();
                drop.hidden = !drop.hidden;
                if (!drop.hidden) document.addEventListener('click', () => { drop.hidden = true; }, { once: true });
            }, { signal });
        }
        el.addEventListener('click', async e => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            switch (action) {
                case 'set-mode': {
                    const next = target.dataset.mode || 'home';
                    if (this._mode === 'tag-merge' && next !== 'tag-merge') this._resetTagMergeState();
                    if (next === 'home') {
                        if (this._mode === 'bulk-move') await this._resetBulkMoveForm();
                        if (this._mode === 'assign-parent') this._resetAssignForm();
                        if (this._mode === 'tag-rename' || this._mode === 'tag-review' || this._mode === 'tag-analyzer') this._resetTagForm();
                    }
                    this._mode = next;
                    this._settings.defaultMode = next;
                    this._saveSettings();
                    if (next === 'bulk-move') await this._ensureBulkMoveLoaded();
                    if (next === 'assign-parent') await this._ensureAssignLoaded();
                    if (next === 'tag-rename' || next === 'tag-review' || next === 'tag-analyzer' || next === 'tag-merge') await this._ensureTagLoaded(true);
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'toggle-review-log': this._settings.reviewLogCollapsed = !this._settings.reviewLogCollapsed; this._saveSettings(); if (this._panel) this._render(this._panel); break;
                case 'export-log-json': this._exportLogJSON(); break;
                case 'clear-log': this._activityLog = []; if (this._panel) this._render(this._panel); break;
                case 'bm-select-all': for (const rec of this._bulkMoveState.filtered) this._bulkMoveState.selectedGuids.add(rec.guid); if (this._panel) this._render(this._panel); break;
                case 'bm-select-none': this._bulkMoveState.selectedGuids.clear(); this._applyBulkMoveFilter(); if (this._panel) this._render(this._panel); break;
                case 'bm-toggle': { const g = target.dataset.guid; if (g) { if (target.checked) this._bulkMoveState.selectedGuids.add(g); else this._bulkMoveState.selectedGuids.delete(g); this._applyBulkMoveFilter(); if (this._panel) this._render(this._panel); } break; }
                case 'bm-refresh': await this._loadBulkMoveRecords(); this._toast('Bulk move', 'Record list refreshed.', 2500); if (this._panel) this._render(this._panel); break;
                case 'bm-preview': await this._previewBulkMove(); if (this._panel) this._render(this._panel); break;
                case 'run-bulk-move': await this._runBulkMove(); if (this._panel) this._render(this._panel); break;
                case 'ap-toggle': { const row = this._assignState.rows.find(r => r.guid === target.dataset.guid); if (row) { row.checked = !!target.checked; if (this._panel) this._render(this._panel); } break; }
                case 'ap-parent-pick': { const picked = this._assignState.recordMap.get(target.dataset.guid); if (picked) { this._assignState.parentGuid = picked.guid; this._assignState.parentQuery = picked.fullTitle; this._assignState.parentSearchOpen = false; this._assignState.parentSuggestActiveIndex = -1; this._rebuildAssignRows(); if (this._panel) this._render(this._panel); } break; }
                case 'ap-parent-clear': this._assignState.parentGuid = ''; this._assignState.parentQuery = ''; this._assignState.parentSearchOpen = false; this._assignState.parentSuggestActiveIndex = -1; this._rebuildAssignRows(); if (this._panel) this._render(this._panel); break;
                case 'ap-filter-clear': this._assignState.filterText = ''; if (this._panel) this._render(this._panel); break;
                case 'ap-preview': this._previewAssign(); if (this._panel) this._render(this._panel); break;
                case 'run-assign-parent': await this._runAssignParent(); if (this._panel) this._render(this._panel); break;
                case 'tr-old-clear': this._tagState.oldTag = ''; this._tagState.oldSearchOpen = false; this._tagState.suggestActiveIndex = -1; if (this._panel) this._render(this._panel); break;
                case 'tr-old-pick': this._tagState.oldTag = `#${target.dataset.tag || ''}`; this._tagState.oldSearchOpen = false; this._tagState.suggestActiveIndex = -1; if (this._panel) this._render(this._panel); break;
                case 'tr-new-clear': this._tagState.newTag = ''; if (this._panel) this._render(this._panel); break;
                case 'tr-exclude-picker-toggle': {
                    e.stopPropagation();
                    if (!this._tagState.excludedPickerOpen) {
                        await this._loadExcludePickerCollections();
                        this._tagState.excludedPickerOpen = true;
                    } else {
                        this._tagState.excludedPickerOpen = false;
                        this._tagState.excludedPickerFilter = '';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-exclude-select-filtered':
                    await this._excludeSelectFilteredCollections();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-exclude-clear-all':
                    this._commitExcludedCollectionsRaw('');
                    this._tagState.excludedPickerFilter = '';
                    this._tagState.excludedPickerOpen = false;
                    await this._refreshTagIndex();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-toggle-advanced': this._tagState.advancedOpen = !this._tagState.advancedOpen; if (this._panel) this._render(this._panel); break;
                case 'tr-toggle-trace-output': if (this._tagState.traceOutput?.trim()) { this._tagState.traceOpen = !this._tagState.traceOpen; if (this._panel) this._render(this._panel); } break;
                case 'tr-copy-trace':
                    if (!this._tagState.traceOutput?.trim()) break;
                    try {
                        await navigator.clipboard.writeText(this._tagState.traceOutput);
                        this._toast('Trace output', 'Copied to clipboard.', 2500);
                    } catch (_) {
                        this._toast('Trace output', 'Clipboard copy failed.', 3000);
                    }
                    break;
                case 'tr-rg-build': await this._reviewGridBuild(); if (this._panel) this._render(this._panel); break;
                case 'tr-rg-preview': this._reviewGridPreview(); if (this._panel) this._render(this._panel); break;
                case 'tr-rg-apply': await this._reviewGridApply(); if (this._panel) this._render(this._panel); break;
                case 'tr-rg-source-clear':
                    this._tagState.reviewGridSourceTag = '';
                    this._tagState.reviewGridSourceSearchOpen = false;
                    this._clearReviewGridQueue();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-rg-source-pick':
                    this._tagState.reviewGridSourceTag = `#${target.dataset.tag || ''}`;
                    this._tagState.reviewGridSourceSearchOpen = false;
                    void (async () => {
                        await this._reviewGridBuild();
                        if (this._panel) this._render(this._panel);
                    })();
                    break;
                case 'tr-rg-target-clear':
                    this._tagState.reviewGridDefaultTarget = '';
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-rg-default-all': {
                    const rows = this._reviewGridRowsForDisplay();
                    for (const row of rows) {
                        row.action = target.checked ? 'default' : 'skip';
                        row.overrideTarget = '';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rg-skip-all': {
                    const rows = this._reviewGridRowsForDisplay();
                    for (const row of rows) {
                        row.action = target.checked ? 'skip' : 'default';
                        row.overrideTarget = '';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rg-default': {
                    const row = this._tagState.reviewGridRows.find(r => r.id === target.dataset.id);
                    if (row) { row.action = target.checked ? 'default' : 'skip'; if (row.action !== 'override') row.overrideTarget = ''; if (this._panel) this._render(this._panel); }
                    break;
                }
                case 'tr-rg-skip': {
                    const row = this._tagState.reviewGridRows.find(r => r.id === target.dataset.id);
                    if (row) { row.action = target.checked ? 'skip' : 'default'; if (row.action !== 'override') row.overrideTarget = ''; if (this._panel) this._render(this._panel); }
                    break;
                }
                case 'tr-rg-override-clear': {
                    const row = this._tagState.reviewGridRows.find(r => r.id === target.dataset.id);
                    if (!row) break;
                    row.overrideTarget = '';
                    row.action = 'default';
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rg-toggle-group': {
                    const source = target.dataset.source || '';
                    if (!source) break;
                    const set = this._tagState.reviewGridCollapsedSources;
                    if (set.has(source)) set.delete(source);
                    else set.add(source);
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rg-group-default': {
                    const tagKey = target.dataset.source || '';
                    if (!tagKey) break;
                    for (const row of this._tagState.reviewGridRows) {
                        const k = this.cleanTag(row.sourceTag || '') || '(none)';
                        if (k !== tagKey) continue;
                        row.action = 'default';
                        row.overrideTarget = '';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rg-group-skip': {
                    const tagKey = target.dataset.source || '';
                    if (!tagKey) break;
                    for (const row of this._tagState.reviewGridRows) {
                        const k = this.cleanTag(row.sourceTag || '') || '(none)';
                        if (k !== tagKey) continue;
                        row.action = 'skip';
                        row.overrideTarget = '';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rg-open-record': {
                    const guid = target.dataset.guid || '';
                    void this._openReviewGridRecordInOtherPanel(guid);
                    break;
                }
                case 'tr-submode-grid':
                    this._tagState.tagReviewSubMode = 'grid';
                    this._clearRemoveTagQueue();
                    this._clearAddTagWorkflow();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-submode-remove':
                    this._tagState.tagReviewSubMode = 'remove';
                    this._resetReviewGridWorkflow();
                    this._clearAddTagWorkflow();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-submode-add':
                    this._tagState.tagReviewSubMode = 'add';
                    this._resetReviewGridWorkflow();
                    this._clearRemoveTagQueue();
                    this._tagState.removeTagTag = '';
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-rt-build':
                    void (async () => {
                        await this._removeTagBuild();
                        if (this._panel) this._render(this._panel);
                    })();
                    break;
                case 'tr-rt-preview':
                    this._removeTagPreview();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-rt-apply':
                    void (async () => {
                        await this._removeTagApply();
                        if (this._panel) this._render(this._panel);
                    })();
                    break;
                case 'tr-rt-tag-clear':
                    this._tagState.removeTagTag = '';
                    this._clearRemoveTagQueue();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-rt-default-all': {
                    const rows = this._removeTagRowsForDisplay();
                    for (const row of rows) {
                        row.action = target.checked ? 'default' : 'skip';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rt-skip-all': {
                    const rows = this._removeTagRowsForDisplay();
                    for (const row of rows) {
                        row.action = target.checked ? 'skip' : 'default';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-rt-default': {
                    const row = this._tagState.removeTagRows.find(r => r.id === target.dataset.id);
                    if (row) { row.action = target.checked ? 'default' : 'skip'; if (this._panel) this._render(this._panel); }
                    break;
                }
                case 'tr-rt-skip': {
                    const row = this._tagState.removeTagRows.find(r => r.id === target.dataset.id);
                    if (row) { row.action = target.checked ? 'skip' : 'default'; if (this._panel) this._render(this._panel); }
                    break;
                }
                case 'tr-at-build':
                    void (async () => {
                        await this._addTagBuild();
                        if (this._panel) this._render(this._panel);
                    })();
                    break;
                case 'tr-at-preview':
                    this._addTagPreview();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-at-apply':
                    void (async () => {
                        await this._addTagApply();
                        if (this._panel) this._render(this._panel);
                    })();
                    break;
                case 'tr-at-tag-clear':
                    this._tagState.addTagTag = '';
                    this._clearAddTagQueue();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-at-default-all': {
                    const rows = this._addTagRowsForDisplay();
                    for (const row of rows) {
                        row.action = target.checked ? 'default' : 'none';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-at-skip-all': {
                    const rows = this._addTagRowsForDisplay();
                    for (const row of rows) {
                        row.action = target.checked ? 'skip' : 'none';
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tr-at-default': {
                    const row = this._tagState.addTagRows.find(r => r.id === target.dataset.id);
                    if (row) {
                        row.action = target.checked ? 'default' : 'none';
                        if (this._panel) this._render(this._panel);
                    }
                    break;
                }
                case 'tr-at-skip': {
                    const row = this._tagState.addTagRows.find(r => r.id === target.dataset.id);
                    if (row) {
                        row.action = target.checked ? 'skip' : 'none';
                        if (this._panel) this._render(this._panel);
                    }
                    break;
                }
                case 'tr-refresh-index':
                    await this._refreshTagIndex();
                    this._toast('Tag index', 'Index refreshed.', 2500);
                    if (this._mode === 'tag-analyzer') this._tagAnalyzerClearResults();
                    if (this._mode === 'tag-merge' && this._tagMergeState.rows.length) this._tagMergeRefreshRowIndexCounts();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tm-choose-file': {
                    const fin = el.querySelector('.nm-tm-file');
                    if (fin instanceof HTMLInputElement) fin.click();
                    break;
                }
                case 'tm-clear-plan':
                    this._resetTagMergeState();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tm-toggle-totals':
                    this._tagMergeState.totalsOpen = !this._tagMergeState.totalsOpen;
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tm-skip-all': {
                    const checked = !!target.checked;
                    for (const row of this._tagMergeState.rows) row.skip = checked;
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'tm-preview':
                    await this._previewTagMerge();
                    break;
                case 'tm-apply':
                    await this._applyTagMerge();
                    break;
                case 'ta-analyze':
                    this._runTagAnalyzerClustering();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'ta-back-analyzer':
                    this._tagAnalyzerClearResults();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'ta-toggle-cluster': {
                    const cid = Number(target.dataset.id);
                    if (!Number.isFinite(cid)) break;
                    this._tagState.tagAnalyzerOpenClusterId = this._tagState.tagAnalyzerOpenClusterId === cid ? null : cid;
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-pick-replacement': {
                    const rid = Number(target.dataset.id);
                    let tname = '';
                    try {
                        tname = decodeURIComponent(target.dataset.tag || '');
                    } catch (_) {
                        tname = '';
                    }
                    if (!Number.isFinite(rid) || !tname) break;
                    const cl = this._tagState.tagAnalyzerClusters.find(c => c.id === rid);
                    if (cl && Array.isArray(cl.excludedMembers) && cl.excludedMembers.includes(tname)) {
                        cl.excludedMembers = cl.excludedMembers.filter(n => n !== tname);
                    }
                    this._tagState.tagAnalyzerReplacements[rid] = tname;
                    this._tagState.tagAnalyzerOpenClusterId = rid;
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-exclude-member':
                case 'ta-restore-member': {
                    const rid = Number(target.dataset.id);
                    let tname = '';
                    try {
                        tname = decodeURIComponent(target.dataset.tag || '');
                    } catch (_) {
                        tname = '';
                    }
                    if (!Number.isFinite(rid) || !tname) break;
                    const cl = this._tagState.tagAnalyzerClusters.find(c => c.id === rid);
                    if (!cl) break;
                    if (!Array.isArray(cl.excludedMembers)) cl.excludedMembers = [];
                    const isMember = cl.members.some(m => m.name === tname);
                    if (!isMember) break;
                    if (action === 'ta-exclude-member') {
                        if (!cl.excludedMembers.includes(tname)) cl.excludedMembers.push(tname);
                        const rawRepl = this._tagState.tagAnalyzerReplacements[cl.id];
                        const pickedNorm = rawRepl !== undefined ? String(rawRepl).trim() : '';
                        if (pickedNorm === tname) {
                            const active = cl.members.filter(m => !cl.excludedMembers.includes(m.name));
                            if (active.length) {
                                const next = active.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a)).name;
                                this._tagState.tagAnalyzerReplacements[cl.id] = next;
                            } else {
                                delete this._tagState.tagAnalyzerReplacements[cl.id];
                            }
                        }
                    } else {
                        cl.excludedMembers = cl.excludedMembers.filter(n => n !== tname);
                    }
                    this._tagState.tagAnalyzerOpenClusterId = cl.id;
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-convert-manual': {
                    const rid = Number(target.dataset.id);
                    if (!Number.isFinite(rid)) break;
                    const st = this._tagState;
                    const cl = st.tagAnalyzerClusters.find(c => c.id === rid);
                    if (!cl || cl.manual) break;
                    const newId = ++st.tagAnalyzerNextClusterId;
                    if (Object.prototype.hasOwnProperty.call(st.tagAnalyzerReplacements, cl.id)) {
                        st.tagAnalyzerReplacements[newId] = st.tagAnalyzerReplacements[cl.id];
                        delete st.tagAnalyzerReplacements[cl.id];
                    }
                    if (st.tagAnalyzerOpenClusterId === cl.id) st.tagAnalyzerOpenClusterId = newId;
                    cl.id = newId;
                    cl.manual = true;
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-add-from-input':
                case 'ta-add-suggest': {
                    const rid = Number(target.dataset.id);
                    if (!Number.isFinite(rid)) break;
                    const st = this._tagState;
                    const cl = st.tagAnalyzerClusters.find(c => c.id === rid);
                    if (!cl) break;
                    let candidate = '';
                    if (action === 'ta-add-suggest') {
                        try { candidate = decodeURIComponent(target.dataset.tag || ''); } catch (_) { candidate = ''; }
                    } else {
                        candidate = String((st.tagAnalyzerAddInputs && st.tagAnalyzerAddInputs[cl.id]) || '').trim();
                    }
                    if (!candidate) break;
                    const result = this._tagAnalyzerAddTagToCluster(cl, candidate);
                    if (result.ok) {
                        if (st.tagAnalyzerAddInputs) st.tagAnalyzerAddInputs[cl.id] = '';
                        st.tagAnalyzerOpenClusterId = cl.id;
                        const verb = result.status === 'restored' ? 'restored' : 'added';
                        this._toast('Tag analyzer', `Cluster ${cl.id}: #${candidate} ${verb}.`, 2200);
                    } else if (result.reason === 'duplicate') {
                        this._toast('Tag analyzer', `#${candidate} is already a member of this cluster.`, 2800);
                    } else if (result.reason === 'not-manual') {
                        this._toast('Tag analyzer', 'Convert this auto cluster to manual first to add tags.', 3500);
                    } else {
                        this._toast('Tag analyzer', `#${candidate} is not in the tag index. Refresh the index or check spelling.`, 3500);
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-add-picker-toggle': {
                    const rid = Number(target.dataset.id);
                    if (!Number.isFinite(rid)) break;
                    const st = this._tagState;
                    if (st.tagAnalyzerAddPickerOpenId === rid) {
                        st.tagAnalyzerAddPickerOpenId = null;
                        st.tagAnalyzerAddPickerFilter = '';
                        st.tagAnalyzerAddPickerSelected = [];
                    } else {
                        st.tagAnalyzerAddPickerOpenId = rid;
                        st.tagAnalyzerAddPickerFilter = '';
                        st.tagAnalyzerAddPickerSelected = [];
                        st.tagAnalyzerOpenClusterId = rid;
                    }
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-add-picker-cancel': {
                    const st = this._tagState;
                    st.tagAnalyzerAddPickerOpenId = null;
                    st.tagAnalyzerAddPickerFilter = '';
                    st.tagAnalyzerAddPickerSelected = [];
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-add-picker-apply': {
                    const rid = Number(target.dataset.id);
                    if (!Number.isFinite(rid)) break;
                    const st = this._tagState;
                    const cl = st.tagAnalyzerClusters.find(c => c.id === rid);
                    if (!cl) break;
                    const selected = [...(st.tagAnalyzerAddPickerSelected || [])];
                    let added = 0;
                    let restored = 0;
                    let skippedDup = 0;
                    let skippedMissing = 0;
                    for (const name of selected) {
                        const r = this._tagAnalyzerAddTagToCluster(cl, name);
                        if (r.ok) {
                            if (r.status === 'restored') restored += 1;
                            else added += 1;
                        } else if (r.reason === 'duplicate') skippedDup += 1;
                        else if (r.reason === 'not-in-index') skippedMissing += 1;
                    }
                    st.tagAnalyzerAddPickerOpenId = null;
                    st.tagAnalyzerAddPickerFilter = '';
                    st.tagAnalyzerAddPickerSelected = [];
                    st.tagAnalyzerOpenClusterId = cl.id;
                    const parts = [];
                    if (added) parts.push(`${added} added`);
                    if (restored) parts.push(`${restored} restored`);
                    if (skippedDup) parts.push(`${skippedDup} already member`);
                    if (skippedMissing) parts.push(`${skippedMissing} not in index`);
                    this._toast('Tag analyzer', `Cluster ${cl.id}: ${parts.length ? parts.join(', ') : 'no changes'}.`, 2800);
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-cluster-order': {
                    const o = target.dataset.order;
                    if (o === 'processed' || o === 'size-desc' || o === 'combined-desc') this._tagState.tagAnalyzerClusterOrder = o;
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-manual-pick-clear':
                    this._tagState.tagAnalyzerPickSelected = [];
                    if (this._panel) this._render(this._panel);
                    break;
                case 'ta-toggle-manual':
                    this._tagState.tagAnalyzerManualOpen = !this._tagState.tagAnalyzerManualOpen;
                    if (this._panel) this._render(this._panel);
                    break;
                case 'ta-manual-add': {
                    const st = this._tagState;
                    const sel = [...(st.tagAnalyzerPickSelected || [])];
                    if (sel.length < 2) break;
                    const tidx = Array.isArray(st.tagIndex) ? st.tagIndex : [];
                    const byName = new Map(tidx.map(e => [String(e.tag ?? '').trim(), e]));
                    const members = sel
                        .map(name => {
                            const e = byName.get(name);
                            return e ? { name, count: Number(e.count) || 0 } : null;
                        })
                        .filter(Boolean);
                    if (members.length < 2) break;
                    const best = members.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a));
                    const id = ++st.tagAnalyzerNextClusterId;
                    st.tagAnalyzerClusters.push({
                        id,
                        members,
                        suggestedReplacement: best.name,
                        totalCount: members.reduce((s, m) => s + (m.count || 0), 0),
                        omitFromExport: false,
                        excludedMembers: [],
                        manual: true,
                    });
                    st.tagAnalyzerPickSelected = [];
                    st.tagAnalyzerPickFilter = '';
                    if (this._panel) this._render(this._panel);
                    break;
                }
                case 'ta-export-plan':
                    this._tagState.tagAnalyzerExportVisible = !this._tagState.tagAnalyzerExportVisible;
                    if (this._panel) this._render(this._panel);
                    break;
                case 'ta-jump-export':
                    this._tagState.tagAnalyzerExportVisible = true;
                    if (this._panel) this._render(this._panel);
                    requestAnimationFrame(() => {
                        const exportEl = el.querySelector('#nm-ta-export-json');
                        if (exportEl) exportEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                    break;
                case 'ta-jump-orphans':
                    requestAnimationFrame(() => {
                        const orphanEl = el.querySelector('#nm-ta-orphan-tags');
                        if (orphanEl) orphanEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                    break;
                case 'ta-save-plan': {
                    const json = JSON.stringify(this._tagAnalyzerExportPlanJson(), null, 2);
                    try {
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const d = new Date();
                        const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
                        a.download = `tag-consolidation-plan-${ts}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        this._toast('Tag analyzer', 'Export saved.', 2500);
                    } catch (e) {
                        this._toast('Tag analyzer', `Save failed: ${String(e?.message || e)}`, 3500);
                    }
                    break;
                }
                case 'ta-copy-plan': {
                    const json = JSON.stringify(this._tagAnalyzerExportPlanJson(), null, 2);
                    try {
                        await navigator.clipboard.writeText(json);
                        this._toast('Tag analyzer', 'Plan copied to clipboard.', 2500);
                    } catch (_) {
                        this._toast('Tag analyzer', 'Copy failed.', 3000);
                    }
                    break;
                }
                case 'ta-copy-orphans': {
                    const rows = (this._tagState.tagAnalyzerOrphans || []).map(t => {
                        const name = String(t?.name ?? '').trim();
                        const count = Number(t?.count) || 0;
                        return name ? `#${name} (${count})` : '';
                    }).filter(Boolean);
                    if (!rows.length) {
                        this._toast('Tag analyzer', 'No orphan tags to copy.', 2500);
                        break;
                    }
                    try {
                        await navigator.clipboard.writeText(rows.join('\n'));
                        this._toast('Tag analyzer', 'Orphan tags copied to clipboard.', 2500);
                    } catch (_) {
                        this._toast('Tag analyzer', 'Copy failed.', 3000);
                    }
                    break;
                }
                case 'tr-trace': await this._traceCurrentTag(); if (this._panel) this._render(this._panel); break;
                case 'tr-preview': await this._previewTagRename(); if (this._panel) this._render(this._panel); break;
                case 'tr-apply': await this._applyTagRename(); if (this._panel) this._render(this._panel); break;
            }
        }, { signal });

        const sourceSelect = el.querySelector('.nm-bm-source');
        if (sourceSelect) sourceSelect.addEventListener('change', async () => { this._bulkMoveState.sourceGuid = sourceSelect.value; if (this._bulkMoveState.targetGuid === this._bulkMoveState.sourceGuid) { const fb = this._bulkMoveState.collections.find(c => c.guid !== this._bulkMoveState.sourceGuid); if (fb) this._bulkMoveState.targetGuid = fb.guid; } await this._loadBulkMoveRecords(); if (this._panel) this._render(this._panel); }, { signal });
        const targetSelect = el.querySelector('.nm-bm-target');
        if (targetSelect) targetSelect.addEventListener('change', () => { this._bulkMoveState.targetGuid = targetSelect.value; if (this._panel) this._render(this._panel); }, { signal });
        const bmOnly = el.querySelector('.nm-bm-only-selected');
        if (bmOnly) bmOnly.addEventListener('change', () => { this._bulkMoveState.onlySelected = !!bmOnly.checked; this._settings.bulkOnlySelectedDefault = !!bmOnly.checked; this._saveSettings(); this._applyBulkMoveFilter(); if (this._panel) this._render(this._panel); }, { signal });
        const bmFilter = el.querySelector('.nm-bm-filter');
        if (bmFilter) bmFilter.addEventListener('input', () => { this._bulkMoveState.filterText = bmFilter.value; this._applyBulkMoveFilter(); this._scheduleDebouncedRender(); }, { signal });

        const apParent = el.querySelector('.nm-ap-parent-search');
        if (apParent) {
            apParent.addEventListener('input', () => {
                this._assignState.parentQuery = apParent.value;
                this._assignState.parentGuid = '';
                this._assignState.parentSearchOpen = true;
                this._assignState.parentSuggestActiveIndex = -1;
                this._rebuildAssignRows();
                if (this._panel) this._render(this._panel);
            }, { signal });
            apParent.addEventListener('keydown', e => {
                const hits = this._assignParentHits().slice(0, 20);
                if (e.key === 'Escape') {
                    if (!this._assignState.parentSearchOpen) return;
                    e.preventDefault();
                    this._assignState.parentSearchOpen = false;
                    this._assignState.parentSuggestActiveIndex = -1;
                    if (this._panel) this._render(this._panel);
                    return;
                }
                if (e.key === 'ArrowDown') {
                    if (!hits.length) return;
                    e.preventDefault();
                    this._assignState.parentSearchOpen = true;
                    this._assignState.parentSuggestActiveIndex = Math.min(hits.length - 1, this._assignState.parentSuggestActiveIndex + 1);
                    if (this._panel) this._render(this._panel);
                    return;
                }
                if (e.key === 'ArrowUp') {
                    if (!hits.length) return;
                    e.preventDefault();
                    this._assignState.parentSearchOpen = true;
                    this._assignState.parentSuggestActiveIndex = Math.max(0, this._assignState.parentSuggestActiveIndex - 1);
                    if (this._panel) this._render(this._panel);
                    return;
                }
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const idx = this._assignState.parentSuggestActiveIndex >= 0 ? this._assignState.parentSuggestActiveIndex : 0;
                const hit = hits[idx];
                if (!hit) return;
                this._assignState.parentGuid = hit.guid;
                this._assignState.parentQuery = hit.fullTitle;
                this._assignState.parentSearchOpen = false;
                this._assignState.parentSuggestActiveIndex = -1;
                this._rebuildAssignRows();
                if (this._panel) this._render(this._panel);
            }, { signal });
        }
        const apFilter = el.querySelector('.nm-ap-filter');
        if (apFilter) apFilter.addEventListener('input', () => { this._assignState.filterText = apFilter.value; this._scheduleDebouncedRender(); }, { signal });
        const apAll = el.querySelector('.nm-ap-all');
        if (apAll) apAll.addEventListener('change', () => { for (const row of this._assignState.rows) if (this._assignRowVisible(row)) row.checked = !!apAll.checked; if (this._panel) this._render(this._panel); }, { signal });
        const apHide = el.querySelector('.nm-ap-hide-childof');
        if (apHide) apHide.addEventListener('change', () => { this._assignState.hideChildOfRows = !!apHide.checked; this._settings.assignHideChildOfDefault = !!apHide.checked; this._saveSettings(); if (this._panel) this._render(this._panel); }, { signal });

        const trOld = el.querySelector('.nm-tr-old');
        if (trOld) {
            trOld.addEventListener('input', () => { this._tagState.oldTag = trOld.value; this._tagState.oldSearchOpen = true; this._tagState.suggestActiveIndex = -1; if (this._panel) this._render(this._panel); }, { signal });
            trOld.addEventListener('keydown', e => {
                if (this._mode === 'tag-rename') {
                    const isQuickPreview = (e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.shiftKey;
                    const isQuickApply = (e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.shiftKey;
                    if (isQuickPreview || isQuickApply) {
                        e.preventDefault();
                        e.stopPropagation();
                        this._tagState.oldTag = trOld.value;
                        const trNewEl = el.querySelector('.nm-tr-new');
                        if (trNewEl) this._tagState.newTag = trNewEl.value;
                        void (async () => {
                            try {
                                if (isQuickPreview) await this._previewTagRename();
                                else await this._applyTagRename();
                            } finally {
                                if (this._panel) this._render(this._panel);
                            }
                        })();
                        return;
                    }
                }
                const suggestions = this._tagSuggestions();
                if (e.key === 'Escape') {
                    if (!this._tagState.oldSearchOpen) return;
                    e.preventDefault();
                    this._tagState.oldSearchOpen = false;
                    this._tagState.suggestActiveIndex = -1;
                    if (this._panel) this._render(this._panel);
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!suggestions.length) return;
                    this._tagState.oldSearchOpen = true;
                    this._tagState.suggestActiveIndex = Math.min(suggestions.length - 1, this._tagState.suggestActiveIndex + 1);
                    if (this._panel) this._render(this._panel);
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (!suggestions.length) return;
                    this._tagState.oldSearchOpen = true;
                    this._tagState.suggestActiveIndex = Math.max(0, this._tagState.suggestActiveIndex - 1);
                    if (this._panel) this._render(this._panel);
                    return;
                }
                if (e.key === 'Enter') {
                    if (!suggestions.length) return;
                    e.preventDefault();
                    const idx = this._tagState.suggestActiveIndex >= 0 ? this._tagState.suggestActiveIndex : 0;
                    const pick = suggestions[idx];
                    if (!pick) return;
                    this._tagState.oldTag = `#${pick.tag}`;
                    this._tagState.oldSearchOpen = false;
                    this._tagState.suggestActiveIndex = -1;
                    if (this._panel) this._render(this._panel);
                }
            }, { signal });
        }
        const trNew = el.querySelector('.nm-tr-new');
        if (trNew) {
            trNew.addEventListener('input', () => { this._tagState.newTag = trNew.value; if (this._panel) this._render(this._panel); }, { signal });
            trNew.addEventListener('keydown', e => {
                if (this._mode !== 'tag-rename') return;
                const isQuickPreview = (e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.shiftKey;
                const isQuickApply = (e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.shiftKey;
                if (!isQuickPreview && !isQuickApply) return;
                e.preventDefault();
                e.stopPropagation();
                const trOldEl = el.querySelector('.nm-tr-old');
                if (trOldEl) this._tagState.oldTag = trOldEl.value;
                this._tagState.newTag = trNew.value;
                void (async () => {
                    try {
                        if (isQuickPreview) await this._previewTagRename();
                        else await this._applyTagRename();
                    } finally {
                        if (this._panel) this._render(this._panel);
                    }
                })();
            }, { signal });
        }
        const trCase = el.querySelector('.nm-tr-case');
        if (trCase) trCase.addEventListener('change', () => { this._tagState.caseSensitive = !!trCase.checked; this._settings.tagCaseSensitiveDefault = !!trCase.checked; this._saveSettings(); if (this._panel) this._render(this._panel); }, { signal });
        const trExcludeChoice = el.querySelector('.nm-tr-exclude-choice');
        if (trExcludeChoice) trExcludeChoice.addEventListener('change', async () => {
            this._tagState.excludeChoiceValues = !!trExcludeChoice.checked;
            this._settings.tagExcludeChoiceValuesDefault = !!trExcludeChoice.checked;
            this._saveSettings();
            await this._refreshTagIndex();
            if (this._panel) this._render(this._panel);
        }, { signal });
        const trExcludePickerFilter = el.querySelector('.nm-tr-exclude-picker-filter');
        if (trExcludePickerFilter) {
            trExcludePickerFilter.addEventListener('input', () => {
                this._tagState.excludedPickerFilter = trExcludePickerFilter.value;
                this._scheduleDebouncedRender();
            }, { signal });
        }
        el.querySelectorAll('.nm-tr-exclude-col-cb').forEach(cb => {
            cb.addEventListener('change', async () => {
                const guid = cb.dataset.guid;
                const col = this._tagState.excludePickerCollections.find(c => c.guid === guid);
                if (!col) return;
                const tokens = this._parseExcludedCollections(this._tagState.excludedCollectionsRaw);
                if (cb.checked) {
                    if (!this._collectionExcludedByTokens(col, tokens)) tokens.push((col.name || '').trim() || col.guid);
                } else {
                    const idx = tokens.findIndex(t => {
                        const tr = String(t || '').trim();
                        if (!tr) return false;
                        if (tr === col.guid) return true;
                        return tr.toLowerCase() === (col.name || '').trim().toLowerCase();
                    });
                    if (idx >= 0) tokens.splice(idx, 1);
                }
                this._commitExcludedCollectionsRaw(tokens.join(', '));
                await this._refreshTagIndex();
                if (this._panel) this._render(this._panel);
            }, { signal });
        });
        const rgSource = el.querySelector('.nm-rg-source');
        const rgSourceSuggest = el.querySelector('.nm-rg-source-suggest');
        if (rgSource && rgSourceSuggest) {
            const srcSuggest = this._attachTagIndexAutocomplete(rgSource, rgSourceSuggest, signal, clean => {
                this._tagState.reviewGridSourceTag = `#${clean}`;
                void (async () => {
                    await this._reviewGridBuild();
                    if (this._panel) this._render(this._panel);
                })();
            });
            rgSource.addEventListener('input', () => {
                this._tagState.reviewGridSourceTag = rgSource.value;
                if (!this.cleanTag(rgSource.value)) {
                    srcSuggest.close();
                    this._clearReviewGridQueue();
                    if (this._panel) this._render(this._panel);
                }
            }, { signal });
            rgSource.addEventListener('keydown', e => {
                if (e.key !== 'Enter' || e.defaultPrevented) return;
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                e.stopPropagation();
                srcSuggest.close();
                this._tagState.reviewGridSourceTag = rgSource.value;
                if (!this.cleanTag(rgSource.value)) {
                    this._clearReviewGridQueue();
                    if (this._panel) this._render(this._panel);
                    return;
                }
                void (async () => {
                    await this._reviewGridBuild();
                    if (this._panel) this._render(this._panel);
                })();
            }, { signal });
        }
        const rgTarget = el.querySelector('.nm-rg-target');
        if (rgTarget) {
            rgTarget.addEventListener('input', () => {
                this._tagState.reviewGridDefaultTarget = rgTarget.value;
                if (this._panel) this._render(this._panel);
            }, { signal });
            rgTarget.addEventListener('keydown', e => {
                if (e.key !== 'Enter' || e.defaultPrevented) return;
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                e.stopPropagation();
                this._tagState.reviewGridDefaultTarget = rgTarget.value;
                if (!this.cleanTag(this._tagState.reviewGridSourceTag || '')) return;
                void (async () => {
                    await this._reviewGridBuild();
                    if (this._panel) this._render(this._panel);
                })();
            }, { signal });
        }
        const rgFilter = el.querySelector('.nm-rg-filter');
        if (rgFilter) rgFilter.addEventListener('input', () => { this._tagState.reviewGridFilter = rgFilter.value; this._scheduleDebouncedRender(); }, { signal });
        const rgSort = el.querySelector('.nm-rg-sort');
        if (rgSort) rgSort.addEventListener('change', () => { this._tagState.reviewGridSort = rgSort.value; if (this._panel) this._render(this._panel); }, { signal });
        const rtTag = el.querySelector('.nm-rt-tag');
        const rtTagSuggest = el.querySelector('.nm-rt-tag-suggest');
        if (rtTag && rtTagSuggest) {
            const rtSuggest = this._attachTagIndexAutocomplete(rtTag, rtTagSuggest, signal, clean => {
                this._tagState.removeTagTag = clean;
                void (async () => {
                    await this._removeTagBuild();
                    if (this._panel) this._render(this._panel);
                })();
            }, () => this._tagSuggestionsForRemoveTagList());
            rtTag.addEventListener('input', () => {
                this._tagState.removeTagTag = rtTag.value;
                if (!this.cleanTag(rtTag.value)) {
                    rtSuggest.close();
                    this._clearRemoveTagQueue();
                    if (this._panel) this._render(this._panel);
                }
            }, { signal });
            rtTag.addEventListener('keydown', e => {
                if (e.key !== 'Enter' || e.defaultPrevented) return;
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                e.stopPropagation();
                rtSuggest.close();
                this._tagState.removeTagTag = rtTag.value;
                if (!this.cleanTag(rtTag.value)) {
                    this._clearRemoveTagQueue();
                    if (this._panel) this._render(this._panel);
                    return;
                }
                void (async () => {
                    await this._removeTagBuild();
                    if (this._panel) this._render(this._panel);
                })();
            }, { signal });
        }
        const rtFilter = el.querySelector('.nm-rt-filter');
        if (rtFilter) rtFilter.addEventListener('input', () => { this._tagState.removeTagFilter = rtFilter.value; this._scheduleDebouncedRender(); }, { signal });
        const rtSort = el.querySelector('.nm-rt-sort');
        if (rtSort) rtSort.addEventListener('change', () => { this._tagState.removeTagSort = rtSort.value; if (this._panel) this._render(this._panel); }, { signal });
        const atTag = el.querySelector('.nm-at-tag');
        if (atTag) {
            atTag.addEventListener('input', () => {
                this._tagState.addTagTag = atTag.value;
                if (this._panel) this._render(this._panel);
            }, { signal });
            atTag.addEventListener('keydown', e => {
                if (e.key !== 'Enter' || e.defaultPrevented) return;
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                e.stopPropagation();
                this._tagState.addTagTag = atTag.value;
                void (async () => {
                    await this._addTagBuild();
                    if (this._panel) this._render(this._panel);
                })();
            }, { signal });
        }
        const atRecFilter = el.querySelector('.nm-at-record-filter');
        if (atRecFilter) atRecFilter.addEventListener('input', () => { this._tagState.addTagRecordFilter = atRecFilter.value; this._scheduleDebouncedRender(); }, { signal });
        const atTableFilter = el.querySelector('.nm-at-table-filter');
        if (atTableFilter) atTableFilter.addEventListener('input', () => { this._tagState.addTagTableFilter = atTableFilter.value; this._scheduleDebouncedRender(); }, { signal });
        const atSort = el.querySelector('.nm-at-sort');
        if (atSort) atSort.addEventListener('change', () => { this._tagState.addTagSort = atSort.value; if (this._panel) this._render(this._panel); }, { signal });
        const taTh = el.querySelector('.nm-ta-threshold-range');
        if (taTh) taTh.addEventListener('input', () => { this._tagState.tagAnalyzerThreshold = Number(taTh.value) || 1; this._scheduleDebouncedRender(); }, { signal });
        const taSim = el.querySelector('.nm-ta-sim-range');
        if (taSim) taSim.addEventListener('input', () => { this._tagState.tagAnalyzerSimPercent = Number(taSim.value) || 35; this._scheduleDebouncedRender(); }, { signal });
        const taManFilter = el.querySelector('.nm-ta-manual-filter');
        if (taManFilter) taManFilter.addEventListener('input', () => { this._tagState.tagAnalyzerPickFilter = taManFilter.value; this._scheduleDebouncedRender(); }, { signal });
        const tmFile = el.querySelector('.nm-tm-file');
        if (tmFile) {
            tmFile.addEventListener('change', async () => {
                const f = tmFile.files && tmFile.files[0];
                tmFile.value = '';
                if (!f) return;
                await this._ensureTagLoaded(true);
                try {
                    const text = await f.text();
                    const parsed = JSON.parse(text);
                    const { rows, parseNotes } = this._tagMergeNormalizePlan(parsed);
                    this._tagMergeState.rows = rows;
                    this._tagMergeState.parseNotes = parseNotes;
                    this._tagMergeState.fileName = f.name || 'plan.json';
                    this._tagMergeState.output = '';
                    this._toast('Tag merge', rows.length ? `Loaded ${rows.length} row(s).` : 'No rows after validation.', rows.length ? 2500 : 4000);
                } catch (err) {
                    this._toast('Tag merge', `Invalid JSON: ${String(err?.message || err)}`, 4500);
                    this._resetTagMergeState();
                }
                if (this._panel) this._render(this._panel);
            }, { signal });
        }
        el.addEventListener('change', e => {
            const omit = e.target.closest('.nm-ta-omit-cb');
            if (omit) {
                const oid = Number(omit.dataset.clusterId);
                const cl = this._tagState.tagAnalyzerClusters.find(c => c.id === oid);
                if (cl) cl.omitFromExport = !!omit.checked;
                if (this._panel) this._render(this._panel);
                return;
            }
            const tmSkip = e.target.closest('.nm-tm-skip-cb');
            if (tmSkip) {
                const rid = tmSkip.dataset.rowId || '';
                const row = this._tagMergeState.rows.find(r => r.id === rid);
                if (row) row.skip = !!tmSkip.checked;
                if (this._panel) this._render(this._panel);
                return;
            }
            const addPick = e.target.closest('.nm-ta-add-picker-cb');
            if (addPick) {
                let tname = '';
                try { tname = decodeURIComponent(addPick.dataset.tag || ''); } catch (_) { tname = ''; }
                if (!tname) return;
                const set = new Set(this._tagState.tagAnalyzerAddPickerSelected || []);
                if (addPick.checked) set.add(tname);
                else set.delete(tname);
                this._tagState.tagAnalyzerAddPickerSelected = [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                if (this._panel) this._render(this._panel);
                return;
            }
            const man = e.target.closest('.nm-ta-manual-cb');
            if (!man) return;
            let tname = '';
            try {
                tname = decodeURIComponent(man.dataset.tag || '');
            } catch (_) {
                tname = '';
            }
            if (!tname) return;
            const set = new Set(this._tagState.tagAnalyzerPickSelected || []);
            if (man.checked) set.add(tname);
            else set.delete(tname);
            this._tagState.tagAnalyzerPickSelected = [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            if (this._panel) this._render(this._panel);
        }, { signal });
        el.addEventListener('input', e => {
            const cin = e.target.closest('.nm-ta-target-input');
            if (cin) {
                const cid = Number(cin.dataset.clusterId);
                if (!Number.isFinite(cid)) return;
                this._tagState.tagAnalyzerReplacements[cid] = cin.value;
                return;
            }
            const addIn = e.target.closest('.nm-ta-add-input');
            if (addIn) {
                const cid = Number(addIn.dataset.clusterId);
                if (!Number.isFinite(cid)) return;
                if (!this._tagState.tagAnalyzerAddInputs) this._tagState.tagAnalyzerAddInputs = {};
                this._tagState.tagAnalyzerAddInputs[cid] = addIn.value;
                this._scheduleDebouncedRender();
                return;
            }
            const addPickFilter = e.target.closest('.nm-ta-add-picker-filter');
            if (addPickFilter) {
                this._tagState.tagAnalyzerAddPickerFilter = addPickFilter.value;
                this._scheduleDebouncedRender();
                return;
            }
        }, { signal });
        el.addEventListener('keydown', e => {
            const addIn = e.target.closest('.nm-ta-add-input');
            if (!addIn) return;
            const cid = Number(addIn.dataset.clusterId);
            if (!Number.isFinite(cid)) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                const st = this._tagState;
                if (!st.tagAnalyzerAddInputs) st.tagAnalyzerAddInputs = {};
                st.tagAnalyzerAddInputs[cid] = addIn.value;
                const cl = st.tagAnalyzerClusters.find(c => c.id === cid);
                if (!cl) return;
                const typed = String(addIn.value || '').trim();
                if (!typed) return;
                let candidate = typed;
                if (!this._tagAnalyzerLookupIndexedTag(typed)) {
                    const sug = this._tagAnalyzerAddSuggestForCluster(cl, typed, 1);
                    if (sug.length) candidate = sug[0].name;
                }
                const result = this._tagAnalyzerAddTagToCluster(cl, candidate);
                if (result.ok) {
                    st.tagAnalyzerAddInputs[cl.id] = '';
                    st.tagAnalyzerOpenClusterId = cl.id;
                    const verb = result.status === 'restored' ? 'restored' : 'added';
                    this._toast('Tag analyzer', `Cluster ${cl.id}: #${candidate} ${verb}.`, 2200);
                } else if (result.reason === 'duplicate') {
                    this._toast('Tag analyzer', `#${candidate} is already a member of this cluster.`, 2800);
                } else if (result.reason === 'not-manual') {
                    this._toast('Tag analyzer', 'Convert this auto cluster to manual first to add tags.', 3500);
                } else {
                    this._toast('Tag analyzer', `#${candidate} is not in the tag index. Refresh the index or check spelling.`, 3500);
                }
                if (this._panel) this._render(this._panel);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (!this._tagState.tagAnalyzerAddInputs) this._tagState.tagAnalyzerAddInputs = {};
                this._tagState.tagAnalyzerAddInputs[cid] = '';
                if (this._panel) this._render(this._panel);
            }
        }, { signal });
        el.querySelectorAll('.nm-rg-override-wrap').forEach(wrap => {
            const input = wrap.querySelector('.nm-rg-row-target');
            const box = wrap.querySelector('.nm-rg-override-suggest');
            if (!input || !box) return;
            input.addEventListener('input', () => {
                const row = this._tagState.reviewGridRows.find(r => r.id === input.dataset.id);
                if (!row) return;
                row.overrideTarget = input.value;
                const cleaned = this.cleanTag(input.value || '');
                const tr = input.closest('tr');
                const defaultCb = tr?.querySelector('input[data-action="tr-rg-default"]');
                const skipCb = tr?.querySelector('input[data-action="tr-rg-skip"]');
                if (cleaned) {
                    row.action = 'override';
                    if (defaultCb) defaultCb.checked = false;
                    if (skipCb) skipCb.checked = false;
                } else if (row.action === 'override') {
                    row.action = 'default';
                    if (defaultCb) defaultCb.checked = true;
                    if (skipCb) skipCb.checked = false;
                }
            }, { signal });
            this._attachTagIndexAutocomplete(input, box, signal, clean => {
                const row = this._tagState.reviewGridRows.find(r => r.id === input.dataset.id);
                if (!row) return;
                row.overrideTarget = clean;
                row.action = 'override';
                if (this._panel) this._render(this._panel);
            });
        });

        if (this._tagState.excludedPickerOpen) {
            const onDocClick = (ev) => {
                if (!el.contains(ev.target)) return;
                if (ev.target.closest('.nm-exclude-picker-host')) return;
                this._tagState.excludedPickerOpen = false;
                this._tagState.excludedPickerFilter = '';
                document.removeEventListener('click', onDocClick, true);
                if (this._panel) this._render(this._panel);
            };
            setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
            signal.addEventListener('abort', () => document.removeEventListener('click', onDocClick, true));
        }

        el.addEventListener('keydown', e => {
            const t = e.target;
            if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
            if (!el.contains(t)) return;
            if (e.key === ' ' || e.code === 'Space') e.stopPropagation();
        }, { signal });
    }

    async _previewBulkMove() {
        const st = this._bulkMoveState;
        const source = this._bulkCollectionByGuid(st.sourceGuid);
        const target = this._bulkCollectionByGuid(st.targetGuid);
        if (!source || !target || source.guid === target.guid) { this._setStatus('Select valid source and target collections first.'); return; }
        const selected = st.records.filter(r => st.selectedGuids.has(r.guid));
        if (!selected.length) { this._setStatus('Select at least one record to preview move.'); return; }
        st.previewRows = selected.map(r => ({ operation: 'bulk-move', recordGuid: r.guid, recordName: r.name, action: 'move', before: source.name, after: target.name }));
        const previewSummary = `Preview ready: ${st.previewRows.length} move(s).`;
        this._logRow('bulk-move', 'preview', { recordGuid: '', recordName: '' }, previewSummary);
        this._setStatus(previewSummary, { title: 'Bulk move', logged: true });
    }

    async _runBulkMove() {
        const st = this._bulkMoveState;
        if (!st.previewRows.length) await this._previewBulkMove();
        if (!st.previewRows.length) return;
        const target = this._bulkCollectionByGuid(st.targetGuid);
        st.running = true;
        let ok = 0;
        let fail = 0;
        for (const row of st.previewRows) {
            const rec = st.records.find(r => r.guid === row.recordGuid);
            if (!rec) continue;
            try {
                const moved = await rec.raw.moveToCollection(target.raw);
                if (moved) { ok++; this._logRow('bulk-move', 'applied', row, `Moved ${row.before} -> ${row.after}`); }
                else { fail++; this._logRow('bulk-move', 'failed', row, 'moveToCollection returned false'); }
            } catch (e) { fail++; this._logRow('bulk-move', 'failed', row, String(e?.message || e)); }
        }
        await this._loadBulkMoveRecords();
        this._setStatus(`Bulk move apply complete: ${ok} ok, ${fail} failed.`, { title: 'Bulk move', autoDestroyTime: fail ? 7000 : 3500 });
        st.previewRows = [];
        st.running = false;
    }

    _previewAssign() {
        const st = this._assignState;
        if (!st.parentGuid) { this._setStatus('Select a parent note first.'); return; }
        const parent = st.recordMap.get(st.parentGuid);
        const rows = st.rows.filter(r => r.checked);
        if (!rows.length) { this._setStatus('Select at least one child row to preview.'); return; }
        st.previewRows = rows.map(r => ({ operation: 'assign-subpages', recordGuid: r.guid, recordName: r.title, action: r.currentParentGuid === st.parentGuid ? 'unassign' : 'assign', before: r.parentInfo || '(none)', after: r.currentParentGuid === st.parentGuid ? '(none)' : `child of: ${parent.fullTitle}` }));
        const previewSummary = `Preview ready: ${st.previewRows.length} row(s).`;
        this._logRow('assign-subpages', 'preview', { recordGuid: '', recordName: '' }, previewSummary);
        this._setStatus(previewSummary, { title: 'Assign subpages', logged: true });
    }

    async _runAssignParent() {
        const st = this._assignState;
        if (!st.previewRows.length) this._previewAssign();
        if (!st.previewRows.length) return;
        st.running = true;
        let ok = 0;
        let fail = 0;
        for (const row of st.previewRows) {
            const raw = st.rows.find(r => r.guid === row.recordGuid)?.record;
            if (!raw) continue;
            try {
                const success = await Promise.resolve(row.action === 'unassign' ? raw.setSubPageOf(null) : raw.setSubPageOf(st.parentGuid));
                if (success) { ok++; this._logRow('assign-subpages', 'applied', row, row.action === 'unassign' ? 'Parent cleared' : `Assigned to ${st.parentQuery}`); }
                else { fail++; this._logRow('assign-subpages', 'failed', row, 'setSubPageOf rejected'); }
            } catch (e) { fail++; this._logRow('assign-subpages', 'failed', row, String(e?.message || e)); }
        }
        await this._reloadAssignIndex(true);
        st.previewRows = [];
        st.running = false;
        this._setStatus(`Assign subpages apply complete: ${ok} ok, ${fail} failed.`, { title: 'Assign subpages', autoDestroyTime: fail ? 7000 : 3500 });
    }

    async _ensureTagLoaded(forceRefresh = false) {
        if (!this._tagState.initialized) {
            this._tagState.caseSensitive = !!this._settings.tagCaseSensitiveDefault;
            this._tagState.excludeChoiceValues = !!this._settings.tagExcludeChoiceValuesDefault;
            this._tagState.excludedCollectionsRaw = String(this._settings.tagExcludedCollectionsDefault || '');
            this._tagState.initialized = true;
        }
        if (forceRefresh || !Array.isArray(this._tagState.tagIndex) || this._tagState.tagIndex.length === 0) {
            await this._refreshTagIndex();
        }
    }

    async _previewTagRename() {
        const st = this._tagState;
        const oldTag = this.cleanTag(st.oldTag);
        const newTag = this.cleanTag(st.newTag);
        if (!oldTag || !newTag) { this._setStatus('Both Current tag and New tag are required.'); return; }
        if (this.matchKey(oldTag, st.caseSensitive) === this.matchKey(newTag, st.caseSensitive)) { this._setStatus('Current and New tags resolve to the same value.'); return; }
        const rows = [];
        const opts = this._tagScanOpts();
        let recordsScanned = 0;
        let recordsChanged = 0;
        let recordsUnchanged = 0;
        let lineItemsChanged = 0;
        let segmentsChanged = 0;
        let propertiesChanged = 0;
        let propertyValuesChanged = 0;
        let unchangedCaseMismatch = 0;
        let unchangedNoExactMatch = 0;
        const unchangedRecords = [];
        const changedRecordDiagnostics = [];
        const errors = [];
        await this.forEachScannableRecord(opts, async (record) => {
            recordsScanned += 1;
            try {
                const changed = await this._renameTagInRecord({
                    record,
                    oldTag,
                    newTag,
                    caseSensitive: st.caseSensitive,
                    dryRun: true,
                    collectRows: rows,
                });
                if (changed.recordChanged) {
                    recordsChanged += 1;
                    changedRecordDiagnostics.push({
                        guid: record?.guid || '',
                        name: record.getName?.() || '(untitled)',
                        lineItemsChanged: changed.lineItemsChanged,
                        occurrencesChanged: changed.segmentsChanged,
                        propertyValuesChanged: changed.propertyValuesChanged,
                    });
                } else {
                    recordsUnchanged += 1;
                    if (changed.unchangedReason === 'case-mismatch') unchangedCaseMismatch += 1;
                    else unchangedNoExactMatch += 1;
                    unchangedRecords.push({
                        guid: record?.guid || '',
                        name: record.getName?.() || '(untitled)',
                        reason: changed.unchangedReason,
                    });
                }
                lineItemsChanged += changed.lineItemsChanged;
                segmentsChanged += changed.segmentsChanged;
                propertiesChanged += changed.propertiesChanged;
                propertyValuesChanged += changed.propertyValuesChanged;
            } catch (e) {
                errors.push({
                    recordGuid: record?.guid || '',
                    recordName: record.getName?.() || '(untitled)',
                    error: String(e?.message || e),
                });
            }
        });
        st.previewRows = rows;
        const lines = [
            'Dry run',
            'Run type: Preview (no writes)',
            `Run timestamp: ${new Date().toLocaleString()}`,
            `Records scanned: ${recordsScanned}`,
            `Records changed (unique): ${recordsChanged}`,
            `Records unchanged: ${recordsUnchanged}`,
            `Line items changed: ${lineItemsChanged}`,
            `Occurrences changed: ${segmentsChanged}`,
            `Properties changed: ${propertiesChanged}`,
            `Property values changed: ${propertyValuesChanged}`,
            `Unchanged (case mismatch): ${unchangedCaseMismatch}`,
            `Unchanged (no exact tag): ${unchangedNoExactMatch}`,
            'Writes applied: no',
            `Errors: ${errors.length}`,
        ];
        if (errors.length) {
            lines.push('', 'Error details:');
            for (const e of errors.slice(0, 15)) lines.push(`- ${e.recordName || '(untitled)'} [${e.recordGuid || 'unknown-guid'}] -> ${e.error || 'Unknown error'}`);
            if (errors.length > 15) lines.push(`... and ${errors.length - 15} more errors`);
        }
        const changedRecords = [...changedRecordDiagnostics].sort((a, b) =>
            (b.occurrencesChanged + b.propertyValuesChanged) - (a.occurrencesChanged + a.propertyValuesChanged) ||
            a.name.localeCompare(b.name)
        );
        if (changedRecords.length) {
            lines.push('', 'Changed records (dry run diagnostics):');
            for (const r of changedRecords.slice(0, 30)) {
                lines.push(`- ${r.name} [${r.guid}] -> occurrences changed: ${r.occurrencesChanged}, property values changed: ${r.propertyValuesChanged}, line items changed: ${r.lineItemsChanged}`);
            }
            if (changedRecords.length > 30) lines.push(`... and ${changedRecords.length - 30} more changed records`);
        }
        if (unchangedRecords.length) {
            lines.push('', 'Unchanged records (dry run diagnostics):');
            for (const r of unchangedRecords.slice(0, 30)) lines.push(`- ${r.name || '(untitled)'} [${r.guid}] -> ${r.reason}`);
            if (unchangedRecords.length > 30) lines.push(`... and ${unchangedRecords.length - 30} more unchanged records`);
        }
        const dryRunOutput = lines.join('\n');
        this._logRow('tag-rename', 'preview', { recordGuid: '', recordName: '' }, dryRunOutput);
        this._setStatus(dryRunOutput, { title: 'Tag rename', logged: true });
    }

    async _applyTagRename() {
        const st = this._tagState;
        const oldTag = this.cleanTag(st.oldTag);
        const newTag = this.cleanTag(st.newTag);
        if (!oldTag || !newTag) { this._setStatus('Both Current tag and New tag are required.'); return; }
        if (this.matchKey(oldTag, st.caseSensitive) === this.matchKey(newTag, st.caseSensitive)) { this._setStatus('Current and New tags resolve to the same value.'); return; }
        st.running = true;
        let recordsScanned = 0;
        let recordsChanged = 0;
        let recordsUnchanged = 0;
        let lineItemsChanged = 0;
        let segmentsChanged = 0;
        let propertiesChanged = 0;
        let propertyValuesChanged = 0;
        let unchangedCaseMismatch = 0;
        let unchangedNoExactMatch = 0;
        const errors = [];
        const opts = this._tagScanOpts();
        await this.forEachScannableRecord(opts, async (record) => {
            recordsScanned += 1;
            try {
                const changed = await this._renameTagInRecord({
                    record,
                    oldTag,
                    newTag,
                    caseSensitive: st.caseSensitive,
                    dryRun: false,
                    collectRows: null,
                });
                if (changed.recordChanged) {
                    recordsChanged += 1;
                    this._logRow('tag-rename', 'applied', {
                        recordGuid: record?.guid || '',
                        recordName: record.getName?.() || '(unknown)',
                    }, `${oldTag} -> ${newTag}`);
                } else {
                    recordsUnchanged += 1;
                    if (changed.unchangedReason === 'case-mismatch') unchangedCaseMismatch += 1;
                    else unchangedNoExactMatch += 1;
                }
                lineItemsChanged += changed.lineItemsChanged;
                segmentsChanged += changed.segmentsChanged;
                propertiesChanged += changed.propertiesChanged;
                propertyValuesChanged += changed.propertyValuesChanged;
            } catch (e) {
                const errText = String(e?.message || e);
                errors.push({
                    recordGuid: record?.guid || '',
                    recordName: record.getName?.() || '(unknown)',
                    error: errText,
                });
                this._logRow('tag-rename', 'failed', {
                    recordGuid: record?.guid || '',
                    recordName: record.getName?.() || '(unknown)',
                }, errText);
            }
        });
        st.running = false;
        st.previewRows = [];
        const mode = 'Rename complete';
        const runType = 'Apply (writes committed)';
        const runAt = new Date().toLocaleString();
        const summary = [
            `${mode}`,
            `Run type: ${runType}`,
            `Run timestamp: ${runAt}`,
            `Records scanned: ${recordsScanned}`,
            `Records changed (unique): ${recordsChanged}`,
            `Records unchanged: ${recordsUnchanged}`,
            `Line items changed: ${lineItemsChanged}`,
            `Occurrences changed: ${segmentsChanged}`,
            `Properties changed: ${propertiesChanged}`,
            `Property values changed: ${propertyValuesChanged}`,
            `Unchanged (case mismatch): ${unchangedCaseMismatch}`,
            `Unchanged (no exact tag): ${unchangedNoExactMatch}`,
            'Writes applied: yes',
            errors.length ? `Errors: ${errors.length}` : 'Errors: 0',
        ].join('\n');
        const errorDetails = errors.length
            ? [
                '',
                'Error details:',
                ...errors.slice(0, 15).map(e2 => `- ${e2.recordName || '(untitled)'} [${e2.recordGuid || 'unknown-guid'}] -> ${e2.error || 'Unknown error'}`),
                errors.length > 15 ? `... and ${errors.length - 15} more errors` : '',
            ].filter(Boolean).join('\n')
            : '';
        const fullOutput = `${summary}${errorDetails}`;
        this._logRow('tag-rename', 'summary', { recordGuid: '', recordName: '' }, fullOutput);
        this._setStatus(fullOutput, { title: 'Tag rename', logged: true });
    }

    async _renameTagInRecord({ record, oldTag, newTag, caseSensitive, dryRun, collectRows }) {
        const lineItems = await record.getLineItems(true);
        let recordChanged = false;
        let lineItemsChanged = 0;
        let segmentsChanged = 0;
        let propertiesChanged = 0;
        let propertyValuesChanged = 0;
        let caseMismatchMentions = 0;
        for (const item of lineItems) {
            const segments = item?.segments;
            if (!Array.isArray(segments) || segments.length === 0) continue;
            let itemChanged = false;
            const nextSegments = [];
            for (const seg of segments) {
                const segText = this.segmentTextAsString(seg);
                if (seg?.type === THYMER_TYPE_HASHTAG && this._isTagMatch(segText, oldTag, caseSensitive)) {
                    itemChanged = true;
                    segmentsChanged += 1;
                    nextSegments.push({ ...seg, text: `#${newTag}` });
                } else if (seg?.type === 'text' && segText) {
                    const replaced = this._replaceHashtagTokensInTextDetailed(segText, oldTag, newTag, caseSensitive);
                    if (replaced.changed) {
                        itemChanged = true;
                        segmentsChanged += replaced.replacements;
                        nextSegments.push({ ...seg, text: replaced.text });
                    } else {
                        nextSegments.push(seg);
                    }
                } else if (seg?.type === THYMER_TYPE_HASHTAG && caseSensitive && this._isTagMatch(segText, oldTag, false)) {
                    caseMismatchMentions += 1;
                    nextSegments.push(seg);
                } else {
                    nextSegments.push(seg);
                }
            }
            if (!itemChanged) continue;
            recordChanged = true;
            lineItemsChanged += 1;
            if (!dryRun) {
                if (typeof item.setSegments === 'function') await item.setSegments(nextSegments);
                else item.segments = nextSegments;
            } else if (Array.isArray(collectRows)) {
                collectRows.push({
                    operation: 'tag-rename',
                    recordGuid: record?.guid || '',
                    recordName: record.getName?.() || '(unknown)',
                    action: 'rename',
                    sourceTag: oldTag,
                    targetTag: newTag,
                    before: this._segmentsToText(segments),
                    after: this._segmentsToText(nextSegments),
                    lineItem: item,
                    newSegments: nextSegments,
                });
            }
        }
        const propResult = this._renameTagInProperties({ record, oldTag, newTag, caseSensitive, dryRun });
        if (propResult.propertiesChanged > 0) recordChanged = true;
        propertiesChanged += propResult.propertiesChanged;
        propertyValuesChanged += propResult.propertyValuesChanged;
        caseMismatchMentions += propResult.caseMismatchMentions;
        const unchangedReason = !recordChanged && caseMismatchMentions > 0 ? 'case-mismatch' : 'no-exact-match';
        return { recordChanged, unchangedReason, lineItemsChanged, segmentsChanged, propertiesChanged, propertyValuesChanged };
    }

    _renameTagInProperties({ record, oldTag, newTag, caseSensitive, dryRun }) {
        const properties = record.getAllProperties?.();
        if (!Array.isArray(properties) || properties.length === 0) return { propertiesChanged: 0, propertyValuesChanged: 0, caseMismatchMentions: 0 };
        let propertiesChanged = 0;
        let propertyValuesChanged = 0;
        let caseMismatchMentions = 0;
        for (const prop of properties) {
            const choiceResult = this._renameInChoiceProperty({ prop, oldTag, newTag, caseSensitive, dryRun });
            if (choiceResult.changed) {
                propertiesChanged += 1;
                propertyValuesChanged += choiceResult.valuesChanged;
                caseMismatchMentions += choiceResult.caseMismatchMentions;
                continue;
            }
            const textResult = this._renameInTextLikeProperty({ prop, oldTag, newTag, caseSensitive, dryRun });
            if (textResult.changed) {
                propertiesChanged += 1;
                propertyValuesChanged += textResult.valuesChanged;
            }
            caseMismatchMentions += textResult.caseMismatchMentions;
        }
        return { propertiesChanged, propertyValuesChanged, caseMismatchMentions };
    }

    _renameInChoiceProperty({ prop, oldTag, newTag, caseSensitive, dryRun }) {
        const choices = prop.choices?.();
        if (!Array.isArray(choices)) return { changed: false, valuesChanged: 0, caseMismatchMentions: 0 };
        const selectedLabels = prop.selectedChoiceLabels?.();
        if (!Array.isArray(selectedLabels) || selectedLabels.length === 0) return { changed: false, valuesChanged: 0, caseMismatchMentions: 0 };
        const selectedIds = prop.selectedChoices?.();
        const ids = Array.isArray(selectedIds) ? selectedIds : [];
        const replacementLabel = this._findBestChoiceLabel(choices, newTag, caseSensitive);
        const nextLabels = [];
        let valuesChanged = 0;
        let caseMismatchMentions = 0;
        for (let i = 0; i < selectedLabels.length; i += 1) {
            const label = selectedLabels[i];
            const idRaw = ids[i];
            const idStr = idRaw != null ? String(idRaw) : '';
            const labelMatch = this._isTagMatch(label, oldTag, caseSensitive);
            const idMatch = idStr && this._isTagMatch(idStr, oldTag, caseSensitive);
            if (labelMatch || idMatch) {
                valuesChanged += 1;
                nextLabels.push(replacementLabel);
            } else if (caseSensitive && (this._isTagMatch(label, oldTag, false) || (idStr && this._isTagMatch(idStr, oldTag, false)))) {
                caseMismatchMentions += 1;
                nextLabels.push(label);
            } else {
                nextLabels.push(label);
            }
        }
        if (valuesChanged === 0) return { changed: false, valuesChanged: 0, caseMismatchMentions };
        const dedupedLabels = this._dedupeByMatchKey(nextLabels, caseSensitive);
        const duplicateRemovals = Math.max(0, nextLabels.length - dedupedLabels.length);
        valuesChanged += duplicateRemovals;
        if (!dryRun) {
            const ok = prop.setChoice?.(dedupedLabels);
            if (!ok) return { changed: false, valuesChanged: 0, caseMismatchMentions };
        }
        return { changed: true, valuesChanged, caseMismatchMentions };
    }

    _renameInTextLikeProperty({ prop, oldTag, newTag, caseSensitive, dryRun }) {
        if (!this.shouldScanTextPropertyForTags(prop)) return { changed: false, valuesChanged: 0, caseMismatchMentions: 0 };
        const values = prop.texts?.();
        if (!Array.isArray(values) || values.length === 0) return { changed: false, valuesChanged: 0, caseMismatchMentions: 0 };
        let valuesChanged = 0;
        let caseMismatchMentions = 0;
        const nextValues = values.map(value => {
            if (!this._isTagMatch(value, oldTag, caseSensitive)) return value;
            valuesChanged += 1;
            return this._rewriteTagValue(value, newTag);
        });
        if (caseSensitive) {
            for (const value of values) {
                if (!this._isTagMatch(value, oldTag, true) && this._isTagMatch(value, oldTag, false)) caseMismatchMentions += 1;
            }
        }
        if (valuesChanged === 0) return { changed: false, valuesChanged: 0, caseMismatchMentions };
        const dedupedValues = this._dedupeByMatchKey(nextValues, caseSensitive);
        const duplicateRemovals = Math.max(0, nextValues.length - dedupedValues.length);
        valuesChanged += duplicateRemovals;
        if (!dryRun) prop.set?.(dedupedValues);
        return { changed: true, valuesChanged, caseMismatchMentions };
    }

    _dedupeByMatchKey(values, caseSensitive) {
        const out = [];
        const seen = new Set();
        for (const v of (values || [])) {
            const key = this.matchKey(v, caseSensitive);
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(v);
        }
        return out;
    }

    _findBestChoiceLabel(choices, newTag, caseSensitive) {
        const target = this.matchKey(newTag, caseSensitive);
        for (const c of choices || []) {
            if (this.matchKey(c?.label, caseSensitive) === target) return c.label;
            if (this.matchKey(c?.id, caseSensitive) === target) return c.label ?? c.id;
        }
        return newTag;
    }

    _isTagMatch(value, oldTag, caseSensitive) {
        return this.matchKey(value, caseSensitive) === this.matchKey(oldTag, caseSensitive);
    }

    _rewriteTagValue(originalValue, newTag) {
        if (typeof originalValue !== 'string') return `#${newTag}`;
        return originalValue.trim().startsWith('#') ? `#${newTag}` : newTag;
    }

    /**
     * Dictionary order for tag names: English locale, numeric chunks (tag-2 before tag-10),
     * case-insensitive, then exact spelling if two tags only differ by case.
     * Avoids `sensitivity: 'base'` with the default locale, which can rank strings oddly (e.g. author before ai).
     */
    _compareTagNamesForSort(tagA, tagB) {
        const ta = String(tagA ?? '');
        const tb = String(tagB ?? '');
        const la = ta.toLowerCase();
        const lb = tb.toLowerCase();
        const c = la.localeCompare(lb, 'en', { numeric: true });
        if (c !== 0) return c;
        return ta.localeCompare(tb, 'en', { numeric: true });
    }

    /** Applied on every tag reindex (Refresh index). */
    _sortTagIndexEntries(entries) {
        if (!Array.isArray(entries)) return [];
        return [...entries].sort((a, b) => this._compareTagNamesForSort(a.tag, b.tag));
    }

    async _refreshTagIndex(refreshOptions = {}) {
        const quiet = !!refreshOptions.quiet;
        const st = this._tagState;
        if (st.refreshInFlight) {
            st.refreshRerunWanted = true;
            return st.refreshPromise;
        }
        st.refreshInFlight = true;
        const run = async () => {
            try {
                const scanOpts = this._tagScanOpts();
                const scope = await this.getScannableCollections(scanOpts);
                const tagToRecordGuids = new Map();
                // Tags reachable when choice/enum sources are excluded — used to derive `tagChoiceOnlyTags`
                // without a second full scan (each scan does getLineItems(true) per record, which is expensive).
                const needBoth = !scanOpts.excludeChoiceValues;
                const tagsWithoutChoiceSources = needBoth ? new Set() : null;
                const stats = await this.forEachScannableRecord(scanOpts, async (record) => {
                    if (needBoth) {
                        const { withChoice, withoutChoice } = await this.collectTagsFromRecordWithChoiceVariants(record);
                        for (const tag of withChoice) {
                            if (!tagToRecordGuids.has(tag)) tagToRecordGuids.set(tag, new Set());
                            tagToRecordGuids.get(tag).add(record.guid);
                        }
                        for (const t of withoutChoice) tagsWithoutChoiceSources.add(t);
                        return;
                    }
                    const tagsInRecord = await this.collectTagsFromRecord(record, scanOpts);
                    for (const tag of tagsInRecord) {
                        if (!tagToRecordGuids.has(tag)) tagToRecordGuids.set(tag, new Set());
                        tagToRecordGuids.get(tag).add(record.guid);
                    }
                }, scope.collections);
                const built = [...tagToRecordGuids.entries()]
                    .map(([tag, guidSet]) => ({ tag: String(tag ?? '').trim(), count: guidSet.size }))
                    .filter(e => e.tag);
                st.tagIndex = this._sortTagIndexEntries(built);
                const choiceOnly = new Set();
                if (tagsWithoutChoiceSources) {
                    for (const tag of tagToRecordGuids.keys()) {
                        if (!tagsWithoutChoiceSources.has(tag)) choiceOnly.add(tag);
                    }
                }
                st.tagChoiceOnlyTags = choiceOnly;
                const choiceNote = scanOpts.excludeChoiceValues ? ' (choice/enum excluded)' : '';
                const excludedNote = scope.excludedCount ? ` Excluded collections: ${scope.excludedCount}.` : '';
                st.indexMeta = `Loaded ${st.tagIndex.length} tags from ${stats.recordCount} records in ${scope.collections.length} user collections.${choiceNote}${excludedNote}${scope.warning ? ` ${scope.warning}` : ''} Tags A–Z (case-insensitive).`;
                if (!quiet) {
                    this._logRow('tag-index', 'applied', { recordGuid: '', recordName: '' }, st.indexMeta);
                    this._setStatus(st.indexMeta, { title: 'Tag index', logged: true });
                }
                if (st.refreshRerunWanted) {
                    st.refreshRerunWanted = false;
                    return run();
                }
            } catch (e) {
                const errStatus = `Failed to refresh index: ${String(e?.message || e)}`;
                this._logRow('tag-index', 'failed', { recordGuid: '', recordName: '' }, errStatus);
                this._setStatus(errStatus, { title: 'Tag index', logged: true });
            } finally {
                st.refreshInFlight = false;
                st.refreshPromise = null;
            }
        };
        st.refreshPromise = run();
        return st.refreshPromise;
    }

    async _traceCurrentTag() {
        const st = this._tagState;
        const oldTag = this.cleanTag(st.oldTag);
        if (!oldTag) { this._setStatus('Enter Current tag first.'); return; }
        const opts = this._tagScanOpts();
        const hits = [];
        const seen = new Set();
        const bySourceMap = new Map();
        const recordSet = new Set();
        const addHit = (hit) => {
            const key = `${hit.recordGuid}|${hit.source}|${hit.propertyName || ''}|${hit.value}`;
            if (seen.has(key)) return;
            seen.add(key);
            hits.push(hit);
            recordSet.add(hit.recordGuid);
            bySourceMap.set(hit.source, (bySourceMap.get(hit.source) || 0) + 1);
        };
        await this.forEachScannableRecord(opts, async (record) => {
            const recordGuid = record?.guid || '';
            const recordName = record.getName?.() || '(unknown)';
            const lineItems = await record.getLineItems(true);
            for (const item of lineItems) {
                const segments = item?.segments;
                if (!Array.isArray(segments)) continue;
                for (const seg of segments) {
                    const segText = this.segmentTextAsString(seg);
                    if (!segText) continue;
                    if (seg?.type === THYMER_TYPE_HASHTAG && this.isSourceTagPatternMatch(segText, oldTag, false)) {
                        addHit({ recordGuid, recordName, source: 'body-hashtag-segment', propertyName: null, value: segText });
                    }
                    if (seg?.type === 'text') {
                        for (const token of this.extractHashtagTokensFromText(segText)) {
                            if (this.isSourceTagPatternMatch(token, oldTag, false)) {
                                addHit({ recordGuid, recordName, source: 'body-plaintext-token', propertyName: null, value: `#${token}` });
                            }
                        }
                    }
                }
            }
            const properties = record.getAllProperties?.() || [];
            for (const prop of properties) {
                const propertyName = String(prop?.name ?? '');
                const choicesList = typeof prop.choices === 'function' ? prop.choices() : null;
                const isChoiceProperty =
                    Array.isArray(choicesList) ||
                    typeof prop.selectedChoiceLabels === 'function' ||
                    typeof prop.selectedChoices === 'function';
                if (!opts.excludeChoiceValues && isChoiceProperty) {
                    for (const label of (prop.selectedChoiceLabels?.() || [])) {
                        if (this.isSourceTagPatternMatch(label, oldTag, false)) addHit({ recordGuid, recordName, source: 'property-choice-label', propertyName, value: String(label) });
                    }
                    for (const id of (prop.selectedChoices?.() || [])) {
                        const raw = id != null ? String(id) : '';
                        if (raw && this.isSourceTagPatternMatch(raw, oldTag, false)) addHit({ recordGuid, recordName, source: 'property-choice-id', propertyName, value: raw });
                    }
                }
                if (this.shouldScanTextPropertyForTags(prop) && !this._shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, opts)) {
                    for (const value of (prop.texts?.() || [])) {
                        if (this.isSourceTagPatternMatch(value, oldTag, false)) addHit({ recordGuid, recordName, source: 'property-text', propertyName, value: String(value) });
                    }
                }
                for (const value of (prop.values?.() || [])) {
                    if (typeof value !== 'string') continue;
                    if (this.isSourceTagPatternMatch(value, oldTag, false)) addHit({ recordGuid, recordName, source: 'property-raw', propertyName, value });
                }
            }
        });
        const bySource = [...bySourceMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const lines = [];
        lines.push(`Trace for tag: ${oldTag}`);
        lines.push(`Total matching records: ${recordSet.size}`);
        lines.push(`Total source hits: ${hits.length}`);
        lines.push('');
        lines.push('By source:');
        for (const [source, count] of bySource) lines.push(`- ${source}: ${count}`);
        lines.push('');
        lines.push('Examples:');
        for (const h of hits.slice(0, 60)) {
            const prop = h.propertyName ? ` | property: ${h.propertyName}` : '';
            lines.push(`- ${h.recordName} [${h.recordGuid}] | ${h.source}${prop} | value: ${h.value}`);
        }
        if (hits.length > 60) lines.push(`... and ${hits.length - 60} more hits`);
        st.traceOutput = lines.join('\n');
        st.traceOpen = true;
        this._setStatus(`Trace complete: ${hits.length} source hit(s) across ${recordSet.size} record(s).`, { title: 'Tag trace' });
        this._logRow('tag-trace', 'applied', { recordGuid: '', recordName: '' }, st.traceOutput);
    }

    _reviewGridRowsForDisplay() {
        if (this._displayRowsCache && this._displayRowsCache.reviewGrid) return this._displayRowsCache.reviewGrid;
        const st = this._tagState;
        const filter = (st.reviewGridFilter || '').toLowerCase().trim();
        let rows = [...(st.reviewGridRows || [])];
        if (filter) {
            rows = rows.filter(r => `${r.recordName || ''} ${r.source || ''} ${r.preview || ''}`.toLowerCase().includes(filter));
        }
        const cmp = {
            'title-asc': (a, b) => (a.recordName || '').localeCompare(b.recordName || ''),
            'title-desc': (a, b) => (b.recordName || '').localeCompare(a.recordName || ''),
            'source-asc': (a, b) => (a.source || '').localeCompare(b.source || ''),
            'source-desc': (a, b) => (b.source || '').localeCompare(a.source || ''),
            'tag-group': (a, b) => this._compareTagNamesForSort(this.cleanTag(a.sourceTag || ''), this.cleanTag(b.sourceTag || '')) || (a.recordName || '').localeCompare(b.recordName || ''),
        }[st.reviewGridSort || 'title-asc'];
        if (cmp) rows.sort(cmp);
        if (this._displayRowsCache) this._displayRowsCache.reviewGrid = rows;
        return rows;
    }

    _reviewGridTableRowsHTML(rows) {
        if (!rows.length) return '<tr><td colspan="5">No queue rows.</td></tr>';
        const st = this._tagState;
        if (st.reviewGridSort !== 'tag-group') {
            return rows.map(r => this._reviewGridRowHTML(r)).join('');
        }
        const grouped = new Map();
        for (const row of rows) {
            const key = this.cleanTag(row.sourceTag || '') || '(none)';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(row);
        }
        const out = [];
        const sortedGroups = [...grouped.entries()].sort((a, b) => {
            const ak = a[0] === '(none)' ? '\uFFFF' : a[0];
            const bk = b[0] === '(none)' ? '\uFFFF' : b[0];
            return this._compareTagNamesForSort(ak, bk);
        });
        for (const [tag, list] of sortedGroups) {
            const collapsed = st.reviewGridCollapsedSources.has(tag);
            const disp = tag === '(none)' ? 'unknown' : tag;
            out.push(`<tr class="nm-rg-group-row"><td colspan="5"><div class="nm-inline" style="justify-content:space-between;width:100%;flex-wrap:wrap;gap:8px;align-items:center"><div class="nm-inline" style="gap:8px;align-items:center"><button type="button" class="nm-btn nm-btn--secondary" data-action="tr-rg-toggle-group" data-source="${this._escape(tag)}">${collapsed ? 'Expand' : 'Collapse'}</button><strong>#${this._escape(disp)} (${list.length})</strong></div><div class="nm-actions" style="margin:0"><button type="button" class="nm-btn nm-btn--secondary" data-action="tr-rg-group-default" data-source="${this._escape(tag)}">Set group default</button><button type="button" class="nm-btn nm-btn--secondary" data-action="tr-rg-group-skip" data-source="${this._escape(tag)}">Set group skip</button></div></div></td></tr>`);
            if (collapsed) continue;
            out.push(...list.map(r => this._reviewGridRowHTML(r, { tagGroup: true })));
        }
        return out.join('');
    }

    _reviewGridRowHTML(row, opts = {}) {
        const tagGroup = !!opts.tagGroup;
        const rowTag = this.cleanTag(row.sourceTag || '');
        const sub = (tagGroup && rowTag) ? `<div class="nm-muted" style="font-size:11px;opacity:0.8;">#${this._escape(rowTag)}</div>` : '';
        const mergeHint = row.mergeCount > 1
            ? `<div class="nm-muted" style="font-size:11px;margin-top:2px">${this._escape(String(row.mergeCount))} tag location(s) in this record</div>`
            : '';
        const titleOpen = tagGroup && row.recordGuid
            ? `<div class="nm-rg-title-open" tabindex="0" role="link" data-action="tr-rg-open-record" data-guid="${this._escape(row.recordGuid)}" title="Open this record in another panel"><div>${this._escape(row.recordName || '(untitled)')}</div>${sub}${mergeHint}</div>`
            : `<div>${this._escape(row.recordName || '(untitled)')}</div>${sub}${mergeHint}`;
        const ovRaw = row.overrideTarget || '';
        const hasOverride = !!this.cleanTag(ovRaw);
        const clearOverride = hasOverride ? `<button type="button" class="nm-parent-clear" data-action="tr-rg-override-clear" data-id="${this._escape(row.id)}" title="Clear override tag">×</button>` : '';
        return `<tr><td>${titleOpen}</td><td>${this._escape(row.preview || '')}</td><td><input type="checkbox" data-action="tr-rg-default" data-id="${this._escape(row.id)}"${row.action === 'default' ? ' checked' : ''}></td><td><input type="checkbox" data-action="tr-rg-skip" data-id="${this._escape(row.id)}"${row.action === 'skip' ? ' checked' : ''}></td><td><div class="nm-rg-override-wrap"><div class="nm-input-wrap"><input class="nm-input nm-rg-row-target" data-id="${this._escape(row.id)}" type="text" value="${this._escape(ovRaw)}" placeholder="override tag" title="Tag index: ArrowDown opens; arrows navigate; Enter picks; Esc closes list." autocomplete="off">${clearOverride}</div><div class="nm-rg-override-suggest nm-rg-suggest" aria-hidden="true"></div></div></td></tr>`;
    }

    _clearReviewGridQueue() {
        const st = this._tagState;
        st.reviewGridRows = [];
        st.reviewGridCollapsedSources = new Set();
        st.reviewGridMeta = 'No queue built.';
    }

    /** Clears Review Grid inputs, output, and queue (used when switching to Remove tag and after Remove tag apply). */
    _resetReviewGridWorkflow() {
        const st = this._tagState;
        st.reviewGridSourceTag = '';
        st.reviewGridSourceSearchOpen = false;
        st.reviewGridDefaultTarget = '';
        st.reviewGridFilter = '';
        st.reviewGridSort = 'title-asc';
        st.reviewGridOutput = '';
        this._clearReviewGridQueue();
    }

    /**
     * One queue row per record. Rename still touches all occurrences in the record;
     * this only simplifies the table (per-occurrence skip/override is not meaningful for a whole-record rename).
     */
    _collapseReviewGridRowsByRecord(rows, normalizedSource) {
        if (!Array.isArray(rows) || rows.length <= 1) return rows;
        const order = [];
        const byKey = new Map();
        for (const row of rows) {
            const g = row.recordGuid || '';
            const key = g || `noid:${row.id}`;
            if (!byKey.has(key)) {
                byKey.set(key, []);
                order.push(key);
            }
            byKey.get(key).push(row);
        }
        const out = [];
        let rowId = 0;
        for (const key of order) {
            const group = byKey.get(key);
            if (group.length === 1) {
                out.push(group[0]);
                continue;
            }
            const uniqSources = [...new Set(group.map(r => String(r.source || '')))];
            const sourceSummary = uniqSources.length === 1
                ? uniqSources[0]
                : `${group.length} hits (${uniqSources.slice(0, 2).join(', ')}${uniqSources.length > 2 ? '…' : ''})`;
            const firstOv = group.map(r => this.cleanTag(r.overrideTarget || '')).find(t => t);
            out.push({
                id: `rg-${rowId++}`,
                action: 'default',
                recordGuid: group[0].recordGuid,
                recordName: group[0].recordName,
                preview: group[0].preview,
                source: sourceSummary,
                sourceTag: normalizedSource,
                overrideTarget: firstOv ? `#${firstOv}` : '',
                mergeCount: group.length,
            });
        }
        return out;
    }

    /** One queue row per record; `subHits` lists each body/property hit for apply. */
    _collapseRemoveTagRowsByRecord(rows) {
        if (!Array.isArray(rows) || !rows.length) return rows;
        const order = [];
        const byGuid = new Map();
        for (const row of rows) {
            const g = row.recordGuid || '';
            const key = g || `noid:${row.id}`;
            if (!byGuid.has(key)) {
                byGuid.set(key, []);
                order.push(key);
            }
            byGuid.get(key).push(row);
        }
        const out = [];
        let rowId = 0;
        for (const key of order) {
            const group = byGuid.get(key);
            if (group.length === 1) {
                out.push(group[0]);
                continue;
            }
            const subHits = group.map(r => ({
                hitKind: r.hitKind,
                lineItemIndex: r.lineItemIndex,
                segmentIndex: r.segmentIndex,
                textOccurrenceIndex: r.textOccurrenceIndex,
                propertyName: r.propertyName,
                propertyValueIndex: r.propertyValueIndex,
            }));
            out.push({
                id: `rt-${rowId++}`,
                action: 'default',
                recordGuid: group[0].recordGuid,
                recordName: group[0].recordName,
                preview: group[0].preview,
                source: `${group.length} location(s)`,
                hitKind: 'merged',
                mergeCount: group.length,
                subHits,
                lineItemIndex: -1,
                segmentIndex: -1,
                textOccurrenceIndex: null,
                propertyName: '',
                propertyValueIndex: null,
            });
        }
        return out;
    }

    _reviewGridMetaSummary(gridRows) {
        const st = this._tagState;
        const rows = st.reviewGridRows || [];
        const total = rows.length;
        if (!total) return st.reviewGridMeta || 'No queue built.';
        const viewLen = Array.isArray(gridRows) ? gridRows.length : 0;
        const defaults = rows.filter(r => r.action === 'default').length;
        const skips = rows.filter(r => r.action === 'skip').length;
        const overrides = rows.filter(r => r.action === 'override').length;
        return `Rows: ${viewLen}/${total} | default: ${defaults} | skip: ${skips} | override: ${overrides}`;
    }

    _reviewGridBuildPlan() {
        const st = this._tagState;
        const rows = Array.isArray(st.reviewGridRows) ? st.reviewGridRows : [];
        const defaultTarget = this.cleanTag(st.reviewGridDefaultTarget || st.newTag || '');
        const sourceTag = this.cleanTag(st.reviewGridSourceTag || st.oldTag || '');
        const rowsToApply = rows.filter(r => r.action !== 'skip');
        const overrideRows = rows.filter(r => r.action === 'override');
        const defaultRows = rows.filter(r => r.action === 'default');
        const missingTargetRows = rowsToApply.filter(r => {
            const t = r.action === 'override' ? this.cleanTag(r.overrideTarget || '') : defaultTarget;
            return !t;
        });
        const overrideTargetCounts = new Map();
        for (const row of overrideRows) {
            const tag = this.cleanTag(row.overrideTarget || '');
            if (!tag) continue;
            overrideTargetCounts.set(tag, (overrideTargetCounts.get(tag) || 0) + 1);
        }
        const overrideSummary = [...overrideTargetCounts.entries()]
            .sort((a, b) => b[1] - a[1] || this._compareTagNamesForSort(a[0], b[0]))
            .map(([tag, count]) => `- ${tag}: ${count}`)
            .join('\n');
        const preLines = [
            'Apply reviewed rows summary',
            '',
            `Total rows: ${rows.length}`,
            `Will attempt apply: ${rowsToApply.length}`,
            `Default rows: ${defaultRows.length} (default target: ${defaultTarget || '(missing)'})`,
            `Override rows: ${overrideRows.length}`,
            `Skipped rows: ${rows.length - rowsToApply.length}`,
            `Missing target rows (will not be renamed on apply): ${missingTargetRows.length}`,
        ];
        if (!defaultTarget && defaultRows.length > 0) {
            preLines.push(
                '',
                `Note: ${defaultRows.length} row(s) are set to Default but no default target is set — they will be skipped, not renamed.`,
            );
        }
        if (overrideRows.length > 0) {
            const emptyOv = overrideRows.filter(r => !this.cleanTag(r.overrideTarget || '')).length;
            if (emptyOv > 0) {
                preLines.push(
                    '',
                    `Note: ${emptyOv} row(s) are set to Override with an empty new tag — they will be skipped, not renamed.`,
                );
            }
        }
        preLines.push(
            '',
            'Override tags to be used:',
            overrideSummary || '- (none)',
        );
        const preSummary = preLines.join('\n');
        return {
            rowsToApply,
            defaultTarget,
            sourceTag,
            preSummary,
            totalRows: rows.length,
            userSkippedCount: rows.length - rowsToApply.length,
            missingTargetPlanned: missingTargetRows.length,
            defaultRowsCount: defaultRows.length,
            overrideRowsCount: overrideRows.length,
        };
    }

    _attachTagIndexAutocomplete(input, suggestEl, signal, onSelectTag, getItemList) {
        if (!input || !suggestEl) return { close: () => {} };
        let items = [];
        let active = -1;
        const list = () => (typeof getItemList === 'function' ? getItemList() : (Array.isArray(this._tagState.tagIndex) ? this._tagState.tagIndex : []));
        const close = () => {
            items = [];
            active = -1;
            suggestEl.style.display = 'none';
            suggestEl.innerHTML = '';
        };
        const highlight = () => {
            [...suggestEl.querySelectorAll('.nm-rg-suggest-row')].forEach((rowEl, i) => {
                rowEl.classList.toggle('nm-rg-suggest-row--active', i === active);
            });
        };
        const choose = (tag) => {
            if (!tag) return;
            const clean = this.cleanTag(tag);
            if (!clean) return;
            input.value = clean;
            onSelectTag?.(clean);
            close();
        };
        const render = () => {
            const q = this.cleanTag(input.value || '').toLowerCase();
            const fullList = Array.isArray(list()) ? list() : [];
            const source = !q
                ? fullList.slice(0, 30)
                : fullList
                    .filter(t => t.tag.toLowerCase().includes(q))
                    .sort((a, b) => {
                        const aStarts = a.tag.toLowerCase().startsWith(q) ? 0 : 1;
                        const bStarts = b.tag.toLowerCase().startsWith(q) ? 0 : 1;
                        if (aStarts !== bStarts) return aStarts - bStarts;
                        const byName = this._compareTagNamesForSort(a.tag, b.tag);
                        if (byName !== 0) return byName;
                        return b.count - a.count;
                    })
                    .slice(0, 30);
            if (!source.length) {
                close();
                return;
            }
            items = source;
            active = -1;
            suggestEl.innerHTML = source.map(it => `<button type="button" class="nm-rg-suggest-row" data-tag="${this._escape(it.tag)}">${this._escape(it.tag)} (${it.count})</button>`).join('');
            suggestEl.style.display = 'block';
            suggestEl.querySelectorAll('.nm-rg-suggest-row').forEach(btn => {
                btn.addEventListener('mousedown', ev => {
                    ev.preventDefault();
                    choose(btn.dataset.tag);
                });
            });
        };
        const onKeydown = ev => {
            const suggestVisible = suggestEl.style.display !== 'none';
            const open = suggestVisible && items.length > 0;
            if (ev.key === 'Escape') {
                if (suggestVisible || items.length > 0) {
                    ev.preventDefault();
                    close();
                }
                return;
            }
            if (!open && ev.key === 'ArrowDown') {
                ev.preventDefault();
                render();
                if (items.length > 0) {
                    active = 0;
                    highlight();
                }
                return;
            }
            if (!open) return;
            if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                active = active < items.length - 1 ? active + 1 : 0;
                highlight();
            } else if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                active = active > 0 ? active - 1 : items.length - 1;
                highlight();
            } else if (ev.key === 'Enter') {
                if (!open) return;
                ev.preventDefault();
                const pick = items[active >= 0 ? active : 0];
                if (pick) choose(pick.tag);
            }
        };
        input.addEventListener('input', render);
        input.addEventListener('focus', () => render());
        input.addEventListener('click', () => render());
        input.addEventListener('keydown', onKeydown);
        input.addEventListener('blur', () => {
            setTimeout(() => close(), 120);
        });
        signal.addEventListener('abort', () => close(), { once: true });
        return { close };
    }

    async _openReviewGridRecordInOtherPanel(recordGuid) {
        const rootId = String(recordGuid || '').trim();
        if (!rootId) return;
        let workspaceGuid = null;
        try {
            workspaceGuid = typeof this.plugin.getWorkspaceGuid === 'function' ? this.plugin.getWorkspaceGuid() : null;
        } catch (_) {
            /* navigateTo may still resolve without workspace */
        }
        try {
            const p = await this.plugin.ui.createPanel();
            if (!p?.navigateTo) return;
            p.navigateTo({ type: 'edit_panel', rootId, subId: null, workspaceGuid });
        } catch (_) {
            /* ignore */
        }
    }

    async _reviewGridBuild() {
        const st = this._tagState;
        const normalizedSource = this.cleanTag(st.reviewGridSourceTag || st.oldTag);
        if (!normalizedSource) { this._setStatus('Review Grid: source tag is required.'); return; }
        st.reviewGridSourceTag = normalizedSource;
        const opts = this._tagScanOpts();
        const rows = [];
        let rowId = 0;
        await this.forEachScannableRecord(opts, async (record) => {
            const recordGuid = record?.guid || '';
            const recordName = record.getName?.() || '(untitled)';
            const lineItems = await record.getLineItems(true);
            const previewLines = [];
            for (const item of (lineItems || [])) {
                const segs = item?.segments;
                if (!Array.isArray(segs)) continue;
                const txt = segs.map(s => this.segmentTextAsString(s)).join('').trim();
                if (!txt) continue;
                previewLines.push(txt);
                if (previewLines.length >= 2) break;
            }
            const preview = previewLines.join('\n').slice(0, 256);
            for (const item of (lineItems || [])) {
                const segs = item?.segments;
                if (!Array.isArray(segs)) continue;
                for (let i = 0; i < segs.length; i += 1) {
                    const seg = segs[i];
                    const segText = this.segmentTextAsString(seg);
                    if (!segText) continue;
                    if (seg?.type === THYMER_TYPE_HASHTAG && this.isSourceTagPatternMatch(segText, normalizedSource, false)) {
                        const rowSourceTag = this.cleanTag(segText);
                        rows.push({ id: `rg-${rowId++}`, action: 'default', recordGuid, recordName, source: 'body-hashtag-segment', preview, sourceTag: rowSourceTag, overrideTarget: '' });
                    } else if (seg?.type === 'text') {
                        for (const token of this.extractHashtagTokensFromText(segText)) {
                            if (!this.isSourceTagPatternMatch(token, normalizedSource, false)) continue;
                            rows.push({ id: `rg-${rowId++}`, action: 'default', recordGuid, recordName, source: 'body-plaintext-token', preview, sourceTag: token, overrideTarget: '' });
                        }
                    }
                }
            }
            const properties = record.getAllProperties?.() || [];
            for (const prop of properties) {
                const propertyName = String(prop?.name ?? '');
                if (opts.excludeChoiceValues && this._hasArrayChoicesProperty(prop)) continue;
                if (!opts.excludeChoiceValues) {
                    const labels = prop.selectedChoiceLabels?.() ?? [];
                    const ids = prop.selectedChoices?.() ?? [];
                    const n = Math.max(labels.length, ids.length);
                    for (let i = 0; i < n; i += 1) {
                        const label = String(labels[i] ?? '');
                        const rawId = Array.isArray(ids) ? String(ids[i] ?? '') : '';
                        const labelMatch = this.isSourceTagPatternMatch(label, normalizedSource, false);
                        const idMatch = rawId && this.isSourceTagPatternMatch(rawId, normalizedSource, false);
                        if (labelMatch || idMatch) {
                            const rowSourceTag = labelMatch ? this.cleanTag(label) : this.cleanTag(rawId);
                            rows.push({ id: `rg-${rowId++}`, action: 'default', recordGuid, recordName, source: `property-choice:${propertyName}`, preview, sourceTag: rowSourceTag, overrideTarget: '' });
                        }
                    }
                }
                if (!this.shouldScanTextPropertyForTags(prop)) continue;
                if (this._shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, opts)) continue;
                const texts = prop.texts?.() || [];
                for (const value of texts) {
                    const v = String(value ?? '');
                    if (!this.isSourceTagPatternMatch(v, normalizedSource, false)) continue;
                    rows.push({ id: `rg-${rowId++}`, action: 'default', recordGuid, recordName, source: `property-text:${propertyName}`, preview, sourceTag: this.cleanTag(v), overrideTarget: '' });
                }
            }
        });
        st.reviewGridRows = this._collapseReviewGridRowsByRecord(rows, normalizedSource);
        const gridRows = this._reviewGridRowsForDisplay();
        st.reviewGridMeta = st.reviewGridRows.length ? this._reviewGridMetaSummary(gridRows) : 'No queue built.';
        st.reviewGridOutput = '';
        this._setStatus(st.reviewGridMeta, { title: 'Review Grid' });
    }

    _reviewGridPreview() {
        const st = this._tagState;
        const rows = st.reviewGridRows || [];
        if (!rows.length) {
            st.reviewGridOutput = 'Review Grid preview: build a queue first (Find matches).';
            this._logRow('review-grid', 'preview', { recordGuid: '', recordName: '' }, st.reviewGridOutput);
            this._setStatus(st.reviewGridOutput, { title: 'Review Grid', logged: true });
            return;
        }
        const plan = this._reviewGridBuildPlan();
        st.reviewGridOutput = `${plan.preSummary}\n\nPreview generated.`;
        this._logRow('review-grid', 'preview', { recordGuid: '', recordName: '' }, st.reviewGridOutput);
        this._setStatus(st.reviewGridOutput, { title: 'Review Grid', logged: true });
    }

    async _reviewGridApply() {
        const st = this._tagState;
        const plan = this._reviewGridBuildPlan();
        st.reviewGridOutput = plan.preSummary;
        if (!plan.rowsToApply.length) {
            st.reviewGridOutput += '\n\nNo rows selected for apply.';
            this._logRow('review-grid', 'summary', { recordGuid: '', recordName: '' }, st.reviewGridOutput);
            this._setStatus(st.reviewGridOutput, { title: 'Review Grid', logged: true });
            if (this._panel) this._render(this._panel);
            return;
        }
        st.running = true;
        if (this._panel) this._render(this._panel);
        const defaultSource = this.cleanTag(st.reviewGridSourceTag || st.oldTag);
        const defaultTarget = this.cleanTag(st.reviewGridDefaultTarget || st.newTag);
        // Group by record guid → Map<sourceTag, Set<targetTag>> so each scanned record does one
        // O(1) lookup instead of iterating the whole rowsToApply list (was O(records × rows)).
        const targetsByGuid = new Map();
        for (const row of plan.rowsToApply) {
            const src = this.cleanTag(row.sourceTag || defaultSource);
            const tgt = this.cleanTag((row.action === 'override' ? row.overrideTarget : '') || defaultTarget);
            if (!src || !tgt) continue;
            const guidKey = row.recordGuid || '';
            let bySrc = targetsByGuid.get(guidKey);
            if (!bySrc) {
                bySrc = new Map();
                targetsByGuid.set(guidKey, bySrc);
            }
            let targets = bySrc.get(src);
            if (!targets) {
                targets = new Set();
                bySrc.set(src, targets);
            }
            targets.add(tgt);
        }
        const appliedGuids = new Set();
        let skippedConflicts = 0;
        let failed = 0;
        let skippedNoChange = 0;
        const opts = this._tagScanOpts();
        try {
            await this.forEachScannableRecord(opts, async (record) => {
                const guid = record?.guid || '';
                const bySrc = targetsByGuid.get(guid);
                if (!bySrc) return;
                for (const [src, targets] of bySrc.entries()) {
                    if (!targets || !targets.size) continue;
                    if (targets.size > 1) { skippedConflicts += 1; continue; }
                    const target = targets.values().next().value;
                    try {
                        const changed = await this._renameTagInRecord({ record, oldTag: src, newTag: target, caseSensitive: st.caseSensitive, dryRun: false, collectRows: null });
                        if (changed.recordChanged) appliedGuids.add(guid);
                        else skippedNoChange += 1;
                    } catch (_) {
                        failed += 1;
                    }
                }
            });
            const runAt = new Date().toLocaleString();
            const notRenamedMissingTarget = plan.missingTargetPlanned;
            const afterLines = [
                'Advanced review — rename complete',
                `Run type: Apply (writes committed)`,
                `Run timestamp: ${runAt}`,
                `Source: ${plan.sourceTag || '(none)'}`,
                `Default target: ${plan.defaultTarget || '(not set)'}`,
                `Total queue rows: ${plan.totalRows}`,
                `Not renamed: excluded by skip action: ${plan.userSkippedCount}`,
                `Not renamed: missing target for apply: ${notRenamedMissingTarget}`,
                `Tags renamed (row updates): ${appliedGuids.size} record(s) changed`,
                `Skipped conflicts (per record+source target mismatch): ${skippedConflicts}`,
                `Not renamed: apply returned no record change: ${skippedNoChange}`,
                `Errors: ${failed}`,
                `Writes to workspace: ${appliedGuids.size > 0 ? `yes (${appliedGuids.size} record(s))` : 'no'}`,
                '',
                'Planned run (for reference, before apply above):',
                plan.preSummary,
            ];
            st.reviewGridOutput = afterLines.join('\n');
            this._clearReviewGridQueue();
            await this._refreshTagIndex({ quiet: true });
            this._logRow('review-grid', 'summary', { recordGuid: '', recordName: '' }, st.reviewGridOutput);
            this._setStatus(st.reviewGridOutput, { title: 'Review Grid', logged: true });
        } finally {
            st.running = false;
        }
    }

    _clearRemoveTagQueue() {
        const st = this._tagState;
        st.removeTagRows = [];
        st.removeTagMeta = 'No queue built.';
    }

    _clearAddTagQueue() {
        const st = this._tagState;
        st.addTagRows = [];
        st.addTagMeta = 'No queue built.';
    }

    _clearAddTagWorkflow() {
        const st = this._tagState;
        st.addTagTag = '';
        st.addTagRecordFilter = '';
        st.addTagTableFilter = '';
        st.addTagSort = 'title-asc';
        this._clearAddTagQueue();
        st.addTagOutput = '';
    }

    /**
     * Collect type hints from PluginProperty (SDK: getType(), type, propertyType, fieldType).
     * Any hint may be `"hashtag"` (PROP_TYPE_HASHTAG); do not let a non-hashtag getType() hide a real hashtag type on other fields.
     */
    _collectThymerPropertyTypeHints(prop) {
        if (!prop) return [];
        const hints = [];
        try {
            if (typeof prop.getType === 'function') {
                const g = String(prop.getType()).trim().toLowerCase();
                if (g) hints.push(g);
            }
        } catch (_) {}
        for (const k of [prop?.type, prop?.propertyType, prop?.fieldType, prop?.kind]) {
            const s = String(k ?? '').trim().toLowerCase();
            if (s) hints.push(s);
        }
        return hints;
    }

    _isPropertyTypeHashtag(prop) {
        const hints = this._collectThymerPropertyTypeHints(prop);
        if (hints.includes(THYMER_TYPE_HASHTAG)) return true;
        return hints.some(h => /\bhashtag\b/.test(h));
    }

    /** SDK PluginProperty: can store tag strings via addValue and/or set + texts/values. */
    _propertySupportsTagValues(prop) {
        if (!prop) return false;
        if (typeof prop.addValue === 'function') return true;
        if (typeof prop.set === 'function' && (typeof prop.texts === 'function' || typeof prop.values === 'function')) return true;
        return false;
    }

    _isTagsColumnName(prop) {
        const n = String(prop?.name ?? '').trim().toLowerCase();
        return n === 'tags' || n === 'tag';
    }

    /**
     * Queue/apply tag writes here: explicit hashtag type, or canonical Tags/Tag column (not a choice enum), with a writable API.
     */
    _canQueueAddTagToProperty(prop) {
        if (!prop || !this._propertySupportsTagValues(prop)) return false;
        if (this._hasArrayChoicesProperty(prop)) return false;
        return this._isPropertyTypeHashtag(prop) || this._isTagsColumnName(prop);
    }

    /** String values from a property for tag read/write (SDK: texts() preferred, values() fallback). */
    _getPropertyStringValues(prop) {
        if (!prop) return [];
        if (typeof prop.texts === 'function') {
            try {
                return [...(prop.texts() || [])].map(x => String(x ?? ''));
            } catch (_) {}
        }
        if (typeof prop.values === 'function') {
            try {
                return [...(prop.values() || [])].map(x => String(x ?? ''));
            } catch (_) {}
        }
        return [];
    }

    /** Prefer `record.prop(name)` (Thymer SDK), then match `getAllProperties()` by name. */
    _resolvePluginProperty(record, name) {
        const n = String(name || '').trim();
        if (!record || !n) return null;
        if (typeof record.prop === 'function') {
            try {
                const p = record.prop(n);
                if (p) return p;
            } catch (_) {}
        }
        try {
            const props = record.getAllProperties?.() || [];
            return props.find(p => String(p?.name ?? '') === n) || null;
        } catch (_) {
            return null;
        }
    }

    _findFirstHashtagProperty(record) {
        try {
            const props = record.getAllProperties?.() || [];
            return props.find(p => this._isPropertyTypeHashtag(p)) || null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Prefer **Tags** / **Tag** via `record.prop`, then any queueable column (hashtag type or Tags name), sorted by name then multi-value.
     */
    _findBestHashtagPropertyForAdd(record) {
        try {
            if (typeof record.prop === 'function') {
                for (const nm of ['Tags', 'Tag']) {
                    try {
                        const p = record.prop(nm);
                        if (p && this._canQueueAddTagToProperty(p)) return p;
                    } catch (_) {}
                }
            }
            const props = (record.getAllProperties?.() || []).filter(p => this._canQueueAddTagToProperty(p));
            if (!props.length) return null;
            const nameScore = (p) => {
                const n = String(p?.name ?? '').trim().toLowerCase();
                if (n === 'tags' || n === 'tag') return 0;
                if (n.includes('tag')) return 1;
                return 2;
            };
            const isMulti = (p) => {
                try {
                    return typeof p.isMultiValue === 'function' && p.isMultiValue();
                } catch (_) {
                    return false;
                }
            };
            props.sort((a, b) => {
                const d = nameScore(a) - nameScore(b);
                if (d !== 0) return d;
                if (isMulti(a) !== isMulti(b)) return isMulti(a) ? -1 : 1;
                return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
            });
            return props[0];
        } catch (_) {
            return null;
        }
    }

    _addTagValueWithHash(cleanTag) {
        const c = this.cleanTag(cleanTag);
        return c ? `#${c}` : '';
    }

    /** New body line: `#tag ` including one trailing space. */
    _addTagBodyLineText(cleanTag) {
        const v = this._addTagValueWithHash(cleanTag);
        return v ? `${v} ` : '';
    }

    /**
     * Value to pass to `addValue` / `set` for a property. Hashtag-typed fields store the **token**
     * (no `#`); the app adds `#` for display — passing `#tag` would show as `##tag`.
     * Text-style Tags columns follow existing entries: `#`-prefixed or plain.
     */
    _addTagValueForPropertyPersist(tagClean, prop) {
        const c = this.cleanTag(tagClean);
        if (!c) return '';
        if (this._isPropertyTypeHashtag(prop)) return c;
        const cur = this._getPropertyStringValues(prop);
        const sample = cur.find(s => String(s ?? '').trim());
        if (!sample) return `#${c}`;
        return String(sample).trim().startsWith('#') ? `#${c}` : c;
    }

    async _recordHaystackForAddTagFilter(record) {
        const name = String(record.getName?.() || '').trim();
        const lineItems = await record.getLineItems(true);
        const previewLines = [];
        for (const item of lineItems || []) {
            const segs = item?.segments;
            if (!Array.isArray(segs)) continue;
            const txt = segs.map(s => this.segmentTextAsString(s)).join('').trim();
            if (!txt) continue;
            previewLines.push(txt);
            if (previewLines.length >= 2) break;
        }
        const preview = previewLines.join('\n').trim();
        return `${name}\n${preview}`.trim().toLowerCase();
    }

    async _addTagRecordMatchesRecordFilter(record, filterRaw) {
        const f = String(filterRaw || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!f) return true;
        const hay = await this._recordHaystackForAddTagFilter(record);
        return hay.includes(f);
    }

    async _recordAlreadyHasTag(record, tagNorm, caseSensitive) {
        const want = this.matchKey(tagNorm, caseSensitive);
        if (!want) return false;
        const lineItems = await record.getLineItems(true);
        for (const item of lineItems || []) {
            const segs = item?.segments;
            if (!Array.isArray(segs)) continue;
            for (const seg of segs) {
                const segText = this.segmentTextAsString(seg);
                if (seg?.type === THYMER_TYPE_HASHTAG && this.matchKey(this.cleanTag(segText), caseSensitive) === want) return true;
                if (seg?.type === 'text' && segText) {
                    for (const tok of this.extractHashtagTokensFromText(segText)) {
                        if (this.matchKey(tok, caseSensitive) === want) return true;
                    }
                }
            }
        }
        try {
            const props = record.getAllProperties?.() || [];
            for (const hp of props) {
                if (!this._canQueueAddTagToProperty(hp)) continue;
                for (const value of this._getPropertyStringValues(hp)) {
                    if (this._isTagMatch(String(value ?? ''), tagNorm, caseSensitive)) return true;
                }
            }
        } catch (_) {}
        return false;
    }

    async _getLastTopLevelLineItemForAddTag(record) {
        const lineItems = await record.getLineItems(true);
        if (!Array.isArray(lineItems) || !lineItems.length) return null;
        return lineItems[lineItems.length - 1];
    }

    /**
     * @returns {Promise<boolean>} true if a write was persisted
     */
    async _applyAddTagToRecord(record, row, tagClean, caseSensitive) {
        if (await this._recordAlreadyHasTag(record, tagClean, caseSensitive)) return false;
        if (row.placement === 'property' && row.propertyName) {
            const prop = this._resolvePluginProperty(record, row.propertyName);
            if (!prop || !this._canQueueAddTagToProperty(prop)) return false;
            const val = this._addTagValueForPropertyPersist(tagClean, prop);
            if (!val) return false;
            let multi = false;
            try {
                multi = typeof prop.isMultiValue === 'function' && prop.isMultiValue();
            } catch (_) {}
            // SDK: addValue() appends on multi-value; on single-value it behaves like set() (replaces), so merge via texts+set when not multi.
            if (multi && typeof prop.addValue === 'function') {
                try {
                    prop.addValue(val);
                    return true;
                } catch (_) {
                    /* fall through to texts + set */
                }
            }
            if (typeof prop.set === 'function') {
                try {
                    const cur = [...this._getPropertyStringValues(prop)];
                    if (cur.some(existing => this._isTagMatch(existing, tagClean, caseSensitive))) return false;
                    cur.push(val);
                    prop.set(cur);
                    return true;
                } catch (_) {
                    return false;
                }
            }
            if (typeof prop.addValue === 'function') {
                try {
                    prop.addValue(val);
                    return true;
                } catch (_) {
                    return false;
                }
            }
            return false;
        }
        if (!this.cleanTag(tagClean)) return false;
        try {
            const afterItem = await this._getLastTopLevelLineItemForAddTag(record);
            const textSeg = this._addTagBodyLineText(tagClean);
            if (!textSeg) return false;
            await record.createLineItem(null, afterItem, 'text', [{ type: 'text', text: textSeg }], null);
            return true;
        } catch (_) {
            return false;
        }
    }

    _addTagRowsForDisplay() {
        if (this._displayRowsCache && this._displayRowsCache.addTag) return this._displayRowsCache.addTag;
        const st = this._tagState;
        const filter = (st.addTagTableFilter || '').toLowerCase().trim();
        let rows = [...(st.addTagRows || [])];
        if (filter) {
            rows = rows.filter(r => `${r.recordName || ''} ${r.source || ''} ${r.preview || ''}`.toLowerCase().includes(filter));
        }
        const cmp = {
            'title-asc': (a, b) => (a.recordName || '').localeCompare(b.recordName || ''),
            'title-desc': (a, b) => (b.recordName || '').localeCompare(a.recordName || ''),
            'source-asc': (a, b) => (a.source || '').localeCompare(b.source || ''),
            'source-desc': (a, b) => (b.source || '').localeCompare(a.source || ''),
        }[st.addTagSort || 'title-asc'];
        if (cmp) rows.sort(cmp);
        if (this._displayRowsCache) this._displayRowsCache.addTag = rows;
        return rows;
    }

    _addTagMetaSummary(gridRows) {
        const st = this._tagState;
        const rows = st.addTagRows || [];
        const total = rows.length;
        if (!total) return st.addTagMeta || 'No queue built.';
        const viewLen = Array.isArray(gridRows) ? gridRows.length : 0;
        const adds = rows.filter(r => r.action === 'default').length;
        const skips = rows.filter(r => r.action === 'skip').length;
        const off = rows.filter(r => r.action !== 'default' && r.action !== 'skip').length;
        return `Rows: ${viewLen}/${total} | add: ${adds} | skip: ${skips} | off: ${off}`;
    }

    _addTagTableRowsHTML(rows) {
        if (!rows.length) return '<tr><td colspan="4">No queue rows.</td></tr>';
        return rows.map(r => this._addTagRowHTML(r)).join('');
    }

    _addTagRowHTML(row) {
        const mergeHint = row.mergeCount > 1
            ? `<div class="nm-muted" style="font-size:11px;margin-top:2px">${this._escape(String(row.mergeCount))} location(s)</div>`
            : '';
        const titleOpen = row.recordGuid
            ? `<div class="nm-rg-title-open" tabindex="0" role="link" data-action="tr-rg-open-record" data-guid="${this._escape(row.recordGuid)}" title="Open this record in another panel"><div>${this._escape(row.recordName || '(untitled)')}</div>${mergeHint}</div>`
            : `<div>${this._escape(row.recordName || '(untitled)')}</div>${mergeHint}`;
        return `<tr><td>${titleOpen}</td><td>${this._escape(row.preview || '')}</td><td><input type="checkbox" data-action="tr-at-default" data-id="${this._escape(row.id)}"${row.action === 'default' ? ' checked' : ''}></td><td><input type="checkbox" data-action="tr-at-skip" data-id="${this._escape(row.id)}"${row.action === 'skip' ? ' checked' : ''}></td></tr>`;
    }

    async _addTagBuild() {
        const st = this._tagState;
        const tagNorm = this.cleanTag(st.addTagTag || '');
        if (!tagNorm) { this._setStatus('Add tag: enter a tag to add.'); return; }
        st.addTagTag = tagNorm;
        const opts = this._tagScanOpts();
        const filterRaw = st.addTagRecordFilter || '';
        const caseSens = !!st.caseSensitive;
        const rows = [];
        let rowId = 0;
        await this.forEachScannableRecord(opts, async (record) => {
            if (!(await this._addTagRecordMatchesRecordFilter(record, filterRaw))) return;
            if (await this._recordAlreadyHasTag(record, tagNorm, caseSens)) return;
            const recordGuid = record?.guid || '';
            const recordName = record.getName?.() || '(untitled)';
            const lineItems = await record.getLineItems(true);
            const previewLines = [];
            for (const item of lineItems || []) {
                const segs = item?.segments;
                if (!Array.isArray(segs)) continue;
                const txt = segs.map(s => this.segmentTextAsString(s)).join('').trim();
                if (!txt) continue;
                previewLines.push(txt);
                if (previewLines.length >= 2) break;
            }
            const preview = previewLines.join('\n').slice(0, 256);
            const hp = this._findBestHashtagPropertyForAdd(record);
            let placement = 'body';
            let source = 'body (new line)';
            let propertyName = '';
            if (hp) {
                placement = 'property';
                propertyName = String(hp.name ?? '');
                source = `hashtag property (${propertyName})`;
            }
            rows.push({
                id: `at-${rowId++}`,
                action: 'none',
                recordGuid,
                recordName,
                preview,
                source,
                placement,
                propertyName,
            });
        });
        st.addTagRows = this._collapseAddTagRowsByRecord(rows);
        const gridRows = this._addTagRowsForDisplay();
        st.addTagMeta = st.addTagRows.length ? this._addTagMetaSummary(gridRows) : 'No queue built.';
        st.addTagOutput = '';
        this._setStatus(st.addTagMeta, { title: 'Add tag' });
    }

    _collapseAddTagRowsByRecord(rows) {
        if (!Array.isArray(rows) || !rows.length) return rows;
        const order = [];
        const byKey = new Map();
        for (const row of rows) {
            const g = row.recordGuid || '';
            const key = g || `noid:${row.id}`;
            if (!byKey.has(key)) {
                byKey.set(key, []);
                order.push(key);
            }
            byKey.get(key).push(row);
        }
        const out = [];
        let id = 0;
        for (const key of order) {
            const group = byKey.get(key);
            if (group.length === 1) {
                out.push(group[0]);
                continue;
            }
            out.push({
                id: `at-${id++}`,
                action: 'none',
                recordGuid: group[0].recordGuid,
                recordName: group[0].recordName,
                preview: group[0].preview,
                source: group[0].source,
                placement: group[0].placement,
                propertyName: group[0].propertyName,
                mergeCount: group.length,
            });
        }
        return out;
    }

    _addTagPreview() {
        const st = this._tagState;
        const rows = st.addTagRows || [];
        if (!rows.length) {
            st.addTagOutput = 'Add tag preview: build a queue first (Find matches).';
            this._logRow('add-tag', 'preview', { recordGuid: '', recordName: '' }, st.addTagOutput);
            this._setStatus(st.addTagOutput, { title: 'Add tag', logged: true });
            return;
        }
        const toAdd = rows.filter(r => r.action === 'default').length;
        if (!toAdd) {
            st.addTagOutput = 'Add tag preview: no rows marked for Add. Check Add on one or more rows, or use the Add column header to select all visible rows, then try Preview again.';
            this._logRow('add-tag', 'preview', { recordGuid: '', recordName: '' }, st.addTagOutput);
            this._setStatus(st.addTagOutput, { title: 'Add tag', logged: true });
            return;
        }
        const skipped = rows.filter(r => r.action === 'skip').length;
        const off = rows.filter(r => r.action !== 'default' && r.action !== 'skip').length;
        st.addTagOutput = [
            'Add tag — preview (no writes)',
            `Tag: #${this.cleanTag(st.addTagTag || '')}`,
            `Queue rows: ${rows.length}`,
            `Marked add: ${toAdd}`,
            `Marked skip: ${skipped}`,
            `Neither (off): ${off}`,
        ].join('\n');
        this._logRow('add-tag', 'preview', { recordGuid: '', recordName: '' }, st.addTagOutput);
        this._setStatus(st.addTagOutput, { title: 'Add tag', logged: true });
    }

    async _addTagApply() {
        const st = this._tagState;
        const tag = this.cleanTag(st.addTagTag || '');
        const rows = Array.isArray(st.addTagRows) ? st.addTagRows : [];
        const rowsToApply = rows.filter(r => r.action === 'default');
        if (!tag) {
            st.addTagOutput = 'Add tag apply: no tag set.';
            this._logRow('add-tag', 'summary', { recordGuid: '', recordName: '' }, st.addTagOutput);
            this._setStatus(st.addTagOutput, { title: 'Add tag', logged: true });
            if (this._panel) this._render(this._panel);
            return;
        }
        if (!rowsToApply.length) {
            st.addTagOutput = rows.length
                ? 'Add tag apply: no rows marked for Add. Check Add on one or more rows, or use the Add column header to select all visible rows, then try Apply again.'
                : 'Add tag apply: build a queue first (Find matches).';
            this._logRow('add-tag', 'summary', { recordGuid: '', recordName: '' }, st.addTagOutput);
            this._setStatus(st.addTagOutput, { title: 'Add tag', logged: true });
            if (this._panel) this._render(this._panel);
            return;
        }
        st.running = true;
        if (this._panel) this._render(this._panel);
        const byGuid = new Map();
        for (const row of rowsToApply) {
            const g = row.recordGuid || '';
            if (!g) continue;
            byGuid.set(g, row);
        }
        const opts = this._tagScanOpts();
        let recordsWritten = 0;
        let failed = 0;
        let applyAttempts = 0;
        let noWrite = 0;
        const writtenLines = [];
        try {
            await this.forEachScannableRecord(opts, async (record) => {
                const guid = record?.guid || '';
                if (!byGuid.has(guid)) return;
                const row = byGuid.get(guid);
                const recordNameLive = record.getName?.() || row.recordName || '(untitled)';
                const placement = row.source || (row.placement === 'property' && row.propertyName
                    ? `hashtag property (${row.propertyName})`
                    : String(row.placement || 'body'));
                applyAttempts += 1;
                try {
                    const written = await this._applyAddTagToRecord(record, row, tag, st.caseSensitive);
                    if (written) {
                        recordsWritten += 1;
                        const line = `• ${recordNameLive} — ${placement} [${guid}]`;
                        writtenLines.push(line);
                        this._logRow('add-tag', 'applied', {
                            recordGuid: guid,
                            recordName: recordNameLive,
                        }, `Added #${tag} — ${placement}`);
                    } else {
                        noWrite += 1;
                    }
                } catch (e) {
                    failed += 1;
                    this._logRow('add-tag', 'failed', {
                        recordGuid: guid,
                        recordName: recordNameLive,
                    }, String(e?.message || e));
                }
            });
            const runAt = new Date().toLocaleString();
            const maxList = 120;
            const listBody = writtenLines.length
                ? [
                    '',
                    `Updated records (${writtenLines.length}):`,
                    ...writtenLines.slice(0, maxList),
                    writtenLines.length > maxList ? `… and ${writtenLines.length - maxList} more (each write is also a row in Review log).` : '',
                ].filter(Boolean)
                : [];
            const addTagCompletion = [
                'Add tag — apply complete',
                `Run timestamp: ${runAt}`,
                `Tag added: #${tag}`,
                `Records marked Add (unique): ${byGuid.size}`,
                `Apply attempts (records reached): ${applyAttempts}`,
                `Records modified (writes applied): ${recordsWritten}`,
                `No write at apply (e.g. tag already present, placement unavailable): ${noWrite}`,
                `Errors: ${failed}`,
                ...listBody,
            ].join('\n');
            this._clearAddTagWorkflow();
            st.addTagOutput = addTagCompletion;
            this._clearRemoveTagQueue();
            st.removeTagTag = '';
            this._resetReviewGridWorkflow();
            await this._refreshTagIndex({ quiet: true });
            this._logRow('add-tag', 'summary', { recordGuid: '', recordName: '' }, st.addTagOutput);
            this._setStatus(st.addTagOutput, { title: 'Add tag', logged: true });
        } finally {
            st.running = false;
        }
    }

    _removeTagRowsForDisplay() {
        if (this._displayRowsCache && this._displayRowsCache.removeTag) return this._displayRowsCache.removeTag;
        const st = this._tagState;
        const filter = (st.removeTagFilter || '').toLowerCase().trim();
        let rows = [...(st.removeTagRows || [])];
        if (filter) {
            rows = rows.filter(r => `${r.recordName || ''} ${r.source || ''} ${r.preview || ''}`.toLowerCase().includes(filter));
        }
        const cmp = {
            'title-asc': (a, b) => (a.recordName || '').localeCompare(b.recordName || ''),
            'title-desc': (a, b) => (b.recordName || '').localeCompare(a.recordName || ''),
            'source-asc': (a, b) => (a.source || '').localeCompare(b.source || ''),
            'source-desc': (a, b) => (b.source || '').localeCompare(a.source || ''),
        }[st.removeTagSort || 'title-asc'];
        if (cmp) rows.sort(cmp);
        if (this._displayRowsCache) this._displayRowsCache.removeTag = rows;
        return rows;
    }

    _removeTagMetaSummary(gridRows) {
        const st = this._tagState;
        const rows = st.removeTagRows || [];
        const total = rows.length;
        if (!total) return st.removeTagMeta || 'No queue built.';
        const viewLen = Array.isArray(gridRows) ? gridRows.length : 0;
        const removes = rows.filter(r => r.action === 'default').length;
        const skips = rows.filter(r => r.action === 'skip').length;
        return `Rows: ${viewLen}/${total} | remove: ${removes} | skip: ${skips}`;
    }

    _removeTagTableRowsHTML(rows) {
        if (!rows.length) return '<tr><td colspan="4">No queue rows.</td></tr>';
        return rows.map(r => this._removeTagRowHTML(r)).join('');
    }

    _removeTagRowHTML(row) {
        const mergeHint = row.mergeCount > 1
            ? `<div class="nm-muted" style="font-size:11px;margin-top:2px">${this._escape(String(row.mergeCount))} location(s)</div>`
            : '';
        const titleOpen = row.recordGuid
            ? `<div class="nm-rg-title-open" tabindex="0" role="link" data-action="tr-rg-open-record" data-guid="${this._escape(row.recordGuid)}" title="Open this record in another panel"><div>${this._escape(row.recordName || '(untitled)')}</div>${mergeHint}</div>`
            : `<div>${this._escape(row.recordName || '(untitled)')}</div>${mergeHint}`;
        return `<tr><td>${titleOpen}</td><td>${this._escape(row.preview || '')}</td><td><input type="checkbox" data-action="tr-rt-default" data-id="${this._escape(row.id)}"${row.action === 'default' ? ' checked' : ''}></td><td><input type="checkbox" data-action="tr-rt-skip" data-id="${this._escape(row.id)}"${row.action === 'skip' ? ' checked' : ''}></td></tr>`;
    }

    async _removeTagBuild() {
        const st = this._tagState;
        const normalizedTag = this.cleanTag(st.removeTagTag || st.oldTag);
        if (!normalizedTag) { this._setStatus('Remove tag: enter a tag to remove.'); return; }
        st.removeTagTag = normalizedTag;
        const opts = this._tagScanOpts();
        const caseSens = !!st.caseSensitive;
        const rows = [];
        let rowId = 0;
        const seen = new Set();
        const pushRow = (row) => {
            const key = `${row.recordGuid}|${row.hitKind}|${row.lineItemIndex}|${row.segmentIndex}|${row.textOccurrenceIndex ?? ''}|${row.propertyName || ''}|${row.propertyValueIndex ?? ''}`;
            if (seen.has(key)) return;
            seen.add(key);
            rows.push(row);
        };
        await this.forEachScannableRecord(opts, async (record) => {
            const recordGuid = record?.guid || '';
            const recordName = record.getName?.() || '(untitled)';
            const lineItems = await record.getLineItems(true);
            const previewLines = [];
            for (const item of (lineItems || [])) {
                const segs = item?.segments;
                if (!Array.isArray(segs)) continue;
                const txt = segs.map(s => this.segmentTextAsString(s)).join('').trim();
                if (!txt) continue;
                previewLines.push(txt);
                if (previewLines.length >= 2) break;
            }
            const preview = previewLines.join('\n').slice(0, 256);
            for (let liIdx = 0; liIdx < (lineItems || []).length; liIdx += 1) {
                const item = lineItems[liIdx];
                const segs = item?.segments;
                if (!Array.isArray(segs)) continue;
                for (let i = 0; i < segs.length; i += 1) {
                    const seg = segs[i];
                    const segText = this.segmentTextAsString(seg);
                    if (!segText) continue;
                    if (seg?.type === THYMER_TYPE_HASHTAG && this._isTagMatch(segText, normalizedTag, caseSens)) {
                        pushRow({
                            id: `rt-${rowId++}`,
                            action: 'default',
                            recordGuid,
                            recordName,
                            source: 'body-hashtag-segment',
                            preview,
                            hitKind: 'body-hashtag-seg',
                            lineItemIndex: liIdx,
                            segmentIndex: i,
                            textOccurrenceIndex: null,
                            propertyName: '',
                            propertyValueIndex: null,
                        });
                    } else if (seg?.type === 'text') {
                        const re = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}][\p{L}\p{N}_./-]*)(?![\p{L}\p{N}_])/gu;
                        let occ = 0;
                        let m;
                        while ((m = re.exec(segText)) !== null) {
                            const token = this.cleanTag(m[2] ?? '');
                            if (!token || !this._isTagMatch(token, normalizedTag, caseSens)) continue;
                            pushRow({
                                id: `rt-${rowId++}`,
                                action: 'default',
                                recordGuid,
                                recordName,
                                source: 'body-plaintext-token',
                                preview,
                                hitKind: 'body-text-token',
                                lineItemIndex: liIdx,
                                segmentIndex: i,
                                textOccurrenceIndex: occ,
                                propertyName: '',
                                propertyValueIndex: null,
                            });
                            occ += 1;
                        }
                    }
                }
            }
            const properties = record.getAllProperties?.() || [];
            for (const prop of properties) {
                if (!this.shouldScanTextPropertyForTags(prop)) continue;
                if (this._shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, opts)) continue;
                const propertyName = String(prop?.name ?? '');
                const texts = prop.texts?.() || [];
                for (let vi = 0; vi < texts.length; vi += 1) {
                    const v = String(texts[vi] ?? '');
                    if (!this._isTagMatch(v, normalizedTag, caseSens)) continue;
                    pushRow({
                        id: `rt-${rowId++}`,
                        action: 'default',
                        recordGuid,
                        recordName,
                        source: `property-text:${propertyName}`,
                        preview,
                        hitKind: 'property-text',
                        lineItemIndex: -1,
                        segmentIndex: -1,
                        textOccurrenceIndex: null,
                        propertyName,
                        propertyValueIndex: vi,
                    });
                }
            }
        });
        st.removeTagRows = this._collapseRemoveTagRowsByRecord(rows);
        const gridRows = this._removeTagRowsForDisplay();
        st.removeTagMeta = st.removeTagRows.length ? this._removeTagMetaSummary(gridRows) : 'No queue built.';
        st.removeTagOutput = '';
        this._setStatus(st.removeTagMeta, { title: 'Remove tag' });
    }

    /** Human-readable placement for apply / review log (matches queue `source`). */
    _removeTagPlacementLabel(source) {
        const s = String(source || '').trim();
        if (!s) return 'remove hits';
        if (/^\d+ location\(s\)$/.test(s)) return s;
        if (s.startsWith('property-text:')) return `hashtag property text (${s.slice('property-text:'.length)})`;
        if (s === 'body-hashtag-segment') return 'body (hashtag segment)';
        if (s === 'body-plaintext-token') return 'body (# in plain text)';
        return s;
    }

    _removeTagPreview() {
        const st = this._tagState;
        const rows = st.removeTagRows || [];
        if (!rows.length) {
            st.removeTagOutput = 'Remove tag preview: build a queue first (Find matches).';
            this._logRow('remove-tag', 'preview', { recordGuid: '', recordName: '' }, st.removeTagOutput);
            this._setStatus(st.removeTagOutput, { title: 'Remove tag', logged: true });
            return;
        }
        const toRemove = rows.filter(r => r.action === 'default').length;
        const skipped = rows.filter(r => r.action === 'skip').length;
        st.removeTagOutput = [
            'Remove tag — preview (no writes)',
            `Tag: #${this.cleanTag(st.removeTagTag || '')}`,
            `Queue rows: ${rows.length}`,
            `Marked remove: ${toRemove}`,
            `Marked skip: ${skipped}`,
        ].join('\n');
        this._logRow('remove-tag', 'preview', { recordGuid: '', recordName: '' }, st.removeTagOutput);
        this._setStatus(st.removeTagOutput, { title: 'Remove tag', logged: true });
    }

    _adjustRemoveTagLineIndices(pendingBodyHits, deletedLineIndex) {
        for (const h of pendingBodyHits) {
            if (typeof h.lineItemIndex !== 'number') continue;
            if (h.lineItemIndex > deletedLineIndex) h.lineItemIndex -= 1;
        }
    }

    /**
     * Applies remove-tag hits for one record. Returns whether any persisted write occurred
     * (so summaries stay accurate when some queue rows are skipped).
     */
    async _applyRemoveTagHitsOnRecord(record, hits, tag, caseSensitive) {
        let anyWrite = false;
        const tagClean = this.cleanTag(tag);
        const body = hits.filter(h => h.hitKind === 'body-hashtag-seg' || h.hitKind === 'body-text-token').map(h => ({ ...h }));
        const propHits = hits.filter(h => h.hitKind === 'property-text').map(h => ({ ...h }));
        body.sort((a, b) => {
            if (b.lineItemIndex !== a.lineItemIndex) return b.lineItemIndex - a.lineItemIndex;
            if (b.segmentIndex !== a.segmentIndex) return b.segmentIndex - a.segmentIndex;
            return (b.textOccurrenceIndex ?? 0) - (a.textOccurrenceIndex ?? 0);
        });
        for (const hit of body) {
            const lineItems = await record.getLineItems(true);
            const liIdx = hit.lineItemIndex;
            if (liIdx < 0 || liIdx >= lineItems.length) continue;
            const item = lineItems[liIdx];
            if (!item) continue;
            const segments = item.segments;
            if (!Array.isArray(segments)) continue;
            if (hit.hitKind === 'body-hashtag-seg') {
                const si = hit.segmentIndex;
                const seg = segments[si];
                if (!seg || seg.type !== THYMER_TYPE_HASHTAG) continue;
                const segText = this.segmentTextAsString(seg);
                if (!this._isTagMatch(segText, tagClean, caseSensitive)) continue;
                let next = this._cloneLineItemSegments(segments);
                next.splice(si, 1);
                next = this._pruneEmptyTextSegments(this._mergeAdjacentTextSegments(next));
                if (this._lineItemSegmentsDisplayEmpty(next)) {
                    if (typeof item.delete === 'function') {
                        await item.delete();
                        anyWrite = true;
                        this._adjustRemoveTagLineIndices(body, liIdx);
                    }
                } else if (typeof item.setSegments === 'function') {
                    await item.setSegments(next);
                    anyWrite = true;
                } else {
                    item.segments = next;
                    anyWrite = true;
                }
                continue;
            }
            if (hit.hitKind === 'body-text-token') {
                const si = hit.segmentIndex;
                const seg = segments[si];
                if (!seg || seg.type !== 'text') continue;
                const rawText = this.segmentTextAsString(seg);
                const occ = hit.textOccurrenceIndex ?? 0;
                const { changed, text: nextSegText } = this._removeNthHashtagTokenFromText(rawText, tagClean, caseSensitive, occ);
                if (!changed) continue;
                let next = this._cloneLineItemSegments(segments);
                next[si] = { ...next[si], text: nextSegText };
                next = this._pruneEmptyTextSegments(this._mergeAdjacentTextSegments(next));
                if (this._lineItemSegmentsDisplayEmpty(next)) {
                    if (typeof item.delete === 'function') {
                        await item.delete();
                        anyWrite = true;
                        this._adjustRemoveTagLineIndices(body, liIdx);
                    }
                } else if (typeof item.setSegments === 'function') {
                    await item.setSegments(next);
                    anyWrite = true;
                } else {
                    item.segments = next;
                    anyWrite = true;
                }
            }
        }
        propHits.sort((a, b) => (b.propertyValueIndex ?? 0) - (a.propertyValueIndex ?? 0));
        const properties = record.getAllProperties?.() || [];
        const opts = this._tagScanOpts();
        for (const hit of propHits) {
            const pname = hit.propertyName;
            const vi = hit.propertyValueIndex;
            const prop = properties.find(p => String(p?.name ?? '') === pname);
            if (!prop || !this.shouldScanTextPropertyForTags(prop)) continue;
            if (this._shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, opts)) continue;
            const texts = prop.texts?.();
            if (!Array.isArray(texts) || vi == null || vi < 0 || vi >= texts.length) continue;
            const v = String(texts[vi] ?? '');
            if (!this._isTagMatch(v, tagClean, caseSensitive)) continue;
            const nextTexts = texts.filter((_, i) => i !== vi);
            if (typeof prop.set !== 'function') continue;
            prop.set(nextTexts);
            anyWrite = true;
        }
        return anyWrite;
    }

    async _removeTagApply() {
        const st = this._tagState;
        const tag = this.cleanTag(st.removeTagTag || '');
        const rows = Array.isArray(st.removeTagRows) ? st.removeTagRows : [];
        const rowsToApply = rows.filter(r => r.action !== 'skip');
        if (!tag) {
            st.removeTagOutput = 'Remove tag apply: no tag set.';
            this._logRow('remove-tag', 'summary', { recordGuid: '', recordName: '' }, st.removeTagOutput);
            this._setStatus(st.removeTagOutput, { title: 'Remove tag', logged: true });
            if (this._panel) this._render(this._panel);
            return;
        }
        if (!rowsToApply.length) {
            st.removeTagOutput = 'Remove tag apply: no rows marked for removal (all skipped or empty queue).';
            this._logRow('remove-tag', 'summary', { recordGuid: '', recordName: '' }, st.removeTagOutput);
            this._setStatus(st.removeTagOutput, { title: 'Remove tag', logged: true });
            if (this._panel) this._render(this._panel);
            return;
        }
        st.running = true;
        if (this._panel) this._render(this._panel);
        const byRecord = new Map();
        const metaByGuid = new Map();
        for (const row of rowsToApply) {
            const g = row.recordGuid || '';
            if (!g) continue;
            if (!byRecord.has(g)) byRecord.set(g, []);
            if (!metaByGuid.has(g)) {
                metaByGuid.set(g, {
                    recordName: row.recordName || '',
                    placement: this._removeTagPlacementLabel(row.source),
                });
            }
            const parts = row.hitKind === 'merged' && Array.isArray(row.subHits)
                ? row.subHits
                : [{
                    hitKind: row.hitKind,
                    lineItemIndex: row.lineItemIndex,
                    segmentIndex: row.segmentIndex,
                    textOccurrenceIndex: row.textOccurrenceIndex,
                    propertyName: row.propertyName,
                    propertyValueIndex: row.propertyValueIndex,
                }];
            for (const h of parts) byRecord.get(g).push(h);
        }
        const opts = this._tagScanOpts();
        let recordsWritten = 0;
        let failed = 0;
        let applyAttempts = 0;
        let noWrite = 0;
        const writtenLines = [];
        try {
            await this.forEachScannableRecord(opts, async (record) => {
                const guid = record?.guid || '';
                if (!byRecord.has(guid)) return;
                const meta = metaByGuid.get(guid) || { recordName: '', placement: '' };
                const recordNameLive = record.getName?.() || meta.recordName || '(untitled)';
                const placement = meta.placement || 'remove hits';
                applyAttempts += 1;
                try {
                    const written = await this._applyRemoveTagHitsOnRecord(record, byRecord.get(guid), tag, st.caseSensitive);
                    if (written) {
                        recordsWritten += 1;
                        writtenLines.push(`• ${recordNameLive} — ${placement} [${guid}]`);
                        this._logRow('remove-tag', 'applied', {
                            recordGuid: guid,
                            recordName: recordNameLive,
                        }, `Removed #${tag} — ${placement}`);
                    } else {
                        noWrite += 1;
                    }
                } catch (e) {
                    failed += 1;
                    this._logRow('remove-tag', 'failed', {
                        recordGuid: guid,
                        recordName: recordNameLive,
                    }, String(e?.message || e));
                }
            });
            const runAt = new Date().toLocaleString();
            const maxList = 120;
            const listBody = writtenLines.length
                ? [
                    '',
                    `Updated records (${writtenLines.length}):`,
                    ...writtenLines.slice(0, maxList),
                    writtenLines.length > maxList ? `… and ${writtenLines.length - maxList} more (each write is also a row in Review log).` : '',
                ].filter(Boolean)
                : [];
            st.removeTagOutput = [
                'Remove tag — apply complete',
                `Run timestamp: ${runAt}`,
                `Tag removed: #${tag}`,
                `Records marked Remove (unique): ${byRecord.size}`,
                `Apply attempts (records reached): ${applyAttempts}`,
                `Records modified (writes applied): ${recordsWritten}`,
                `No write at apply (e.g. tag already gone, hits no longer matched): ${noWrite}`,
                `Errors: ${failed}`,
                ...listBody,
            ].join('\n');
            this._clearRemoveTagQueue();
            st.removeTagTag = '';
            this._clearAddTagQueue();
            this._resetReviewGridWorkflow();
            await this._refreshTagIndex({ quiet: true });
            this._logRow('remove-tag', 'summary', { recordGuid: '', recordName: '' }, st.removeTagOutput);
            this._setStatus(st.removeTagOutput, { title: 'Remove tag', logged: true });
        } finally {
            st.running = false;
        }
    }

    _tagScanOpts() {
        return {
            excludeChoiceValues: !!this._tagState.excludeChoiceValues,
            excludedCollections: this._parseExcludedCollections(this._tagState.excludedCollectionsRaw),
        };
    }

    async getScannableCollections(scanOpts) {
        const opts = scanOpts && typeof scanOpts === 'object' ? scanOpts : {};
        const collections = (await this.plugin.data.getAllCollections?.()) || [];
        const userCollections = collections.filter(c => this.isUserCollection(c));
        const included = userCollections.filter(c => !this.shouldExcludeCollection(c, opts));
        const excludedCount = userCollections.length - included.length;
        if (userCollections.length > 0 && included.length === 0 && excludedCount > 0) {
            return { collections: userCollections, excludedCount: 0, warning: '(Exclusion matched all collections; ignored)' };
        }
        return { collections: included, excludedCount, warning: '' };
    }

    isUserCollection(collection) {
        if (!collection) return false;
        if (collection.isJournalPlugin?.()) return false;
        const name = (collection.getName?.() ?? '').trim();
        if (!name) return false;
        if (/^\d+$/.test(name)) return false;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(name)) return false;
        if (/^[0-9a-f]{24,}$/i.test(name)) return false;
        if (/^(unknown|null|undefined)$/i.test(name)) return false;
        return true;
    }

    shouldExcludeCollection(collection, opts) {
        const list = Array.isArray(opts.excludedCollections) ? opts.excludedCollections : [];
        if (!list.length) return false;
        const name = (collection.getName?.() || '').toLowerCase();
        const guid = collection.getGuid?.() || '';
        // Cache lowercased token list per options object so a many-collection scan doesn't re-lowercase per check.
        let lowered = opts.__excludedCollectionsLower;
        if (!Array.isArray(lowered) || lowered.length !== list.length) {
            lowered = list.map(v => String(v || '').toLowerCase());
            try { opts.__excludedCollectionsLower = lowered; } catch (_) {}
        }
        for (let i = 0; i < list.length; i++) {
            if (lowered[i] === name) return true;
            if (list[i] === guid) return true;
        }
        return false;
    }

    async forEachScannableRecord(scanOpts, onRecord, preResolvedCollections) {
        const opts = scanOpts && typeof scanOpts === 'object' ? scanOpts : {};
        const collections = Array.isArray(preResolvedCollections) ? preResolvedCollections : (await this.getScannableCollections(opts)).collections;
        let recordCount = 0;
        for (const collection of collections) {
            const records = (await collection.getAllRecords?.()) || [];
            recordCount += records.length;
            for (const record of records) await onRecord(record, collection);
        }
        return { recordCount };
    }

    /**
     * Single walk over `record.getLineItems(true)` + `record.getAllProperties()` returning both
     * `withChoice` and `withoutChoice` tag sets. Used by `_refreshTagIndex` to avoid scanning each
     * record twice (once per `excludeChoiceValues` setting).
     */
    async collectTagsFromRecordWithChoiceVariants(record) {
        const withChoice = new Set();
        const withoutChoice = new Set();
        const lineItems = await record.getLineItems(true);
        for (const item of lineItems) {
            const segments = item?.segments;
            if (!Array.isArray(segments)) continue;
            for (const seg of segments) {
                if (seg?.type === THYMER_TYPE_HASHTAG) {
                    const tag = this.cleanTag(this.segmentTextAsString(seg));
                    if (this.isUsableTagCandidate(tag)) {
                        withChoice.add(tag);
                        withoutChoice.add(tag);
                    }
                    continue;
                }
                const segText = this.segmentTextAsString(seg);
                if (seg?.type === 'text' && segText) {
                    for (const t of this.extractHashtagTokensFromText(segText)) {
                        if (!this.isUsableTagCandidate(t)) continue;
                        withChoice.add(t);
                        withoutChoice.add(t);
                    }
                }
            }
        }
        const properties = record.getAllProperties?.() || [];
        for (const prop of properties) {
            try {
                const choicesList = typeof prop.choices === 'function' ? prop.choices() : null;
                const hasArrayChoices = Array.isArray(choicesList);
                if (!hasArrayChoices) {
                    const labels = prop.selectedChoiceLabels?.() ?? [];
                    const ids = prop.selectedChoices?.() ?? [];
                    const n = Math.max(labels.length, ids.length);
                    for (let i = 0; i < n; i++) {
                        const labelTag = this.tagCandidateFromPropertyValue(labels[i] ?? '');
                        const idTag = this.tagCandidateFromPropertyValue(ids[i] != null ? String(ids[i]) : '');
                        if (labelTag) withChoice.add(labelTag);
                        if (idTag && this.matchKey(idTag, false) !== this.matchKey(labelTag || '', false)) withChoice.add(idTag);
                    }
                } else {
                    const labels = prop.selectedChoiceLabels?.() ?? [];
                    const ids = prop.selectedChoices?.() ?? [];
                    const n = Math.max(labels.length, ids.length);
                    for (let i = 0; i < n; i++) {
                        const labelTag = this.tagCandidateFromPropertyValue(labels[i] ?? '');
                        const idTag = this.tagCandidateFromPropertyValue(ids[i] != null ? String(ids[i]) : '');
                        if (labelTag) withChoice.add(labelTag);
                        if (idTag && this.matchKey(idTag, false) !== this.matchKey(labelTag || '', false)) withChoice.add(idTag);
                    }
                }
                if (!this.shouldScanTextPropertyForTags(prop)) continue;
                const labelEnumSuppressed = this._shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, { excludeChoiceValues: true });
                for (const value of (prop.texts?.() || [])) {
                    const tag = this.tagCandidateFromPropertyValue(value);
                    if (!tag) continue;
                    withChoice.add(tag);
                    if (!hasArrayChoices && !labelEnumSuppressed) withoutChoice.add(tag);
                }
                const rawValues = prop.values?.();
                if (Array.isArray(rawValues)) {
                    for (const value of rawValues) {
                        if (typeof value !== 'string') continue;
                        const tag = this.tagCandidateFromPropertyValue(value);
                        if (!tag) continue;
                        withChoice.add(tag);
                        if (!hasArrayChoices && !labelEnumSuppressed) withoutChoice.add(tag);
                    }
                }
            } catch (_) {}
        }
        return { withChoice, withoutChoice };
    }

    async collectTagsFromRecord(record, scanOpts) {
        const opts = scanOpts && typeof scanOpts === 'object' ? scanOpts : {};
        const tags = new Set();
        const lineItems = await record.getLineItems(true);
        for (const item of lineItems) {
            const segments = item?.segments;
            if (!Array.isArray(segments)) continue;
            for (const seg of segments) {
                if (seg?.type === THYMER_TYPE_HASHTAG) {
                    const tag = this.cleanTag(this.segmentTextAsString(seg));
                    if (this.isUsableTagCandidate(tag)) tags.add(tag);
                    continue;
                }
                const segText = this.segmentTextAsString(seg);
                if (seg?.type === 'text' && segText) {
                    for (const t of this.extractHashtagTokensFromText(segText)) {
                        if (this.isUsableTagCandidate(t)) tags.add(t);
                    }
                }
            }
        }
        const properties = record.getAllProperties?.() || [];
        for (const prop of properties) {
            try {
                const choicesList = typeof prop.choices === 'function' ? prop.choices() : null;
                const hasArrayChoices = Array.isArray(choicesList);
                if (opts.excludeChoiceValues && hasArrayChoices) continue;
                if (!opts.excludeChoiceValues) {
                    const labels = prop.selectedChoiceLabels?.() ?? [];
                    const ids = prop.selectedChoices?.() ?? [];
                    const n = Math.max(labels.length, ids.length);
                    for (let i = 0; i < n; i++) {
                        const labelTag = this.tagCandidateFromPropertyValue(labels[i] ?? '');
                        const idTag = this.tagCandidateFromPropertyValue(ids[i] != null ? String(ids[i]) : '');
                        if (labelTag) tags.add(labelTag);
                        if (idTag && this.matchKey(idTag, false) !== this.matchKey(labelTag || '', false)) tags.add(idTag);
                    }
                }
                if (!this.shouldScanTextPropertyForTags(prop)) continue;
                if (this._shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, opts)) continue;
                for (const value of (prop.texts?.() || [])) {
                    const tag = this.tagCandidateFromPropertyValue(value);
                    if (tag) tags.add(tag);
                }
                const rawValues = prop.values?.();
                if (Array.isArray(rawValues)) {
                    for (const value of rawValues) {
                        if (typeof value !== 'string') continue;
                        const tag = this.tagCandidateFromPropertyValue(value);
                        if (tag) tags.add(tag);
                    }
                }
            } catch (_) {}
        }
        return tags;
    }

    /** Same notion of “choice field” as the original tag index: `choices()` returns an array. */
    _hasArrayChoicesProperty(prop) {
        if (!prop) return false;
        const choicesList = typeof prop.choices === 'function' ? prop.choices() : null;
        return Array.isArray(choicesList);
    }

    /**
     * When excluding choice/enum from the tag list, Thymer “Label” enums may still match
     * `shouldScanTextPropertyForTags` and leak values via `texts()` / `values()` even though
     * `choices()` is not an array. Suppress only that case — do not use selection APIs alone
     * (many property types expose them), or the index shrinks drastically vs the original.
     */
    _shouldSuppressTextLikeTagsFromExcludedLabelEnum(prop, opts) {
        if (!opts || !opts.excludeChoiceValues) return false;
        if (this._hasArrayChoicesProperty(prop)) return false;
        const name = String(prop?.name ?? '').toLowerCase().trim();
        if (!name.includes('label') || name.includes('email')) return false;
        return typeof prop.selectedChoiceLabels === 'function' || typeof prop.selectedChoices === 'function';
    }

    shouldScanTextPropertyForTags(prop) {
        if (this._isPropertyTypeHashtag(prop)) return true;
        if (this._isTagsColumnName(prop)) return true;
        const name = String(prop?.name ?? '').toLowerCase().trim();
        if (!name) return false;
        if (name.includes('tag') || name.includes('hashtag')) return true;
        if (name.includes('label') && !name.includes('email')) return true;
        return false;
    }

    tagCandidateFromPropertyValue(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('#')) return this.cleanTag(trimmed);
        if (trimmed.length > 80) return '';
        if (/\s{2,}/.test(trimmed) || /[.!?]/.test(trimmed)) return '';
        const candidate = this.cleanTag(trimmed);
        return this.isUsableTagCandidate(candidate) ? candidate : '';
    }

    isUsableTagCandidate(tag) {
        if (typeof tag !== 'string') return false;
        const t = tag.trim();
        if (!t) return false;
        if (!/[\p{L}\p{N}]/u.test(t)) return false;
        const lower = t.toLowerCase();
        if (lower === '[object object]') return false;
        if (/^\[object\s+[^\]]+\]$/i.test(t)) return false;
        if (lower === 'object object') return false;
        if (['unknown', 'undefined', 'null', 'nan'].includes(lower)) return false;
        if (/^\d+$/.test(t)) return false;
        if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(t)) return false;
        if (/^[0-9a-f]{24,}$/i.test(t)) return false;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) return false;
        if (/^[A-Z0-9]{12,}$/.test(t) && /[A-Z]/.test(t) && /\d/.test(t)) return false;
        if (/^[A-Za-z0-9]{16,}$/.test(t) && !/[-_]/.test(t) && /\d/.test(t)) return false;
        return true;
    }

    cleanTag(tag) {
        let t = String(tag ?? '').trim();
        if (!t) return '';
        if (t.startsWith('#')) t = t.slice(1);
        return t.trim();
    }

    matchKey(tag, caseSensitive) {
        const t = this.cleanTag(tag);
        return caseSensitive ? t : t.toLowerCase();
    }

    segmentTextAsString(seg) {
        if (!seg) return '';
        if (typeof seg.text === 'string') return seg.text;
        if (typeof seg.value === 'string') return seg.value;
        return '';
    }

    extractHashtagTokensFromText(text) {
        if (typeof text !== 'string' || !text) return [];
        const out = [];
        const scanText = this.stripMarkdownCodeBlocksAndSpans(text);
        // Match original plugin behavior: boundary-aware, unicode-friendly tags.
        const re = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}][\p{L}\p{N}_./-]*)/gu;
        let m;
        while ((m = re.exec(scanText)) !== null) {
            const raw = m[2] ?? '';
            const clean = this.cleanTag(raw);
            if (clean) out.push(clean);
        }
        return out;
    }

    stripMarkdownCodeBlocksAndSpans(text) {
        if (typeof text !== 'string' || !text) return '';
        const noFenced = text.replace(/```[\s\S]*?```/g, ' ').replace(/~~~[\s\S]*?~~~/g, ' ');
        const noInlineCode = noFenced.replace(/`[^`\n]*`/g, ' ');
        const noMdLinks = noInlineCode.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, ' $1 ').replace(/\[([^\]]*)\]\(([^)]*)\)/g, ' $1 ');
        const noUrls = noMdLinks.replace(/\bhttps?:\/\/[^\s)>]+/gi, ' ');
        const noWww = noUrls.replace(/\bwww\.[^\s)>]+/gi, ' ');
        const noHeaders = noWww.replace(/^\s{0,3}#{1,6}\s+/gm, ' ');
        return noHeaders;
    }

    isSourceTagPatternMatch(candidateTag, sourcePattern, caseSensitive) {
        return this.matchKey(candidateTag, caseSensitive) === this.matchKey(sourcePattern, caseSensitive);
    }

    replaceHashtagTokensInText(text, oldTag, newTag, caseSensitive) {
        if (typeof text !== 'string' || !text) return text;
        const oldClean = this.cleanTag(oldTag);
        const newClean = this.cleanTag(newTag);
        if (!oldClean || !newClean) return text;
        const escaped = oldClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'gu' : 'giu';
        // Match standalone hashtag tokens and avoid partial replacements.
        const re = new RegExp(`(^|[^\\p{L}\\p{N}_])#${escaped}(?![\\p{L}\\p{N}_])`, flags);
        return text.replace(re, (match, prefix) => `${prefix}#${newClean}`);
    }

    _replaceHashtagTokensInTextDetailed(text, oldTag, newTag, caseSensitive) {
        if (typeof text !== 'string' || !text) return { changed: false, text, replacements: 0 };
        const oldClean = this.cleanTag(oldTag);
        const newClean = this.cleanTag(newTag);
        if (!oldClean || !newClean) return { changed: false, text, replacements: 0 };
        const escaped = oldClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'gu' : 'giu';
        const re = new RegExp(`(^|[^\\p{L}\\p{N}_])#${escaped}(?![\\p{L}\\p{N}_])`, flags);
        let replacements = 0;
        const nextText = text.replace(re, (match, prefix) => {
            replacements += 1;
            return `${prefix}#${newClean}`;
        });
        return { changed: replacements > 0, text: nextText, replacements };
    }

    _normalizeInteriorWhitespace(text) {
        if (typeof text !== 'string' || !text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Remove the n-th (0-based) standalone `#tag` token in `text` using the same boundary rules as rename.
     * Collapses runs of whitespace afterward.
     */
    _removeNthHashtagTokenFromText(text, tag, caseSensitive, occurrenceIndex) {
        if (typeof text !== 'string' || !text) return { changed: false, text };
        const oldClean = this.cleanTag(tag);
        if (!oldClean) return { changed: false, text };
        const escaped = oldClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'gu' : 'giu';
        const re = new RegExp(`(^|[^\\p{L}\\p{N}_])#${escaped}(?![\\p{L}\\p{N}_])`, flags);
        let i = 0;
        const nextText = text.replace(re, (match, prefix) => {
            if (i++ !== occurrenceIndex) return match;
            return prefix;
        });
        const normalized = this._normalizeInteriorWhitespace(nextText);
        return { changed: nextText !== text || normalized !== text, text: normalized };
    }

    _cloneLineItemSegments(segments) {
        if (!Array.isArray(segments)) return [];
        return segments.map(s => (s && typeof s === 'object' ? { ...s } : s));
    }

    _mergeAdjacentTextSegments(segments) {
        const out = [];
        for (const seg of segments || []) {
            if (!seg) continue;
            const prev = out[out.length - 1];
            if (seg.type === 'text' && prev?.type === 'text') {
                const a = this.segmentTextAsString(prev);
                const b = this.segmentTextAsString(seg);
                prev.text = this._normalizeInteriorWhitespace(`${a} ${b}`);
                if ('value' in prev) delete prev.value;
                continue;
            }
            out.push({ ...seg });
        }
        return out;
    }

    _lineItemSegmentsDisplayEmpty(segments) {
        const joined = (segments || []).map(s => this.segmentTextAsString(s)).join('');
        return !this._normalizeInteriorWhitespace(joined);
    }

    _pruneEmptyTextSegments(segments) {
        const next = [];
        for (const seg of segments || []) {
            if (!seg) continue;
            if (seg.type === 'text') {
                const t = this._normalizeInteriorWhitespace(this.segmentTextAsString(seg));
                if (!t) continue;
                next.push({ ...seg, text: t });
                continue;
            }
            next.push({ ...seg });
        }
        return this._mergeAdjacentTextSegments(next);
    }

    _tagSuggestionsForRemoveTagList() {
        const choiceOnly = this._tagState.tagChoiceOnlyTags instanceof Set ? this._tagState.tagChoiceOnlyTags : new Set();
        const list = Array.isArray(this._tagState.tagIndex) ? this._tagState.tagIndex : [];
        return list.filter(t => t && !choiceOnly.has(String(t.tag || '').trim()));
    }

    _segmentsToText(segments) {
        return (segments || []).map(s => typeof s.text === 'string' ? s.text : (s.text?.title || '')).join('').slice(0, 120);
    }

    _parseExcludedCollections(raw) {
        return String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    _tagSuggestions() {
        const q = this.cleanTag(this._tagState.oldTag).toLowerCase();
        return this._tagSuggestionsForValue(q);
    }

    /**
     * Tags for the incremental dropdown (Current tag on tag rename / tag review, etc.).
     * Uses `tagIndex` from the last refresh; empty query = first slice of that sorted list.
     * With a query: prefix matches first, then **A–Z** (`_compareTagNamesForSort`), then usage count.
     */
    _tagSuggestionsForValue(rawValue) {
        const q = this.cleanTag(rawValue).toLowerCase();
        const list = Array.isArray(this._tagState.tagIndex) ? this._tagState.tagIndex : [];
        if (!q) return list.slice(0, 20);
        const starts = [];
        const contains = [];
        for (const t of list) {
            const tag = String(t?.tag || '');
            const lower = tag.toLowerCase();
            if (!lower.includes(q)) continue;
            if (lower.startsWith(q)) starts.push(t);
            else contains.push(t);
        }
        const byNameThenCount = (a, b) => {
            const byName = this._compareTagNamesForSort(a.tag, b.tag);
            if (byName !== 0) return byName;
            return (Number(b.count) || 0) - (Number(a.count) || 0);
        };
        starts.sort(byNameThenCount);
        if (starts.length >= 20) return starts.slice(0, 20);
        contains.sort(byNameThenCount);
        return starts.concat(contains).slice(0, 20);
    }

    _logRow(operation, status, row, detail) {
        this._lastLoggedDetail = String(detail || '');
        this._activityLog.push({
            time: new Date().toISOString(),
            operation,
            status,
            recordGuid: row?.recordGuid || '',
            recordName: row?.recordName || '',
            detail: detail || '',
        });
    }

    _exportLogJSON() {
        const payload = { generatedAt: new Date().toISOString(), settings: this._settings, entries: this._activityLog };
        try {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const d = new Date();
            const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
            a.download = `notes-manager-log-${ts}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            this._toast('Review log', 'Log file saved.', 2500);
        } catch (e) {
            this._setStatus(`Failed to save log file: ${String(e?.message || e)}`, { title: 'Review log' });
        }
    }

    _normalizeTag(v) {
        const raw = String(v || '').trim();
        return raw.startsWith('#') ? raw.slice(1) : raw;
    }

    _tagMatchKey(tag, caseSensitive) {
        const t = this._normalizeTag(tag);
        return caseSensitive ? t : t.toLowerCase();
    }

    _escape(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    _toast(title, message, autoDestroyTime = 4000) {
        try { this.plugin.ui.addToaster?.({ title, message, dismissible: true, autoDestroyTime }); } catch (_) {}
    }

    _setStatus(message, options = {}) {
        const msg = String(message || '');
        this._status = msg;
        if (!msg) return;
        const opts = options && typeof options === 'object' ? options : {};
        const title = opts.title || 'Notes Manager';
        const autoDestroyTime = Number.isFinite(opts.autoDestroyTime) ? opts.autoDestroyTime : 4000;
        const logged = opts.logged === true || msg === this._lastLoggedDetail;
        if (!logged) this._toast(title, msg, autoDestroyTime);
    }

    _bulkCollectionByGuid(guid) {
        return this._bulkMoveState.collections.find(c => c.guid === guid) || null;
    }

    async _ensureBulkMoveLoaded() {
        const st = this._bulkMoveState;
        if (st.initialized) return;
        const collections = (await this.plugin.data.getAllCollections?.()) || [];
        st.collections = collections.filter(c => !c.isJournalPlugin?.()).map(c => ({ guid: c.getGuid?.(), name: c.getName?.() || 'Untitled Collection', raw: c })).filter(c => !!c.guid);
        if (st.collections.length >= 2) {
            st.sourceGuid = st.collections[0].guid;
            st.targetGuid = st.collections[1].guid;
            st.onlySelected = !!this._settings.bulkOnlySelectedDefault;
            await this._loadBulkMoveRecords();
            st.initialized = true;
            return;
        }
        st.initialized = true;
        this._setStatus('You need at least two non-journal collections to use bulk move.');
    }

    async _loadBulkMoveRecords() {
        const st = this._bulkMoveState;
        const source = this._bulkCollectionByGuid(st.sourceGuid);
        if (!source) { st.records = []; st.filtered = []; st.selectedGuids.clear(); return; }
        st.loading = true;
        st.selectedGuids.clear();
        try {
            const recs = (await source.raw.getAllRecords?.()) || [];
            st.records = recs.map(r => ({ guid: r.guid, name: r.getName?.() || 'Untitled', raw: r })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            st.records = [];
            this._setStatus(`Error loading records: ${String(e?.message || e)}`);
        } finally {
            st.loading = false;
            this._applyBulkMoveFilter();
        }
    }

    _applyBulkMoveFilter() {
        const st = this._bulkMoveState;
        const q = (st.filterText || '').trim().toLowerCase();
        st.filtered = st.records.filter(r => (!q || r.name.toLowerCase().includes(q)) && (!st.onlySelected || st.selectedGuids.has(r.guid)));
    }

    async _resetBulkMoveForm() {
        const st = this._bulkMoveState;
        st.filterText = '';
        st.onlySelected = !!this._settings.bulkOnlySelectedDefault;
        st.selectedGuids.clear();
        st.previewRows = [];
        if (st.collections.length >= 2) {
            st.sourceGuid = st.collections[0].guid;
            st.targetGuid = st.collections[1].guid;
            await this._loadBulkMoveRecords();
        }
    }

    async _ensureAssignLoaded() {
        const st = this._assignState;
        if (st.initialized) return;
        st.loading = true;
        try {
            const all = await this._reloadAssignIndex(false);
            st.hideChildOfRows = !!this._settings.assignHideChildOfDefault;
            if (!all.length) this._setStatus('No collections with Sub-pages enabled.');
            st.initialized = true;
        } finally {
            st.loading = false;
        }
    }

    async _reloadAssignIndex(preserveParentSelection = true) {
        const st = this._assignState;
        const prevParentGuid = st.parentGuid;
        const collections = (await this.plugin.data.getAllCollections?.()) || [];
        const allRecords = [];
        for (const collection of collections) {
            try {
                if (typeof collection.hasSubPages === 'function' && !collection.hasSubPages()) continue;
                const records = (await collection.getAllRecords?.()) || [];
                const collectionGuid = collection.getGuid?.();
                const collectionName = collection.getName?.() || '';
                for (const record of records) {
                    const title = record.getName?.() || '(untitled)';
                    const fullTitle = `${collectionName} / ${title}`;
                    allRecords.push({ guid: record.guid, title, fullTitle, fullTitleLower: fullTitle.toLowerCase(), collectionGuid, collectionName, record });
                }
            } catch (_) {}
        }
        allRecords.sort((a, b) => (a.collectionName || '').localeCompare(b.collectionName || '') || a.title.localeCompare(b.title));
        st.allRecords = allRecords;
        st.recordMap = new Map(allRecords.map(r => [r.guid, r]));
        if (preserveParentSelection && prevParentGuid && st.recordMap.has(prevParentGuid)) {
            st.parentGuid = prevParentGuid;
            st.parentQuery = st.recordMap.get(prevParentGuid).fullTitle;
        } else {
            st.parentGuid = '';
            st.parentQuery = '';
        }
        st.parentSearchOpen = false;
        st.parentSuggestActiveIndex = -1;
        this._rebuildAssignRows();
        return allRecords;
    }

    _rebuildAssignRows() {
        const st = this._assignState;
        const parent = st.recordMap.get(st.parentGuid);
        if (!parent) { st.rows = []; return; }
        const rows = [];
        for (const r of st.allRecords) {
            if (r.guid === parent.guid || r.collectionGuid !== parent.collectionGuid) continue;
            let currentParent = null;
            try { currentParent = r.record.getSubPageOf?.() || null; } catch (_) {}
            const currentParentGuid = currentParent ? currentParent.guid : null;
            const isAlreadyChild = currentParentGuid === parent.guid;
            let parentInfo = '';
            const parentMeta = currentParent ? st.recordMap.get(currentParent.guid) : null;
            if (isAlreadyChild) parentInfo = 'already a child';
            else if (parentMeta) parentInfo = `child of: ${parentMeta.fullTitle}`;
            else if (currentParent) parentInfo = `child of: ${currentParent.getName?.() || '(unknown)'}`;
            rows.push({ ...r, checked: false, isAlreadyChild, currentParentGuid, parentInfo });
        }
        rows.sort((a, b) => (a.isAlreadyChild === b.isAlreadyChild ? a.title.localeCompare(b.title) : (a.isAlreadyChild ? -1 : 1)));
        st.rows = rows;
        st.previewRows = [];
    }

    _resetAssignForm() {
        const st = this._assignState;
        st.parentGuid = '';
        st.parentQuery = '';
        st.parentSearchOpen = false;
        st.parentSuggestActiveIndex = -1;
        st.filterText = '';
        st.hideChildOfRows = !!this._settings.assignHideChildOfDefault;
        st.rows = [];
        st.previewRows = [];
    }

    _resetTagForm() {
        const st = this._tagState;
        st.oldTag = '';
        st.newTag = '';
        st.previewRows = [];
        st.advancedOpen = false;
        st.caseSensitive = !!this._settings.tagCaseSensitiveDefault;
        st.excludeChoiceValues = !!this._settings.tagExcludeChoiceValuesDefault;
        st.excludedCollectionsRaw = String(this._settings.tagExcludedCollectionsDefault || '');
        st.oldSearchOpen = false;
        st.suggestActiveIndex = -1;
        st.traceOutput = '';
        st.traceOpen = false;
        st.reviewGridSourceTag = '';
        st.reviewGridSourceSearchOpen = false;
        st.reviewGridDefaultTarget = '';
        st.reviewGridFilter = '';
        st.reviewGridSort = 'title-asc';
        st.reviewGridRows = [];
        st.reviewGridCollapsedSources = new Set();
        st.reviewGridMeta = 'No queue built.';
        st.reviewGridOutput = '';
        st.tagReviewSubMode = 'grid';
        st.removeTagTag = '';
        st.removeTagSearchOpen = false;
        st.removeTagFilter = '';
        st.removeTagSort = 'title-asc';
        st.removeTagRows = [];
        st.removeTagMeta = 'No queue built.';
        st.removeTagOutput = '';
        st.addTagTag = '';
        st.addTagRecordFilter = '';
        st.addTagTableFilter = '';
        st.addTagSort = 'title-asc';
        st.addTagRows = [];
        st.addTagMeta = 'No queue built.';
        st.addTagOutput = '';
        st.excludedPickerOpen = false;
        st.excludedPickerFilter = '';
        st.tagAnalyzerThreshold = 5;
        st.tagAnalyzerSimPercent = 35;
        this._tagAnalyzerClearResults();
        this._status = '';
    }

    _assignRowMatchesFilter(row) {
        const f = (this._assignState.filterText || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!f) return true;
        const compact = f.replace(/\s/g, '');
        const full = row.fullTitleLower.replace(/\s/g, '');
        return row.fullTitleLower.includes(f) || (compact.length > 0 && full.includes(compact));
    }

    _assignRowVisible(row) {
        if (!this._assignRowMatchesFilter(row)) return false;
        if (!this._assignState.hideChildOfRows) return true;
        return !row.parentInfo.startsWith('child of:');
    }

    _assignStatusHtml(row) {
        if (row.isAlreadyChild && row.checked) return '<span class="nm-status-warn"><span class="nm-status-ico-row"><svg class="nm-status-tri" viewBox="0 0 8 10" width="8" height="10" aria-hidden="true"><polygon points="0,0 8,5 0,10" fill="currentColor"></polygon></svg><span>unassign parent</span></span></span>';
        if (!row.isAlreadyChild && row.checked) return '<span class="nm-status-ok"><span class="nm-status-ico-row"><svg class="nm-status-go" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.25"></circle><polygon points="4.2,3.8 8.8,6 4.2,8.2" fill="currentColor"></polygon></svg><span>assign parent</span></span></span>';
        if (row.isAlreadyChild) return '<span class="nm-status-ok">already a child</span>';
        return this._escape(row.parentInfo || '');
    }

    _assignParentHits() {
        const st = this._assignState;
        const q = (st.parentQuery || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!q) return st.allRecords;
        const compact = q.replace(/\s/g, '');
        return st.allRecords.filter(r => r.fullTitleLower.includes(q) || (compact.length > 0 && r.fullTitleLower.replace(/\s/g, '').includes(compact)));
    }

    _captureFocusState(rootEl) {
        const active = document.activeElement;
        if (!(active instanceof HTMLInputElement) || !rootEl.contains(active)) return null;
        const known = ['.nm-bm-filter', '.nm-ap-filter', '.nm-ap-parent-search', '.nm-tr-old', '.nm-tr-new', '.nm-tr-excluded-collections', '.nm-tr-exclude-picker-filter', '.nm-rg-source', '.nm-rg-target', '.nm-rg-filter', '.nm-rt-tag', '.nm-rt-filter', '.nm-at-tag', '.nm-at-record-filter', '.nm-at-table-filter', '.nm-ta-target-input', '.nm-ta-add-input', '.nm-ta-add-picker-filter'];
        const selector = known.find(sel => active.matches(sel));
        if (!selector) return null;
        return { selector, selectionStart: active.selectionStart, selectionEnd: active.selectionEnd };
    }

    _restoreFocusState(rootEl, state) {
        if (!state) return;
        const input = rootEl.querySelector(state.selector);
        if (!(input instanceof HTMLInputElement)) return;
        input.focus({ preventScroll: true });
        if (typeof state.selectionStart === 'number' && typeof state.selectionEnd === 'number') {
            try { input.setSelectionRange(state.selectionStart, state.selectionEnd); } catch (_) {}
        }
    }

    _captureScrollState(rootEl) {
        const selectors = ['.nm-table-wrap', '.nm-tm-table-wrap', '.nm-list-rows', '.nm-log-table-wrap', '.nm-exclude-picker-panel'];
        const items = [];
        selectors.forEach(sel => {
            rootEl.querySelectorAll(sel).forEach((el, idx) => items.push({ sel, idx, top: el.scrollTop, left: el.scrollLeft }));
        });
        return items;
    }

    _restoreScrollState(rootEl, state) {
        if (!Array.isArray(state) || !state.length) return;
        state.forEach(item => {
            const els = rootEl.querySelectorAll(item.sel);
            const el = els[item.idx];
            if (!el) return;
            el.scrollTop = item.top || 0;
            el.scrollLeft = item.left || 0;
        });
    }
    _loadSettings() {
        try {
            const raw = localStorage.getItem(this._settingsKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') this._settings = { ...this._settings, ...parsed };
        } catch (_) {}
    }

    _saveSettings() {
        try { localStorage.setItem(this._settingsKey, JSON.stringify(this._settings)); } catch (_) {}
    }
}

class Plugin extends AppPlugin {
    onLoad() {
        try {
            new NotesManagerPanel(this).load();
        } catch (e) {
            console.error('[NotesManager] load failed:', e);
        }
    }
}
