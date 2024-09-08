const { handleScalewayProvider } = require('./scaleway');

const providers = {
    scaleway: handleScalewayProvider,
};

module.exports.handleProvider = async function(cloudProvider, inputs, parIngestSecret) {
    if (!providers[cloudProvider]) {
        throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
    }
    return providers[cloudProvider](inputs, parIngestSecret);
}
