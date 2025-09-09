import fs from 'node:fs';
import path from 'node:path';
import oldNewMap from './old-new-map.js';
import { getPackagesSync } from '@manypkg/get-packages';
import postcss from 'postcss';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packages = getPackagesSync(process.cwd()).packages;
const CORE_COMPONENTS_PACKAGE = '@alfalab/core-components';
const CORE_COMPONENTS_VARS_PACKAGE = '@alfalab/core-components-vars';
const TYPOGRAPHY_PROPS = ['font-size', 'line-height', 'font-weight'];

export const vars = {
    gaps: loadVars('gaps.css'),
    shadows: loadVars('shadows-indigo.css'),
    colors: loadVars('colors-indigo.css'),
    borderRadiuses: loadVars('border-radius.css'),
};

export const colorsSet = Object.values(vars.colors).reduce((acc, vars) => {
    vars.forEach((colorVar) => acc.add(colorVar));

    return acc;
}, new Set());

export const mixins = {
    typography: loadMixins('typography.css'),
};

const varsByProperties = {
    padding: vars.gaps,
    'padding-top': vars.gaps,
    'padding-right': vars.gaps,
    'padding-bottom': vars.gaps,
    'padding-left': vars.gaps,
    margin: vars.gaps,
    'margin-top': vars.gaps,
    'margin-right': vars.gaps,
    'margin-bottom': vars.gaps,
    'margin-left': vars.gaps,
    'box-shadow': vars.shadows,
    color: vars.colors,
    fill: vars.colors,
    background: vars.colors,
    'background-color': vars.colors,
    border: vars.colors,
    'border-top': vars.colors,
    'border-right': vars.colors,
    'border-bottom': vars.colors,
    'border-left': vars.colors,
    'border-radius': vars.borderRadiuses,
    'border-top-left-radius': vars.borderRadiuses,
    'border-top-right-radius': vars.borderRadiuses,
    'border-bottom-left-radius': vars.borderRadiuses,
    'border-bottom-right-radius': vars.borderRadiuses,
};

export const VARS_AVAILABLE = isCoreComponentsMonorepo() || isVarsPackagedInstalled();

function isCoreComponentsMonorepo() {
    return packages.some(({ packageJson: { name } }) => name === CORE_COMPONENTS_PACKAGE);
}

function isVarsPackagedInstalled() {
    function resolveVarsPackage() {
        try {
            require.resolve(`${CORE_COMPONENTS_VARS_PACKAGE}/package.json`);
            return true;
        } catch (e) {
            return false;
        }
    }

    try {
        const rootPkg = require.resolve(`${CORE_COMPONENTS_PACKAGE}/package.json`);
        const [coreComponentsVersion] = rootPkg.version.split('.');

        if (parseInt(coreComponentsVersion) >= 49) {
            return resolveVarsPackage();
        }

        return true;
    } catch (e) {
        return resolveVarsPackage();
    }
}

function resolveVarsFile(file) {
    let filepath;

    if (isCoreComponentsMonorepo()) {
        const pkg = packages.find((pkg) => pkg.packageJson.name === CORE_COMPONENTS_VARS_PACKAGE);

        filepath = path.join(pkg.dir, 'src', file);
    } else {
        try {
            filepath = require.resolve(`${CORE_COMPONENTS_VARS_PACKAGE}/${file}`);
        } catch {
            filepath = require.resolve(`${CORE_COMPONENTS_PACKAGE}/vars/${file}`);
        }
    }

    return filepath;
}

function loadVars(file) {
    const result = {};

    if (isCoreComponentsMonorepo() || isVarsPackagedInstalled()) {
        const filepath = resolveVarsFile(file);
        const content = fs.readFileSync(filepath, { encoding: 'utf8' });
        const root = postcss.parse(content, { from: filepath });

        root.walkDecls((decl) => {
            (result[toOneLine(decl.value)] ||= []).push(decl.prop);
        });
    } else {
        console.error('Add @alfalab/core-components to project dependencies');
    }

    return result;
}

function loadMixins(file) {
    const result = {};

    if (isCoreComponentsMonorepo() || isVarsPackagedInstalled()) {
        const filepath = resolveVarsFile(file);
        const content = fs.readFileSync(filepath, { encoding: 'utf8' });
        const root = postcss.parse(content, { from: filepath });

        root.walkAtRules('define-mixin', (atRule) => {
            const params = atRule.params.split(/\s/);
            const name = params[0];

            if (
                name.startsWith('system_') ||
                name.startsWith('styrene_') ||
                name.startsWith('legacy_')
            ) {
                return;
            }

            const decls = {};

            atRule.walkDecls((decl) => {
                decls[decl.prop] = decl.value;
            });

            result[name] = decls;
        });
    } else {
        console.error('Add @alfalab/core-components to project dependencies');
    }

    return result;
}

function formatVar(variable) {
    return variable.startsWith('var(') ? variable : `var(${variable})`;
}

/**
 * @param {string} str
 * @param {string} substr
 * @param {string} [sep]
 * @param {number} [pos]
 */
function findSubstring(str, substr, sep = ' ', pos = 0) {
    for (
        let index = str.indexOf(substr, pos);
        index !== -1;
        index = str.indexOf(substr, index + substr.length)
    ) {
        if (
            (index === 0 || str.slice(index - sep.length, index) === sep) &&
            (index + substr.length === str.length ||
                str.slice(index + substr.length, index + substr.length + sep.length) === sep)
        ) {
            return index;
        }
    }

    return -1;
}

function getColorVariants(prop) {
    switch (prop) {
        case 'color':
            return ['text'];
        case 'background-color':
        case 'background':
            return ['bg', 'specialbg', 'graphic'];
        case 'border':
        case 'border-top':
        case 'border-right':
        case 'border-bottom':
        case 'border-left':
            return ['border', 'graphic', 'bg', 'specialbg'];
        default:
            return [];
    }
}

function choiceVars(variables, prop, group) {
    if (group === 'colors') {
        const variants = getColorVariants(prop);

        const condition = (variable) =>
            variants.some((variant) => variable.startsWith(`--color-light-${variant}`));

        return sortVarsByUsage(variables, variants).filter(condition);
    }

    return variables;
}

export function findVars(cssValue, prop, options) {
    const vars = varsByProperties[prop];
    if (!vars) return;

    const group = getVarsGroup(vars);

    if (group === 'gaps' || group === 'borderRadiuses') {
        if (options.allowNumericValues) {
            return;
        }
    }

    for (const [value, variables] of Object.entries(vars)) {
        const chosen = choiceVars(variables, prop, group);

        if (!chosen || !chosen.length) continue;

        const index = findSubstring(cssValue, value);

        if (index !== -1) {
            return {
                index,
                value,
                variables: chosen,
                fixedValue: formatVar(chosen[0]),
                fixable: chosen.length === 1,
            };
        }
    }
}

export function findOldVars(cssValue, prop) {
    const matches = /var\(([^\),]+)/g.exec(cssValue);

    if (matches) {
        const oldVar = matches[1];
        const replacements = oldNewMap[oldVar];
        if (!replacements) return;

        const variants = getColorVariants(prop);

        let variables = replacements.filter((r) => variants.some((v) => r.includes(v)));
        const fixable = variables.length === 1;

        if (!variables.length) {
            variables = replacements;
        }

        return {
            index: cssValue.indexOf(oldVar),
            value: oldVar,
            variables,
            fixedValue: variables.length ? variables[0] : 'NON_FIXABLE',
            fixable,
        };
    }
}

export function findTypographyMixins(ruleProps) {
    const findMixin = (exact) => {
        return Object.entries(mixins.typography)
            .filter(([_, mixinProps]) => {
                if (exact) {
                    return TYPOGRAPHY_PROPS.every((prop) => ruleProps[prop] === mixinProps[prop]);
                } else {
                    return TYPOGRAPHY_PROPS.every(
                        (prop) => !ruleProps[prop] || ruleProps[prop] === mixinProps[prop],
                    );
                }
            })
            .map(([name, props]) => ({ name, props }));
    };

    const exact = findMixin(true);
    if (exact.length) {
        return exact;
    } else {
        const mixins = findMixin(false);
        return mixins.length > 0 ? mixins : null;
    }
}

/**
 * @param {string} value
 * @returns
 */
export function toOneLine(value) {
    return value.replace(/\n/, '').replace(/ {2,}/, ' ');
}

function getVarsGroup(varsSet) {
    return Object.keys(vars).find((group) => vars[group] === varsSet);
}

function sortVarsByUsage(arr, sortingArr) {
    return [...arr].sort(function (a, b) {
        const aUsage = a.slice(2).split('-')[2];
        const bUsage = b.slice(2).split('-')[2];
        const aIndex = sortingArr.indexOf(aUsage);
        const bIndex = sortingArr.indexOf(bUsage);
        if (aIndex === -1 || bIndex === -1) return 0;
        return aIndex - bIndex;
    });
}
