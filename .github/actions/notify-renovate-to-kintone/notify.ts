import { program } from 'commander';
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

// Environment variables
const KINTONE_DOMAIN = process.env.KINTONE_DOMAIN || '';
const KINTONE_API_TOKEN = process.env.KINTONE_API_TOKEN || '';
const KINTONE_APP_ID = process.env.KINTONE_APP_ID || '1';
const BRANCH_NAME = process.env.BRANCH_NAME || '';
const PR_TITLE = process.env.PR_TITLE || '';
const PR_STATUS = process.env.PR_STATUS || '';
const RECORD_ID = process.env.RECORD_ID || '';

// Kintone field codes
const FIELD_BRANCH_NAME = 'branch_name';
const FIELD_TITLE = 'title';
const FIELD_STATUS = 'status';

// Initialize Kintone client
const client = new KintoneRestAPIClient({
    baseUrl: `https://${KINTONE_DOMAIN}`,
    auth: { apiToken: KINTONE_API_TOKEN },
});

interface RenovateRecord {
    branch_name: { value: string };
    title: { value: string };
    status: { value: string };
}

interface KintoneRecord extends RenovateRecord {
    $id: { value: string };
    $revision: { value: string };
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
    status: string
): Promise<string> {
    const record: Record<string, { value: string }> = {
        [FIELD_BRANCH_NAME]: { value: branchName },
        [FIELD_TITLE]: { value: title },
        [FIELD_STATUS]: { value: status },
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
async function updateRecord(recordId: string, status: string): Promise<string> {
    const record: Record<string, { value: string }> = {
        [FIELD_STATUS]: { value: status },
    };

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

    let recordId: string;

    try {
        // Check if record ID is provided (for direct updates)
        if (RECORD_ID) {
            console.log(`Updating existing record: ${RECORD_ID}`);
            recordId = await updateRecord(RECORD_ID, PR_STATUS);
        } else {
            // Search for existing record by branch name
            const existingRecord = await findRecordByBranch(BRANCH_NAME);

            if (existingRecord) {
                console.log(
                    `Found existing record: ${existingRecord.$id.value}`
                );
                recordId = await updateRecord(
                    existingRecord.$id.value,
                    PR_STATUS
                );
            } else {
                console.log('Creating new record...');
                recordId = await createRecord(BRANCH_NAME, PR_TITLE, PR_STATUS);
            }
        }

        console.log(`✅ Record ID: ${recordId}`);

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

// Command line interface setup
program.description('Notify Kintone app about Renovate PR').action(main);

// Execute if run directly
if (require.main === module) {
    program.parse(process.argv);
}

export { findRecordByBranch, createRecord, updateRecord };
