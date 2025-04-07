// core/ModuleManager.js - Manages editor modules using dependency injection

/**
 * Module Manager - Handles registration, initialization, and management of editor modules
 * Following the Dependency Injection pattern for loose coupling
 */
class ModuleManager {
    /**
     * Create a new Module Manager
     * @param {object} app - Reference to the main application
     */
    constructor(app) {
      this.app = app;
      this.modules = {};
      this.dependencies = {};
      this.initialized = {};
    }
    
    /**
     * Register a module with the manager
     * @param {string} name - Unique name for the module
     * @param {object} moduleInstance - Instance of the module
     * @param {Array<string>} [dependencies=[]] - Names of modules this module depends on
     * @returns {boolean} Success of registration
     */
    register(name, moduleInstance, dependencies = []) {
      if (this.modules[name]) {
        console.warn(`Module '${name}' is already registered. Skipping.`);
        return false;
      }
      
      this.modules[name] = moduleInstance;
      this.dependencies[name] = dependencies;
      this.initialized[name] = false;
      
      // Log registration
      console.log(`Module '${name}' registered${dependencies.length > 0 ? ` with dependencies: ${dependencies.join(', ')}` : ''}`);
      
      return true;
    }
    
    /**
     * Initialize a module and its dependencies
     * @param {string} name - Name of the module to initialize
     * @returns {Promise<boolean>} Success of initialization
     */
    async initialize(name) {
      // Check if module exists
      if (!this.modules[name]) {
        console.error(`Cannot initialize module '${name}': Module not found`);
        return false;
      }
      
      // Check if already initialized
      if (this.initialized[name]) {
        return true;
      }
      
      // Initialize dependencies first
      for (const dependency of this.dependencies[name]) {
        if (!await this.initialize(dependency)) {
          console.error(`Failed to initialize dependency '${dependency}' for module '${name}'`);
          return false;
        }
      }
      
      // Initialize the module
      try {
        // If the module has an initialize method, call it
        if (typeof this.modules[name].initialize === 'function') {
          await this.modules[name].initialize();
        }
        
        this.initialized[name] = true;
        console.log(`Module '${name}' initialized successfully`);
        return true;
      } catch (error) {
        console.error(`Error initializing module '${name}':`, error);
        return false;
      }
    }
    
    /**
     * Initialize all registered modules
     * @returns {Promise<boolean>} Overall success of initialization
     */
    async initializeAll() {
      let success = true;
      
      // Sort modules by dependency (topological sort)
      const sortedModules = this.sortByDependency();
      
      // Initialize modules in dependency order
      for (const name of sortedModules) {
        if (!await this.initialize(name)) {
          success = false;
        }
      }
      
      return success;
    }
    
    /**
     * Get a module instance by name
     * @param {string} name - Name of the module
     * @returns {object|null} Module instance or null if not found
     */
    get(name) {
      return this.modules[name] || null;
    }
    
    /**
     * Check if a module is registered
     * @param {string} name - Name of the module
     * @returns {boolean} True if the module is registered
     */
    has(name) {
      return !!this.modules[name];
    }
    
    /**
     * Unregister a module
     * @param {string} name - Name of the module to unregister
     * @returns {boolean} Success of unregistration
     */
    unregister(name) {
      // Check if module exists
      if (!this.modules[name]) {
        return false;
      }
      
      // Check if other modules depend on this one
      for (const modName in this.dependencies) {
        if (this.dependencies[modName].includes(name)) {
          console.error(`Cannot unregister module '${name}': Module '${modName}' depends on it`);
          return false;
        }
      }
      
      // If the module has a cleanup method, call it
      if (typeof this.modules[name].cleanup === 'function') {
        try {
          this.modules[name].cleanup();
        } catch (error) {
          console.error(`Error during cleanup of module '${name}':`, error);
        }
      }
      
      // Remove the module
      delete this.modules[name];
      delete this.dependencies[name];
      delete this.initialized[name];
      
      console.log(`Module '${name}' unregistered`);
      return true;
    }
    
    /**
     * Get all registered module names
     * @returns {Array<string>} Array of module names
     */
    getModuleNames() {
      return Object.keys(this.modules);
    }
    
    /**
     * Sort modules by dependency (topological sort)
     * @returns {Array<string>} Sorted array of module names
     */
    sortByDependency() {
      const visited = {};
      const temp = {};
      const order = [];
      const modules = this.getModuleNames();
      
      // Define DFS function for topological sort
      const visit = (name) => {
        // If node is in temp, we have a cycle
        if (temp[name]) {
          throw new Error(`Circular dependency detected for module '${name}'`);
        }
        
        // If not visited yet
        if (!visited[name]) {
          // Mark as temporarily visited
          temp[name] = true;
          
          // Visit dependencies
          const dependencies = this.dependencies[name] || [];
          for (const dependency of dependencies) {
            visit(dependency);
          }
          
          // Mark as visited and add to order
          visited[name] = true;
          temp[name] = false;
          order.push(name);
        }
      };
      
      // Visit all modules
      for (const name of modules) {
        if (!visited[name]) {
          visit(name);
        }
      }
      
      return order;
    }
  }
  
  // Export the ModuleManager class
  module.exports = ModuleManager;