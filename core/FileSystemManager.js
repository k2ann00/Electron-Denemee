// core/FileSystemManager.js - Handles file system operations

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

// Convert callbacks to promises
const fsPromises = fs.promises;
const execPromise = util.promisify(exec);

/**
 * File System Manager - Abstraction for file operations
 * Handles project files, assets, and running Love2D projects
 */
class FileSystemManager {
  constructor() {
    this.projectExtension = '.love2d';
    this.projectConfigFile = 'project.json';
    this.exportDir = 'exports';
    
    // Cache for recently accessed files
    this.fileCache = new Map();
  }
  
  /**
   * Create a new project directory structure
   * @param {string} projectPath - Path where project will be created
   * @param {object} projectConfig - Project configuration
   * @returns {Promise<object>} Project data
   */
  async createProject(projectPath, projectConfig) {
    try {
      // Create main project directory
      await fsPromises.mkdir(projectPath, { recursive: true });
      
      // Create project subdirectories
      const directories = [
        'assets',
        'assets/images',
        'assets/audio',
        'assets/fonts',
        'scenes',
        'scripts',
        'objects',
        'exports'
      ];
      
      for (const dir of directories) {
        await fsPromises.mkdir(path.join(projectPath, dir), { recursive: true });
      }
      
      // Create project config file
      const configPath = path.join(projectPath, this.projectConfigFile);
      await fsPromises.writeFile(configPath, JSON.stringify(projectConfig, null, 2));
      
      // Create initial main.lua file
      const mainLuaPath = path.join(projectPath, 'main.lua');
      const mainLuaContent = this.generateMainLua(projectConfig);
      await fsPromises.writeFile(mainLuaPath, mainLuaContent);
      
      // Return the initial project data
      return {
        path: projectPath,
        config: projectConfig,
        assets: []
      };
    } catch (err) {
      console.error('Error creating project:', err);
      throw new Error(`Failed to create project: ${err.message}`);
    }
  }
  
  /**
   * Load a project from disk
   * @param {string} projectPath - Path to the project
   * @returns {Promise<object>} Project data
   */
  async loadProject(projectPath) {
    try {
      // Read project config file
      const configPath = path.join(projectPath, this.projectConfigFile);
      const configData = await fsPromises.readFile(configPath, 'utf8');
      const projectConfig = JSON.parse(configData);
      
      // Scan for assets
      const assets = await this.scanAssets(path.join(projectPath, 'assets'));
      
      // Create project data object
      const projectData = {
        path: projectPath,
        config: projectConfig,
        assets: assets
      };
      
      // Load scenes data
      projectData.scenes = await this.loadScenes(path.join(projectPath, 'scenes'));
      
      // Load objects data
      projectData.objects = await this.loadObjects(path.join(projectPath, 'objects'));
      
      return projectData;
    } catch (err) {
      console.error('Error loading project:', err);
      throw new Error(`Failed to load project: ${err.message}`);
    }
  }
  
  /**
   * Save a project to disk
   * @param {string} projectPath - Path to the project
   * @param {object} projectData - Project data to save
   * @returns {Promise<void>}
   */
  async saveProject(projectPath, projectData) {
    try {
      // Save project config
      const configPath = path.join(projectPath, this.projectConfigFile);
      await fsPromises.writeFile(configPath, JSON.stringify(projectData.config, null, 2));
      
      // Save scenes
      if (projectData.scenes) {
        const scenesDir = path.join(projectPath, 'scenes');
        await this.ensureDir(scenesDir);
        
        for (const scene of projectData.scenes) {
          const scenePath = path.join(scenesDir, `${scene.id}.json`);
          await fsPromises.writeFile(scenePath, JSON.stringify(scene, null, 2));
        }
      }
      
      // Save objects
      if (projectData.objects) {
        const objectsDir = path.join(projectPath, 'objects');
        await this.ensureDir(objectsDir);
        
        for (const object of projectData.objects) {
          const objectPath = path.join(objectsDir, `${object.id}.json`);
          await fsPromises.writeFile(objectPath, JSON.stringify(object, null, 2));
        }
      }
      
      // Generate main.lua based on current project state
      const mainLuaPath = path.join(projectPath, 'main.lua');
      const mainLuaContent = this.generateMainLua(projectData.config);
      await fsPromises.writeFile(mainLuaPath, mainLuaContent);
      
      return true;
    } catch (err) {
      console.error('Error saving project:', err);
      throw new Error(`Failed to save project: ${err.message}`);
    }
  }
  
  /**
   * Export project for a specific target platform
   * @param {string} projectPath - Path to the project
   * @param {string} target - Target platform ('love', 'moonscript', 'phaser')
   * @returns {Promise<string>} Path to exported project
   */
  async exportProject(projectPath, target) {
    try {
      const exportDir = path.join(projectPath, this.exportDir);
      await this.ensureDir(exportDir);
      
      switch (target) {
        case 'love':
          return await this.exportToLove(projectPath, exportDir);
        case 'moonscript':
          return await this.exportToMoonscript(projectPath, exportDir);
        case 'phaser':
          return await this.exportToPhaser(projectPath, exportDir);
        default:
          throw new Error(`Unknown export target: ${target}`);
      }
    } catch (err) {
      console.error(`Error exporting project to ${target}:`, err);
      throw new Error(`Failed to export project: ${err.message}`);
    }
  }
  
  /**
   * Export project to Love2D format
   * @param {string} projectPath - Path to the project
   * @param {string} exportDir - Directory to export to
   * @returns {Promise<string>} Path to exported .love file
   */
  async exportToLove(projectPath, exportDir) {
    // Implementation for Love2D export will go here
    // This would typically zip up all project files into a .love file
    throw new Error('Love2D export not implemented yet');
  }
  
  /**
   * Export project to Moonscript
   * @param {string} projectPath - Path to the project
   * @param {string} exportDir - Directory to export to
   * @returns {Promise<string>} Path to exported directory
   */
  async exportToMoonscript(projectPath, exportDir) {
    // Implementation for Moonscript export will go here
    throw new Error('Moonscript export not implemented yet');
  }
  
  /**
   * Export project to Phaser (JavaScript)
   * @param {string} projectPath - Path to the project
   * @param {string} exportDir - Directory to export to
   * @returns {Promise<string>} Path to exported directory
   */
  async exportToPhaser(projectPath, exportDir) {
    // Implementation for Phaser export will go here
    throw new Error('Phaser export not implemented yet');
  }
  
  /**
   * Run a Love2D project for testing
   * @param {string} projectPath - Path to the project
   * @returns {Promise<void>}
   */
  async runLoveProject(projectPath) {
    try {
      // Different command based on platform
      let command;
      
      if (process.platform === 'win32') {
        command = `start "" "love" "${projectPath}"`;
      } else if (process.platform === 'darwin') {
        command = `/Applications/love.app/Contents/MacOS/love "${projectPath}"`;
      } else {
        command = `love "${projectPath}"`;
      }
      
      await execPromise(command);
      return true;
    } catch (err) {
      console.error('Error running Love2D project:', err);
      throw new Error(`Failed to run project: ${err.message}`);
    }
  }
  
  /**
   * Scan a directory for assets
   * @param {string} assetDir - Path to asset directory
   * @returns {Promise<Array>} Array of asset objects
   */
  async scanAssets(assetDir) {
    try {
      const assets = [];
      
      // Ensure directory exists
      await this.ensureDir(assetDir);
      
      // Recursively scan directories
      await this.scanDir(assetDir, '', assets);
      
      return assets;
    } catch (err) {
      console.error('Error scanning assets:', err);
      return [];
    }
  }
  
  /**
   * Recursively scan a directory for files
   * @param {string} baseDir - Base directory
   * @param {string} subDir - Subdirectory path (relative to baseDir)
   * @param {Array} assets - Array to populate with found assets
   */
  async scanDir(baseDir, subDir, assets) {
    const currentDir = path.join(baseDir, subDir);
    
    try {
      const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const relativePath = path.join(subDir, entry.name);
        const fullPath = path.join(baseDir, relativePath);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectory
          await this.scanDir(baseDir, relativePath, assets);
        } else {
          // Add file to assets
          const stats = await fsPromises.stat(fullPath);
          
          assets.push({
            id: this.generateAssetId(relativePath),
            name: entry.name,
            path: relativePath,
            type: this.getAssetType(entry.name),
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          });
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${currentDir}:`, err);
    }
  }
  
  /**
   * Load scenes from directory
   * @param {string} scenesDir - Path to scenes directory
   * @returns {Promise<Array>} Array of scene objects
   */
  async loadScenes(scenesDir) {
    try {
      const scenes = [];
      
      // Ensure directory exists
      await this.ensureDir(scenesDir);
      
      // Read all JSON files in directory
      const files = await fsPromises.readdir(scenesDir);
      
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const scenePath = path.join(scenesDir, file);
          const sceneData = await fsPromises.readFile(scenePath, 'utf8');
          scenes.push(JSON.parse(sceneData));
        }
      }
      
      return scenes;
    } catch (err) {
      console.error('Error loading scenes:', err);
      return [];
    }
  }
  
  /**
   * Load objects from directory
   * @param {string} objectsDir - Path to objects directory
   * @returns {Promise<Array>} Array of object definitions
   */
  async loadObjects(objectsDir) {
    try {
      const objects = [];
      
      // Ensure directory exists
      await this.ensureDir(objectsDir);
      
      // Read all JSON files in directory
      const files = await fsPromises.readdir(objectsDir);
      
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const objectPath = path.join(objectsDir, file);
          const objectData = await fsPromises.readFile(objectPath, 'utf8');
          objects.push(JSON.parse(objectData));
        }
      }
      
      return objects;
    } catch (err) {
      console.error('Error loading objects:', err);
      return [];
    }
  }
  
  /**
   * Generate a main.lua file based on project config
   * @param {object} config - Project configuration
   * @returns {string} Content for main.lua
   */
  generateMainLua(config) {
    return `-- Generated by Love2D Editor Suite
-- Project: ${config.name}
-- Version: ${config.version}
-- Created: ${new Date().toISOString()}

function love.load()
  -- Load project configuration
  local projectConfig = {
    name = "${config.name}",
    version = "${config.version}",
    width = ${config.width || 800},
    height = ${config.height || 600}
  }
  
  -- Set window properties
  love.window.setTitle(projectConfig.name)
  love.window.setMode(projectConfig.width, projectConfig.height)
  
  -- Initialize game state
  gameState = {
    scenes = {},
    currentScene = nil
  }
  
  -- Load the initial scene
  loadScene("${config.initialScene || 'main'}")
end

function love.update(dt)
  if gameState.currentScene and gameState.currentScene.update then
    gameState.currentScene:update(dt)
  end
end

function love.draw()
  if gameState.currentScene and gameState.currentScene.draw then
    gameState.currentScene:draw()
  end
end

function loadScene(sceneName)
  if gameState.scenes[sceneName] then
    gameState.currentScene = gameState.scenes[sceneName]
    return
  end
  
  -- Try to load the scene
  local success, scene = pcall(require, "scenes." .. sceneName)
  
  if success then
    gameState.scenes[sceneName] = scene
    gameState.currentScene = scene
    
    if scene.init then
      scene:init()
    end
  else
    print("Error loading scene: " .. sceneName)
    print(scene)
  end
end
`;
  }
  
  /**
   * Ensure a directory exists
   * @param {string} dir - Directory path
   */
  async ensureDir(dir) {
    try {
      await fsPromises.mkdir(dir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
  }
  
  /**
   * Get the asset type based on file extension
   * @param {string} filename - Name of the file
   * @returns {string} Asset type
   */
  getAssetType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    const typeMap = {
      // Image files
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.gif': 'image',
      '.bmp': 'image',
      
      // Audio files
      '.mp3': 'audio',
      '.wav': 'audio',
      '.ogg': 'audio',
      
      // Font files
      '.ttf': 'font',
      '.otf': 'font',
      
      // Script files
      '.lua': 'script',
      '.moon': 'script',
      '.js': 'script',
      
      // Data files
      '.json': 'data',
      '.xml': 'data',
      '.csv': 'data'
    };
    
    return typeMap[ext] || 'other';
  }
  
  /**
   * Generate a unique ID for an asset
   * @param {string} path - Asset path
   * @returns {string} Unique ID
   */
  generateAssetId(path) {
    // Replace non-alphanumeric characters with underscores
    return path.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  /**
   * Read a file and cache its contents
   * @param {string} filePath - Path to the file
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<Buffer|string>} File contents
   */
  async readFile(filePath, encoding = 'utf8') {
    const cacheKey = `${filePath}:${encoding}`;
    
    // Check cache first
    if (this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey);
    }
    
    try {
      const content = await fsPromises.readFile(filePath, encoding);
      
      // Cache the content
      this.fileCache.set(cacheKey, content);
      
      return content;
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err);
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }
  
  /**
   * Write a file and update cache
   * @param {string} filePath - Path to the file
   * @param {string|Buffer} content - Content to write
   * @param {string} encoding - File encoding (default: 'utf8')
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content, encoding = 'utf8') {
    try {
      await fsPromises.writeFile(filePath, content, encoding);
      
      // Update cache
      const cacheKey = `${filePath}:${encoding}`;
      this.fileCache.set(cacheKey, content);
    } catch (err) {
      console.error(`Error writing file ${filePath}:`, err);
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }
  
  /**
   * Clear the file cache
   */
  clearCache() {
    this.fileCache.clear();
  }
  
  /**
   * Remove a specific file from cache
   * @param {string} filePath - Path to the file
   */
  removeFromCache(filePath) {
    // Remove all cache entries for this file regardless of encoding
    for (const key of this.fileCache.keys()) {
      if (key.startsWith(`${filePath}:`)) {
        this.fileCache.delete(key);
      }
    }
  }
}

// Export the FileSystemManager class
module.exports = FileSystemManager;