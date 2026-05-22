// Example services
export default class Logger {
    log(...data) {
        console.log(...data);
    }

    info(...data) {
        console.info(...data)
    }

    debug(...data) {
        console.debug(...data)
    }

    error(...data) {
        console.error(...data)
    }

    fatal(...data) {
        console.fatal(...data)
    }
}