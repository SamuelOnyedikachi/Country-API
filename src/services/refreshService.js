import axios from 'axios';
import db from '../db/knex.js';
import * as Jimp from 'jimp';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve('cache');
const SUMMARY_PATH = path.join(CACHE_DIR, 'summary.png');

export async function refreshCountriesService() {
  try {
    const [countriesRes, exchangeRes] = await Promise.all([
      axios.get(
        'https://restcountries.com/v3.1/all?fields=name,capital,region,population,flags,currencies'
      ),
      axios.get('https://open.er-api.com/v6/latest/USD'),
    ]);

    if (countriesRes.status !== 200)
      throw new Error('Could not fetch data from RestCountries API');
    if (exchangeRes.status !== 200)
      throw new Error('Could not fetch data from Exchange Rate API');

    const countriesData = countriesRes.data;
    const exchangeRates = exchangeRes.data?.rates || {};

    let count = 0;
    const now = new Date();

    for (const c of countriesData) {
      const name = c.name?.common?.trim();
      if (!name) continue;

      const capital = Array.isArray(c.capital) ? c.capital[0] : null;
      const region = c.region || null;
      const population = c.population || 0;

      const currency_code = c.currencies ? Object.keys(c.currencies)[0] : null;
      const exchange_rate = currency_code
        ? exchangeRates[currency_code] || null
        : null;

      let estimated_gdp = 0;
      if (!currency_code) estimated_gdp = 0;
      else if (!exchange_rate) estimated_gdp = null;
      else {
        const randomFactor =
          Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
        estimated_gdp = (population * randomFactor) / exchange_rate;
      }

      const countryData = {
        name,
        capital,
        region,
        population,
        currency_code,
        exchange_rate,
        estimated_gdp,
        flag_url: c.flags?.svg || c.flags?.png || null,
        last_refreshed_at: now,
      };

      // Upsert by country name (case-insensitive)
      const existing = await db('countries')
        .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
        .first();

      if (existing)
        await db('countries').where({ id: existing.id }).update(countryData);
      else await db('countries').insert(countryData);

      count++;
    }

    await generateSummaryImage(now);

    return {
      message: 'Countries refreshed successfully',
      total: count,
      last_refreshed_at: now,
    };
  } catch (err) {
    console.error('Refresh failed:', err.message);
    throw new Error(err.message);
  }
}

async function generateSummaryImage(timestamp) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

    const topCountries = await db('countries')
      .orderBy('estimated_gdp', 'desc')
      .limit(5);
    const totalCountries = await db('countries').count('id as total').first();

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
