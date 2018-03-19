"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const d = require("debug");
const events_1 = require("events");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
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
    watchDirs: {
        extend: {
            path: 'app/extend',
            interface: {
                context: 'Context',
                application: 'Application',
                request: 'Request',
                response: 'Response',
                helper: 'IHelper',
            },
            generator: 'extend',
            trigger: ['add', 'change', 'unlink'],
        },
        controller: {
            path: 'app/controller',
            interface: 'IController',
            generator: 'class',
            trigger: ['add', 'unlink'],
        },
        proxy: {
            path: 'app/proxy',
            interface: 'IProxy',
            generator: 'class',
            trigger: ['add', 'unlink'],
        },
        service: {
            path: 'app/service',
            interface: 'IService',
            generator: 'class',
            trigger: ['add', 'unlink'],
        },
    },
};
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
        const config = Object.assign({}, exports.defaultConfig, options);
        // merge watchDirs
        config.watchDirs = Object.assign({}, exports.defaultConfig.watchDirs, options.watchDirs);
        // resolve config.typings to absolute url
        config.typings = getAbsoluteUrlByCwd(config.typings, config.cwd);
        // get framework name from option or package.json
        const pkgInfoPath = path.resolve(config.cwd, './package.json');
        if (fs.existsSync(pkgInfoPath)) {
            const pkgInfo = require(pkgInfoPath);
            config.framework =
                options.framework ||
                    (pkgInfo.egg ? pkgInfo.egg.framework : null) ||
                    exports.defaultConfig.framework;
        }
        debug('framework is %s', config.framework);
        this.config = config;
        // add build-in generators
        generators.forEach(gen => gen(this));
        // cached watch list
        this.watchNameList = Object.keys(this.config.watchDirs).filter(key => !!this.config.watchDirs[key]);
        // format watch dirs
        this.watchDirs = this.watchNameList.map(key => {
            const item = this.config.watchDirs[key];
            const p = item.path.replace(/\/|\\/, path.sep);
            return getAbsoluteUrlByCwd(p, config.cwd);
        });
        // generate d.ts at init
        if (this.config.execAtInit) {
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
        if (event && !generatorConfig.trigger.includes(event)) {
            // check whether need to regenerate ts
            return;
        }
        const generator = this.generators[generatorConfig.generator];
        if (!generator) {
            throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
        }
        const result = generator(Object.assign({}, generatorConfig, { dir, file }), config);
        debug('generate ts file result : %o', result);
        if (result) {
            const resultList = Array.isArray(result) ? result : [result];
            resultList.forEach(item => {
                if (item.content) {
                    debug('generated d.ts : %s', item.dist);
                    mkdirp.sync(path.dirname(item.dist));
                    fs.writeFileSync(item.dist, '// This file was auto generated by ts-helper\n' +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsMkJBQTJCO0FBQzNCLG1DQUFzQztBQUN0Qyx5QkFBeUI7QUFDekIsaUNBQWlDO0FBQ2pDLDZCQUE2QjtBQUM3QixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQXdDMUIsUUFBQSxhQUFhLEdBQUc7SUFDM0IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUU7SUFDbEIsU0FBUyxFQUFFLEtBQUs7SUFDaEIsT0FBTyxFQUFFLFdBQVc7SUFDcEIsU0FBUyxFQUFFLE9BQU87SUFDbEIsWUFBWSxFQUFFLElBQUk7SUFDbEIsUUFBUSxFQUFFLEdBQUc7SUFDYixLQUFLLEVBQUUsSUFBSTtJQUNYLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFNBQVMsRUFBRTtRQUNULE1BQU0sRUFBRTtZQUNOLElBQUksRUFBRSxZQUFZO1lBQ2xCLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUUsU0FBUztnQkFDbEIsV0FBVyxFQUFFLGFBQWE7Z0JBQzFCLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixRQUFRLEVBQUUsVUFBVTtnQkFDcEIsTUFBTSxFQUFFLFNBQVM7YUFDbEI7WUFDRCxTQUFTLEVBQUUsUUFBUTtZQUNuQixPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQztTQUNyQztRQUVELFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxnQkFBZ0I7WUFDdEIsU0FBUyxFQUFFLGFBQWE7WUFDeEIsU0FBUyxFQUFFLE9BQU87WUFDbEIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztTQUMzQjtRQUVELEtBQUssRUFBRTtZQUNMLElBQUksRUFBRSxXQUFXO1lBQ2pCLFNBQVMsRUFBRSxRQUFRO1lBQ25CLFNBQVMsRUFBRSxPQUFPO1lBQ2xCLE9B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