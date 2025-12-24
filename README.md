<h1 align="center"> PokéAggregator </h1>

<p align="center">
  <a href="https://github.com/xodo2fast4u/poke-aggregator">
    <img src="https://img.shields.io/github/repo-size/xodo2fast4u/poke-aggregator?style=for-the-badge&logo=github&logoColor=white&label=Repo%20Size&color=60a5fa" alt="GitHub Repo Size">
  </a>
  <a href="https://github.com/xodo2fast4u/poke-aggregator/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/xodo2fast4u/poke-aggregator?style=for-the-badge&logo=github&logoColor=white&label=License&color=60a5fa" alt="License">
  </a>
  <a href="https://github.com/xodo2fast4u/poke-aggregator">
    <img src="https://img.shields.io/badge/Open%20Source-Yes-brightgreen?style=for-the-badge&logo=open-source-initiative&logoColor=white" alt="Open Source">
  </a>
  <a href="https://github.com/xodo2fast4u/poke-aggregator">
    <img src="https://img.shields.io/badge/Maintained-Archived-red?style=for-the-badge&logo=github-actions&logoColor=white" alt="Status">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios">
  <img src="https://img.shields.io/badge/Cheerio-E88C1F?style=for-the-badge&logo=cheerio&logoColor=white" alt="Cheerio">
</p>

## Overview
PokéAggregator is a high-performance archive and directory designed to aggregate data from major Pokémon fan game communities, including PokeHarbor and Eevee Expo. This project provides a unified, searchable, and paginated dashboard for RPGXP fan games and GBA ROM hacks, focusing on accurate tracking of release dates and latest updates.

## Technical Stack
- Frontend: React.js
- Styling: Custom CSS utilizing OKLCH color space
- Data Management: Node.js with Cheerio and Axios
- Deployment: Vercel
- State Management: React Hooks (useState, useEffect)

## Project Philosophy and Legal Notice
This project is built on the following core principles:

1. Creative Expression: The games listed in this archive are created by fans for purely creative, imaginative, and curious purposes. These developers do not seek profit; they build these experiences to fill a creative void that official channels currently do not address.

2. Technological Reality: Fan creation is a natural byproduct of programming and its universal languages. As long as these coding tools exist, humans will use them to express their imagination. Challenging these creations is essentially a challenge against the existence of programming languages themselves.

## Disclaimer
PokéAggregator is not affiliated with Nintendo, Creatures Inc., or GAME FREAK inc. All Pokémon trademarks and character names belong to their respective owners. This site does not host game files or copyrighted data; it serves only as a directory to community threads.

## Features
- Multi-source scraping: Integrates data from various community forums.
- Client-side pagination: Smooth performance when browsing hundreds of records.
- Filtering: Search by title, platform (GBA/RPGXP), and development status.
- Sorting: Toggle between "Latest Released" and "Recently Updated" views.
- Responsive Design: Optimized for both desktop and mobile viewing.

## Installation and Usage
1. Clone the repository to your local machine.
2. Run `npm install` to install dependencies.
3. Run `node scraper.js` to execute the latest data fetch.
4. Run `npm start` to launch the local development server.
5. Run `npm run build` to generate the production build.

## License
This project is licensed under the MIT License
