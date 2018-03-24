"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const d = require("debug");
const events_1 = require("events");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const utils = require("./utils");
const debug = d('egg-ts-helper#index');
exports.defaultConfig = {
    cwd: process.cwd(),
    framework: 'egg',
    typings: './typings',
    caseStyle: 'lower',
    autoRemoveJs: true,
    throttle: 500,
    watch: true,
    execAtInit: true,
    watchDirs: {},
    configFile: './tshelper.js',
};
// default watch dir
function getDefaultWatchDirs() {
    return {
        extend: {
            path: 'app/extend',
            interface: {
                context: 'Context',
                application: 'Application',
                agent: 'Application',
                request: 'Request',
                response: 'Response',
                helper: 'IHelper',
            },
            generator: 'extend',
            trigger: ['add', 'change', 'unlink'],
            enabled: true,
        },
        controller: {
            path: 'app/controller',
            interface: 'IController',
            generator: 'class',
            trigger: ['add', 'unlink'],
            enabled: true,
        },
        proxy: {
            path: 'app/proxy',
            interface: 'IProxy',
            generator: 'class',
            trigger: ['add', 'unlink'],
            enabled: false,
        },
        service: {
            path: 'app/service',
            interface: 'IService',
            generator: 'class',
            trigger: ['add', 'unlink'],
            enabled: true,
        },
    };
}
exports.getDefaultWatchDirs = getDefaultWatchDirs;
// preload generators
const gd = path.resolve(__dirname, './generators');
const generators = fs
    .readdirSync(gd)
    .filter(f => !f.endsWith('.d.ts'))
    .map(f => require(path.resolve(gd, f.substring(0, f.lastIndexOf('.')))).default);
class TsHelper extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.generators = {};
        this.tickerMap = {};
        const config = (this.config = this.configure(options));
        debug('framework is %s', config.framework);
        // add build-in generators
        generators.forEach(gen => gen(this));
        // cached watch list
        this.watchNameList = Object.keys(config.watchDirs).filter(key => {
            const dir = config.watchDirs[key];
            return Object.prototype.hasOwnProperty.call(dir, 'enabled')
                ? dir.enabled
                : true;
        });
        // format watch dirs
        this.watchDirs = this.watchNameList.map(key => {
            const item = config.watchDirs[key];
            const p = item.path.replace(/\/|\\/, path.sep);
            return getAbsoluteUrlByCwd(p, config.cwd);
        });
        // generate d.ts at init
        if (config.execAtInit) {
            debug('exec at init');
            process.nextTick(() => {
                this.watchDirs.forEach((_, i) => this.generateTs(i));
            });
        }
        // start watching dirs
        if (config.watch) {
            this.initWatcher();
        }
    }
    // register d.ts generator
    register(name, tsGen) {
        this.generators[name] = tsGen;
    }
    // configure
    // options > configFile > package.json
    configure(options) {
        // base config
        const config = Object.assign({}, exports.defaultConfig, { watchDirs: getDefaultWatchDirs() });
        const cwd = options.cwd || config.cwd;
        const configFile = options.configFile || config.configFile;
        const pkgInfo = utils.requireFile(path.resolve(cwd, './package.json')) || {};
        // read from package.json
        if (pkgInfo.egg) {
            config.framework = pkgInfo.egg.framework || exports.defaultConfig.framework;
            mergeConfig(config, pkgInfo.egg.tsHelper);
        }
        // read from local file
        mergeConfig(config, utils.requireFile(getAbsoluteUrlByCwd(configFile, cwd)));
        debug('%o', config);
        // merge local config and options to config
        mergeConfig(config, options);
        debug('%o', options);
        // resolve config.typings to absolute url
        config.typings = getAbsoluteUrlByCwd(config.typings, cwd);
        return config;
    }
    // init watcher
    initWatcher() {
        const config = this.config;
        // format watchDirs
        const watchDirs = this.watchDirs.map(item => {
            // glob only works with / in windows
            return path.join(item, './**/*.(js|ts)').replace(/\/|\\/g, '/');
        });
        const watcher = (this.watcher = chokidar.watch(watchDirs));
        // listen watcher event
        watcher.on('all', (event, p) => this.onChange(p, event));
        // auto remove js while ts was deleted
        if (config.autoRemoveJs) {
            watcher.on('unlink', p => {
                if (!p.endsWith('.ts')) {
                    return;
                }
                const jsPath = p.substring(0, p.lastIndexOf('.')) + '.js';
                if (fs.existsSync(jsPath)) {
                    debug('auto remove js file %s', jsPath);
                    fs.unlinkSync(jsPath);
                }
            });
        }
    }
    // find file path in watchDirs
    findInWatchDirs(p) {
        for (let i = 0; i < this.watchDirs.length; i++) {
            if (p.indexOf(this.watchDirs[i]) < 0) {
                continue;
            }
            return i;
        }
        return -1;
    }
    generateTs(index, event, file) {
        const config = this.config;
        const dir = this.watchDirs[index];
        const generatorConfig = config.watchDirs[this.watchNameList[index]];
        if (!generatorConfig.trigger ||
            (event && !generatorConfig.trigger.includes(event))) {
            // check whether need to regenerate ts
            return;
        }
        const generator = typeof generatorConfig.generator === 'string'
            ? this.generators[generatorConfig.generator]
            : generatorConfig.generator;
        if (typeof generator !== 'function') {
            throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
        }
        const result = generator(Object.assign({}, generatorConfig, { dir, file }), config);
        debug('generate ts file result : %o', result);
        if (result) {
            const resultList = Array.isArray(result) ? result : [result];
            resultList.forEach(item => {
                if (item.content) {
                    debug('created d.ts : %s', item.dist);
                    mkdirp.sync(path.dirname(item.dist));
                    fs.writeFileSync(item.dist, '// This file was auto created by egg-ts-helper\n' +
                        '// Do not modify this file!!!!!!!!!\n\n' +
                        item.content);
                    this.emit('update', item.dist);
                }
                else if (fs.existsSync(item.dist)) {
                    debug('remove d.ts : %s', item.dist);
                    fs.unlinkSync(item.dist);
                    this.emit('remove', item.dist);
                }
            });
        }
    }
    // trigger while file changed
    onChange(p, event) {
        debug('%s trigger change', p);
        // istanbul ignore next
        if (p.endsWith('d.ts')) {
            return;
        }
        const k = p.substring(0, p.lastIndexOf('.'));
        if (this.tickerMap[k]) {
            return;
        }
        // throttle 500ms
        this.tickerMap[k] = setTimeout(() => {
            const index = this.findInWatchDirs(p);
            // istanbul ignore next
            if (index < 0) {
                return;
            }
            debug('trigger change event in %s', index);
            this.emit('change', p);
            this.generateTs(index, event, p);
            this.tickerMap[k] = null;
        }, this.config.throttle);
    }
}
exports.default = TsHelper;
function getAbsoluteUrlByCwd(p, cwd) {
    return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}
// merge ts helper options
function mergeConfig(base, ...args) {
    args.forEach(opt => {
        if (!opt) {
            return;
        }
        Object.keys(opt).forEach(key => {
            if (key === 'watchDirs') {
                const watchDirs = opt.watchDirs || {};
                Object.keys(watchDirs).forEach(k => {
                    const item = watchDirs[k];
                    if (typeof item === 'boolean') {
                        if (base.watchDirs[k]) {
                            base.watchDirs[k].enabled = item;
                        }
                    }
                    else if (item) {
                        if (base.watchDirs[k]) {
                            Object.assign(base.watchDirs[k], item);
                        }
                        else {
                            base.watchDirs[k] = item;
                        }
                    }
                });
            }
            else {
                base[key] = opt[key];
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsMkJBQTJCO0FBQzNCLG1DQUFzQztBQUN0Qyx5QkFBeUI7QUFDekIsaUNBQWlDO0FBQ2pDLDZCQUE2QjtBQUM3QixpQ0FBaUM7QUFDakMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUEwQzFCLFFBQUEsYUFBYSxHQUFHO0lBQzNCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO0lBQ2xCLFNBQVMsRUFBRSxLQUFLO0lBQ2hCLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLFNBQVMsRUFBRSxPQUFPO0lBQ2xCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLFFBQVEsRUFBRSxHQUFHO0lBQ2IsS0FBSyxFQUFFLElBQUk7SUFDWCxVQUFVLEVBQUUsSUFBSTtJQUNoQixTQUFTLEVBQUUsRUFBRTtJQUNiLFVBQVUsRUFBRSxlQUFlO0NBQzVCLENBQUM7QUFFRixvQkFBb0I7QUFDcEI7SUFDRSxNQUFNLENBQUM7UUFDTCxNQUFNLEVBQUU7WUFDTixJQUFJLEVBQUUsWUFBWTtZQUNsQixTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFLFNBQVM7Z0JBQ2xCLFdBQVcsRUFBRSxhQUFhO2dCQUMxQixLQUFLLEVBQUUsYUFBYTtnQkFDcEIsT0FBTyxFQUFFLFNBQVM7Z0JBQ2xCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixNQUFNLEVBQUUsU0FBUzthQUNsQjtZQUNELFNBQVMsRUFBRSxRQUFRO1lBQ25CLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxJQUFJO1NBQ2Q7UUFFRCxVQUFVLEVBQUU7WUFDVixJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFNBQVMsRUFBRSxPQUFPO1lBQ2xCLE9B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