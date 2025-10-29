# Country Currency & Exchange API

A RESTful API that fetches country and currency exchange data from external sources, enriches it, and stores it in a local database to provide fast, cached, and reliable access. The API also generates a dynamic summary image of the cached data.

---

## Author

- **Name**: Samuel Onyedikachi
- **Email**: [samuelonyedikachi450@gmail.com](mailto:samuelonyedikachi450@gmail.com)
- **Social**: Psalmcodes

---

## Features

- **Data Aggregation**: Fetches country data from `restcountries.com` and currency exchange rates from `open.er-api.com`.
- **Data Caching**: Caches the aggregated data in a MySQL database to ensure high performance and reliability.
- **Data Enrichment**: Computes an `estimated_gdp` for each country based on its population and exchange rate.
- **CRUD Operations**: Provides endpoints to read, update, and delete country records.
- **Filtering & Sorting**: Supports filtering countries by `region` or `currency` and sorting by `estimated_gdp`.
- **System Status**: A `/status` endpoint to monitor the total number of countries and the last data refresh time.
- **Dynamic Image Generation**: Creates and serves a `summary.png` image with key statistics and the top 5 countries by GDP.

---

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Query Builder**: Knex.js
- **HTTP Client**: Axios
- **Image Manipulation**: Jimp
- **Environment Variables**: dotenv

---

## Setup and Installation

Follow these steps to get the project running locally.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd country-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

Make sure you have a MySQL server running. Create a new database for this project. Then, run the following SQL script to create the `countries` table with the correct schema.

```sql
CREATE TABLE countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    capital VARCHAR(255) NULL,
    region VARCHAR(255) NULL,
    population BIGINT NOT NULL,
    currency_code VARCHAR(10) NULL,
    exchange_rate DECIMAL(15, 4) NULL,
    estimated_gdp DECIMAL(20, 4) NULL,
    flag_url VARCHAR(255) NULL,
    last_refreshed_at TIMESTAMP NOT NULL
);
```

### 4. Configure Environment Variables

Create a `.env` file in the root of the project and add the following configuration. Replace the placeholder values with your actual database credentials.

```env
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
```

### 5. Start the Server

```bash
# For development with auto-reloading
npm run dev

# For production
npm start
```

The API will be running at `http://localhost:5000`.

### 6. Populate the Database

Once the server is running, make a `POST` request to the `/countries/refresh` endpoint to fetch data from the external APIs and populate your database.

```bash
curl -X POST http://localhost:5000/countries/refresh
```

---

## API Endpoints

### `POST /countries/refresh`

- Fetches fresh data from external APIs, updates the database, and regenerates the summary image.
- **Response (200 OK)**:
  ```json
  {
    "message": "Countries refreshed successfully",
    "total": 250,
    "last_refreshed_at": "2023-10-29T12:30:00.000Z"
  }
  ```

### `GET /status`

- Returns the total number of countries in the database and the timestamp of the last successful refresh.
- **Response (200 OK)**:
  ```json
  {
    "total_countries": 250,
    "last_refreshed_at": "2023-10-29T12:30:00.000Z"
  }
  ```

### `GET /countries`

- Retrieves a list of all countries from the database.
- **Query Parameters**:
  - `region` (e.g., `?region=Africa`): Filter by region (case-insensitive).
  - `currency` (e.g., `?currency=NGN`): Filter by currency code (case-insensitive).
  - `sort` (e.g., `?sort=gdp_desc`): Sort by `estimated_gdp`. Accepts `gdp_desc` or `gdp_asc`.
- **Response (200 OK)**: An array of country objects.

### `GET /countries/:name`

- Retrieves a single country by its name (case-insensitive).
- **Response (200 OK)**: A single country object.
- **Response (404 Not Found)**:
  ```json
  { "error": "Country not found" }
  ```

### `GET /countries/image`

- Serves the `summary.png` image generated during the last refresh.
- **Response (200 OK)**: The image file.
- **Response (404 Not Found)**:
  ```json
  { "error": "Summary image not found" }
  ```

### `DELETE /countries/:name`

- Deletes a country record from the database by its name.
- **Response (200 OK)**:
  ```json
  { "message": "Country deleted successfully" }
  ```

---

## License

This project is licensed under the MIT License.
