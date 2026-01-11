# AeroClean 360: Full-Stack System Architecture

## 1. Project Overview
**AeroClean 360** is a real-time Urban Dust Management Platform designed for Smart Cities. It integrates IoT sensing, AI-driven analytics, and community reporting to monitor and mitigate dust pollution.
*   **Goal:** Reduce urban dust by 40% through proactive monitoring and rapid response.
*   **Tech Stack:** MERN (MongoDB, Express, React, Node.js) + Python (Simulation) + Leaflet (Maps).

## 2. System Architecture
The system follows a standard IoT-Cloud architecture:
1.  **Edge Layer (IoT/Simulation):** Sensors (ESP32/PMS5003) send PM2.5/PM10, Temp, Humidity, and GPS data via MQTT/HTTP.
2.  **API Layer (Backend):** Node.js/Express server receives data, validates it, and stores it.
3.  **Data Layer (Database):** MongoDB stores sensor readings, user reports, and alerts.
4.  **Application Layer (Frontend):** React.js dashboard visualizes data on heatmaps and manages workflows.

## 3. Database Schema (MongoDB)
*   **`Sensor`**: Stores metadata about IoT nodes.
    *   `id`: String (UUID)
    *   `location`: { lat: Number, lng: Number }
    *   `status`: "active" | "maintenance"
*   **`Reading`**: Time-series data from sensors.
    *   `sensorId`: String (Ref)
    *   `pm25`: Number
    *   `pm10`: Number
    *   `timestamp`: Date
*   **`Report`**: Citizen-submitted issues.
    *   `userId`: String (Ref)
    *   `imageUrl`: String
    *   `location`: { lat: Number, lng: Number }
    *   `category`: "Construction" | "Unpaved Road" | "Waste"
    *   `status`: "Pending" | "Verified" | "Resolved"
*   **`Alert`**: System-generated high-dust warnings.
    *   `sensorId`: String
    *   `level`: "Warning" | "Critical"
    *   `message`: String

## 4. API Design
*   `POST /api/sensors/data`: Ingest sensor readings (from IoT).
*   `GET /api/sensors`: Get all sensor locations and latest status.
*   `GET /api/analytics/heatmap`: Get aggregated data for map visualization.
*   `POST /api/reports`: Submit a citizen report.
*   `GET /api/reports`: Admin view of all reports.
*   `POST /api/alerts/dispatch`: Trigger a cleaning truck to a specific location.

## 5. Frontend Pages & Components
*   **`Dashboard.jsx`**: Main view. Interactive Map (Leaflet) with markers colored by AQI. Sidebar with live stats.
*   **`ReportIssue.jsx`**: Mobile-friendly form for citizens to upload photos and location.
*   **`AdminPanel.jsx`**: Table view of incoming reports and active alerts. Dispatch controls.
*   **`Analytics.jsx`**: Charts (Recharts) showing PM2.5 trends over time.

## 6. Backend Logic & Services
*   **`DataIngestionService`**: Validates incoming IoT packets.
*   **`AlertEngine`**: Checks if `pm25 > 150`. If yes, creates an `Alert` record and triggers a (simulated) notification.
*   **`GeoSpatialService`**: specific queries to find sensors within a radius.

## 7. IoT Data Simulation Logic
*   A **Node.js script** (`simulator.js`) acts as multiple virtual sensors.
*   It generates random PM2.5 values that follow a "random walk" pattern (values drift slowly rather than jumping randomly).
*   It introduces "Spike Events" (e.g., sudden dust storm) to test the Alert Engine.

## 8. Dashboard Features & Visualizations
*   **Heatmap Layer:** Visualizes dust intensity (Green -> Yellow -> Red).
*   **Live Ticker:** Scrolling bar showing latest high-dust alerts.
*   **Resource Map:** Real-time location of Sweeper Trucks (simulated).

## 9. Authentication & Authorization
*   **JWT (JSON Web Tokens)** for stateless auth.
*   **Roles:**
    *   `Citizen`: Can view map, submit reports.
    *   `Admin`: Can view all data, dispatch trucks, resolve reports.

## 10. Urban Dust Use-Case Scenarios
1.  **Scenario A (Construction Violation):** Sensor at Sector 4 detects PM10 > 300. System alerts Admin. Admin checks camera feed (simulated) and dispatches misting drone.
2.  **Scenario B (Citizen Report):** User sees sand dumping. Snaps photo. Admin validates. Truck assigned. User gets notification "Cleaned".

## 11. Validation Metrics & KPIs
*   **Data Latency:** Time from Sensor -> Dashboard (< 2s).
*   **Resolution Time:** Avg time to close a "Critical" alert.
*   **User Engagement:** Number of reports submitted.

## 12. 36-Hour Hackathon Build Plan
*   **Hours 0-6:** Setup Repo, MongoDB, Express Server, Basic API.
*   **Hours 6-12:** Build React Skeleton, Map Integration, IoT Simulator.
*   **Hours 12-20:** Connect Socket.io for real-time updates. Build Report Form.
*   **Hours 20-30:** Admin Panel, Styling (Tailwind), Demo Script.
*   **Hours 30-36:** Bug fixes, Deployment (Vercel/Render), Pitch Practice.

## 13. Demo Flow
1.  **Intro:** Show the "Clean City" dashboard (Green status).
2.  **Event:** Run `simulator.js --trigger-spike`.
3.  **Reaction:** Dashboard map turns RED in one sector. Alert pops up.
4.  **Action:** Admin clicks "Dispatch Team". Icon moves to the red zone.
5.  **Resolution:** Simulator lowers dust levels. Map turns Green.
6.  **Engagement:** Show mobile view of a user submitting a report.

## 14. Scalability & Real-World Deployment
*   **Microservices:** Separate Ingestion Service from Web Server.
*   **Queue:** Use RabbitMQ/Kafka for massive sensor data streams.
*   **Hardware:** Deploy 500+ Solar/LoRaWAN nodes.

## 15. Why This Solution Wins
*   **Full Loop:** It doesn't just show data; it drives *action* (dispatch).
*   **Hybrid:** Combines automated IoT with human crowdsourcing.
*   **Visuals:** The real-time map transformation is a "Wow" moment for judges.
