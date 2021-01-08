import fs from 'fs';
import { isMainThread } from 'worker_threads';

import ResultsStore from './results-store';
import {
    CACHE_LOCATION,
    RESULTS_COMPARE_DIR,
    RESULTS_LOCATION,
    URL,
} from './file-constants';
import {
    RESULT_PARSER_TO_TEMPLATE,
    RESULT_PARSER_TO_EXTENSION,
    ResultTemplateOptions,
} from './result-templates';
import config from '@config';
import { LintMessage } from '@engine/types';

export const RESULT_TEMPLATE = RESULT_PARSER_TO_TEMPLATE[config.resultParser];
const RESULT_EXTENSION = RESULT_PARSER_TO_EXTENSION[config.resultParser];
const RESULTS_COMPARE_PATH = `${RESULTS_LOCATION}/${RESULTS_COMPARE_DIR}`;

/**
 * Prepare results directory before scan
 * - Should be ran once from the main thread
 * - Clear previous results from result directory's root
 * - Clear previous comparison results from comparison directory
 */
export function prepareResultsDirectory(): void {
    if (!isMainThread) return;

    if (fs.existsSync(RESULTS_LOCATION)) {
        // Clear previous results, excluding possible comparison directory
        fs.readdirSync(RESULTS_LOCATION)
            .filter(name => name !== RESULTS_COMPARE_DIR)
            .forEach(name => fs.unlinkSync(`${RESULTS_LOCATION}/${name}`));
    } else {
        fs.mkdirSync(RESULTS_LOCATION);
    }

    if (fs.existsSync(RESULTS_COMPARE_PATH)) {
        // Clear previous comparison results
        fs.readdirSync(RESULTS_COMPARE_PATH).forEach(name =>
            fs.unlinkSync(`${RESULTS_COMPARE_PATH}/${name}`)
        );
    } else {
        fs.mkdirSync(RESULTS_COMPARE_PATH);
    }
}

function parseMessages(messages: LintMessage[]): ResultTemplateOptions[] {
    return messages.map(result => {
        const path = result.path.replace(`${CACHE_LOCATION}/`, '');
        const extension = path.split('.').pop();
        const lines = result.line
            ? `#L${result.line}${result.endLine ? `-L${result.endLine}` : ''}`
            : '';

        const [repositoryOwner, repository, ...pathParts] = path.split('/');
        const filePath = pathParts.join('/') + lines;
        const postfix = filePath ? `/blob/HEAD/${filePath}` : '';

        return {
            repository,
            repositoryOwner,
            rule: result.ruleId,
            message: result.message,
            path,
            link: `${URL}/${repositoryOwner}/${repository}${postfix}`,
            extension,
            source: result.source,
            error: result.error,
        };
    });
}

/**
 * Write results to file at `./eslint-remote-tester-results`
 */
export function writeResults(
    messages: LintMessage[],
    repository: string
): void {
    // Don't write empty files for completely valid results
    if (!messages.length) {
        return;
    }

    const results = parseMessages(messages);
    ResultsStore.addResults(...results);

    if (!config.CI) {
        // Construct result file name, e.g. mui-org_material-ui.md
        const repositoryOwnerAndName = repository.split('/').join('_');
        const fileName = `${repositoryOwnerAndName}${RESULT_EXTENSION}`;
        const formattedResults = results.map(RESULT_TEMPLATE).join('\n');

        fs.writeFileSync(
            `${RESULTS_LOCATION}/${fileName}`,
            formattedResults,
            'utf8'
        );
    }
}
