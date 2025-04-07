// Renderer process script
const { ipcRenderer } = require('electron');

// Import core modules
const ConfigurationManager = require('./core/ConfigurationManager');
const EventBus = require('./core/EventBus');
const FileSystemManager = require('./core/FileSystemManager');
const ModuleManager = require('./core/ModuleManager');
const UIManager = require('./core/UIManager');

class EditorRenderer {
  constructor() {
    // Core system modules
    this.core = {
      config: new ConfigurationManager(),
      events: new EventBus(),
      fs: new FileSystemManager(),
      modules: new ModuleManager(this)
    };

    this.initializeApp();
  }

  initializeApp() {
    // Load configuration
    this.core.config.load();

    // Initialize UI
    this.uiManager = new UIManager(this);
    this.uiManager.initialize();
    this.uiManager.createLayout();

    // Load modules
    this.core.modules.loadModules();
  }
}

// Initialize the renderer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.editorApp = new EditorRenderer();
});