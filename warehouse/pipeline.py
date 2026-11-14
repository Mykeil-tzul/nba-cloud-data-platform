"""Refresh completed NBA regular-season appearances and publish a validated snapshot."""
import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from zoneinfo import ZoneInfo

import duckdb
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "league.parquet"
BASE = "https://basketball-data.billmill.org/nba/stats/player_game_logs"
YEARS = range(2023, 2028)


def today():
    return datetime.now(ZoneInfo("America/New_York")).date()


def download(session, year, path):
    url = f"{BASE}/season={year}/data.parquet"
    with session.get(url, timeout=(5, 30), stream=True) as response:
        response.raise_for_status()
        with path.open("wb") as file:
            for chunk in response.iter_content(chunk_size=65536):
                file.write(chunk)


def build_snapshot(inputs, output, as_of=None):
    """Rebuild the historical snapshot atomically. Repeated inputs give the same rows."""
    as_of = as_of or today()
    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output.parent) as directory, duckdb.connect() as db:
        temporary = Path(directory) / "league.parquet"
        db.execute("SET threads = 2")
        db.execute("""
            CREATE TEMP TABLE appearances AS
            SELECT DISTINCT CAST(season AS INTEGER) AS season, game_id, player_id, team_id,
                   opp_team_id AS opponent_id, CAST(game_date AS DATE) AS game_date,
                   home, min AS minutes, pts, reb, ast, fga, fta, fg3m
            FROM read_parquet(?)
            WHERE regexp_full_match(game_id, '002[0-9]{7}')
                AND substr(game_id, 4, 2) = CAST((season - 1) % 100 AS VARCHAR)
                AND (min > 0 OR min IS NULL)
        """, [[str(path) for path in inputs.values()]])
        counts = dict(db.execute("SELECT season, count(*) FROM appearances GROUP BY season").fetchall())
        if not counts or set(counts) != set(inputs):
            raise ValueError("Missing or unexpected season coverage")
        invalid = db.execute("""
            SELECT count(*) FROM appearances
            WHERE game_date IS NULL OR game_date > ?
               OR player_id IS NULL OR team_id IS NULL OR opponent_id IS NULL OR team_id = opponent_id
               OR minutes IS NULL OR NOT isfinite(minutes) OR minutes <= 0
               OR pts IS NULL OR reb IS NULL OR ast IS NULL OR fga IS NULL OR fta IS NULL OR fg3m IS NULL
               OR least(pts, reb, ast, fga, fta, fg3m) < 0 OR fg3m > fga
        """, [as_of]).fetchone()[0]
        duplicates = db.execute("""
            SELECT count(*) FROM (
                SELECT game_id, player_id FROM appearances GROUP BY ALL HAVING count(*) > 1
            )
        """).fetchone()[0]
        if invalid or duplicates:
            raise ValueError(f"Rejected snapshot: {invalid} invalid rows, {duplicates} conflicting keys")
        if output.exists():
            missing = db.execute("""
                SELECT count(*) FROM (
                    SELECT season, game_id, player_id FROM read_parquet(?)
                    WHERE season IN (SELECT DISTINCT season FROM appearances)
                    EXCEPT SELECT season, game_id, player_id FROM appearances
                )
            """, [str(output)]).fetchone()[0]
            old_seasons = set(row[0] for row in db.execute(
                "SELECT DISTINCT season FROM read_parquet(?)", [str(output)]
            ).fetchall())
            if missing or old_seasons - set(counts):
                raise ValueError("Refresh dropped previously published games or seasons")
        db.sql("SELECT * FROM appearances ORDER BY season, game_date, game_id, player_id").write_parquet(
            str(temporary), compression="zstd"
        )
        summary = db.execute("""
            SELECT count(*), count(DISTINCT game_id), count(DISTINCT player_id), min(game_date), max(game_date)
            FROM appearances
        """).fetchone()
        temporary.replace(output)
    return {
        "appearances": summary[0], "games": summary[1], "players": summary[2],
        "from": str(summary[3]), "through": str(summary[4]), "season_counts": counts,
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive-dir", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    as_of = today()
    years = [year for year in YEARS if (as_of.year, as_of.month) >= (year - 1, 10)]
    with TemporaryDirectory() as directory, requests.Session() as session:
        session.mount("https://", HTTPAdapter(max_retries=Retry(
            total=2, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504],
        )))
        source = args.archive_dir or Path(directory)
        inputs = {year: source / f"{year}.parquet" for year in years}
        if not args.archive_dir:
            for year, path in inputs.items():
                download(session, year, path)
        summary = build_snapshot(inputs, args.output, as_of)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
