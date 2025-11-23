import { program } from 'commander';
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

// Environment variables
const KINTONE_DOMAIN = process.env.KINTONE_DOMAIN || '';
const KINTONE_API_TOKEN = process.env.KINTONE_API_TOKEN || '';
const KINTONE_APP_ID = process.env.KINTONE_APP_ID || '1';
const BRANCH_NAME = process.env.BRANCH_NAME || '';
const PR_TITLE = process.env.PR_TITLE || '';
const PR_STATUS = process.env.PR_STATUS || '';
const PR_URL = process.env.PR_URL || '';
const FILES_CHANGED = process.env.FILES_CHANGED || '';

// Kintone field codes
const FIELD_BRANCH_NAME = 'branch_name';
const FIELD_TITLE = 'title';
const FIELD_STATUS = 'status';
const FIELD_PR = 'pr';
const FIELD_FILES_CHANGED = 'files_changed';

// Initialize Kintone client
const client = new KintoneRestAPIClient({
    baseUrl: `https://${KINTONE_DOMAIN}`,
    auth: { apiToken: KINTONE_API_TOKEN },
});

interface RenovateRecord {
    branch_name: { value: string };
    title: { value: string };
    status: { value: string };
    pr: { value: string };
    files_changed: { value: string };
}

interface KintoneRecord extends RenovateRecord {
    $id: { value: string };
    $revision: { value: string };
}

interface PRInfo {
    number: number;
    branch: string;
    title: string;
    url: string;
    files: string;
    state: string;
}

/**
 * Search for existing record by branch name
 */
async function findRecordByBranch(
    branchName: string
): Promise<KintoneRecord | null> {
    const query = `${FIELD_BRANCH_NAME} = "${branchName}"`;

    try {
        const response = await client.record.getRecords({
            app: KINTONE_APP_ID,
            query: query,
        });

        if (response.records && response.records.length > 0) {
            return response.records[0] as unknown as KintoneRecord;
        }

        return null;
    } catch (error) {
        console.error('Error searching for record:', error);
        throw error;
    }
}

/**
 * Create new record in Kintone
 */
async function createRecord(
    branchName: string,
    title: string,
    status: string,
    prUrl: string,
    filesChanged: string
): Promise<string> {
    const record: Record<string, { value: string }> = {
        [FIELD_BRANCH_NAME]: { value: branchName },
        [FIELD_TITLE]: { value: title },
        [FIELD_STATUS]: { value: status },
        [FIELD_PR]: { value: prUrl },
        [FIELD_FILES_CHANGED]: { value: filesChanged },
    };

    try {
        const response = await client.record.addRecord({
            app: KINTONE_APP_ID,
            record: record,
        });

        return response.id;
    } catch (error) {
        console.error('Error creating record:', error);
        throw error;
    }
}

/**
 * Update existing record in Kintone
 */
async function updateRecord(
    recordId: string,
    status: string,
    title?: string,
    prUrl?: string,
    filesChanged?: string
): Promise<string> {
    const record: Record<string, { value: string }> = {
        [FIELD_STATUS]: { value: status },
    };

    if (title) {
        record[FIELD_TITLE] = { value: title };
    }
    if (prUrl) {
        record[FIELD_PR] = { value: prUrl };
    }
    if (filesChanged) {
        record[FIELD_FILES_CHANGED] = { value: filesChanged };
    }

    try {
        await client.record.updateRecord({
            app: KINTONE_APP_ID,
            id: recordId,
            record: record,
        });

        return recordId;
    } catch (error) {
        console.error('Error updating record:', error);
        throw error;
    }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
    if (!KINTONE_DOMAIN || !KINTONE_API_TOKEN) {
        throw new Error('KINTONE_DOMAIN and KINTONE_API_TOKEN are required');
    }

    if (!BRANCH_NAME || !PR_TITLE || !PR_STATUS) {
        throw new Error('BRANCH_NAME, PR_TITLE, and PR_STATUS are required');
    }

    console.log('Processing Kintone notification...');
    console.log(`Domain: ${KINTONE_DOMAIN}`);
    console.log(`App ID: ${KINTONE_APP_ID}`);
    console.log(`Branch: ${BRANCH_NAME}`);
    console.log(`Title: ${PR_TITLE}`);
    console.log(`Status: ${PR_STATUS}`);
    console.log(`PR URL: ${PR_URL}`);
    console.log(`Files Changed: ${FILES_CHANGED ? FILES_CHANGED.split('\n').length + ' files' : 'N/A'}`);

    try {
        const existingRecord = await findRecordByBranch(BRANCH_NAME);

        if (existingRecord) {
            console.log(
                `Found existing record: ${existingRecord.$id.value}`
            );
            await updateRecord(
                existingRecord.$id.value,
                PR_STATUS,
                PR_TITLE,
                PR_URL,
                FILES_CHANGED
            );
        } else {
            console.log('Creating new record...');
            await createRecord(BRANCH_NAME, PR_TITLE, PR_STATUS, PR_URL, FILES_CHANGED);
        }

        process.exit(0);
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Error:', error.message);
        } else {
            console.error('❌ Unknown error:', error);
        }
        process.exit(1);
    }
}

/**
 * Reconcile: Sync all PRs from JSON list
 */
async function reconcile(): Promise<void> {
    if (!KINTONE_DOMAIN || !KINTONE_API_TOKEN) {
        throw new Error('KINTONE_DOMAIN and KINTONE_API_TOKEN are required');
    }

    const PR_LIST_JSON = process.env.PR_LIST_JSON || '[]';

    console.log('Starting reconciliation: Syncing all open Renovate PRs to Kintone');

    let prList: PRInfo[];
    try {
        prList = JSON.parse(PR_LIST_JSON);
    } catch (error) {
        throw new Error('Invalid PR_LIST_JSON format');
    }

    if (prList.length === 0) {
        console.log('No Renovate PRs to sync');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < prList.length; i++) {
        const pr = prList[i];
        console.log(`[${i + 1}/${prList.length}] Processing PR: ${pr.branch}`);

        try {
            const existingRecord = await findRecordByBranch(pr.branch);

            if (existingRecord) {
                console.log(`  Record already exists (current status: ${existingRecord.status.value}), skipping...`);
            } else {
                console.log(`  Creating new record with status: ${pr.state}`);
                await createRecord(pr.branch, pr.title, pr.state, pr.url, pr.files);
            }

            successCount++;
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : error}`);
            failCount++;
        }

        if (i < prList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    console.log('Reconciliation completed\n');
    console.log(`Success: ${successCount}, Failed: ${failCount}`);
}

program
    .command('reconcile')
    .description('Sync all open Renovate PRs to Kintone')
    .action(reconcile);

// Command line setup
program.description('Notify Kintone app about Renovate PR').action(main);

// Execute if run directly
if (require.main === module) {
    program.parse(process.argv);
}

export { findRecordByBranch, createRecord, updateRecord, reconcile };
