import Settings from './Settings.js';
import App from './App.js';
import Logger from './Logger.js';
import Container from './Container.js'
import Game from './Game.js';
import Audio from './Audio.js';
import GameRenderer from './GameRenderer.js';
import MobileSupport from './MobileSupport.js';
import GameCanvas from './GameCanvas.js';
import Cherry from './Cherry.js';
import PowerSession from './PowerSession.js';
import Pac from './Pac.js';

// Define app service container and register all services
// --- Usage ---
const options = { singleton: true };
const container = new Container();

// Register all services in the app service container
container.register("logger", Logger, [] , options);
container.register("settings", Settings, ["logger"], options);
container.register("audio", Audio, [], options);
container.register("cherry",Cherry);
container.register("powerSession", PowerSession);
container.register("pac", Pac);
container.register("game", Game, ["audio", "cherry", "powerSession", "pac"], options);
container.register("canvas", GameCanvas,[], options);
container.register("renderer", GameRenderer, ["canvas", "game", "audio"]);
container.register("mobileSupport", MobileSupport, ["game", "canvas","audio"], options);
container.register("app", App, ["logger","settings","game", "mobileSupport", "renderer", "canvas"], options);

// First time we request "app", it will create the App class and all it's dependancies
const app = container.get("app");
app.run();