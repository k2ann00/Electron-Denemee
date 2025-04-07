// core/EventBus.js - Central event management system

/**
 * Event Bus - Handles communication between different parts of the application
 * through publish/subscribe pattern
 */
class EventBus {
    constructor() {
      this.eventHandlers = {};
      this.onceHandlers = {};
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to subscribe to
     * @param {function} handler - Function to call when event occurs
     */
    on(eventName, handler) {
      if (!this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = [];
      }
      
      this.eventHandlers[eventName].push(handler);
      
      // Return unsubscribe function
      return () => {
        this.off(eventName, handler);
      };
    }
    
    /**
     * Subscribe to an event once
     * @param {string} eventName - Name of the event to subscribe to
     * @param {function} handler - Function to call when event occurs
     */
    once(eventName, handler) {
      const wrappedHandler = (...args) => {
        this.off(eventName, wrappedHandler);
        handler(...args);
      };
      
      if (!this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = [];
      }
      
      this.eventHandlers[eventName].push(wrappedHandler);
      
      // Return unsubscribe function
      return () => {
        this.off(eventName, wrappedHandler);
      };
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event to unsubscribe from
     * @param {function} handler - Handler function to remove
     */
    off(eventName, handler) {
      if (!this.eventHandlers[eventName]) {
        return;
      }
      
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        registeredHandler => registeredHandler !== handler
      );
      
      // Clean up empty handler arrays
      if (this.eventHandlers[eventName].length === 0) {
        delete this.eventHandlers[eventName];
      }
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Name of the event to emit
     * @param {...any} args - Arguments to pass to handlers
     */
    emit(eventName, ...args) {
      if (this.eventHandlers[eventName]) {
        // Create a copy of the handlers array to avoid issues if handlers are removed during emission
        const handlers = [...this.eventHandlers[eventName]];
        
        handlers.forEach(handler => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in event handler for ${eventName}:`, error);
          }
        });
      }
    }
    
    /**
     * Clear all event handlers
     */
    clear() {
      this.eventHandlers = {};
    }
    
    /**
     * Clear all event handlers for a specific event
     * @param {string} eventName - Name of the event to clear
     */
    clearEvent(eventName) {
      delete this.eventHandlers[eventName];
    }
    
    /**
     * Get all registered event names
     * @returns {string[]} Array of event names
     */
    getEventNames() {
      return Object.keys(this.eventHandlers);
    }
    
    /**
     * Check if an event has handlers
     * @param {string} eventName - Name of the event to check
     * @returns {boolean} True if the event has handlers
     */
    hasHandlers(eventName) {
      return !!this.eventHandlers[eventName] && this.eventHandlers[eventName].length > 0;
    }
  }
  
  // Export the EventBus class
  module.exports = EventBus;