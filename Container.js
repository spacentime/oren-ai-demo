export default class Container {
    constructor() {
        this.services = new Map();
    }

    register(name, definition, dependencies = [], options = { singleton: true }) {
        this.services.set(name, { definition, dependencies, options, instance: null });
    }

    get(name) {
        try {
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
        } catch (e) {
            console.error(`Error getting service by the name ${name}, error`, e);
        }
        
    }
}
