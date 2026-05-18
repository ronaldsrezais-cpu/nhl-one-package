"use client";

import { useEffect, useMemo, useState } from "react";

type DailyGame = {
  id: string;
  date: string;
  visitor: string;
  home: string;
  actualWinner: string;
  actualBestPlayer: string;
  predictions: Record<string, { winner: string; bestPlayer: string }>;
};

type SeriesPrediction = { winner: string; games: string };
type PlayoffSeries = {
  id: string;
  round: string;
  teamA: string;
  teamB: string;
  actualWinner: string;
  actualGames: string;
  predictions: Record<string, SeriesPrediction>;
};

type AppState = {
  predictors: string[];
  dailyGames: DailyGame[];
  playoffSeries: PlayoffSeries[];
};

const STORAGE_KEY = "nhl-one-prediction-league-v1";

const defaultPredictors = ["Kristaps", "Ronalds"];

function makeDailyGame(id: number, predictors = defaultPredictors): DailyGame {
  const predictions: DailyGame["predictions"] = {};
  predictors.forEach((p) => { predictions[p] = { winner: "", bestPlayer: "" }; });
  return {
    id: String(id),
    date: "2026-04-20",
    visitor: id === 1 ? "Canadiens" : "Visitor Team",
    home: id === 1 ? "Sabres" : "Home Team",
    actualWinner: "",
    actualBestPlayer: "",
    predictions,
  };
}

function makeSeries(id: number, predictors = defaultPredictors): PlayoffSeries {
  const predictions: PlayoffSeries["predictions"] = {};
  predictors.forEach((p) => { predictions[p] = { winner: "", games: "" }; });
  return {
    id: String(id),
    round: id <= 8 ? "Round 1" : id <= 12 ? "Round 2" : id <= 14 ? "Conference Finals" : "Final",
    teamA: id === 1 ? "Canadiens" : "Team A",
    teamB: id === 1 ? "Sabres" : "Team B",
    actualWinner: "",
    actualGames: "",
    predictions,
  };
}

const defaultState: AppState = {
  predictors: defaultPredictors,
  dailyGames: [makeDailyGame(1), makeDailyGame(2), makeDailyGame(3)],
  playoffSeries: Array.from({ length: 15 }, (_, i) => makeSeries(i + 1)),
};

function getInitialState(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultState;
  } catch {
    return defaultState;
  }
}

function totalScore(state: AppState, predictor: string) {
  let dailyWinner = 0;
  let dailyBestPlayer = 0;
  let seriesWinner = 0;
  let seriesGames = 0;

  state.dailyGames.forEach((game) => {
    const p = game.predictions[predictor];
    if (!p) return;
    if (game.actualWinner && p.winner === game.actualWinner) dailyWinner += 1;
    if (game.actualBestPlayer && p.bestPlayer.trim().toLowerCase() === game.actualBestPlayer.trim().toLowerCase()) dailyBestPlayer += 1;
  });

  state.playoffSeries.forEach((series) => {
    const p = series.predictions[predictor];
    if (!p) return;
    if (series.actualWinner && p.winner === series.actualWinner) seriesWinner += 2;
    if (series.actualGames && p.games === series.actualGames) seriesGames += 1;
  });

  return {
    dailyWinner,
    dailyBestPlayer,
    seriesWinner,
    seriesGames,
    total: dailyWinner + dailyBestPlayer + seriesWinner + seriesGames,
  };
}

export default function Home() {
  const [state, setState] = useState<AppState>(getInitialState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const scores = useMemo(() => {
    return state.predictors.map((p) => ({ name: p, ...totalScore(state, p) })).sort((a, b) => b.total - a.total);
  }, [state]);

  function updateState(next: AppState) { setState(next); }

  function renamePredictor(index: number, name: string) {
    const oldName = state.predictors[index];
    const newName = name || `Player ${index + 1}`;
    const next: AppState = JSON.parse(JSON.stringify(state));
    next.predictors[index] = newName;
    next.dailyGames.forEach((g) => {
      g.predictions[newName] = g.predictions[oldName] || { winner: "", bestPlayer: "" };
      if (newName !== oldName) delete g.predictions[oldName];
    });
    next.playoffSeries.forEach((s) => {
      s.predictions[newName] = s.predictions[oldName] || { winner: "", games: "" };
      if (newName !== oldName) delete s.predictions[oldName];
    });
    updateState(next);
  }

  function addDailyGame() {
    const next = JSON.parse(JSON.stringify(state)) as AppState;
    next.dailyGames.push(makeDailyGame(Date.now(), state.predictors));
    updateState(next);
  }

  function addSeries() {
    const next = JSON.parse(JSON.stringify(state)) as AppState;
    next.playoffSeries.push(makeSeries(Date.now(), state.predictors));
    updateState(next);
  }

  function resetDemo() {
    if (confirm("Reset all games and predictions?")) setState(defaultState);
  }

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="badge">NHL prediction league</div>
          <h1>Daily games + playoff bracket</h1>
          <p>Scoring: daily winner = 1 point, daily best player = 1 point, series winner = 2 points, number of games = 1 point.</p>
        </div>
        <button className="btn secondary" onClick={resetDemo}>Reset</button>
      </div>

      <section className="grid grid-3" style={{ marginBottom: 18 }}>
        {scores.map((score, i) => (
          <div className="card" key={score.name}>
            <div className="muted">{i === 0 ? "Leader" : "Predictor"}</div>
            <h2>{i === 0 ? "🏆 " : ""}{score.name}</h2>
            <div className="score">{score.total}</div>
            <div className="muted">Daily winners: {score.dailyWinner}</div>
            <div className="muted">Best players: {score.dailyBestPlayer}</div>
            <div className="muted">Series winners: {score.seriesWinner}</div>
            <div className="muted">Series games: {score.seriesGames}</div>
          </div>
        ))}
        <div className="card">
          <h2>Predictors</h2>
          {state.predictors.map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <input className="input" value={p} onChange={(e) => renamePredictor(i, e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <div>
            <h2>1. Daily game predictions</h2>
            <p className="muted">Each correct actual winner = 1 point. Each correct best player = 1 point.</p>
          </div>
          <button className="btn" onClick={addDailyGame}>Add game</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Visitor</th>
                <th>Home</th>
                {state.predictors.map((p) => <th key={p}>{p} winner</th>)}
                {state.predictors.map((p) => <th key={`${p}-bp`}>{p} best player</th>)}
                <th>Actual winner</th>
                <th>Actual best player</th>
              </tr>
            </thead>
            <tbody>
              {state.dailyGames.map((game, gameIndex) => (
                <tr key={game.id}>
                  <td><input className="input" type="date" value={game.date} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(state)) as AppState;
                    next.dailyGames[gameIndex].date = e.target.value;
                    updateState(next);
                  }} /></td>
                  <td><input className="input" value={game.visitor} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(state)) as AppState;
                    next.dailyGames[gameIndex].visitor = e.target.value;
                    updateState(next);
                  }} /></td>
                  <td><input className="input" value={game.home} onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(state)) as AppState;
                    next.dailyGames[gameIndex].home = e.target.value;
                    updateState(next);
                  }} /></td>
                  {state.predictors.map((p) => (
                    <td key={p} className={game.actualWinner ? (game.predictions[p]?.winner === game.actualWinner ? "ok" : "bad") : ""}>
                      <select value={game.predictions[p]?.winner || ""} onChange={(e) => {
                        const next = JSON.parse(JSON.stringify(state)) as AppState;
                        next.dailyGames[gameIndex].predictions[p].winner = e.target.value;
                        updateState(next);
                      }}>
                        <option value="">Choose</option>
                        <option value={game.visitor}>{game.visitor}</option>
                        <option value={game.home}>{game.home}</option>
                      </select>
                    </td>
                  ))}
                  {state.predictors.map((p) => (
                    <td key={`${p}-bp`} className={game.actualBestPlayer ? (game.predictions[p]?.bestPlayer.trim().toLowerCase() === game.actualBestPlayer.trim().toLowerCase() ? "ok" : "bad") : ""}>
                      <input className="input" value={game.predictions[p]?.bestPlayer || ""} placeholder="Player name" onChange={(e) => {
                        const next = JSON.parse(JSON.stringify(state)) as AppState;
                        next.dailyGames[gameIndex].predictions[p].bestPlayer = e.target.value;
                        updateState(next);
                      }} />
                    </td>
                  ))}
                  <td>
                    <select value={game.actualWinner} onChange={(e) => {
                      const next = JSON.parse(JSON.stringify(state)) as AppState;
                      next.dailyGames[gameIndex].actualWinner = e.target.value;
                      updateState(next);
                    }}>
                      <option value="">Pending</option>
                      <option value={game.visitor}>{game.visitor}</option>
                      <option value={game.home}>{game.home}</option>
                    </select>
                  </td>
                  <td><input className="input" value={game.actualBestPlayer} placeholder="Actual best player" onChange={(e) => {
                    const next = JSON.parse(JSON.stringify(state)) as AppState;
                    next.dailyGames[gameIndex].actualBestPlayer = e.target.value;
                    updateState(next);
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <div>
            <h2>2. Playoff bracket predictions</h2>
            <p className="muted">Correct series winner = 2 points. Correct number of games = 1 point.</p>
          </div>
          <button className="btn" onClick={addSeries}>Add series</button>
        </div>

        {state.playoffSeries.map((series, seriesIndex) => (
          <div className="series" key={series.id}>
            <div>
              <label className="muted">Series</label>
              <input className="input" value={series.round} onChange={(e) => {
                const next = JSON.parse(JSON.stringify(state)) as AppState;
                next.playoffSeries[seriesIndex].round = e.target.value;
                updateState(next);
              }} style={{ marginBottom: 8 }} />
              <div className="row">
                <input className="input" style={{ flex: 1 }} value={series.teamA} onChange={(e) => {
                  const next = JSON.parse(JSON.stringify(state)) as AppState;
                  next.playoffSeries[seriesIndex].teamA = e.target.value;
                  updateState(next);
                }} />
                <span>vs</span>
                <input className="input" style={{ flex: 1 }} value={series.teamB} onChange={(e) => {
                  const next = JSON.parse(JSON.stringify(state)) as AppState;
                  next.playoffSeries[seriesIndex].teamB = e.target.value;
                  updateState(next);
                }} />
              </div>
            </div>

            {state.predictors.map((p) => (
              <div key={p}>
                <label className="muted">{p} prediction</label>
                <select value={series.predictions[p]?.winner || ""} onChange={(e) => {
                  const next = JSON.parse(JSON.stringify(state)) as AppState;
                  next.playoffSeries[seriesIndex].predictions[p].winner = e.target.value;
                  updateState(next);
                }} className={series.actualWinner ? (series.predictions[p]?.winner === series.actualWinner ? "ok" : "bad") : ""}>
                  <option value="">Winner</option>
                  <option value={series.teamA}>{series.teamA}</option>
                  <option value={series.teamB}>{series.teamB}</option>
                </select>
                <select value={series.predictions[p]?.games || ""} onChange={(e) => {
                  const next = JSON.parse(JSON.stringify(state)) as AppState;
                  next.playoffSeries[seriesIndex].predictions[p].games = e.target.value;
                  updateState(next);
                }} className={series.actualGames ? (series.predictions[p]?.games === series.actualGames ? "ok" : "bad") : ""} style={{ marginTop: 8 }}>
                  <option value="">Games</option>
                  {[4,5,6,7].map((n) => <option key={n} value={String(n)}>{n} games</option>)}
                </select>
              </div>
            ))}

            <div>
              <label className="muted">Actual result</label>
              <select value={series.actualWinner} onChange={(e) => {
                const next = JSON.parse(JSON.stringify(state)) as AppState;
                next.playoffSeries[seriesIndex].actualWinner = e.target.value;
                updateState(next);
              }}>
                <option value="">Pending</option>
                <option value={series.teamA}>{series.teamA}</option>
                <option value={series.teamB}>{series.teamB}</option>
              </select>
              <select value={series.actualGames} onChange={(e) => {
                const next = JSON.parse(JSON.stringify(state)) as AppState;
                next.playoffSeries[seriesIndex].actualGames = e.target.value;
                updateState(next);
              }} style={{ marginTop: 8 }}>
                <option value="">Games played</option>
                {[4,5,6,7].map((n) => <option key={n} value={String(n)}>{n} games</option>)}
              </select>
            </div>
          </div>
        ))}
      </section>

      <p className="muted" style={{ marginTop: 18 }}>Current version saves in this browser only. The next step is Supabase if you want Kristaps and Ronalds to use the same live game from different devices.</p>
    </main>
  );
}
