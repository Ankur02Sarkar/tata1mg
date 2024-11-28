const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichJsonFileWithMetaData(fileName, start = 0, end = null) {
  const filePath = path.join(__dirname, "data", fileName);
  const logFilePath = path.join(__dirname, "data", `${fileName}.log`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  let data;

  try {
    data = JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error parsing JSON: ${err.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    console.error("The JSON content is not an array.");
    return;
  }

  // Clear previous log file
  fs.writeFileSync(logFilePath, "");

  // Adjust the end parameter to the array length if not provided
  end = end !== null ? end : data.length;

  if (start >= end) {
    console.error("Invalid range: 'start' must be less than 'end'.");
    return;
  }

  for (let i = start; i < end; i++) {
    const obj = data[i];

    if (!obj.url) {
      const logMessage = `Index ${i}: Missing URL field in object: ${JSON.stringify(
        obj
      )}\n`;
      console.error(logMessage.trim());
      fs.appendFileSync(logFilePath, logMessage);
      continue;
    }

    try {
      const response = await fetch(obj.url);

      if (!response.ok) {
        const logMessage = `Index ${i}: \nFailed to fetch URL: ${obj.url}, \nStatus: ${response.status}, \nMessage: ${response.statusText}\n\n\n`;
        console.error(logMessage.trim());
        fs.appendFileSync(logFilePath, logMessage);
        obj.metaData = {}; // Add an empty metaData object
        continue;
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const scriptTag = dom.window.document.querySelector(
        'script[type="application/ld+json"]'
      );

      if (scriptTag) {
        const metaData = JSON.parse(scriptTag.textContent);
        obj.metaData = metaData;
        console.log(`Index ${i}: Found metadata for URL: ${obj.url}`);
      } else {
        const logMessage = `Index ${i}: No metadata found for URL: ${obj.url}\n`;
        console.error(logMessage.trim());
        fs.appendFileSync(logFilePath, logMessage);
        obj.metaData = {}; // Add an empty metaData object
      }
    } catch (err) {
      const logMessage = `Index ${i}: Error processing URL: ${obj.url}, Error: ${err.message}\n`;
      console.error(logMessage.trim());
      fs.appendFileSync(logFilePath, logMessage);
      obj.metaData = {}; // Add an empty metaData object in case of error
    }

    // Introduce a 1-second delay between requests
    await delay(1200);
  }

  // Write the updated content back to the file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("File updated successfully.");
  } catch (err) {
    console.error(`Error writing to file: ${err.message}`);
  }
}

// Usage example with optional start and end parameters
enrichJsonFileWithMetaData("allDiabetesMedsData.json");
