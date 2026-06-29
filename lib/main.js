"use strict";
const diff_1 = require("@vitest/utils/diff");
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const stylus = require("stylus");
var PACKAGE_PATH = path.join(__dirname, "..");
var PACKAGE_STYL_PATH = path.join(PACKAGE_PATH, "styl");
var lastItem = function (items) {
    return items[items.length - 1];
};
var noColor = function (string) {
    return string;
};
var diffOptions = {
    aColor: noColor,
    bColor: noColor,
    changeColor: noColor,
    changeLineTrailingSpaceColor: noColor,
    commonColor: noColor,
    commonLineTrailingSpaceColor: noColor,
    patchColor: noColor,
};
// Tokens defining the True CSS output language.
var MODULE_TOKEN = "# Module: ";
var MODULE_NESTING_TOKEN = " :: ";
var END_MODULE_TOKEN = "END_MODULE";
var TRUE_MODULE_START_TOKEN = "TRUE_MODULE_START: ";
var TRUE_MODULE_END_TOKEN = "TRUE_MODULE_END: ";
var TRUE_TEST_START_TOKEN = "TRUE_TEST_START: ";
var TRUE_TEST_END_TOKEN = "TRUE_TEST_END: ";
var SUMMARY_TOKEN = "# SUMMARY ";
var END_SUMMARY_TOKEN = "----------";
var TEST_TOKEN = "Test: ";
var PASS_TOKEN = "✔ ";
var FAIL_TOKEN = "✖ FAILED: [";
var END_FAIL_TOKEN = "]";
var ASSERT_TOKEN = "ASSERT: ";
var FAILURE_DETAIL_TOKEN = "- ";
var FAILURE_TYPE_START_TOKEN = "[";
var FAILURE_TYPE_END_TOKEN = "]";
var OUTPUT_TOKEN = "Output: ";
var EXPECTED_TOKEN = "Expected: ";
var DETAILS_SEPARATOR_TOKEN = ": ";
var OUTPUT_START_TOKEN = "OUTPUT";
var OUTPUT_END_TOKEN = "END_OUTPUT";
var EXPECTED_START_TOKEN = "EXPECTED";
var EXPECTED_END_TOKEN = "END_EXPECTED";
var CONTAINED_START_TOKEN = "CONTAINED";
var CONTAINED_END_TOKEN = "END_CONTAINED";
var CONTAINS_STRING_START_TOKEN = "CONTAINS_STRING";
var CONTAINS_STRING_END_TOKEN = "END_CONTAINS_STRING";
var ASSERT_END_TOKEN = "END_ASSERT";
var OUTPUT_MARKERS = [
    OUTPUT_START_TOKEN,
    OUTPUT_END_TOKEN,
    EXPECTED_START_TOKEN,
    EXPECTED_END_TOKEN,
    CONTAINED_START_TOKEN,
    CONTAINED_END_TOKEN,
    CONTAINS_STRING_START_TOKEN,
    CONTAINS_STRING_END_TOKEN,
    ASSERT_END_TOKEN,
];
var toArray = function (value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value.slice() : [value];
};
var uniq = function (items) {
    return items.filter(function (item, index) {
        return item && items.indexOf(item) === index;
    });
};
var looksLikePluginPath = function (pluginPath) {
    return (pluginPath.charAt(0) === "." ||
        pluginPath.indexOf("/") !== -1 ||
        pluginPath.indexOf("\\") !== -1);
};
var resolvePluginPath = function (pluginPath, filename) {
    var base = filename ? path.dirname(filename) : process.cwd();
    var isScopedPackage = pluginPath.charAt(0) === "@";
    if (path.isAbsolute(pluginPath)) {
        return require.resolve(pluginPath);
    }
    if (looksLikePluginPath(pluginPath) && !isScopedPackage) {
        try {
            return require.resolve(path.resolve(base, pluginPath));
        }
        catch (relativeError) {
            if (pluginPath.charAt(0) === ".") {
                throw relativeError;
            }
        }
    }
    return require.resolve(pluginPath, {
        paths: [base, process.cwd()],
    });
};
var loadPluginPath = function (entry, filename) {
    var pluginPath;
    var options;
    var factory;
    var plugin;
    if (typeof entry === "string") {
        pluginPath = entry;
    }
    else if (entry && typeof entry === "object") {
        pluginPath = entry.path;
        options = entry.options;
    }
    if (!pluginPath || typeof pluginPath !== "string") {
        throw new Error("pluginPaths entries must be strings or { path, options } objects");
    }
    factory = require(resolvePluginPath(pluginPath, filename));
    if (typeof factory !== "function") {
        throw new Error('plugin "' + pluginPath + '" does not export a function');
    }
    plugin = factory(options);
    if (typeof plugin !== "function") {
        throw new Error('plugin "' + pluginPath + '" factory must return a Stylus plugin function');
    }
    return plugin;
};
var normalizeUsePlugins = function (use, pluginPaths, filename) {
    return toArray(use).concat(toArray(pluginPaths).map(function (entry) {
        return loadPluginPath(entry, filename);
    }));
};
var prepareStylusOptions = function (stylOptions) {
    var stylOpts = Object.assign({}, stylOptions);
    var contents;
    stylOpts.includePaths = uniq(toArray(stylOpts.includePaths).concat([PACKAGE_PATH, PACKAGE_STYL_PATH]));
    stylOpts.paths = uniq(toArray(stylOpts.paths).concat(stylOpts.includePaths));
    if (typeof stylOpts.data !== "undefined") {
        contents = stylOpts.data;
    }
    else {
        if (!stylOpts.filename) {
            stylOpts.filename = stylOpts.file;
        }
        contents = fs.readFileSync(stylOpts.file, "utf8");
    }
    stylOpts.use = normalizeUsePlugins(stylOpts.use, stylOpts.pluginPaths, stylOpts.filename);
    delete stylOpts.pluginPaths;
    return {
        contents: contents.toString("utf-8"),
        options: stylOpts,
    };
};
var renderWithStylus = function (styl, contents, stylOpts) {
    var renderer;
    var css;
    var deps;
    if (typeof styl === "function") {
        renderer = styl(contents, stylOpts);
        css = renderer.render();
        deps = renderer.deps ? renderer.deps() : [];
    }
    else if (styl && typeof styl.render === "function") {
        css = styl.render(contents, stylOpts);
        deps = styl.deps ? styl.deps(stylOpts.filename) : [];
    }
    else {
        throw new Error("trueOptions.styl must be a Stylus renderer or render-capable object");
    }
    return {
        css: css,
        deps: toArray(deps),
    };
};
var renderStyl = function (stylOptions, trueOptions) {
    var trueOpts = Object.assign({}, trueOptions);
    var prepared = prepareStylusOptions(stylOptions || {});
    var rendered;
    var result;
    var styl;
    if (trueOpts.styl) {
        styl = trueOpts.styl;
    }
    else {
        styl = stylus;
    }
    rendered = renderWithStylus(styl, prepared.contents, prepared.options);
    result = {
        css: rendered.css,
        modules: parse(rendered.css, trueOpts.contextLines),
        deps: rendered.deps,
    };
    if (trueOpts.onDeps) {
        trueOpts.onDeps(result.deps, result);
    }
    return result;
};
var runStyl = function (stylOptions, trueOptions) {
    var trueOpts = Object.assign({}, trueOptions);
    var result = renderStyl(stylOptions, trueOpts);
    result.modules.forEach(function (module) {
        describeModule(module, trueOpts.describe, trueOpts.it);
    });
    return result;
};
var formatFailureMessage = function (assertion) {
    var msg = assertion.description + " [type: " + assertion.assertionType + "]";
    if (assertion.details) {
        msg = msg + " -- " + assertion.details;
    }
    var output = assertion.output || "";
    if (assertion.assertionType === "contains-string" && assertion.expected) {
        var expectedStrings = assertion.expected.split("\n");
        if (expectedStrings.length > 1) {
            var missingStrings = expectedStrings.filter(function (expected) {
                return output.indexOf(expected) === -1;
            });
            if (missingStrings.length) {
                msg += "\n\nExpected output to contain all of the following strings:\n";
                expectedStrings.forEach(function (expected) {
                    var found = output.indexOf(expected) !== -1;
                    msg += "  " + (found ? "✓" : "✗") + ' "' + expected + '"\n';
                });
                msg += "\nActual output:\n" + output + "\n";
                return msg;
            }
        }
    }
    if (assertion.assertionType === "contains" && assertion.expected) {
        var expectedBlocks = assertion.expected.split("\n---\n");
        if (expectedBlocks.length > 1) {
            var missingBlocks = expectedBlocks.filter(function (expected) {
                return !contains(output, expected);
            });
            if (missingBlocks.length) {
                msg +=
                    "\n\nExpected output to contain all of the following CSS blocks:\n";
                expectedBlocks.forEach(function (expected, index) {
                    var found = contains(output, expected);
                    msg += "  " + (found ? "✓" : "✗") + " Block " + (index + 1) + ":\n";
                    msg +=
                        expected
                            .split("\n")
                            .map(function (line) {
                            return "    " + line;
                        })
                            .join("\n") + "\n";
                });
                msg += "\nActual output:\n" + output + "\n";
                return msg;
            }
        }
    }
    msg +=
        "\n\n" +
            (0, diff_1.diffStringsUnified)(assertion.expected || "", assertion.output || "", diffOptions) +
            "\n";
    return msg;
};
var describeModule = function (module, describe = function () { }, it = function () { }) {
    var assert = require("assert");
    describe(module.module, function () {
        (module.modules || []).forEach(function (submodule) {
            describeModule(submodule, describe, it);
        });
        (module.tests || []).forEach(function (test) {
            it(test.test, function () {
                test.assertions.forEach(function (assertion) {
                    if (!assertion.passed) {
                        assert.fail(formatFailureMessage(assertion));
                    }
                });
            });
        });
    });
};
var parse = function (rawCss, contextLines) {
    var resolvedContextLines = typeof contextLines === "undefined" ? 10 : contextLines;
    var lines = rawCss.split(/\r?\n/);
    var stringifyRules = function (rules) {
        return stringifyNodes(rules || []);
    };
    var outputModeName = function (token) {
        if (token === EXPECTED_START_TOKEN) {
            return "expect";
        }
        if (token === CONTAINED_START_TOKEN) {
            return "contains";
        }
        if (token === CONTAINS_STRING_START_TOKEN) {
            return "contains-string";
        }
        return token;
    };
    var isOutputModeToken = function (token) {
        return (token === EXPECTED_START_TOKEN ||
            token === CONTAINED_START_TOKEN ||
            token === CONTAINS_STRING_START_TOKEN);
    };
    var isOutputMarkerToken = function (token) {
        return OUTPUT_MARKERS.indexOf(token) !== -1;
    };
    var unexpectedOutputMarkerError = function (token, pos) {
        return parseError('Unexpected output assertion marker "' + token + '" outside assert()', "ASSERT", pos);
    };
    var mixedOutputModeError = function (currentMode, nextToken, pos) {
        return parseError('Cannot mix output assertion modes in one assert(): found "' +
            outputModeName(nextToken) +
            '()" after "' +
            currentMode +
            '()". Split them into separate assert() blocks.', "END_ASSERT", pos);
    };
    var clearStaleStructuredSkips = function (ctx, text) {
        if (ctx.skipLegacyModuleEnd && text !== END_MODULE_TOKEN) {
            delete ctx.skipLegacyModuleEnd;
        }
        if (ctx.skipLegacyModuleName && !startsWith(text, MODULE_TOKEN)) {
            delete ctx.skipLegacyModuleName;
        }
        if (ctx.skipLegacyTestName && !startsWith(text, TEST_TOKEN)) {
            delete ctx.skipLegacyTestName;
        }
    };
    var parseCss = function () {
        var ast = postcss.parse(rawCss, { from: undefined });
        var ctx = {
            modules: [],
            moduleStack: [],
            useModuleBoundaries: rawCss.indexOf(END_MODULE_TOKEN) !== -1 ||
                rawCss.indexOf(TRUE_MODULE_START_TOKEN) !== -1,
            useStructuredMarkers: rawCss.indexOf(TRUE_MODULE_START_TOKEN) !== -1 ||
                rawCss.indexOf(TRUE_TEST_START_TOKEN) !== -1,
            parseError: parseError,
        };
        var handler = parseModule;
        (ast.nodes || []).forEach(function (rule) {
            handler = handler(rule, ctx);
        });
        var seeking = eofExpectation(handler);
        if (seeking) {
            throw new Error("Unexpected end of CSS; looking for " + seeking + ".");
        }
        validateStructuredEof(ctx);
        finishCurrentModule(ctx);
        return ctx.modules;
    };
    var parseError = function (msg, seeking, pos) {
        var start = pos || {};
        var line = start.line || 1;
        var column = start.column || 1;
        var errorMsg = "Line " +
            line +
            ", " +
            "column " +
            column +
            ": " +
            msg +
            "; " +
            "looking for " +
            seeking +
            ".\n" +
            "-- Context --\n" +
            lines.slice(Math.max(0, line - resolvedContextLines), line).join("\n") +
            "\n" +
            " ".repeat(column - 1) +
            "^\n";
        return new Error(errorMsg);
    };
    var parseModule = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseModule;
            }
            clearStaleStructuredSkips(ctx, text);
            if (startsWith(text, TRUE_MODULE_START_TOKEN)) {
                startCurrentModule(markerValue(text, TRUE_MODULE_START_TOKEN), ctx, nodePosition(rule), true);
                ctx.skipLegacyModuleName = markerValue(text, TRUE_MODULE_START_TOKEN);
                return parseTest;
            }
            if (startsWith(text, TRUE_MODULE_END_TOKEN)) {
                finishCurrentModule(ctx, nodePosition(rule), markerValue(text, TRUE_MODULE_END_TOKEN));
                ctx.skipLegacyModuleEnd = true;
                return currentModule(ctx) ? parseTest : parseModule;
            }
            if (startsWith(text, TRUE_TEST_START_TOKEN)) {
                throw parseError('Unexpected test start marker "' + text + '" outside module', "module", nodePosition(rule));
            }
            if (startsWith(text, TRUE_TEST_END_TOKEN)) {
                throw parseError('Unexpected test end marker "' + text + '" outside module', "module", nodePosition(rule));
            }
            if (text === END_MODULE_TOKEN) {
                if (ctx.skipLegacyModuleEnd) {
                    delete ctx.skipLegacyModuleEnd;
                    return currentModule(ctx) ? parseTest : parseModule;
                }
                finishCurrentModule(ctx, nodePosition(rule));
                return currentModule(ctx) ? parseTest : parseModule;
            }
            if (startsWith(text, MODULE_TOKEN)) {
                if (ctx.skipLegacyModuleName === text.substring(MODULE_TOKEN.length)) {
                    delete ctx.skipLegacyModuleName;
                    return parseTest;
                }
                startCurrentModule(text.substring(MODULE_TOKEN.length), ctx);
                return parseTest;
            }
            if (startsWith(text, SUMMARY_TOKEN)) {
                return ignoreUntilEndSummary;
            }
            if (isOutputMarkerToken(text)) {
                throw unexpectedOutputMarkerError(text, nodePosition(rule));
            }
            // ignore un-recognized comments, keep looking for module header.
            return parseModule;
        }
        // ignore other rule types
        return parseModule;
    };
    var ignoreUntilEndSummary = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (startsWith(text, END_SUMMARY_TOKEN)) {
                return parseModule;
            }
            return ignoreUntilEndSummary;
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "end summary", nodePosition(rule));
    };
    var parseTest = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseTest;
            }
            clearStaleStructuredSkips(ctx, text);
            if (text.match(/^-+$/)) {
                return parseTest;
            }
            if (startsWith(text, TRUE_MODULE_START_TOKEN)) {
                startCurrentModule(markerValue(text, TRUE_MODULE_START_TOKEN), ctx, nodePosition(rule), true);
                ctx.skipLegacyModuleName = markerValue(text, TRUE_MODULE_START_TOKEN);
                return parseTest;
            }
            if (startsWith(text, TRUE_MODULE_END_TOKEN)) {
                finishCurrentModule(ctx, nodePosition(rule), markerValue(text, TRUE_MODULE_END_TOKEN));
                ctx.skipLegacyModuleEnd = true;
                return currentModule(ctx) ? parseTest : parseModule;
            }
            if (startsWith(text, TRUE_TEST_START_TOKEN)) {
                startCurrentTest(markerValue(text, TRUE_TEST_START_TOKEN), ctx, nodePosition(rule));
                ctx.skipLegacyTestName = markerValue(text, TRUE_TEST_START_TOKEN);
                return parseAssertion;
            }
            if (startsWith(text, TRUE_TEST_END_TOKEN)) {
                finishCurrentTest(ctx, nodePosition(rule), markerValue(text, TRUE_TEST_END_TOKEN));
                return parseTest;
            }
            if (text === END_MODULE_TOKEN) {
                if (ctx.skipLegacyModuleEnd) {
                    delete ctx.skipLegacyModuleEnd;
                    return currentModule(ctx) ? parseTest : parseModule;
                }
                finishCurrentModule(ctx, nodePosition(rule));
                return currentModule(ctx) ? parseTest : parseModule;
            }
            if (startsWith(text, TEST_TOKEN)) {
                if (ctx.skipLegacyTestName === text.substring(TEST_TOKEN.length)) {
                    delete ctx.skipLegacyTestName;
                    return parseAssertion;
                }
                startCurrentTest(text.substring(TEST_TOKEN.length), ctx);
                return parseAssertion;
            }
            if (isOutputMarkerToken(text)) {
                throw unexpectedOutputMarkerError(text, nodePosition(rule));
            }
            return parseModule(rule, ctx);
        }
        // ignore other rule types
        return parseModule;
    };
    var parseAssertion = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trimLeft();
            if (!text) {
                return parseAssertion;
            }
            clearStaleStructuredSkips(ctx, text);
            if (startsWith(text, PASS_TOKEN)) {
                finishCurrentAssertion(ctx);
                ctx.currentAssertion = {
                    description: text.substring(PASS_TOKEN.length).trim() || "<no description>",
                    passed: true,
                };
                return parseAssertion;
            }
            else if (startsWith(text, FAIL_TOKEN)) {
                finishCurrentAssertion(ctx);
                var endAssertionType = text.indexOf(END_FAIL_TOKEN);
                ctx.currentAssertion = {
                    description: text.substring(endAssertionType + 2).trim(),
                    passed: false,
                    assertionType: text
                        .substring(FAIL_TOKEN.length, endAssertionType)
                        .trim(),
                };
                return parseFailureDetail;
            }
            else if (startsWith(text, ASSERT_TOKEN)) {
                finishCurrentAssertion(ctx);
                var description = text.substring(ASSERT_TOKEN.length).trim();
                ctx.currentAssertion = {
                    description: description || ctx.currentTest.test,
                    assertionType: "equal",
                };
                return parseAssertionOutputStart;
            }
            return parseTest(rule, ctx);
        }
        // ignore other rule types
        return parseModule;
    };
    var parseFailureDetail = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (startsWith(text, FAILURE_DETAIL_TOKEN)) {
                var detail = text.substring(FAILURE_DETAIL_TOKEN.length);
                var outputOrExpected;
                if (startsWith(detail, OUTPUT_TOKEN)) {
                    outputOrExpected = "output";
                }
                else if (startsWith(detail, EXPECTED_TOKEN)) {
                    outputOrExpected = "expected";
                }
                if (outputOrExpected) {
                    var startType = text.indexOf(FAILURE_TYPE_START_TOKEN);
                    var endType = text.indexOf(FAILURE_TYPE_END_TOKEN);
                    var type = text.substring(startType, endType + 1);
                    var content = text.substring(endType + 2);
                    ctx.currentAssertion[outputOrExpected] = type + " " + content;
                    return parseFailureDetail;
                }
                var splitAt = detail.indexOf(DETAILS_SEPARATOR_TOKEN);
                if (splitAt !== -1) {
                    var key = detail.substring(0, splitAt);
                    var value = detail.substring(splitAt + DETAILS_SEPARATOR_TOKEN.length);
                    ctx.currentAssertion[key.toLowerCase()] = value;
                    return parseFailureDetail;
                }
            }
            return parseAssertion(rule, ctx);
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "output/expected", nodePosition(rule));
    };
    var parseAssertionOutputStart = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseAssertionOutputStart;
            }
            if (text === OUTPUT_START_TOKEN) {
                ctx.currentOutputRules = [];
                return parseAssertionOutput;
            }
            throw parseError('Unexpected comment "' + text + '"', "OUTPUT", nodePosition(rule));
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "OUTPUT", nodePosition(rule));
    };
    var parseAssertionOutput = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (text === OUTPUT_END_TOKEN) {
                ctx.currentAssertion.output = stringifyRules(ctx.currentOutputRules);
                delete ctx.currentOutputRules;
                return parseAssertionExpectedStart;
            }
            if (isOutputMarkerToken(text)) {
                throw parseError('Unexpected output assertion marker "' + text + '"', OUTPUT_END_TOKEN, nodePosition(rule));
            }
        }
        ctx.currentOutputRules.push(rule);
        return parseAssertionOutput;
    };
    var parseAssertionExpectedStart = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseAssertionExpectedStart;
            }
            if (text === EXPECTED_START_TOKEN) {
                ctx.currentExpectedRules = [];
                return parseAssertionExpected;
            }
            if (text === CONTAINED_START_TOKEN) {
                ctx.currentExpectedContained = [];
                ctx.currentExpectedRules = [];
                return parseAssertionContained;
            }
            if (text === CONTAINS_STRING_START_TOKEN) {
                ctx.currentExpectedStrings = [];
                ctx.currentExpectedRules = [];
                return parseAssertionContainsString;
            }
            throw parseError('Unexpected comment "' + text + '"', "EXPECTED", nodePosition(rule));
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "EXPECTED", nodePosition(rule));
    };
    var parseAssertionExpected = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (text === EXPECTED_END_TOKEN) {
                ctx.currentAssertion.expected = stringifyRules(ctx.currentExpectedRules);
                delete ctx.currentExpectedRules;
                ctx.currentAssertion.passed =
                    ctx.currentAssertion.output === ctx.currentAssertion.expected;
                return parseEndAssertion;
            }
            if (isOutputMarkerToken(text)) {
                throw parseError('Unexpected output assertion marker "' + text + '"', EXPECTED_END_TOKEN, nodePosition(rule));
            }
        }
        ctx.currentExpectedRules.push(rule);
        return parseAssertionExpected;
    };
    var parseEndAssertion = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseEndAssertion;
            }
            if (text === ASSERT_END_TOKEN) {
                finishCurrentAssertion(ctx);
                return parseAssertion;
            }
            if (isOutputModeToken(text)) {
                throw mixedOutputModeError("expect", text, nodePosition(rule));
            }
            throw parseError('Unexpected comment "' + text + '"', "END_ASSERT", nodePosition(rule));
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "END_ASSERT", nodePosition(rule));
    };
    var parseAssertionContained = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (text === CONTAINED_END_TOKEN) {
                ctx.currentExpectedContained.push(stringifyRules(ctx.currentExpectedRules));
                delete ctx.currentExpectedRules;
                return parseAssertionContainedEnd;
            }
            if (isOutputMarkerToken(text)) {
                throw parseError('Unexpected output assertion marker "' + text + '"', CONTAINED_END_TOKEN, nodePosition(rule));
            }
        }
        ctx.currentExpectedRules.push(rule);
        return parseAssertionContained;
    };
    var parseAssertionContainedEnd = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseAssertionContainedEnd;
            }
            if (text === CONTAINED_START_TOKEN) {
                ctx.currentExpectedRules = [];
                return parseAssertionContained;
            }
            if (text === EXPECTED_START_TOKEN ||
                text === CONTAINS_STRING_START_TOKEN) {
                throw mixedOutputModeError("contains", text, nodePosition(rule));
            }
            if (text === ASSERT_END_TOKEN) {
                ctx.currentAssertion.assertionType = "contains";
                ctx.currentAssertion.expected =
                    ctx.currentExpectedContained.join("\n---\n");
                ctx.currentAssertion.passed = ctx.currentExpectedContained.every(function (expected) {
                    return contains(ctx.currentAssertion.output || "", expected);
                });
                delete ctx.currentExpectedContained;
                finishCurrentAssertion(ctx);
                return parseAssertion;
            }
            throw parseError('Unexpected comment "' + text + '"', "CONTAINED or END_ASSERT", nodePosition(rule));
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "CONTAINED or END_ASSERT", nodePosition(rule));
    };
    var parseAssertionContainsString = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (text === CONTAINS_STRING_END_TOKEN) {
                var expectedString = stringifyRules(ctx.currentExpectedRules)
                    .replace(new RegExp("^/\\*"), "")
                    .replace(new RegExp("\\*/$"), "")
                    .trim();
                ctx.currentExpectedStrings.push(expectedString);
                delete ctx.currentExpectedRules;
                return parseAssertionContainsStringEnd;
            }
            if (isOutputMarkerToken(text)) {
                throw parseError('Unexpected output assertion marker "' + text + '"', CONTAINS_STRING_END_TOKEN, nodePosition(rule));
            }
        }
        ctx.currentExpectedRules.push(rule);
        return parseAssertionContainsString;
    };
    var parseAssertionContainsStringEnd = function (rule, ctx) {
        if (rule.type === "comment") {
            var text = rule.text.trim();
            if (!text) {
                return parseAssertionContainsStringEnd;
            }
            if (text === CONTAINS_STRING_START_TOKEN) {
                ctx.currentExpectedRules = [];
                return parseAssertionContainsString;
            }
            if (text === EXPECTED_START_TOKEN || text === CONTAINED_START_TOKEN) {
                throw mixedOutputModeError("contains-string", text, nodePosition(rule));
            }
            if (text === ASSERT_END_TOKEN) {
                ctx.currentAssertion.assertionType = "contains-string";
                ctx.currentAssertion.expected = ctx.currentExpectedStrings.join("\n");
                ctx.currentAssertion.passed = ctx.currentExpectedStrings.every(function (expected) {
                    return ((ctx.currentAssertion.output || "").indexOf(expected) !== -1);
                });
                delete ctx.currentExpectedStrings;
                finishCurrentAssertion(ctx);
                return parseAssertion;
            }
            throw parseError('Unexpected comment "' + text + '"', "CONTAINS_STRING or END_ASSERT", nodePosition(rule));
        }
        throw parseError('Unexpected rule type "' + rule.type + '"', "CONTAINS_STRING or END_ASSERT", nodePosition(rule));
    };
    var eofExpectation = function (handler) {
        if (handler === parseAssertionOutputStart) {
            return OUTPUT_START_TOKEN;
        }
        if (handler === parseAssertionOutput) {
            return OUTPUT_END_TOKEN;
        }
        if (handler === parseAssertionExpectedStart) {
            return "EXPECTED, CONTAINED, or CONTAINS_STRING";
        }
        if (handler === parseAssertionExpected) {
            return EXPECTED_END_TOKEN;
        }
        if (handler === parseEndAssertion) {
            return ASSERT_END_TOKEN;
        }
        if (handler === parseAssertionContained) {
            return CONTAINED_END_TOKEN;
        }
        if (handler === parseAssertionContainedEnd) {
            return ASSERT_END_TOKEN;
        }
        if (handler === parseAssertionContainsString) {
            return CONTAINS_STRING_END_TOKEN;
        }
        if (handler === parseAssertionContainsStringEnd) {
            return ASSERT_END_TOKEN;
        }
    };
    return parseCss();
};
var contains = function (output, expected) {
    var outputNodes = parseCssNodes(output);
    var expectedNodes = parseCssNodes(expected);
    return expectedNodes.every(function (expectedNode) {
        return outputNodes.some(function (outputNode) {
            return nodeContains(outputNode, expectedNode);
        });
    });
};
var parseCssNodes = function (cssString) {
    return postcss.parse(cssString || "", { from: undefined }).nodes || [];
};
var nodePosition = function (node) {
    return node && node.source && node.source.start
        ? node.source.start
        : { line: 1, column: 1 };
};
var stringifyNodes = function (nodes) {
    return renderNodes(nodes || [], 0)
        .replace(/\r\n/g, "\n")
        .trim();
};
var renderNodes = function (nodes, level) {
    var rendered = [];
    (nodes || []).forEach(function (node) {
        var css = renderNode(node, level);
        if (css) {
            rendered.push({
                css: css,
                node: node,
            });
        }
    });
    return rendered
        .map(function (item, index) {
        var separator = "";
        if (index > 0) {
            separator =
                item.node.type === "decl" && rendered[index - 1].node.type === "decl"
                    ? "\n"
                    : "\n\n";
        }
        return separator + item.css;
    })
        .join("");
};
var renderNode = function (node, level) {
    var indent = "  ".repeat(level);
    if (node.type === "comment") {
        return indent + "/* " + node.text.trim() + " */";
    }
    if (node.type === "decl") {
        return (indent +
            node.prop +
            ": " +
            normalizeValue(node.value) +
            (node.important ? " !important" : "") +
            ";");
    }
    if (node.type === "rule") {
        return renderContainer(node.selector, node.nodes, level);
    }
    if (node.type === "atrule") {
        var name = "@" + node.name + (node.params ? " " + node.params : "");
        if (node.nodes) {
            return renderContainer(name, node.nodes, level);
        }
        return indent + name + ";";
    }
};
var renderContainer = function (name, nodes, level) {
    var indent = "  ".repeat(level);
    return (indent +
        name +
        " {\n" +
        renderNodes(nodes || [], level + 1) +
        "\n" +
        indent +
        "}");
};
var nodeContains = function (outputNode, expectedNode) {
    if (!outputNode || !expectedNode || outputNode.type !== expectedNode.type) {
        return false;
    }
    if (expectedNode.type === "comment") {
        var outputComment = outputNode;
        var expectedComment = expectedNode;
        return outputComment.text.trim() === expectedComment.text.trim();
    }
    if (expectedNode.type === "decl") {
        return declarationsEqual(outputNode, expectedNode);
    }
    if (expectedNode.type === "rule") {
        var outputRule = outputNode;
        var expectedRule = expectedNode;
        return (normalizeSpace(outputRule.selector) ===
            normalizeSpace(expectedRule.selector) &&
            childNodesContain(outputRule.nodes, expectedRule.nodes));
    }
    if (expectedNode.type === "atrule") {
        var outputAtRule = outputNode;
        var expectedAtRule = expectedNode;
        if (outputAtRule.name.toLowerCase() !== expectedAtRule.name.toLowerCase() ||
            normalizeSpace(outputAtRule.params) !==
                normalizeSpace(expectedAtRule.params)) {
            return false;
        }
        if (expectedAtRule.nodes) {
            return (Boolean(outputAtRule.nodes) &&
                childNodesContain(outputAtRule.nodes, expectedAtRule.nodes));
        }
        return (!outputAtRule.nodes &&
            stringifyNodes([outputAtRule]) === stringifyNodes([expectedAtRule]));
    }
    return stringifyNodes([outputNode]) === stringifyNodes([expectedNode]);
};
var childNodesContain = function (outputNodes, expectedNodes) {
    outputNodes = outputNodes || [];
    expectedNodes = expectedNodes || [];
    return expectedNodes.every(function (expectedNode) {
        return outputNodes.some(function (outputNode) {
            return nodeContains(outputNode, expectedNode);
        });
    });
};
var declarationsEqual = function (outputNode, expectedNode) {
    return (outputNode.prop === expectedNode.prop &&
        normalizeValue(outputNode.value) === normalizeValue(expectedNode.value) &&
        Boolean(outputNode.important) === Boolean(expectedNode.important));
};
var normalizeSpace = function (value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
};
var normalizeValue = function (value) {
    return String(value || "")
        .replace(/\r\n/g, "\n")
        .trim();
};
var validateStructuredEof = function (ctx) {
    if (!ctx.useStructuredMarkers) {
        return;
    }
    if (ctx.currentTest) {
        throw new Error("Unexpected end of CSS; looking for " +
            TRUE_TEST_END_TOKEN +
            ctx.currentTest.test +
            ".");
    }
    if (ctx.moduleStack.length) {
        throw new Error("Unexpected end of CSS; looking for " +
            TRUE_MODULE_END_TOKEN +
            currentModule(ctx).module +
            ".");
    }
};
var currentModule = function (ctx) {
    if (ctx.useModuleBoundaries) {
        return lastItem(ctx.moduleStack);
    }
    return ctx.currentModule;
};
var markerValue = function (text, token) {
    return text.substring(token.length).trim();
};
var startCurrentModule = function (name, ctx, pos, structured) {
    if (structured && ctx.currentTest) {
        throw ctx.parseError('Unexpected module start marker "' +
            TRUE_MODULE_START_TOKEN +
            name +
            '" before test end marker', TRUE_TEST_END_TOKEN + ctx.currentTest.test, pos);
    }
    finishCurrentTest(ctx);
    var module = {
        module: name,
        tests: [],
    };
    if (ctx.useModuleBoundaries) {
        var parent = currentModule(ctx);
        if (parent) {
            if (!parent.modules) {
                parent.modules = [];
            }
            parent.modules.push(module);
        }
        else {
            ctx.modules.push(module);
        }
        ctx.moduleStack.push(module);
    }
    else {
        finishCurrentModule(ctx);
        ctx.currentModule = module;
    }
};
var finishCurrentModule = function (ctx, pos, expectedName) {
    if (expectedName && ctx.currentTest) {
        throw ctx.parseError('Unexpected module end marker "' +
            TRUE_MODULE_END_TOKEN +
            expectedName +
            '" before test end marker', TRUE_TEST_END_TOKEN.trim(), pos);
    }
    finishCurrentTest(ctx);
    if (ctx.useModuleBoundaries) {
        if (pos && !currentModule(ctx)) {
            throw ctx.parseError('Unexpected module end marker "' +
                (expectedName
                    ? TRUE_MODULE_END_TOKEN + expectedName
                    : END_MODULE_TOKEN) +
                '"', "module", pos);
        }
        var openModule = currentModule(ctx);
        if (expectedName && openModule.module !== expectedName) {
            throw ctx.parseError('Mismatched module end marker "' +
                expectedName +
                '"; expected "' +
                openModule.module +
                '"', TRUE_MODULE_END_TOKEN + openModule.module, pos);
        }
        if (pos) {
            ctx.moduleStack.pop();
        }
        else {
            while (ctx.moduleStack.length) {
                ctx.moduleStack.pop();
            }
        }
        return;
    }
    if (ctx.currentModule) {
        var path = ctx.currentModule.module.split(MODULE_NESTING_TOKEN);
        ctx.currentModule.module = lastItem(path) || "";
        insertModule(path, ctx.currentModule, ctx);
        delete ctx.currentModule;
    }
};
var startCurrentTest = function (name, ctx, pos) {
    if (!currentModule(ctx)) {
        throw ctx.parseError('Unexpected test start marker "' + TRUE_TEST_START_TOKEN + name + '"', "module", pos);
    }
    if (pos && ctx.currentTest) {
        throw ctx.parseError('Unexpected test start marker "' +
            TRUE_TEST_START_TOKEN +
            name +
            '" before test end marker', TRUE_TEST_END_TOKEN + ctx.currentTest.test, pos);
    }
    finishCurrentTest(ctx);
    ctx.currentTest = {
        test: name,
        assertions: [],
    };
};
var finishCurrentTest = function (ctx, pos, expectedName) {
    finishCurrentAssertion(ctx);
    if (expectedName && !ctx.currentTest) {
        throw ctx.parseError('Unexpected test end marker "' + TRUE_TEST_END_TOKEN + expectedName + '"', "test", pos);
    }
    if (expectedName &&
        ctx.currentTest &&
        ctx.currentTest.test !== expectedName) {
        throw ctx.parseError('Mismatched test end marker "' +
            expectedName +
            '"; expected "' +
            ctx.currentTest.test +
            '"', TRUE_TEST_END_TOKEN + ctx.currentTest.test, pos);
    }
    if (ctx.currentTest) {
        currentModule(ctx).tests.push(ctx.currentTest);
        delete ctx.currentTest;
    }
};
var finishCurrentAssertion = function (ctx) {
    if (ctx.currentAssertion) {
        ctx.currentTest.assertions.push(ctx.currentAssertion);
        delete ctx.currentAssertion;
    }
};
var insertModule = function (path, module, ctx) {
    if (!ctx.modules) {
        ctx.modules = [];
    }
    if (path.length > 1) {
        var newCtx = ctx.modules.find(function (module) {
            return module.module === path[0];
        });
        if (!newCtx) {
            newCtx = {
                module: path[0] || "",
            };
            ctx.modules.push(newCtx);
        }
        insertModule(path.slice(1), module, newCtx);
    }
    else {
        ctx.modules.push(module);
    }
};
var startsWith = function (text, token) {
    return text === token.trim() || text.substring(0, token.length) === token;
};
const api = {
    runStyl: runStyl,
    renderStyl: renderStyl,
    formatFailureMessage: formatFailureMessage,
    parse: parse,
};
module.exports = api;
