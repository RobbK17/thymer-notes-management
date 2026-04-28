const NOTES_MANAGER_VERSION = '1.0.1';

class NotesManagerPanel {
    constructor(plugin) {
        this.plugin = plugin;
        this._panel = null;
        this._mode = 'home';
        this._status = '';
        this._lastLoggedDetail = '';
        this._listenerAbort = null;

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
            filterText: '',
            hideChildOfRows: false,
            rows: [],
            previewRows: [],
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
            reviewGridSourceSuggestActiveIndex: -1,
            reviewGridDefaultTarget: '',
            reviewGridFilter: '',
            reviewGridSort: 'title-asc',
            reviewGridRows: [],
            reviewGridCollapsedSources: new Set(),
            reviewGridMeta: 'No queue built.',
            reviewGridOutput: '',
            excludedPickerOpen: false,
            excludedPickerFilter: '',
            excludePickerCollections: [],
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
            '.nm-parent-opt:hover{background:var(--cards-hover-bg)}' +
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
            '.nm-log-table-wrap{border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);overflow:auto;max-height:200px}' +
            '.nm-log-table{width:100%;border-collapse:collapse;font-size:12px}' +
            '.nm-log-table th,.nm-log-table td{padding:6px 8px;border-bottom:1px solid var(--cards-border-color);text-align:left;white-space:nowrap}' +
            '.nm-log-table td:last-child{max-width:420px;white-space:normal}' +
            '.nm-adv{margin-top:10px;border:1px solid var(--cards-border-color);border-radius:var(--ed-radius-block);padding:8px}' +
            '.nm-adv-head{display:flex;align-items:center;justify-content:space-between;cursor:pointer}' +
            '.nm-adv-body{margin-top:8px}' +
            '@media(max-width:700px){.nm-field-grid{grid-template-columns:1fr}}'
        );
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Open', icon: 'list-tree', onSelected: () => this._openPanel('home') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Bulk move notes', icon: 'list-tree', onSelected: () => this._openPanel('bulk-move') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Assign subpages', icon: 'list-tree', onSelected: () => this._openPanel('assign-parent') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Tag rename (quick)', icon: 'list-tree', onSelected: () => this._openPanel('tag-rename') });
        this.plugin.ui.addCommandPaletteCommand({ label: 'Notes Manager: Tag review (advanced)', icon: 'list-tree', onSelected: () => this._openPanel('tag-review') });
        this.plugin.ui.addSidebarItem({ label: 'Notes Manager', icon: 'list-tree', tooltip: 'Open Notes Manager', onClick: () => this._openPanel() });
        this.plugin.ui.registerCustomPanelType('notes-manager-panel', panel => {
            this._panel = panel;
            panel.setTitle('Notes Manager');
            (async () => {
                if (this._mode === 'bulk-move') await this._ensureBulkMoveLoaded();
                if (this._mode === 'assign-parent') await this._ensureAssignLoaded();
                if (this._mode === 'tag-rename' || this._mode === 'tag-review') await this._ensureTagLoaded(true);
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
        }[this._mode] || 'Home';
    }

    _breadcrumbPath() {
        const current = this._crumbForMode();
        if (this._mode === 'home') return 'Home';
        return `Home / ${current}`;
    }

    _menuHTML() {
        const breadcrumb = this._breadcrumbPath();
        return `<div class="nm-menu-wrap"><div class="nm-menu-trigger"><button class="nm-hamburger"><i class="ti ti-menu-2"></i></button><span class="nm-header-crumb">${breadcrumb}</span></div><div class="nm-dropdown" hidden><button class="nm-dropdown-item" data-action="set-mode" data-mode="home">Home</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="bulk-move">Bulk move notes</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="assign-parent">Assign subpages</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="tag-rename">Tag rename (quick)</button><button class="nm-dropdown-item" data-action="set-mode" data-mode="tag-review">Tag review (advanced)</button></div></div>`;
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
        const recent = this._activityLog.slice(-100).reverse();
        return `<div class="nm-review"><div class="nm-review-head" data-action="toggle-review-log"><span class="nm-review-title">Review log (${this._activityLog.length} entries)</span><span class="nm-muted">${collapsed ? 'Show' : 'Hide'}</span></div>${collapsed ? '' : `<div class="nm-review-body"><div class="nm-actions" style="margin-bottom:8px;"><button class="nm-btn nm-btn--secondary" data-action="export-log-json">Save log JSON</button><button class="nm-btn nm-btn--secondary" data-action="clear-log">Clear log</button></div><div class="nm-log-table-wrap"><table class="nm-log-table"><thead><tr><th>Time</th><th>Operation</th><th>Status</th><th>Record</th><th>Detail</th></tr></thead><tbody>${recent.map(r => `<tr><td>${this._escape(r.time)}</td><td>${this._escape(r.operation)}</td><td>${this._escape(r.status)}</td><td>${this._escape(r.recordName || r.recordGuid || '')}</td><td>${this._escape(r.detail || '')}</td></tr>`).join('') || '<tr><td colspan="5">No log entries yet.</td></tr>'}</tbody></table></div></div>`}</div>`;
    }

    _buildHomeHTML() {
        return `<div class="nm-root"><div class="nm-header"><div class="nm-header-left">${this._menuHTML()}</div><div class="nm-header-right"></div></div><div class="nm-card"><p class="nm-title">Notes Manager</p><p class="nm-text">Bulk Move, Assign Subpages, and Tag Rename share preview/apply and row-level review logging.</p><div class="nm-actions"><button class="nm-btn" data-action="set-mode" data-mode="bulk-move">Bulk move notes</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="assign-parent">Assign subpages</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="tag-rename">Tag rename (quick)</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="tag-review">Tag review (advanced)</button></div></div>${this._sharedTailHTML()}</div>`;
    }

    _buildBulkMoveHTML() {
        const st = this._bulkMoveState;
        const source = this._bulkCollectionByGuid(st.sourceGuid);
        const target = this._bulkCollectionByGuid(st.targetGuid);
        const summary = source && target ? `From "${source.name}" -> "${target.name}"` : 'Select source and destination collections';
        const sourceOpts = st.collections.map(c => `<option value="${this._escape(c.guid)}"${st.sourceGuid === c.guid ? ' selected' : ''}>${this._escape(c.name)}</option>`).join('');
        const targetOpts = st.collections.map(c => `<option value="${this._escape(c.guid)}"${st.targetGuid === c.guid ? ' selected' : ''}>${this._escape(c.name)}</option>`).join('');
        const rows = st.filtered.map(rec => `<div class="nm-row"><input type="checkbox" data-action="bm-toggle" data-guid="${this._escape(rec.guid)}"${st.selectedGuids.has(rec.guid) ? ' checked' : ''}><span class="nm-row-name" title="${this._escape(rec.name)}">${this._escape(rec.name)}</span><span class="nm-row-meta">${this._escape(rec.guid)}</span></div>`).join('');
        return `<div class="nm-root"><div class="nm-header"><div class="nm-header-left">${this._menuHTML()}</div><div class="nm-header-right"></div></div><div class="nm-card"><p class="nm-title">Bulk Move Notes</p><p class="nm-text">Preview first, then apply. Row-level results are logged.</p><p class="nm-bulk-summary">${this._escape(summary)}</p><div class="nm-field-grid"><div class="nm-field"><label class="nm-label">Source collection</label><select class="nm-select nm-bm-source">${sourceOpts}</select></div><div class="nm-field"><label class="nm-label">Target collection</label><select class="nm-select nm-bm-target">${targetOpts}</select></div><div class="nm-field"><label class="nm-label">Filter (title contains)</label><input class="nm-input nm-bm-filter" type="text" value="${this._escape(st.filterText)}"></div><div class="nm-field"><label class="nm-label">Display</label><label class="nm-inline"><input type="checkbox" class="nm-bm-only-selected"${st.onlySelected ? ' checked' : ''}> <span class="nm-muted">Show only selected</span></label></div></div><div class="nm-list"><div class="nm-list-head"><div class="nm-inline"><button class="nm-btn nm-btn--secondary" data-action="bm-select-all">Select all</button><button class="nm-btn nm-btn--secondary" data-action="bm-select-none">Select none</button><span class="nm-pill">${st.filtered.length} records</span><span class="nm-pill">${st.selectedGuids.size} selected</span></div><span class="nm-muted">${st.loading ? 'Loading records...' : ''}</span></div><div class="nm-list-rows">${rows || '<div class="nm-row"><span class="nm-row-name">No records found.</span></div>'}</div></div><div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="bm-preview">Preview</button><button class="nm-btn" data-action="run-bulk-move"${st.running ? ' disabled' : ''}>Apply</button><button class="nm-btn nm-btn--secondary" data-action="bm-refresh">Refresh</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${st.previewRows.length ? `<div class="nm-status">Preview rows: ${st.previewRows.length}</div>` : ''}</div>${this._sharedTailHTML()}</div>`;
    }

    _buildAssignParentHTML() {
        const st = this._assignState;
        const parentHits = st.parentSearchOpen ? this._assignParentHits().slice(0, 20) : [];
        const visibleRows = st.rows.filter(r => this._assignRowVisible(r));
        const allVisibleChecked = visibleRows.length > 0 && visibleRows.every(r => r.checked);
        const selectedCount = st.rows.filter(r => r.checked).length;
        return `<div class="nm-root"><div class="nm-header"><div class="nm-header-left">${this._menuHTML()}</div><div class="nm-header-right"></div></div><div class="nm-card"><p class="nm-title">Assign Subpages</p><p class="nm-text">Preview assign/unassign actions before applying.</p><div class="nm-field-grid"><div class="nm-field"><label class="nm-label">Parent note</label><div class="nm-parent-search-wrap nm-input-wrap"><input class="nm-input nm-ap-parent-search" type="text" value="${this._escape(st.parentQuery)}" placeholder="Type to search parent...">${st.parentQuery ? '<button class="nm-parent-clear" data-action="ap-parent-clear" title="Clear parent">×</button>' : ''}${parentHits.length ? `<div class="nm-parent-list">${parentHits.map(r => `<button class="nm-parent-opt" data-action="ap-parent-pick" data-guid="${this._escape(r.guid)}">${this._escape(r.fullTitle)}</button>`).join('')}</div>` : ''}</div></div><div class="nm-field"><label class="nm-label">Filter children</label><div class="nm-input-wrap"><input class="nm-input nm-ap-filter" type="text" value="${this._escape(st.filterText)}" placeholder="Filter by title...">${st.filterText ? '<button class="nm-parent-clear" data-action="ap-filter-clear" title="Clear filter">×</button>' : ''}</div></div></div><div class="nm-list-head"><div class="nm-inline"><label class="nm-inline"><input type="checkbox" class="nm-ap-all"${allVisibleChecked ? ' checked' : ''}> <span class="nm-muted">All visible</span></label><span class="nm-pill">${selectedCount} selected</span></div><div class="nm-inline"><label class="nm-inline"><input type="checkbox" class="nm-ap-hide-childof"${st.hideChildOfRows ? ' checked' : ''}> <span class="nm-muted">Hide child of:</span></label></div></div><div class="nm-table-wrap"><table class="nm-table"><thead><tr><th style="width:42px"></th><th>Title</th><th>Status</th></tr></thead><tbody>${visibleRows.map(r => `<tr><td><input type="checkbox" data-action="ap-toggle" data-guid="${this._escape(r.guid)}"${r.checked ? ' checked' : ''}></td><td>${this._escape(r.fullTitle)}</td><td>${this._assignStatusHtml(r)}</td></tr>`).join('') || '<tr><td colspan="3">No rows match.</td></tr>'}</tbody></table></div><div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="ap-preview">Preview</button><button class="nm-btn" data-action="run-assign-parent"${(st.running || !st.parentGuid) ? ' disabled' : ''}>Apply</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${st.previewRows.length ? `<div class="nm-status">Preview rows: ${st.previewRows.length}</div>` : ''}</div>${this._sharedTailHTML()}</div>`;
    }

    _buildTagRenameHTML() {
        const st = this._tagState;
        const suggestions = this._tagSuggestions().slice(0, 20);
        const advancedState = this._tagAdvancedState(st);
        return `<div class="nm-root"><div class="nm-header"><div class="nm-header-left">${this._menuHTML()}</div><div class="nm-header-right"></div></div><div class="nm-card"><p class="nm-title">Tag Rename (Quick)</p><p class="nm-text">Fast preview/apply rename flow. Advanced review remains separate.</p><div class="nm-field-grid"><div class="nm-field"><label class="nm-label">Current tag</label><div class="nm-input-wrap"><input class="nm-input nm-tr-old" type="text" value="${this._escape(st.oldTag)}" placeholder="#current-tag" title="Cmd/Ctrl+Enter: preview. Cmd/Ctrl+Shift+Enter: apply.">${st.oldTag ? '<button class="nm-parent-clear" data-action="tr-old-clear" title="Clear current tag">×</button>' : ''}${(st.oldSearchOpen && suggestions.length) ? `<div class="nm-parent-list">${suggestions.map(s => `<button class="nm-parent-opt" data-action="tr-old-pick" data-tag="${this._escape(s.tag)}">#${this._escape(s.tag)} (${s.count})</button>`).join('')}</div>` : ''}</div></div><div class="nm-field"><label class="nm-label">New tag</label><div class="nm-input-wrap"><input class="nm-input nm-tr-new" type="text" value="${this._escape(st.newTag)}" placeholder="#new-tag" title="Cmd/Ctrl+Enter: preview. Cmd/Ctrl+Shift+Enter: apply.">${st.newTag ? '<button class="nm-parent-clear" data-action="tr-new-clear" title="Clear new tag">×</button>' : ''}</div></div></div><div class="nm-inline" style="margin-bottom:8px;"><button class="nm-btn nm-btn--secondary" data-action="tr-refresh-index">Refresh index</button><span class="nm-muted">${this._escape(st.indexMeta)}</span></div><div class="nm-adv"><div class="nm-adv-head" data-action="tr-toggle-advanced"><span class="nm-muted">${st.advancedOpen ? '▾' : '▸'} Matching options</span><span class="nm-muted">${this._escape(advancedState)}</span></div>${st.advancedOpen ? `<div class="nm-adv-body"><div class="nm-field-grid"><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-case"${st.caseSensitive ? ' checked' : ''}> <span class="nm-muted">Case-sensitive matching</span></label></div><div class="nm-field"><label class="nm-inline"><input type="checkbox" class="nm-tr-exclude-choice"${st.excludeChoiceValues ? ' checked' : ''}> <span class="nm-muted">Exclude choice/enum from tag list</span></label></div>${this._buildExcludedCollectionsFieldHTML()}</div></div>` : ''}</div><div style="height:12px;"></div><div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="tr-preview" title="Cmd/Ctrl+Enter">Preview</button><button class="nm-btn" data-action="tr-apply"${st.running ? ' disabled' : ''} title="Cmd/Ctrl+Shift+Enter">Apply</button><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>${st.previewRows.length ? `<div class="nm-status">Preview rows: ${st.previewRows.length}</div>` : ''}</div>${this._sharedTailHTML()}</div>`;
    }

    _buildTagReviewHTML() {
        const st = this._tagState;
        const suggestions = this._tagSuggestions().slice(0, 20);
        const hasTrace = !!(st.traceOutput && st.traceOutput.trim());
        const trace = this._escape(st.traceOutput || 'Run "Trace current tag source" to inspect where the current tag is found.');
        const advancedState = this._tagAdvancedState(st);
        const gridRows = this._reviewGridRowsForDisplay();
        const defaultHeaderLabel = (this.cleanTag(st.reviewGridDefaultTarget || st.newTag) || 'Default').toUpperCase();
        const reviewGridMeta = this._reviewGridMetaSummary(gridRows);
        return `<div class="nm-root">
<div class="nm-header">
<div class="nm-header-left">${this._menuHTML()}</div>
<div class="nm-header-right"></div>
</div>
<div class="nm-card">
<p class="nm-title">Tag trace</p>
<p class="nm-text">Manage index scope, trace sources, and run review-grid rename workflows.</p>
<div class="nm-field-grid">
<div class="nm-field">
<label class="nm-label">Current tag</label>
<div class="nm-input-wrap">
<input class="nm-input nm-tr-old" type="text" value="${this._escape(st.oldTag)}" placeholder="#tag-to-trace">
${st.oldTag ? '<button class="nm-parent-clear" data-action="tr-old-clear" title="Clear current tag">×</button>' : ''}
${(st.oldSearchOpen && suggestions.length) ? `<div class="nm-parent-list">${suggestions.map(s => `<button class="nm-parent-opt" data-action="tr-old-pick" data-tag="${this._escape(s.tag)}">#${this._escape(s.tag)} (${s.count})</button>`).join('')}</div>` : ''}
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
<div class="nm-card nm-review-grid-output" style="margin-top:10px">
<p class="nm-title">Review Grid</p>
<p class="nm-text">Build a queue from a source tag, then preview/apply with default target and per-row overrides.</p>
<div class="nm-field-grid">
<div class="nm-field">
<label class="nm-label">#source-tag</label>
<div class="nm-input-wrap nm-rg-source-host">
<input class="nm-input nm-rg-source" type="text" value="${this._escape(st.reviewGridSourceTag)}" placeholder="#source-tag" title="Suggestions from tag index; Enter runs Find matches. Cleared field drops the queue." autocomplete="off">
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
</div>
<div class="nm-actions"><button class="nm-btn nm-btn--secondary" data-action="set-mode" data-mode="home">Back</button></div>
<div class="nm-card" style="margin-top:10px">
<div class="nm-adv-head"${hasTrace ? ' data-action="tr-toggle-trace-output"' : ''}>
<span class="nm-title">${hasTrace ? (st.traceOpen ? '▾' : '▸') : '•'} Trace output</span>
${hasTrace ? '<button class="nm-btn nm-btn--secondary" data-action="tr-copy-trace">Copy output</button>' : '<span class="nm-muted"></span>'}
</div>
${(!hasTrace || st.traceOpen) ? `<div class="nm-status" style="margin-top:8px;">${trace}</div>` : ''}
</div>
</div>
${this._sharedTailHTML()}
</div>`;
    }

    _render(panel) {
        const el = panel.getElement();
        if (!el) return;
        const focusState = this._captureFocusState(el);
        const scrollState = this._captureScrollState(el);
        let html = '';
        if (this._mode === 'bulk-move') html = this._buildBulkMoveHTML();
        else if (this._mode === 'assign-parent') html = this._buildAssignParentHTML();
        else if (this._mode === 'tag-rename') html = this._buildTagRenameHTML();
        else if (this._mode === 'tag-review') html = this._buildTagReviewHTML();
        else html = this._buildHomeHTML();
        el.innerHTML = html;
        if (this._listenerAbort) this._listenerAbort.abort();
        this._listenerAbort = new AbortController();
        this._attachListeners(el, this._listenerAbort.signal);
        this._restoreFocusState(el, focusState);
        this._restoreScrollState(el, scrollState);
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
                    if (next === 'home') {
                        if (this._mode === 'bulk-move') await this._resetBulkMoveForm();
                        if (this._mode === 'assign-parent') this._resetAssignForm();
                        if (this._mode === 'tag-rename' || this._mode === 'tag-review') this._resetTagForm();
                    }
                    this._mode = next;
                    this._settings.defaultMode = next;
                    this._saveSettings();
                    if (next === 'bulk-move') await this._ensureBulkMoveLoaded();
                    if (next === 'assign-parent') await this._ensureAssignLoaded();
                    if (next === 'tag-rename' || next === 'tag-review') await this._ensureTagLoaded(true);
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
                case 'ap-parent-pick': { const picked = this._assignState.recordMap.get(target.dataset.guid); if (picked) { this._assignState.parentGuid = picked.guid; this._assignState.parentQuery = picked.fullTitle; this._assignState.parentSearchOpen = false; this._rebuildAssignRows(); if (this._panel) this._render(this._panel); } break; }
                case 'ap-parent-clear': this._assignState.parentGuid = ''; this._assignState.parentQuery = ''; this._assignState.parentSearchOpen = false; this._rebuildAssignRows(); if (this._panel) this._render(this._panel); break;
                case 'ap-filter-clear': this._assignState.filterText = ''; if (this._panel) this._render(this._panel); break;
                case 'ap-preview': this._previewAssign(); if (this._panel) this._render(this._panel); break;
                case 'run-assign-parent': await this._runAssignParent(); if (this._panel) this._render(this._panel); break;
                case 'tr-old-clear': this._tagState.oldTag = ''; if (this._panel) this._render(this._panel); break;
                case 'tr-old-pick': this._tagState.oldTag = `#${target.dataset.tag || ''}`; this._tagState.oldSearchOpen = false; if (this._panel) this._render(this._panel); break;
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
                    this._tagState.reviewGridSourceSuggestActiveIndex = -1;
                    this._clearReviewGridQueue();
                    if (this._panel) this._render(this._panel);
                    break;
                case 'tr-rg-source-pick':
                    this._tagState.reviewGridSourceTag = `#${target.dataset.tag || ''}`;
                    this._tagState.reviewGridSourceSearchOpen = false;
                    this._tagState.reviewGridSourceSuggestActiveIndex = -1;
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
                case 'tr-refresh-index':
                    await this._refreshTagIndex();
                    this._toast('Tag index', 'Index refreshed.', 2500);
                    if (this._panel) this._render(this._panel);
                    break;
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
        if (bmFilter) bmFilter.addEventListener('input', () => { this._bulkMoveState.filterText = bmFilter.value; this._applyBulkMoveFilter(); if (this._panel) this._render(this._panel); }, { signal });

        const apParent = el.querySelector('.nm-ap-parent-search');
        if (apParent) {
            apParent.addEventListener('input', () => { this._assignState.parentQuery = apParent.value; this._assignState.parentGuid = ''; this._assignState.parentSearchOpen = true; this._rebuildAssignRows(); if (this._panel) this._render(this._panel); }, { signal });
            apParent.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const hit = this._assignParentHits()[0]; if (!hit) return; this._assignState.parentGuid = hit.guid; this._assignState.parentQuery = hit.fullTitle; this._assignState.parentSearchOpen = false; this._rebuildAssignRows(); if (this._panel) this._render(this._panel); }, { signal });
        }
        const apFilter = el.querySelector('.nm-ap-filter');
        if (apFilter) apFilter.addEventListener('input', () => { this._assignState.filterText = apFilter.value; if (this._panel) this._render(this._panel); }, { signal });
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
                if (this._panel) this._render(this._panel);
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
        if (rgFilter) rgFilter.addEventListener('input', () => { this._tagState.reviewGridFilter = rgFilter.value; if (this._panel) this._render(this._panel); }, { signal });
        const rgSort = el.querySelector('.nm-rg-sort');
        if (rgSort) rgSort.addEventListener('change', () => { this._tagState.reviewGridSort = rgSort.value; if (this._panel) this._render(this._panel); }, { signal });
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
                if (seg?.type === 'hashtag' && this._isTagMatch(segText, oldTag, caseSensitive)) {
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
                } else if (seg?.type === 'hashtag' && caseSensitive && this._isTagMatch(segText, oldTag, false)) {
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
                const stats = await this.forEachScannableRecord(scanOpts, async (record) => {
                    const tagsInRecord = await this.collectTagsFromRecord(record, scanOpts);
                    for (const tag of tagsInRecord) {
                        if (!tagToRecordGuids.has(tag)) tagToRecordGuids.set(tag, new Set());
                        tagToRecordGuids.get(tag).add(record.guid);
                    }
                }, scope.collections);
                st.tagIndex = [...tagToRecordGuids.entries()]
                    .map(([tag, guidSet]) => ({ tag, count: guidSet.size }))
                    .sort((a, b) => a.tag.localeCompare(b.tag));
                const choiceNote = scanOpts.excludeChoiceValues ? ' (choice/enum excluded)' : '';
                const excludedNote = scope.excludedCount ? ` Excluded collections: ${scope.excludedCount}.` : '';
                st.indexMeta = `Loaded ${st.tagIndex.length} tags from ${stats.recordCount} records in ${scope.collections.length} user collections.${choiceNote}${excludedNote}${scope.warning ? ` ${scope.warning}` : ''}`;
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
                    if (seg?.type === 'hashtag' && this.isSourceTagPatternMatch(segText, oldTag, false)) {
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
                const isChoiceProperty = Array.isArray(choicesList) || typeof prop.selectedChoiceLabels === 'function' || typeof prop.selectedChoices === 'function';
                if (!opts.excludeChoiceValues && isChoiceProperty) {
                    for (const label of (prop.selectedChoiceLabels?.() || [])) {
                        if (this.isSourceTagPatternMatch(label, oldTag, false)) addHit({ recordGuid, recordName, source: 'property-choice-label', propertyName, value: String(label) });
                    }
                    for (const id of (prop.selectedChoices?.() || [])) {
                        const raw = id != null ? String(id) : '';
                        if (raw && this.isSourceTagPatternMatch(raw, oldTag, false)) addHit({ recordGuid, recordName, source: 'property-choice-id', propertyName, value: raw });
                    }
                }
                if (this.shouldScanTextPropertyForTags(prop)) {
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
            'tag-group': (a, b) => this.cleanTag(a.sourceTag || '').localeCompare(this.cleanTag(b.sourceTag || '')) || (a.recordName || '').localeCompare(b.recordName || ''),
        }[st.reviewGridSort || 'title-asc'];
        if (cmp) rows.sort(cmp);
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
            return ak.localeCompare(bk);
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
        const titleOpen = tagGroup && row.recordGuid
            ? `<div class="nm-rg-title-open" tabindex="0" role="link" data-action="tr-rg-open-record" data-guid="${this._escape(row.recordGuid)}" title="Open this record in another panel"><div>${this._escape(row.recordName || '(untitled)')}</div>${sub}</div>`
            : `<div>${this._escape(row.recordName || '(untitled)')}</div>${sub}`;
        const ovRaw = row.overrideTarget || '';
        const hasOverride = !!this.cleanTag(ovRaw);
        const clearOverride = hasOverride ? `<button type="button" class="nm-parent-clear" data-action="tr-rg-override-clear" data-id="${this._escape(row.id)}" title="Clear override tag">×</button>` : '';
        return `<tr><td>${titleOpen}</td><td>${this._escape(row.preview || '')}</td><td><input type="checkbox" data-action="tr-rg-default" data-id="${this._escape(row.id)}"${row.action === 'default' ? ' checked' : ''}></td><td><input type="checkbox" data-action="tr-rg-skip" data-id="${this._escape(row.id)}"${row.action === 'skip' ? ' checked' : ''}></td><td><div class="nm-rg-override-wrap"><div class="nm-input-wrap"><input class="nm-input nm-rg-row-target" data-id="${this._escape(row.id)}" type="text" value="${this._escape(ovRaw)}" placeholder="override tag" title="Focus or click for tag suggestions from the index; ArrowDown opens the list; Enter picks when highlighted" autocomplete="off">${clearOverride}</div><div class="nm-rg-override-suggest nm-rg-suggest" aria-hidden="true"></div></div></td></tr>`;
    }

    _clearReviewGridQueue() {
        const st = this._tagState;
        st.reviewGridRows = [];
        st.reviewGridCollapsedSources = new Set();
        st.reviewGridMeta = 'No queue built.';
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
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
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

    _attachTagIndexAutocomplete(input, suggestEl, signal, onSelectTag) {
        if (!input || !suggestEl) return { close: () => {} };
        let items = [];
        let active = -1;
        const list = () => (Array.isArray(this._tagState.tagIndex) ? this._tagState.tagIndex : []);
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
            const fullList = list();
            const source = !q
                ? fullList.slice(0, 30)
                : fullList
                    .filter(t => t.tag.toLowerCase().includes(q))
                    .sort((a, b) => {
                        const aStarts = a.tag.toLowerCase().startsWith(q) ? 0 : 1;
                        const bStarts = b.tag.toLowerCase().startsWith(q) ? 0 : 1;
                        if (aStarts !== bStarts) return aStarts - bStarts;
                        return a.tag.localeCompare(b.tag);
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
            const open = suggestEl.style.display !== 'none' && items.length > 0;
            if (!open && ev.key === 'ArrowDown') {
                ev.preventDefault();
                render();
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
                if (active >= 0 && items[active]) {
                    ev.preventDefault();
                    choose(items[active].tag);
                }
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                close();
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
                    if (seg?.type === 'hashtag' && this.isSourceTagPatternMatch(segText, normalizedSource, false)) {
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
                const texts = prop.texts?.() || [];
                for (const value of texts) {
                    const v = String(value ?? '');
                    if (!this.isSourceTagPatternMatch(v, normalizedSource, false)) continue;
                    rows.push({ id: `rg-${rowId++}`, action: 'default', recordGuid, recordName, source: `property-text:${propertyName}`, preview, sourceTag: this.cleanTag(v), overrideTarget: '' });
                }
            }
        });
        st.reviewGridRows = rows;
        const gridRows = this._reviewGridRowsForDisplay();
        st.reviewGridMeta = rows.length ? this._reviewGridMetaSummary(gridRows) : 'No queue built.';
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
        const perRecordTargets = new Map();
        for (const row of plan.rowsToApply) {
            const src = this.cleanTag(row.sourceTag || defaultSource);
            const tgt = this.cleanTag((row.action === 'override' ? row.overrideTarget : '') || defaultTarget);
            if (!src || !tgt) continue;
            const key = `${row.recordGuid}|${src}`;
            if (!perRecordTargets.has(key)) perRecordTargets.set(key, new Set());
            perRecordTargets.get(key).add(tgt);
        }
        const appliedGuids = new Set();
        let skippedConflicts = 0;
        let failed = 0;
        let skippedNoChange = 0;
        const opts = this._tagScanOpts();
        try {
            await this.forEachScannableRecord(opts, async (record) => {
                const guid = record?.guid || '';
                for (const [mapKey, targets] of perRecordTargets.entries()) {
                    const pipeIdx = mapKey.indexOf('|');
                    if (pipeIdx < 0) continue;
                    const g = mapKey.slice(0, pipeIdx);
                    const src = mapKey.slice(pipeIdx + 1);
                    if (g !== guid) continue;
                    if (!targets || !targets.size) continue;
                    if (targets.size > 1) { skippedConflicts += 1; continue; }
                    const target = [...targets][0];
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
        return list.some(v => v.toLowerCase() === name || v === guid);
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

    async collectTagsFromRecord(record, scanOpts) {
        const opts = scanOpts && typeof scanOpts === 'object' ? scanOpts : {};
        const tags = new Set();
        const lineItems = await record.getLineItems(true);
        for (const item of lineItems) {
            const segments = item?.segments;
            if (!Array.isArray(segments)) continue;
            for (const seg of segments) {
                if (seg?.type === 'hashtag') {
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
                const isChoiceProperty = Array.isArray(choicesList);
                if (opts.excludeChoiceValues && isChoiceProperty) continue;
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

    shouldScanTextPropertyForTags(prop) {
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

    _tagSuggestionsForValue(rawValue) {
        const q = this.cleanTag(rawValue).toLowerCase();
        const list = Array.isArray(this._tagState.tagIndex) ? this._tagState.tagIndex : [];
        if (!q) return list.slice(0, 20);
        return list
            .filter(t => t.tag.toLowerCase().includes(q))
            .sort((a, b) => {
                const as = a.tag.toLowerCase().startsWith(q) ? 0 : 1;
                const bs = b.tag.toLowerCase().startsWith(q) ? 0 : 1;
                if (as !== bs) return as - bs;
                return b.count - a.count || a.tag.localeCompare(b.tag);
            });
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
        st.reviewGridSourceSuggestActiveIndex = -1;
        st.reviewGridDefaultTarget = '';
        st.reviewGridFilter = '';
        st.reviewGridSort = 'title-asc';
        st.reviewGridRows = [];
        st.reviewGridCollapsedSources = new Set();
        st.reviewGridMeta = 'No queue built.';
        st.reviewGridOutput = '';
        st.excludedPickerOpen = false;
        st.excludedPickerFilter = '';
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
        const known = ['.nm-bm-filter', '.nm-ap-filter', '.nm-ap-parent-search', '.nm-tr-old', '.nm-tr-new', '.nm-tr-excluded-collections', '.nm-tr-exclude-picker-filter', '.nm-rg-source', '.nm-rg-target', '.nm-rg-filter'];
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
        const selectors = ['.nm-table-wrap', '.nm-list-rows', '.nm-log-table-wrap', '.nm-exclude-picker-panel'];
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
