const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

async function enrichJsonFileWithMetaData(fileName) {
  const filePath = path.join(__dirname, "data", fileName);

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

  for (const obj of data) {
    if (!obj.url) {
      console.error("Missing URL field in object:", obj);
      continue;
    }

    try {
      const response = await fetch(obj.url);
      const html = await response.text();

      const dom = new JSDOM(html);
      const scriptTag = dom.window.document.querySelector(
        'script[type="application/ld+json"]'
      );

      if (scriptTag) {
        const metaData = JSON.parse(scriptTag.textContent);
        obj.metaData = metaData;
        console.log(`Found metadata for URL: ${obj.url}`);
      } else {
        console.error(`Not found: Metadata for URL: ${obj.url}`);
      }
    } catch (err) {
      console.error(`Error fetching URL ${obj.url}: ${err.message}`);
    }
  }

  // Write the updated content back to the file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("File updated successfully.");
  } catch (err) {
    console.error(`Error writing to file: ${err.message}`);
  }
}

// Example usage:
enrichJsonFileWithMetaData("allBoneJointMuscleCareMeds.json");
