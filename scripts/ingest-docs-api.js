const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { program } = require('commander');

function isValidFile(filePath) {
  return fs.statSync(filePath).isFile() && !path.basename(filePath).startsWith('.');
}

async function sendFileToApi(filePath, apiUrl, ingestSecret) {
  const content = fs.readFileSync(filePath, { encoding: 'base64' });
  const metadata = { 'source': path.basename(filePath) };
  const payload = { 'content': content, 'metadata': metadata };

  try {
    console.log(`Sending: ${filePath} to ${apiUrl}`);
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Secret': ingestSecret
      }
    });
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
      await processFile(directoryPath, apiUrl, ingestSecret);
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

program
  .description('Ingest files from a directory to the API')
  .argument('<path>', 'Path to the directory containing files to ingest')
  .requiredOption('--ingest-secret <secret>', 'Ingest secret for API authentication')
  .option('--endpoint <url>', 'API endpoint URL', 'http://localhost:5328')
  .option('--exclude <files>', 'Comma-separated list of files or patterns to exclude', 'node_modules,.git,.env,package-lock.json')
  .action(async (directoryPath, options) => {
    const apiUrl = `${options.endpoint}/api/ingest`;
    const excludeFiles = options.exclude.split(',').map(item => item.trim());
    await ingestFiles(directoryPath, apiUrl, options.ingestSecret, excludeFiles);
  });

program.parse(process.argv);