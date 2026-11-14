"""Publish an already validated warehouse snapshot to BigQuery."""
import argparse
import re
from pathlib import Path

from warehouse.pipeline import DEFAULT_OUTPUT


def main():
    from google.cloud import bigquery

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--dataset", default="nba")
    parser.add_argument("--location", default="US")
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z][a-z0-9-]+", args.project) or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", args.dataset):
        parser.error("Provide a valid project ID and dataset ID")
    client = bigquery.Client(project=args.project, location=args.location)
    dataset = f"{args.project}.{args.dataset}"
    destination = f"{dataset}.player_appearances"
    config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.PARQUET,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        time_partitioning=bigquery.TimePartitioning(field="game_date"),
        clustering_fields=["player_id", "team_id"],
    )
    with args.snapshot.open("rb") as file:
        job = client.load_table_from_file(file, destination, job_config=config)
        job.result()
    client.query(f"""
        CREATE OR REPLACE VIEW `{dataset}.games` AS
        SELECT season, game_id, game_date, COUNT(*) AS player_appearances
        FROM `{destination}` GROUP BY season, game_id, game_date
    """).result()
    print(f"{job.output_rows} appearances published to {destination} (job {job.job_id})")


if __name__ == "__main__":
    main()
