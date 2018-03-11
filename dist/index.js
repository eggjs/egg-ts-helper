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