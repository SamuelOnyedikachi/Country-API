import axios from 'axios';
import db from '../db/knex.js';
import * as Jimp from 'jimp';
import fs from 'fs';
import path from 'path';

// Define cache directory and summary image path
const CACHE_DIR = path.resolve('cache');
const SUMMARY_PATH = path.join(CACHE_DIR, 'summary.png');

/**
 * Refreshes the country database with updated data from external APIs.
 * Generates a summary image showing refresh statistics and top countries by GDP.
 */
export async function refreshCountriesService() {
  try {
    // Fetch data from REST Countries and Exchange Rate APIs concurrently
    const [countriesRes, exchangeRes] = await Promise.all([
      axios.get(
        'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies'
      ),
      axios.get('https://open.er-api.com/v6/latest/USD'),
    ]);

    // Validate responses
    if (countriesRes.status !== 200 || exchangeRes.status !== 200) {
      throw new Error('External data source unavailable');
    }

    const countriesData = countriesRes.data;
    const exchangeRates = exchangeRes.data?.rates || {};

    let count = 0;
    const now = new Date();

    // Loop through and upsert country data
    for (const c of countriesData) {
      // Handle cases where name is an object { common: '...', official: '...' }
      const name = (
        typeof c.name === 'object' ? c.name.common : c.name
      )?.trim();
      if (!name) continue; // Skip if the country has no valid name

      const population = c.population || 0;
      const currency_code = c.currencies?.[0]?.code || null;
      const exchange_rate = currency_code
        ? exchangeRates[currency_code] || null
        : null;

      // Generate a pseudo GDP estimate
      let estimated_gdp;
      if (!currency_code) {
        estimated_gdp = 0;
      } else if (!exchange_rate) {
        estimated_gdp = null;
      } else {
        const randomFactor =
          Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
        estimated_gdp = (population * randomFactor) / exchange_rate;
      }

      const countryData = {
        name,
        capital: c.capital || null,
        region: c.region || null,
        population,
        currency_code,
        exchange_rate,
        estimated_gdp,
        flag_url: c.flag || null,
        last_refreshed_at: now,
      };

      // Upsert operation
      const existing = await db('countries')
        .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
        .first();

      if (existing) {
        await db('countries').where({ id: existing.id }).update(countryData);
      } else {
        await db('countries').insert(countryData);
      }

      count++;
    }

    // Generate summary image
    await generateSummaryImage(now);

    // Return final result
    return {
      message: 'Countries refreshed successfully',
      total: count,
      last_refreshed_at: now,
    };
  } catch (err) {
    // Log more detailed error information from Axios
    if (err.isAxiosError) {
      console.error('Axios error during refresh:', {
        url: err.config.url,
        code: err.code,
        message: err.message,
      });
    } else {
      console.error('Refresh failed with a non-Axios error:', err.message);
    }
    throw new Error(
      `Could not fetch data from external source. Details: ${err.message}`
    );
  }
}

/**
 * Generates a summary PNG image with basic database statistics.
 */
async function generateSummaryImage(timestamp) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

    const topCountries = await db('countries')
      .orderBy('estimated_gdp', 'desc')
      .limit(5);

    const totalCountries = await db('countries').count('id as total').first();

    // Create base image (dark slate background)
    const image = new Jimp(600, 400, '#1e293b');
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    image.print(font, 20, 20, `Total Countries: ${totalCountries.total}`);
    image.print(font, 20, 50, `Last Refresh: ${timestamp.toISOString()}`);

    let y = 100;
    image.print(font, 20, 80, 'Top 5 by Estimated GDP:');
    for (const c of topCountries) {
      const gdpText =
        c.estimated_gdp !== null ? c.estimated_gdp.toFixed(2) : 'N/A';

      image.print(font, 20, y, `${c.name}: ${gdpText}`);
      y += 25;
    }

    await image.writeAsync(SUMMARY_PATH);
    console.log(`Summary image generated at ${SUMMARY_PATH}`);
  } catch (err) {
    console.error('Failed to generate summary image:', err.message);
  }
}
