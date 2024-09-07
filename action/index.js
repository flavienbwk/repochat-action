const core = require('@actions/core');

const providers = ['scaleway'];

try {
  const dirsToScan = core.getInput('dirs_to_scan');
  const openaiApiKey = core.getInput('openai_api_key');
  const openaiModelTypeInference = core.getInput('openai_model_type_inference');
  const openaiModelTypeEmbedding = core.getInput('openai_model_type_embedding');
  const cloudProvider = core.getInput('cloud_provider');
  const apiKeyId = core.getInput('provider_key_id');
  const apiKeySecret = core.getInput('provider_key_secret');
  const providerProjectId = core.getInput('provider_project_id');
  const providerDefaultRegion = core.getInput('provider_default_region');
  const providerDefaultZone = core.getInput('provider_default_zone');

  // Check required parameters
  if (!dirsToScan) {
    throw new Error('dirs_to_scan is required');
  }
  if (!openaiApiKey) {
    throw new Error('openai_api_key is required');
  }
  if (!apiKeyId) {
    throw new Error('provider_key_id is required');
  }
  if (!apiKeySecret) {
    throw new Error('provider_key_secret is required');
  }
  
  console.log(`Directories to scan: ${dirsToScan}`);
  console.log(`OpenAI API Key: ${openaiApiKey.substring(0, 5)}...`); // Only log the first 5 characters for security
  console.log(`OpenAI Model Type Inference: ${openaiModelTypeInference}`);
  console.log(`OpenAI Model Type Embedding: ${openaiModelTypeEmbedding}`);
  console.log(`Cloud Provider: ${cloudProvider}`);
  console.log(`API Key ID: ${apiKeyId}`);
  console.log(`API Key Secret: ${apiKeySecret.substring(0, 5)}...`); // Only log the first 5 characters for security
  console.log(`Provider Project ID: ${providerProjectId}`);
  console.log(`Provider Default Region: ${providerDefaultRegion}`);
  console.log(`Provider Default Zone: ${providerDefaultZone}`);


  // Check if the provider is supported
  if (!providers.includes(cloudProvider)) {
    throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
  }

  // Initialize Scaleway API object if the provider is Scaleway
  if (cloudProvider === 'scaleway') {
    if (!providerProjectId) {
      throw new Error('provider_project_id is required');
    }
    if (!providerDefaultRegion) {
      throw new Error('provider_default_region is required');
    }
    if (!providerDefaultZone) {
      throw new Error('provider_default_zone is required');
    }

    const { createClient } = require('@scaleway/sdk');
    const client = createClient({
      accessKey: apiKeyId,
      secretKey: apiKeySecret,
      defaultProjectId: providerProjectId,
      defaultRegion: providerDefaultRegion,
      defaultZone: providerDefaultZone,
    });
    console.log('Scaleway API client initialized successfully');
  }
  

} catch (error) {
  core.setFailed(error.message);
}
