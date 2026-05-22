export default class Settings {
    #currentSettings = {};
    
    constructor(logger) {
        this.logger = logger;
        this.#currentSettings = { 
            highScore: 800,
            muted: false
        };
    }

    load() {
        // To Do: load settings from cookies
        this.logger.log("Loading settings...");
        return this.#currentSettings;
    }

    save() {
        // To Do; Save settings to cookies
        this.logger.log("Saving the settings...");
    }
}