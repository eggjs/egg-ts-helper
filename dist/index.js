"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const events_1 = require("events");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
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
    .filter(f => f.endsWith('.ts'))
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
        const watcher = (this.watcher = chokidar.watch(this.watchDirs));
        // listen watcher event
        watcher.on('ready', () => {
            watcher.on('add', p => this.onChange(p, 'add'));
            watcher.on('change', p => this.onChange(p, 'change'));
            watcher.on('unlink', (p) => {
                if (config.autoRemoveJs && p.endsWith('.ts')) {
                    // auto remove js while ts was deleted
                    const jsPath = p.substring(0, p.lastIndexOf('.')) + '.js';
                    if (fs.existsSync(jsPath)) {
                        fs.unlinkSync(jsPath);
                    }
                }
                this.onChange(p, 'unlink');
            });
        });
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
    generateTs(index, type, file) {
        const config = this.config;
        const dir = this.watchDirs[index];
        const generatorConfig = config.watchDirs[this.watchNameList[index]];
        if (type && !generatorConfig.trigger.includes(type)) {
            // check whether need to regenerate ts
            return;
        }
        const generator = this.generators[generatorConfig.generator];
        if (!generator) {
            throw new Error(`ts generator: ${generatorConfig.generator} not exist!!`);
        }
        const result = generator(Object.assign({}, generatorConfig, { dir, file }), config);
        if (result) {
            const resultList = Array.isArray(result) ? result : [result];
            resultList.forEach(item => {
                if (item.content) {
                    mkdirp.sync(path.dirname(item.dist));
                    fs.writeFileSync(item.dist, '// This file was auto generated by ts-helper\n' +
                        '// Do not modify this file!!!!!!!!!\n\n' +
                        item.content);
                    this.emit('update', item.dist);
                }
                else if (fs.existsSync(item.dist)) {
                    fs.unlinkSync(item.dist);
                    this.emit('remove', item.dist);
                }
            });
        }
    }
    // trigger while file changed
    onChange(p, type) {
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
            this.emit('change', p);
            this.generateTs(index, type, p);
            this.tickerMap[k] = null;
        }, this.config.throttle);
    }
}
exports.default = TsHelper;
function getAbsoluteUrlByCwd(p, cwd) {
    return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsbUNBQXNDO0FBQ3RDLHlCQUF5QjtBQUN6QixpQ0FBaUM7QUFDakMsNkJBQTZCO0FBd0NoQixRQUFBLGFBQWEsR0FBRztJQUMzQixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRTtJQUNsQixTQUFTLEVBQUUsS0FBSztJQUNoQixPQUFPLEVBQUUsV0FBVztJQUNwQixTQUFTLEVBQUUsT0FBTztJQUNsQixZQUFZLEVBQUUsSUFBSTtJQUNsQixRQUFRLEVBQUUsR0FBRztJQUNiLEtBQUssRUFBRSxJQUFJO0lBQ1gsVUFBVSxFQUFFLElBQUk7SUFDaEIsU0FBUyxFQUFFO1FBQ1QsTUFBTSxFQUFFO1lBQ04sSUFBSSxFQUFFLFlBQVk7WUFDbEIsU0FBUyxFQUFFO2dCQUNULE9BQU8sRUFBRSxTQUFTO2dCQUNsQixXQUFXLEVBQUUsYUFBYTtnQkFDMUIsT0FBTyxFQUFFLFNBQVM7Z0JBQ2xCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixNQUFNLEVBQUUsU0FBUzthQUNsQjtZQUNELFNBQVMsRUFBRSxRQUFRO1lBQ25CLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO1NBQ3JDO1FBRUQsVUFBVSxFQUFFO1lBQ1YsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixTQUFTLEVBQUUsYUFBYTtZQUN4QixTQUFTLEVBQUUsT0FBTztZQUNsQixPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDO1NBQzNCO1FBRUQsS0FBSyxFQUFFO1lBQ0wsSUFBSSxFQUFFLFdBQVc7WUFDakIsU0FBUyxFQUFFLFFBQVE7WUFDbkIsU0FBUyxFQUFFLE9BQU87WUFDbEIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztTQUMzQjtRQUVELE9BQU8sRUFBRTtZQUNQLElB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