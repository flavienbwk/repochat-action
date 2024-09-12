const core = require('@actions/core');
const { handleProvider } = require('./providers');
const { uuidv4 } = require('./utils/uuidUtils');
const { ingestFiles } = require('./utils/fileUtils');

try {
    const actionVersion = require('../package.json').version;
    console.log(`Action version: ${actionVersion}`);

    const dirsToScan = core.getInput('dirs_to_scan');
    const openaiApiKey = core.getInput('openai_api_key');
    const openaiModelTypeInference = core.getInput('openai_model_type_inference');
    const openaiModelTypeEmbedding = core.getInput('openai_model_type_embedding');
    const cloudProvider = core.getInput('provider_name');
    const providerKeyId = core.getInput('provider_key_id');
    const providerKeySecret = core.getInput('provider_key_secret');
    const providerProjectId = core.getInput('provider_project_id');
    const providerDefaultRegion = core.getInput('provider_default_region');
    const providerDefaultZone = core.getInput('provider_default_zone');
    const interfacePassword = core.getInput('interface_password');
    const pgConnectionString = core.getInput('pg_connection_string');
    const cpuLimit = core.getInput('cpu_limit');
    const memoryLimit = core.getInput('memory_limit');
    const minScale = core.getInput('min_scale');
    const maxScale = core.getInput('max_scale');
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
    if (!providerProjectId) {
        throw new Error('provider_project_id is required');
    }
    if (!providerDefaultRegion) {
        throw new Error('provider_default_region is required');
    }
    if (!providerDefaultZone) {
        throw new Error('provider_default_zone is required');
    }

    console.log(`Directories or files to scan: ${dirsToScan}`);
    console.log(`OpenAI API Key: ${openaiApiKey.substring(0, 5)}...`);
    console.log(`OpenAI Model Type Inference: ${openaiModelTypeInference}`);
    console.log(`OpenAI Model Type Embedding: ${openaiModelTypeEmbedding}`);
    console.log(`Cloud Provider: ${cloudProvider}`);
    console.log(`Provider Key ID: ${providerKeyId.substring(0, 3)}...`);
    console.log(`Provider Key Secret: ${providerKeySecret.substring(0, 5)}...`);
    console.log('pgConnectionString (nb chars):', pgConnectionString.length);
    console.log('CPU and Memory limits:', cpuLimit, memoryLimit);
    console.log('Min and Max scale:', minScale, maxScale);

    if (!pgConnectionString && (minScale !== '1' || maxScale !== '1')) {
        throw new Error('min_scale and max_scale must be 1 if the PostgreSQL connection is disabled (pg_connection_string). This is because the container is stateless. This means you will lose ingested data if the container restarts. Also, ingesting data with multiple containers will make only one of the X containers be filled with data. Others won\'t have their data replicated as it is a local DB (ChromaDB).');
    }

    const inputs = {
        actionVersion,
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
        pgConnectionString,
        cpuLimit,
        memoryLimit,
        minScale,
        maxScale,
        parIngestSecret
    };

    handleProvider(cloudProvider, inputs)
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
