const fs = require('fs');
const path = require('path');
const axios = require('axios');

function isValidFile(filePath) {
    return fs.statSync(filePath).isFile() && !path.basename(filePath).startsWith('.');
}

function isExcluded(filePath, excludeFiles) {
    return excludeFiles.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '``');
        return regex.test(filePath);
    });
}

async function sendFileToApi(filePath, apiUrl, ingestSecret) {
    const content = fs.readFileSync(filePath, { encoding: 'base64' });
    const metadata = { 'source': path.basename(filePath) };
    const payload = { 'content': content, 'metadata': metadata };

    try {
        console.log(`Sending: $action/utils/fileUtils.js`);
        const response = await axios.post(apiUrl, payload, { headers: { 'Content-Type': 'application/json', 'X-Ingest-Secret': ingestSecret } });
        return response;
    } catch (error) {
        console.error(`Error sending file: ${error.message}`);
        return { status: error.response ? error.response.status : 500 };
    }
}

async function processFile(filePath, apiUrl, ingestSecret) {
    console.log(`Sending file: $action/utils/fileUtils.js`);
    const response = await sendFileToApi(filePath, apiUrl, ingestSecret);
    if (response.status === 200) {
        console.log(`Successfully ingested: $action/utils/fileUtils.js`);
    } else {
        console.log(`Failed to ingest $action/utils/fileUtils.js. Status code: ${response.status}`);
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
            console.log(`Skipping invalid, hidden, or excluded file: $action/utils/fileUtils.js`);
        }
    }
}

module.exports = {
    isValidFile,
    isExcluded,
    sendFileToApi,
    processFile,
    ingestFiles
};
