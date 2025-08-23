# Anthony Edwards Real-Time Stats Pipeline

--

## Why I Built This

This project simulates a real-time data pipeline designed to track **Anthony Edwards’ performance during the NBA Playoffs**, specifically as he leads the Minnesota Timberwolves through the Western Conference Finals for 2 years straight. His Growth is legendary, knocking out the GOAT's like Kevin Durant, LeBron James, and recently Steph Curry (even though he was injured).

As a former pro basketball player and data engineer, I'm passionate about building sports-related data systems that fuel my passion for sports

## Live App

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://anthony-edwards-pipeline-by-mt.streamlit.app/)

This app is built with Python, DuckDB, and Streamlit to track Anthony Edwards' game performance — including playoffs!

---

## Project Overview

This end-to-end pipeline:
- Ingests live NBA data using the `nba_api`
- Cleans and transforms the data with Python (`pandas`)
- Stores analytics-ready data in a local warehouse (`DuckDB`)
- Visualizes player performance with an interactive dashboard (`Streamlit`)
- Can be extended for real-time betting, fantasy, or team analytics use cases

---

## Challenges Faced

- **Real-Time Data Fetching:** Scheduling and testing live data pulls using Python required learning how to handle API timeouts and failures.

- **Building with DuckDB:** As a new tool for me, DuckDB’s in-memory SQL processing was powerful but had a learning curve around file storage and schema behavior.

- **Automating the Pipeline:** Implementing clean orchestration logic using Python functions and script separation taught me how to write scalable code.


## Tech Stack

| Layer             | Tools Used                      |
|------------------|----------------------------------|
| Ingestion        | `nba_api`                        |
| Transformation   | `pandas`, `python`               |
| Data Storage     | `DuckDB` (lightweight SQL DB)    |
| Visualization    | `Streamlit`                      |
| Automation Ready | `Manual Trigger Playoffs Only`   |
| Version Control  | `Git + GitHub`                   |

---

## Dashboard Preview

Launch the dashboard locally:
```bash
streamlit run dashboard.py

## Project Structure

anthony_edwards_pipeline/
├── data/ # Raw + clean data files and DuckDB warehouse
├── fetch.py # Pulls Anthony Edwards game logs using nba_api
├── transform.py # Cleans and formats the raw stats
├── load.py # Loads data into DuckDB
├── orchestrator.py # Runs full ETL pipeline
├── dashboard.py # Streamlit dashboard to view stats
├── query_check.py # Debugging file to inspect DuckDB tables
├── requirements.txt # Python dependencies
├── .gitignore # Files to exclude from Git
└── README.md # Project overview

How to Run It Locally

## How to Run It Locally

```bash
# 1. Clone this repository
git clone https://github.com/Mykeil-tzul/anthony-edwards-pipeline.git
cd anthony-edwards-pipeline

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Mac/Linux
# or
venv\Scripts\activate      # On Windows

# 3. Install required packages
pip install -r requirements.txt

# 4. Run the full pipeline
python orchestrator.py

# 5. Launch the dashboard
streamlit run dashboard.py



---

- LinkedIn: *(https://www.linkedin.com/in/mykeil-tzul-8a7682206/)*

