import * as core from '@actions/core';
import { Container, createClient } from '@scaleway/sdk';

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
    console.log(`Provider Project ID: ${providerProjectId.substring(0, 4)}...`);
    console.log(`Provider Default Region: ${providerDefaultRegion}`);
    console.log(`Provider Default Zone: ${providerDefaultZone}`);

    const client = createClient({
      accessKey: providerKeyId,
      secretKey: providerKeySecret,
      defaultProjectId: providerProjectId,
      defaultRegion: providerDefaultRegion,
      defaultZone: providerDefaultZone,
    });

    const containerImage = "ghcr.io/flavienbwk/repochat-action:latest";
    const containerNamespace = `gh-action-${process.env.GITHUB_REPOSITORY.split('/')[1]}`;
    const containerName = `gh-action-${process.env.GITHUB_REPOSITORY.split('/')[1]}`;
    const containerApi = new Container.v1beta1.API(client);

    const containerConfig = {
      name: containerName,
      namespaceId: containerNamespace,
      registryImage: containerImage,
      port: 80,
      cpuLimit: 1000,
      memoryLimit: 1024,
      minScale: 0,
      maxScale: 5,
      description: 'Repochat Action repochat',
      environmentVariables: {
        OPENAI_API_KEY: openaiApiKey,
        MODEL_TYPE_INFERENCE: openaiModelTypeInference,
        MODEL_TYPE_EMBEDDING: openaiModelTypeEmbedding,
        REPO_NAME: process.env.GITHUB_REPOSITORY,
        REPO_URL: `https://github.com/${process.env.GITHUB_REPOSITORY}`,
        MODE: 'api'
      }
    };

    try {
      // Create the container
      const container = await containerApi.createContainer(containerConfig);
      console.log('Container created:', container);

      // Deploy the container
      const deployedContainer = await containerAPI.deployContainer({
        containerId: container.id,
      });
      console.log('Container deployed:', deployedContainer);
      console.log('Deployed at:', container.domainName);
    } catch (error) {
      console.error('Error deploying container:', error);
    }

  }


} catch (error) {
  core.setFailed(error.message);
}
