System.register(["lodash", "../beans/function", "../beans/request/legacy_target_converter", "../controllers/templating_functions_ctrl", "../utils/promise_utils", "../utils/templating_function_resolver", "../utils/templating_utils", "./metric_names_store", "./request/query_builder", "./request/target_validator", "./response/response_handler", "./response/series_name_builder"], function(exports_1) {
    var lodash_1, function_1, legacy_target_converter_1, templating_functions_ctrl_1, promise_utils_1, templating_function_resolver_1, templating_utils_1, metric_names_store_1, query_builder_1, target_validator_1, response_handler_1, series_name_builder_1;
    var KairosDBDatasource;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (function_1_1) {
                function_1 = function_1_1;
            },
            function (legacy_target_converter_1_1) {
                legacy_target_converter_1 = legacy_target_converter_1_1;
            },
            function (templating_functions_ctrl_1_1) {
                templating_functions_ctrl_1 = templating_functions_ctrl_1_1;
            },
            function (promise_utils_1_1) {
                promise_utils_1 = promise_utils_1_1;
            },
            function (templating_function_resolver_1_1) {
                templating_function_resolver_1 = templating_function_resolver_1_1;
            },
            function (templating_utils_1_1) {
                templating_utils_1 = templating_utils_1_1;
            },
            function (metric_names_store_1_1) {
                metric_names_store_1 = metric_names_store_1_1;
            },
            function (query_builder_1_1) {
                query_builder_1 = query_builder_1_1;
            },
            function (target_validator_1_1) {
                target_validator_1 = target_validator_1_1;
            },
            function (response_handler_1_1) {
                response_handler_1 = response_handler_1_1;
            },
            function (series_name_builder_1_1) {
                series_name_builder_1 = series_name_builder_1_1;
            }],
        execute: function() {
            KairosDBDatasource = (function () {
                function KairosDBDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.initialized = false;
                    this.initializationError = false;
                    this.type = instanceSettings.type;
                    this.url = instanceSettings.url;
                    this.name = instanceSettings.name;
                    this.withCredentials = instanceSettings.withCredentials;
                    this.basicAuth = instanceSettings.basicAuth;
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.responseHandler = new response_handler_1.KairosDBResponseHandler(new series_name_builder_1.SeriesNameBuilder());
                    this.promiseUtils = new promise_utils_1.PromiseUtils($q);
                    this.metricNamesStore = new metric_names_store_1.MetricNamesStore(this, this.promiseUtils, this.url);
                    this.templatingUtils = new templating_utils_1.TemplatingUtils(templateSrv, {});
                    this.templatingFunctionsCtrl = new templating_functions_ctrl_1.TemplatingFunctionsCtrl(new templating_function_resolver_1.TemplatingFunctionResolver(this.templatingUtils));
                    this.targetValidator = new target_validator_1.TargetValidator();
                    this.legacyTargetConverter = new legacy_target_converter_1.LegacyTargetConverter();
                    this.registerTemplatingFunctions();
                }
                KairosDBDatasource.prototype.initialize = function () {
                    var _this = this;
                    return this.metricNamesStore.getMetricNames().then(function () { return _this.initialized = true; }, function () { return _this.initializationError = true; }).then(function () { return _this.initialized; });
                };
                KairosDBDatasource.prototype.query = function (options) {
                    var _this = this;
                    this.queryOptions = options;
                    var enabledTargets = lodash_1.default.cloneDeep(options.targets.filter(function (target) { return !target.hide; }));
                    var convertedTargets = lodash_1.default.map(enabledTargets, function (target) {
                        return _this.legacyTargetConverter.isApplicable(target) ?
                            { query: _this.legacyTargetConverter.convert(target) } : target;
                    });
                    if (!this.targetValidator.areValidTargets(convertedTargets)) {
                        return; // todo: target validation, throw message to grafana with detailed info
                    }
                    var aliases = convertedTargets.map(function (target) { return target.query.alias; });
                    var templatingUtils = this.templateSrv;
                    var unpackedTargets = lodash_1.default.flatten(convertedTargets.map(function (target) {
                        var replacedQuery = templatingUtils.replace(JSON.stringify(target.query), options.scopedVars);
                        return [JSON.parse(replacedQuery)].map(function (query) {
                            var clonedTarget = lodash_1.default.cloneDeep(target);
                            clonedTarget.query = query;
                            return clonedTarget;
                        });
                    }));
                    var requestBuilder = this.getRequestBuilder(options.scopedVars);
                    return this.executeRequest(requestBuilder.buildDatapointsQuery(unpackedTargets, options))
                        .then(function (response) { return _this.responseHandler.convertToDatapoints(response.data, aliases); });
                };
                KairosDBDatasource.prototype.getMetricTags = function (metricNameTemplate, filters) {
                    if (filters === void 0) { filters = {}; }
                    var metricName = this.templatingUtils.replace(metricNameTemplate)[0];
                    return this.executeRequest(this.getRequestBuilder().buildMetricTagsQuery(metricName, filters))
                        .then(this.handleMetricTagsResponse);
                };
                KairosDBDatasource.prototype.metricFindQuery = function (query, options) {
                    var _this = this;
                    var func = this.templatingFunctionsCtrl.resolve(query, options.scopedVars);
                    return func().then(function (values) { return values.map(function (value) { return _this.mapToTemplatingValue(value); }); });
                };
                KairosDBDatasource.prototype.getMetricNames = function () {
                    return this.executeRequest(this.getRequestBuilder().buildMetricNameQuery());
                };
                KairosDBDatasource.prototype.testDatasource = function () {
                    return this.executeRequest(this.getRequestBuilder().buildHealthCheckQuery());
                };
                KairosDBDatasource.prototype.getRequestBuilder = function (scopedVars) {
                    if (scopedVars === void 0) { scopedVars = {}; }
                    return new query_builder_1.KairosDBQueryBuilder(this.withCredentials, this.url, "/api/v1", this.templateSrv, scopedVars);
                };
                KairosDBDatasource.prototype.executeRequest = function (request) {
                    return this.backendSrv.datasourceRequest(request);
                };
                KairosDBDatasource.prototype.handleMetricTagsResponse = function (response) {
                    return response.data.queries[0].results[0].tags;
                };
                KairosDBDatasource.prototype.registerTemplatingFunctions = function () {
                    var _this = this;
                    [
                        new function_1.TemplatingFunction("metrics", function (metricNamePart) { return _this.getMetricNamesContaining(metricNamePart); }),
                        new function_1.TemplatingFunction("tag_names", this.getMetricTagNames.bind(this)),
                        new function_1.TemplatingFunction("tag_values", this.getMetricTagValues.bind(this))
                    ].forEach(function (func) { return _this.templatingFunctionsCtrl.register(func); });
                };
                KairosDBDatasource.prototype.getMetricNamesContaining = function (metricNamePart) {
                    return this.metricNamesStore.getMetricNames()
                        .then(function (metricNames) { return lodash_1.default.filter(metricNames, function (metricName) { return lodash_1.default.includes(metricName, metricNamePart); }); });
                };
                KairosDBDatasource.prototype.getMetricTagNames = function (metricName) {
                    return this.getMetricTags(metricName)
                        .then(function (tags) { return lodash_1.default.keys(tags); });
                };
                KairosDBDatasource.prototype.getMetricTagValues = function (metricName, tagName, filters) {
                    return this.getMetricTags(metricName, filters)
                        .then(function (tags) {
                        return lodash_1.default.values(tags[tagName]);
                    });
                };
                KairosDBDatasource.prototype.mapToTemplatingValue = function (entry) {
                    return {
                        text: entry,
                        value: entry
                    };
                };
                return KairosDBDatasource;
            })();
            exports_1("KairosDBDatasource", KairosDBDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map