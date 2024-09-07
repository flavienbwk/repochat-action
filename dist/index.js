"use strict";
const core = require('@actions/core');

try {
  const openaiModelTypeInference = core.getInput('openai_model_type_inference');
  console.log(`OpenAI Model Type Inference: ${openaiModelTypeInference}`);
} catch (error) {
  core.setFailed(error.message);
}
