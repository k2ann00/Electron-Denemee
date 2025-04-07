// editors/SceneEditor.js - Visual scene editing and layout

/**
 * Scene Editor - Provides a visual editor for scene creation and object placement
 * Similar to Unity's Scene view
 */
class SceneEditor {
    /**
     * Create a new Scene Editor
     * @param {object} app - Main application reference
     */
    constructor(app) {
      this.app = app;
      this.canvas = null;
      this.ctx = null;
      this.activeScene = null;
      this.selectedObjects = [];
      this.gridSize = 32;
      this.showGrid = true;
      this.snapToGrid = true;
      this.zoom = 1.0;
      this.panOffset = { x: 0, y: 0 };
      this.isDragging = false;
      this.lastMousePos = { x: 0, y: 0 };
      this.tools = {
        select: {
          name: 'Select',
          icon: 'icon-select',
          cursor: 'default'
        },
        move: {
          name: 'Move',
          icon: 'icon-move',
          cursor: 'move'
        },
        rotate: {
          name: 'Rotate',
          icon: 'icon-rotate',
          cursor: 'crosshair'
        },
        scale: {
          name: 'Scale',
          icon: 'icon-scale',
          cursor: 'nesw-resize'
        },
        tile: {
          name: 'Tile',
          icon: 'icon-tile',
          cursor: 'cell'
        }
      };
      this.activeTool = 'select';
      this.isInitialized = false;
      
      // Bind event handlers
      this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
      this.onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
      this.onCanvasMouseUp = this.onCanvasMouseUp.bind(this);
      this.onCanvasWheel = this.onCanvasWheel.bind(this);
      this.onResize = this.onResize.bind(this);
      
      // Register event handlers
      this.app.core.events.on('scene:new', this.onNewScene.bind(this));
      this.app.core.events.on('scene:load', this.onLoadScene.bind(this));
      this.app.core.events.on('scene:save', this.onSaveScene.bind(this));
      this.app.core.events.on('object:add', this.onAddObject.bind(this));
      this.app.core.events.on('object:remove', this.onRemoveObject.bind(this));
      this.app.core.events.on('object:select', this.onSelectObject.bind(this));
      this.app.core.events.on('object:properties', this.onObjectProperties.bind(this));
    }
    
    /**
     * Initialize the editor
     */
    initialize() {
      if (this.isInitialized) return;
      
      console.log('Initializing Scene Editor');
      
      this.isInitialized = true;
    }
    
    /**
     * Create the editor UI
     */
    initUI() {
      // Get the panel content from UI manager
      const panel = this.app.core.ui.getPanelContent('scene');
      
      if (!panel) {
        console.error('Scene panel not found');
        return;
      }
      
      // Create the toolbar
      this.createToolbar(panel);
      
      // Create the canvas container
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'scene-canvas-container';
      panel.appendChild(canvasContainer);
      
      // Create the canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'scene-canvas';
      canvasContainer.appendChild(this.canvas);
      
      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      
      // Add event listeners
      this.canvas.addEventListener('mousedown', this.onCanvasMouseDown);
      this.canvas.addEventListener('mousemove', this.onCanvasMouseMove);
      this.canvas.addEventListener('mouseup', this.onCanvasMouseUp);
      this.canvas.addEventListener('wheel', this.onCanvasWheel);
      
      // Handle resize
      window.addEventListener('resize', this.onResize);
      
      // Initial resize
      this.onResize();
      
      // Create a default empty scene if none exists
      if (!this.activeScene) {
        this.createDefaultScene();
      }
    }
    
    /**
     * Create the editor toolbar
     * @param {HTMLElement} container - Container element
     */
    createToolbar(container) {
      const toolbar = document.createElement('div');
      toolbar.className = 'scene-toolbar';
      
      // Add tool buttons
      for (const toolId in this.tools) {
        const tool = this.tools[toolId];
        
        const button = document.createElement('button');
        button.className = `scene-tool-button ${toolId === this.activeTool ? 'active' : ''}`;
        button.innerHTML = `<i class="${tool.icon}"></i>`;
        button.title = tool.name;
        button.dataset.tool = toolId;
        button.addEventListener('click', () => this.setActiveTool(toolId));
        
        toolbar.appendChild(button);
      }
      
      // Add separator
      const separator = document.createElement('div');
      separator.className = 'toolbar-separator';
      toolbar.appendChild(separator);
      
      // Add grid settings
      const gridButton = document.createElement('button');
      gridButton.className = 'scene-tool-button';
      gridButton.innerHTML = '<i class="icon-grid"></i>';
      gridButton.title = 'Toggle Grid';
      gridButton.addEventListener('click', () => {
        this.showGrid = !this.showGrid;
        gridButton.classList.toggle('active', this.showGrid);
        this.render();
      });
      
      // Set initial state
      gridButton.classList.toggle('active', this.showGrid);
      toolbar.appendChild(gridButton);
      
      // Add snap button
      const snapButton = document.createElement('button');
      snapButton.className = 'scene-tool-button';
      snapButton.innerHTML = '<i class="icon-snap"></i>';
      snapButton.title = 'Snap to Grid';
      snapButton.addEventListener('click', () => {
        this.snapToGrid = !this.snapToGrid;
        snapButton.classList.toggle('active', this.snapToGrid);
      });
      
      // Set initial state
      snapButton.classList.toggle('active', this.snapToGrid);
      toolbar.appendChild(snapButton);
      
      // Add zoom controls
      const zoomOutButton = document.createElement('button');
      zoomOutButton.className = 'scene-tool-button';
      zoomOutButton.innerHTML = '<i class="icon-zoom-out"></i>';
      zoomOutButton.title = 'Zoom Out';
      zoomOutButton.addEventListener('click', () => {
        this.setZoom(this.zoom / 1.2);
      });
      toolbar.appendChild(zoomOutButton);
      
      const zoomLabel = document.createElement('span');
      zoomLabel.className = 'zoom-label';
      zoomLabel.textContent = '100%';
      this.zoomLabel = zoomLabel;
      toolbar.appendChild(zoomLabel);
      
      const zoomInButton = document.createElement('button');
      zoomInButton.className = 'scene-tool-button';
      zoomInButton.innerHTML = '<i class="icon-zoom-in"></i>';
      zoomInButton.title = 'Zoom In';
      zoomInButton.addEventListener('click', () => {
        this.setZoom(this.zoom * 1.2);
      });
      toolbar.appendChild(zoomInButton);
      
      // Add to container
      container.appendChild(toolbar);
    }
    
    /**
     * Activate the editor
     */
    activate() {
      console.log('Activating Scene Editor');
      
      // Resize canvas (in case window size changed while inactive)
      this.onResize();
      
      // Render the scene
      this.render();
    }
    
    /**
     * Deactivate the editor
     */
    deactivate() {
      console.log('Deactivating Scene Editor');
    }
    
    /**
     * Set the active tool
     * @param {string} toolId - Tool identifier
     */
    setActiveTool(toolId) {
      if (!this.tools[toolId]) return;
      
      this.activeTool = toolId;
      
      // Update UI
      const buttons = document.querySelectorAll('.scene-tool-button');
      buttons.forEach(button => {
        button.classList.toggle('active', button.dataset.tool === toolId);
      });
      
      // Set appropriate cursor
      if (this.canvas) {
        this.canvas.style.cursor = this.tools[toolId].cursor;
      }
    }
    
    /**
     * Set the zoom level
     * @param {number} zoom - Zoom level
     */
    setZoom(zoom) {
      // Clamp zoom between 10% and 500%
      this.zoom = Math.max(0.1, Math.min(5.0, zoom));
      
      // Update zoom label
      if (this.zoomLabel) {
        this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
      }
      
      // Re-render
      this.render();
    }
    
    /**
     * Create a default empty scene
     */
    createDefaultScene() {
      this.activeScene = {
        id: 'scene_' + Date.now(),
        name: 'Untitled Scene',
        width: 800,
        height: 600,
        backgroundColor: '#87CEEB',
        layers: [
          {
            id: 'layer_1',
            name: 'Background',
            visible: true,
            objects: []
          },
          {
            id: 'layer_2',
            name: 'Main',
            visible: true,
            objects: []
          },
          {
            id: 'layer_3',
            name: 'Foreground',
            visible: true,
            objects: []
          }
        ],
        activeLayer: 'layer_2'
      };
      
      // Notify other components
      this.app.core.events.emit('scene:created', this.activeScene);
      
      // Render the scene
      this.render();
    }
    
    /**
     * Render the scene to the canvas
     */
    render() {
      if (!this.ctx || !this.canvas || !this.activeScene) return;
      
      // Clear canvas
      this.ctx.fillStyle = '#2C2C2C'; // Dark gray background for editor
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Calculate scene dimensions with zoom
      const sceneWidth = this.activeScene.width * this.zoom;
      const sceneHeight = this.activeScene.height * this.zoom;
      
      // Calculate scene position (centered with pan offset)
      const sceneX = (this.canvas.width - sceneWidth) / 2 + this.panOffset.x;
      const sceneY = (this.canvas.height - sceneHeight) / 2 + this.panOffset.y;
      
      // Draw scene background
      this.ctx.fillStyle = this.activeScene.backgroundColor;
      this.ctx.fillRect(sceneX, sceneY, sceneWidth, sceneHeight);
      
      // Draw grid if enabled
      if (this.showGrid) {
        this.drawGrid(sceneX, sceneY, sceneWidth, sceneHeight);
      }
      
      // Draw scene border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(sceneX, sceneY, sceneWidth, sceneHeight);
      
      // Draw scene content (layers, objects, etc.)
      this.renderLayers(sceneX, sceneY);
      
      // Draw selection indicators
      this.renderSelection(sceneX, sceneY);
    }
    
    /**
     * Draw the grid
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    drawGrid(x, y, width, height) {
      const gridSizeScaled = this.gridSize * this.zoom;
      
      // Don't draw grid if too small
      if (gridSizeScaled < 5) return;
      
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 1;
      
      // Draw vertical grid lines
      for (let i = 0; i <= width; i += gridSizeScaled) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + i, y);
        this.ctx.lineTo(x + i, y + height);
        this.ctx.stroke();
      }
      
      // Draw horizontal grid lines
      for (let i = 0; i <= height; i += gridSizeScaled) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + i);
        this.ctx.lineTo(x + width, y + i);
        this.ctx.stroke();
      }
    }
    
    /**
     * Render layers and their objects
     * @param {number} sceneX - Scene X position
     * @param {number} sceneY - Scene Y position
     */
    renderLayers(sceneX, sceneY) {
      // Render each layer from bottom to top
      for (const layer of this.activeScene.layers) {
        if (!layer.visible) continue;
        
        // Render all objects in this layer
        for (const object of layer.objects) {
          this.renderObject(object, sceneX, sceneY);
        }
      }
    }
    
    /**
     * Render an object
     * @param {object} object - Object to render
     * @param {number} sceneX - Scene X position
     * @param {number} sceneY - Scene Y position
     */
    renderObject(object, sceneX, sceneY) {
      // Apply transformations
      this.ctx.save();
      
      // Calculate scaled and positioned coordinates
      const x = sceneX + object.x * this.zoom;
      const y = sceneY + object.y * this.zoom;
      const width = object.width * this.zoom;
      const height = object.height * this.zoom;
      
      // Apply rotation if specified
      if (object.rotation) {
        // Rotate around object center
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(object.rotation * Math.PI / 180);
        this.ctx.translate(-centerX, -centerY);
      }
      
      // Render based on object type
      switch (object.type) {
        case 'sprite':
          this.renderSprite(object, x, y, width, height);
          break;
        case 'rectangle':
          this.renderRectangle(object, x, y, width, height);
          break;
        case 'circle':
          this.renderCircle(object, x, y, width, height);
          break;
        case 'text':
          this.renderText(object, x, y, width, height);
          break;
        case 'tilemap':
          this.renderTilemap(object, x, y, width, height);
          break;
        default:
          // For unknown types, render placeholder
          this.renderPlaceholder(object, x, y, width, height);
      }
      
      // Restore context
      this.ctx.restore();
    }
    
    /**
     * Render a sprite object
     * @param {object} object - Sprite object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    renderSprite(object, x, y, width, height) {
      // Check if image is loaded
      if (object.image && object.image.loaded) {
        // Draw the image
        this.ctx.drawImage(object.image, x, y, width, height);
      } else {
        // Draw placeholder
        this.ctx.fillStyle = '#7F00FF'; // Purple for sprites
        this.ctx.fillRect(x, y, width, height);
        
        // Draw diagonal lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.moveTo(x + width, y);
        this.ctx.lineTo(x, y + height);
        this.ctx.stroke();
        
        // Draw label
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(object.name || 'Sprite', x + width / 2, y + height / 2);
      }
    }
    
    /**
     * Render a rectangle object
     * @param {object} object - Rectangle object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    renderRectangle(object, x, y, width, height) {
      // Set fill style
      this.ctx.fillStyle = object.fillColor || '#FF0000';
      
      // Draw rectangle
      this.ctx.fillRect(x, y, width, height);
      
      // Draw border if specified
      if (object.borderColor) {
        this.ctx.strokeStyle = object.borderColor;
        this.ctx.lineWidth = (object.borderWidth || 1) * this.zoom;
        this.ctx.strokeRect(x, y, width, height);
      }
    }
    
    /**
     * Render a circle object
     * @param {object} object - Circle object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    renderCircle(object, x, y, width, height) {
      // Calculate center and radius
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(width, height) / 2;
      
      // Draw circle
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = object.fillColor || '#00FF00';
      this.ctx.fill();
      
      // Draw border if specified
      if (object.borderColor) {
        this.ctx.strokeStyle = object.borderColor;
        this.ctx.lineWidth = (object.borderWidth || 1) * this.zoom;
        this.ctx.stroke();
      }
    }
    
    /**
     * Render a text object
     * @param {object} object - Text object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    renderText(object, x, y, width, height) {
      // Set font properties
      const fontSize = Math.max(12 * this.zoom, 8); // Minimum font size for readability
      this.ctx.font = `${object.fontStyle || ''} ${fontSize}px ${object.fontFamily || 'Arial'}`;
      this.ctx.fillStyle = object.textColor || '#FFFFFF';
      this.ctx.textAlign = object.textAlign || 'left';
      this.ctx.textBaseline = 'top';
      
      // Draw background if specified
      if (object.backgroundColor) {
        this.ctx.fillStyle = object.backgroundColor;
        this.ctx.fillRect(x, y, width, height);
      }
      
      // Draw text
      this.ctx.fillStyle = object.textColor || '#FFFFFF';
      
      // Handle word wrap if needed
      if (object.wrap && width > 0) {
        this.wrapText(object.text || '', x, y, width, fontSize * 1.2);
      } else {
        this.ctx.fillText(object.text || '', x, y);
      }
    }
    
    /**
     * Render a tilemap object
     * @param {object} object - Tilemap object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    renderTilemap(object, x, y, width, height) {
      // Only render if tileset is defined
      if (!object.tileset || !object.tileData) {
        // Draw placeholder
        this.ctx.fillStyle = '#0088FF'; // Blue for tilemaps
        this.ctx.fillRect(x, y, width, height);
        
        // Draw label
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(object.name || 'Tilemap', x + width / 2, y + height / 2);
        return;
      }
      
      // Calculate tile dimensions
      const tileSize = object.tileSize * this.zoom;
      const cols = object.columns || Math.floor(width / tileSize);
      const rows = object.rows || Math.floor(height / tileSize);
      
      // Draw each tile
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tileIndex = row * cols + col;
          const tileValue = object.tileData[tileIndex];
          
          // Skip empty tiles
          if (tileValue === 0 || tileValue === undefined) continue;
          
          // Calculate tile position
          const tileX = x + col * tileSize;
          const tileY = y + row * tileSize;
          
          // Draw tile (placeholder for now)
          this.ctx.fillStyle = `hsl(${tileValue * 30 % 360}, 80%, 50%)`;
          this.ctx.fillRect(tileX, tileY, tileSize, tileSize);
          
          // Draw border
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(tileX, tileY, tileSize, tileSize);
        }
      }
    }
    
    /**
     * Render a placeholder for unknown objects
     * @param {object} object - Object to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    renderPlaceholder(object, x, y, width, height) {
      // Draw placeholder rectangle
      this.ctx.fillStyle = '#888888';
      this.ctx.fillRect(x, y, width, height);
      
      // Draw cross
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 2;
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + width, y + height);
      this.ctx.moveTo(x + width, y);
      this.ctx.lineTo(x, y + height);
      this.ctx.stroke();
      
      // Draw object name or type
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(object.name || object.type || 'Unknown', x + width / 2, y + height / 2);
    }
    
    /**
     * Render selection indicators
     * @param {number} sceneX - Scene X position
     * @param {number} sceneY - Scene Y position
     */
    renderSelection(sceneX, sceneY) {
      // Draw selection boxes around selected objects
      for (const selectedObject of this.selectedObjects) {
        // Find the object in the scene
        let found = false;
        
        for (const layer of this.activeScene.layers) {
          const object = layer.objects.find(obj => obj.id === selectedObject);
          
          if (object) {
            // Calculate scaled and positioned coordinates
            const x = sceneX + object.x * this.zoom;
            const y = sceneY + object.y * this.zoom;
            const width = object.width * this.zoom;
            const height = object.height * this.zoom;
            
            // Draw selection outline
            this.ctx.strokeStyle = '#00FFFF';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
            
            // Draw control handles
            this.drawSelectionHandles(x, y, width, height);
            
            found = true;
            break;
          }
        }
      }
    }
    
    /**
     * Draw selection handles for an object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    drawSelectionHandles(x, y, width, height) {
      const handleSize = 8;
      const halfHandle = handleSize / 2;
      
      // Define handle positions
      const handles = [
        { x: x - halfHandle, y: y - halfHandle }, // Top-left
        { x: x + width / 2 - halfHandle, y: y - halfHandle }, // Top-center
        { x: x + width - halfHandle, y: y - halfHandle }, // Top-right
        { x: x - halfHandle, y: y + height / 2 - halfHandle }, // Middle-left
        { x: x + width - halfHandle, y: y + height / 2 - halfHandle }, // Middle-right
        { x: x - halfHandle, y: y + height - halfHandle }, // Bottom-left
        { x: x + width / 2 - halfHandle, y: y + height - halfHandle }, // Bottom-center
        { x: x + width - halfHandle, y: y + height - halfHandle } // Bottom-right
      ];
      
      // Draw handles
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.strokeStyle = '#0088FF';
      this.ctx.lineWidth = 1;
      
      for (const handle of handles) {
        this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        this.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
      }
    }
    
    /**
     * Wrap text to fit within a given width
     * @param {string} text - Text to wrap
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} maxWidth - Maximum width
     * @param {number} lineHeight - Line height
     */
    wrapText(text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      let lineY = y;
      
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && line !== '') {
          this.ctx.fillText(line, x, lineY);
          line = word;
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      }
      
      this.ctx.fillText(line, x, lineY);
    }
    
    /**
     * Handle canvas resize
     */
    onResize() {
      if (!this.canvas) return;
      
      // Get panel dimensions
      const panel = this.app.core.ui.getPanelContent('scene');
      if (!panel) return;
      
      // Set canvas size to match panel
      this.canvas.width = panel.clientWidth;
      this.canvas.height = panel.clientHeight;
      
      // Re-render
      this.render();
    }
    
    // Additional event handlers for the SceneEditor

  /**
   * Handle move tool mouse move
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   * @param {number} deltaX - Mouse X delta
   * @param {number} deltaY - Mouse Y delta
   */
  handleMoveToolMove(e, coords, deltaX, deltaY) {
    // If dragging objects
    if (this.dragInfo) {
      // Move each selected object
      for (const objInfo of this.dragInfo.objects) {
        // Find object in scene
        const object = objInfo.layer.objects.find(o => o.id === objInfo.id);
        
        if (object) {
          // Calculate new position (in scene coordinates)
          const newX = objInfo.startX + (deltaX / this.zoom);
          const newY = objInfo.startY + (deltaY / this.zoom);
          
          // Apply snap to grid if enabled
          object.x = this.snapToGridValue(newX);
          object.y = this.snapToGridValue(newY);
        }
      }
    }
    // If panning
    else if (this.isPanning) {
      // Pan the view
      this.panOffset.x += deltaX;
      this.panOffset.y += deltaY;
    }
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle move tool mouse up
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleMoveToolUp(e, coords) {
    // Clear drag info
    this.dragInfo = null;
    
    // Clear panning flag
    this.isPanning = false;
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle rotate tool mouse down
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleRotateToolDown(e, coords) {
    // Check if clicked on an object
    const hit = this.getObjectAtCoords(coords.x, coords.y);
    
    if (hit) {
      // If object is not in selection, make it the only selected object
      if (!this.selectedObjects.includes(hit.object.id)) {
        this.selectedObjects = [hit.object.id];
      }
      
      // Prepare for rotation
      this.rotateInfo = {
        objects: this.selectedObjects.map(id => {
          // Find object in scene
          for (const layer of this.activeScene.layers) {
            const obj = layer.objects.find(o => o.id === id);
            if (obj) {
              // Calculate center point
              const centerX = obj.x + obj.width / 2;
              const centerY = obj.y + obj.height / 2;
              
              // Calculate initial angle
              const initialAngle = Math.atan2(
                coords.y - centerY,
                coords.x - centerX
              ) * 180 / Math.PI;
              
              return {
                id: id,
                layer: layer,
                centerX: centerX,
                centerY: centerY,
                startRotation: obj.rotation || 0,
                initialAngle: initialAngle
              };
            }
          }
          return null;
        }).filter(obj => obj !== null)
      };
    }
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle rotate tool mouse move
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleRotateToolMove(e, coords) {
    // If rotating objects
    if (this.rotateInfo) {
      // Rotate each selected object
      for (const objInfo of this.rotateInfo.objects) {
        // Find object in scene
        const object = objInfo.layer.objects.find(o => o.id === objInfo.id);
        
        if (object) {
          // Calculate current angle
          const currentAngle = Math.atan2(
            coords.y - objInfo.centerY,
            coords.x - objInfo.centerX
          ) * 180 / Math.PI;
          
          // Calculate angle difference
          let angleDiff = currentAngle - objInfo.initialAngle;
          
          // Apply rotation
          object.rotation = objInfo.startRotation + angleDiff;
          
          // Snap to 15-degree increments if snap is enabled
          if (this.snapToGrid) {
            object.rotation = Math.round(object.rotation / 15) * 15;
          }
        }
      }
    }
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle rotate tool mouse up
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleRotateToolUp(e, coords) {
    // Clear rotate info
    this.rotateInfo = null;
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle scale tool mouse down
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleScaleToolDown(e, coords) {
    // Check if clicked on an object
    const hit = this.getObjectAtCoords(coords.x, coords.y);
    
    if (hit) {
      // If object is not in selection, make it the only selected object
      if (!this.selectedObjects.includes(hit.object.id)) {
        this.selectedObjects = [hit.object.id];
      }
      
      // Prepare for scaling
      this.scaleInfo = {
        objects: this.selectedObjects.map(id => {
          // Find object in scene
          for (const layer of this.activeScene.layers) {
            const obj = layer.objects.find(o => o.id === id);
            if (obj) {
              return {
                id: id,
                layer: layer,
                startX: obj.x,
                startY: obj.y,
                startWidth: obj.width,
                startHeight: obj.height,
                startMouseX: coords.x,
                startMouseY: coords.y
              };
            }
          }
          return null;
        }).filter(obj => obj !== null)
      };
    }
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle scale tool mouse move
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleScaleToolMove(e, coords) {
    // If scaling objects
    if (this.scaleInfo) {
      // Scale each selected object
      for (const objInfo of this.scaleInfo.objects) {
        // Find object in scene
        const object = objInfo.layer.objects.find(o => o.id === objInfo.id);
        
        if (object) {
          // Calculate scale factors
          const scaleX = (coords.x - objInfo.startX) / (objInfo.startMouseX - objInfo.startX);
          const scaleY = (coords.y - objInfo.startY) / (objInfo.startMouseY - objInfo.startY);
          
          // Apply scaling (with minimum size constraints)
          object.width = Math.max(10, objInfo.startWidth * scaleX);
          object.height = Math.max(10, objInfo.startHeight * scaleY);
          
          // Snap to grid if enabled
          if (this.snapToGrid) {
            object.width = this.snapToGridValue(object.width);
            object.height = this.snapToGridValue(object.height);
          }
        }
      }
    }
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle scale tool mouse up
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleScaleToolUp(e, coords) {
    // Clear scale info
    this.scaleInfo = null;
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle tile tool mouse down
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleTileToolDown(e, coords) {
    // Get current tileset from the global state
    const tileset = this.app.tileset;
    
    // If no tileset is selected, do nothing
    if (!tileset) return;
    
    // Find tilemap in the active layer
    const activeLayer = this.activeScene.layers.find(layer => layer.id === this.activeScene.activeLayer);
    
    if (!activeLayer) return;
    
    // Find or create tilemap in the active layer
    let tilemap = activeLayer.objects.find(obj => obj.type === 'tilemap');
    
    // If no tilemap exists, create one
    if (!tilemap) {
      tilemap = {
        id: 'tilemap_' + Date.now(),
        type: 'tilemap',
        name: 'Tilemap',
        x: 0,
        y: 0,
        width: this.activeScene.width,
        height: this.activeScene.height,
        tileSize: 32,
        columns: Math.ceil(this.activeScene.width / 32),
        rows: Math.ceil(this.activeScene.height / 32),
        tileset: tileset.id,
        tileData: []
      };
      
      // Initialize empty tile data
      for (let i = 0; i < tilemap.rows * tilemap.columns; i++) {
        tilemap.tileData.push(0);
      }
      
      // Add tilemap to layer
      activeLayer.objects.push(tilemap);
    }
    
    // Calculate tile coordinates
    const tileX = Math.floor((coords.x - tilemap.x) / tilemap.tileSize);
    const tileY = Math.floor((coords.y - tilemap.y) / tilemap.tileSize);
    
    // If coordinates are outside tilemap, do nothing
    if (
      tileX < 0 || tileX >= tilemap.columns ||
      tileY < 0 || tileY >= tilemap.rows
    ) {
      return;
    }
    
    // Calculate tile index
    const tileIndex = tileY * tilemap.columns + tileX;
    
    // Set tile data
    tilemap.tileData[tileIndex] = this.app.selectedTile || 1;
    
    // Store the last placed tile for drag filling
    this.lastPlacedTile = {
      x: tileX,
      y: tileY
    };
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle tile tool mouse move
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleTileToolMove(e, coords) {
    // If not dragging, do nothing
    if (!this.isDragging) return;
    
    // Find tilemap in the active layer
    const activeLayer = this.activeScene.layers.find(layer => layer.id === this.activeScene.activeLayer);
    
    if (!activeLayer) return;
    
    const tilemap = activeLayer.objects.find(obj => obj.type === 'tilemap');
    
    // If no tilemap exists, do nothing
    if (!tilemap) return;
    
    // Calculate tile coordinates
    const tileX = Math.floor((coords.x - tilemap.x) / tilemap.tileSize);
    const tileY = Math.floor((coords.y - tilemap.y) / tilemap.tileSize);
    
    // If coordinates are outside tilemap, do nothing
    if (
      tileX < 0 || tileX >= tilemap.columns ||
      tileY < 0 || tileY >= tilemap.rows
    ) {
      return;
    }
    
    // If the tile is the same as the last placed tile, do nothing
    if (this.lastPlacedTile && this.lastPlacedTile.x === tileX && this.lastPlacedTile.y === tileY) {
      return;
    }
    
    // Calculate tile index
    const tileIndex = tileY * tilemap.columns + tileX;
    
    // Set tile data
    tilemap.tileData[tileIndex] = this.app.selectedTile || 1;
    
    // Update last placed tile
    this.lastPlacedTile = {
      x: tileX,
      y: tileY
    };
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle tile tool mouse up
   * @param {MouseEvent} e - Mouse event
   * @param {object} coords - Scene coordinates
   */
  handleTileToolUp(e, coords) {
    // Clear last placed tile
    this.lastPlacedTile = null;
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle new scene event
   * @param {object} sceneConfig - Scene configuration
   */
  onNewScene(sceneConfig) {
    // Clear current scene
    this.activeScene = {
      id: sceneConfig.id || 'scene_' + Date.now(),
      name: sceneConfig.name || 'New Scene',
      width: sceneConfig.width || 800,
      height: sceneConfig.height || 600,
      backgroundColor: sceneConfig.backgroundColor || '#87CEEB',
      layers: [
        {
          id: 'layer_1',
          name: 'Background',
          visible: true,
          objects: []
        },
        {
          id: 'layer_2',
          name: 'Main',
          visible: true,
          objects: []
        },
        {
          id: 'layer_3',
          name: 'Foreground',
          visible: true,
          objects: []
        }
      ],
      activeLayer: 'layer_2'
    };
    
    // Clear selection
    this.selectedObjects = [];
    
    // Reset view
    this.zoom = 1.0;
    this.panOffset = { x: 0, y: 0 };
    
    // Render the new scene
    this.render();
  }
  
  /**
   * Handle load scene event
   * @param {object} scene - Scene data
   */
  onLoadScene(scene) {
    // Set active scene
    this.activeScene = scene;
    
    // Clear selection
    this.selectedObjects = [];
    
    // Reset view
    this.zoom = 1.0;
    this.panOffset = { x: 0, y: 0 };
    
    // Render the scene
    this.render();
  }
  
  /**
   * Handle save scene event
   */
  onSaveScene() {
    // Return a copy of the active scene
    return JSON.parse(JSON.stringify(this.activeScene));
  }
  
  /**
   * Handle add object event
   * @param {object} objectData - Object data
   */
  onAddObject(objectData) {
    // Find the active layer
    const activeLayer = this.activeScene.layers.find(
      layer => layer.id === this.activeScene.activeLayer
    );
    
    if (!activeLayer) return;
    
    // Create the new object
    const newObject = {
      id: objectData.id || 'object_' + Date.now(),
      type: objectData.type,
      name: objectData.name,
      x: objectData.x || 0,
      y: objectData.y || 0,
      width: objectData.width || 100,
      height: objectData.height || 100,
      ...objectData.properties
    };
    
    // Add to the active layer
    activeLayer.objects.push(newObject);
    
    // Select the new object
    this.selectedObjects = [newObject.id];
    
    // Update UI
    this.render();
    
    // Emit selection changed event
    this.app.core.events.emit('object:selection', this.selectedObjects);
  }
  
  /**
   * Handle remove object event
   * @param {string} objectId - Object ID
   */
  onRemoveObject(objectId) {
    // Find the object in all layers
    for (const layer of this.activeScene.layers) {
      const objectIndex = layer.objects.findIndex(obj => obj.id === objectId);
      
      if (objectIndex !== -1) {
        // Remove the object
        layer.objects.splice(objectIndex, 1);
        break;
      }
    }
    
    // Remove from selection if selected
    this.selectedObjects = this.selectedObjects.filter(id => id !== objectId);
    
    // Update UI
    this.render();
    
    // Emit selection changed event
    this.app.core.events.emit('object:selection', this.selectedObjects);
  }
  
  /**
   * Handle select object event
   * @param {string} objectId - Object ID
   */
  onSelectObject(objectId) {
    // Set selection
    this.selectedObjects = [objectId];
    
    // Update UI
    this.render();
  }
  
  /**
   * Handle object properties event
   * @param {string} objectId - Object ID
   * @param {object} properties - New properties
   */
  onObjectProperties(objectId, properties) {
    // Find the object in all layers
    for (const layer of this.activeScene.layers) {
      const object = layer.objects.find(obj => obj.id === objectId);
      
      if (object) {
        // Update properties
        Object.assign(object, properties);
        break;
      }
    }
    
    // Update UI
    this.render();
  }
  
  /**
   * Get project data for saving
   * @returns {object} Scene data
   */
  getProjectData() {
    return {
      activeScene: this.activeScene
    };
  }
}

// Export the SceneEditor class
module.exports = SceneEditor;