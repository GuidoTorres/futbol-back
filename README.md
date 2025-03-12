# Soccer API

A RESTful API similar to SofaScore for soccer data, built with Node.js, Express, and Sequelize. Includes web scraping capabilities to gather real-time data without relying on expensive APIs.

## Features

- Teams management (create, read, update, delete)
- Players management with team associations
- Leagues management with standings calculation
- Matches management with detailed match events
- Real-time live match updates via web scraping and WebSockets
- Web scraping for match data to avoid expensive API costs
- Comprehensive API endpoints for soccer data
- Live match viewer demo page

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Sequelize** - ORM for database management
- **MySQL** - Database
- **WebSocket** - Real-time data communication
- **Cheerio** - HTML parsing for web scraping
- **Axios** - HTTP requests for web scraping
- **Puppeteer** - Headless browser for advanced scraping
- **dotenv** - Environment variables
- **cors** - CORS middleware
- **helmet** - Security middleware

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd soccer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (use `.env.example` as a template):
```bash
cp .env.example .env
```

4. Edit the `.env` file with your database credentials

5. Create the database:
```bash
mysql -u root -p
CREATE DATABASE soccer_db;
exit
```

6. Sync the database and populate it with initial data from web scraping:
```bash
npm run sync-db
```

7. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team by ID
- `POST /api/teams` - Create a new team
- `PUT /api/teams/:id` - Update team by ID
- `DELETE /api/teams/:id` - Delete team by ID

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `GET /api/players/team/:teamId` - Get players by team ID
- `POST /api/players` - Create a new player
- `PUT /api/players/:id` - Update player by ID
- `DELETE /api/players/:id` - Delete player by ID

### Leagues
- `GET /api/leagues` - Get all leagues
- `GET /api/leagues/:id` - Get league by ID
- `GET /api/leagues/country/:country` - Get leagues by country
- `GET /api/leagues/:leagueId/standings` - Get league standings
- `POST /api/leagues` - Create a new league
- `PUT /api/leagues/:id` - Update league by ID
- `DELETE /api/leagues/:id` - Delete league by ID

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/live` - Get all live matches
- `GET /api/matches/:id` - Get match by ID
- `GET /api/matches/league/:leagueId` - Get matches by league ID
- `GET /api/matches/team/:teamId` - Get matches by team ID
- `POST /api/matches` - Create a new match
- `PUT /api/matches/:id` - Update match by ID
- `DELETE /api/matches/:id` - Delete match by ID

### Events
- `GET /api/events/match/:matchId` - Get events by match ID
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update event by ID
- `DELETE /api/events/:id` - Delete event by ID

### Live Data (Web Scraping)
- `GET /api/live/matches` - Get all currently live matches (from web scraping)
- `GET /api/live/matches/:id` - Get detailed information about a live match (from web scraping)

### Direct Scraper Access
- `GET /api/scraper/live-scores` - Get live scores directly from marca.com
- `GET /api/scraper/matches/:matchId` - Get match details directly from marca.com
- `GET /api/scraper/leagues/:leagueId/standings` - Get league standings directly from fbref.com
- `GET /api/scraper/teams/:teamId` - Get team info directly from fbref.com
- `GET /api/scraper/players/:playerName` - Get player stats directly from fbref.com
- `GET /api/scraper/fixtures/:entityId` - Get upcoming fixtures directly from marca.com

### Data Migration
- `POST /api/migration/all` - Migrate all data from scrapers to database
- `POST /api/migration/live-matches` - Migrate live matches from scrapers to database
- `POST /api/migration/leagues/:leagueId/standings` - Migrate league standings from scrapers to database
- `POST /api/migration/teams/:teamId` - Migrate team info from scrapers to database
- `POST /api/migration/matches/:matchId` - Migrate match details from scrapers to database
- `POST /api/migration/fixtures/:entityId` - Migrate upcoming fixtures from scrapers to database
- `POST /api/migration/players/:playerName` - Migrate player stats from scrapers to database

### WebSocket
A WebSocket connection is available at the root path `ws://yourserver:port` for real-time updates about live matches.

WebSocket message types:
- `live-matches` - Updates about all live matches
- `match-details` - Detailed updates about a specific match

To subscribe to updates for a specific match, send a message:
```json
{
  "type": "subscribe-match",
  "matchId": "matchId"
}
```

## Data Models

### Team
- id: Integer (Primary Key)
- name: String (required)
- shortName: String
- country: String (required)
- logo: String
- founded: Integer
- stadium: String

### Player
- id: Integer (Primary Key)
- name: String (required)
- position: String
- nationality: String
- birthDate: Date
- height: Integer (cm)
- weight: Integer (kg)
- shirtNumber: Integer
- photo: String
- TeamId: Integer (Foreign Key)

### League
- id: Integer (Primary Key)
- name: String (required)
- country: String (required)
- logo: String
- season: String (required)
- startDate: Date
- endDate: Date

### Match
- id: Integer (Primary Key)
- date: Date (required)
- status: Enum ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED')
- matchday: Integer
- stage: String
- homeTeamId: Integer (Foreign Key)
- awayTeamId: Integer (Foreign Key)
- homeScore: Integer
- awayScore: Integer
- stadium: String
- referee: String
- LeagueId: Integer (Foreign Key)

### Event
- id: Integer (Primary Key)
- type: Enum ('GOAL', 'OWN_GOAL', 'PENALTY', 'MISS_PENALTY', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'VAR')
- minute: Integer (required)
- extraMinute: Integer
- detail: Text
- MatchId: Integer (Foreign Key)
- playerId: Integer (Foreign Key)
- assistPlayerId: Integer (Foreign Key)
- TeamId: Integer (Foreign Key)

## Web Scraping

This application includes web scraping modules that allow gathering real-time data from popular soccer websites without depending on expensive API services:

1. **Live Score Scraping from Marca.com**
   - Real-time match scores and events
   - Match status updates (live minutes, full-time, etc.)
   - Goal scorers and card events

2. **Historical Data from FBRef.com**
   - Team information and rosters
   - Player career statistics and history
   - League standings and historical results
   - Detailed match statistics

### Scraping y Migración de Partidos

Para extraer y migrar partidos desde FBref a la base de datos:

```bash
# Scraping - Guarda partidos en archivos JSON
npm run scrape                         # Partidos de ayer, hoy y mañana
npm run scrape 2025-03-10              # Partidos de una fecha específica
npm run scrape 2025-03-01 2025-03-31   # Partidos de un rango de fechas

# Migración a la base de datos MySQL
npm run migrate                         # Partidos de hoy
npm run migrate 2025-03-10              # Partidos de una fecha específica
npm run migrate 2025-03-01 2025-03-31   # Partidos de un rango de fechas
npm run migrate data/matches_2025-03-10.json  # Importar desde archivo JSON
```

Los partidos se guardan en archivos JSON en la carpeta `data` como respaldo.

### Important Notes on Web Scraping:

- The scraper uses proper rate limiting and caching to be respectful to the data sources
- User-Agent is set to mimic a regular browser to avoid detection
- Make sure to comply with the terms of service of the websites you're scraping
- For production use, consider implementing additional error handling and fallback sources

### Demo Page

A live match demo page is available at `http://yourserver:port/live-demo.html` to demonstrate the WebSocket capabilities and live match tracking.

## License

This project is licensed under the MIT License.
