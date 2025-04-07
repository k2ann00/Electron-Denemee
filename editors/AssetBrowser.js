// editors/AssetBrowser.js - Asset management and organization

/**
 * Asset Browser - Manages project assets with a Unity-like interface
 * Allows importing, organizing, and using assets in the editor
 */
class AssetBrowser {
    /**
     * Create a new Asset Browser
     * @param {object} app - Main application reference
     */
    constructor(app) {
      this.app = app;
      this.assets = [];
      this.selectedAsset = null;
      this.filter = '';
      this.viewMode = 'grid'; // 'grid' or 'list'
      this.sortBy = 'name'; // 'name', 'type', 'size', 'date'
      this.sortAsc = true;
      this.currentPath = '';
      this.previewImageCache = {};
      this.isInitialized = false;
      
      // Register event handlers
      this.app.core.events.on('asset:import', this.onImportAsset.bind(this));
      this.app.core.events.on('asset:delete', this.onDeleteAsset.bind(this));
      this.app.core.events.on('asset:rename', this.onRenameAsset.bind(this));
      this.app.core.events.on('asset:select', this.onSelectAsset.bind(this));
      this.app.core.events.on('project:loaded', this.onProjectLoaded.bind(this));
    }
    
    /**
     * Initialize the browser
     */
    initialize() {
      if (this.isInitialized) return;
      
      console.log('Initializing Asset Browser');
      
      this.isInitialized = true;
    }
    
    /**
     * Create the browser UI
     */
    initUI() {
      // Get the panel content from UI manager
      const panel = this.app.core.ui.getPanelContent('project');
      
      if (!panel) {
        console.error('Project panel not found');
        return;
      }
      
      // Create toolbar
      this.createToolbar(panel);
      
      // Create folder navigation
      this.createFolderNav(panel);
      
      // Create asset grid/list container
      const assetContainer = document.createElement('div');
      assetContainer.className = 'asset-container';
      panel.appendChild(assetContainer);
      
      // Store reference
      this.assetContainer = assetContainer;
      
      // Initial render
      this.renderAssets();
    }
    
    /**
     * Create the browser toolbar
     * @param {HTMLElement} container - Container element
     */
    createToolbar(container) {
      const toolbar = document.createElement('div');
      toolbar.className = 'asset-toolbar';
      
      // Add import button
      const importButton = document.createElement('button');
      importButton.className = 'asset-toolbar-button';
      importButton.innerHTML = '<i class="icon-import"></i>';
      importButton.title = 'Import Asset';
      importButton.addEventListener('click', () => this.importAsset());
      toolbar.appendChild(importButton);
      
      // Add create folder button
      const folderButton = document.createElement('button');
      folderButton.className = 'asset-toolbar-button';
      folderButton.innerHTML = '<i class="icon-folder-add"></i>';
      folderButton.title = 'Create Folder';
      folderButton.addEventListener('click', () => this.createFolder());
      toolbar.appendChild(folderButton);
      
      // Add delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'asset-toolbar-button';
      deleteButton.innerHTML = '<i class="icon-delete"></i>';
      deleteButton.title = 'Delete';
      deleteButton.addEventListener('click', () => this.deleteSelectedAsset());
      toolbar.appendChild(deleteButton);
      
      // Add separator
      const separator = document.createElement('div');
      separator.className = 'toolbar-separator';
      toolbar.appendChild(separator);
      
      // Add view mode toggle
      const gridButton = document.createElement('button');
      gridButton.className = 'asset-toolbar-button';
      gridButton.classList.toggle('active', this.viewMode === 'grid');
      gridButton.innerHTML = '<i class="icon-grid-view"></i>';
      gridButton.title = 'Grid View';
      gridButton.addEventListener('click', () => this.setViewMode('grid'));
      toolbar.appendChild(gridButton);
      
      const listButton = document.createElement('button');
      listButton.className = 'asset-toolbar-button';
      listButton.classList.toggle('active', this.viewMode === 'list');
      listButton.innerHTML = '<i class="icon-list-view"></i>';
      listButton.title = 'List View';
      listButton.addEventListener('click', () => this.setViewMode('list'));
      toolbar.appendChild(listButton);
      
      // Add search box
      const searchContainer = document.createElement('div');
      searchContainer.className = 'search-container';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'search-input';
      searchInput.placeholder = 'Search assets...';
      searchInput.addEventListener('input', (e) => {
        this.filter = e.target.value;
        this.renderAssets();
      });
      
      searchContainer.appendChild(searchInput);
      toolbar.appendChild(searchContainer);
      
      container.appendChild(toolbar);
    }
    
    /**
     * Create the folder navigation
     * @param {HTMLElement} container - Container element
     */
    createFolderNav(container) {
      const folderNav = document.createElement('div');
      folderNav.className = 'folder-nav';
      
      // Add breadcrumb navigation
      const breadcrumb = document.createElement('div');
      breadcrumb.className = 'breadcrumb';
      
      // Add "Assets" root item
      const rootItem = document.createElement('span');
      rootItem.className = 'breadcrumb-item';
      rootItem.textContent = 'Assets';
      rootItem.addEventListener('click', () => {
        this.navigateTo('');
      });
      breadcrumb.appendChild(rootItem);
      
      folderNav.appendChild(breadcrumb);
      container.appendChild(folderNav);
      
      // Store references
      this.folderNav = folderNav;
      this.breadcrumb = breadcrumb;
    }
    
    /**
     * Render the asset list/grid
     */
    renderAssets() {
      if (!this.assetContainer) return;
      
      // Clear container
      this.assetContainer.innerHTML = '';
      
      // Get filtered and sorted assets
      const filteredAssets = this.getFilteredAssets();
      
      // Create asset grid or list
      if (this.viewMode === 'grid') {
        this.renderGrid(filteredAssets);
      } else {
        this.renderList(filteredAssets);
      }
      
      // Update breadcrumb
      this.updateBreadcrumb();
    }
    
    /**
     * Render assets in grid view
     * @param {Array} assets - Assets to render
     */
    renderGrid(assets) {
      const grid = document.createElement('div');
      grid.className = 'asset-grid';
      
      // Add folder items first
      const folders = assets.filter(asset => asset.type === 'folder');
      
      for (const folder of folders) {
        const folderItem = this.createGridItem(folder);
        grid.appendChild(folderItem);
      }
      
      // Add other asset items
      const nonFolders = assets.filter(asset => asset.type !== 'folder');
      
      for (const asset of nonFolders) {
        const assetItem = this.createGridItem(asset);
        grid.appendChild(assetItem);
      }
      
      this.assetContainer.appendChild(grid);
    }
    
    /**
     * Create a grid item for an asset
     * @param {object} asset - Asset data
     * @returns {HTMLElement} Grid item element
     */
    createGridItem(asset) {
      const item = document.createElement('div');
      item.className = 'asset-grid-item';
      item.dataset.id = asset.id;
      
      if (this.selectedAsset === asset.id) {
        item.classList.add('selected');
      }
      
      // Create preview icon
      const preview = document.createElement('div');
      preview.className = 'asset-preview';
      
      // Set preview based on asset type
      if (asset.type === 'folder') {
        preview.innerHTML = '<i class="icon-folder"></i>';
      } else if (asset.type === 'image') {
        // Try to show image preview if available
        if (this.previewImageCache[asset.id]) {
          preview.innerHTML = `<img src="${this.previewImageCache[asset.id]}" alt="${asset.name}">`;
        } else {
          preview.innerHTML = '<i class="icon-image"></i>';
          
          // Load image preview asynchronously
          this.loadImagePreview(asset).then(url => {
            if (url) {
              preview.innerHTML = `<img src="${url}" alt="${asset.name}">`;
            }
          });
        }
      } else if (asset.type === 'audio') {
        preview.innerHTML = '<i class="icon-audio"></i>';
      } else if (asset.type === 'font') {
        preview.innerHTML = '<i class="icon-font"></i>';
      } else if (asset.type === 'script') {
        preview.innerHTML = '<i class="icon-script"></i>';
      } else {
        preview.innerHTML = '<i class="icon-file"></i>';
      }
      
      // Create label
      const label = document.createElement('div');
      label.className = 'asset-label';
      label.textContent = asset.name;
      
      // Add double-click handler
      if (asset.type === 'folder') {
        item.addEventListener('dblclick', () => {
          this.navigateTo(asset.path);
        });
      } else {
        item.addEventListener('dblclick', () => {
          this.openAsset(asset);
        });
      }
      
      // Add click handler for selection
      item.addEventListener('click', (e) => {
        // Clear selection if not holding Ctrl key
        if (!e.ctrlKey) {
          const items = this.assetContainer.querySelectorAll('.asset-grid-item, .asset-list-item');
          items.forEach(i => i.classList.remove('selected'));
        }
        
        // Toggle selection
        item.classList.toggle('selected');
        
        // Update selected asset
        this.selectedAsset = item.classList.contains('selected') ? asset.id : null;
        
        // Emit selection event
        this.app.core.events.emit('asset:selected', asset);
      });
      
      // Add context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, asset);
      });
      
      item.appendChild(preview);
      item.appendChild(label);
      
      return item;
    }
    
    /**
     * Render assets in list view
     * @param {Array} assets - Assets to render
     */
    renderList(assets) {
      const list = document.createElement('div');
      list.className = 'asset-list';
      
      // Add header row
      const header = document.createElement('div');
      header.className = 'asset-list-header';
      
      // Name column
      const nameHeader = document.createElement('div');
      nameHeader.className = 'asset-list-cell name-column';
      nameHeader.textContent = 'Name';
      nameHeader.addEventListener('click', () => this.setSorting('name'));
      if (this.sortBy === 'name') {
        nameHeader.classList.add(this.sortAsc ? 'sort-asc' : 'sort-desc');
      }
      
      // Type column
      const typeHeader = document.createElement('div');
      typeHeader.className = 'asset-list-cell type-column';
      typeHeader.textContent = 'Type';
      typeHeader.addEventListener('click', () => this.setSorting('type'));
      if (this.sortBy === 'type') {
        typeHeader.classList.add(this.sortAsc ? 'sort-asc' : 'sort-desc');
      }
      
      // Size column
      const sizeHeader = document.createElement('div');
      sizeHeader.className = 'asset-list-cell size-column';
      sizeHeader.textContent = 'Size';
      sizeHeader.addEventListener('click', () => this.setSorting('size'));
      if (this.sortBy === 'size') {
        sizeHeader.classList.add(this.sortAsc ? 'sort-asc' : 'sort-desc');
      }
      
      // Date column
      const dateHeader = document.createElement('div');
      dateHeader.className = 'asset-list-cell date-column';
      dateHeader.textContent = 'Date';
      dateHeader.addEventListener('click', () => this.setSorting('date'));
      if (this.sortBy === 'date') {
        dateHeader.classList.add(this.sortAsc ? 'sort-asc' : 'sort-desc');
      }
      
      header.appendChild(nameHeader);
      header.appendChild(typeHeader);
      header.appendChild(sizeHeader);
      header.appendChild(dateHeader);
      
      list.appendChild(header);
      
      // Add folder items first
      const folders = assets.filter(asset => asset.type === 'folder');
      
      for (const folder of folders) {
        const folderItem = this.createListItem(folder);
        list.appendChild(folderItem);
      }
      
      // Add other asset items
      const nonFolders = assets.filter(asset => asset.type !== 'folder');
      
      for (const asset of nonFolders) {
        const assetItem = this.createListItem(asset);
        list.appendChild(assetItem);
      }
      
      this.assetContainer.appendChild(list);
    }
    
    /**
     * Create a list item for an asset
     * @param {object} asset - Asset data
     * @returns {HTMLElement} List item element
     */
    createListItem(asset) {
      const item = document.createElement('div');
      item.className = 'asset-list-item';
      item.dataset.id = asset.id;
      
      if (this.selectedAsset === asset.id) {
        item.classList.add('selected');
      }
      
      // Name cell
      const nameCell = document.createElement('div');
      nameCell.className = 'asset-list-cell name-column';
      
      // Add icon
      const icon = document.createElement('span');
      icon.className = 'asset-icon';
      
      if (asset.type === 'folder') {
        icon.innerHTML = '<i class="icon-folder"></i>';
      } else if (asset.type === 'image') {
        icon.innerHTML = '<i class="icon-image"></i>';
      } else if (asset.type === 'audio') {
        icon.innerHTML = '<i class="icon-audio"></i>';
      } else if (asset.type === 'font') {
        icon.innerHTML = '<i class="icon-font"></i>';
      } else if (asset.type === 'script') {
        icon.innerHTML = '<i class="icon-script"></i>';
      } else {
        icon.innerHTML = '<i class="icon-file"></i>';
      }
      
      const name = document.createElement('span');
      name.textContent = asset.name;
      
      nameCell.appendChild(icon);
      nameCell.appendChild(name);
      
      // Type cell
      const typeCell = document.createElement('div');
      typeCell.className = 'asset-list-cell type-column';
      typeCell.textContent = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
      
      // Size cell
      const sizeCell = document.createElement('div');
      sizeCell.className = 'asset-list-cell size-column';
      sizeCell.textContent = asset.type === 'folder' ? '--' : this.formatSize(asset.size);
      
      // Date cell
      const dateCell = document.createElement('div');
      dateCell.className = 'asset-list-cell date-column';
      dateCell.textContent = asset.lastModified ? new Date(asset.lastModified).toLocaleDateString() : '--';
      
      item.appendChild(nameCell);
      item.appendChild(typeCell);
      item.appendChild(sizeCell);
      item.appendChild(dateCell);
      
      // Add double-click handler
      if (asset.type === 'folder') {
        item.addEventListener('dblclick', () => {
          this.navigateTo(asset.path);
        });
      } else {
        item.addEventListener('dblclick', () => {
          this.openAsset(asset);
        });
      }
      
      // Add click handler for selection
      item.addEventListener('click', (e) => {
        // Clear selection if not holding Ctrl key
        if (!e.ctrlKey) {
          const items = this.assetContainer.querySelectorAll('.asset-grid-item, .asset-list-item');
          items.forEach(i => i.classList.remove('selected'));
        }
        
        // Toggle selection
        item.classList.toggle('selected');
        
        // Update selected asset
        this.selectedAsset = item.classList.contains('selected') ? asset.id : null;
        
        // Emit selection event
        this.app.core.events.emit('asset:selected', asset);
      });
      
      // Add context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, asset);
      });
      
      return item;
    }
    
    /**
     * Update the breadcrumb navigation
     */
    updateBreadcrumb() {
      // Clear existing path items (keep root)
      const items = this.breadcrumb.querySelectorAll('.breadcrumb-item:not(:first-child)');
      items.forEach(item => item.remove());
      
      // Add separator after root
      if (this.currentPath) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '>';
        this.breadcrumb.appendChild(separator);
        
        // Split path into parts and create items
        const parts = this.currentPath.split('/');
        let currentPath = '';
        
        for (let i = 0; i < parts.length; i++) {
          currentPath += (i > 0 ? '/' : '') + parts[i];
          
          const item = document.createElement('span');
          item.className = 'breadcrumb-item';
          item.textContent = parts[i];
          
          // Add click handler
          const itemPath = currentPath;
          item.addEventListener('click', () => {
            this.navigateTo(itemPath);
          });
          
          this.breadcrumb.appendChild(item);
          
          // Add separator if not last
          if (i < parts.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '>';
            this.breadcrumb.appendChild(separator);
          }
        }
      }
    }
    
    /**
     * Get filtered and sorted assets in current path
     * @returns {Array} Filtered and sorted assets
     */
    getFilteredAssets() {
      // Filter by current path
      let filtered = this.assets.filter(asset => {
        if (this.currentPath === '') {
          // In root, show only top-level items
          return !asset.path.includes('/');
        } else {
          // In subfolder, show only direct children
          const relativePath = asset.path.substr(this.currentPath.length + 1);
          return asset.path.startsWith(this.currentPath + '/') && !relativePath.includes('/');
        }
      });
      
      // Apply search filter if any
      if (this.filter) {
        const lowerFilter = this.filter.toLowerCase();
        filtered = filtered.filter(asset => 
          asset.name.toLowerCase().includes(lowerFilter) ||
          asset.type.toLowerCase().includes(lowerFilter)
        );
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        // Folders always come first
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        
        let result = 0;
        
        // Sort by selected field
        switch (this.sortBy) {
          case 'name':
            result = a.name.localeCompare(b.name);
            break;
          case 'type':
            result = a.type.localeCompare(b.type);
            break;
          case 'size':
            result = (a.size || 0) - (b.size || 0);
            break;
          case 'date':
            result = new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
            break;
        }
        
        // Apply sort direction
        return this.sortAsc ? result : -result;
      });
      
      return filtered;
    }
    
    /**
     * Set the view mode
     * @param {string} mode - View mode ('grid' or 'list')
     */
    setViewMode(mode) {
      if (mode !== 'grid' && mode !== 'list') return;
      
      this.viewMode = mode;
      
      // Update UI
      const gridButton = document.querySelector('.asset-toolbar-button:has(.icon-grid-view)');
      const listButton = document.querySelector('.asset-toolbar-button:has(.icon-list-view)');
      
      if (gridButton && listButton) {
        gridButton.classList.toggle('active', mode === 'grid');
        listButton.classList.toggle('active', mode === 'list');
      }
      
      // Re-render assets
      this.renderAssets();
    }
    
    /**
     * Set the sorting method
     * @param {string} sortBy - Sort field ('name', 'type', 'size', 'date')
     */
    setSorting(sortBy) {
      // Toggle direction if same field
      if (this.sortBy === sortBy) {
        this.sortAsc = !this.sortAsc;
      } else {
        this.sortBy = sortBy;
        this.sortAsc = true;
      }
      
      // Re-render assets
      this.renderAssets();
    }
    
    /**
     * Navigate to a folder path
     * @param {string} path - Folder path
     */
    navigateTo(path) {
      this.currentPath = path;
      this.renderAssets();
    }
    
    /**
     * Import an asset
     */
    async importAsset() {
      try {
        // Show file dialog
        const filePath = await this.app.core.ui.showFileDialog({
          title: 'Import Asset',
          fileTypes: [
            '.png', '.jpg', '.jpeg', '.gif', '.bmp', // Images
            '.mp3', '.wav', '.ogg',                  // Audio
            '.ttf', '.otf',                          // Fonts
            '.lua', '.moon', '.js',                  // Scripts
            '.json', '.xml', '.csv'                  // Data
          ]
        });
        
        if (!filePath) return;
        
        // Show progress indicator
        this.app.core.ui.setStatus('Importing asset...');
        
        // Import the asset
        const asset = await this.app.core.fs.importAsset(filePath, this.currentPath);
        
        // Add to assets list
        this.assets.push(asset);
        
        // Re-render assets
        this.renderAssets();
        
        // Select the new asset
        this.selectedAsset = asset.id;
        
        // Update status
        this.app.core.ui.setStatus('Asset imported successfully');
        
        // Emit event
        this.app.core.events.emit('asset:imported', asset);
      } catch (error) {
        console.error('Error importing asset:', error);
        this.app.core.ui.showError('Import Error', error.message);
        this.app.core.ui.setStatus('Error importing asset', 'error');
      }
    }
    
    /**
     * Create a new folder
     */
    async createFolder() {
      try {
        // Show dialog for folder name
        const folderName = await this.app.core.ui.showPrompt('New Folder', 'Enter folder name:');
        
        if (!folderName) return;
        
        // Create the folder path
        const folderPath = this.currentPath
          ? `${this.currentPath}/${folderName}`
          : folderName;
        
        // Create the folder
        await this.app.core.fs.createDirectory(folderPath);
        
        // Add to assets list
        const folder = {
          id: 'folder_' + Date.now(),
          name: folderName,
          path: folderPath,
          type: 'folder',
          lastModified: new Date().toISOString()
        };
        
        this.assets.push(folder);
        
        // Re-render assets
        this.renderAssets();
        
        // Select the new folder
        this.selectedAsset = folder.id;
        
        // Update status
        this.app.core.ui.setStatus('Folder created');
      } catch (error) {
        console.error('Error creating folder:', error);
        this.app.core.ui.showError('Folder Error', error.message);
        this.app.core.ui.setStatus('Error creating folder', 'error');
      }
    }
    
    /**
     * Delete the selected asset
     */
    async deleteSelectedAsset() {
      if (!this.selectedAsset) return;
      
      try {
        // Find the selected asset
        const asset = this.assets.find(a => a.id === this.selectedAsset);
        
        if (!asset) return;
        
        // Confirm deletion
        const result = await this.app.core.ui.showConfirmDialog(
          'Delete Asset',
          `Are you sure you want to delete "${asset.name}"?`,
          ['Cancel', 'Delete']
        );
        
        if (result !== 'Delete') return;
        
        // Delete the asset
        await this.app.core.fs.deleteAsset(asset.path);
        
        // Remove from assets list
        this.assets = this.assets.filter(a => a.id !== this.selectedAsset);
        
        // Clear selection
        this.selectedAsset = null;
        
        // Re-render assets
        this.renderAssets();
        
        // Update status
        this.app.core.ui.setStatus('Asset deleted');
        
        // Emit event
        this.app.core.events.emit('asset:deleted', asset);
      } catch (error) {
        console.error('Error deleting asset:', error);
        this.app.core.ui.showError('Delete Error', error.message);
        this.app.core.ui.setStatus('Error deleting asset', 'error');
      }
    }
    
    /**
     * Rename an asset
     * @param {object} asset - Asset to rename
     */
    async renameAsset(asset) {
      try {
        // Show dialog for new name
        const newName = await this.app.core.ui.showPrompt('Rename Asset', 'Enter new name:', asset.name);
        
        if (!newName || newName === asset.name) return;
        
        // Calculate new path
        const oldPath = asset.path;
        const basePath = this.currentPath || '';
        const newPath = asset.type === 'folder'
          ? basePath ? `${basePath}/${newName}` : newName
          : `${basePath}/${newName}${this.getExtension(asset.name)}`;
        
        // Rename the asset
        await this.app.core.fs.renameAsset(oldPath, newPath);
        
        // Update asset in the list
        asset.name = newName;
        asset.path = newPath;
        
        // Re-render assets
        this.renderAssets();
        
        // Update status
        this.app.core.ui.setStatus('Asset renamed');
        
        // Emit event
        this.app.core.events.emit('asset:renamed', { asset, oldPath, newPath });
      } catch (error) {
        console.error('Error renaming asset:', error);
        this.app.core.ui.showError('Rename Error', error.message);
        this.app.core.ui.setStatus('Error renaming asset', 'error');
      }
    }
    
    /**
     * Open an asset
     * @param {object} asset - Asset to open
     */
    openAsset(asset) {
      // Handle different asset types
      switch (asset.type) {
        case 'image':
          this.openImageAsset(asset);
          break;
        case 'audio':
          this.openAudioAsset(asset);
          break;
        case 'font':
          this.openFontAsset(asset);
          break;
        case 'script':
          this.openScriptAsset(asset);
          break;
        default:
          this.openGenericAsset(asset);
      }
    }
    
    /**
     * Open an image asset
     * @param {object} asset - Image asset
     */
    openImageAsset(asset) {
      // Check if image editor is available
      const externalEditor = this.app.core.config.get('externalEditors.image');
      
      if (externalEditor) {
        // Open in external editor
        this.openInExternalEditor(asset, externalEditor);
      } else {
        // Show image viewer
        this.showImageViewer(asset);
      }
    }
    
    /**
     * Open an audio asset
     * @param {object} asset - Audio asset
     */
    openAudioAsset(asset) {
      // Check if audio editor is available
      const externalEditor = this.app.core.config.get('externalEditors.audio');
      
      if (externalEditor) {
        // Open in external editor
        this.openInExternalEditor(asset, externalEditor);
      } else {
        // Show audio player
        this.showAudioPlayer(asset);
      }
    }
    
    /**
     * Open a font asset
     * @param {object} asset - Font asset
     */
    openFontAsset(asset) {
      // Show font viewer
      this.showFontViewer(asset);
    }
    
    /**
     * Open a script asset
     * @param {object} asset - Script asset
     */
    openScriptAsset(asset) {
      // Get the editor to use
      const editorName = this.getEditorForScript(asset);
      
      // Switch to code editor
      this.app.core.events.emit('editor:change', editorName);
      
      // Open the script
      this.app.core.events.emit('script:open', asset);
    }
    
   /**
   * Open a generic asset
   * @param {object} asset - Generic asset
   */
  openGenericAsset(asset) {
    // Get the default editor for this file type
    const extension = this.getExtension(asset.name);
    const editorName = this.getEditorForExtension(extension);
    
    if (editorName) {
      // Switch to appropriate editor
      this.app.core.events.emit('editor:change', editorName);
      
      // Open the file
      this.app.core.events.emit('file:open', asset);
    } else {
      // No default editor, show file info
      this.showFileInfo(asset);
    }
  }
  
  /**
   * Open an asset in an external editor
   * @param {object} asset - Asset to open
   * @param {string} externalEditor - Path to external editor
   */
  openInExternalEditor(asset, externalEditor) {
    // Get full file path
    const filePath = path.join(this.app.project.path, asset.path);
    
    // Open file in external editor
    const child_process = require('child_process');
    
    try {
      child_process.exec(`"${externalEditor}" "${filePath}"`);
      this.app.core.ui.setStatus(`Opening ${asset.name} in external editor`);
    } catch (error) {
      console.error('Error opening external editor:', error);
      this.app.core.ui.showError('External Editor Error', error.message);
    }
  }
  
  /**
   * Show image viewer for an image asset
   * @param {object} asset - Image asset
   */
  showImageViewer(asset) {
    // Create image viewer dialog
    const dialog = document.createElement('div');
    dialog.className = 'image-viewer-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'viewer-header';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'viewer-title';
    title.textContent = asset.name;
    header.appendChild(title);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'viewer-close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'viewer-content';
    
    // Add image
    const img = document.createElement('img');
    img.className = 'viewer-image';
    img.src = path.join(this.app.project.path, asset.path);
    img.alt = asset.name;
    content.appendChild(img);
    
    dialog.appendChild(content);
    
    // Create footer with info
    const footer = document.createElement('div');
    footer.className = 'viewer-footer';
    
    // Add image info
    const info = document.createElement('div');
    info.className = 'viewer-info';
    info.textContent = `${asset.width || '?'}×${asset.height || '?'} pixels • ${this.formatSize(asset.size)}`;
    footer.appendChild(info);
    
    dialog.appendChild(footer);
    
    // Add to document body
    document.body.appendChild(dialog);
  }
  
  /**
   * Show audio player for an audio asset
   * @param {object} asset - Audio asset
   */
  showAudioPlayer(asset) {
    // Create audio player dialog
    const dialog = document.createElement('div');
    dialog.className = 'audio-player-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'viewer-header';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'viewer-title';
    title.textContent = asset.name;
    header.appendChild(title);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'viewer-close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'viewer-content';
    
    // Add audio player
    const audio = document.createElement('audio');
    audio.className = 'viewer-audio';
    audio.src = path.join(this.app.project.path, asset.path);
    audio.controls = true;
    audio.autoplay = false;
    content.appendChild(audio);
    
    dialog.appendChild(content);
    
    // Create footer with info
    const footer = document.createElement('div');
    footer.className = 'viewer-footer';
    
    // Add audio info
    const info = document.createElement('div');
    info.className = 'viewer-info';
    info.textContent = `${this.formatSize(asset.size)} • ${asset.duration || '?'} seconds`;
    footer.appendChild(info);
    
    dialog.appendChild(footer);
    
    // Add to document body
    document.body.appendChild(dialog);
  }
  
  /**
   * Show font viewer for a font asset
   * @param {object} asset - Font asset
   */
  showFontViewer(asset) {
    // Create font viewer dialog
    const dialog = document.createElement('div');
    dialog.className = 'font-viewer-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'viewer-header';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'viewer-title';
    title.textContent = asset.name;
    header.appendChild(title);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'viewer-close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'viewer-content';
    
    // Add font preview
    const preview = document.createElement('div');
    preview.className = 'font-preview';
    
    // Add style for font
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'PreviewFont';
        src: url('${path.join(this.app.project.path, asset.path)}');
      }
      .font-preview-text {
        font-family: 'PreviewFont', sans-serif;
      }
    `;
    document.head.appendChild(style);
    
    // Add sample text
    const sizes = [12, 16, 24, 36, 48, 72];
    
    for (const size of sizes) {
      const sampleContainer = document.createElement('div');
      sampleContainer.className = 'font-sample';
      
      const sizeLabel = document.createElement('div');
      sizeLabel.className = 'font-size-label';
      sizeLabel.textContent = `${size}px`;
      sampleContainer.appendChild(sizeLabel);
      
      const sampleText = document.createElement('div');
      sampleText.className = 'font-preview-text';
      sampleText.style.fontSize = `${size}px`;
      sampleText.textContent = 'The quick brown fox jumps over the lazy dog';
      sampleContainer.appendChild(sampleText);
      
      preview.appendChild(sampleContainer);
    }
    
    content.appendChild(preview);
    dialog.appendChild(content);
    
    // Create footer with info
    const footer = document.createElement('div');
    footer.className = 'viewer-footer';
    
    // Add font info
    const info = document.createElement('div');
    info.className = 'viewer-info';
    info.textContent = this.formatSize(asset.size);
    footer.appendChild(info);
    
    dialog.appendChild(footer);
    
    // Add to document body
    document.body.appendChild(dialog);
  }
  
  /**
   * Show file info for a generic asset
   * @param {object} asset - Asset
   */
  showFileInfo(asset) {
    // Create file info dialog
    const dialog = document.createElement('div');
    dialog.className = 'file-info-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'viewer-header';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'viewer-title';
    title.textContent = asset.name;
    header.appendChild(title);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'viewer-close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'viewer-content';
    
    // Add file info table
    const table = document.createElement('table');
    table.className = 'file-info-table';
    
    // Add info rows
    const rows = [
      { label: 'Name', value: asset.name },
      { label: 'Type', value: this.getFileTypeDescription(asset) },
      { label: 'Size', value: this.formatSize(asset.size) },
      { label: 'Path', value: asset.path },
      { label: 'Last Modified', value: new Date(asset.lastModified).toLocaleString() }
    ];
    
    for (const row of rows) {
      const tr = document.createElement('tr');
      
      const th = document.createElement('th');
      th.textContent = row.label;
      tr.appendChild(th);
      
      const td = document.createElement('td');
      td.textContent = row.value;
      tr.appendChild(td);
      
      table.appendChild(tr);
    }
    
    content.appendChild(table);
    dialog.appendChild(content);
    
    // Create footer with buttons
    const footer = document.createElement('div');
    footer.className = 'viewer-footer';
    
    // Add open in external app button
    const openButton = document.createElement('button');
    openButton.className = 'viewer-button';
    openButton.textContent = 'Open in Default App';
    openButton.addEventListener('click', () => {
      // Open file in default application
      const filePath = path.join(this.app.project.path, asset.path);
      require('nw.gui').Shell.openItem(filePath);
    });
    footer.appendChild(openButton);
    
    dialog.appendChild(footer);
    
    // Add to document body
    document.body.appendChild(dialog);
  }
  
  /**
   * Show context menu for an asset
   * @param {MouseEvent} e - Mouse event
   * @param {object} asset - Asset
   */
  showContextMenu(e, asset) {
    // Create context menu
    const menu = new (require('nw.gui').Menu)();
    
    // Add menu items
    
    // Open
    menu.append(new (require('nw.gui').MenuItem)({
      label: 'Open',
      click: () => {
        this.openAsset(asset);
      }
    }));
    
    // Add separator
    menu.append(new (require('nw.gui').MenuItem)({ type: 'separator' }));
    
    // Rename
    menu.append(new (require('nw.gui').MenuItem)({
      label: 'Rename',
      click: () => {
        this.renameAsset(asset);
      }
    }));
    
    // Delete
    menu.append(new (require('nw.gui').MenuItem)({
      label: 'Delete',
      click: () => {
        this.selectedAsset = asset.id;
        this.deleteSelectedAsset();
      }
    }));
    
    // Add type-specific menu items
    if (asset.type === 'image') {
      menu.append(new (require('nw.gui').MenuItem)({ type: 'separator' }));
      
      // Set as Background
      menu.append(new (require('nw.gui').MenuItem)({
        label: 'Set as Background',
        click: () => {
          this.app.core.events.emit('scene:setBackground', asset);
        }
      }));
      
      // Create Sprite
      menu.append(new (require('nw.gui').MenuItem)({
        label: 'Create Sprite',
        click: () => {
          this.app.core.events.emit('object:create', { type: 'sprite', asset });
        }
      }));
    }
    
    // Popup at mouse position
    menu.popup(e.clientX, e.clientY);
  }
  
  /**
   * Load an image preview
   * @param {object} asset - Image asset
   * @returns {Promise<string>} Image URL
   */
  async loadImagePreview(asset) {
    // Check cache first
    if (this.previewImageCache[asset.id]) {
      return this.previewImageCache[asset.id];
    }
    
    try {
      // Load image from filesystem
      const filePath = path.join(this.app.project.path, asset.path);
      const data = await this.app.core.fs.readFile(filePath);
      
      // Convert to data URL
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      
      // Cache the URL
      this.previewImageCache[asset.id] = url;
      
      return url;
    } catch (error) {
      console.error('Error loading image preview:', error);
      return null;
    }
  }
  
  /**
   * Format a file size
   * @param {number} size - Size in bytes
   * @returns {string} Formatted size
   */
  formatSize(size) {
    if (size === undefined || size === null) return '--';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let displaySize = size;
    
    while (displaySize >= 1024 && unitIndex < units.length - 1) {
      displaySize /= 1024;
      unitIndex++;
    }
    
    return `${displaySize.toFixed(1)} ${units[unitIndex]}`;
  }
  
  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} Extension with dot
   */
  getExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
  }
  
  /**
   * Get the appropriate editor for a script file
   * @param {object} asset - Script asset
   * @returns {string} Editor name
   */
  getEditorForScript(asset) {
    const extension = this.getExtension(asset.name);
    
    switch (extension) {
      case '.lua':
        return 'luaEditor';
      case '.moon':
        return 'moonEditor';
      case '.js':
        return 'jsEditor';
      default:
        return 'codeEditor';
    }
  }
  
  /**
   * Get the appropriate editor for a file extension
   * @param {string} extension - File extension with dot
   * @returns {string|null} Editor name or null if no editor
   */
  getEditorForExtension(extension) {
    // Text files
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv'];
    if (textExtensions.includes(extension)) {
      return 'textEditor';
    }
    
    // Script files
    const scriptExtensions = ['.lua', '.moon', '.js'];
    if (scriptExtensions.includes(extension)) {
      return this.getEditorForScript({ name: `file${extension}` });
    }
    
    // No editor for other types
    return null;
  }
  
  /**
   * Get human-readable file type description
   * @param {object} asset - Asset
   * @returns {string} Type description
   */
  getFileTypeDescription(asset) {
    // Special case for folders
    if (asset.type === 'folder') {
      return 'Folder';
    }
    
    const extension = this.getExtension(asset.name);
    
    const typeMap = {
      // Images
      '.png': 'PNG Image',
      '.jpg': 'JPEG Image',
      '.jpeg': 'JPEG Image',
      '.gif': 'GIF Image',
      '.bmp': 'Bitmap Image',
      
      // Audio
      '.mp3': 'MP3 Audio',
      '.wav': 'WAV Audio',
      '.ogg': 'OGG Audio',
      
      // Fonts
      '.ttf': 'TrueType Font',
      '.otf': 'OpenType Font',
      
      // Scripts
      '.lua': 'Lua Script',
      '.moon': 'MoonScript File',
      '.js': 'JavaScript File',
      
      // Data
      '.json': 'JSON Data',
      '.xml': 'XML Data',
      '.csv': 'CSV Data',
      
      // Text
      '.txt': 'Text File',
      '.md': 'Markdown File'
    };
    
    return typeMap[extension] || `${extension.substr(1).toUpperCase()} File`;
  }
  
  // Event Handlers
  
  /**
   * Handle import asset event
   * @param {object} asset - Asset data
   */
  onImportAsset(asset) {
    // Add asset to list
    this.assets.push(asset);
    
    // Re-render assets
    this.renderAssets();
    
    // Select the new asset
    this.selectedAsset = asset.id;
  }
  
  /**
   * Handle delete asset event
   * @param {string} assetId - Asset ID
   */
  onDeleteAsset(assetId) {
    // Remove from assets list
    this.assets = this.assets.filter(a => a.id !== assetId);
    
    // Clear selection if this was the selected asset
    if (this.selectedAsset === assetId) {
      this.selectedAsset = null;
    }
    
    // Re-render assets
    this.renderAssets();
  }
  
  /**
   * Handle rename asset event
   * @param {object} data - Rename data
   */
  onRenameAsset({ asset, oldPath, newPath }) {
    // Find the asset in the list
    const targetAsset = this.assets.find(a => a.id === asset.id);
    
    if (targetAsset) {
      // Update the asset
      targetAsset.name = asset.name;
      targetAsset.path = newPath;
      
      // Re-render assets
      this.renderAssets();
    }
  }
  
  /**
   * Handle select asset event
   * @param {string} assetId - Asset ID
   */
  onSelectAsset(assetId) {
    // Set selected asset
    this.selectedAsset = assetId;
    
    // Update UI
    this.renderAssets();
  }
  
  /**
   * Handle project loaded event
   * @param {object} project - Project data
   */
  onProjectLoaded(project) {
    // Set assets from project
    this.assets = project.assets || [];
    
    // Reset state
    this.selectedAsset = null;
    this.currentPath = '';
    
    // Clear cache
    this.previewImageCache = {};
    
    // Re-render assets
    this.renderAssets();
  }
  
  /**
   * Get project data for saving
   * @returns {object} Asset browser data
   */
  getProjectData() {
    return {
      viewMode: this.viewMode,
      sortBy: this.sortBy,
      sortAsc: this.sortAsc
    };
  }
}

// Export the AssetBrowser class
module.exports = AssetBrowser;