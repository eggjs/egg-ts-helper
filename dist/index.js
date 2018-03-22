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
        const config = (this.config = this.mergeConfig(options));
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
    mergeConfig(options) {
        // base config
        const config = Object.assign({}, exports.defaultConfig);
        // merge local config
        const localConfigFile = getAbsoluteUrlByCwd(options.configFile || config.configFile, options.cwd || config.cwd);
        // read local config
        if (fs.existsSync(localConfigFile)) {
            let exp = require(localConfigFile);
            if (typeof exp === 'function') {
                exp = exp();
            }
            Object.assign(options, exp);
        }
        // merge local config and options to config
        Object.assign(config, options, {
            watchDirs: getDefaultWatchDirs(),
        });
        // merge watchDirs
        if (options.watchDirs) {
            const watchDirs = options.watchDirs;
            Object.keys(watchDirs).forEach(key => {
                const item = watchDirs[key];
                if (typeof item === 'boolean') {
                    if (config.watchDirs[key]) {
                        config.watchDirs[key].enabled = item;
                    }
                }
                else if (item) {
                    config.watchDirs[key] = item;
                }
            });
        }
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
        if (event && !generatorConfig.trigger.includes(event)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsMkJBQTJCO0FBQzNCLG1DQUFzQztBQUN0Qyx5QkFBeUI7QUFDekIsaUNBQWlDO0FBQ2pDLDZCQUE2QjtBQUM3QixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQTBDMUIsUUFBQSxhQUFhLEdBQUc7SUFDM0IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUU7SUFDbEIsU0FBUyxFQUFFLEtBQUs7SUFDaEIsT0FBTyxFQUFFLFdBQVc7SUFDcEIsU0FBUyxFQUFFLE9BQU87SUFDbEIsWUFBWSxFQUFFLElBQUk7SUFDbEIsUUFBUSxFQUFFLEdBQUc7SUFDYixLQUFLLEVBQUUsSUFBSTtJQUNYLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLGVBQWU7Q0FDNUIsQ0FBQztBQUVGLG9CQUFvQjtBQUNwQjtJQUNFLE1BQU0sQ0FBQztRQUNMLE1BQU0sRUFBRTtZQUNOLElBQUksRUFBRSxZQUFZO1lBQ2xCLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUUsU0FBUztnQkFDbEIsV0FBVyxFQUFFLGFBQWE7Z0JBQzFCLEtBQUssRUFBRSxhQUFhO2dCQUNwQixPQUFPLEVBQUUsU0FBUztnQkFDbEIsUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLE1BQU0sRUFBRSxTQUFTO2FBQ2xCO1lBQ0QsU0FBUyxFQUFFLFFBQVE7WUFDbkIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDcEMsT0FBTyxFQUFFLElBQUk7U0FDZDtRQUVELFVBQVUsRUFBRTtZQUNWLElBQUksRUFBRSxnQkFBZ0I7WUFDdEIsU0FBUyxFQUFFLGFBQWE7WUFDeEIsU0FBUyxFQUFFLE9BQU87WUFDbEIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztZQUMxQixPQUFPLEVBQUUsSUFBSTtTQUNkO1FBRUQsS0FBSyxFQUFFO1lBQ0wsSUFBSSxFQUFFLFdBQVc7WUFDakIsU0FBUyxFQUFFLFFBQVE7WUFDbkIsU0FBUyxFQUFFLE9BQU87WUFDbEIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztZQUMxQixPQUFPLEVBQUUsS0FBSztTQUNmO1FBRUQsT0FBTyxFQUFFO1lBQ1AsSUFBSSxFQUFFLGFBQWE7WUFDbkIsU0FBUyxFQUFFLFVBQVU7WUFDckIsU0FBUyxFQUFFLE9BQU87WUFDbEIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztZQUMxQixPQUFPLEVBQUUsSUFBSTtTQUNkO0tBQ0YsQ0FBQztBQUNKLENBQUM7QUF6Q0Qsa0RBeUNDO0FBRUQscUJBQXFCO0FBQ3JCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ25ELE1BQU0sVUFBVSxHQUFHLEVBQUU7S0FDbEIsV0FBVyxDQUFDLEVBQUUsQ0FBQztLQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNqQyxHQUFHLENBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQzNFLENBQUM7QUFFSixjQUE4QixTQUFRLHFCQUFZO0lBUWhELFlBQVksVUFBMEIsRUFBRTtRQUN0QyxLQUFLLEVBQUUsQ0FBQztRQUxELGVBQVUsR0FBd0MsRUFBRSxDQUFDO1FBRXRELGNBQVMsR0FBZ0IsRUFBRSxDQUFDO1FBS2xDLE1BQU0sTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFekQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUzQywwQkFBMEI7UUFDMUIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXJDLG9CQUFvQjtRQUNwQixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM5RCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQztnQkFDekQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO2dCQUNiLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzVDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN0QixLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDckIsQ0FBQztJQUNILENBQUM7SUFFRCwwQkFBMEI7SUFDMUIsUUFBUSxDQUNOLElBQVksRUFDWixLQUFxQjtRQUVyQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNoQyxDQUFDO0lBRUQsWUFBWTtJQUNKLFdBQVcsQ0FBQyxPQUF1QjtRQUN6QyxjQUFjO1FBQ2QsTUFBTSxNQUFNLHFCQUFRLHFCQUFhLENBQUUsQ0FBQztRQUVwQyxxQkFBcUI7UUFDckIsTUFBTSxlQUFlLEdBQUcsbUJBQW1CLENBQ3pDLE9BQU8sQ0FBQyxVQUFVLElBQUksTUFBTSxDQUFDLFVBQVUsRUFDdkMsT0FBTyxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUMxQixDQUFDO1FBRUYsb0JBQW9CO1FBQ3BCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDZCxDQUFDO1lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUU7WUFDN0IsU0FBUyxFQUFFLG1CQUFtQixFQUFFO1NBQ2pDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNuQyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQzlCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMxQixNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7b0JBQ3ZDLENBQUM7Z0JBQ0gsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDaEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQy9CLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsTUFBTSxDQUFDLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVqRSxpREFBaUQ7UUFDakQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDL0QsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxTQUFTO2dCQUNkLE9BQU8sQ0FBQyxTQUFTO29CQUNqQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzVDLHFCQUFhLENBQUMsU0FBUyxDQUFDO1FBQzVCLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBd0IsQ0FBQztJQUNsQyxDQUFDO0lBRUQsZUFBZTtJQUNQLFdBQVc7UUFDakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQixtQkFBbUI7UUFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDMUMsb0NBQW9DO1lBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRTNELHVCQUF1QjtRQUN2QixPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFekQsc0NBQXNDO1FBQ3RDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUN2QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2QixNQUFNLENBQUM7Z0JBQ1QsQ0FBQztnQkFFRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUMxRCxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUIsS0FBSyxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUN4QyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4QixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVELDhCQUE4QjtJQUN0QixlQUFlLENBQUMsQ0FBUztRQUMvQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckMsUUFBUSxDQUFDO1lBQ1gsQ0FBQztZQUVELE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1osQ0FBQztJQUVPLFVBQVUsQ0FBQyxLQUFhLEVBQUUsS0FBYyxFQUFFLElBQWE7UUFDN0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQ3RDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQ2IsQ0FBQztRQUVmLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RCxzQ0FBc0M7WUFDdEMsTUFBTSxDQUFDO1FBQ1QsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUNiLE9BQU8sZUFBZSxDQUFDLFNBQVMsS0FBSyxRQUFRO1lBQzNDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7WUFDNUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7UUFFaEMsRUFBRSxDQUFDLENBQUMsT0FBTyxTQUFTLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixlQUFlLENBQUMsU0FBUyxjQUFjLENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsU0FBUyxtQkFBTSxlQUFlLElBQUUsR0FBRyxFQUFFLElBQUksS0FBSSxNQUFNLENBQUMsQ0FBQztRQUNwRSxLQUFLLENBQUMsOEJBQThCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNYLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RCxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN4QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDakIsS0FBSyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNyQyxFQUFFLENBQUMsYUFBYSxDQUNkLElBQUksQ0FBQyxJQUFJLEVBQ1Qsa0RBQWtEO3dCQUNoRCx5Q0FBeUM7d0JBQ3pDLElBQUksQ0FBQyxPQUFPLENBQ2YsQ0FBQztvQkFDRixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDckMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakMsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFRCw2QkFBNkI7SUFDckIsUUFBUSxDQUFDLENBQVMsRUFBRSxLQUFhO1FBQ3ZDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5Qix1QkFBdUI7UUFDdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDO1FBQ1QsQ0FBQztRQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNsQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLHVCQUF1QjtZQUN2QixFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDZCxNQUFNLENBQUM7WUFDVCxDQUFDO1lBRUQsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUMzQixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQ0Y7QUFuT0QsMkJBbU9DO0FBRUQsNkJBQTZCLENBQVMsRUFBRSxHQUFXO0lBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMifQ==