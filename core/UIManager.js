// core/UIManager.js - Manages the application UI

/**
 * UI Manager - Creates and manages the application UI
 * Implements a Unity-like interface with dockable panels and a scene hierarchy
 */
class UIManager {
    /**
     * Create a new UI Manager
     * @param {object} app - Reference to the main application
     */
    constructor(app) {
      this.app = app;
      this.panels = {};
      this.layout = null;
      this.menuItems = [];
      this.modalStack = [];
      this.dragging = null;
      
      // Bind event handlers
      this.onWindowResize = this.onWindowResize.bind(this);
      this.onPanelDragStart = this.onPanelDragStart.bind(this);
      this.onPanelDragMove = this.onPanelDragMove.bind(this);
      this.onPanelDragEnd = this.onPanelDragEnd.bind(this);
    }
    
    /**
     * Initialize the UI Manager
     */
    initialize() {
      // Create layout container
      this.container = document.getElementById('app-container') || document.body;
      
      // Add event listeners
      window.addEventListener('resize', this.onWindowResize);
      
      // Load theme
      this.loadTheme(this.app.core.config.get('theme', 'light'));
      
      console.log('UI Manager initialized');
    }
    
    /**
     * Create the main application layout
     */
    createLayout() {
      // Clear existing content
      this.container.innerHTML = '';
      
      // Create main layout elements
      this.createMainMenu();
      this.createToolbar();
      this.createMainContainer();
      this.createStatusBar();
      
      // Create default panels
      this.createDefaultPanels();
      
      // Apply layout from saved configuration
      this.applyLayout(this.app.core.config.get('layout'));
      
      console.log('UI Layout created');
    }
    
    /**
     * Create the main menu bar
     */
    createMainMenu() {
      const menuBar = document.createElement('div');
      menuBar.className = 'menu-bar';
      this.container.appendChild(menuBar);
      
      // Store reference
      this.menuBar = menuBar;
    }
    
    /**
     * Create the toolbar
     */
    createToolbar() {
      const toolbar = document.createElement('div');
      toolbar.className = 'toolbar';
      this.container.appendChild(toolbar);
      
      // Add play/pause/stop buttons
      const playButton = document.createElement('button');
      playButton.className = 'toolbar-button play-button';
      playButton.innerHTML = '<i class="icon-play"></i>';
      playButton.title = 'Play (F5)';
      playButton.addEventListener('click', () => {
        this.app.core.events.emit('project:test');
      });
      
      const pauseButton = document.createElement('button');
      pauseButton.className = 'toolbar-button pause-button';
      pauseButton.innerHTML = '<i class="icon-pause"></i>';
      pauseButton.title = 'Pause';
      pauseButton.addEventListener('click', () => {
        this.app.core.events.emit('project:pause');
      });
      
      const stopButton = document.createElement('button');
      stopButton.className = 'toolbar-button stop-button';
      stopButton.innerHTML = '<i class="icon-stop"></i>';
      stopButton.title = 'Stop';
      stopButton.addEventListener('click', () => {
        this.app.core.events.emit('project:stop');
      });
      
      toolbar.appendChild(playButton);
      toolbar.appendChild(pauseButton);
      toolbar.appendChild(stopButton);
      
      // Store reference
      this.toolbar = toolbar;
    }
    
    /**
     * Create the main container for panels
     */
    createMainContainer() {
      const mainContainer = document.createElement('div');
      mainContainer.className = 'main-container';
      this.container.appendChild(mainContainer);
      
      // Store reference
      this.mainContainer = mainContainer;
    }
    
    /**
     * Create the status bar
     */
    createStatusBar() {
      const statusBar = document.createElement('div');
      statusBar.className = 'status-bar';
      this.container.appendChild(statusBar);
      
      // Create status sections
      const leftSection = document.createElement('div');
      leftSection.className = 'status-section left';
      
      const centerSection = document.createElement('div');
      centerSection.className = 'status-section center';
      
      const rightSection = document.createElement('div');
      rightSection.className = 'status-section right';
      
      statusBar.appendChild(leftSection);
      statusBar.appendChild(centerSection);
      statusBar.appendChild(rightSection);
      
      // Store references
      this.statusBar = statusBar;
      this.statusLeft = leftSection;
      this.statusCenter = centerSection;
      this.statusRight = rightSection;
      
      // Set default status
      this.setStatus('Ready');
    }
    
    /**
     * Create default panels for the UI
     */
    createDefaultPanels() {
      // Create Scene Hierarchy panel (left side)
      this.createPanel('hierarchy', 'Hierarchy', 'left', {
        width: 250,
        minWidth: 150
      });
      
      // Create Inspector panel (right side)
      this.createPanel('inspector', 'Inspector', 'right', {
        width: 300,
        minWidth: 200
      });
      
      // Create Project panel (bottom)
      this.createPanel('project', 'Project', 'bottom', {
        height: 250,
        minHeight: 100
      });
      
      // Create Console panel (bottom)
      this.createPanel('console', 'Console', 'bottom', {
        height: 250,
        minHeight: 100
      });
      
      // Create Scene panel (center)
      this.createPanel('scene', 'Scene', 'center');
      
      // Create Game panel (center, tab)
      this.createPanel('game', 'Game', 'center');
    }
    
    /**
     * Create a panel
     * @param {string} id - Unique panel identifier
     * @param {string} title - Panel title
     * @param {string} region - Panel region ('left', 'right', 'top', 'bottom', 'center')
     * @param {object} [options={}] - Additional panel options
     * @returns {HTMLElement} The created panel
     */
    createPanel(id, title, region, options = {}) {
      // Check if panel with this ID already exists
      if (this.panels[id]) {
        console.warn(`Panel with ID '${id}' already exists`);
        return this.panels[id].element;
      }
      
      // Create panel container
      const panelContainer = document.createElement('div');
      panelContainer.className = `panel-container ${region}`;
      panelContainer.id = `panel-${id}`;
      
      // Set dimensions
      if (options.width) {
        panelContainer.style.width = `${options.width}px`;
      }
      if (options.height) {
        panelContainer.style.height = `${options.height}px`;
      }
      
      // Create panel header
      const header = document.createElement('div');
      header.className = 'panel-header';
      
      // Add panel title
      const titleElement = document.createElement('div');
      titleElement.className = 'panel-title';
      titleElement.textContent = title;
      header.appendChild(titleElement);
      
      // Add panel controls
      const controls = document.createElement('div');
      controls.className = 'panel-controls';
      
      // Add minimize button
      const minimizeButton = document.createElement('button');
      minimizeButton.className = 'panel-button minimize';
      minimizeButton.innerHTML = '−';
      minimizeButton.title = 'Minimize';
      minimizeButton.addEventListener('click', () => this.togglePanelMinimized(id));
      controls.appendChild(minimizeButton);
      
      // Add maximize button
      const maximizeButton = document.createElement('button');
      maximizeButton.className = 'panel-button maximize';
      maximizeButton.innerHTML = '□';
      maximizeButton.title = 'Maximize';
      maximizeButton.addEventListener('click', () => this.togglePanelMaximized(id));
      controls.appendChild(maximizeButton);
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.className = 'panel-button close';
      closeButton.innerHTML = '×';
      closeButton.title = 'Close';
      closeButton.addEventListener('click', () => this.hidePanel(id));
      controls.appendChild(closeButton);
      
      header.appendChild(controls);
      panelContainer.appendChild(header);
      
      // Make header draggable for moving panels
      header.addEventListener('mousedown', (e) => {
        // Only handle left mouse button
        if (e.button !== 0) return;
        
        // Prevent text selection during drag
        e.preventDefault();
        
        this.onPanelDragStart(e, id);
      });
      
      // Create panel content
      const content = document.createElement('div');
      content.className = 'panel-content';
      panelContainer.appendChild(content);
      
      // Create panel resize handles
      this.createResizeHandles(panelContainer, region, options);
      
      // Add to main container based on region
      if (region === 'center') {
        // Center panels go in the center container
        let centerContainer = document.querySelector('.center-container');
        
        if (!centerContainer) {
          centerContainer = document.createElement('div');
          centerContainer.className = 'center-container';
          this.mainContainer.appendChild(centerContainer);
        }
        
        centerContainer.appendChild(panelContainer);
      } else {
        // Other panels go in their respective regions
        const regionContainer = document.querySelector(`.${region}-container`) || this.createRegionContainer(region);
        regionContainer.appendChild(panelContainer);
      }
      
      // Store panel information
      this.panels[id] = {
        id: id,
        title: title,
        region: region,
        element: panelContainer,
        header: header,
        content: content,
        visible: true,
        minimized: false,
        maximized: false,
        options: options
      };
      
      return panelContainer;
    }
    
    /**
     * Create a container for a specific region
     * @param {string} region - Region name ('left', 'right', 'top', 'bottom')
     * @returns {HTMLElement} The created container
     */
    createRegionContainer(region) {
      const container = document.createElement('div');
      container.className = `${region}-container`;
      this.mainContainer.appendChild(container);
      return container;
    }
    
    /**
     * Create resize handles for a panel
     * @param {HTMLElement} panelContainer - Panel container element
     * @param {string} region - Panel region
     * @param {object} options - Panel options
     */
    createResizeHandles(panelContainer, region, options) {
      // Only add resize handles for side panels
      if (['left', 'right', 'top', 'bottom'].includes(region)) {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${region}`;
        
        // Set appropriate cursor based on region
        if (region === 'left' || region === 'right') {
          handle.style.cursor = 'ew-resize';
        } else {
          handle.style.cursor = 'ns-resize';
        }
        
        // Add event listeners for resizing
        handle.addEventListener('mousedown', (e) => {
          // Only handle left mouse button
          if (e.button !== 0) return;
          
          // Prevent text selection during resize
          e.preventDefault();
          
          // Start resize operation
          this.startResize(e, panelContainer, region, options);
        });
        
        panelContainer.appendChild(handle);
      }
    }
    
    /**
     * Start panel resize operation
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} panel - Panel element
     * @param {string} region - Panel region
     * @param {object} options - Panel options
     */
    startResize(e, panel, region, options) {
      // Store initial size and mouse position
      const initialMouseX = e.clientX;
      const initialMouseY = e.clientY;
      const initialWidth = panel.offsetWidth;
      const initialHeight = panel.offsetHeight;
      
      // Create a function to handle mouse move during resize
      const onMouseMove = (moveEvent) => {
        // Calculate delta
        const deltaX = moveEvent.clientX - initialMouseX;
        const deltaY = moveEvent.clientY - initialMouseY;
        
        // Apply size change based on region
        if (region === 'left') {
          const newWidth = initialWidth + deltaX;
          if (newWidth >= (options.minWidth || 100)) {
            panel.style.width = `${newWidth}px`;
          }
        } else if (region === 'right') {
          const newWidth = initialWidth - deltaX;
          if (newWidth >= (options.minWidth || 100)) {
            panel.style.width = `${newWidth}px`;
          }
        } else if (region === 'top') {
          const newHeight = initialHeight + deltaY;
          if (newHeight >= (options.minHeight || 50)) {
            panel.style.height = `${newHeight}px`;
          }
        } else if (region === 'bottom') {
          const newHeight = initialHeight - deltaY;
          if (newHeight >= (options.minHeight || 50)) {
            panel.style.height = `${newHeight}px`;
          }
        }
      };
      
      // Create a function to handle mouse up to end resize
      const onMouseUp = () => {
        // Remove event listeners
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // Save the new layout
        this.saveLayout();
      };
      
      // Add event listeners
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
    
    /**
     * Set up the main menu
     */
    setupMainMenu() {
      // Clear existing menu
      this.menuBar.innerHTML = '';
      
      // Create File menu
      this.addMenuItem('File', [
        { label: 'New Project...', action: 'project:new', shortcut: 'Ctrl+N' },
        { label: 'Open Project...', action: 'project:open', shortcut: 'Ctrl+O' },
        { label: 'Save Project', action: 'project:save', shortcut: 'Ctrl+S' },
        { label: 'Save Project As...', action: 'project:saveas', shortcut: 'Ctrl+Shift+S' },
        { type: 'separator' },
        { label: 'Import...', action: 'project:import' },
        { label: 'Export...', action: 'project:export' },
        { type: 'separator' },
        { label: 'Exit', action: 'app:exit', shortcut: 'Alt+F4' }
      ]);
      
      // Create Edit menu
      this.addMenuItem('Edit', [
        { label: 'Undo', action: 'edit:undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', action: 'edit:redo', shortcut: 'Ctrl+Y' },
        { type: 'separator' },
        { label: 'Cut', action: 'edit:cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', action: 'edit:copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', action: 'edit:paste', shortcut: 'Ctrl+V' },
        { label: 'Delete', action: 'edit:delete', shortcut: 'Delete' },
        { type: 'separator' },
        { label: 'Select All', action: 'edit:selectall', shortcut: 'Ctrl+A' },
        { type: 'separator' },
        { label: 'Preferences...', action: 'edit:preferences' }
      ]);
      
      // Create View menu
      this.addMenuItem('View', [
        { label: 'Scene', action: 'editor:change', params: ['sceneEditor'] },
        { label: 'Game', action: 'editor:change', params: ['gameEditor'] },
        { type: 'separator' },
        { label: 'Hierarchy', action: 'panel:toggle', params: ['hierarchy'], checkable: true, checked: true },
        { label: 'Inspector', action: 'panel:toggle', params: ['inspector'], checkable: true, checked: true },
        { label: 'Project', action: 'panel:toggle', params: ['project'], checkable: true, checked: true },
        { label: 'Console', action: 'panel:toggle', params: ['console'], checkable: true, checked: true },
        { type: 'separator' },
        { label: 'Reset Layout', action: 'layout:reset' }
      ]);
      
      // Create Project menu
      this.addMenuItem('Project', [
        { label: 'Build', action: 'project:build', shortcut: 'Ctrl+B' },
        { label: 'Run', action: 'project:test', shortcut: 'F5' },
        { type: 'separator' },
        { label: 'Project Settings...', action: 'project:settings' }
      ]);
      
      // Create Help menu
      this.addMenuItem('Help', [
        { label: 'Documentation', action: 'help:docs' },
        { label: 'About', action: 'help:about' }
      ]);
    }
    
    /**
     * Add a menu item
     * @param {string} label - Menu label
     * @param {Array} items - Submenu items
     */
    addMenuItem(label, items) {
      // Create menu item
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.textContent = label;
      
      // Create dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';
      
      // Add items to dropdown
      for (const item of items) {
        if (item.type === 'separator') {
          // Add separator
          const separator = document.createElement('div');
          separator.className = 'menu-separator';
          dropdown.appendChild(separator);
        } else {
          // Add regular item
          const menuEntry = document.createElement('div');
          menuEntry.className = 'menu-entry';
          
          // Create label
          const itemLabel = document.createElement('span');
          itemLabel.className = 'menu-label';
          itemLabel.textContent = item.label;
          menuEntry.appendChild(itemLabel);
          
          // Add shortcut if exists
          if (item.shortcut) {
            const shortcut = document.createElement('span');
            shortcut.className = 'menu-shortcut';
            shortcut.textContent = item.shortcut;
            menuEntry.appendChild(shortcut);
          }
          
          // Add checkbox if checkable
          if (item.checkable) {
            menuEntry.classList.add('checkable');
            if (item.checked) {
              menuEntry.classList.add('checked');
            }
          }
          
          // Add click handler
          menuEntry.addEventListener('click', () => {
            if (item.action) {
              this.app.core.events.emit(item.action, ...(item.params || []));
              
              // Toggle checked state for checkable items
              if (item.checkable) {
                menuEntry.classList.toggle('checked');
              }
            }
            
            // Hide dropdown after click
            dropdown.classList.remove('visible');
          });
          
          dropdown.appendChild(menuEntry);
        }
      }
      
      // Add dropdown to menu item
      menuItem.appendChild(dropdown);
      
      // Add menu item to menu bar
      this.menuBar.appendChild(menuItem);
      
      // Toggle dropdown visibility on click
      menuItem.addEventListener('click', () => {
        // Close all other dropdowns
        const dropdowns = this.menuBar.querySelectorAll('.menu-dropdown');
        dropdowns.forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('visible');
          }
        });
        
        // Toggle this dropdown
        dropdown.classList.toggle('visible');
      });
      
      // Add to menu items array
      this.menuItems.push({
        label: label,
        element: menuItem,
        dropdown: dropdown,
        items: items
      });
    }
    
    /**
     * Get panel content element
     * @param {string} id - Panel ID
     * @returns {HTMLElement|null} Panel content element or null if not found
     */
    getPanelContent(id) {
      if (!this.panels[id]) {
        console.warn(`Panel with ID '${id}' not found`);
        return null;
      }
      
      return this.panels[id].content;
    }
    
    /**
     * Set panel content
     * @param {string} id - Panel ID
     * @param {HTMLElement|string} content - Panel content (element or HTML string)
     */
    setPanelContent(id, content) {
      const panel = this.panels[id];
      
      if (!panel) {
        console.warn(`Panel with ID '${id}' not found`);
        return;
      }
      
      // Clear existing content
      panel.content.innerHTML = '';
      
      // Add new content
      if (typeof content === 'string') {
        panel.content.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        panel.content.appendChild(content);
      }
    }
    
    /**
     * Show a panel
     * @param {string} id - Panel ID
     */
    showPanel(id) {
      const panel = this.panels[id];
      
      if (!panel) {
        console.warn(`Panel with ID '${id}' not found`);
        return;
      }
      
      panel.element.style.display = '';
      panel.visible = true;
      
      // Update menu item checked state if it exists
      this.updatePanelMenuState(id, true);
      
      // Save layout
      this.saveLayout();
    }
    
    /**
     * Hide a panel
     * @param {string} id - Panel ID
     */
    hidePanel(id) {
      const panel = this.panels[id];
      
      if (!panel) {
        console.warn(`Panel with ID '${id}' not found`);
        return;
      }
      
      panel.element.style.display = 'none';
      panel.visible = false;
      
      // Update menu item checked state if it exists
      this.updatePanelMenuState(id, false);
      
      // Save layout
      this.saveLayout();
    }
    
    /**
     * Toggle panel visibility
     * @param {string} id - Panel ID
     * @returns {boolean} New visibility state
     */
    togglePanel(id) {
      const panel = this.panels[id];
      
      if (!panel) {
        console.warn(`Panel with ID '${id}' not found`);
        return false;
      }
      
      if (panel.visible) {
        this.hidePanel(id);
        return false;
      } else {
        this.showPanel(id);
        return true;
      }
    }
    
    /**
     * Toggle panel minimized state
     * @param {string} id - Panel ID
     * @returns {boolean} New minimized state
     */
    togglePanelMinimized(id) {
      const panel = this.panels[id];
      
      if (!panel) {
        console.warn(`Panel with ID '${id}' not found`);
        return false;
      }
      
      // Toggle minimized state
      panel.minimized = !panel.minimized;
      
      // Update panel appearance
      if (panel.minimized) {
        panel.content.style.display = 'none';
        panel.element.classList.add('minimized');
      } else {
        panel.content.style.display = '';
        panel.element.classList.remove('minimized');
      }
      
      // Cannot be minimized and maximized at the same time
      if (panel.minimized && panel.maximized) {
        this.togglePanelMaximized(id);
      }
      
      // Save layout
      this.saveLayout();
      
      return panel.minimized;
    }
    
    /**
     * Toggle panel maximized state
     * @param {string} id - Panel ID
     * @returns {boolean} New maximized state
     */
    togglePanelMaximized(id) {
      const panel = this.panels[id];
      
      if (!panel) {
        console.warn(`Panel with ID '${id}' not found`);
        return false;
      }
      
      // Toggle maximized state
      panel.maximized = !panel.maximized;
      
      // Update panel appearance
      if (panel.maximized) {
        panel.element.classList.add('maximized');
        
        // Hide other panels temporarily
        for (const panelId in this.panels) {
          if (panelId !== id && this.panels[panelId].visible) {
            this.panels[panelId].element.style.display = 'none';
            this.panels[panelId].wasVisible = true;
          }
        }
      } else {
        panel.element.classList.remove('maximized');
        
        // Restore other panels
        for (const panelId in this.panels) {
          if (panelId !== id && this.panels[panelId].wasVisible) {
            this.panels[panelId].element.style.display = '';
            delete this.panels[panelId].wasVisible;
          }
        }
      }
      
      // Cannot be minimized and maximized at the same time
      if (panel.maximized && panel.minimized) {
        this.togglePanelMinimized(id);
      }
      
      // Save layout
      this.saveLayout();
      
      return panel.maximized;
    }
    
    /**
     * Update the checked state of a panel's menu item
     * @param {string} id - Panel ID
     * @param {boolean} checked - Checked state
     */
    updatePanelMenuState(id, checked) {
      // Find the menu item for this panel
      for (const menuItem of this.menuItems) {
        if (menuItem.label === 'View') {
          // Look for the panel item in this menu
          const items = menuItem.dropdown.querySelectorAll('.menu-entry');
          
          for (const item of items) {
            const label = item.querySelector('.menu-label');
            
            if (label && label.textContent.toLowerCase() === this.panels[id].title.toLowerCase()) {
              if (checked) {
                item.classList.add('checked');
              } else {
                item.classList.remove('checked');
              }
              break;
            }
          }
          
          break;
        }
      }
    }
    
    /**
     * Save the current layout configuration
     */
    saveLayout() {
      // Create layout object
      const layout = {
        panels: {}
      };
      
      // Save panel information
      for (const id in this.panels) {
        const panel = this.panels[id];
        
        layout.panels[id] = {
          visible: panel.visible,
          minimized: panel.minimized,
          maximized: panel.maximized,
          region: panel.region,
          width: panel.element.offsetWidth,
          height: panel.element.offsetHeight
        };
      }
      
      // Save layout to configuration
      this.app.core.config.set('layout', layout);
      this.app.core.config.save();
      
      // Store current layout
      this.layout = layout;
    }
    
    /**
     * Apply a layout configuration
     * @param {object} layout - Layout configuration
     */
    applyLayout(layout) {
      if (!layout || !layout.panels) {
        return;
      }
      
      // Apply panel configurations
      for (const id in layout.panels) {
        const panelConfig = layout.panels[id];
        const panel = this.panels[id];
        
        if (!panel) continue;
        
        // Apply visibility
        if (panelConfig.visible === false) {
          panel.element.style.display = 'none';
          panel.visible = false;
        } else {
          panel.element.style.display = '';
          panel.visible = true;
        }
        
        // Apply minimized state
        if (panelConfig.minimized) {
          panel.content.style.display = 'none';
          panel.element.classList.add('minimized');
          panel.minimized = true;
        } else {
          panel.content.style.display = '';
          panel.element.classList.remove('minimized');
          panel.minimized = false;
        }
        
        // Apply maximized state
        if (panelConfig.maximized) {
          panel.element.classList.add('maximized');
          panel.maximized = true;
          
          // Hide other panels temporarily
          for (const otherId in this.panels) {
            if (otherId !== id && this.panels[otherId].visible) {
              this.panels[otherId].element.style.display = 'none';
              this.panels[otherId].wasVisible = true;
            }
          }
        }
        
        // Apply dimensions if specified
        if (panelConfig.width && panel.region !== 'center') {
          panel.element.style.width = `${panelConfig.width}px`;
        }
        
        if (panelConfig.height && panel.region !== 'center') {
          panel.element.style.height = `${panelConfig.height}px`;
        }
      }
      
      // Store current layout
      this.layout = layout;
    }
    
    /**
     * Reset the layout to default
     */
    resetLayout() {
      // Hide all panels first
      for (const id in this.panels) {
        this.panels[id].element.style.display = 'none';
        this.panels[id].visible = false;
        this.panels[id].minimized = false;
        this.panels[id].maximized = false;
        this.panels[id].element.classList.remove('minimized', 'maximized');
        this.panels[id].content.style.display = '';
        
        // Reset dimensions to default
        if (this.panels[id].options.width) {
          this.panels[id].element.style.width = `${this.panels[id].options.width}px`;
        } else {
          this.panels[id].element.style.width = '';
        }
        
        if (this.panels[id].options.height) {
          this.panels[id].element.style.height = `${this.panels[id].options.height}px`;
        } else {
          this.panels[id].element.style.height = '';
        }
      }
      
      // Show default panels
      this.showPanel('hierarchy');
      this.showPanel('inspector');
      this.showPanel('project');
      this.showPanel('console');
      this.showPanel('scene');
      
      // Save the new default layout
      this.saveLayout();
    }
  
    /**
     * Set status message
     * @param {string} message - Status message
     * @param {string} [type='info'] - Message type ('info', 'warning', 'error')
     */
    setStatus(message, type = 'info') {
      this.statusLeft.textContent = message;
      
      // Remove existing status classes
      this.statusLeft.classList.remove('info', 'warning', 'error');
      
      // Add appropriate class
      this.statusLeft.classList.add(type);
    }
    
    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} [type='info'] - Notification type ('info', 'success', 'warning', 'error')
     * @param {number} [duration=3000] - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.classList.add('visible');
      }, 10);
      
      // Animate out after duration
      setTimeout(() => {
        notification.classList.remove('visible');
        
        // Remove from DOM after animation
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, duration);
    }
    
    /**
     * Show an error message dialog
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @returns {Promise<void>} Promise that resolves when dialog is closed
     */
    showError(title, message) {
      return this.showDialog({
        title: title,
        message: message,
        type: 'error',
        buttons: ['OK']
      });
    }
    
    /**
     * Show a confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Array<string>} [buttons=['Cancel', 'OK']] - Button labels
     * @returns {Promise<string>} Promise that resolves with the selected button
     */
    showConfirmDialog(title, message, buttons = ['Cancel', 'OK']) {
      return this.showDialog({
        title: title,
        message: message,
        type: 'question',
        buttons: buttons
      });
    }
    
    /**
     * Show a dialog
     * @param {object} options - Dialog options
     * @returns {Promise<string>} Promise that resolves with the selected button
     */
    showDialog(options) {
      return new Promise((resolve) => {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = `dialog ${options.type || 'info'}`;
        
        // Create dialog header
        const header = document.createElement('div');
        header.className = 'dialog-header';
        header.textContent = options.title || 'Message';
        dialog.appendChild(header);
        
        // Create dialog content
        const content = document.createElement('div');
        content.className = 'dialog-content';
        content.textContent = options.message || '';
        dialog.appendChild(content);
        
        // Create dialog footer with buttons
        const footer = document.createElement('div');
        footer.className = 'dialog-footer';
        
        const buttons = options.buttons || ['OK'];
        
        for (const buttonLabel of buttons) {
          const button = document.createElement('button');
          button.className = 'dialog-button';
          button.textContent = buttonLabel;
          
          button.addEventListener('click', () => {
            // Remove modal
            document.body.removeChild(modal);
            
            // Remove from modal stack
            this.modalStack.pop();
            
            // Resolve with button label
            resolve(buttonLabel);
          });
          
          footer.appendChild(button);
        }
        
        dialog.appendChild(footer);
        modal.appendChild(dialog);
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add to modal stack
        this.modalStack.push(modal);
        
        // Focus the last button (usually the primary action)
        const dialogButtons  = footer.querySelectorAll('button');
        if (dialogButtons .length > 0) {
          dialogButtons [dialogButtons .length - 1].focus();
        }
        
        // Add keyboard handler for Esc key
        const keyHandler = (e) => {
          if (e.key === 'Escape') {
            document.removeEventListener('keydown', keyHandler);
            
            // Simulate click on first button (usually Cancel)
            const firstButton = footer.querySelector('button');
            if (firstButton) {
              firstButton.click();
            }
          }
        };
        
        document.addEventListener('keydown', keyHandler);
      });
    }
    
    /**
     * Show a file dialog
     * @param {object} options - Dialog options
     * @returns {Promise<string>} Promise that resolves with the selected file path
     */
    showFileDialog(options) {
      // This is a mock implementation for a file dialog
      // In a real NW.js application, we would use the native file dialog
      
      return new Promise((resolve, reject) => {
        try {
          // Use NW.js file dialog if available
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          
          // Set accept attribute if file types are specified
          if (options.fileTypes) {
            fileInput.accept = options.fileTypes.join(',');
          }
          
          // Set directory attribute if selecting directories
          if (options.directories) {
            fileInput.webkitdirectory = true;
          }
          
          // Set multiple attribute if selecting multiple files
          if (options.multiple) {
            fileInput.multiple = true;
          }
          
          // Handle file selection
          fileInput.addEventListener('change', () => {
            const files = fileInput.files;
            
            if (files.length === 0) {
              resolve(null);
            } else if (options.multiple) {
              // Return array of paths for multiple selection
              const paths = Array.from(files).map(file => file.path);
              resolve(paths);
            } else {
              // Return single path
              resolve(files[0].path);
            }
          });
          
          // Trigger file dialog
          fileInput.click();
        } catch (err) {
          reject(err);
        }
      });
    }
    
    /**
     * Show a save dialog
     * @param {object} options - Dialog options
     * @returns {Promise<string>} Promise that resolves with the selected save path
     */
    showSaveDialog(options) {
      // This is a mock implementation for a save dialog
      // In a real NW.js application, we would use the native save dialog
      
      return new Promise((resolve, reject) => {
        try {
          // Use a simplified dialog for now
          const filename = prompt(options.message || 'Enter file name:', options.defaultPath || '');
          
          if (!filename) {
            resolve(null);
          } else {
            resolve(filename);
          }
        } catch (err) {
          reject(err);
        }
      });
    }
    
    /**
     * Load a theme
     * @param {string} theme - Theme name
     */
    loadTheme(theme) {
      // Remove any existing theme classes
      document.body.classList.remove('theme-light', 'theme-dark');
      
      // Add theme class
      document.body.classList.add(`theme-${theme}`);
      
      // Store in configuration
      this.app.core.config.set('theme', theme);
      this.app.core.config.save();
      
      console.log(`Theme set to ${theme}`);
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
      // Save window size to config
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      this.app.core.config.set('windowState.width', width);
      this.app.core.config.set('windowState.height', height);
      this.app.core.config.save();
    }
    
    /**
     * Handle panel drag start
     * @param {MouseEvent} e - Mouse event
     * @param {string} panelId - Panel ID
     */
    onPanelDragStart(e, panelId) {
      const panel = this.panels[panelId];
      
      if (!panel) return;
      
      // Set dragging state
      this.dragging = {
        panelId: panelId,
        panel: panel,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - panel.element.getBoundingClientRect().left,
        offsetY: e.clientY - panel.element.getBoundingClientRect().top,
        originalRegion: panel.region
      };
      
      // Add drag overlay
      const overlay = document.createElement('div');
      overlay.className = 'drag-overlay';
      document.body.appendChild(overlay);
      this.dragging.overlay = overlay;
      
      // Create drag preview
      const preview = document.createElement('div');
      preview.className = 'drag-preview';
      preview.textContent = panel.title;
      document.body.appendChild(preview);
      this.dragging.preview = preview;
      
      // Position preview
      preview.style.left = `${e.clientX - this.dragging.offsetX}px`;
      preview.style.top = `${e.clientY - this.dragging.offsetY}px`;
      preview.style.width = `${panel.element.offsetWidth}px`;
      preview.style.height = `${panel.element.offsetHeight}px`;
      
      // Add event listeners
      document.addEventListener('mousemove', this.onPanelDragMove);
      document.addEventListener('mouseup', this.onPanelDragEnd);
      
      // Prevent default behavior
      e.preventDefault();
    }
    
    /**
     * Handle panel drag move
     * @param {MouseEvent} e - Mouse event
     */
    onPanelDragMove(e) {
      if (!this.dragging) return;
      
      // Update preview position
      this.dragging.preview.style.left = `${e.clientX - this.dragging.offsetX}px`;
      this.dragging.preview.style.top = `${e.clientY - this.dragging.offsetY}px`;
      
      // Determine drop target region
      const targetRegion = this.getDropRegion(e.clientX, e.clientY);
      
      // Highlight drop region
      this.highlightDropRegion(targetRegion);
    }
    
    /**
     * Handle panel drag end
     * @param {MouseEvent} e - Mouse event
     */
    onPanelDragEnd(e) {
      if (!this.dragging) return;
      
      // Clean up
      document.body.removeChild(this.dragging.overlay);
      document.body.removeChild(this.dragging.preview);
      
      // Remove event listeners
      document.removeEventListener('mousemove', this.onPanelDragMove);
      document.removeEventListener('mouseup', this.onPanelDragEnd);
      
      // Determine drop target region
      const targetRegion = this.getDropRegion(e.clientX, e.clientY);
      
      // Move panel to new region if different
      if (targetRegion && targetRegion !== this.dragging.originalRegion) {
        this.movePanelToRegion(this.dragging.panelId, targetRegion);
      }
      
      // Reset dragging state
      this.dragging = null;
      
      // Remove all drop region highlights
      this.clearDropRegionHighlights();
    }
    
    /**
     * Get drop region at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string|null} Region name or null if not over a valid region
     */
    getDropRegion(x, y) {
      const container = this.mainContainer.getBoundingClientRect();
      
      // Calculate relative position in container
      const relX = x - container.left;
      const relY = y - container.top;
      
      // Check if outside container
      if (relX < 0 || relX > container.width || relY < 0 || relY > container.height) {
        return null;
      }
      
      // Define region thresholds (as percentages)
      const leftThreshold = 0.25;
      const rightThreshold = 0.75;
      const topThreshold = 0.25;
      const bottomThreshold = 0.75;
      
      // Calculate normalized position
      const normX = relX / container.width;
      const normY = relY / container.height;
      
      // Determine region based on position
      if (normX < leftThreshold) {
        return 'left';
      } else if (normX > rightThreshold) {
        return 'right';
      } else if (normY < topThreshold) {
        return 'top';
      } else if (normY > bottomThreshold) {
        return 'bottom';
      } else {
        return 'center';
      }
    }
    
    /**
     * Highlight a drop region
     * @param {string|null} region - Region name
     */
    highlightDropRegion(region) {
      // Clear existing highlights
      this.clearDropRegionHighlights();
      
      if (!region) return;
      
      // Find or create region container
      const regionContainer = document.querySelector(`.${region}-container`) || this.createRegionContainer(region);
      
      // Add highlight class
      regionContainer.classList.add('drop-target');
    }
    
    /**
     * Clear all drop region highlights
     */
    clearDropRegionHighlights() {
      const containers = document.querySelectorAll('.left-container, .right-container, .top-container, .bottom-container, .center-container');
      
      containers.forEach(container => {
        container.classList.remove('drop-target');
      });
    }
    
    /**
     * Move a panel to a new region
     * @param {string} panelId - Panel ID
     * @param {string} region - Target region
     */
    movePanelToRegion(panelId, region) {
      const panel = this.panels[panelId];
      
      if (!panel) return;
      
      // Remove from current region
      panel.element.remove();
      
      // Update panel region
      panel.region = region;
      panel.element.className = `panel-container ${region}`;
      
      // Adjust resize handles
      const existingHandle = panel.element.querySelector('.resize-handle');
      if (existingHandle) {
        existingHandle.remove();
      }
      
      // Add new resize handles if needed
      if (['left', 'right', 'top', 'bottom'].includes(region)) {
        this.createResizeHandles(panel.element, region, panel.options);
      }
      
      // Add to new region
      if (region === 'center') {
        // Center panels go in the center container
        let centerContainer = document.querySelector('.center-container');
        
        if (!centerContainer) {
          centerContainer = document.createElement('div');
          centerContainer.className = 'center-container';
          this.mainContainer.appendChild(centerContainer);
        }
        
        centerContainer.appendChild(panel.element);
      } else {
        // Other panels go in their respective regions
        const regionContainer = document.querySelector(`.${region}-container`) || this.createRegionContainer(region);
        regionContainer.appendChild(panel.element);
      }
      
      // Reset dimensions based on new region
      if (region === 'left' || region === 'right') {
        panel.element.style.height = '';
        panel.element.style.width = `${panel.options.width || 250}px`;
      } else if (region === 'top' || region === 'bottom') {
        panel.element.style.width = '';
        panel.element.style.height = `${panel.options.height || 250}px`;
      } else {
        panel.element.style.width = '';
        panel.element.style.height = '';
      }
      
      // Save layout
      this.saveLayout();
    }
  }
  
  // Export the UIManager class
  module.exports = UIManager;