from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

import duckdb
from streamlit.testing.v1 import AppTest

from warehouse.pipeline import build_snapshot


class WarehouseTests(unittest.TestCase):
    def test_rerun_and_conflicting_input(self):
        with TemporaryDirectory() as directory, duckdb.connect() as db:
            source = Path(directory) / "source.parquet"
            target = Path(directory) / "warehouse.parquet"
            db.execute("""
                CREATE TABLE fixture AS SELECT 2027 season, '0022600001' game_id,
                '201939' player_id, '1610612744' team_id, '1610612747' opp_team_id,
                DATE '2026-10-21' game_date, true home, 30.0 min,
                25 pts, 4 reb, 7 ast, 17 fga, 4 fta, 3 fg3m
            """)
            db.table("fixture").write_parquet(str(source))
            args = ({2027: source}, target, date(2026, 11, 14))
            result = build_snapshot(*args)
            self.assertEqual(result["appearances"], 1)
            self.assertEqual(result, build_snapshot(*args))
            db.execute("INSERT INTO fixture SELECT * REPLACE (26 AS pts) FROM fixture")
            db.table("fixture").write_parquet(str(source))
            with self.assertRaisesRegex(ValueError, "conflicting"):
                build_snapshot(*args)
            self.assertEqual(db.read_parquet(str(target)).fetchone()[8], 25)

    def test_dashboard_defaults_to_curry_and_loads_all_featured_players(self):
        app = AppTest.from_file("dashboard.py", default_timeout=25).run()
        self.assertFalse(app.exception)
        self.assertEqual(app.sidebar.selectbox[0].value, "Stephen Curry")
        self.assertEqual(len(app.metric), 8)
        options = app.sidebar.selectbox[0].options
        self.assertEqual(len(options), 20)
        for name in options:
            with self.subTest(player=name):
                app.sidebar.selectbox[0].set_value(name).run()
                self.assertFalse(app.exception)
                self.assertEqual(app.header[0].value, name)
                self.assertEqual(len(app.metric), 8)
