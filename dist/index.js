const core = require('@actions/core');

try {
  const dirsToScan = core.getInput('dirs_to_scan');
  const openaiApiKey = core.getInput('openai_api_key');
  const openaiModelTypeInference = core.getInput('openai_model_type_inference');
  const openaiModelTypeEmbedding = core.getInput('openai_model_type_embedding');
  const cloudProvider = core.getInput('cloud_provider');
  const apiKeyId = core.getInput('api_key_id');
  const apiKeySecret = core.getInput('api_key_secret');

  // Check required parameters
  if (!dirsToScan) {
    throw new Error('dirs_to_scan is required');
  }
  if (!openaiApiKey) {
    throw new Error('openai_api_key is required');
  }
  if (!apiKeyId) {
    throw new Error('api_key_id is required');
  }
  if (!apiKeySecret) {
    throw new Error('api_key_secret is required');
  }
  
  console.log(`Directories to scan: ${dirsToScan}`);
  console.log(`OpenAI API Key: ${openaiApiKey.substring(0, 5)}...`); // Only log the first 5 characters for security
  console.log(`OpenAI Model Type Inference: ${openaiModelTypeInference}`);
  console.log(`OpenAI Model Type Embedding: ${openaiModelTypeEmbedding}`);
  console.log(`Cloud Provider: ${cloudProvider}`);
  console.log(`API Key ID: ${apiKeyId}`);
  console.log(`API Key Secret: ${apiKeySecret.substring(0, 5)}...`); // Only log the first 5 characters for security
} catch (error) {
  core.setFailed(error.message);
}
