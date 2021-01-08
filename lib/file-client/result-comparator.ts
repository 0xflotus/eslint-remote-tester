import fs from 'fs';

import { RESULT_COMPARISON_CACHE_LOCATION } from './file-constants';
import { ResultTemplateOptions } from './result-templates';

export function writeComparisonResults(results: ResultTemplateOptions[]): void {
    readComparisonCache();

    // TODO Compare results

    // Write new cache with current results
    writeComparisonCache(results);
}

function readComparisonCache(): ResultTemplateOptions[] {
    if (!fs.existsSync(RESULT_COMPARISON_CACHE_LOCATION)) {
        return [];
    }

    const cache = fs.readFileSync(RESULT_COMPARISON_CACHE_LOCATION, 'utf8');

    return JSON.parse(cache);
}

function writeComparisonCache(results: ResultTemplateOptions[]): void {
    if (fs.existsSync(RESULT_COMPARISON_CACHE_LOCATION)) {
        fs.unlinkSync(RESULT_COMPARISON_CACHE_LOCATION);
    }

    fs.writeFileSync(
        RESULT_COMPARISON_CACHE_LOCATION,
        JSON.stringify(results),
        'utf8'
    );
}
