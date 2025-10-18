/**
 * Settings Manager Module
 * Handles Chrome storage API for persisting user settings across sessions
 */

// Default settings configuration
const DEFAULT_SETTINGS = {
  caseSensitive: false,
  searchInReplies: true,
  searchInAuthorNames: false,
  highlightMatches: true
};

/**
 * Settings manager class
 */
class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = [];
  }

  /**
   * Initialize settings by loading from Chrome storage
   * @returns {Promise<Object>} Loaded settings
   */
  async init() {
    try {
      const result = await chrome.storage.sync.get('quackSettings');
      if (result.quackSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...result.quackSettings };
      }
      console.log('[Settings] Loaded settings:', this.settings);
      return this.settings;
    } catch (error) {
      console.error('[Settings] Error loading settings:', error);
      return this.settings;
    }
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update settings and persist to Chrome storage
   * @param {Object} newSettings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.sync.set({ quackSettings: this.settings });
      console.log('[Settings] Updated settings:', this.settings);
      
      // Notify all listeners of settings change
      this.listeners.forEach(listener => listener(this.settings));
      
      return this.settings;
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   * @returns {Promise<Object>} Reset settings
   */
  async resetSettings() {
    return this.updateSettings(DEFAULT_SETTINGS);
  }

  /**
   * Add a listener for settings changes
   * @param {Function} callback - Callback function to execute on settings change
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a settings change listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}

// Create and export singleton instance
const settingsManager = new SettingsManager();
