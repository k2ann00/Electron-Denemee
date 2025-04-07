// editors/Inspector.js - Property inspector for scene objects

/**
 * Inspector - Displays and edits properties of selected objects
 * Similar to Unity's Inspector panel
 */
class Inspector {
    /**
     * Create a new Inspector
     * @param {object} app - Main application reference
     */
    constructor(app) {
      this.app = app;
      this.selectedObjects = [];
      this.currentObject = null;
      this.inspectorContainer = null;
      this.isInitialized = false;
      
      // Register event handlers
      this.app.core.events.on('object:selection', this.onObjectSelection.bind(this));
      this.app.core.events.on('asset:selected', this.onAssetSelected.bind(this));
      this.app.core.events.on('project:loaded', this.onProjectLoaded.bind(this));
    }
    
    /**
     * Initialize the inspector
     */
    initialize() {
      if (this.isInitialized) return;
      
      console.log('Initializing Inspector');
      
      this.isInitialized = true;
    }
    
    /**
     * Create the inspector UI
     */
    initUI() {
      // Get the panel content from UI manager
      const panel = this.app.core.ui.getPanelContent('inspector');
      
      if (!panel) {
        console.error('Inspector panel not found');
        return;
      }
      
      // Create header
      const header = document.createElement('div');
      header.className = 'inspector-header';
      
      // Add title
      const title = document.createElement('div');
      title.className = 'inspector-title';
      title.textContent = 'Inspector';
      header.appendChild(title);
      
      panel.appendChild(header);
      
      // Create inspector container
      const container = document.createElement('div');
      container.className = 'inspector-container';
      panel.appendChild(container);
      
      // Store reference
      this.inspectorContainer = container;
      
      // Show empty state
      this.showEmptyState();
    }
    
    /**
     * Activate the inspector
     */
    activate() {
      console.log('Activating Inspector');
    }
    
    /**
     * Deactivate the inspector
     */
    deactivate() {
      console.log('Deactivating Inspector');
    }
    
    /**
     * Show the empty state message
     */
    showEmptyState() {
      if (!this.inspectorContainer) return;
      
      // Clear container
      this.inspectorContainer.innerHTML = '';
      
      // Create empty state message
      const emptyState = document.createElement('div');
      emptyState.className = 'inspector-empty-state';
      emptyState.innerHTML = `
        <i class="icon-info"></i>
        <p>No object selected</p>
        <p class="hint">Select an object in the Scene or Project view to inspect its properties.</p>
      `;
      
      this.inspectorContainer.appendChild(emptyState);
    }
    
    /**
     * Show inspector for scene object
     * @param {object} object - Scene object
     * @param {object} layer - Layer containing the object
     */
    showObjectInspector(object, layer) {
      if (!this.inspectorContainer) return;
      
      // Store current object
      this.currentObject = { object, layer };
      
      // Clear container
      this.inspectorContainer.innerHTML = '';
      
      // Create object header
      const objectHeader = document.createElement('div');
      objectHeader.className = 'object-header';
      
      // Add object name
      const nameField = this.createTextField('name', 'Name', object.name || 'Object', (value) => {
        this.updateObjectProperty('name', value);
      });
      objectHeader.appendChild(nameField);
      
      // Add enabled checkbox
      const enabledField = this.createCheckboxField('enabled', 'Enabled', object.enabled !== false, (value) => {
        this.updateObjectProperty('enabled', value);
      });
      objectHeader.appendChild(enabledField);
      
      this.inspectorContainer.appendChild(objectHeader);
      
      // Add transform section
      const transformSection = this.createSection('Transform');
      
      // Add position fields
      const positionGroup = this.createVectorField('position', 'Position', 
        { x: object.x || 0, y: object.y || 0 },
        (prop, value) => {
          if (prop === 'x') {
            this.updateObjectProperty('x', parseFloat(value));
          } else if (prop === 'y') {
            this.updateObjectProperty('y', parseFloat(value));
          }
        }
      );
      transformSection.appendChild(positionGroup);
      
      // Add size fields
      const sizeGroup = this.createVectorField('size', 'Size', 
        { x: object.width || 100, y: object.height || 100 },
        (prop, value) => {
          if (prop === 'x') {
            this.updateObjectProperty('width', parseFloat(value));
          } else if (prop === 'y') {
            this.updateObjectProperty('height', parseFloat(value));
          }
        }
      );
      transformSection.appendChild(sizeGroup);
      
      // Add rotation field (if applicable)
      if (object.type !== 'tilemap') {
        const rotationField = this.createNumberField('rotation', 'Rotation', object.rotation || 0, (value) => {
          this.updateObjectProperty('rotation', parseFloat(value));
        });
        transformSection.appendChild(rotationField);
      }
      
      this.inspectorContainer.appendChild(transformSection);
      
      // Add type-specific properties
      switch (object.type) {
        case 'sprite':
          this.addSpriteProperties(object);
          break;
        case 'rectangle':
          this.addRectangleProperties(object);
          break;
        case 'circle':
          this.addCircleProperties(object);
          break;
        case 'text':
          this.addTextProperties(object);
          break;
        case 'tilemap':
          this.addTilemapProperties(object);
          break;
        // Add more types as needed
      }
      
      // Add layer information
      const layerSection = this.createSection('Layer');
      
      // Add layer name (read-only)
      const layerNameField = this.createReadOnlyField('layer', 'Layer', layer.name);
      layerSection.appendChild(layerNameField);
      
      this.inspectorContainer.appendChild(layerSection);
      
      // Add custom properties section
      this.addCustomPropertiesSection(object);
    }
    
    /**
     * Show inspector for asset
     * @param {object} asset - Asset object
     */
    showAssetInspector(asset) {
      if (!this.inspectorContainer) return;
      
      // Store current object
      this.currentObject = { asset };
      
      // Clear container
      this.inspectorContainer.innerHTML = '';
      
      // Create asset header
      const assetHeader = document.createElement('div');
      assetHeader.className = 'asset-header';
      
      // Add asset preview
      const preview = document.createElement('div');
      preview.className = 'asset-preview';
      
      if (asset.type === 'image') {
        // Try to show image preview
        const previewImg = document.createElement('img');
        previewImg.className = 'preview-image';
        previewImg.src = path.join(this.app.project.path, asset.path);
        previewImg.alt = asset.name;
        preview.appendChild(previewImg);
      } else {
        // Show icon for other types
        const icon = document.createElement('i');
        
        switch (asset.type) {
          case 'folder':
            icon.className = 'icon-folder';
            break;
          case 'audio':
            icon.className = 'icon-audio';
            break;
          case 'font':
            icon.className = 'icon-font';
            break;
          case 'script':
            icon.className = 'icon-script';
            break;
          default:
            icon.className = 'icon-file';
        }
        
        preview.appendChild(icon);
      }
      
      assetHeader.appendChild(preview);
      
      // Add asset name
      const nameField = this.createReadOnlyField('name', 'Name', asset.name);
      assetHeader.appendChild(nameField);
      
      this.inspectorContainer.appendChild(assetHeader);
      
      // Add asset information section
      const infoSection = this.createSection('Information');
      
      // Add type
      const typeField = this.createReadOnlyField('type', 'Type', this.getAssetTypeLabel(asset));
      infoSection.appendChild(typeField);
      
      // Add path
      const pathField = this.createReadOnlyField('path', 'Path', asset.path);
      infoSection.appendChild(pathField);
      
      // Add size
      const sizeField = this.createReadOnlyField('size', 'Size', this.formatSize(asset.size));
      infoSection.appendChild(sizeField);
      
      // Add last modified
      const dateField = this.createReadOnlyField('date', 'Modified', new Date(asset.lastModified).toLocaleDateString());
      infoSection.appendChild(dateField);
      
      this.inspectorContainer.appendChild(infoSection);
      
      // Add type-specific properties
      switch (asset.type) {
        case 'image':
          this.addImageAssetProperties(asset);
          break;
        case 'audio':
          this.addAudioAssetProperties(asset);
          break;
        // Add more types as needed
      }
      
      // Add actions section
      const actionsSection = this.createSection('Actions');
      
      // Create actions container
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'actions-container';
      
      // Add Open button
      const openButton = document.createElement('button');
      openButton.className = 'action-button';
      openButton.textContent = 'Open';
      openButton.addEventListener('click', () => {
        this.app.assetBrowser.openAsset(asset);
      });
      actionsContainer.appendChild(openButton);
      
      // Add type-specific actions
      if (asset.type === 'image') {
        // Add Create Sprite button
        const spriteButton = document.createElement('button');
        spriteButton.className = 'action-button';
        spriteButton.textContent = 'Create Sprite';
        spriteButton.addEventListener('click', () => {
          this.app.core.events.emit('object:create', { type: 'sprite', asset });
        });
        actionsContainer.appendChild(spriteButton);
        
        // Add Set as Background button
        const bgButton = document.createElement('button');
        bgButton.className = 'action-button';
        bgButton.textContent = 'Set as Background';
        bgButton.addEventListener('click', () => {
          this.app.core.events.emit('scene:setBackground', asset);
        });
        actionsContainer.appendChild(bgButton);
      }
      
      actionsSection.appendChild(actionsContainer);
      this.inspectorContainer.appendChild(actionsSection);
    }
    
    /**
     * Add sprite-specific properties
     * @param {object} object - Sprite object
     */
    addSpriteProperties(object) {
      const spriteSection = this.createSection('Sprite');
      
      // Add image field
      const imageField = this.createAssetField('image', 'Image', object.imageId, 'image', (value) => {
        this.updateObjectProperty('imageId', value);
      });
      spriteSection.appendChild(imageField);
      
      // Add color tint
      const colorField = this.createColorField('tint', 'Tint', object.tint || '#FFFFFF', (value) => {
        this.updateObjectProperty('tint', value);
      });
      spriteSection.appendChild(colorField);
      
      // Add flip options
      const flipXField = this.createCheckboxField('flipX', 'Flip X', object.flipX || false, (value) => {
        this.updateObjectProperty('flipX', value);
      });
      spriteSection.appendChild(flipXField);
      
      const flipYField = this.createCheckboxField('flipY', 'Flip Y', object.flipY || false, (value) => {
        this.updateObjectProperty('flipY', value);
      });
      spriteSection.appendChild(flipYField);
      
      // Add opacity slider
      const opacityField = this.createSliderField('opacity', 'Opacity', object.opacity !== undefined ? object.opacity : 1, 0, 1, 0.01, (value) => {
        this.updateObjectProperty('opacity', parseFloat(value));
      });
      spriteSection.appendChild(opacityField);
      
      this.inspectorContainer.appendChild(spriteSection);
    }
    
    /**
     * Add rectangle-specific properties
     * @param {object} object - Rectangle object
     */
    addRectangleProperties(object) {
      const shapeSection = this.createSection('Rectangle');
      
      // Add fill color field
      const fillColorField = this.createColorField('fillColor', 'Fill Color', object.fillColor || '#FF0000', (value) => {
        this.updateObjectProperty('fillColor', value);
      });
      shapeSection.appendChild(fillColorField);
      
      // Add border color field
      const borderColorField = this.createColorField('borderColor', 'Border Color', object.borderColor || '#000000', (value) => {
        this.updateObjectProperty('borderColor', value);
      });
      shapeSection.appendChild(borderColorField);
      
      // Add border width field
      const borderWidthField = this.createNumberField('borderWidth', 'Border Width', object.borderWidth || 1, (value) => {
        this.updateObjectProperty('borderWidth', parseFloat(value));
      });
      shapeSection.appendChild(borderWidthField);
      
      // Add corner radius field
      const cornerRadiusField = this.createNumberField('cornerRadius', 'Corner Radius', object.cornerRadius || 0, (value) => {
        this.updateObjectProperty('cornerRadius', parseFloat(value));
      });
      shapeSection.appendChild(cornerRadiusField);
      
      this.inspectorContainer.appendChild(shapeSection);
    }
    
    /**
     * Add circle-specific properties
     * @param {object} object - Circle object
     */
    addCircleProperties(object) {
      const shapeSection = this.createSection('Circle');
      
      // Add fill color field
      const fillColorField = this.createColorField('fillColor', 'Fill Color', object.fillColor || '#00FF00', (value) => {
        this.updateObjectProperty('fillColor', value);
      });
      shapeSection.appendChild(fillColorField);
      
      // Add border color field
      const borderColorField = this.createColorField('borderColor', 'Border Color', object.borderColor || '#000000', (value) => {
        this.updateObjectProperty('borderColor', value);
      });
      shapeSection.appendChild(borderColorField);
      
      // Add border width field
      const borderWidthField = this.createNumberField('borderWidth', 'Border Width', object.borderWidth || 1, (value) => {
        this.updateObjectProperty('borderWidth', parseFloat(value));
      });
      shapeSection.appendChild(borderWidthField);
      
      this.inspectorContainer.appendChild(shapeSection);
    }
    
    /**
     * Add text-specific properties
     * @param {object} object - Text object
     */
    addTextProperties(object) {
      const textSection = this.createSection('Text');
      
      // Add text content field
      const textField = this.createTextAreaField('text', 'Text', object.text || '', (value) => {
        this.updateObjectProperty('text', value);
      });
      textSection.appendChild(textField);
      
      // Add font family field
      const fontFamilyField = this.createTextField('fontFamily', 'Font Family', object.fontFamily || 'Arial', (value) => {
        this.updateObjectProperty('fontFamily', value);
      });
      textSection.appendChild(fontFamilyField);
      
      // Add font size field
      const fontSizeField = this.createNumberField('fontSize', 'Font Size', object.fontSize || 16, (value) => {
        this.updateObjectProperty('fontSize', parseFloat(value));
      });
      textSection.appendChild(fontSizeField);
      
      // Add font style dropdown
      const fontStyleOptions = [
        { value: '', label: 'Normal' },
        { value: 'bold', label: 'Bold' },
        { value: 'italic', label: 'Italic' },
        { value: 'bold italic', label: 'Bold Italic' }
      ];
      const fontStyleField = this.createDropdownField('fontStyle', 'Font Style', object.fontStyle || '', fontStyleOptions, (value) => {
        this.updateObjectProperty('fontStyle', value);
      });
      textSection.appendChild(fontStyleField);
      
      // Add text align dropdown
      const alignOptions = [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ];
      const textAlignField = this.createDropdownField('textAlign', 'Text Align', object.textAlign || 'left', alignOptions, (value) => {
        this.updateObjectProperty('textAlign', value);
      });
      textSection.appendChild(textAlignField);
      
      // Add text color field
      const textColorField = this.createColorField('textColor', 'Text Color', object.textColor || '#FFFFFF', (value) => {
        this.updateObjectProperty('textColor', value);
      });
      textSection.appendChild(textColorField);
      
      // Add background color field
      const bgColorField = this.createColorField('backgroundColor', 'Background Color', object.backgroundColor || 'transparent', (value) => {
        this.updateObjectProperty('backgroundColor', value);
      });
      textSection.appendChild(bgColorField);
      
      // Add word wrap checkbox
      const wrapField = this.createCheckboxField('wrap', 'Word Wrap', object.wrap || false, (value) => {
        this.updateObjectProperty('wrap', value);
      });
      textSection.appendChild(wrapField);
      
      this.inspectorContainer.appendChild(textSection);
    }
    
    /**
     * Add tilemap-specific properties
     * @param {object} object - Tilemap object
     */
    addTilemapProperties(object) {
      const tilemapSection = this.createSection('Tilemap');
      
      // Add tileset field
      const tilesetField = this.createAssetField('tileset', 'Tileset', object.tileset, 'image', (value) => {
        this.updateObjectProperty('tileset', value);
      });
      tilemapSection.appendChild(tilesetField);
      
      // Add tile size field
      const tileSizeField = this.createNumberField('tileSize', 'Tile Size', object.tileSize || 32, (value) => {
        this.updateObjectProperty('tileSize', parseFloat(value));
      });
      tilemapSection.appendChild(tileSizeField);
      
      // Add columns field
      const columnsField = this.createNumberField('columns', 'Columns', object.columns || Math.floor(object.width / (object.tileSize || 32)), (value) => {
        this.updateObjectProperty('columns', parseInt(value));
      });
      tilemapSection.appendChild(columnsField);
      
      // Add rows field
      const rowsField = this.createNumberField('rows', 'Rows', object.rows || Math.floor(object.height / (object.tileSize || 32)), (value) => {
        this.updateObjectProperty('rows', parseInt(value));
      });
      tilemapSection.appendChild(rowsField);
      
      // Add edit button
      const editButton = document.createElement('button');
      editButton.className = 'full-width-button';
      editButton.textContent = 'Edit Tilemap';
      editButton.addEventListener('click', () => {
        // Switch to tile tool in scene editor
        this.app.sceneEditor.setActiveTool('tile');
        // Select this tilemap
        this.app.core.events.emit('object:select', object.id);
      });
      tilemapSection.appendChild(editButton);
      
      this.inspectorContainer.appendChild(tilemapSection);
    }
    
    /**
     * Add image asset-specific properties
     * @param {object} asset - Image asset
     */
    addImageAssetProperties(asset) {
      const imageSection = this.createSection('Image Properties');
      
      // Add dimensions fields
      if (asset.width && asset.height) {
        const dimensionsField = this.createReadOnlyField('dimensions', 'Dimensions', `${asset.width} × ${asset.height} pixels`);
        imageSection.appendChild(dimensionsField);
      }
      
      // Add filter mode dropdown
      const filterModeOptions = [
        { value: 'nearest', label: 'Point (Nearest)' },
        { value: 'linear', label: 'Bilinear' }
      ];
      const filterModeField = this.createDropdownField('filterMode', 'Filter Mode', asset.filterMode || 'nearest', filterModeOptions, (value) => {
        this.updateAssetProperty(asset, 'filterMode', value);
      });
      imageSection.appendChild(filterModeField);
      
      // Add wrap mode dropdown
      const wrapModeOptions = [
        { value: 'clamp', label: 'Clamp' },
        { value: 'repeat', label: 'Repeat' },
        { value: 'mirroredRepeat', label: 'Mirrored Repeat' }
      ];
      const wrapModeField = this.createDropdownField('wrapMode', 'Wrap Mode', asset.wrapMode || 'clamp', wrapModeOptions, (value) => {
        this.updateAssetProperty(asset, 'wrapMode', value);
      });
      imageSection.appendChild(wrapModeField);
      
      this.inspectorContainer.appendChild(imageSection);
    }
    
    /**
     * Add audio asset-specific properties
     * @param {object} asset - Audio asset
     */
    addAudioAssetProperties(asset) {
      const audioSection = this.createSection('Audio Properties');
      
      // Add audio preview player
      const audioPreview = document.createElement('div');
      audioPreview.className = 'audio-preview';
      
      const audioElement = document.createElement('audio');
      audioElement.src = path.join(this.app.project.path, asset.path);
      audioElement.controls = true;
      
      audioPreview.appendChild(audioElement);
      audioSection.appendChild(audioPreview);
      
      // Add volume slider
      const volumeField = this.createSliderField('volume', 'Default Volume', asset.volume !== undefined ? asset.volume : 1, 0, 1, 0.01, (value) => {
        this.updateAssetProperty(asset, 'volume', parseFloat(value));
      });
      audioSection.appendChild(volumeField);
      
      // Add loop checkbox
      const loopField = this.createCheckboxField('loop', 'Loop by Default', asset.loop || false, (value) => {
        this.updateAssetProperty(asset, 'loop', value);
      });
      audioSection.appendChild(loopField);
      
      // Add duration field (if available)
      if (asset.duration) {
        const durationField = this.createReadOnlyField('duration', 'Duration', `${asset.duration.toFixed(2)} seconds`);
        audioSection.appendChild(durationField);
      }
      
      this.inspectorContainer.appendChild(audioSection);
    }
    
    /**
     * Add custom properties section
     * @param {object} object - Object with custom properties
     */
    addCustomPropertiesSection(object) {
      // Create custom properties section
      const customSection = this.createSection('Custom Properties');
      
      // Get custom properties (excluding standard ones)
      const standardProps = ['id', 'type', 'name', 'x', 'y', 'width', 'height', 'rotation', 'enabled'];
      const customProps = {};
      
      for (const key in object) {
        if (!standardProps.includes(key) && !key.startsWith('_')) {
          // Skip properties that are handled by specific type sections
          const skipProps = this.getTypeSpecificProps(object.type);
          if (!skipProps.includes(key)) {
            customProps[key] = object[key];
          }
        }
      }
      
      // Add custom properties
      for (const key in customProps) {
        const value = customProps[key];
        const type = typeof value;
        
        let field;
        
        if (type === 'string') {
          field = this.createTextField(key, key, value, (newValue) => {
            this.updateObjectProperty(key, newValue);
          });
        } else if (type === 'number') {
          field = this.createNumberField(key, key, value, (newValue) => {
            this.updateObjectProperty(key, parseFloat(newValue));
          });
        } else if (type === 'boolean') {
          field = this.createCheckboxField(key, key, value, (newValue) => {
            this.updateObjectProperty(key, newValue);
          });
        } else {
          // For objects or arrays, show as readonly JSON
          field = this.createReadOnlyField(key, key, JSON.stringify(value));
        }
        
        customSection.appendChild(field);
      }
      
      // Add button to add new property
      const addPropertyButton = document.createElement('button');
      addPropertyButton.className = 'full-width-button';
      addPropertyButton.textContent = 'Add Property';
      addPropertyButton.addEventListener('click', () => {
        this.showAddPropertyDialog();
      });
      customSection.appendChild(addPropertyButton);
      
      this.inspectorContainer.appendChild(customSection);
    }
    
    /**
     * Show dialog to add a new property
     */
    async showAddPropertyDialog() {
      if (!this.currentObject || !this.currentObject.object) return;
      
      try {
        // Show dialog for property name
        const name = await this.app.core.ui.showPrompt('Add Property', 'Enter property name:');
        
        if (!name) return;
        
        // Show dialog for property type
        const type = await this.app.core.ui.showOptions('Property Type', 'Select property type:', [
          { value: 'string', label: 'String' },
          { value: 'number', label: 'Number' },
          { value: 'boolean', label: 'Boolean' }
        ]);
        
        if (!type) return;
        
        // Show dialog for property value
        let value;
        
        if (type === 'string') {
          value = await this.app.core.ui.showPrompt('Property Value', 'Enter string value:', '');
        } else if (type === 'number') {
          const numStr = await this.app.core.ui.showPrompt('Property Value', 'Enter number value:', '0');
          value = parseFloat(numStr || '0');
        } else if (type === 'boolean') {
          value = await this.app.core.ui.showConfirm('Property Value', 'Set boolean value to true?');
        }
        
        // Add property to object
        this.updateObjectProperty(name, value);
        
        // Update inspector
        this.showObjectInspector(this.currentObject.object, this.currentObject.layer);
      } catch (error) {
        console.error('Error adding property:', error);
        this.app.core.ui.showError('Add Property Error', error.message);
      }
    }
    
    /**
     * Update a property on the current object
     * @param {string} property - Property name
     * @param {*} value - New property value
     */
    updateObjectProperty(property, value) {
      if (!this.currentObject || !this.currentObject.object) return;
      
      // Update the property
      this.currentObject.object[property] = value;
      
      // Notify other components
      this.app.core.events.emit('object:properties', this.currentObject.object.id, { [property]: value });
      
      // Force scene render
      this.app.sceneEditor.render();
    }
    
    /**
     * Update a property on an asset
     * @param {object} asset - Asset object
     * @param {string} property - Property name
     * @param {*} value - New property value
     */
    updateAssetProperty(asset, property, value) {
      if (!asset) return;
      
      // Update the property
      asset[property] = value;
      
      // Notify other components
      this.app.core.events.emit('asset:updated', asset.id, { [property]: value });
    }
    
    /**
     * Get type-specific properties to exclude from custom properties section
     * @param {string} type - Object type
     * @returns {Array<string>} Properties to exclude
     */
    getTypeSpecificProps(type) {
      switch (type) {
        case 'sprite':
          return ['imageId', 'tint', 'flipX', 'flipY', 'opacity'];
        case 'rectangle':
          return ['fillColor', 'borderColor', 'borderWidth', 'cornerRadius'];
        case 'circle':
          return ['fillColor', 'borderColor', 'borderWidth'];
        case 'text':
          return ['text', 'fontFamily', 'fontSize', 'fontStyle', 'textAlign', 'textColor', 'backgroundColor', 'wrap'];
        case 'tilemap':
          return ['tileset', 'tileSize', 'columns', 'rows', 'tileData'];
        default:
          return [];
      }
    }
    
    /**
     * Create a UI section
     * @param {string} title - Section title
     * @returns {HTMLElement} Section element
     */
    createSection(title) {
      const section = document.createElement('div');
      section.className = 'inspector-section';
      
      const header = document.createElement('div');
      header.className = 'section-header';
      header.textContent = title;
      section.appendChild(header);
      
      return section;
    }
    
    /**
   * Create a text field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {string} value - Field value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createTextField(id, label, value, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.value = value;
    input.addEventListener('change', () => {
      onChange(input.value);
    });
    field.appendChild(input);
    
    return field;
  }
  
  /**
   * Create a textarea field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {string} value - Field value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createTextAreaField(id, label, value, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const textarea = document.createElement('textarea');
    textarea.id = id;
    textarea.value = value;
    textarea.rows = 3;
    textarea.addEventListener('change', () => {
      onChange(textarea.value);
    });
    field.appendChild(textarea);
    
    return field;
  }
  
  /**
   * Create a number field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {number} value - Field value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createNumberField(id, label, value, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.value = value;
    input.step = 'any';
    input.addEventListener('change', () => {
      onChange(input.value);
    });
    field.appendChild(input);
    
    return field;
  }
  
  /**
   * Create a checkbox field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {boolean} checked - Checked state
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createCheckboxField(id, label, checked, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field checkbox-field';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;
    input.addEventListener('change', () => {
      onChange(input.checked);
    });
    field.appendChild(input);
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    return field;
  }
  
  /**
   * Create a color field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {string} value - Color value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createColorField(id, label, value, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field color-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const colorContainer = document.createElement('div');
    colorContainer.className = 'color-container';
    
    const colorPreview = document.createElement('div');
    colorPreview.className = 'color-preview';
    colorPreview.style.backgroundColor = value;
    colorContainer.appendChild(colorPreview);
    
    const input = document.createElement('input');
    input.type = 'color';
    input.id = id;
    input.value = value;
    input.addEventListener('change', () => {
      colorPreview.style.backgroundColor = input.value;
      onChange(input.value);
    });
    colorContainer.appendChild(input);
    
    field.appendChild(colorContainer);
    
    return field;
  }
  
  /**
   * Create a slider field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {number} value - Field value
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} step - Step value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createSliderField(id, label, value, min, max, step, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field slider-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `${id}-slider`;
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    
    const valueDisplay = document.createElement('input');
    valueDisplay.type = 'number';
    valueDisplay.id = id;
    valueDisplay.value = value;
    valueDisplay.step = step;
    valueDisplay.min = min;
    valueDisplay.max = max;
    
    // Sync slider and input
    slider.addEventListener('input', () => {
      valueDisplay.value = slider.value;
    });
    
    slider.addEventListener('change', () => {
      onChange(slider.value);
    });
    
    valueDisplay.addEventListener('change', () => {
      slider.value = valueDisplay.value;
      onChange(valueDisplay.value);
    });
    
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    field.appendChild(sliderContainer);
    
    return field;
  }
  
  /**
   * Create a dropdown field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {string} value - Selected value
   * @param {Array} options - Options array with value and label properties
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createDropdownField(id, label, value, options, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const select = document.createElement('select');
    select.id = id;
    
    // Add options
    for (const option of options) {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = option.value === value;
      select.appendChild(optionElement);
    }
    
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    
    field.appendChild(select);
    
    return field;
  }
  
  /**
   * Create a vector field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {object} vector - Vector with x and y properties
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createVectorField(id, label, vector, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field vector-field';
    
    const labelElement = document.createElement('div');
    labelElement.className = 'vector-label';
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const container = document.createElement('div');
    container.className = 'vector-container';
    
    // X component
    const xContainer = document.createElement('div');
    xContainer.className = 'vector-component';
    
    const xLabel = document.createElement('label');
    xLabel.htmlFor = `${id}-x`;
    xLabel.textContent = 'X';
    xContainer.appendChild(xLabel);
    
    const xInput = document.createElement('input');
    xInput.type = 'number';
    xInput.id = `${id}-x`;
    xInput.value = vector.x;
    xInput.step = 'any';
    xInput.addEventListener('change', () => {
      onChange('x', xInput.value);
    });
    xContainer.appendChild(xInput);
    
    container.appendChild(xContainer);
    
    // Y component
    const yContainer = document.createElement('div');
    yContainer.className = 'vector-component';
    
    const yLabel = document.createElement('label');
    yLabel.htmlFor = `${id}-y`;
    yLabel.textContent = 'Y';
    yContainer.appendChild(yLabel);
    
    const yInput = document.createElement('input');
    yInput.type = 'number';
    yInput.id = `${id}-y`;
    yInput.value = vector.y;
    yInput.step = 'any';
    yInput.addEventListener('change', () => {
      onChange('y', yInput.value);
    });
    yContainer.appendChild(yInput);
    
    container.appendChild(yContainer);
    field.appendChild(container);
    
    return field;
  }
  
  /**
   * Create an asset field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {string} assetId - Asset ID
   * @param {string} assetType - Asset type filter
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement} Field element
   */
  createAssetField(id, label, assetId, assetType, onChange) {
    const field = document.createElement('div');
    field.className = 'inspector-field asset-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const container = document.createElement('div');
    container.className = 'asset-selector';
    
    // Asset preview
    const preview = document.createElement('div');
    preview.className = 'asset-preview-small';
    
    // Find the asset
    const asset = this.app.assets.find(a => a.id === assetId);
    
    if (asset && asset.type === 'image') {
      // Show image preview
      const img = document.createElement('img');
      img.src = path.join(this.app.project.path, asset.path);
      img.alt = asset.name;
      preview.appendChild(img);
    } else {
      // Show placeholder
      const icon = document.createElement('i');
      icon.className = 'icon-file';
      preview.appendChild(icon);
    }
    
    container.appendChild(preview);
    
    // Asset name
    const assetName = document.createElement('div');
    assetName.className = 'asset-name';
    assetName.textContent = asset ? asset.name : 'None';
    container.appendChild(assetName);
    
    // Asset browse button
    const browseButton = document.createElement('button');
    browseButton.className = 'asset-browse-button';
    browseButton.textContent = 'Browse';
    browseButton.addEventListener('click', () => {
      this.showAssetSelector(assetType, (selectedAsset) => {
        // Update preview
        preview.innerHTML = '';
        
        if (selectedAsset && selectedAsset.type === 'image') {
          const img = document.createElement('img');
          img.src = path.join(this.app.project.path, selectedAsset.path);
          img.alt = selectedAsset.name;
          preview.appendChild(img);
        } else {
          const icon = document.createElement('i');
          icon.className = 'icon-file';
          preview.appendChild(icon);
        }
        
        // Update name
        assetName.textContent = selectedAsset ? selectedAsset.name : 'None';
        
        // Trigger change
        onChange(selectedAsset ? selectedAsset.id : null);
      });
    });
    container.appendChild(browseButton);
    
    field.appendChild(container);
    
    return field;
  }
  
  /**
   * Create a read-only field
   * @param {string} id - Field ID
   * @param {string} label - Field label
   * @param {string} value - Field value
   * @returns {HTMLElement} Field element
   */
  createReadOnlyField(id, label, value) {
    const field = document.createElement('div');
    field.className = 'inspector-field';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    field.appendChild(labelElement);
    
    const valueElement = document.createElement('div');
    valueElement.className = 'readonly-value';
    valueElement.textContent = value;
    field.appendChild(valueElement);
    
    return field;
  }
  
  /**
   * Show asset selector dialog
   * @param {string} assetType - Asset type filter
   * @param {Function} onSelect - Selection handler
   */
  showAssetSelector(assetType, onSelect) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal asset-selector-modal';
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'dialog asset-selector-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'dialog-header';
    header.textContent = 'Select Asset';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'dialog-close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'dialog-content';
    
    // Create asset grid
    const grid = document.createElement('div');
    grid.className = 'asset-selector-grid';
    
    // Filter assets by type
    const assets = this.app.assets.filter(asset => !assetType || asset.type === assetType);
    
    // Special case: add 'None' option
    const noneItem = document.createElement('div');
    noneItem.className = 'asset-selector-item';
    noneItem.dataset.id = '';
    
    const nonePreview = document.createElement('div');
    nonePreview.className = 'asset-preview';
    nonePreview.innerHTML = '<i class="icon-cancel"></i>';
    noneItem.appendChild(nonePreview);
    
    const noneLabel = document.createElement('div');
    noneLabel.className = 'asset-label';
    noneLabel.textContent = 'None';
    noneItem.appendChild(noneLabel);
    
    noneItem.addEventListener('click', () => {
      // Remove selected class from all items
      const items = grid.querySelectorAll('.asset-selector-item');
      items.forEach(item => item.classList.remove('selected'));
      
      // Add selected class to this item
      noneItem.classList.add('selected');
      
      // Call select handler with null
      onSelect(null);
      
      // Close dialog
      document.body.removeChild(modal);
    });
    
    grid.appendChild(noneItem);
    
    // Add asset items
    for (const asset of assets) {
      const item = document.createElement('div');
      item.className = 'asset-selector-item';
      item.dataset.id = asset.id;
      
      const preview = document.createElement('div');
      preview.className = 'asset-preview';
      
      if (asset.type === 'image') {
        // Try to show image preview
        const img = document.createElement('img');
        img.src = path.join(this.app.project.path, asset.path);
        img.alt = asset.name;
        preview.appendChild(img);
      } else {
        // Show icon for other types
        const icon = document.createElement('i');
        
        switch (asset.type) {
          case 'folder':
            icon.className = 'icon-folder';
            break;
          case 'audio':
            icon.className = 'icon-audio';
            break;
          case 'font':
            icon.className = 'icon-font';
            break;
          case 'script':
            icon.className = 'icon-script';
            break;
          default:
            icon.className = 'icon-file';
        }
        
        preview.appendChild(icon);
      }
      
      item.appendChild(preview);
      
      const label = document.createElement('div');
      label.className = 'asset-label';
      label.textContent = asset.name;
      item.appendChild(label);
      
      item.addEventListener('click', () => {
        // Remove selected class from all items
        const items = grid.querySelectorAll('.asset-selector-item');
        items.forEach(item => item.classList.remove('selected'));
        
        // Add selected class to this item
        item.classList.add('selected');
        
        // Call select handler
        onSelect(asset);
        
        // Close dialog
        document.body.removeChild(modal);
      });
      
      grid.appendChild(item);
    }
    
    content.appendChild(grid);
    dialog.appendChild(content);
    
    // Create footer
    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    
    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.className = 'dialog-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    footer.appendChild(cancelButton);
    
    dialog.appendChild(footer);
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  }
  
  /**
   * Get human-readable asset type label
   * @param {object} asset - Asset object
   * @returns {string} Type label
   */
  getAssetTypeLabel(asset) {
    switch (asset.type) {
      case 'folder':
        return 'Folder';
      case 'image':
        return 'Image';
      case 'audio':
        return 'Audio';
      case 'font':
        return 'Font';
      case 'script':
        return 'Script';
      default:
        return 'File';
    }
  }
  
  /**
   * Format file size
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
  
  // Event Handlers
  
  /**
   * Handle object selection event
   * @param {Array} selectedIds - Selected object IDs
   */
  onObjectSelection(selectedIds) {
    this.selectedObjects = selectedIds || [];
    
    // If only one object is selected, show its properties
    if (this.selectedObjects.length === 1) {
      const objectId = this.selectedObjects[0];
      
      // Find the object in all layers
      for (const layer of this.app.sceneEditor.activeScene.layers) {
        const object = layer.objects.find(obj => obj.id === objectId);
        
        if (object) {
          this.showObjectInspector(object, layer);
          return;
        }
      }
    }
    
    // Otherwise show empty state
    this.showEmptyState();
  }
  
  /**
   * Handle asset selected event
   * @param {object} asset - Selected asset
   */
  onAssetSelected(asset) {
    if (asset) {
      this.showAssetInspector(asset);
    } else {
      this.showEmptyState();
    }
  }
  
  /**
   * Handle project loaded event
   */
  onProjectLoaded() {
    // Reset state
    this.selectedObjects = [];
    this.currentObject = null;
    
    // Show empty state
    this.showEmptyState();
  }
}

// Export the Inspector class
module.exports = Inspector;