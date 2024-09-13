const { Container, createClient } = require('@scaleway/sdk');

module.exports.handleScalewayProvider = async function(inputs) {
    const {
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
    } = inputs;

    const client = createClient({
        accessKey: providerKeyId,
        secretKey: providerKeySecret,
        defaultProjectId: providerProjectId,
        defaultRegion: providerDefaultRegion,
        defaultZone: providerDefaultZone,
    });

    const containerImage = `ghcr.io/flavienbwk/repochat-action:${actionVersion}`;
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
            throw new Error(error.message);
        }
    }

    // Wait for namespace to be ready
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds in milliseconds
    while (namespace.status === 'pending') {
        console.log(`Waiting for namespace to be ready... ${namespace.status}`);
        if (Date.now() - startTime > timeout) {
            throw new Error('Namespace creation timed out after 60 seconds');
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
        const updatedNamespaces = await containerApi.listNamespaces();
        namespace = updatedNamespaces.namespaces.find(ns => ns.id === namespace.id);
    }
    if (namespace.status !== 'ready') {
        throw new Error(`Namespace creation failed. Status: ${namespace.status}`);
    }
    console.log('Namespace is ready');

    let listOfSecrets = [
        { key: 'OPENAI_API_KEY', value: openaiApiKey },
        { key: 'INGEST_SECRET', value: parIngestSecret }
    ];
    if (interfacePassword)
        listOfSecrets.push({ key: 'INTERFACE_PASSWORD', value: interfacePassword });
    if (pgConnectionString)
        listOfSecrets.push({ key: 'PG_CONNECTION_STRING', value: pgConnectionString });

    const containerConfig = {
        name: containerName,
        namespaceId: namespace.id,
        registryImage: containerImage,
        port: 80,
        cpuLimit: parseInt(cpuLimit),
        memoryLimit: parseInt(memoryLimit),
        minScale: parseInt(minScale),
        maxScale: parseInt(maxScale),
        description: 'Repochat Action repochat',
        environmentVariables: {
            MODEL_TYPE_INFERENCE: openaiModelTypeInference,
            MODEL_TYPE_EMBEDDING: openaiModelTypeEmbedding,
            REPO_NAME: process.env.GITHUB_REPOSITORY,
            REPO_URL: `https://github.com/${process.env.GITHUB_REPOSITORY}`,
            MODE: 'api'
        },
        secretEnvironmentVariables: listOfSecrets
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
                throw new Error(error.message);
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
                const timeout = 180000; // 3 minutes timeout
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
                            reject(new Error('Container deployment timed out after 2 minutes'));
                        }
                    } catch (error) {
                        clearInterval(interval);
                        reject(error);
                    }
                }, 5000);
            });
            console.log('Container endpoint ready!', containerEndpoint);
        } catch (error) {
            throw new Error(`Error while waiting for container endpoint: ${error.message}`);
        }

        // Wait for settings endpoint to be available
        const settingsEndpoint = 'https://' + containerEndpoint + '/api/settings';
        try {
            console.log('Checking settings endpoint...');
            const startTime = Date.now();
            const timeout = 60000; // 60 seconds timeout

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
                throw new Error('Settings endpoint check timed out after 30 seconds');
            }
        } catch (error) {
            throw new Error(`Failed to check settings endpoint: ${error.message}`);
        }

        return containerEndpoint;
    } catch (error) {
        throw new Error(`Error deploying container: ${error.message}`);
    }
}
