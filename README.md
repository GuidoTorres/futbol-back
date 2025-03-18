# Fútbol API

Una API RESTful para datos de fútbol que integra SofaScore, construida con Node.js, Express y Sequelize. Proporciona acceso completo a equipos, jugadores, ligas y partidos mediante una interfaz de programación bien estructurada.

## Características

- Gestión completa de equipos (crear, leer, actualizar, eliminar)
- Gestión de jugadores con asociaciones a equipos
- Gestión de ligas con información de temporadas
- Gestión de partidos con eventos detallados
- Integración con SofaScore para obtener datos actualizados
- API de búsqueda avanzada para jugadores y equipos
- Soporte para obtener estructura jerárquica de países, ligas y equipos
- Procesos por lotes para obtener grandes volúmenes de datos

## Stack Tecnológico

- **Node.js** - Entorno de ejecución JavaScript
- **Express** - Framework web
- **Sequelize** - ORM para gestión de base de datos
- **MySQL** - Base de datos
- **WebSocket** - Comunicación de datos en tiempo real
- **Cheerio** - Análisis HTML para web scraping
- **Axios** - Peticiones HTTP para web scraping
- **Puppeteer** - Navegador headless para scraping avanzado
- **dotenv** - Variables de entorno
- **cors** - Middleware CORS
- **helmet** - Middleware de seguridad

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd futbol-back
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear un archivo `.env` en el directorio raíz (usar `.env.example` como plantilla):
```bash
cp .env.example .env
```

4. Editar el archivo `.env` con las credenciales de la base de datos:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=futbol_db
PORT=3000
```

5. Crear la base de datos:
```bash
mysql -u root -p
CREATE DATABASE futbol_db;
exit
```

6. Sincronizar la base de datos e inicializarla con datos básicos:
```bash
npm run sync-db
```

7. Iniciar el servidor:
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## API Endpoints

### Equipos (Teams)
- `GET /api/teams` - Obtener todos los equipos
- `GET /api/teams/:id` - Obtener equipo por ID
- `POST /api/teams` - Crear un nuevo equipo
- `PUT /api/teams/:id` - Actualizar equipo por ID
- `DELETE /api/teams/:id` - Eliminar equipo por ID

### Jugadores (Players)
- `GET /api/players` - Obtener todos los jugadores
- `GET /api/players/:id` - Obtener jugador por ID
- `GET /api/players/team/:teamId` - Obtener jugadores por ID de equipo
- `POST /api/players` - Crear un nuevo jugador
- `PUT /api/players/:id` - Actualizar jugador por ID
- `DELETE /api/players/:id` - Eliminar jugador por ID

### Ligas (Leagues)
- `GET /api/leagues` - Obtener todas las ligas
- `GET /api/leagues/:id` - Obtener liga por ID
- `GET /api/leagues/country/:country` - Obtener ligas por país
- `GET /api/leagues/:leagueId/standings` - Obtener clasificación de liga
- `POST /api/leagues` - Crear una nueva liga
- `PUT /api/leagues/:id` - Actualizar liga por ID
- `DELETE /api/leagues/:id` - Eliminar liga por ID

### Partidos (Matches)
- `GET /api/matches` - Obtener todos los partidos
- `GET /api/matches/live` - Obtener todos los partidos en vivo
- `GET /api/matches/:id` - Obtener partido por ID
- `GET /api/matches/league/:leagueId` - Obtener partidos por ID de liga
- `GET /api/matches/team/:teamId` - Obtener partidos por ID de equipo
- `POST /api/matches` - Crear un nuevo partido
- `PUT /api/matches/:id` - Actualizar partido por ID
- `DELETE /api/matches/:id` - Eliminar partido por ID

### Eventos (Events)
- `GET /api/events/match/:matchId` - Obtener eventos por ID de partido
- `POST /api/events` - Crear un nuevo evento
- `PUT /api/events/:id` - Actualizar evento por ID
- `DELETE /api/events/:id` - Eliminar evento por ID

### Integración con SofaScore

#### Jugadores
- `GET /api/sofascore/players/:playerId` - Obtener información de jugador por ID
  - Parámetros: `completeInfo` (boolean), `save` (boolean)
- `GET /api/sofascore/players/search/:query` - Buscar jugadores por nombre
  - Parámetros: `save` (boolean)
- `GET /api/sofascore/teams/:teamId/players` - Obtener todos los jugadores de un equipo
  - Parámetros: `save` (boolean)
- `GET /api/sofascore/players/all` - Obtener jugadores de todas las ligas principales
  - Parámetros: `maxTeamsPerLeague` (número), `save` (boolean)

#### Equipos
- `GET /api/sofascore/teams/:teamId/details` - Obtener detalles del equipo incluyendo plantilla
  - Parámetros: `save` (boolean)
- `POST /api/sofascore/teams/:teamId/update-info` - Actualizar información del equipo desde SofaScore
  - Parámetros: `forceUpdate` (boolean) - Forzar actualización incluso si los datos son recientes

#### Ligas
- `GET /api/sofascore/leagues` - Obtener todas las ligas disponibles
- `GET /api/sofascore/leagues/:league/seasons` - Obtener temporadas disponibles para una liga
- `GET /api/sofascore/leagues/:league/teams/:year?` - Obtener equipos en una liga para un año específico
- `GET /api/sofascore/leagues/:leagueId/details` - Obtener detalles de la liga
- `GET /api/sofascore/leagues/:league/players/:year?` - Obtener todos los jugadores en una liga
  - Parámetros: `save` (boolean), `maxTeams` (número)

#### Países
- `GET /api/sofascore/countries` - Obtener todos los países disponibles
- `GET /api/sofascore/structure` - Obtener jerarquía de países, ligas y equipos

#### Partidos
- `GET /api/sofascore/matches/today` - Obtener partidos de hoy
- `GET /api/sofascore/matches/:matchId` - Obtener detalles de partido por ID
- `GET /api/sofascore/matches/date/:date` - Obtener partidos para una fecha específica
- `GET /api/sofascore/matches/range/:startDate/:endDate` - Obtener partidos para un rango de fechas
- `GET /api/sofascore/matches/week` - Obtener partidos de la semana actual

#### Calendarios (Fixtures)
- `GET /api/sofascore/fixtures/season/:season` - Obtener todos los partidos de una temporada completa
- `GET /api/sofascore/fixtures/status` - Obtener estado del proceso de obtención de calendario

#### Procesamiento por lotes
- `GET /api/sofascore/batch/players/all-leagues` - Iniciar procesamiento por lotes de todas las ligas
  - Parámetros: `leagues` (string separado por comas), `year` (string), `maxTeams` (número)
- `GET /api/sofascore/batch/players/status` - Obtener estado del proceso por lotes

#### Población de la base de datos
- `GET /api/sofascore/populate/initialize` - Inicializar base de datos con datos básicos
- `GET /api/sofascore/populate/league/:leagueId` - Poblar equipos y jugadores para una liga
- `GET /api/sofascore/populate/team/:teamId` - Poblar jugadores para un equipo

## Modelos de Datos

### Equipo (Team)
```javascript
{
  id: Integer (Primary Key),
  name: String (requerido),
  country: String,
  countryId: Integer (Foreign Key a Country),
  logo: String,
  stadium: String,
  founded: Integer,
  sofaScoreId: String,
  slug: String
}
```

### Jugador (Player)
```javascript
{
  id: Integer (Primary Key),
  name: String (requerido),
  fullName: String,
  shortName: String,
  position: String,
  positionCategory: String, // Goalkeeper, Defender, Midfielder, Forward
  nationality: String,
  nationalityId: Integer (Foreign Key a Country),
  birthDate: Date,
  birthPlace: String,
  age: Integer,
  height: Integer, // en cm
  weight: Integer, // en kg
  foot: String, // Pie preferido (left, right, both)
  shirtNumber: Integer,
  slug: String,
  photo: String,
  marketValue: String,
  contractUntil: Date,
  sofaScoreId: String,
  sofaScoreUrl: String,
  TeamId: Integer (Foreign Key a Team)
}
```

### Liga (League)
```javascript
{
  id: Integer (Primary Key),
  name: String (requerido),
  country: String,
  countryId: Integer (Foreign Key a Country),
  logo: String,
  type: String, // League, Cup, etc.
  tier: Integer, // 1 = primera división
  sofaScoreId: String
}
```

### Partido (Match)
```javascript
{
  id: Integer (Primary Key),
  date: Date (requerido),
  status: Enum('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'),
  matchday: Integer,
  round: String,
  stage: String,
  homeScore: Integer,
  awayScore: Integer,
  halfTimeHomeScore: Integer,
  halfTimeAwayScore: Integer,
  stadium: String,
  venue: String,
  referee: String,
  attendance: Integer,
  season: String,
  homeTeamId: Integer (Foreign Key a Team),
  awayTeamId: Integer (Foreign Key a Team),
  LeagueId: Integer (Foreign Key a League)
}
```

### Evento (Event)
```javascript
{
  id: Integer (Primary Key),
  type: String, // GOAL, CARD, SUBSTITUTION, etc.
  minute: Integer,
  MatchId: Integer (Foreign Key a Match),
  PlayerId: Integer (Foreign Key a Player),
  TeamId: Integer (Foreign Key a Team)
}
```

### País (Country)
```javascript
{
  id: Integer (Primary Key),
  name: String (requerido),
  code: String,
  flag: String,
  continent: String
}
```

### Transferencia (Transfer)
```javascript
{
  id: Integer (Primary Key),
  date: Date,
  type: String, // Transfer, Loan, etc.
  fee: String,
  fromTeamId: Integer (Foreign Key a Team),
  toTeamId: Integer (Foreign Key a Team),
  playerId: Integer (Foreign Key a Player)
}
```

## Demo Page

Una página de demostración de partidos en vivo está disponible en `http://yourserver:port/live-demo.html` para mostrar las capacidades de seguimiento de partidos en vivo.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.
