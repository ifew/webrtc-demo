var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src, interactiveScript, currentlyAddingScript, mainScript, subPath, version = '2.1.11',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ? /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value && !isArray(value) && !isFunction(value) && !(value instanceof RegExp)) {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }
    if (typeof define !== 'undefined') {
        return;
    }
    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }
    if (typeof require !== 'undefined' && !isFunction(require)) {
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers, checkLoadedTimeoutId, config = {
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        function trimDots(ary) {
            var i, part, length = ary.length;
            for (i = 0; i < length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex, foundMap, foundI, foundStarMap, starI, baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];
            if (name && name.charAt(0) === '.') {
                if (baseName) {
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = name.split('/');
                    lastIndex = name.length - 1;
                    if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                        name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                    }
                    name = normalizedBaseParts.concat(name);
                    trimDots(name);
                    name = name.join('/');
                } else if (name.indexOf('./') === 0) {
                    name = name.substring(2);
                }
            }
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');
                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');
                    if (baseParts) {
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }
                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }
                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }
            pkgMain = getOwn(config.pkgs, name);
            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name && scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        function splitPrefix(name) {
            var prefix, index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts, prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }
            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];
            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    normalizedName = normalize(name, parentName, applyMap);
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;
                    url = context.nameToUrl(normalizedName);
                }
            }
            suffix = prefix && !pluginModule && !isNormalized ? '_unnormalized' + (unnormalizedCounter += 1) : '';
            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ? prefix + '!' + normalizedName : normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);
            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }
            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);
            if (hasProp(defined, id) && (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;
            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });
                if (!notified) {
                    req.onError(err);
                }
            }
        }

        function takeGlobalQueue() {
            if (globalDefQueue.length) {
                apsp.apply(defQueue, [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }
        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;
            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check();
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback, waitInterval = config.waitSeconds * 1000,
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;
            if (inCheckLoaded) {
                return;
            }
            inCheckLoaded = true;
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;
                if (!mod.enabled) {
                    return;
                }
                if (!map.isDefine) {
                    reqCalls.push(mod);
                }
                if (!mod.error) {
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            return (needCycleCheck = false);
                        }
                    }
                }
            });
            if (expired && noLoads.length) {
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }
            if ((!expired || usingPathFallback) && stillLoading) {
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }
            inCheckLoaded = false;
        }
        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;
        };
        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};
                if (this.inited) {
                    return;
                }
                this.factory = factory;
                if (errback) {
                    this.on('error', errback);
                } else if (this.events.error) {
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }
                this.depMaps = depMaps && depMaps.slice(0);
                this.errback = errback;
                this.inited = true;
                this.ignore = options.ignore;
                if (options.enabled || this.enabled) {
                    this.enable();
                } else {
                    this.check();
                }
            },
            defineDep: function (i, depExports) {
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },
            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;
                context.startTime = (new Date()).getTime();
                var map = this.map;
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },
            load: function () {
                var url = this.map.url;
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }
                var err, cjsModule, id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;
                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    this.defining = true;
                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            if ((this.events.error && this.map.isDefine) || req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    exports = this.exports;
                                }
                            }
                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }
                        } else {
                            exports = factory;
                        }
                        this.exports = exports;
                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;
                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }
                        cleanRegistry(id);
                        this.defined = true;
                    }
                    this.defining = false;
                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }
                }
            },
            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    pluginMap = makeModuleMap(map.prefix);
                this.depMaps.push(pluginMap);
                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod, bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });
                    if (this.map.unnormalized) {
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }
                        normalizedMap = makeModuleMap(map.prefix + '!' + name, this.map.parentMap);
                        on(normalizedMap, 'defined', bind(this, function (value) {
                            this.init([], function () {
                                return value;
                            }, null, {
                                enabled: true,
                                ignore: true
                            });
                        }));
                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            this.depMaps.push(normalizedMap);
                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }
                        return;
                    }
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }
                    load = bind(this, function (value) {
                        this.init([], function () {
                            return value;
                        }, null, {
                            enabled: true
                        });
                    });
                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });
                        onError(err);
                    });
                    load.fromText = bind(this, function (text, textAlt) {
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;
                        if (textAlt) {
                            text = textAlt;
                        }
                        if (hasInteractive) {
                            useInteractive = false;
                        }
                        getModule(moduleMap);
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }
                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval', 'fromText eval for ' + id + ' failed: ' + e, e, [id]));
                        }
                        if (hasInteractive) {
                            useInteractive = true;
                        }
                        this.depMaps.push(moduleMap);
                        context.completeLoad(moduleName);
                        localRequire([moduleName], load);
                    });
                    plugin.load(map.name, localRequire, load, config);
                }));
                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },
            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;
                this.enabling = true;
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;
                    if (typeof depMap === 'string') {
                        depMap = makeModuleMap(depMap, (this.map.isDefine ? this.map : this.map.parentMap), false, !this.skipMap);
                        this.depMaps[i] = depMap;
                        handler = getOwn(handlers, depMap.id);
                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }
                        this.depCount += 1;
                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));
                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }
                    id = depMap.id;
                    mod = registry[id];
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));
                this.enabling = false;
                this.check();
            },
            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },
            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            if (node.detachEvent && !isOpera) {
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        function getScriptData(evt) {
            var node = evt.currentTarget || evt.srcElement;
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');
            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;
            takeGlobalQueue();
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    callGetModule(args);
                }
            }
        }
        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,
            configure: function (cfg) {
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };
                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;
                        pkgObj = typeof pkgObj === 'string' ? {
                            name: pkgObj
                        } : pkgObj;
                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main').replace(currDirRegExp, '').replace(jsSuffixRegExp, '');
                    });
                }
                eachProp(registry, function (mod, id) {
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },
            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },
            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;
                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }
                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;
                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                id + '" has not been loaded yet for context: ' +
                                contextName +
                                (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }
                    intakeDefines();
                    context.nextTick(function () {
                        intakeDefines();
                        requireMod = getModule(makeModuleMap(null, relMap));
                        requireMod.skipMap = options.skipMap;
                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });
                        checkLoaded();
                    });
                    return localRequire;
                }
                mixin(localRequire, {
                    isBrowser: isBrowser,
                    toUrl: function (moduleNamePlusExt) {
                        var ext, index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }
                        return context.nameToUrl(normalize(moduleNamePlusExt, relMap && relMap.id, true), ext, true);
                    },
                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },
                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });
                if (!relMap) {
                    localRequire.undef = function (id) {
                        takeGlobalQueue();
                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);
                        removeScript(id);
                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];
                        eachReverse(defQueue, function (args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        if (mod) {
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }
                            cleanRegistry(id);
                        }
                    };
                }
                return localRequire;
            },
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },
            completeLoad: function (moduleName) {
                var found, args, mod, shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;
                takeGlobalQueue();
                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        found = true;
                    }
                    callGetModule(args);
                }
                mod = getOwn(registry, moduleName);
                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine', 'No define call for ' + moduleName, null, [moduleName]));
                        }
                    } else {
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }
                checkLoaded();
            },
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url, parentPath, bundleId, pkgMain = getOwn(config.pkgs, moduleName);
                if (pkgMain) {
                    moduleName = pkgMain;
                }
                bundleId = getOwn(bundlesMap, moduleName);
                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }
                if (req.jsExtRegExp.test(moduleName)) {
                    url = moduleName + (ext || '');
                } else {
                    paths = config.paths;
                    syms = moduleName.split('/');
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }
                return config.urlArgs ? url +
                    ((url.indexOf('?') === -1 ? '?' : '&') +
                        config.urlArgs) : url;
            },
            load: function (id, url) {
                req.load(context, id, url);
            },
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },
            onScriptLoad: function (evt) {
                if (evt.type === 'load' || (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    interactiveScript = null;
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };
        context.require = context.makeRequire();
        return context;
    }
    req = requirejs = function (deps, callback, errback, optional) {
        var context, config, contextName = defContextName;
        if (!isArray(deps) && typeof deps !== 'string') {
            config = deps;
            if (isArray(callback)) {
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }
        if (config && config.context) {
            contextName = config.context;
        }
        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }
        if (config) {
            context.configure(config);
        }
        return context.require(deps, callback, errback);
    };
    req.config = function (config) {
        return req(config);
    };
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) {
        fn();
    };
    if (!require) {
        require = req;
    }
    req.version = version;
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };
    req({});
    each(['toUrl', 'undef', 'defined', 'specified'], function (prop) {
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });
    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }
    req.onError = defaultOnError;
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ? document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') : document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            node = req.createNode(config, moduleName, url);
            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);
            if (node.attachEvent && !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) && !isOpera) {
                useInteractive = true;
                node.attachEvent('onreadystatechange', context.onScriptLoad);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;
            return node;
        } else if (isWebWorker) {
            try {
                importScripts(url);
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts', 'importScripts failed for ' +
                    moduleName + ' at ' + url, e, [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }
        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }
    if (isBrowser && !cfg.skipDataMain) {
        eachReverse(scripts(), function (script) {
            if (!head) {
                head = script.parentNode;
            }
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                mainScript = dataMain;
                if (!cfg.baseUrl) {
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/') + '/' : './';
                    cfg.baseUrl = subPath;
                }
                mainScript = mainScript.replace(jsSuffixRegExp, '');
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];
                return true;
            }
        });
    }
    define = function (name, deps, callback) {
        var node, context;
        if (typeof name !== 'string') {
            callback = deps;
            deps = name;
            name = null;
        }
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }
        if (!deps && isFunction(callback)) {
            deps = [];
            if (callback.length) {
                callback.toString().replace(commentRegExp, '').replace(cjsRequireRegExp, function (match, dep) {
                    deps.push(dep);
                });
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };
    define.amd = {
        jQuery: true
    };
    req.exec = function (text) {
        return eval(text);
    };
    req(cfg);
}(this));;
var ctx = require.s.contexts._,
    origNameToUrl = ctx.nameToUrl;
ctx.nameToUrl = function () {
    var url = origNameToUrl.apply(ctx, arguments);
    if (!url.match(/\/tiny_mce\//) && !url.match(/Xtento_ProductExport\/js\/ace\/mode-xml/) && !url.match(/Xtento_ProductExport\/js\/ace\/theme-eclipse/)) {
        url = url.replace(/(\.min)?\.js$/, '.min.js');
    }
    return url;
};;
define('mixins', ['module'], function (module) {
    'use strict';
    var rjsMixins;

    function hasPlugin(name) {
        return !!~name.indexOf('!');
    }

    function addPlugin(name) {
        return 'mixins!' + name;
    }

    function removeBaseUrl(url, config) {
        var baseUrl = config.baseUrl || '',
            index = url.indexOf(baseUrl);
        if (~index) {
            url = url.substring(baseUrl.length - index);
        }
        return url;
    }

    function getPath(name, config) {
        var url = require.toUrl(name);
        return removeBaseUrl(url, config);
    }

    function isRelative(name) {
        return !!~name.indexOf('./');
    }

    function applyMixins(target) {
        var mixins = Array.prototype.slice.call(arguments, 1);
        mixins.forEach(function (mixin) {
            target = mixin(target);
        });
        return target;
    }
    rjsMixins = {
        load: function (name, req, onLoad, config) {
            var path = getPath(name, config),
                mixins = this.getMixins(path),
                deps = [name].concat(mixins);
            req(deps, function () {
                onLoad(applyMixins.apply(null, arguments));
            });
        },
        getMixins: function (path) {
            var config = module.config() || {},
                mixins;
            if (path.indexOf('?') !== -1) {
                path = path.substring(0, path.indexOf('?'));
            }
            mixins = config[path] || {};
            return Object.keys(mixins).filter(function (mixin) {
                return mixins[mixin] !== false;
            });
        },
        hasMixins: function (path) {
            return this.getMixins(path).length;
        },
        processNames: function (names, context) {
            var config = context.config;

            function processName(name) {
                var path = getPath(name, config);
                if (!hasPlugin(name) && (isRelative(name) || rjsMixins.hasMixins(path))) {
                    return addPlugin(name);
                }
                return name;
            }
            return typeof names !== 'string' ? names.map(processName) : processName(names);
        }
    };
    return rjsMixins;
});
require(['mixins'], function (mixins) {
    'use strict';
    var originalRequire = window.require,
        originalDefine = window.define,
        contexts = originalRequire.s.contexts,
        defContextName = '_',
        hasOwn = Object.prototype.hasOwnProperty,
        getLastInQueue;
    getLastInQueue = '(function () {' + 'var queue  = globalDefQueue,' + 'item   = queue[queue.length - 1];' + '' + 'return item;' + '})();';

    function getOwn(obj, prop) {
        return hasOwn.call(obj, prop) && obj[prop];
    }
    window.require = function (deps, callback, errback, optional) {
        var contextName = defContextName,
            context, config;
        if (!Array.isArray(deps) && typeof deps !== 'string') {
            config = deps;
            if (Array.isArray(callback)) {
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }
        if (config && config.context) {
            contextName = config.context;
        }
        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = require.s.newContext(contextName);
        }
        if (config) {
            context.configure(config);
        }
        deps = mixins.processNames(deps, context);
        return context.require(deps, callback, errback);
    };
    window.define = function (name, deps, callback) {
        var context = getOwn(contexts, defContextName),
            result = originalDefine.apply(this, arguments),
            queueItem = require.exec(getLastInQueue),
            lastDeps = queueItem && queueItem[1];
        if (Array.isArray(lastDeps)) {
            queueItem[1] = mixins.processNames(lastDeps, context);
        }
        return result;
    };
    Object.keys(originalRequire).forEach(function (key) {
        require[key] = originalRequire[key];
    });
    Object.keys(originalDefine).forEach(function (key) {
        define[key] = originalDefine[key];
    });
    window.requirejs = window.require;
});;
(function (require) {
    (function () {
        var config = {
            config: {
                mixins: {
                    'Amasty_Conf/js/swatch-renderer': {
                        'Amasty_Label/js/configurable/swatch-renderer': true
                    },
                    'Magento_Swatches/js/swatch-renderer': {
                        'Amasty_Label/js/configurable/swatch-renderer': true
                    },
                    'Amasty_Conf/js/configurable': {
                        'Amasty_Label/js/configurable/configurable': true
                    },
                    'Magento_ConfigurableProduct/js/configurable': {
                        'Amasty_Label/js/configurable/configurable': true
                    }
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    magepalGtmDatalayer: 'MagePal_GoogleTagManager/js/datalayer'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    'rowBuilder': 'Magento_Theme/js/row-builder',
                    'toggleAdvanced': 'mage/toggle',
                    'translateInline': 'mage/translate-inline',
                    'sticky': 'mage/sticky',
                    'tabs': 'mage/tabs',
                    'zoom': 'mage/zoom',
                    'collapsible': 'mage/collapsible',
                    'dropdownDialog': 'mage/dropdown',
                    'dropdown': 'mage/dropdowns',
                    'accordion': 'mage/accordion',
                    'loader': 'mage/loader',
                    'tooltip': 'mage/tooltip',
                    'deletableItem': 'mage/deletable-item',
                    'itemTable': 'mage/item-table',
                    'fieldsetControls': 'mage/fieldset-controls',
                    'fieldsetResetControl': 'mage/fieldset-controls',
                    'redirectUrl': 'mage/redirect-url',
                    'loaderAjax': 'mage/loader',
                    'menu': 'mage/menu',
                    'popupWindow': 'mage/popup-window',
                    'validation': 'mage/validation/validation',
                    'welcome': 'Magento_Theme/js/view/welcome'
                }
            },
            paths: {
                'jquery/ui': 'jquery/jquery-ui'
            },
            deps: ['jquery/jquery.mobile.custom', 'mage/common', 'mage/dataPost', 'mage/bootstrap']
        };
        require.config(config);
    })();
    (function () {
        var config = {
            'waitSeconds': 0,
            'map': {
                '*': {
                    'ko': 'knockoutjs/knockout',
                    'knockout': 'knockoutjs/knockout',
                    'mageUtils': 'mage/utils/main',
                    'rjsResolver': 'mage/requirejs/resolver'
                }
            },
            'shim': {
                'jquery/jquery-migrate': ['jquery'],
                'jquery/jquery.hashchange': ['jquery', 'jquery/jquery-migrate'],
                'jquery/jstree/jquery.hotkeys': ['jquery'],
                'jquery/hover-intent': ['jquery'],
                'mage/adminhtml/backup': ['prototype'],
                'mage/captcha': ['prototype'],
                'mage/common': ['jquery'],
                'mage/new-gallery': ['jquery'],
                'mage/webapi': ['jquery'],
                'jquery/ui': ['jquery'],
                'MutationObserver': ['es6-collections'],
                'tinymce': {
                    'exports': 'tinymce'
                },
                'moment': {
                    'exports': 'moment'
                },
                'matchMedia': {
                    'exports': 'mediaCheck'
                },
                'jquery/jquery-storageapi': {
                    'deps': ['jquery/jquery.cookie']
                }
            },
            'paths': {
                'jquery/validate': 'jquery/jquery.validate',
                'jquery/hover-intent': 'jquery/jquery.hoverIntent',
                'jquery/file-uploader': 'jquery/fileUploader/jquery.fileupload-fp',
                'jquery/jquery.hashchange': 'jquery/jquery.ba-hashchange.min',
                'prototype': 'legacy-build.min',
                'jquery/jquery-storageapi': 'jquery/jquery.storageapi.min',
                'text': 'mage/requirejs/text',
                'domReady': 'requirejs/domReady',
                'tinymce': 'tiny_mce/tiny_mce_src'
            },
            'deps': ['jquery/jquery-migrate'],
            'config': {
                'mixins': {
                    'jquery/jstree/jquery.jstree': {
                        'mage/backend/jstree-mixin': true
                    }
                },
                'text': {
                    'headers': {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            }
        };
        require(['jquery'], function ($) {
            'use strict';
            $.noConflict();
        });
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    checkoutBalance: 'Magento_Customer/js/checkout-balance',
                    address: 'Magento_Customer/address',
                    changeEmailPassword: 'Magento_Customer/change-email-password',
                    passwordStrengthIndicator: 'Magento_Customer/js/password-strength-indicator',
                    zxcvbn: 'Magento_Customer/js/zxcvbn',
                    addressValidation: 'Magento_Customer/js/addressValidation'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    compareList: 'Magento_Catalog/js/list',
                    relatedProducts: 'Magento_Catalog/js/related-products',
                    upsellProducts: 'Magento_Catalog/js/upsell-products',
                    productListToolbarForm: 'Magento_Catalog/js/product/list/toolbar',
                    catalogGallery: 'Magento_Catalog/js/gallery',
                    priceBox: 'Magento_Catalog/js/price-box',
                    priceOptionDate: 'Magento_Catalog/js/price-option-date',
                    priceOptionFile: 'Magento_Catalog/js/price-option-file',
                    priceOptions: 'Magento_Catalog/js/price-options',
                    priceUtils: 'Magento_Catalog/js/price-utils',
                    catalogAddToCart: 'Magento_Catalog/js/catalog-add-to-cart'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    quickSearch: 'Magento_Search/form-mini'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    creditCardType: 'Magento_Payment/cc-type'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    bundleOption: 'Magento_Bundle/bundle',
                    priceBundle: 'Magento_Bundle/js/price-bundle',
                    slide: 'Magento_Bundle/js/slide',
                    productSummary: 'Magento_Bundle/js/product-summary'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    addToCart: 'Magento_Msrp/js/msrp'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    requireCookie: 'Magento_Cookie/js/require-cookie',
                    cookieNotices: 'Magento_Cookie/js/notices'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    giftMessage: 'Magento_Sales/gift-message',
                    ordersReturns: 'Magento_Sales/orders-returns'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    giftOptions: 'Magento_GiftMessage/gift-options',
                    extraOptions: 'Magento_GiftMessage/extra-options'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            paths: {
                'ui/template': 'Magento_Ui/templates'
            },
            map: {
                '*': {
                    uiElement: 'Magento_Ui/js/lib/core/element/element',
                    uiCollection: 'Magento_Ui/js/lib/core/collection',
                    uiComponent: 'Magento_Ui/js/lib/core/collection',
                    uiClass: 'Magento_Ui/js/lib/core/class',
                    uiEvents: 'Magento_Ui/js/lib/core/events',
                    uiRegistry: 'Magento_Ui/js/lib/registry/registry',
                    consoleLogger: 'Magento_Ui/js/lib/logger/console-logger',
                    uiLayout: 'Magento_Ui/js/core/renderer/layout',
                    buttonAdapter: 'Magento_Ui/js/form/button-adapter'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    discountCode: 'Magento_Checkout/js/discount-codes',
                    shoppingCart: 'Magento_Checkout/js/shopping-cart',
                    regionUpdater: 'Magento_Checkout/js/region-updater',
                    sidebar: 'Magento_Checkout/js/sidebar',
                    checkoutLoader: 'Magento_Checkout/js/checkout-loader',
                    checkoutData: 'Magento_Checkout/js/checkout-data',
                    proceedToCheckout: 'Magento_Checkout/js/proceed-to-checkout'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    configurable: 'Magento_ConfigurableProduct/js/configurable'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    multiShipping: 'Magento_Multishipping/js/multi-shipping',
                    orderOverview: 'Magento_Multishipping/js/overview',
                    payment: 'Magento_Multishipping/js/payment'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    pageCache: 'Magento_PageCache/js/page-cache'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            config: {
                mixins: {
                    'Magento_Checkout/js/action/place-order': {
                        'Magento_CheckoutAgreements/js/model/place-order-mixin': true
                    },
                    'Magento_Checkout/js/action/set-payment-information': {
                        'Magento_CheckoutAgreements/js/model/set-payment-information-mixin': true
                    }
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    loadPlayer: 'Magento_ProductVideo/js/load-player',
                    fotoramaVideoEvents: 'Magento_ProductVideo/js/fotorama-add-video-events'
                }
            },
            shim: {
                vimeoAPI: {}
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    recentlyViewedProducts: 'Magento_Reports/js/recently-viewed'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    transparent: 'Magento_Payment/transparent'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    catalogSearch: 'Magento_CatalogSearch/form-mini'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    editTrigger: 'mage/edit-trigger',
                    addClass: 'Magento_Translation/add-class'
                }
            },
            deps: ['mage/translate-inline']
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    wishlist: 'Magento_Wishlist/js/wishlist',
                    addToWishlist: 'Magento_Wishlist/js/add-to-wishlist',
                    wishlistSearch: 'Magento_Wishlist/js/search'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            paths: {
                'mageplaza/core/jquery/popup': 'Mageplaza_Core/js/jquery.magnific-popup.min',
                'mageplaza/core/owl.carousel': 'Mageplaza_Core/js/owl.carousel.min',
                'mageplaza/core/bootstrap': 'Mageplaza_Core/js/bootstrap.min',
                mpIonRangeSlider: 'Mageplaza_Core/js/ion.rangeSlider.min',
                touchPunch: 'Mageplaza_Core/js/jquery.ui.touch-punch.min',
                mpDevbridgeAutocomplete: 'Mageplaza_Core/js/jquery.autocomplete.min'
            },
            shim: {
                "mageplaza/core/jquery/popup": ["jquery"],
                "mageplaza/core/owl.carousel": ["jquery"],
                "mageplaza/core/bootstrap": ["jquery"],
                mpIonRangeSlider: ["jquery"],
                mpDevbridgeAutocomplete: ["jquery"],
                touchPunch: ['jquery', 'jquery/ui']
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    'Mageplaza_Productslider/js/owl.carousel': 'Mageplaza_Productslider/js/owl.carousel',
                    'Mageplaza_Productslider/js/owl.carousel.min': 'Mageplaza_Productslider/js/owl.carousel.min'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            paths: {
                socialProvider: 'Mageplaza_SocialLogin/js/provider',
                socialPopupForm: 'Mageplaza_SocialLogin/js/popup'
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    'magestore/note': 'Magestore_Bannerslider/js/jquery/slider/jquery-ads-note',
                    'magestore/impress': 'Magestore_Bannerslider/js/report/impress',
                    'magestore/clickbanner': 'Magestore_Bannerslider/js/report/clickbanner',
                },
            },
            paths: {
                'magestore/flexslider': 'Magestore_Bannerslider/js/jquery/slider/jquery-flexslider-min',
                'magestore/evolutionslider': 'Magestore_Bannerslider/js/jquery/slider/jquery-slider-min',
                'magestore/popup': 'Magestore_Bannerslider/js/jquery.bpopup.min',
            },
            shim: {
                'magestore/flexslider': {
                    deps: ['jquery']
                },
                'magestore/evolutionslider': {
                    deps: ['jquery']
                },
                'magestore/zebra-tooltips': {
                    deps: ['jquery']
                },
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    'Magestore_Storepickup/js/store/map-loader': 'Magestore_Storepickup/js/store/map/map-loader',
                    'magestore/region-updater': 'Magestore_Storepickup/js/store/region-updater',
                }
            },
            paths: {},
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    'magestore/googlemap': 'Magestore_Storepickup/js/googlemap',
                    'magestore/pagination': 'Magestore_Storepickup/js/pagination',
                    'magestore/tag': 'Magestore_Storepickup/js/tag',
                    'magestore/liststore': 'Magestore_Storepickup/js/liststore',
                    'magestore/direction': 'Magestore_Storepickup/js/direction',
                    'magestore/searchbox': 'Magestore_Storepickup/js/searchbox',
                    'magestore/viewpage/map': 'Magestore_Storepickup/js/viewpage/map'
                }
            },
            paths: {}
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    sidebarmodule: 'Sebwite_Sidebar/js/module'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            config: {
                mixins: {
                    'Magento_Checkout/js/view/shipping': {
                        'Villa_Checkout/js/mixin/shipping-mixin': true
                    }
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            deps: ['Magento_Theme/js/responsive', 'Magento_Theme/js/theme']
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    discountCode: 'Magento_Checkout/js/discount-codes',
                    shoppingCart: 'Magento_Checkout/js/shopping-cart',
                    regionUpdater: 'Magento_Checkout/js/region-updater',
                    sidebar: 'Magento_Checkout/js/sidebar',
                    checkoutLoader: 'Magento_Checkout/js/checkout-loader',
                    checkoutData: 'Magento_Checkout/js/checkout-data',
                    proceedToCheckout: 'Magento_Checkout/js/proceed-to-checkout'
                }
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            paths: {
                socialProvider: 'Mageplaza_SocialLogin/js/provider',
                socialPopupForm: 'Mageplaza_SocialLogin/js/popup'
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            map: {
                '*': {
                    'magestore/note': 'Magestore_Bannerslider/js/jquery/slider/jquery-ads-note',
                    'magestore/impress': 'Magestore_Bannerslider/js/report/impress',
                    'magestore/clickbanner': 'Magestore_Bannerslider/js/report/clickbanner',
                },
            },
            paths: {
                'magestore/flexslider': 'Magestore_Bannerslider/js/jquery/slider/jquery-flexslider-min',
                'magestore/evolutionslider': 'Magestore_Bannerslider/js/jquery/slider/jquery-slider-min',
                'magestore/popup': 'Magestore_Bannerslider/js/jquery.bpopup.min',
            },
            shim: {
                'magestore/flexslider': {
                    deps: ['jquery']
                },
                'magestore/evolutionslider': {
                    deps: ['jquery']
                },
                'magestore/zebra-tooltips': {
                    deps: ['jquery']
                },
            }
        };
        require.config(config);
    })();
    (function () {
        var config = {
            deps: ["js/form", 'jquery/jquery.cookie']
        };
        require.config(config);
    })();
})(require);;
require(['jquery', ], function ($) {
    ! function (e) {
        "use strict";

        function t(e, t) {
            if (this.createTextRange) {
                var a = this.createTextRange();
                a.collapse(!0), a.moveStart("character", e), a.moveEnd("character", t - e), a.select()
            } else this.setSelectionRange && (this.focus(), this.setSelectionRange(e, t))
        }

        function a(e) {
            var t = this.value.length;
            if (e = "start" == e.toLowerCase() ? "Start" : "End", document.selection) {
                var a, i, n, l = document.selection.createRange();
                return a = l.duplicate(), a.expand("textedit"), a.setEndPoint("EndToEnd", l), i = a.text.length - l.text.length, n = i + l.text.length, "Start" == e ? i : n
            }
            return "undefined" != typeof this["selection" + e] && (t = this["selection" + e]), t
        }
        var i = {
            codes: {
                46: 127,
                188: 44,
                109: 45,
                190: 46,
                191: 47,
                192: 96,
                220: 92,
                222: 39,
                221: 93,
                219: 91,
                173: 45,
                187: 61,
                186: 59,
                189: 45,
                110: 46
            },
            shifts: {
                96: "~",
                49: "!",
                50: "@",
                51: "#",
                52: "$",
                53: "%",
                54: "^",
                55: "&",
                56: "*",
                57: "(",
                48: ")",
                45: "_",
                61: "+",
                91: "{",
                93: "}",
                92: "|",
                59: ":",
                39: '"',
                44: "<",
                46: ">",
                47: "?"
            }
        };
        e.fn.number = function (n, l, s, r) {
            r = "undefined" == typeof r ? "," : r, s = "undefined" == typeof s ? "." : s, l = "undefined" == typeof l ? 0 : l;
            var u = "\\u" + ("0000" + s.charCodeAt(0).toString(16)).slice(-4),
                h = new RegExp("[^" + u + "0-9]", "g"),
                o = new RegExp(u, "g");
            return n === !0 ? this.is("input:text") ? this.on({
                "keydown.format": function (n) {
                    var u = e(this),
                        h = u.data("numFormat"),
                        o = n.keyCode ? n.keyCode : n.which,
                        c = "",
                        v = a.apply(this, ["start"]),
                        d = a.apply(this, ["end"]),
                        p = "",
                        f = !1;
                    if (i.codes.hasOwnProperty(o) && (o = i.codes[o]), !n.shiftKey && o >= 65 && 90 >= o ? o += 32 : !n.shiftKey && o >= 69 && 105 >= o ? o -= 48 : n.shiftKey && i.shifts.hasOwnProperty(o) && (c = i.shifts[o]), "" == c && (c = String.fromCharCode(o)), 8 != o && 45 != o && 127 != o && c != s && !c.match(/[0-9]/)) {
                        var g = n.keyCode ? n.keyCode : n.which;
                        if (46 == g || 8 == g || 127 == g || 9 == g || 27 == g || 13 == g || (65 == g || 82 == g || 80 == g || 83 == g || 70 == g || 72 == g || 66 == g || 74 == g || 84 == g || 90 == g || 61 == g || 173 == g || 48 == g) && (n.ctrlKey || n.metaKey) === !0 || (86 == g || 67 == g || 88 == g) && (n.ctrlKey || n.metaKey) === !0 || g >= 35 && 39 >= g || g >= 112 && 123 >= g) return;
                        return n.preventDefault(), !1
                    }
                    if (0 == v && d == this.value.length ? 8 == o ? (v = d = 1, this.value = "", h.init = l > 0 ? -1 : 0, h.c = l > 0 ? -(l + 1) : 0, t.apply(this, [0, 0])) : c == s ? (v = d = 1, this.value = "0" + s + new Array(l + 1).join("0"), h.init = l > 0 ? 1 : 0, h.c = l > 0 ? -(l + 1) : 0) : 45 == o ? (v = d = 2, this.value = "-0" + s + new Array(l + 1).join("0"), h.init = l > 0 ? 1 : 0, h.c = l > 0 ? -(l + 1) : 0, t.apply(this, [2, 2])) : (h.init = l > 0 ? -1 : 0, h.c = l > 0 ? -l : 0) : h.c = d - this.value.length, h.isPartialSelection = v == d ? !1 : !0, l > 0 && c == s && v == this.value.length - l - 1) h.c++, h.init = Math.max(0, h.init), n.preventDefault(), f = this.value.length + h.c;
                    else if (45 != o || 0 == v && 0 != this.value.indexOf("-"))
                        if (c == s) h.init = Math.max(0, h.init), n.preventDefault();
                        else if (l > 0 && 127 == o && v == this.value.length - l - 1) n.preventDefault();
                    else if (l > 0 && 8 == o && v == this.value.length - l) n.preventDefault(), h.c--, f = this.value.length + h.c;
                    else if (l > 0 && 127 == o && v > this.value.length - l - 1) {
                        if ("" === this.value) return;
                        "0" != this.value.slice(v, v + 1) && (p = this.value.slice(0, v) + "0" + this.value.slice(v + 1), u.val(p)), n.preventDefault(), f = this.value.length + h.c
                    } else if (l > 0 && 8 == o && v > this.value.length - l) {
                        if ("" === this.value) return;
                        "0" != this.value.slice(v - 1, v) && (p = this.value.slice(0, v - 1) + "0" + this.value.slice(v), u.val(p)), n.preventDefault(), h.c--, f = this.value.length + h.c
                    } else 127 == o && this.value.slice(v, v + 1) == r ? n.preventDefault() : 8 == o && this.value.slice(v - 1, v) == r ? (n.preventDefault(), h.c--, f = this.value.length + h.c) : l > 0 && v == d && this.value.length > l + 1 && v > this.value.length - l - 1 && isFinite(+c) && !n.metaKey && !n.ctrlKey && !n.altKey && 1 === c.length && (p = d === this.value.length ? this.value.slice(0, v - 1) : this.value.slice(0, v) + this.value.slice(v + 1), this.value = p, f = v);
                    else n.preventDefault();
                    f !== !1 && t.apply(this, [f, f]), u.data("numFormat", h)
                },
                "keyup.format": function (i) {
                    var n, s = e(this),
                        r = s.data("numFormat"),
                        u = i.keyCode ? i.keyCode : i.which,
                        h = a.apply(this, ["start"]),
                        o = a.apply(this, ["end"]);
                    0 !== h || 0 !== o || 189 !== u && 109 !== u || (s.val("-" + s.val()), h = 1, r.c = 1 - this.value.length, r.init = 1, s.data("numFormat", r), n = this.value.length + r.c, t.apply(this, [n, n])), "" === this.value || (48 > u || u > 57) && (96 > u || u > 105) && 8 !== u && 46 !== u && 110 !== u || (s.val(s.val()), l > 0 && (r.init < 1 ? (h = this.value.length - l - (r.init < 0 ? 1 : 0), r.c = h - this.value.length, r.init = 1, s.data("numFormat", r)) : h > this.value.length - l && 8 != u && (r.c++, s.data("numFormat", r))), 46 != u || r.isPartialSelection || (r.c++, s.data("numFormat", r)), n = this.value.length + r.c, t.apply(this, [n, n]))
                },
                "paste.format": function (t) {
                    var a = e(this),
                        i = t.originalEvent,
                        n = null;
                    return window.clipboardData && window.clipboardData.getData ? n = window.clipboardData.getData("Text") : i.clipboardData && i.clipboardData.getData && (n = i.clipboardData.getData("text/plain")), a.val(n), t.preventDefault(), !1
                }
            }).each(function () {
                var t = e(this).data("numFormat", {
                    c: -(l + 1),
                    decimals: l,
                    thousands_sep: r,
                    dec_point: s,
                    regex_dec_num: h,
                    regex_dec: o,
                    init: this.value.indexOf(".") ? !0 : !1
                });
                "" !== this.value && t.val(t.val())
            }) : this.each(function () {
                var t = e(this),
                    a = +t.text().replace(h, "").replace(o, ".");
                t.number(isFinite(a) ? +a : 0, l, s, r)
            }) : this.text(e.number.apply(window, arguments))
        };
        var n = null,
            l = null;
        e.isPlainObject(e.valHooks.text) ? (e.isFunction(e.valHooks.text.get) && (n = e.valHooks.text.get), e.isFunction(e.valHooks.text.set) && (l = e.valHooks.text.set)) : e.valHooks.text = {}, e.valHooks.text.get = function (t) {
            var a, i = e(t),
                l = i.data("numFormat");
            return l ? "" === t.value ? "" : (a = +t.value.replace(l.regex_dec_num, "").replace(l.regex_dec, "."), (0 === t.value.indexOf("-") ? "-" : "") + (isFinite(a) ? a : 0)) : e.isFunction(n) ? n(t) : void 0
        }, e.valHooks.text.set = function (t, a) {
            var i = e(t),
                n = i.data("numFormat");
            if (n) {
                var s = e.number(a, n.decimals, n.dec_point, n.thousands_sep);
                return e.isFunction(l) ? l(t, s) : t.value = s
            }
            return e.isFunction(l) ? l(t, a) : void 0
        }, e.number = function (e, t, a, i) {
            i = "undefined" == typeof i ? "1000" !== new Number(1e3).toLocaleString() ? new Number(1e3).toLocaleString().charAt(1) : "" : i, a = "undefined" == typeof a ? new Number(.1).toLocaleString().charAt(1) : a, t = isFinite(+t) ? Math.abs(t) : 0;
            var n = "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4),
                l = "\\u" + ("0000" + i.charCodeAt(0).toString(16)).slice(-4);
            e = (e + "").replace(".", a).replace(new RegExp(l, "g"), "").replace(new RegExp(n, "g"), ".").replace(new RegExp("[^0-9+-Ee.]", "g"), "");
            var s = isFinite(+e) ? +e : 0,
                r = "",
                u = function (e, t) {
                    return "" + +(Math.round(("" + e).indexOf("e") > 0 ? e : e + "e+" + t) + "e-" + t)
                };
            return r = (t ? u(s, t) : "" + Math.round(s)).split("."), r[0].length > 3 && (r[0] = r[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, i)), (r[1] || "").length < t && (r[1] = r[1] || "", r[1] += new Array(t - r[1].length + 1).join("0")), r.join(a)
        }
    }(jQuery);
    $('#is_vplus').on('click', function () {
        if ($(this).is(':checked')) {
            $('.vplus-content').show();
        } else {
            $('.vplus-content').hide();
        }
    });
    var footerHiOver = 0;
    var GET_ITEM_AJAX = false;
    var PRODUCT_CAT_MODE = "";
    var WEB_BASE_URL = "";
    var CLEAR_WAIT_OUTER_CATAGORY;
    $(document).ready(function () {
        initDropDown($(".sl-wrap"));

        function initDropDown(elmSlVal, evAtChange, ctClass, evAtAfterInit) {
            $.each(elmSlVal, function () {
                if (!$(this).hasClass('sel-wraped')) {
                    $(this).addClass('sel-wraped');
                    var thisId = $(this).attr('id');
                    if (typeof thisId === 'undefined' || thisId == "") {
                        var idxOf = $('.sl-wrap').index($(this));
                        $(this).attr('id', 'sl-wrap-' + idxOf);
                        thisId = $(this).attr('id');
                    }
                    var elmSL = $('#' + thisId);
                    if (ctClass !== undefined) {} else {
                        ctClass = "";
                    }
                    elmSL.find('select').addClass('sl_sty');
                    elmSL.find('select').wrap('<div class="bx_dd dd-mb ' + ctClass + '"></div>');
                    var html = "";
                    var nowSlTxt = "";
                    nowSlTxt = elmSL.find('select option:selected').text();
                    if (elmSL.find('select').hasClass('no-hide-first-option')) {
                        $.each(elmSL.find('select option'), function (i, val) {
                            var slTxt = $(this).text();
                            var slVal = $(this).val();
                            html += '<li data-value="' + slVal + '"><span>' + slTxt + '</span></li>';
                        });
                    } else {
                        elmSL.find('select option[value=""]').eq(0).hide();
                        $.each(elmSL.find('select option[value!=""]'), function (i, val) {
                            var slTxt = $(this).text();
                            var slVal = $(this).val();
                            html += '<li data-value="' + slVal + '"><span>' + slTxt + '</span></li>';
                        });
                    }
                    var tmpDd = '';
                    tmpDd += '<div class="bx_dd dd-pc ' + ctClass + '">';
                    tmpDd += '<div class="sl_sty wrapper-dropdown-5">';
                    tmpDd += '<span class="lb-sl">' + nowSlTxt + '</span>';
                    tmpDd += '<ul class="dropdown">' + html + '</ul>';
                    tmpDd += '</div>';
                    tmpDd += '</div>';
                    elmSL.find('select').parent().after(tmpDd);
                    elmSL.find('.wrapper-dropdown-5').click(function () {
                        if ($(this).hasClass('active')) {
                            $(this).removeClass('active');
                        } else {
                            $('.wrapper-dropdown-5').removeClass('active');
                            $(this).addClass('active');
                        }
                    });
                    elmSL.find('.wrapper-dropdown-5 li').click(function () {
                        var slVl = $(this).data('value');
                        var slTxt = $(this).text();
                        elmSL.find('select').val(slVl);
                        $(this).parent().parent().find('.lb-sl').addClass('slt').text(slTxt);
                        if (typeof (evAtChange) == "function") {
                            evAtChange($(this));
                        }
                    });
                    elmSL.find('select').change(function () {
                        var slTxt = $(this).find(":selected").text();
                        $(this).parent().parent().find('.lb-sl').text(slTxt);
                        if (typeof (evAtChange) == "function") {
                            evAtChange($(this));
                        }
                    });
                    if (typeof (evAtAfterInit) == "function") {
                        evAtAfterInit(elmSL.find('select'));
                    }
                }
            });
        }
        $('.click.sender').click(function () {
            if ($('.display-block').hasClass('active')) {
                $('.display-block').removeClass('active');
                $('.wrap-display').removeClass('d2');
            }
        });
        $('.click.owner').click(function () {
            if (!$('.display-block').hasClass('active')) {
                $('.display-block').addClass('active');
                $('.wrap-display').addClass('d2');
            }
        });
        if (isMobileDevice()) {
            $('.selectCateMobile').addClass('active');
        } else {
            $('.selectCateMobile').removeClass('active');
        }
        const url = $('#base_url').val();
        var move_html = $('.sidebar.sidebar-main').html();
        var new_html = '<div class="inner-sidebar-main" style="position: relative; overflow: auto">' + move_html + '</div>';
        $('.sidebar.sidebar-main').html(new_html);
        checklangSwichtclas($('#h-lang').val())
        clickminicart_mobile();
        fixmenucate();
        $(".ctn-recently").hide();
        setTimeout(function () {
            ShowHideBar();
        }, 100);
        $(window).resize(function () {
            if (window.width <= 767) {
                $('.page-header').addClass('positionfix');
            } else {
                $('.page-header').removeClass('positionfix');
            }
        });
        if ($('#is_vplus').is(':checked')) {
            $('.vplus-content').show();
        } else {
            $('.vplus-content').hide();
        }
        $('#phone-box').on('keydown', '#phone_number', function (e) {
            -1 !== $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) || (/65|67|86|88/.test(e.keyCode) && (e.ctrlKey === true || e.metaKey === true)) && (!0 === e.ctrlKey || !0 === e.metaKey) || 35 <= e.keyCode && 40 >= e.keyCode || (e.shiftKey || 48 > e.keyCode || 57 < e.keyCode) && (96 > e.keyCode || 105 < e.keyCode) && e.preventDefault()
        });
        $('#vplus-mobile-box').on('keydown', '#vplus_mobile', function (e) {
            -1 !== $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) || (/65|67|86|88/.test(e.keyCode) && (e.ctrlKey === true || e.metaKey === true)) && (!0 === e.ctrlKey || !0 === e.metaKey) || 35 <= e.keyCode && 40 >= e.keyCode || (e.shiftKey || 48 > e.keyCode || 57 < e.keyCode) && (96 > e.keyCode || 105 < e.keyCode) && e.preventDefault()
        });
        $('.level0').mouseover(function () {
            catagoryShow(this);
        });
        $('.level0').mouseleave(function () {
            catagoryHide(this);
        });
        var scrollingbox = $('.inner-sidebar-main,.wrap-o-list');
        scrollingbox.on('wheel.modal mousewheel.modal', function (e) {
            var scrollingboxheight = $(this).height(),
                scrollingHeight = this.scrollHeight;
            var d = event.deltaY;
            if ((this.scrollTop === (scrollingHeight - scrollingboxheight) && d > 0) || (this.scrollTop === 0 && d < 0)) {
                e.preventDefault();
            }
            e.stopPropagation();
        });
    });

    function isWindowOS() {
        if (window.navigator.userAgent.indexOf("Windows NT") != -1) {
            return true;
        }
        return false;
    }

    function catagoryShow(_element) {
        var thisPosition = $(_element).offset().top;
        var offset_left = $(_element).offset().left;
        var need_top;
        var _target_scroll = getMainScrollTop();
        need_top = (thisPosition - _target_scroll) - 55 + 20;
        var need_left = $('.sidebar.sidebar-main').width() + offset_left - 15;
        var listIn = $(_element).children('.wrap-o-list');
        var screen_height = $(window).height();
        var catagory_height = listIn.outerHeight();
        var full_top = need_top + catagory_height;
        var max_height = screen_height - $(".page-header").height() - 20;
        var footer_height = ($(".page-footer").offset().top - $(window).scrollTop()) - screen_height;
        if (footer_height < 0) {
            screen_height = screen_height + footer_height - 15;
            max_height = max_height + footer_height;
        }
        if ((full_top) > screen_height) {
            var real_full_height = full_top - screen_height;
            need_top = need_top - real_full_height + 12;
        }
        listIn.css("top", need_top);
        listIn.css("left", need_left);
        listIn.css("z-index", 200000);
        listIn.css("display", "block");
        listIn.css("max-height", max_height + "px");
        listIn.css("overflow-x", "hidden");
        $("body").addClass("no-scroll-y");
    }

    function catagoryHide(_element) {
        var listIn = $(_element).find('.wrap-o-list');
        listIn.css("top", "-100%");
        listIn.css("left", "-100%");
        listIn.css("bottom", "auto");
        listIn.css("z-index", 0);
        listIn.css("display", "none");
        $("body").removeClass("no-scroll-y");
        if (isWindowOS()) {}
        $('body').off('wheel.modal mousewheel.modal');
    }
    $(window).scroll(function () {
        if (!$("body").hasClass("no-scroll-y")) {
            var all_popup_check = $('.wrap-o-list');
            for (var i = 0; i < all_popup_check.length; i++) {
                var _element = $(all_popup_check[i]).parent();
                catagoryHide(_element);
            };
        }
    });
    jQuery('.fotorama__fullscreen-icon').click(function () {
        jQuery(window).hide();
    });
    $(document).click(function (e) {
        var target = e.target;
        $('.btn-recently, .icon-recentley, rcl-row, .row-topic, .ctn-recently , .textRecently ').click(function () {
            $(".ctn-recently").toggleClass('active');
            $(".icon-recentley").toggleClass('active');
        });
        if (!$(target).is('.div-text-recently , .warp-item-recently , .price-box , .price-final_price , .product-item , .product-item-name , .special-price , .product-item-actions , .rcl-row , .row-detail , .ctn-widget , .product-item-details , .product-items , .widget-viewed-list , .textRecently ')) {
            $(".ctn-recently").removeClass("active");
            $(".icon-recentley").removeClass("active");
        }
    });

    function ShowHideBar() {
        if ($(".warp-item-recently").size() > 0) {
            $('.goto-top').css('bottom', '60px');
            $(".ctn-recently").show();
            $('#ctn-recently .product-image-container').css('width', '150px');
        } else {
            $('.goto-top').css('bottom', '0px');
        }
    }
    window.onscroll = function () {
        scrollFunction()
    };

    function scrollFunction() {
        if (getMainScrollTop() > 20) {
            $('.goto-top').css('display', 'block');
        } else {
            $('.goto-top').css('display', 'none');
        }
    }

    function getMainScrollTop() {
        if (document.body.scrollTop > 0) {
            return document.body.scrollTop;
        } else {
            return document.documentElement.scrollTop;
        }
    }
    $(".search-product ,#btn-search").click(function () {
        $("#form-search").fadeIn(200);
        $("#form-search form").attr('action', '/catalogsearch/result/').find('input').attr('placeholder', 'Search products');
    });
    $("#close-search").click(function () {
        $("#form-search").fadeOut(200);
    });
    $("#btn-search-cat , #cate-text , #search-category , .cat").click(function () {
        $("#form-search").css('display', 'none');
        $("#form-cate").css('display', 'none');
        $("#search-product").css('display', 'none');
        $("#search-category").css('display', 'none');
        $("#form-cate").fadeIn(200);
    });
    $("#close-cate").click(function () {
        $("#search-product").css('display', 'table-cell');
        $("#search-category").css('display', 'table-cell');
        $("#form-search").css('display', 'block');
        $("#form-cate").css('display', 'block');
        $("#form-search").fadeOut(200);
        $("#form-cate").fadeOut(200);
    });
    $(".goto-top").click(function () {
        $("html, body").animate({
            scrollTop: 0
        }, 500);
    });
    var monitorWi = $(window).width();

    function clickminicart_mobile() {
        $(".spanclick").click(function () {
            window.location.href = '/checkout/cart/';
        });
    }
    $(window).scroll(function () {
        setResizeSideBar();
        var pinFooter = 0;
        if (jQuery('footer').size() > 0) {
            pinFooter = jQuery('footer').height();
        }
        if ($(window).scrollTop() >= (jQuery(document).height() - jQuery(window).height() - pinFooter)) {
            $(".ctn-recently").addClass('pin');
            $('.ctn-recently.pin').css('bottom', pinFooter + 'px');
            $(".goto-top").css('bottom', '0px');
        } else {
            $(".ctn-recently").removeClass('pin');
            $('.ctn-recently').css('bottom', '0px');
            if (jQuery(window).width() <= 767 && jQuery('.ctn-recently').find('.rcl-row').children().hasClass('block')) {
                if (jQuery('.ctn-recently').hasClass('active')) {
                    $(".goto-top").css('bottom', '0px');
                } else {
                    $(".goto-top").css('bottom', '60px');
                }
            } else {
                $(".goto-top").css('bottom', '0px');
            }
        }
    });
    $(window).resize(function () {
        setResizeSideBar();
    });

    function setResizeSideBar() {
        if ($('.sidebar.sidebar-main').length > 0) {
            var screen_height = $(window).height();
            var footer_height = ($(".page-footer").offset().top - $(window).scrollTop()) - screen_height;
            $('.sidebar.sidebar-main').css('height', 'auto');
            $('.sidebar.sidebar-main .inner-sidebar-main').css('height', 'auto');
            var sidebar_height = $('.sidebar.sidebar-main').height();
            var minus_position = 150;
            if ($('.sidebar.sidebar-main').hasClass('fix-menu-cate-side')) {
                minus_position = 75;
            }
            var check_height = screen_height - minus_position;
            if (footer_height < 0) {
                check_height = check_height + footer_height - 15;
            }
            if (check_height < sidebar_height) {
                var need_height = sidebar_height - (sidebar_height - check_height);
                $('.sidebar.sidebar-main').css('height', need_height);
                $('.sidebar.sidebar-main .inner-sidebar-main').css('height', need_height);
            }
        }
    }
    $(".menu-text-shop").click(function () {
        $("#div-menu-detail-cate").toggleClass('active');
    });
    $(".menu-toobarcate-mobile").click(function () {
        if (isMobileDevice()) {
            $('.toobarcate-mobile,icon-shop-mobile').removeClass('active');
        } else {
            $(".toobarcate-mobile").toggleClass('active');
            $(".icon-shop-mobile").toggleClass('active');
        }
    });
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        $('.icon-shop-mobile-select').hide();
    }
    $('.selectCateMobile').change(function () {
        window.location = $(this).val();
    });
    $('.backCate').click(function () {
        window.location = './';
    });

    function fixmenucate() {
        $(window).scroll(function () {
            var padding_menu = 40;
            if ($(window).scrollTop() >= $('.section-items nav-sections-items').height() + padding_menu) {
                $('.sidebar.sidebar-main').addClass('fix-menu-cate-side');
            } else {
                $('.sidebar.sidebar-main').removeClass('fix-menu-cate-side');
            }
        });
    }

    function checklangSwichtclas(lang) {
        if (lang == "en_US") {
            $(".div-search-move").addClass('div_seach_en');
        } else {
            $(".div-search-move").removeClass('div_seach_en');
        }
    }

    function setLayoutProduct() {}

    function isMobileDevice() {
        return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
    };
    $('.villa-content-input').each(function (index) {
        if ($(this).val().length > 0) {
            if (!$(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').addClass('active');
            }
        } else {
            if ($(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').removeClass('active');
            }
        }
    });
    $('.villa-content-input').blur(function (e) {
        if ($(this).val().length > 0) {
            if (!$(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').addClass('active');
            }
        } else {
            if ($(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').removeClass('active');
            }
        }
    });
    $('.villa-content-input').focus(function (e) {
        $(this).parent().find('.villa-placeholder').addClass('active');
    });
    $('.villa-placeholder').each(function (index) {
        $(this).click(function (e) {
            $(this).parent().find('.villa-content-input').focus();
        });
    });
});;
require(["jquery"], function ($) {
    var onScrollMenu;
    $.ajaxSetup({
        timeout: 20000
    });
    $(document).ajaxError(function (event, request, settings) {
        var textError = "";
        var textErrorFile = "";
        if (!navigator.onLine) {
            window.openInfoLoad('other', 'Code : x007');
            return
        }
        if (request.statusText == "error" && (request.responseText == '' || request.responseText == null)) {
            return
        }
        if (request.statusText == "timeout") {
            window.openInfoLoad('timeout', 'Code : x001');
        } else {
            setTimeout(function () {
                console.log("ajaxError :: event :: ", event)
                console.log("ajaxError :: request :: ", request)
                console.log("ajaxError :: settings :: ", settings)
            }, 5000)
            var errorCode79 = "Code : x079 <br>";
            textError = errorCode79;
            if (request.statusText !== undefined) {
                textError += request.status;
                textError += " " + request.statusText;
            }
            var texturl = "";
            if (settings.url !== undefined) {
                textErrorFile += 'URL : ' + settings.url + ' || ';
                var urlpage = settings.url.split("/");
                var len = urlpage.length - 1;
                if (urlpage.length >= 0) {
                    texturl = urlpage[len];
                    if (urlpage[len] == "") {
                        texturl = urlpage[len - 1];
                    }
                }
                textError += " " + texturl;
            }
            textErrorFile += textError;
            window.openInfoLoad('other', textError, textErrorFile);
        }
    });
    window.openInfoLoad = function (status, message, textErrorFile = "") {
        if (window.fullScreenLoader !== undefined) {
            window.fullScreenLoader.stopLoader();
        }
        if ($(".info-loading-modal").parent().hasClass('header')) {
            $(".info-loading-modal").prependTo("body");
            $(".btn-info-loading-cancel").click(function () {
                $('.info-loading-modal').hide();
                if (window.checkoutLoadState !== undefined) {
                    window.checkoutLoadState('primary')
                }
            });
            $(".btn-info-loading-try").click(function () {
                if (window.nextLoadTA !== undefined) {
                    $('.info-loading-modal').hide();
                    window.nextLoadTA();
                } else if (window.nextLoadCheckoutPage !== undefined && window.nextLoadCheckoutPage != '') {
                    $('.info-loading-modal').hide();
                    if (window.nextLoadCheckoutPage == 'internet') {
                        $('.scb-method-interbank-button').find('button').click();
                    } else {
                        $('.scb-method-credit-button').find('button').click();
                    }
                } else {
                    window.location.reload();
                }
                window.nextLoadCheckoutPage = '';
            });
        }
        if (status == 'timeout') {
            $('.modal-info-loading-inner-title').html($.mage.__('Error: Unable to connect to server') + '<br>' + message);
        } else {
            $('.modal-info-loading-inner-title').html($.mage.__('Error: Unexpected response from server') + '<br>' + message);
        }
        $('.info-loading-modal').show();
    }

    function scrollFunctionMenu() {
        var headerBox = $(".page-header");
        var heightHeader = headerBox.outerHeight(true);
        onScrollMenu = function () {
            if (document.documentElement.scrollTop > 0) {
                headerBox.addClass('fixed');
                $(".column.main").css('padding-top', heightHeader);
                $(".nav-toggle").on('click', function () {
                    if ($(this).parents('.page-header').hasClass("fixed")) {
                        headerBox.removeClass('fixed');
                    }
                });
            } else if (document.documentElement.scrollTop == 0 || document.documentElement.scrollTop < 10) {
                headerBox.removeClass('fixed');
                $(".column.main").css('padding-top', '0');
            }
        };
        if ($(window).width() < 768) {
            $(window).bind("scroll", onScrollMenu);
        } else {
            $(window).unbind("scroll", onScrollMenu);
            $(".column.main").css('padding-top', '0');
        }
    }

    function switcherLanguesEvent() {
        var target = $('#switcher-language-trigger');
        $(target).mouseover(function () {
            if ($('.switcher-options').hasClass('active') === false) {
                $(target).click();
            }
        });
    }

    function resizeElementScreen() {
        var target = $('#minicart-content-wrapper').find('.minicart-items-wrapper');
        var realHeight = $(screen).height;
        var maxHeight = 400;
        if (realHeight < 400) {
            maxHeight = realHeight - $('.magestore-bannerslider').height();
        }
        $('#minicart-content-wrapper').find('.minicart-items-wrapper').css('max-height', maxHeight);
    }

    function setMobileNavBar() {
        var screen_width = $(window).width();
        if (screen_width < 768) {
            $('.page-header').css('top', document.documentElement.scrollTop);
        } else {
            $('.page-header').attr('style', '');
        }
    }! function (e) {
        "use strict";

        function t(e, t) {
            if (this.createTextRange) {
                var a = this.createTextRange();
                a.collapse(!0), a.moveStart("character", e), a.moveEnd("character", t - e), a.select()
            } else this.setSelectionRange && (this.focus(), this.setSelectionRange(e, t))
        }

        function a(e) {
            var t = this.value.length;
            if (e = "start" == e.toLowerCase() ? "Start" : "End", document.selection) {
                var a, i, n, l = document.selection.createRange();
                return a = l.duplicate(), a.expand("textedit"), a.setEndPoint("EndToEnd", l), i = a.text.length - l.text.length, n = i + l.text.length, "Start" == e ? i : n
            }
            return "undefined" != typeof this["selection" + e] && (t = this["selection" + e]), t
        }
        var i = {
            codes: {
                46: 127,
                188: 44,
                109: 45,
                190: 46,
                191: 47,
                192: 96,
                220: 92,
                222: 39,
                221: 93,
                219: 91,
                173: 45,
                187: 61,
                186: 59,
                189: 45,
                110: 46
            },
            shifts: {
                96: "~",
                49: "!",
                50: "@",
                51: "#",
                52: "$",
                53: "%",
                54: "^",
                55: "&",
                56: "*",
                57: "(",
                48: ")",
                45: "_",
                61: "+",
                91: "{",
                93: "}",
                92: "|",
                59: ":",
                39: '"',
                44: "<",
                46: ">",
                47: "?"
            }
        };
        e.fn.number = function (n, l, s, r) {
            r = "undefined" == typeof r ? "," : r, s = "undefined" == typeof s ? "." : s, l = "undefined" == typeof l ? 0 : l;
            var u = "\\u" + ("0000" + s.charCodeAt(0).toString(16)).slice(-4),
                h = new RegExp("[^" + u + "0-9]", "g"),
                o = new RegExp(u, "g");
            return n === !0 ? this.is("input:text") ? this.on({
                "keydown.format": function (n) {
                    var u = e(this),
                        h = u.data("numFormat"),
                        o = n.keyCode ? n.keyCode : n.which,
                        c = "",
                        v = a.apply(this, ["start"]),
                        d = a.apply(this, ["end"]),
                        p = "",
                        f = !1;
                    if (i.codes.hasOwnProperty(o) && (o = i.codes[o]), !n.shiftKey && o >= 65 && 90 >= o ? o += 32 : !n.shiftKey && o >= 69 && 105 >= o ? o -= 48 : n.shiftKey && i.shifts.hasOwnProperty(o) && (c = i.shifts[o]), "" == c && (c = String.fromCharCode(o)), 8 != o && 45 != o && 127 != o && c != s && !c.match(/[0-9]/)) {
                        var g = n.keyCode ? n.keyCode : n.which;
                        if (46 == g || 8 == g || 127 == g || 9 == g || 27 == g || 13 == g || (65 == g || 82 == g || 80 == g || 83 == g || 70 == g || 72 == g || 66 == g || 74 == g || 84 == g || 90 == g || 61 == g || 173 == g || 48 == g) && (n.ctrlKey || n.metaKey) === !0 || (86 == g || 67 == g || 88 == g) && (n.ctrlKey || n.metaKey) === !0 || g >= 35 && 39 >= g || g >= 112 && 123 >= g) return;
                        return n.preventDefault(), !1
                    }
                    if (0 == v && d == this.value.length ? 8 == o ? (v = d = 1, this.value = "", h.init = l > 0 ? -1 : 0, h.c = l > 0 ? -(l + 1) : 0, t.apply(this, [0, 0])) : c == s ? (v = d = 1, this.value = "0" + s + new Array(l + 1).join("0"), h.init = l > 0 ? 1 : 0, h.c = l > 0 ? -(l + 1) : 0) : 45 == o ? (v = d = 2, this.value = "-0" + s + new Array(l + 1).join("0"), h.init = l > 0 ? 1 : 0, h.c = l > 0 ? -(l + 1) : 0, t.apply(this, [2, 2])) : (h.init = l > 0 ? -1 : 0, h.c = l > 0 ? -l : 0) : h.c = d - this.value.length, h.isPartialSelection = v == d ? !1 : !0, l > 0 && c == s && v == this.value.length - l - 1) h.c++, h.init = Math.max(0, h.init), n.preventDefault(), f = this.value.length + h.c;
                    else if (45 != o || 0 == v && 0 != this.value.indexOf("-"))
                        if (c == s) h.init = Math.max(0, h.init), n.preventDefault();
                        else if (l > 0 && 127 == o && v == this.value.length - l - 1) n.preventDefault();
                    else if (l > 0 && 8 == o && v == this.value.length - l) n.preventDefault(), h.c--, f = this.value.length + h.c;
                    else if (l > 0 && 127 == o && v > this.value.length - l - 1) {
                        if ("" === this.value) return;
                        "0" != this.value.slice(v, v + 1) && (p = this.value.slice(0, v) + "0" + this.value.slice(v + 1), u.val(p)), n.preventDefault(), f = this.value.length + h.c
                    } else if (l > 0 && 8 == o && v > this.value.length - l) {
                        if ("" === this.value) return;
                        "0" != this.value.slice(v - 1, v) && (p = this.value.slice(0, v - 1) + "0" + this.value.slice(v), u.val(p)), n.preventDefault(), h.c--, f = this.value.length + h.c
                    } else 127 == o && this.value.slice(v, v + 1) == r ? n.preventDefault() : 8 == o && this.value.slice(v - 1, v) == r ? (n.preventDefault(), h.c--, f = this.value.length + h.c) : l > 0 && v == d && this.value.length > l + 1 && v > this.value.length - l - 1 && isFinite(+c) && !n.metaKey && !n.ctrlKey && !n.altKey && 1 === c.length && (p = d === this.value.length ? this.value.slice(0, v - 1) : this.value.slice(0, v) + this.value.slice(v + 1), this.value = p, f = v);
                    else n.preventDefault();
                    f !== !1 && t.apply(this, [f, f]), u.data("numFormat", h)
                },
                "keyup.format": function (i) {
                    var n, s = e(this),
                        r = s.data("numFormat"),
                        u = i.keyCode ? i.keyCode : i.which,
                        h = a.apply(this, ["start"]),
                        o = a.apply(this, ["end"]);
                    0 !== h || 0 !== o || 189 !== u && 109 !== u || (s.val("-" + s.val()), h = 1, r.c = 1 - this.value.length, r.init = 1, s.data("numFormat", r), n = this.value.length + r.c, t.apply(this, [n, n])), "" === this.value || (48 > u || u > 57) && (96 > u || u > 105) && 8 !== u && 46 !== u && 110 !== u || (s.val(s.val()), l > 0 && (r.init < 1 ? (h = this.value.length - l - (r.init < 0 ? 1 : 0), r.c = h - this.value.length, r.init = 1, s.data("numFormat", r)) : h > this.value.length - l && 8 != u && (r.c++, s.data("numFormat", r))), 46 != u || r.isPartialSelection || (r.c++, s.data("numFormat", r)), n = this.value.length + r.c, t.apply(this, [n, n]))
                },
                "paste.format": function (t) {
                    var a = e(this),
                        i = t.originalEvent,
                        n = null;
                    return window.clipboardData && window.clipboardData.getData ? n = window.clipboardData.getData("Text") : i.clipboardData && i.clipboardData.getData && (n = i.clipboardData.getData("text/plain")), a.val(n), t.preventDefault(), !1
                }
            }).each(function () {
                var t = e(this).data("numFormat", {
                    c: -(l + 1),
                    decimals: l,
                    thousands_sep: r,
                    dec_point: s,
                    regex_dec_num: h,
                    regex_dec: o,
                    init: this.value.indexOf(".") ? !0 : !1
                });
                "" !== this.value && t.val(t.val())
            }) : this.each(function () {
                var t = e(this),
                    a = +t.text().replace(h, "").replace(o, ".");
                t.number(isFinite(a) ? +a : 0, l, s, r)
            }) : this.text(e.number.apply(window, arguments))
        };
        var n = null,
            l = null;
        e.isPlainObject(e.valHooks.text) ? (e.isFunction(e.valHooks.text.get) && (n = e.valHooks.text.get), e.isFunction(e.valHooks.text.set) && (l = e.valHooks.text.set)) : e.valHooks.text = {}, e.valHooks.text.get = function (t) {
            var a, i = e(t),
                l = i.data("numFormat");
            return l ? "" === t.value ? "" : (a = +t.value.replace(l.regex_dec_num, "").replace(l.regex_dec, "."), (0 === t.value.indexOf("-") ? "-" : "") + (isFinite(a) ? a : 0)) : e.isFunction(n) ? n(t) : void 0
        }, e.valHooks.text.set = function (t, a) {
            var i = e(t),
                n = i.data("numFormat");
            if (n) {
                var s = e.number(a, n.decimals, n.dec_point, n.thousands_sep);
                return e.isFunction(l) ? l(t, s) : t.value = s
            }
            return e.isFunction(l) ? l(t, a) : void 0
        }, e.number = function (e, t, a, i) {
            i = "undefined" == typeof i ? "1000" !== new Number(1e3).toLocaleString() ? new Number(1e3).toLocaleString().charAt(1) : "" : i, a = "undefined" == typeof a ? new Number(.1).toLocaleString().charAt(1) : a, t = isFinite(+t) ? Math.abs(t) : 0;
            var n = "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4),
                l = "\\u" + ("0000" + i.charCodeAt(0).toString(16)).slice(-4);
            e = (e + "").replace(".", a).replace(new RegExp(l, "g"), "").replace(new RegExp(n, "g"), ".").replace(new RegExp("[^0-9+-Ee.]", "g"), "");
            var s = isFinite(+e) ? +e : 0,
                r = "",
                u = function (e, t) {
                    return "" + +(Math.round(("" + e).indexOf("e") > 0 ? e : e + "e+" + t) + "e-" + t)
                };
            return r = (t ? u(s, t) : "" + Math.round(s)).split("."), r[0].length > 3 && (r[0] = r[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, i)), (r[1] || "").length < t && (r[1] = r[1] || "", r[1] += new Array(t - r[1].length + 1).join("0")), r.join(a)
        }
    }(jQuery);
    $('#is_vplus').on('click', function () {
        if ($(this).is(':checked')) {
            $('.vplus-content').show();
        } else {
            $('.vplus-content').hide();
        }
    });
    var footerHiOver = 0;
    var GET_ITEM_AJAX = false;
    var PRODUCT_CAT_MODE = "";
    var WEB_BASE_URL = "";
    var CLEAR_WAIT_OUTER_CATAGORY;
    $(document).ready(function () {
        initDropDown($(".sl-wrap"));

        function initDropDown(elmSlVal, evAtChange, ctClass, evAtAfterInit) {
            $.each(elmSlVal, function () {
                if (!$(this).hasClass('sel-wraped')) {
                    $(this).addClass('sel-wraped');
                    var thisId = $(this).attr('id');
                    if (typeof thisId === 'undefined' || thisId == "") {
                        var idxOf = $('.sl-wrap').index($(this));
                        $(this).attr('id', 'sl-wrap-' + idxOf);
                        thisId = $(this).attr('id');
                    }
                    var elmSL = $('#' + thisId);
                    if (ctClass !== undefined) {} else {
                        ctClass = "";
                    }
                    elmSL.find('select').addClass('sl_sty');
                    elmSL.find('select').wrap('<div class="bx_dd dd-mb ' + ctClass + '"></div>');
                    var html = "";
                    var nowSlTxt = "";
                    nowSlTxt = elmSL.find('select option:selected').text();
                    if (elmSL.find('select').hasClass('no-hide-first-option')) {
                        $.each(elmSL.find('select option'), function (i, val) {
                            var slTxt = $(this).text();
                            var slVal = $(this).val();
                            html += '<li data-value="' + slVal + '"><span>' + slTxt + '</span></li>';
                        });
                    } else {
                        elmSL.find('select option[value=""]').eq(0).hide();
                        $.each(elmSL.find('select option[value!=""]'), function (i, val) {
                            var slTxt = $(this).text();
                            var slVal = $(this).val();
                            html += '<li data-value="' + slVal + '"><span>' + slTxt + '</span></li>';
                        });
                    }
                    var tmpDd = '';
                    tmpDd += '<div class="bx_dd dd-pc ' + ctClass + '">';
                    tmpDd += '<div class="sl_sty wrapper-dropdown-5">';
                    tmpDd += '<span class="lb-sl">' + nowSlTxt + '</span>';
                    tmpDd += '<ul class="dropdown">' + html + '</ul>';
                    tmpDd += '</div>';
                    tmpDd += '</div>';
                    elmSL.find('select').parent().after(tmpDd);
                    elmSL.find('.wrapper-dropdown-5').click(function () {
                        if ($(this).hasClass('active')) {
                            $(this).removeClass('active');
                        } else {
                            $('.wrapper-dropdown-5').removeClass('active');
                            $(this).addClass('active');
                        }
                    });
                    elmSL.find('.wrapper-dropdown-5 li').click(function () {
                        var slVl = $(this).data('value');
                        var slTxt = $(this).text();
                        elmSL.find('select').val(slVl);
                        $(this).parent().parent().find('.lb-sl').addClass('slt').text(slTxt);
                        if (typeof (evAtChange) == "function") {
                            evAtChange($(this));
                        }
                    });
                    elmSL.find('select').change(function () {
                        var slTxt = $(this).find(":selected").text();
                        $(this).parent().parent().find('.lb-sl').text(slTxt);
                        if (typeof (evAtChange) == "function") {
                            evAtChange($(this));
                        }
                    });
                    if (typeof (evAtAfterInit) == "function") {
                        evAtAfterInit(elmSL.find('select'));
                    }
                }
            });
        }
        $('.click.sender').click(function () {
            if ($('.display-block').hasClass('active')) {
                $('.display-block').removeClass('active');
                $('.wrap-display').removeClass('d2');
            }
        });
        $('.click.owner').click(function () {
            if (!$('.display-block').hasClass('active')) {
                $('.display-block').addClass('active');
                $('.wrap-display').addClass('d2');
            }
        });
        if (isMobileDevice()) {
            $('.selectCateMobile').addClass('active');
        } else {
            $('.selectCateMobile').removeClass('active');
        }
        const url = $('#base_url').val();
        checklangSwichtclas($('#h-lang').val())
        clickminicart_mobile();
        fixmenucate();
        $(".ctn-recently").hide();
        setTimeout(function () {
            ShowHideBar();
        }, 100);
        $(window).resize(function () {
            if (window.width <= 767) {
                $('.page-header').addClass('positionfix');
            } else {
                $('.page-header').removeClass('positionfix');
            }
        });
        if ($('#is_vplus').is(':checked')) {
            $('.vplus-content').show();
        } else {
            $('.vplus-content').hide();
        }
        $('#phone-box').on('keydown', '#phone_number', function (e) {
            -1 !== $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) || (/65|67|86|88/.test(e.keyCode) && (e.ctrlKey === true || e.metaKey === true)) && (!0 === e.ctrlKey || !0 === e.metaKey) || 35 <= e.keyCode && 40 >= e.keyCode || (e.shiftKey || 48 > e.keyCode || 57 < e.keyCode) && (96 > e.keyCode || 105 < e.keyCode) && e.preventDefault()
        });
        $('#vplus-mobile-box').on('keydown', '#vplus_mobile', function (e) {
            -1 !== $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) || (/65|67|86|88/.test(e.keyCode) && (e.ctrlKey === true || e.metaKey === true)) && (!0 === e.ctrlKey || !0 === e.metaKey) || 35 <= e.keyCode && 40 >= e.keyCode || (e.shiftKey || 48 > e.keyCode || 57 < e.keyCode) && (96 > e.keyCode || 105 < e.keyCode) && e.preventDefault()
        });
        $('.level0').mouseover(function () {
            catagoryShow(this);
        });
        $('.level0').mouseleave(function () {
            catagoryHide(this);
        });
        var scrollingbox = $('.inner-sidebar-main,.wrap-o-list');
        scrollingbox.on('wheel.modal mousewheel.modal', function (e) {
            var scrollingboxheight = $(this).height(),
                scrollingHeight = this.scrollHeight;
            var d = event.deltaY;
            if ((this.scrollTop === (scrollingHeight - scrollingboxheight) && d > 0) || (this.scrollTop === 0 && d < 0)) {
                e.preventDefault();
            }
            e.stopPropagation();
        });
    });

    function isWindowOS() {
        if (window.navigator.userAgent.indexOf("Windows NT") != -1) {
            return true;
        }
        return false;
    }

    function catagoryShow(_element) {
        var thisPosition = $(_element).offset().top;
        var offset_left = $(_element).offset().left;
        var need_top;
        var _target_scroll = getMainScrollTop();
        need_top = (thisPosition - _target_scroll) - 55 + 20;
        var need_left = $('.sidebar.sidebar-main').width() + offset_left - 15;
        var listIn = $(_element).children('.wrap-o-list');
        var screen_height = $(window).height();
        var catagory_height = listIn.outerHeight();
        var full_top = need_top + catagory_height;
        var max_height = screen_height - $(".page-header").height() - 20;
        var footer_height = ($(".page-footer").offset().top - $(window).scrollTop()) - screen_height;
        if (footer_height < 0) {
            screen_height = screen_height + footer_height - 15;
            max_height = max_height + footer_height;
        }
        if ((full_top) > screen_height) {
            var real_full_height = full_top - screen_height;
            need_top = need_top - real_full_height + 12;
        }
        listIn.css("top", need_top);
        listIn.css("left", need_left);
        listIn.css("z-index", 200000);
        listIn.css("display", "block");
        listIn.css("max-height", max_height + "px");
        listIn.css("overflow-x", "hidden");
        $("body").addClass("no-scroll-y");
    }

    function catagoryHide(_element) {
        var listIn = $(_element).find('.wrap-o-list');
        listIn.css("top", "-100%");
        listIn.css("left", "-100%");
        listIn.css("bottom", "auto");
        listIn.css("z-index", 0);
        listIn.css("display", "none");
        $("body").removeClass("no-scroll-y");
        if (isWindowOS()) {}
        $('body').off('wheel.modal mousewheel.modal');
    }
    $(window).scroll(function () {
        if (!$("body").hasClass("no-scroll-y")) {
            var all_popup_check = $('.wrap-o-list');
            for (var i = 0; i < all_popup_check.length; i++) {
                var _element = $(all_popup_check[i]).parent();
                catagoryHide(_element);
            };
        }
    });
    jQuery('.fotorama__fullscreen-icon').click(function () {
        jQuery(window).hide();
    });
    $(document).click(function (e) {
        var target = e.target;
        $('.btn-recently, .icon-recentley, rcl-row, .row-topic, .ctn-recently , .textRecently ').click(function () {
            $(".ctn-recently").toggleClass('active');
            $(".icon-recentley").toggleClass('active');
        });
        if (!$(target).is('.div-text-recently , .warp-item-recently , .price-box , .price-final_price , .product-item , .product-item-name , .special-price , .product-item-actions , .rcl-row , .row-detail , .ctn-widget , .product-item-details , .product-items , .widget-viewed-list , .textRecently ')) {
            $(".ctn-recently").removeClass("active");
            $(".icon-recentley").removeClass("active");
        }
    });

    function ShowHideBar() {
        if ($(".warp-item-recently").size() > 0) {
            $('.goto-top').css('bottom', '60px');
            $(".ctn-recently").show();
            $('#ctn-recently .product-image-container').css('width', '150px');
        } else {
            $('.goto-top').css('bottom', '0px');
        }
    }
    window.onscroll = function () {
        scrollFunction()
    };

    function scrollFunction() {
        if (getMainScrollTop() > 20) {
            $('.goto-top').css('display', 'block');
        } else {
            $('.goto-top').css('display', 'none');
        }
    }

    function getMainScrollTop() {
        if (document.body.scrollTop > 0) {
            return document.body.scrollTop;
        } else {
            return document.documentElement.scrollTop;
        }
    }
    $(".search-product ,#btn-search").click(function () {
        $("#form-search").fadeIn(200);
        $("#form-search form").attr('action', '/catalogsearch/result/').find('input').attr('placeholder', 'Search products');
    });
    $("#close-search").click(function () {
        $("#form-search").fadeOut(200);
    });
    $("#btn-search-cat , #cate-text , #search-category , .cat").click(function () {
        $("#form-search").css('display', 'none');
        $("#form-cate").css('display', 'none');
        $("#search-product").css('display', 'none');
        $("#search-category").css('display', 'none');
        $("#form-cate").fadeIn(200);
    });
    $("#close-cate").click(function () {
        $("#search-product").css('display', 'table-cell');
        $("#search-category").css('display', 'table-cell');
        $("#form-search").css('display', 'block');
        $("#form-cate").css('display', 'block');
        $("#form-search").fadeOut(200);
        $("#form-cate").fadeOut(200);
    });
    $(".goto-top").click(function () {
        $("html, body").animate({
            scrollTop: 0
        }, 500);
    });
    var monitorWi = $(window).width();

    function clickminicart_mobile() {
        $(".spanclick").click(function () {
            window.location.href = '/checkout/cart/';
        });
    }
    $(window).scroll(function () {
        setResizeSideBar();
        var pinFooter = 0;
        if (jQuery('footer').size() > 0) {
            pinFooter = jQuery('footer').height();
        }
        if ($(window).scrollTop() >= (jQuery(document).height() - jQuery(window).height() - pinFooter)) {
            $(".ctn-recently").addClass('pin');
            $('.ctn-recently.pin').css('bottom', pinFooter + 'px');
            $(".goto-top").css('bottom', '0px');
        } else {
            $(".ctn-recently").removeClass('pin');
            $('.ctn-recently').css('bottom', '0px');
            if (jQuery(window).width() <= 767 && jQuery('.ctn-recently').find('.rcl-row').children().hasClass('block')) {
                if (jQuery('.ctn-recently').hasClass('active')) {
                    $(".goto-top").css('bottom', '0px');
                } else {
                    $(".goto-top").css('bottom', '60px');
                }
            } else {
                $(".goto-top").css('bottom', '0px');
            }
        }
    });
    $(window).resize(function () {
        setResizeSideBar();
    });

    function setResizeSideBar() {
        if ($('.sidebar.sidebar-main').length > 0) {
            var screen_height = $(window).height();
            var footer_height = ($(".page-footer").offset().top - $(window).scrollTop()) - screen_height;
            $('.sidebar.sidebar-main').css('height', 'auto');
            $('.sidebar.sidebar-main .inner-sidebar-main').css('height', 'auto');
            var sidebar_height = $('.sidebar.sidebar-main').height();
            var minus_position = 150;
            if ($('.sidebar.sidebar-main').hasClass('fix-menu-cate-side')) {
                minus_position = 75;
            }
            var check_height = screen_height - minus_position;
            if (footer_height < 0) {
                check_height = check_height + footer_height - 15;
            }
            if (check_height < sidebar_height) {
                var need_height = sidebar_height - (sidebar_height - check_height);
                $('.sidebar.sidebar-main').css('height', need_height);
                $('.sidebar.sidebar-main .inner-sidebar-main').css('height', need_height);
            }
        }
    }
    $(".menu-text-shop").click(function () {
        $("#div-menu-detail-cate").toggleClass('active');
    });
    $(".menu-toobarcate-mobile").click(function () {
        if (isMobileDevice()) {
            $('.toobarcate-mobile,icon-shop-mobile').removeClass('active');
        } else {
            $(".toobarcate-mobile").toggleClass('active');
            $(".icon-shop-mobile").toggleClass('active');
        }
    });
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        $('.icon-shop-mobile-select').hide();
    }
    $('.selectCateMobile').change(function () {
        window.location = $(this).val();
    });
    $('.backCate').click(function () {
        window.location = './';
    });

    function fixmenucate() {
        $(window).scroll(function () {
            var padding_menu = 40;
            if ($(window).scrollTop() >= $('.section-items nav-sections-items').height() + padding_menu) {
                $('.sidebar.sidebar-main').addClass('fix-menu-cate-side');
            } else {
                $('.sidebar.sidebar-main').removeClass('fix-menu-cate-side');
            }
        });
    }

    function checklangSwichtclas(lang) {
        if (lang == "en_US") {
            $(".div-search-move").addClass('div_seach_en');
        } else {
            $(".div-search-move").removeClass('div_seach_en');
        }
    }

    function setLayoutProduct() {}

    function isMobileDevice() {
        return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
    };
    $('.villa-content-input').each(function (index) {
        if ($(this).val().length > 0) {
            if (!$(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').addClass('active');
            }
        } else {
            if ($(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').removeClass('active');
            }
        }
    });
    $('.villa-content-input').blur(function (e) {
        if ($(this).val().length > 0) {
            if (!$(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').addClass('active');
            }
        } else {
            if ($(this).parent().find('.villa-placeholder').hasClass('active')) {
                $(this).parent().find('.villa-placeholder').removeClass('active');
            }
        }
    });
    $('.villa-content-input').focus(function (e) {
        $(this).parent().find('.villa-placeholder').addClass('active');
    });
    $('.villa-placeholder').each(function (index) {
        $(this).click(function (e) {
            $(this).parent().find('.villa-content-input').focus();
        });
    });
});;
require(['jquery', 'Magento_Customer/js/customer-data', 'jquery/jquery.cookie', 'Magento_Ui/js/modal/modal'], function ($, customerData, cookie, modal) {
    var hasCart = false;

    function fullScreenLoader(status) {
        status = typeof status !== 'undefined' ? status : false;
        if (status) {
            var loader = '<div class="loading-mask" data-role="loader" style="display: block;"><div class="loader"><img alt="Loading..." src="https://villamarket2.d.orisma.com/pub/static/version1543848099/frontend/Villa/blank/en_US/images/loader-2.gif"><p>Please wait...</p></div></div>';
            jQuery('body').append(loader);
        } else {
            jQuery('.loading-mask').remove();
        }
    }
    window.reorder = {
        loadState: false,
        orderaction: function (reload) {
            if (typeof (window.reorder.order) != 'undefined') {
                fullScreenLoader(true);
                if (window.reorder.order.login) {
                    checkLocalstore();
                } else {
                    restoreCart();
                }
            }

            function checkLocalstore() {
                $.ajax({
                    type: "GET",
                    url: "/villa/Order/Store/",
                    cache: false,
                    data: {
                        "order_id": window.reorder.order.id
                    },
                    error: function () {
                        fullScreenLoader();
                    },
                    success: function (response) {
                        fullScreenLoader();
                        $.ckLocalStorage('can_reorder', window.reorder.order.id, {
                            path: '/',
                            domain: window.location.hostname
                        })
                        if (response.changeStore) {
                            $('<div />').html($.mage.__('Your store will be changed if you reorder. Are you sure you want to proceed ?')).confirm({
                                autoOpen: true,
                                title: 'Changestore',
                                buttons: [{
                                    text: $.mage.__('OK'),
                                    class: 'action-primary action-reorder-accept',
                                    click: function () {
                                        this.closeModal();
                                        reorderClearCart(window.reorder.order.id, response);
                                        return true;
                                    }
                                }, {
                                    text: $.mage.__('Cancel'),
                                    class: 'action-primary action-reorder-cancel',
                                    click: function () {
                                        this.closeModal();
                                        return false;
                                    }
                                }]
                            });
                        } else {
                            reorderClearCart(window.reorder.order.id, response);
                        }
                    }
                });
            }

            function reorderClearCart(entityId, response) {
                if (hasCart) {
                    $('<div />').html($.mage.__('Your cart will be emptied if you reorder. Are you sure you want to proceed ?')).confirm({
                        autoOpen: true,
                        title: 'Reorder',
                        buttons: [{
                            text: $.mage.__('Ok'),
                            class: 'action-primary action-reorder-accept',
                            click: function () {
                                this.closeModal();
                                fullScreenLoader(true)
                                $.ajax({
                                    type: "post",
                                    url: "/villa/cart/clear",
                                    cache: false,
                                    data: {
                                        "order_id": entityId
                                    },
                                    error: function () {},
                                    success: function (data) {
                                        saveReorderLocation(entityId, response);
                                    }
                                });
                                return true;
                            }
                        }, {
                            text: $.mage.__('Cancel'),
                            class: 'action-primary action-reorder-cancel',
                            click: function () {
                                this.closeModal();
                                return false;
                            }
                        }]
                    });
                } else {
                    fullScreenLoader(true)
                    $.ajax({
                        type: "GET",
                        url: "/villa/cart/clear",
                        cache: false,
                        data: {
                            "order_id": $(self).data('entity-id')
                        },
                        error: function () {},
                        success: function (data) {
                            saveReorderLocation(entityId, response)
                        }
                    });
                }
            }

            function saveReorderLocation(entityId, response) {
                window.tempCheckout = window.getTempCheckoutForm();
                var geoAddress = $.parseJSON($.ckLocalStorage('geoAddress'))
                var newGeoAddress = {
                    street: response.address.street,
                    district: response.address.city,
                    province: response.address.region,
                    postal_code: response.address.postcode,
                    latitude: response.address.villa_latitude,
                    longitude: response.address.villa_longitude,
                    isNewAddress: true,
                    addressInx: 0
                }
                if (geoAddress === undefined || geoAddress == null) {
                    $.ckLocalStorage('geoAddress', JSON.stringify(newGeoAddress), {
                        path: '/'
                    })
                    geoAddress = newGeoAddress
                }
                if (response.shippingMethod == 'delivery') {
                    if (response.address.villa_latitude !== null) {
                        $.ckLocalStorage('geoAddress', JSON.stringify(newGeoAddress), {
                            path: '/'
                        })
                        $.ckLocalStorage('currentAddress', response.address.street + '::' + response.shippingMethod, {
                            path: '/'
                        })
                        $.ckLocalStorage('addressCheckDistance', newGeoAddress.street + ' ' + newGeoAddress.district + ' ' + newGeoAddress.province + ' ' + newGeoAddress.postal_code, {
                            path: '/'
                        })
                        var lat = response.address.villa_latitude
                        var lng = response.address.villa_longitude
                        var postcode = response.address.postcode
                        var tmpAddress = (lat * 1) + ':' + (lng * 1) + ':' + postcode;
                        $.ckLocalStorage('reorderLatLng', tmpAddress, {
                            path: '/'
                        })
                        window.tempCheckout.latitude = lat * 1;
                        window.tempCheckout.longitude = lng * 1;
                        var store = JSON.parse($.ckLocalStorage('tempDefaultStore'));
                        if (store !== null) {
                            window.mapStoreSelected(store, '', 'delivery', newGeoAddress);
                            reorderRedirect(entityId, response)
                        } else {
                            $.ajax({
                                url: '/storepickup/index/loadstore',
                                type: 'POST',
                                dataType: 'json',
                                data: {
                                    latitude: lat,
                                    longitude: lng,
                                    postal_code: postcode,
                                    radius: NaN,
                                    tagIds: null,
                                    type: "delivery",
                                },
                            }).done(function (data) {
                                data.default_store.storepickup_id * 1;
                                if (data.default_store && data.default_store.length > 0) {
                                    var date = new Date();
                                    date.setTime(date.getTime() + (60 * 60 * 1000));
                                    $.ckLocalStorage('tempDefaultStore', JSON.stringify(data.default_store[0]), {
                                        expires: date,
                                        path: '/'
                                    });
                                    window.mapStoreSelected(data.default_store[0], '', 'delivery', newGeoAddress);
                                    reorderRedirect(entityId, response)
                                }
                            });
                        }
                    } else {
                        $.ckLocalStorage('geoAddress', JSON.stringify(newGeoAddress), {
                            path: '/'
                        })
                        $.ckLocalStorage('reorderLatLng', 'not_has_lat_lng', {
                            path: '/'
                        })
                        $.ckLocalStorage('currentAddress', newGeoAddress.street + '::' + response.shippingMethod, {
                            path: '/'
                        })
                        $.ckLocalStorage('addressCheckDistance', newGeoAddress.street + ' ' + newGeoAddress.district + ' ' + newGeoAddress.province + ' ' + newGeoAddress.postal_code, {
                            path: '/'
                        })
                        window.mapStoreSelected(response.storepickup[0], '', 'delivery', newGeoAddress);
                        reorderRedirect(entityId, response)
                    }
                } else {
                    $.ckLocalStorage('reorderLatLng', '', {
                        path: '/'
                    })
                    $.ckLocalStorage('geoAddress', '', {
                        path: '/'
                    })
                    $.ckLocalStorage('currentAddress', newGeoAddress.street + '::' + response.shippingMethod, {
                        path: '/'
                    })
                    $.ckLocalStorage('addressCheckDistance', '', {
                        path: '/'
                    })
                    window.mapStoreSelected(response.storepickup[0], '', 'pickup', '');
                    reorderRedirect(entityId, response)
                }
            }

            function reorderRedirect(entityId, response) {
                customerData.invalidate(['cart']);
                if (response.changeStore) {
                    window.location = '/sales/order/reorder/order_id/' + entityId + '/?___store=' + response.storeCode + '&___from_store=' + response.currentStoreCode
                } else {
                    window.location = '/sales/order/reorder/order_id/' + entityId
                }
            }
        },
        getWarning: function () {
            if (typeof (window.reorder.order.warning)) {
                var text = this.buildWarning('cart_empty_message');
            }
            return text;
        },
        buildWarning: function (name, number) {
            var text = '';
            if (typeof (number) === 'undefined') number = 0;
            try {
                if (name == 'cart_empty_message') {
                    if (typeof (window.reorder.order.amount) != "undefined") {
                        var amount = window.reorder.order.amount;
                        var date = window.reorder.order.date;
                        var tempdate = new Date(date);
                        var min = Math.floor(tempdate / 60);
                        var hour = Math.floor(min / 60);
                        if (jQuery("#switcher-language-trigger>.villa-flag-en").length > 0) {
                            var verbtobe = '';
                            var plurals = '';
                            switch (amount) {
                                case 0:
                                    return text;
                                case 1:
                                    verbtobe = 'is';
                                    break;
                                default:
                                    verbtobe = 'are';
                                    plurals = 's';
                                    break;
                            }
                            if (hour > 0) {
                                date = hour + ' hour' + getSubfix(hour);
                            } else {
                                date = min + ' min' + getSubfix(min);
                            }
                            text = "There " + verbtobe + " " + amount + " item" + plurals + " in your last incomplete order (" + date + " ago)."
                        } else {
                            if (hour > 0) {
                                date = hour + ' à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡'
                            } else {
                                date = min + ' à¸™à¸²à¸—à¸µ'
                            }
                            text = "à¸¡à¸µà¸ˆà¸³à¸™à¸§à¸™à¸ªà¸´à¸™à¸„à¹‰à¸² " + amount + " à¸£à¸²à¸¢à¸à¸²à¸£à¹ƒà¸™à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­à¸¥à¹ˆà¸²à¸ªà¸¸à¸”à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ (" + date + "à¸—à¸µà¹ˆà¹à¸¥à¹‰à¸§)";
                        }
                    } else {
                        if (number <= 20) {
                            number++;
                            setTimeout(function () {
                                this.buildWarning(name, number);
                            }, 100)
                        }
                    }
                }
                window.reorder.order.warning = text;
                return text;
            } catch (err) {
                return text;
            }

            function getSubfix(amount) {
                var plurals = '';
                if (amount > 1) {
                    plurals = 's'
                }
                return plurals;
            }

            function monthEngtoThai(month) {
                var thai = "";
                switch (month) {
                    case (1):
                        thai = 'à¸¡.à¸„.'
                        break;
                    case (2):
                        thai = 'à¸.à¸ž.'
                        break;
                    case (3):
                        thai = 'à¸¡à¸µ.à¸„.'
                        break;
                    case (4):
                        thai = 'à¹€à¸¡.à¸¢.'
                        break;
                    case (5):
                        thai = 'à¸ž.à¸„.'
                        break;
                    case (6):
                        thai = 'à¸¡à¸´.à¸¢.'
                        break;
                    case (7):
                        thai = 'à¸.à¸„.'
                        break;
                    case (8):
                        thai = 'à¸ª.à¸„.'
                        break;
                    case (9):
                        thai = 'à¸.à¸¢.'
                        break;
                    case (10):
                        thai = 'à¸•.à¸„.'
                        break;
                    case (11):
                        thai = 'à¸ž.à¸¢.'
                        break;
                    case (12):
                        thai = 'à¸˜.à¸„.'
                        break;
                    default:
                        thai = month
                        break;
                }
                return thai;
            }
        }
    }
    window.Base64 = {
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = Base64._utf8_encode(input);
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
            }
            return output;
        },
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            output = Base64._utf8_decode(output);
            return output;
        },
        _utf8_encode: function (string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        },
        _utf8_decode: function (utftext) {
            var string = "";
            var i = 0;
            var c = c1 = c2 = 0;
            while (i < utftext.length) {
                c = utftext.charCodeAt(i);
                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }
            }
            return string;
        }
    };
    window.util = {
        isLogIn: function () {
            if ($("#new_custom_account_login_action").length >= 1) {
                return true;
            } else {
                return false;
            }
        },
        gotoLogin: function (url) {
            var targetURL = '/customer/account/login/referer/';
            if (url != null && url != undefined) {
                targetURL += Base64.encode(encodeURI(url)) + "/";
            } else {
                targetURL += Base64.encode(encodeURI(window.location.href)) + "/";
                var d = new Date();
                Â Â Â Â d.setTime(d.getTime() + (1 * 24 * 60 * 60 * 1000));
                Â Â Â Â
                var expires = "expires=" + d.toUTCString();
                document.cookie = "login_redirect=" + window.location.href + "; path=/; " + expires;
            }
            window.location.href = targetURL;
        }
    };
    window.ajaxcart = {
        cartData: customerData,
        delayClick: null,
        reloadCart: function (refresh) {
            if (refresh === undefined) {
                refresh = true;
            }
            var sections = ['cart'];
            ajaxcart.cartData.invalidate(sections);
            ajaxcart.cartData.reload(sections, refresh);
            window.saveCurrentLoaction()
        },
        applyEvent: function () {
            $(".del-item,.dis_item_num").unbind('click');
            $(".del-item,.dis_item_num").on("click", function () {
                var cid;
                var currentVal;
                var input;
                if ($("#add-tocart-panel").length == 1) {
                    cid = $(this).parent().parent().attr("data-cid");
                    input = $(this).parent().find(".txtbox-q");
                } else if ($(this).attr("data-cart-item-id")) {
                    cid = $(this).attr("data-cart-item-id");
                    input = $(this).parent().find(".input-text.qty");
                } else {
                    cid = $(this).parents(".from-btnad,.tocart-form").attr("data-cid");
                    input = $(this).parent().find(".txtbox-q");
                }
                if (cid == undefined) {
                    return null;
                }
                currentVal = parseInt($(input).val());
                if (parseInt(currentVal) <= 1) {
                    currentVal = 0;
                    $("#dis-item-" + cid + "-qty").click();
                } else {
                    $(input).val(currentVal - 1).change();
                }
            });
            $(".add-item,.add_item_num").unbind('click');
            $(".add-item,.add_item_num").on("click", function () {
                var cid;
                var currentVal;
                var input;
                if ($("#add-tocart-panel").length == 1) {
                    cid = $(this).parent().parent().attr("data-cid");
                    input = $(this).parent().find(".txtbox-q");
                } else if ($(this).attr("data-cart-item-id")) {
                    cid = $(this).attr("data-cart-item-id");
                    input = $(this).parent().find(".input-text.qty");
                } else {
                    cid = $(this).parents(".from-btnad,.tocart-form").attr("data-cid");
                    input = $(this).parent().find(".txtbox-q");
                }
                if (cid == undefined) {
                    return null;
                }
                currentVal = parseInt($(input).val());
                $(input).val(currentVal + 1).change();
            });
            $(".txtbox-q,.input-text.qty").unbind('change');
            $(".txtbox-q,.input-text.qty").on("change", function () {
                var cid;
                if ($("#add-tocart-panel").length == 1) {
                    cid = $(this).parent().parent().attr("data-cid");
                } else if ($(this).attr("id") && $(this).attr("id").indexOf("cart-") != -1) {
                    cid = $(this).attr("id").split("-")[1];
                } else {
                    cid = $(this).parents(".from-btnad,.tocart-form").attr("data-cid");
                }
                if (cid == undefined) {
                    return null;
                }
                var myVal = $(this).val();
                $("#cart-item-" + cid + "-qty").val(myVal).trigger("change");
            });
        },
        checkqty: function (pid, qty) {
            var frm = $("#fnt-" + pid + ",.fnt-" + pid + ",#f-" + pid + ",.f-" + pid);
            if (qty >= 1) {
                frm.find(".adjust-qty").fadeIn(100);
                frm.find(".wrap-tocart").hide();
                frm.find(".txtbox-q").val(qty);
                this.updateWeight(frm.find(".txtbox-q"));
            } else {
                frm.find(".adjust-qty").hide();
                frm.find(".wrap-tocart").fadeIn(100);
            }
        },
        updateMiniCartData: function (mode) {
            var _mode = "all";
            if (mode != null && mode != undefined) {
                _mode = mode;
            }
            var all_item = $("#mini-cart").find(".product-item");
            var num_item = 0;
            if (all_item.length > 0) {
                for (var i = 0; i < all_item.length; i++) {
                    var input_qty = $(all_item[i]).find(".cart-item-qty");
                    var data_weight = $(all_item[i]).find(".data-weight");
                    if (_mode == "all") {
                        this.updateWeight(input_qty);
                    }
                    if (data_weight.length == 1) {
                        num_item++;
                    } else {
                        num_item += $(input_qty).val() * 1;
                    }
                }
                num_item = num_item * 1;
                if (mode == "num_item") {
                    return num_item;
                } else {
                    if (num_item > 0) {
                        hasCart = true;
                        $('.minicart-wrapper.recovery').removeClass('recovery')
                    }
                    var strHTML = '<span class="counter-number">' + (num_item) + '</span><span class="counter-label">' + (num_item) + '</span>';
                    $(".warp-deck-mini .counter.qty").html(strHTML);
                    $(".warp-deck-mini .counter.qty").show();
                }
            }
        },
        updateWeight: function (ele_input) {
            var qty = $(ele_input).val() * 1;
            var ele_input_q = $(ele_input).parent().find(".txtbox-qx");
            var ele_input_w = $(ele_input).parent().find(".txtbox-weight");
            var is_shoping_cart_page = false;
            if ($("#shopping-cart-table").length == 1) {
                is_shoping_cart_page = true;
                var ele_price = $(ele_input).parents(".item-info").find(".data_final_price");
                if ($(ele_price).length == 1) {
                    var price = $(ele_price).val().split(",").join("") * 1;
                    var prices = price * qty;
                    var prices2decimal = Number(parseFloat(prices).toFixed(2)).toLocaleString('en', {
                        minimumFractionDigits: 2
                    });
                    $(ele_input).parents(".item-info").find(".col.subtotal .price").html("à¸¿" + prices2decimal);
                }
                var all_price = 0;
                var all_ele_price = $("#shopping-cart-table .item-info");
                for (var i = 0; i < all_ele_price.length; i++) {
                    var price_data = $(all_ele_price[i]).find(".data_final_price").val().split(",").join("") * 1;
                    var qty_data = $(all_ele_price[i]).find(".txtbox-q").val().split(",").join("") * 1;
                }
                $("#cart-totals .price.update").html("à¸¿" + (all_price).toFixed(2));
            }
            if ($(ele_input).length > 0) {
                var ele_w = $(ele_input).parents(".products-list-wrap,.item.cart,.product-item,.product-info-main").find(".prod-price-wrap,.product-item-details,.product-info-detail").find(".data_weight,.data-weight");
                if ($(ele_w).length > 0) {
                    var weight = $(ele_w).attr("data-value") * 1;
                    $(ele_input_w).html(this.convertWeight(weight * qty));
                    $(ele_input_q).html("");
                    $(ele_input).css("visibility", "hidden");
                    $(ele_input_w).show();
                    $(ele_input_q).hide();
                    var str_weight = "/" + this.convertWeight(weight);
                    if ($(ele_input).attr("data-cart-item") != null && $(ele_input).attr("data-cart-item") != undefined) {
                        $(ele_input).parents(".product-item").find(".data-weight").html(str_weight);
                    }
                } else {
                    $(ele_input_w).html("");
                    $(ele_input_q).html("x" + qty);
                    $(ele_input).css("visibility", "visible");
                    $(ele_input_w).hide();
                    $(ele_input_q).show();
                }
            }
        },
        convertWeight: function (val_g) {
            if (val_g >= 1000) {
                var value = (Math.round((val_g / 1000) * 100) / 100) + "";
                var value_explode = value.split(".");
                if (value_explode.length == 1) {
                    return value + "kg";
                } else {
                    value = value_explode[0] + "." + value_explode[1].substr(0, 1)
                    return value + "kg";
                }
            } else {
                return (Math.round(val_g * 100) / 100) + "g";
            }
        },
        getqty: function (mode) {
            ajaxcart.applyEvent();
            $.get('/villa/checkout/cart').done(function (data) {
                if (typeof (data['data']) != 'undefined') {
                    var cart = data['data'];
                    if (typeof (cart['recovery']) != 'undefined') {
                        mode = 'add_class_only';
                        var ordernew = cart['recovery']['id'] != $.ckLocalStorage('can_reorder');
                        if (typeof ($.ckLocalStorage('can_reorder')) == 'null' || ordernew) {
                            $.ckLocalStorage('can_reorder', true, {
                                path: '/',
                                domain: window.location.hostname
                            });
                            $('.minicart-wrapper').addClass('recovery');
                            window.reorder.order = data['data']['recovery'];
                            window.reorder.getWarning();
                        }
                        delete data['data']['recovery'];
                    }
                }
                window.LAST_CART_DATA = data;
                ajaxcart.updateQty(mode);
                window.reorder.loadState = true;
            });
        },
        updateQty: function (mode) {
            var productDetailId = $('.comment_product.pdt-detail .comment_area').data('product-id');
            var productDetailCartId = $('.comment_cart_item_id').val();
            var data = window.LAST_CART_DATA;
            $.each(data.data, function (key, value) {
                var pid = key;
                var frm = $("#fnt-" + pid + ",.fnt-" + pid + ",#f-" + pid + ",.f-" + pid);
                frm.attr("data-cid", value["cart_id"]);
                frm.addClass("cid-" + value["cart_id"]);
                if (productDetailId !== undefined) {
                    if (key == productDetailId) {
                        $('.comment_cart_item_id').val(value["cart_id"]);
                        $('.comment_product.pdt-detail .comment_area').val(value["cmt"]);
                        if (value["qty"] > 0) {
                            $('.product-add-cmt').slideDown();
                        } else {
                            $('.product-add-cmt').slideUp();
                        }
                    }
                }
                if (mode != null && mode != undefined && mode == "add_class_only") {} else {
                    ajaxcart.checkqty(pid, value["qty"]);
                }
            });
        },
        addfirstcart: function (pid, btnaddtocart) {
            if ($("#new_custom_account_login_action").length < 1) {
                window.location = '/customer/account/login';
                return;
            }
            if ($.mage == undefined || $.mage.cookies == undefined) {
                return;
            }
            if ($.ckLocalStorage('currentAddress') == null) {
                $('.btn-open-map').click();
                $.ckLocalStorage('lastAddToCart', pid, {
                    path: '/',
                    domain: window.location.hostname
                })
                return;
            }
            if (window.dataCookieStore !== undefined && window.dataCookieStore == 'default') {
                $('.btn-open-map').click();
                $.ckLocalStorage('lastAddToCart', pid, {
                    path: '/',
                    domain: window.location.hostname
                })
                return;
            }
            if (canReorder()) {
                showModalReorder(btnaddtocart, this);
            } else {
                var currentAddress = $.ckLocalStorage('currentAddress');
                var addresslist = $.ckLocalStorage('addresslist');
                if (addresslist != null && currentAddress != null) {
                    addItem(btnaddtocart, this);
                } else {
                    $('#direct-open-location').click();
                }
            }

            function canReorder() {
                var can_reorder = $.ckLocalStorage('can_reorder') == 'true';
                return can_reorder && $('.minicart-wrapper.recovery').length > 0;
            }

            function showModalReorder(btnaddtocart, self) {
                $('<div />').html(window.reorder.getWarning() + ' ' + $.mage.__('Do you want to restore cart?')).confirm({
                    autoOpen: true,
                    title: 'Old cart exists',
                    buttons: [{
                        text: $.mage.__('Only add this one'),
                        class: 'action-primary action-recart-accept width-btn',
                        click: function () {
                            $.ckLocalStorage('can_reorder', window.reorder.order.id, {
                                path: '/',
                                domain: window.location.hostname
                            })
                            this.closeModal();
                            addItem(btnaddtocart, self);
                        }
                    }, {
                        text: $.mage.__('Restore cart'),
                        class: 'action-primary action-recart-cancel',
                        click: function () {
                            this.closeModal();
                            window.reorder.orderaction();
                        }
                    }]
                });
            }

            function errorMessage(msg, frm, self) {
                $('<div />').html($.mage.__(msg)).confirm({
                    autoOpen: false,
                    title: 'Warning',
                    buttons: [{
                        text: $.mage.__('Close'),
                        class: 'action-primary action-reorder-accept',
                        click: function () {
                            this.closeModal();
                            emptyBox(frm, self);
                            return true;
                        }
                    }]
                });
            }

            function emptyBox(frm, self) {
                frm.find(".wrap-tocart").html(' <div class="stock unavailable ">' + $.mage.__('Out of stock') + '</div>');
                frm.find(".adjust-qty").hide();
                frm.find(".wrap-tocart").show();
                $('.product-add-cmt').slideUp();
                $(frm).find(".txtbox-q").val(0);
                self.updateWeight($(frm).find(".txtbox-q"));
            }

            function addItem(btnaddtocart, self) {
                var frm = $(btnaddtocart).parents("form");
                $(self).attr("disabled", true);
                frm.find(".adjust-qty").fadeIn(100);
                frm.find(".wrap-tocart").hide();
                $('.product-add-cmt').slideDown();
                $(frm).find(".txtbox-q").val(1);
                self.updateWeight($(frm).find(".txtbox-q"));
                $.ajax({
                    type: "POST",
                    url: "/checkout/cart/add/",
                    cache: false,
                    dataType: 'json',
                    data: {
                        qty: 1,
                        form_key: $.mage.cookies.get('form_key'),
                        product: pid
                    },
                    success: function (response) {
                        if (response.backUrl) {
                            errorMessage(response.backUrl, frm, self);
                        } else {
                            ajaxcart.getqty("add_class_only");
                            ajaxcart.reloadCart(false);
                            $(self).attr("disabled", false);
                        }
                    }
                });
            }
        }
    };
    window.wishlist = {
        get: function (p_id, mode) {
            var obj_data = {}
            if (p_id != null && p_id != undefined) {
                obj_data.product_id = p_id;
            }
            try {
                obj_data.form_key = $.mage.cookies.get('form_key');
            } catch (e) {}
            $.ajax({
                type: "POST",
                url: "/villa/wishlist/get/",
                cache: false,
                data: obj_data,
                success: function (response) {
                    if (mode == "product_detail") {
                        if (response.wishlist != null && response.wishlist != undefined) {
                            var wishlist = response.wishlist[0];
                            if (wishlist.is_wishlist == "T") {
                                $("#wrap_product_detail .wrap_wishlist").addClass("active");
                            } else {
                                $("#wrap_product_detail .wrap_wishlist").removeClass("active");
                            }
                        }
                    }
                }
            });
        },
        add: function (p_id) {
            var obj_data = {}
            if (p_id != null && p_id != undefined) {
                obj_data.product_id = p_id;
            }
            try {
                obj_data.form_key = $.mage.cookies.get('form_key');
            } catch (e) {}
            $.ajax({
                type: "POST",
                url: "/villa/wishlist/add/",
                cache: false,
                data: obj_data,
                success: function (response) {
                    if (typeof response === "string") {
                        util.gotoLogin();
                    } else if (!response.is_login) {
                        util.gotoLogin();
                    }
                }
            });
        },
        remove: function (p_id, item) {
            self = this;
            fullScreenLoader(true);
            var obj_data = {}
            if (p_id != null && p_id != undefined) {
                obj_data.product_id = p_id;
            }
            try {
                obj_data.form_key = $.mage.cookies.get('form_key');
            } catch (e) {}
            $.ajax({
                type: "POST",
                url: "/villa/wishlist/remove/",
                cache: false,
                data: obj_data,
                success: function (response) {
                    var targetURL = '/customer/account/login/';
                    targetURL += 'referer/' + encodeURI(Base64.encode(window.location.href)) + "/";
                    if (typeof (item) != 'undefined') {
                        jQuery(item).remove();
                    }
                    fullScreenLoader(false);
                }
            });
        }
    };
    $(document).ready(function () {
        var id = null;
        $(".div-h").hide();
        ajaxcart.getqty();
        if ($("#wrap_product_detail").length == 1) {
            var p_id = new Array();
            var all_pid = new Array();
            var all_ele = $(".wrap_wishlist");
            for (var i = 0; i < all_ele.length; i++) {
                all_pid.push($(all_ele[i]).attr("data-productid"));
            }
            wishlist.get(all_pid, "product_detail");
        }
    });
    $(document).on('ajaxComplete', function (event, xhr, settings) {
        var sections, redirects;
        if (settings.type.match(/post|put|delete/i)) {
            if (settings.url.indexOf("villa/sort/sortnew") != -1) {
                setTimeout(function () {
                    ajaxcart.updateQty();
                }, 200);
            }
        }
    });
});;
require(["jquery"], function (jQuery) {
    (function ($) {
        $.JJJud = function (el, options) {
            var _this = this;
            _this.$el = $(el);
            _this.el = el;
            _this.initials = {
                waitElement: null
            };
            $.extend(_this, _this.initials);
            _this.$el.data("JJJud", _this);
            if (typeof _this.$el.attr('data-text') !== typeof undefined && _this.$el.attr('data-text') !== false) {} else {
                _this.$el.attr("title", _this.$el.text().trim());
                _this.$el.attr('data-text', _this.$el.text());
            }
            _this.countVowelToneMarks = function (inputText) {
                var textCount = new Array(/à¸´/g, /à¸µ/g, /à¸¶/g, /à¸·/g, /à¸¸/g, /à¸¹/g, /à¹ˆ/g, /à¹‰/g, /à¹Š/g, /à¹‹/g, /à¸±/g, /à¹Œ/g, /à¹‡/g);
                var sumCount = 0;
                for (var i in textCount) {
                    sumCount += (inputText.match(textCount[i]) || []).length;
                }
                return sumCount;
            };
            _this.getText = function () {
                var _this = this;
                return _this.$el.text();
            };
            _this.getHeight = function () {
                var _this = this;
                return _this.$el.height();
            };
            _this.getFontSize = function () {
                var _this = this;
                return parseInt(_this.$el.css("font-size"));
            };
            _this.getMaxHeight = function () {
                var _this = this;
                var tempText = _this.getText();
                _this.$el.text("aa");
                var lineheight = _this.getHeight();
                _this.$el.text(tempText);
                return (_this.settings["max_rows"] * lineheight) + (lineheight / 5);
            };
            _this.getLineHeight = function () {
                var _this = this;
                var tempText = _this.getText();
                _this.$el.text("0");
                var lineheight = _this.getHeight();
                _this.$el.text(tempText);
                return lineheight;
            };
            _this.cutWord = function () {
                var _this = this;
                var elmHeightRows = 0;
                var whileHeight = _this.getHeight();
                var counter = 0;
                var lengthWordRow = _this.getText().length;
                var lineHeight = _this.getLineHeight();
                var lineCount = (_this.getHeight() / lineHeight) - 1;
                if (lineCount == 0) {
                    lineCount = 1;
                }
                var textNumberNeed = ((lengthWordRow * _this.settings["max_rows"]) / lineCount);
                var textNeed = _this.getText().substr(0, parseInt(textNumberNeed));
                if (_this.getMaxHeight() != 0 || _this.getMaxHeight() != "") {
                    var offset = _this.countVowelToneMarks(textNeed);
                    var textOffset = _this.getText().substr(0, parseInt(textNumberNeed) + offset);
                    _this.$el.text(textOffset);
                    _this.$el.text(textNeed);
                    while (whileHeight >= _this.getMaxHeight() && counter < 100) {
                        counter++;
                        var lengthWord = _this.getText().length;
                        var cutString = _this.getText().substring(0, lengthWord - (counter == 1 ? 3 : 6)) + "...";
                        _this.$el.text(cutString);
                        whileHeight = _this.getHeight();
                    }
                    if (counter == 100) {
                        console.error("JJJud Calculate Error");
                    }
                    _this.settings["onComplete"](_this.$el);
                }
            };
            _this.waitElementToShow = function () {
                var _this = this;
                _this.waitElement = setInterval(function () {
                    if ($(_this.settings["waitElement"]).is(":visible")) {
                        _this.cutWord();
                        clearInterval(_this.waitElement);
                    }
                }, _this.settings["waitTime"]);
            };
            _this.init = function () {
                var _this = this;
                _this.settings = $.extend({}, $.JJJud.defaultOptions, options);
                if (_this.settings["waitElement"] != "") {
                    _this.waitElementToShow();
                } else {
                    _this.cutWord();
                }
            };
            _this.init();
        };
        $.JJJud.defaultOptions = {
            "max_rows": 2,
            "onComplete": $.noop,
            "waitElement": "",
            "waitTime": 200
        };
        $.fn.JJJud = function (options) {
            return this.each(function () {
                (new $.JJJud(this, options));
            });
        };
    })(jQuery);
});;
require(["jquery", 'Magento_Customer/js/customer-data', 'https://cdn.ravenjs.com/3.15.0/raven.min.js', 'jquery/jquery.cookie'], function ($, customerData, Raven) {
    if (window.location.hostname == "shoponline.villamarket.com") {}
    var onpayment = $.cookie('onpayment')
    var pathName = window.location.pathname
    if (onpayment != null && onpayment == 1 && pathName.indexOf('twocp/host/form') <= -1 && pathName.indexOf('promptpay/host/form') <= -1 && pathName.indexOf('wechat/host/form') <= -1) {
        $.cookie('onpayment', null, {
            path: '/',
            domain: window.location.hostname
        })
        $.cookie('on2c2p', null, {
            path: '/',
            domain: window.location.hostname
        })
        if (pathName.indexOf('checkout/onepage/success') <= -1 && pathName.indexOf('checkout/onepage/failure')) {
            $.post('/villa/payment/RefreshCart', {}).done(function (data) {
                var sections = ['cart'];
                customerData.invalidate(sections);
            });
        } else {}
    }
    $(document).ready(function () {
        var initreferrer = document.referrer;
        $('.wrapper-villa-account-info-panel').on('click', function () {
            if ($('.wrapper-villa-account-info-panel').hasClass('active')) {
                $('.wrapper-villa-account-info-panel').removeClass('active');
            }
        });
        $('.menu-canvas,.villa-newmenu-overlay').on('click', function () {
            $('.menu-canvas').toggleClass('open');
            $('.wrapper-villa-newmenu').toggleClass('active');
            $('.wrapper-villa-newmenu-overlay').toggleClass('active');
            $('body').toggleClass('active-newmenu');
            setPageWrapperHeight();
        });
        try {
            if ($.ckLocalStorage('geoAddress'))
                JSON.parse($.ckLocalStorage('geoAddress'));
        } catch (e) {
            $.ckLocalStorage('geoAddress', "", {
                path: '/',
                expires: -1
            });
            var web_domain = "." + window.location.host;
            $.ckLocalStorage('geoAddress', '', {
                path: '/',
                expires: -1,
                domain: web_domain
            });
            window.location.reload();
        }
        $('.header-title-category-box').on('click', function () {
            var screen_width = $(window).width();
            if (screen_width < 768) {
                $('.menu-canvas').click();
            }
        });
        $('.menu-toobarcate-mobile').on('click', function () {
            if ($('.toobarcate-mobile').hasClass('active')) {
                $('.menu-toobarcate-mobile').css('margin-bottom', 0);
            } else {
                $('.menu-toobarcate-mobile').css('margin-bottom', -5);
            }
        });
    });
    $(window).resize(function () {
        resizeMinicartWrapper();
        infoAccountMove();
    });
    $(window).scroll(function () {
        infoAccountMove();
        subCategoryFixed();
        if ($('#check-home-wrapper-grabandgo-bt').length > 0) {
            categoryHomeGrabAndGoFixed();
        }
        if ($('#wrapper-grabandgo-bt').length > 0) {
            categoryGrabAndGoFixed();
        }
    });

    function setPageWrapperHeight() {
        if ($('body').hasClass('active-newmenu')) {
            $('.page-wrapper').css('height', $(window).height());
        } else {
            $('.page-wrapper').css('height', 'auto');
        }
        if ($('.page-wrapper').hasClass('active-newmenu')) {
            $('.page-wrapper').toggleClass('active-newmenu close-menu');
        } else {
            $('.page-wrapper').toggleClass('active-newmenu');
        }
        setTimeout(function () {
            $('.page-wrapper').removeClass('close-menu');
        }, 1000);
    }

    function resizeMinicartWrapper() {
        if ($('.minicart-wrapper').hasClass('active')) {
            var screen_height = $(window).height();
            var max_height = 400;
            if (screen_height < 550) {
                max_height = screen_height - $('.page-header').height() - 60;
            }
            $('#minicart-content-wrapper .minicart-items-wrapper').css('max-height', max_height);
        }
    }

    function infoAccountMove() {
        var target = $('.villa-account-info.villa-dropdown-menu');
        need_top = $('.page-header').height() + getScrollMove() - 5;
        var screen_width = $(window).width();
        var need_right = (screen_width - $('.panel.wrapper').width()) / 2;
        var need_right_plus = 10;
        if (screen_width < 767) {
            need_right_plus = 35;
        }
        need_right = need_right + need_right_plus;
        target.css("right", need_right);
    }

    function subCategoryFixed() {
        var screen_width = $(window).width();
        var target = $('#wrapper-menu-toobarcate-mobile');
        var header_height = $('.panel.wrapper').height();
        var left_fix = "";
        var warp_topcate_badge = 0;
        if ($('#wrapper-grabandgo-bt').length > 0) {
            header_height = header_height + 46;
        }
        if ($('.warp-top-cate-badge').length > 0) {
            warp_topcate_badge = $('.swiper-panel').height() + $('.swiper-scrollbar').height()
            left_fix = "left: -2px;";
        }
        if (screen_width < 768 && (getScrollMove() - (header_height + warp_topcate_badge) >= 0)) {
            $(target).attr('style', 'width:100%;background-color:#f5f5f5;padding-top:10px;position:fixed;z-index:2000;' + left_fix);
            $(target).css('top', header_height + warp_topcate_badge);
        } else {
            $(target).attr('style', '');
        }
    }

    function categoryGrabAndGoFixed() {
        var screen_width = $(window).width();
        var target = $('#wrapper-grabandgo-bt');
        var header_height = $('.panel.wrapper').height();
        var warp_topcate_badge = 0;
        if ($('.warp-top-cate-badge').length > 0) {
            warp_topcate_badge = $('.swiper-panel').height() + $('.swiper-scrollbar').height()
            left_fix = "left: -2px;";
        }
        if (screen_width < 768 && (getScrollMove() - (header_height + warp_topcate_badge) >= 0)) {
            $(target).attr('style', 'width:100%;background-color:#f5f5f5;padding-top:10px;position:fixed;z-index:2000;left: -2px;');
            $(target).css('top', header_height + warp_topcate_badge);
        } else {
            $(target).attr('style', '');
        }
    }

    function categoryHomeGrabAndGoFixed() {
        var screen_width = $(window).width();
        var target = $('#home-wrapper-grabandgo-bt');
        var header_height = $('.panel.wrapper').height();
        var warp_topcate_badge = 0;
        if ($('.warp-top-cate-badge').length > 0) {
            warp_topcate_badge = $('.swiper-panel').height() + $('.swiper-scrollbar').height();
        }
        var check_offset = $('#check-home-wrapper-grabandgo-bt').offset();
        if (screen_width < 768 && (getScrollMove() >= (check_offset.top - (header_height + warp_topcate_badge)))) {
            $(target).attr('style', 'width:100%;background-color:#f5f5f5;padding-top:10px;position:fixed;z-index:2000;padding-bottom:10px;text-align:center;left: -2px;');
            $(target).css('top', header_height + warp_topcate_badge);
        } else {
            $(target).removeAttr('style');
        }
    }

    function getScrollMove() {
        if (document.body.scrollTop > 0) {
            return document.body.scrollTop;
        } else {
            return document.documentElement.scrollTop;
        }
    }
});