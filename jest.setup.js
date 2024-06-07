const { getTestRule, getTestRuleConfigs } = require('jest-preset-stylelint');
const plugins = [require('./')];

global.testRule = getTestRule({ plugins });
global.testRuleConfigs = getTestRuleConfigs({ plugins });
