// Settings Manager - Chrome storage API


const DEFAULT_SETTINGS = {
  caseSensitive: false,
  searchInReplies: true,
  searchInAuthorNames: false,
  highlightMatches: true,
  useRegex: false,
  wholeWord: false,
  searchHistory: []
};


class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = [];
  }


  async init() {
    try {
      const result = await chrome.storage.sync.get('quackSettings');

      if (result.quackSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...result.quackSettings };
      }
      return this.settings;
    } catch (error) {
      return this.settings;
    }
  }


  getSettings() {
    return { ...this.settings };
  }


  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.sync.set({ quackSettings: this.settings });

      // Notify all listeners of settings change
      this.listeners.forEach(listener => listener(this.settings));

      return this.settings;
    } catch (error) {
      throw error;
    }
  }


  async resetSettings() {
    return this.updateSettings(DEFAULT_SETTINGS);
  }


  /**
   * Add a search query to history (max 5 items, no duplicates)
   */
  async addToHistory(query) {
    if (!query || query.trim() === '') return;

    const trimmed = query.trim();
    let history = this.settings.searchHistory || [];

    // Remove if already exists (to move to top)
    history = history.filter(h => h !== trimmed);

    // Add to beginning
    history.unshift(trimmed);

    // Keep only last 5
    history = history.slice(0, 5);

    await this.updateSettings({ searchHistory: history });
  }


  /**
   * Get search history
   */
  getHistory() {
    return this.settings.searchHistory || [];
  }


  addListener(callback) {
    this.listeners.push(callback);
  }


  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}


const settingsManager = new SettingsManager();
