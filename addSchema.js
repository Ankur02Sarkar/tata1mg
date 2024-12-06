const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeout = 7000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout exceeded")), timeout)
    ),
  ]);
}

async function enrichJsonFileWithMetaData(fileName, start = 10098, end = null) {
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
    if (obj.metaData) {
      // Check if metaData is an object
      if (Array.isArray(obj.metaData)) {
        // Loop through the array to check each item
        const hasContext = obj.metaData.some(item => item["@type"]);
        if (hasContext) {
          console.log("Data Already Present in Array");
          continue; // Skip this iteration
        }
      } else if (typeof obj.metaData === "object") {
        // Check if @context exists in the object
        if (obj.metaData["@context"]) {
          console.log("Data Already Present in Object");
          continue; // Skip this iteration
        }
      }
    }


    if (!obj.url) {
      const logMessage = `Index ${i}: Missing URL field in object: ${JSON.stringify(
        obj
      )}\n`;
      console.error(logMessage.trim());
      fs.appendFileSync(logFilePath, logMessage);
      obj.metaData = {}; // Add an empty metaData object
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); // Save progress
      continue;
    }

    try {
      const response = await fetchWithTimeout(obj.url);

      if (!response.ok) {
        const logMessage = `Index ${i}: \nFailed to fetch URL: ${obj.url}, \nStatus: ${response.status}, \nMessage: ${response.statusText}\n\n\n`;
        console.error(logMessage.trim());
        fs.appendFileSync(logFilePath, logMessage);
        obj.metaData = {}; // Add an empty metaData object
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); // Save progress
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
        console.log(`Index ${i}/${end}: Found metadata for URL: ${obj.url}`);
      } else {
        const logMessage = `Index ${i}/${end}: No metadata found for URL: ${obj.url}\n`;
        console.error(logMessage.trim());
        fs.appendFileSync(logFilePath, logMessage);
        obj.metaData = {}; // Add an empty metaData object
      }
    } catch (err) {
      const logMessage = `Index ${i}/${end}: Error processing URL: ${obj.url}, Error: ${err.message}\n`;
      console.error(logMessage.trim());
      fs.appendFileSync(logFilePath, logMessage);
      obj.metaData = {}; // Add an empty metaData object in case of error
    }

    // Save progress after processing each object
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Introduce a 1-second delay between requests
    await delay(1200);
  }

  console.log("File processing completed.");
}

// Usage example with optional start and end parameters
enrichJsonFileWithMetaData("allStomachCareMeds.json");
