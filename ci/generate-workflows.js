const fs = require('fs');

const CONFIG_PATH = plugin => `./plugin-configs/${plugin}.config.js`;
const WORKFLOW_DIR = '../.github/workflows';
const WORKFLOW_PREFIX = 'lint-';
const WORKFLOW_PATH = plugin =>
    `${WORKFLOW_DIR}/${WORKFLOW_PREFIX}${plugin}.yml`;

// prettier-ignore
const WORKFLOW_TEMPLATE = ({ plugin, index }) =>
`# This file is auto-generated. See ci/generate-workflows.js
name: Lint ${plugin}

on:
  workflow_dispatch:
  schedule:
    # Every thursday at ${generateHours(index)}:00
    - cron: '0 ${generateHours(index)} * * THU'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v1
      with:
        node-version: 12.11
    - run: yarn install
    - run: yarn build
    - run: yarn install --no-lockfile
      working-directory: ./ci
    - run: "yarn lint --config ./plugin-configs/${plugin}.config.js"
      working-directory: ./ci
      env:
        CI: true
`;

function generateHours(index) {
    if (index > 23) {
        throw new Error(
            'generateHours does not support hours above 24. Not implemented'
        );
    }

    return `${index > 9 ? '' : '0'}${index}`;
}

function formatPluginName(plugin) {
    return plugin.replace(/\//g, '-').replace(/@/g, '');
}

function validateConfigsExist(plugins) {
    const missingConfigs = plugins.filter(
        plugin => !fs.existsSync(CONFIG_PATH(plugin))
    );

    if (missingConfigs.length) {
        throw new Error(
            `Missing configurations:\n${missingConfigs
                .map(CONFIG_PATH)
                .join('\n')}`
        );
    }
}

function cleanPreviousWorkflow() {
    const workflows = fs
        .readdirSync(WORKFLOW_DIR)
        .filter(w => w.startsWith(WORKFLOW_PREFIX));

    workflows.forEach(workflow => {
        const path = `${WORKFLOW_DIR}/${workflow}`;
        fs.unlinkSync(path);
        console.log(`Removed ${path}`);
    });
}

function generateWorkflows(plugins) {
    plugins.forEach((plugin, index) => {
        const path = WORKFLOW_PATH(plugin);
        fs.writeFileSync(path, WORKFLOW_TEMPLATE({ plugin, index }), 'utf8');

        console.log(`Generated ${path}`);
    });
}

const dependencies = Object.keys(require('./package.json').devDependencies);
const plugins = dependencies
    .filter(dep => /eslint-plugin/.test(dep))
    .map(formatPluginName);

// ESLint core rules, eslint:all
plugins.push('eslint-core');

validateConfigsExist(plugins);
cleanPreviousWorkflow(plugins);
generateWorkflows(plugins);