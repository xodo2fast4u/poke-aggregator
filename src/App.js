import React, { useState, useEffect } from "react";
import games from "./data.json";
import "./App.css";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [sortMode, setSortMode] = useState("released");

  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, platformFilter, sortMode]);

  const filteredGames = games
    .filter((game) => {
      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const statusLower = game.status.toLowerCase();
      const isCompleted = statusLower.includes("completed");
      const isProgressing =
        statusLower.includes("progressing") || statusLower.includes("demo");

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Completed" ? isCompleted : isProgressing);

      const matchesPlatform =
        platformFilter === "All" || game.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlatform;
    })
    .sort((a, b) => {
      const dateA =
        sortMode === "released"
          ? new Date(a.initial_release)
          : new Date(a.last_updated);
      const dateB =
        sortMode === "released"
          ? new Date(b.initial_release)
          : new Date(b.last_updated);
      return dateB - dateA;
    });

  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = filteredGames.slice(indexOfFirstGame, indexOfLastGame);
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);

  return (
    <div className="App">
      <header>
        <div className="logo-container">
          <div className="logo-icon">Poké</div>
          <div className="logo-text">
            Aggregator<span className="logo-dot">.</span>
          </div>
        </div>
        <p className="dev-credit">
          Developed by <strong>xodobyte</strong>
        </p>
      </header>

      <section className="legal-banner">
        <div className="legal-content">
          <h3>Community & Legal Notice</h3>
          <p>
            The games archived here are created by fans for{" "}
            <strong>purely creative, imaginative, and curious purposes</strong>.
            These developers do not steal assets for profit; they build these
            experiences for fun because official channels do not produce these
            specific types of games.
          </p>
          <p>
            This project recognizes that fan creation is a byproduct of{" "}
            <strong>programming and its universal languages</strong>. As long as
            these coding tools exist, fans will continue to express their
            creativity. If rights holders find this problematic, the challenge
            lies in the existence of the very programming languages that empower
            human imagination—a reality that cannot be erased.
          </p>
          <p className="trademark-fineprint">
            PokéAggregator is not affiliated with Nintendo, Creatures Inc., or
            GAME FREAK inc. All Pokémon trademarks belong to their respective
            owners.
          </p>
        </div>
      </section>

      <div className="controls">
        <input
          type="text"
          placeholder="Search games..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />

        <div className="filter-row">
          <div className="button-group">
            <button
              className={sortMode === "released" ? "active" : ""}
              onClick={() => setSortMode("released")}
            >
              New Games
            </button>
            <button
              className={sortMode === "updated" ? "active" : ""}
              onClick={() => setSortMode("updated")}
            >
              Recent Updates
            </button>
          </div>

          <div className="button-group">
            {["All", "Completed", "Progressing"].map((s) => (
              <button
                key={s}
                className={statusFilter === s ? "active" : ""}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="button-group">
            {["All", "RPGXP", "GBA"].map((p) => (
              <button
                key={p}
                className={platformFilter === p ? "active" : ""}
                onClick={() => setPlatformFilter(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="results-count">
        Showing {filteredGames.length > 0 ? indexOfFirstGame + 1 : 0}-
        {Math.min(indexOfLastGame, filteredGames.length)} of{" "}
        {filteredGames.length} games
      </p>

      <div className="game-grid">
        {currentGames.map((game) => (
          <article key={game.id} className="game-card">
            <div className="image-container">
              <img
                src={
                  game.image ||
                  "https://via.placeholder.com/400x225?text=No+Image"
                }
                alt={game.title}
              />
              <div className="platform-tag">{game.platform}</div>
              <div className="source-tag">{game.source}</div>
              {game.version !== "N/A" && game.version !== "Thread" && (
                <div className="version-badge">
                  {game.version.toLowerCase().startsWith("v")
                    ? game.version
                    : `v${game.version}`}
                </div>
              )}
            </div>
            <div className="card-content">
              <h2 className="game-title">{game.title}</h2>
              <p className="status-text">{game.status}</p>
              <div className="date-stack">
                <div
                  className={sortMode === "released" ? "highlight-date" : ""}
                >
                  Released: {game.initial_release}
                </div>
                <div className={sortMode === "updated" ? "highlight-date" : ""}>
                  Updated: {game.last_updated}
                </div>
              </div>
              <a
                href={game.game_url}
                target="_blank"
                rel="noreferrer nofollow"
                className="btn-link"
              >
                View Game Page
              </a>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => {
              setCurrentPage((prev) => prev - 1);
              window.scrollTo(0, 0);
            }}
            className="pag-btn"
          >
            Previous
          </button>
          <div className="page-numbers">
            Page {currentPage} of {totalPages}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => {
              setCurrentPage((prev) => prev + 1);
              window.scrollTo(0, 0);
            }}
            className="pag-btn"
          >
            Next
          </button>
        </div>
      )}

      <footer className="simple-footer">
        <p>
          &copy; {new Date().getFullYear()} PokéAggregator | Archive maintained
          by xodobyte
        </p>
      </footer>
    </div>
  );
}

export default App;
