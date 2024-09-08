import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as core from '@actions/core';
import { Container, createClient, Secret } from '@scaleway/sdk';

const providers = ['scaleway'];

function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

function isValidFile(filePath) {
  return fs.statSync(filePath).isFile() && !path.basename(filePath).startsWith('.');
}

async function sendFileToApi(filePath, apiUrl, ingestSecret) {
  const content = fs.readFileSync(filePath, { encoding: 'base64' });
  const metadata = { 'source': path.basename(filePath) };
  const payload = { 'content': content, 'metadata': metadata };

  try {
    console.log(`Sending: ${filePath}`);
    const response = await axios.post(apiUrl, payload, { headers: { 'Content-Type': 'application/json', 'X-Ingest-Secret': ingestSecret } });
    return response;
  } catch (error) {
    console.error(`Error sending file: ${error.message}`);
    return { status: error.response ? error.response.status : 500 };
  }
}

function isExcluded(filePath, excludeFiles) {
  return excludeFiles.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(filePath);
  });
}

async function processFile(filePath, apiUrl, ingestSecret) {
  console.log(`Sending file: ${filePath}`);
  const response = await sendFileToApi(filePath, apiUrl, ingestSecret);
  if (response.status === 200) {
    console.log(`Successfully ingested: ${filePath}`);
  } else {
    console.log(`Failed to ingest ${filePath}. Status code: ${response.status}`);
  }
}

async function ingestFiles(directoryPath, apiUrl, ingestSecret, excludeFiles = []) {
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
      await ingestFiles(filePath, apiUrl, ingestSecret, excludeFiles);
    } else if (isValidFile(filePath) && !isExcluded(filePath, excludeFiles)) {
      await processFile(filePath, apiUrl, ingestSecret);
    } else {
      console.log(`Skipping invalid, hidden, or excluded file: ${filePath}`);
    }
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
    const containerNamespace = `gha-${process.env.GITHUB_REPOSITORY.split('/')[1]}`;
    const containerName = `gha-${process.env.GITHUB_REPOSITORY.split('/')[1]}`;
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

    // Wait for namespace to be ready
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds in milliseconds
    while (namespace.status === 'pending') {
      console.log(`Waiting for namespace to be ready... ${namespace.status}`);
      if (Date.now() - startTime > timeout) {
        core.setFailed('Namespace creation timed out after 60 seconds');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
      const updatedNamespaces = await containerApi.listNamespaces();
      namespace = updatedNamespaces.namespaces.find(ns => ns.id === namespace.id);
    }
    if (namespace.status !== 'ready') {
      core.setFailed(`Namespace creation failed. Status: ${namespace.status}`);
    }
    console.log('Namespace is ready');
    

    const openaiApiKeySecret = Secret({
      key: 'OPENAI_API_KEY',
      value: openaiApiKey
    })
    const parIngestSecretSecret = Secret({
      key: 'INGEST_SECRET',
      value: parIngestSecret
    })
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
        MODEL_TYPE_INFERENCE: openaiModelTypeInference,
        MODEL_TYPE_EMBEDDING: openaiModelTypeEmbedding,
        REPO_NAME: process.env.GITHUB_REPOSITORY,
        REPO_URL: `https://github.com/${process.env.GITHUB_REPOSITORY}`,
        MODE: 'api'
      },
      secretEnvironmentVariables: [
        openaiApiKeySecret,
        parIngestSecretSecret
      ]
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

      // Wait for settings endpoint to be available
      const settingsEndpoint = 'https://' + containerEndpoint + '/api/settings';
      try {
        console.log('Checking settings endpoint...');
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds timeout
        
        while (Date.now() - startTime < timeout) {
          try {
            const response = await fetch(settingsEndpoint, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
        
            if (response.ok) {
              const data = await response.json();
              console.log('Settings endpoint is available. Ready to ingest.');
              break;
            }
          } catch (error) {
            // Ignore errors and continue trying
          }
          
          // Wait for 1 second before the next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (Date.now() - startTime >= timeout) {
          core.setFailed('Settings endpoint check timed out after 15 seconds');
        }
      } catch (error) {
        console.error('Error checking settings endpoint:', error);
        core.setFailed(`Failed to check settings endpoint: ${error.message}`);
      }
      

      // Feed RepoChat with repo data
      const containerEndpointApi = 'https://' + containerEndpoint + '/api/ingest';
      const dirsToScanArray = dirsToScan.split(',').map(dir => dir.trim());
      for (const dir of dirsToScanArray) {
        console.log(`Ingesting files inside ${dir}...`);
        ingestFiles(dir, containerEndpointApi, parIngestSecret, ['node_modules', '.git', '.env', 'package-lock.json']);
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
