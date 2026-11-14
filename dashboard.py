"""League warehouse dashboard and player game-log explorer."""
from pathlib import Path

import duckdb
import streamlit as st

SNAPSHOT = Path(__file__).resolve().parent / "data" / "league.parquet"
FEATURED = {
    "Stephen Curry": "201939",
    "Victor Wembanyama": "1641705",
    "Shai Gilgeous-Alexander": "1628983",
    "Nikola Jokić": "203999",
    "Luka Dončić": "1629029",
    "Anthony Edwards": "1630162",
    "Giannis Antetokounmpo": "203507",
    "Jalen Brunson": "1628973",
    "Cade Cunningham": "1630595",
    "Jayson Tatum": "1628369",
    "Kawhi Leonard": "202695",
    "Tyrese Haliburton": "1630169",
    "Tyrese Maxey": "1630178",
    "Donovan Mitchell": "1628378",
    "Kevin Durant": "201142",
    "Karl-Anthony Towns": "1626157",
    "Jaylen Brown": "1627759",
    "Scottie Barnes": "1630567",
    "LeBron James": "2544",
    "Jalen Williams": "1631114",
}

st.set_page_config(page_title="NBA Cloud Data Platform", page_icon="🏀", layout="wide")


@st.cache_data(max_entries=2)
def overview(version):
    with duckdb.connect(config={"threads": 2}) as db:
        return db.execute("""
            SELECT count(*) appearances, count(DISTINCT game_id) games,
                   count(DISTINCT player_id) players, max(game_date) through
            FROM read_parquet(?)
        """, [str(SNAPSHOT)]).fetchone()


@st.cache_data(max_entries=32)
def player_games(version, player_id):
    with duckdb.connect(config={"threads": 2}) as db:
        return db.execute("""
            SELECT game_date AS Date, printf('%d-%02d', season - 1, season % 100) AS Season,
                   pts AS PTS, reb AS REB, ast AS AST, fg3m AS "3PM",
                   round(minutes, 1) AS Minutes, game_id
            FROM read_parquet(?) WHERE player_id = ? ORDER BY game_date DESC
        """, [str(SNAPSHOT), player_id]).df()


st.title("NBA Cloud Data Platform")
st.caption("NBA regular-season warehouse · Player game logs")
if not SNAPSHOT.is_file():
    st.error("Run the data refresh to build the league snapshot.")
    st.stop()

version = SNAPSHOT.stat().st_mtime_ns
appearances, games, players, through = overview(version)
for column, (label, value) in zip(st.columns(4), [
    ("Player appearances", f"{appearances:,}"), ("Games", f"{games:,}"),
    ("Players", f"{players:,}"), ("Data through", str(through)),
]):
    column.metric(label, value)

with st.sidebar:
    name = st.selectbox("Featured player", list(FEATURED))
    custom_id = st.text_input("Other NBA player ID", placeholder="Optional").strip()

player_id = custom_id or FEATURED[name]
if not player_id.isascii() or not player_id.isdigit():
    st.warning("Enter a numeric NBA player ID.")
    st.stop()

rows = player_games(version, player_id)
if rows.empty:
    st.info("This player has no recorded appearances in the snapshot.")
    st.stop()

st.header(name if not custom_id else f"Player {player_id}")
season = st.selectbox("Season", rows.Season.unique())
selected = rows.loc[rows.Season.eq(season)]
for column, (label, value) in zip(st.columns(4), [
    ("Appearances", len(selected)), ("Points per game", f"{selected.PTS.mean():.1f}"),
    ("Assists per game", f"{selected.AST.mean():.1f}"), ("Threes per game", f"{selected['3PM'].mean():.1f}"),
]):
    column.metric(label, value)

st.subheader("Scoring by appearance")
scoring = selected.sort_values("Date").reset_index(drop=True)
scoring.index = scoring.index + 1
scoring.index.name = "Appearance"
st.line_chart(scoring[["PTS"]], color="#ff9259")
st.dataframe(selected.drop(columns="game_id"), hide_index=True)
st.download_button("Download season CSV", selected.to_csv(index=False), "player-season.csv", "text/csv")
