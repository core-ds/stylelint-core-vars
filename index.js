const stylelint = require('stylelint');
const { findOldVars } = require('./utils');
const toOneLine = require('./utils').toOneLine;
const findVars = require('./utils').findVars;
const colorsSet = require('./utils').colorsSet;
const findTypographyMixins = require('./utils').findTypographyMixins;
const VARS_AVAILABLE = require('./utils').VARS_AVAILABLE;

const RULE_USE_VARS = 'stylelint-core-vars/use-vars';
const RULE_USE_ONE_OF_VARS = 'stylelint-core-vars/use-one-of-vars';
const RULE_USE_MIXINS = 'stylelint-core-vars/use-mixins';
const RULE_USE_ONE_OF_MIXINS = 'stylelint-core-vars/use-one-of-mixins';
const RULE_DO_NOT_USE_DARK_COLORS = 'stylelint-core-vars/do-not-use-dark-colors';
const RULE_DO_NOT_USE_OLD_VARS = 'stylelint-core-vars/do-not-use-old-vars';

const messages = {
    [RULE_USE_VARS]: stylelint.utils.ruleMessages(RULE_USE_VARS, {
        expected: (variable, value) => {
            return `Use variable 'var(${variable})' instead of plain value '${value}'`;
        },
    }),
    [RULE_USE_ONE_OF_VARS]: stylelint.utils.ruleMessages(RULE_USE_ONE_OF_VARS, {
        expected: (variables, value) => {
            const variablesPart = variables.map((v) => `var(${v})`).join('\n');

            return `Use variables instead of plain value '${value}':\n${variablesPart}\n`;
        },
    }),
    [RULE_DO_NOT_USE_OLD_VARS]: stylelint.utils.ruleMessages(RULE_DO_NOT_USE_OLD_VARS, {
        expected: (variables, value, fixable = true) => {
            if (!variables.length) return `Ask you designer how to replace old token '${value}'`;

            const startMsg = fixable ? 'Use' : 'Cant find proper token, but you can use';

            if (variables.length === 1) {
                return `${startMsg} variable 'var(${variables[0]})' instead of old '${value}'`;
            }

            const variablesPart = variables.map((v) => `var(${v})`).join('\n');

            return `${startMsg} one of new variables instead of old '${value}':\n${variablesPart}\n`;
        },
    }),
    [RULE_USE_MIXINS]: stylelint.utils.ruleMessages(RULE_USE_MIXINS, {
        expected: (mixin) => {
            return `Use mixin '${mixin.name}' instead of plain values`;
        },
    }),
    [RULE_USE_ONE_OF_MIXINS]: stylelint.utils.ruleMessages(RULE_USE_ONE_OF_MIXINS, {
        expected: (mixins) => {
            const mixinsPart = mixins
                .map(({ name, props }) => `${name} (${Object.values(props).join('|')})`)
                .join('\n');
            return `Use mixins instead of plain values:\n${mixinsPart}\n`;
        },
    }),
    [RULE_DO_NOT_USE_DARK_COLORS]: stylelint.utils.ruleMessages(RULE_DO_NOT_USE_DARK_COLORS, {
        expected: () => {
            return 'Do not use dark colors directly. Only light and static colors are allowed';
        },
    }),
};

const checkVars = (decl, result, context, ruleName, matcher, shouldReport, options = {}) => {
    const { prop, raws } = decl;

    let value = toOneLine(decl.value);
    let substitution;

    const previousValues = [];

    while ((substitution = matcher(value, prop, options))) {
        let fixed = false;

        value = value.replace(substitution.value, substitution.fixedValue);

        if (context.fix && substitution.fixable) {
            decl.value = value;
            fixed = true;
        }

        const originalValueIndex = previousValues.reduce(
            (acc, sub) => (acc > sub.index + sub.diff ? acc - sub.diff : acc),
            substitution.index
        );

        if (shouldReport(substitution.fixable, fixed)) {
            stylelint.utils.report({
                result,
                ruleName,
                message: messages[ruleName].expected(
                    substitution.variables,
                    substitution.value,
                    substitution.fixable
                ),
                node: decl,
                word: value,
                index: originalValueIndex + prop.length + raws.between.length,
            });
        }

        previousValues.unshift({
            ...substitution,
            diff: substitution.fixedValue.length - substitution.value.length,
        });
    }
};

const checkTypography = (rule, result, context, ruleName) => {
    const typographyProps = rule.nodes.reduce((acc, node) => {
        if (['font-size', 'line-height', 'font-weight'].includes(node.prop)) {
            acc[node.prop] = node.value;
        }
        return acc;
    }, {});

    const hasTypography = 'font-size' in typographyProps;
    if (!hasTypography) return;

    const mixins = findTypographyMixins(typographyProps);

    if (!mixins || !mixins.length) return;

    const exactMixin = mixins.length === 1;

    let fixed = false;
    if (context.fix && exactMixin) {
        fixed = true;
        const { name, props } = mixins[0];

        const before = rule.nodes[0].raws.before;
        rule.walkDecls((decl) => {
            if (decl.prop in props) {
                decl.remove();
            }
        });

        rule.prepend(`${before}@mixin ${name};\n`);
    }

    const shouldReport =
        !fixed &&
        ((ruleName === RULE_USE_ONE_OF_MIXINS && !exactMixin) ||
            (ruleName === RULE_USE_MIXINS && exactMixin));

    if (shouldReport) {
        stylelint.utils.report({
            result,
            ruleName,
            message: messages[ruleName].expected(mixins),
            node: rule,
            word: 'font-size',
            index: 0,
        });
    }
};

const checkDarkColorsUsage = (decl, result, context, ruleName) => {
    const { prop, raws } = decl;

    let value = toOneLine(decl.value);

    const matches = /--color-dark-[\w-]+/.exec(value);

    if (matches && colorsSet.has(matches[0])) {
        stylelint.utils.report({
            result,
            ruleName: RULE_DO_NOT_USE_DARK_COLORS,
            message: messages[RULE_DO_NOT_USE_DARK_COLORS].expected(),
            node: decl,
            word: value,
            index: prop.length + raws.between.length + decl.value.indexOf(matches[0]),
        });
    }
};

module.exports = [
    stylelint.createPlugin(RULE_USE_VARS, (enabled, config, context) => {
        if (!enabled || !VARS_AVAILABLE) {
            return () => {};
        }

        const allowNumericValues = config?.allowNumericValues || false;

        return (root, result) => {
            root.walkDecls((decl) => {
                checkVars(
                    decl,
                    result,
                    context,
                    RULE_USE_VARS,
                    findVars,
                    (fixable, fixed) => fixable && !fixed,
                    { allowNumericValues }
                );
            });
        };
    }),
    stylelint.createPlugin(RULE_USE_ONE_OF_VARS, (enabled, config, context) => {
        if (!enabled || !VARS_AVAILABLE) {
            return () => {};
        }

        const allowNumericValues = config?.allowNumericValues || false;

        return (root, result) => {
            root.walkDecls((decl) => {
                checkVars(
                    decl,
                    result,
                    context,
                    RULE_USE_ONE_OF_VARS,
                    findVars,
                    (fixable, fixed) => !fixable && !fixed,
                    { allowNumericValues }
                );
            });
        };
    }),
    stylelint.createPlugin(RULE_DO_NOT_USE_OLD_VARS, (enabled, _, context) => {
        if (!enabled || !VARS_AVAILABLE) {
            return () => {};
        }

        return (root, result) => {
            root.walkDecls((decl) => {
                checkVars(
                    decl,
                    result,
                    context,
                    RULE_DO_NOT_USE_OLD_VARS,
                    findOldVars,
                    (_, fixed) => !fixed
                );
            });
        };
    }),
    stylelint.createPlugin(RULE_USE_MIXINS, (enabled, _, context) => {
        if (!enabled || !VARS_AVAILABLE) {
            return () => {};
        }

        return (root, result) => {
            root.walkRules((rule) => {
                checkTypography(rule, result, context, RULE_USE_MIXINS);
            });
        };
    }),
    stylelint.createPlugin(RULE_USE_ONE_OF_MIXINS, (enabled, _, context) => {
        if (!enabled || !VARS_AVAILABLE) {
            return () => {};
        }

        return (root, result) => {
            root.walkRules((rule) => {
                checkTypography(rule, result, context, RULE_USE_ONE_OF_MIXINS);
            });
        };
    }),
    stylelint.createPlugin(RULE_DO_NOT_USE_DARK_COLORS, (enabled, _, context) => {
        if (!enabled || !VARS_AVAILABLE) {
            return () => {};
        }

        return (root, result) => {
            root.walkDecls((decl) => {
                checkDarkColorsUsage(decl, result, context);
            });
        };
    }),
];

module.exports.messages = messages;
module.exports.RULE_USE_VARS = RULE_USE_VARS;
module.exports.RULE_USE_ONE_OF_VARS = RULE_USE_ONE_OF_VARS;
module.exports.RULE_USE_MIXINS = RULE_USE_MIXINS;
module.exports.RULE_USE_ONE_OF_MIXINS = RULE_USE_ONE_OF_MIXINS;
module.exports.RULE_DO_NOT_USE_DARK_COLORS = RULE_DO_NOT_USE_DARK_COLORS;
module.exports.RULE_DO_NOT_USE_OLD_VARS = RULE_DO_NOT_USE_OLD_VARS;
