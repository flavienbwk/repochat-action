import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as core from '@actions/core';
import { Container, createClient } from '@scaleway/sdk';

const providers = ['scaleway'];

function isValidFile(filePath) {
  return fs.statSync(filePath).isFile() && !path.basename(filePath).startsWith('.');
}

async function sendFileToApi(filePath, apiUrl) {
  const content = fs.readFileSync(filePath, { encoding: 'base64' });
  const metadata = { 'source': path.basename(filePath) };
  const payload = { 'content': content, 'metadata': metadata };

  try {
    print(`Sending to: ${apiUrl}`);
    const response = await axios.post(apiUrl, payload, { headers: { 'Content-Type': 'application/json' } });
    return response;
  } catch (error) {
    console.error(`Error sending file: ${error.message}`);
    return { status: error.response ? error.response.status : 500 };
  }
}

async function ingestFiles(directoryPath, apiUrl, excludeFiles = []) {
  if (!fs.existsSync(directoryPath)) {
    console.error(`Error: ${directoryPath} does not exist.`);
    return;
  }

  const stats = fs.statSync(directoryPath);
  if (stats.isFile()) {
    if (isValidFile(directoryPath) && !isExcluded(directoryPath, excludeFiles)) {
      await processFile(directoryPath, apiUrl);
    }
    return;
  }

  if (!stats.isDirectory()) {
    console.error(`Error: ${directoryPath} is not a valid directory or file.`);
    return;
  }

  const files = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(directoryPath, file.name);
    if (file.isDirectory()) {
      await ingestFiles(filePath, apiUrl, excludeFiles);
    } else if (isValidFile(filePath) && !isExcluded(filePath, excludeFiles)) {
      await processFile(filePath, apiUrl);
    } else {
      console.log(`Skipping invalid, hidden, or excluded file: ${filePath}`);
    }
  }
}

function isExcluded(filePath, excludeFiles) {
  return excludeFiles.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(filePath);
  });
}

async function processFile(filePath, apiUrl) {
  console.log(`Sending file: ${filePath}`);
  const response = await sendFileToApi(filePath, apiUrl);
  if (response.status === 200) {
    console.log(`Successfully ingested: ${filePath}`);
  } else {
    console.log(`Failed to ingest ${filePath}. Status code: ${response.status}`);
  }
}

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

    let namespace;
    try {
      namespace = await containerApi.createNamespace({
        name: containerNamespace,
        description: 'Namespace for GitHub Action',
      });
      console.log('Namespace created:', namespace.id);
    } catch (error) {
      if (error.status && error.status === 409) {
        console.log('Namespace already exists, retrieving existing namespace');
        const namespaces = await containerApi.listNamespaces();
        namespace = namespaces.namespaces.find(ns => ns.name === containerNamespace);
        console.log('Retrieved existing namespace:', namespace.id);
      } else {
        console.error('Error creating/retrieving namespace:', error);
        core.setFailed(error.message);
      }
    }

    const containerConfig = {
      name: containerName,
      namespaceId: namespace.id,
      registryImage: containerImage,
      port: 80,
      cpuLimit: 1000,
      memoryLimit: 1024,
      minScale: 1,  // will loose ingested data if rebooted
      maxScale: 1,
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
      let container;
      try {
        // Try to create the container
        container = await containerApi.createContainer(containerConfig);
        console.log('Container created:', container.id);
      } catch (error) {
        if (error.status && error.status === 409) {
          console.log('Container already exists, retrieving existing container');
          const containers = await containerApi.listContainers({ namespaceId: namespace.id });
          container = containers.containers.find(c => c.name === containerName);
          console.log('Retrieved existing container:', container.id);

          // Update the existing container with new configuration
          container = await containerApi.updateContainer({
            containerId: container.id,
            ...containerConfig
          });
          console.log('Container updated:', container.id);
        } else {
          core.setFailed(error.message);
        }
      }

      // Deploy the container
      const deployedContainer = await containerApi.deployContainer({
        containerId: container.id,
      });
      console.log('Container deployed:', deployedContainer.id);
      console.log('Deployed at:', deployedContainer.domainName);

      // Now, retrieve container's endpoint, wait until it's ready with a timeout
      let containerEndpoint;
      try {
        containerEndpoint = await new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 120000; // 2 minutes timeout
          const interval = setInterval(async () => {
            try {
              // Update container variable with current status
              const _container = await containerApi.getContainer({ containerId: container.id });
              console.log('Checking container status every 5 seconds...', _container.status);
              if (_container.status === 'ready') {
                clearInterval(interval);
                resolve(_container.domainName);
              }
              if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error('Container deployment timed out after 1 minute'));
              }
            } catch (error) {
              clearInterval(interval);
              reject(error);
            }
          }, 5000);
        });
        console.log('Container endpoint ready!', containerEndpoint);
      } catch (error) {
        console.error('Error while waiting for container endpoint:', error);
        core.setFailed(`Action failed: ${error.message}`);
      }

      // Feed RepoChat with repo data
      const containerEndpointApi = 'https://' + containerEndpoint + '/api/ingest';
      console.log(`Ingesting files or directory: ${containerEndpointApi}...`);
      const dirsToScanArray = dirsToScan.split(',').map(dir => dir.trim());
      for (const dir of dirsToScanArray) {
        console.log(`Ingesting files inside ${dir}...`);
        ingestFiles(dir, containerEndpointApi, ['node_modules', '.git', '.env', 'package-lock.json']);
      }

      // Set outputs
      core.setOutput('domain', containerEndpoint);
    } catch (error) {
      console.error('Error deploying container:', error);
    }

  }

} catch (error) {
  core.setFailed(error.message);
}
