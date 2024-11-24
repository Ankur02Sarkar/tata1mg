const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

async function fetchAndSaveData(
  categoryId,
  currCity,
  itemsPerPage,
  maxPages,
  fileName
) {
  const baseUrl = `https://www.1mg.com/pharmacy_api_gateway/v8/category/${categoryId}/paginated`;
  const city = currCity;
  const filter = true;
  const perPage = parseInt(itemsPerPage);
  const totalPages = parseInt(maxPages);

  // Ensure the 'data' folder exists
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const allData = []; // Array to store all the collected data

  for (let page = 1; page <= totalPages; page++) {
    const url = `${baseUrl}?city=${city}&filter=${filter}&page=${page}&per_page=${perPage}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `Failed to fetch data for page ${page}. Status: ${response.status}`
        );
        continue;
      }

      const jsonResponse = await response.json();
      const pageData = jsonResponse.data?.widgets?.[0]?.value?.data;

      if (Array.isArray(pageData) && pageData.length > 0) {
        allData.push(...pageData); // Append page data to the allData array
        console.log(`Page ${page} saved successfully`);
      } else {
        console.warn(`Page ${page} has no data to save`);
      }
    } catch (error) {
      console.error(`Error fetching data for page ${page}:`, error.message);
    }
  }

  // Write the collected data to a single JSON file
  const filePath = path.join(dataDir, `${fileName}.json`);
  fs.writeFile(filePath, JSON.stringify(allData, null, 2), (err) => {
    if (err) {
      console.error("Error writing data to file:", err.message);
    } else {
      console.log(`All data successfully written to ${filePath}`);
    }
  });
}

fetchAndSaveData(40, "bangalore", 40, 84, "allKidneyCareMeds");
