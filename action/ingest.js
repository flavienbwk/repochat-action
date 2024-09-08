import fs from 'fs';
import path from 'path';
import axios from 'axios';

function isValidFile(filePath) {
  return fs.statSync(filePath).isFile() && !path.basename(filePath).startsWith('.');
}

async function sendFileToApi(filePath, apiUrl) {
  const content = fs.readFileSync(filePath, { encoding: 'base64' });
  const metadata = { source: path.basename(filePath) };
  const payload = { content, metadata };

  try {
    const response = await axios.post(apiUrl, payload);
    return response;
  } catch (error) {
    console.error(`Error sending file: ${error.message}`);
    return { status: error.response ? error.response.status : 500 };
  }
}

async function ingestFiles(directoryPath, apiUrl) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    console.error(`Error: ${directoryPath} is not a valid directory.`);
    return;
  }

  const files = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(directoryPath, file.name);
    if (file.isDirectory()) {
      await ingestFiles(filePath, apiUrl);
    } else if (isValidFile(filePath)) {
      console.log(`Sending file: ${filePath}`);
      const response = await sendFileToApi(filePath, apiUrl);
      if (response.status === 200) {
        console.log(`Successfully ingested: ${filePath}`);
      } else {
        console.log(`Failed to ingest ${filePath}. Status code: ${response.status}`);
      }
    } else {
      console.log(`Skipping invalid or hidden file: ${filePath}`);
    }
  }
}

export default {
  ingestFiles
};
