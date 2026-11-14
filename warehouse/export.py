"""Export the five CourtIQ players in the dashboard's existing CSV schema."""
import argparse
from pathlib import Path

import duckdb

from warehouse.pipeline import DEFAULT_OUTPUT

COURTIQ_IDS = ["1629029", "202681", "1628369", "1628983", "1628973"]
TEAMS = dict(zip(
    [str(number) for number in range(1610612737, 1610612767)],
    "ATL BOS CLE NOP CHI DAL DEN GSW HOU LAC LAL MIA MIL MIN BKN NYK ORL IND PHI PHX POR SAC SAS OKC TOR UTA MEM WAS DET CHA".split(),
))


def export(snapshot, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    with duckdb.connect() as db:
        db.execute("CREATE TEMP TABLE teams (id VARCHAR, abbreviation VARCHAR)")
        db.executemany("INSERT INTO teams VALUES (?, ?)", list(TEAMS.items()))
        db.sql("""
                SELECT CAST(player_id AS INTEGER) AS player_id, game_id, game_date,
                       printf('%d-%02d', season - 1, season % 100) AS season,
                       coalesce(t.abbreviation, a.team_id) ||
                       CASE WHEN home THEN ' vs. ' WHEN NOT home THEN ' @ ' ELSE ' / ' END ||
                       coalesce(o.abbreviation, a.opponent_id) AS matchup,
                       pts, reb, ast, minutes, fga, fta
                FROM read_parquet(?) a
                LEFT JOIN teams t ON a.team_id = t.id
                LEFT JOIN teams o ON a.opponent_id = o.id
                WHERE player_id IN (SELECT unnest(?))
                ORDER BY game_date, player_id
        """, params=[str(snapshot), COURTIQ_IDS]).write_csv(str(output), header=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    export(args.snapshot, args.output)


if __name__ == "__main__":
    main()
