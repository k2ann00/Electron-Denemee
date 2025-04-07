// core/ConfigurationManager.js - Manages application and project settings

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Configuration Manager - Handles application and project settings
 * Follows the Single Responsibility Principle to manage only configuration
 */
class ConfigurationManager {
  constructor() {
    // Base path for configuration files
    this.configDir = path.join(os.homedir(), '.love2d-editor');
    
    // Main application config file
    this.appConfigFile = 'config.json';
    
    // Current configuration data
    this.appConfig = {
      version: '1.0.0',
      theme: 'light',
      recentProjects: [],
      editor: {
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, Consolas, monospace',
        tabSize: 2,
        autoSave: true
      },
      exportSettings: {
        defaultTarget: 'love'
      },
      windowState: {
        width: 1280,
        height: 800,
        maximized: false
      },
      externalEditors: {
        image: '',
        audio: '',
        script: ''
      }
    };
    
    this.projectConfig = null;
  }
  
  /**
   * Initialize the configuration system
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Ensure config directory exists
      await this.ensureConfigDir();
      
      // Load application config
      await this.load();
      
      console.log('Configuration initialized');
    } catch (error) {
      console.error('Error initializing configuration:', error);
      // Continue with default configuration
    }
  }
  
  /**
   * Ensure the configuration directory exists
   * @returns {Promise<void>}
   */
  async ensureConfigDir() {
    try {
      await fs.promises.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * Load application configuration from disk
   * @returns {Promise<object>} Configuration object
   */
  async load() {
    const configPath = path.join(this.configDir, this.appConfigFile);
    
    try {
      // Check if config file exists
      const stats = await fs.promises.stat(configPath);
      
      if (stats.isFile()) {
        // Load and parse configuration
        const data = await fs.promises.readFile(configPath, 'utf8');
        const loadedConfig = JSON.parse(data);
        
        // Merge with default config (keeping defaults for missing properties)
        this.appConfig = this.mergeConfigs(this.appConfig, loadedConfig);
        
        console.log('Configuration loaded from', configPath);
      } else {
        // Create default config if file doesn't exist
        await this.save();
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default config
        await this.save();
      } else {
        console.error('Error loading configuration:', error);
        throw error;
      }
    }
    
    return this.appConfig;
  }
  
  /**
   * Save application configuration to disk
   * @returns {Promise<void>}
   */
  async save() {
    const configPath = path.join(this.configDir, this.appConfigFile);
    
    try {
      // Ensure config directory exists
      await this.ensureConfigDir();
      
      // Write configuration to file
      await fs.promises.writeFile(
        configPath,
        JSON.stringify(this.appConfig, null, 2),
        'utf8'
      );
      
      console.log('Configuration saved to', configPath);
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Dot-notation key path (e.g., 'editor.fontSize')
   * @param {*} defaultValue - Default value if key is not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    // Split key into path parts
    const parts = key.split('.');
    
    // Start with the full config object
    let current = this.appConfig;
    
    // Traverse the path
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // If current level doesn't exist or is not an object, return default
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      
      // Move to next level
      current = current[part];
      
      // If we've reached the end of the path, return the value
      if (i === parts.length - 1) {
        return current !== undefined ? current : defaultValue;
      }
    }
    
    return defaultValue;
  }
  
  /**
   * Set a configuration value
   * @param {string} key - Dot-notation key path (e.g., 'editor.fontSize')
   * @param {*} value - Value to set
   * @returns {boolean} Success
   */
  set(key, value) {
    // Split key into path parts
    const parts = key.split('.');
    
    // Start with the full config object
    let current = this.appConfig;
    
    // Traverse the path
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // If we're at the last part, set the value
      if (i === parts.length - 1) {
        current[part] = value;
        return true;
      }
      
      // If the path doesn't exist yet, create it
      if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      
      // Move to next level
      current = current[part];
    }
    
    return false;
  }
  
  /**
   * Add a project to the recent projects list
   * @param {string} projectPath - Path to the project
   * @param {string} projectName - Name of the project
   */
  addRecentProject(projectPath, projectName) {
    // Get current recent projects
    const recentProjects = this.get('recentProjects', []);
    
    // Remove if already exists
    const filteredProjects = recentProjects.filter(
      project => project.path !== projectPath
    );
    
    // Add to the beginning of the list
    filteredProjects.unshift({
      path: projectPath,
      name: projectName,
      lastOpened: new Date().toISOString()
    });
    
    // Limit to 10 most recent projects
    if (filteredProjects.length > 10) {
      filteredProjects.length = 10;
    }
    
    // Update config
    this.set('recentProjects', filteredProjects);
    
    // Save config
    this.save().catch(error => {
      console.error('Error saving recent projects:', error);
    });
  }
  
  /**
   * Get the list of recent projects
   * @returns {Array} Recent projects list
   */
  getRecentProjects() {
    return this.get('recentProjects', []);
  }
  
  /**
   * Load project configuration
   * @param {string} projectPath - Path to the project
   * @returns {Promise<object>} Project configuration
   */
  async loadProjectConfig(projectPath) {
    const configPath = path.join(projectPath, 'project.json');
    
    try {
      const data = await fs.promises.readFile(configPath, 'utf8');
      this.projectConfig = JSON.parse(data);
      return this.projectConfig;
    } catch (error) {
      console.error('Error loading project configuration:', error);
      throw error;
    }
  }
  
  /**
   * Save project configuration
   * @param {string} projectPath - Path to the project
   * @param {object} config - Project configuration to save
   * @returns {Promise<void>}
   */
  async saveProjectConfig(projectPath, config) {
    const configPath = path.join(projectPath, 'project.json');
    
    try {
      await fs.promises.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        'utf8'
      );
      
      this.projectConfig = config;
      console.log('Project configuration saved to', configPath);
    } catch (error) {
      console.error('Error saving project configuration:', error);
      throw error;
    }
  }
  
  /**
   * Get project configuration
   * @returns {object|null} Project configuration or null if not loaded
   */
  getProjectConfig() {
    return this.projectConfig;
  }
  
  /**
   * Create a new project configuration
   * @param {string} name - Project name
   * @param {object} [options={}] - Additional project options
   * @returns {object} New project configuration
   */
  createProjectConfig(name, options = {}) {
    // Create default project configuration
    const config = {
      name: name,
      version: '1.0.0',
      description: options.description || '',
      author: options.author || '',
      width: options.width || 800,
      height: options.height || 600,
      initialScene: options.initialScene || 'main',
      orientation: options.orientation || 'landscape',
      targetPlatforms: options.targetPlatforms || ['desktop'],
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    
    this.projectConfig = config;
    return config;
  }
  
  /**
   * Merge two configuration objects
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @returns {object} Merged configuration
   */
  mergeConfigs(target, source) {
    const result = { ...target };
    
    // Iterate over properties in source
    for (const key in source) {
      // If property exists in both and they are objects, merge recursively
      if (
        key in target &&
        typeof target[key] === 'object' &&
        typeof source[key] === 'object' &&
        !Array.isArray(target[key]) &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.mergeConfigs(target[key], source[key]);
      } else {
        // Otherwise just copy from source
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Export the ConfigurationManager class
module.exports = ConfigurationManager;