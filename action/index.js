import * as core from '@actions/core';
import { handleProvider } from './providers';
import { uuidv4 } from './utils/uuidUtils';
import { ingestFiles } from './utils/fileUtils';

try {
    const dirsToScan = core.getInput('dirs_to_scan');
    const interfacePassword = core.getInput('interface_password');
    const openaiApiKey = core.getInput('openai_api_key');
    const openaiModelTypeInference = core.getInput('openai_model_type_inference');
    const openaiModelTypeEmbedding = core.getInput('openai_model_type_embedding');
    const cloudProvider = core.getInput('provider_name');
    const providerKeyId = core.getInput('provider_key_id');
    const providerKeySecret = core.getInput('provider_key_secret');
    const providerProjectId = core.getInput('provider_project_id');
    const providerDefaultRegion = core.getInput('provider_default_region');
    const providerDefaultZone = core.getInput('provider_default_zone');
    const parIngestSecret = uuidv4();

    // Check required parameters
    if (!dirsToScan) {
        throw new Error('dirs_to_scan is required');
    }
    if (!openaiApiKey) {
        throw new Error('openai_api_key is required');
    }
    if (!providerKeyId) {
        throw new Error('provider_key_id is required');
    }
    if (!providerKeySecret) {
        throw new Error('provider_key_secret is required');
    }

    console.log(`Directories to scan: ${dirsToScan}`);
    console.log(`OpenAI API Key: ${openaiApiKey.substring(0, 5)}...`);
    console.log(`OpenAI Model Type Inference: ${openaiModelTypeInference}`);
    console.log(`OpenAI Model Type Embedding: ${openaiModelTypeEmbedding}`);
    console.log(`Cloud Provider: ${cloudProvider}`);
    console.log(`Provider Key ID: ${providerKeyId.substring(0, 3)}...`);
    console.log(`Provider Key Secret: ${providerKeySecret.substring(0, 5)}...`);

    const inputs = {
        providerKeyId,
        providerKeySecret,
        providerProjectId,
        providerDefaultRegion,
        providerDefaultZone,
        openaiApiKey,
        openaiModelTypeInference,
        openaiModelTypeEmbedding,
        interfacePassword,
        dirsToScan,
    };

    handleProvider(cloudProvider, inputs, parIngestSecret)
        .then(containerEndpoint => {
            const containerEndpointApi = 'https://' + containerEndpoint + '/api/ingest';
            const dirsToScanArray = dirsToScan.split(',').map(dir => dir.trim());
            for (const dir of dirsToScanArray) {
                console.log(`Ingesting files inside ${dir}...`);
                ingestFiles(dir, containerEndpointApi, parIngestSecret, ['*node_modules', '*.git', '*.env', '*package-lock.json']);
            }

            // Set outputs
            core.setOutput('domain', containerEndpoint);
        })
        .catch(error => {
            core.setFailed(error.message);
        });

} catch (error) {
    core.setFailed(error.message);
}
