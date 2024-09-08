import { handleScalewayProvider } from './scaleway';

const providers = {
    scaleway: handleScalewayProvider,
};

export async function handleProvider(cloudProvider, inputs, parIngestSecret) {
    if (!providers[cloudProvider]) {
        throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
    }
    return providers[cloudProvider](inputs, parIngestSecret);
}
