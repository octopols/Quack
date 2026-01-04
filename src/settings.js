// Settings Manager - Chrome storage API


const DEFAULT_SETTINGS = {
  caseSensitive: false,
  searchInReplies: true,
  searchInAuthorNames: false,
  highlightMatches: true,
  useRegex: false,
  wholeWord: false
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
