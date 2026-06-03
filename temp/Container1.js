// Example services
class Logger {
    log(message) {
        console.log(`[LOG]: ${message}`);
    }
}

class ApiService {
    constructor(logger) {
        this.logger = logger;
        this.logger.log("ApiService created!");
    }

    fetchData() {
        this.logger.log("Fetching data...");
        return { data: "Some data" };
    }
}

class App {
    constructor(apiService) {
        this.apiService = apiService;
        console.log("App created!");
    }

    run() {
        const result = this.apiService.fetchData();
        console.log("Data received:", result);
    }
}

// IoC Container with Lazy Instantiation
class Container {
    constructor() {
        this.services = new Map();
    }

    /**
     * Register a service definition
     * @param {string} name - Service name
     * @param {Function} definition - Class constructor
     * @param {Array<string>} dependencies - Names of dependencies
     */
    register(name, definition, dependencies = []) {
        this.services.set(name, {
            definition,
            dependencies,
            instance: null // Will be created lazily
        });
    }

    /**
     * Resolve a service (create it only when first requested)
     */
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }

        // Lazy instantiation
        if (!service.instance) {
            const deps = service.dependencies.map(dep => this.get(dep));
            service.instance = new service.definition(...deps);
        }
        return service.instance;
    }
}

// --- Usage ---
const container = new Container();
container.register("logger", Logger);
container.register("apiService", ApiService, ["logger"]);
container.register("app", App, ["apiService"]);

// Nothing is created yet
console.log("Before first use...");

// First time we request "app", it will create App -> ApiService -> Logger
const app = container.get("app");
app.run();

// Second time, it reuses the same instance (singleton behavior)
const app2 = container.get("app");
console.log("Same instance?", app === app2);
