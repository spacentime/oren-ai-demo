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

class Container {
    constructor() {
        this.services = new Map();
    }

    register(name, definition, dependencies = [], options = { singleton: true }) {
        this.services.set(name, { definition, dependencies, options, instance: null });
    }

    get(name) {
        const service = this.services.get(name);
        if (!service) throw new Error(`Service '${name}' not found`);

        // Singleton: return existing instance
        if (service.options.singleton && service.instance) {
            return service.instance;
        }

        // Resolve dependencies recursively
        const deps = service.dependencies.map(dep => this.get(dep));
        const instance = new service.definition(...deps);

        if (service.options.singleton) {
            service.instance = instance;
        }

        return instance;
    }
}

// --- Register services ---
const container = new Container();
container.register("logger", Logger, [] , {singleton: true});
container.register("apiService", ApiService, ["logger"]);
container.register("app", App, ["apiService"]);

// --- Resolve and run ---
const appInstance = container.get("app");
appInstance.run();
