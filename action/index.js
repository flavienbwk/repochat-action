const core = require('@actions/core');
import { createClient } from '@scaleway/sdk';

const providers = ['scaleway'];

try {
  const dirsToScan = core.getInput('dirs_to_scan');
  const openaiApiKey = core.getInput('openai_api_key');
  const openaiModelTypeInference = core.getInput('openai_model_type_inference');
  const openaiModelTypeEmbedding = core.getInput('openai_model_type_embedding');
  const cloudProvider = core.getInput('cloud_provider');
  const providerKeyId = core.getInput('provider_key_id');
  const providerKeySecret = core.getInput('provider_key_secret');
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
  console.log(`Provider Project ID: ${providerProjectId.substring(0, 4)}...`);
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

    const client = createClient({
      accessKey: providerKeyId,
      secretKey: providerKeySecret,
      defaultProjectId: providerProjectId,
      defaultRegion: providerDefaultRegion,
      defaultZone: providerDefaultZone,
    });
    

    // Get the current repository name
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];

    // Create a Scaleway registry with "repochat-" prefix
    const registryName = `repochat-${repoName}`;
    console.log(`Creating Scaleway registry: ${registryName}`);

    const registry = new client.registry.v1.API();

    try {
      // Check if the registry already exists
      const { registries } = await registry.listNamespaces({ region: providerDefaultRegion });
      const existingRegistry = registries.find(r => r.name === registryName);

      if (!existingRegistry) {
        // Create the registry if it doesn't exist
        await registry.createNamespace({
          region: providerDefaultRegion,
          name: registryName,
          description: `Registry for ${repoName} RepoChatGPT`,
        });
        console.log(`Created Scaleway registry: ${registryName}`);
      } else {
        console.log(`Scaleway registry already exists: ${registryName}`);
      }
    } catch (error) {
      console.error(`Error creating/checking Scaleway registry: ${error.message}`);
      throw error;
    }


  }
  

} catch (error) {
  core.setFailed(error.message);
}
