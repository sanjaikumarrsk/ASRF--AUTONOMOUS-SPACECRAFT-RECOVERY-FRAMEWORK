# ASRF — Isolated Scala & Apache Spark Telemetry Processing Modules

This directory contains standalone, isolated Scala and Apache Spark implementations for the **Autonomous Spacecraft Recovery Framework (ASRF)**.

> **Strict Isolation Notice:**  
> These modules are purely standalone technical demonstrations and educational implementations. They are completely decoupled from FastAPI, PostgreSQL, the live simulation telemetry generator, the LSTM/PPO AI models, and the React frontend.

---

## 1. Directory Structure

```text
scala-spark-processing/
├── build.sbt                              # Root multi-project SBT build configuration
├── project/
│   └── build.properties                   # SBT version specification (1.9.8)
├── probe-telemetry-processing/
│   ├── build.sbt                          # Module-specific SBT build definition
│   ├── data/
│   │   ├── probe_raw_telemetry.csv        # Raw sensor telemetry (with nulls, duplicates)
│   │   └── subsystem_thresholds.csv       # Safety envelopes & protocols (for join)
│   ├── src/main/scala/com/asrf/probe/
│   │   └── ProbeTelemetryProcessor.scala  # Executable onboard probe telemetry pipeline
│   └── output/                            # Processed output destination (write action)
├── earth-station-processing/
│   ├── build.sbt                          # Module-specific SBT build definition
│   ├── data/
│   │   ├── earth_received_telemetry.csv   # Received downlink packets (CRC, SNR, timestamps)
│   │   └── probe_metadata.csv             # Subsystem engineering leads & calibration IDs
│   ├── src/main/scala/com/asrf/earth/
│   │   └── EarthStationProcessor.scala    # Executable ground-station telemetry pipeline
│   └── output/                            # Processed output destination (write action)
└── README.md                              # Technical guide & execution instructions
```

---

## 2. Module 1: Probe Telemetry Processing (`probe-telemetry-processing`)

Located in `probe-telemetry-processing/src/main/scala/com/asrf/probe/ProbeTelemetryProcessor.scala`, this module simulates onboard spacecraft telemetry acquisition and preparation:

- **Ingestion & Schema:** Defines explicit `StructType` schema and ingests sensor data from `data/probe_raw_telemetry.csv`.
- **Data Validation & Cleaning:** Filters out uncalibrated/corrupted readings and drops duplicate records using `.dropDuplicates(Seq("timestamp", "component_id", "parameter"))`.
- **Feature Engineering:** Adds calibrated sensor values, baseline variance, windowed minutes, and discrete health risk classifications via `.withColumn()`.
- **Safety Correlation:** Joins telemetry streams with subsystem safety thresholds via `.join()`.
- **Aggregation:** Computes sample counts, mean values, minimums, maximums, standard deviations, and limits per subsystem using `.groupBy()` and `.agg()`.

---

## 3. Module 2: Earth Station Processing (`earth-station-processing`)

Located in `earth-station-processing/src/main/scala/com/asrf/earth/EarthStationProcessor.scala`, this module simulates Deep Space Network (DSN) ground station reception and post-downlink telemetry structuring:

- **Packet Reception & Schema Validation:** Validates packet sequence IDs, reception timestamps, signal strength (dBm), and SNR.
- **Data Cleaning:** Validates hardware CRC-32 checksums (`crc_valid === true`) and filters missing sensor payloads.
- **Downlink Transformation & Latency:** Calculates One-Way Light Time (OWLT in seconds) between transmission and reception, derives link margins, and assigns signal quality grades (`EXCELLENT`, `GOOD`, `MARGINAL`, `DEGRADED`).
- **Metadata Enrichment:** Performs an inner join with flight subsystem metadata to attach subsystem engineering leads and calibration matrix IDs.
- **Ground Analytics:** Groups downlinked telemetry by ground station and subsystem to assess reception health and packet throughput.

---

## 4. Mandatory Apache Spark Transformations Implemented

| Spark Transformation | Location in Code | Purpose |
| :--- | :--- | :--- |
| `filter()` | Both processors | Removes corrupt sensor states, null readings, and invalid CRC packets |
| `drop()` | Both processors | Prunes temporary raw columns and unneeded intermediate headers |
| `withColumn()` | Both processors | Feature engineering: calibrations, latency calculations, risk flags |
| `select()` | Both processors | Explicit projection of telemetry feature columns |
| `join()` | Both processors | Enriches telemetry with subsystem safety limits and calibration metadata |
| `groupBy()` | Both processors | Groups telemetry by subsystem and ground station |
| `agg()` | Both processors | Computes `count`, `avg`, `min`, `max`, `stddev`, and `first` metrics |
| `orderBy()` | Both processors | Sorts processed metrics by priority and sample counts |
| `map()` | Both processors | Typed Dataset mapping converting records into diagnostic messages |
| `flatMap()` | Both processors | Tokenizes diagnostic messages into operational tokens |

---

## 5. Mandatory Apache Spark Actions Implemented

| Spark Action | Location in Code | Purpose |
| :--- | :--- | :--- |
| `count()` | Both processors | Verifies input record counts before and after filtering transformations |
| `show()` | Both processors | Formats and prints telemetry tables to console |
| `first()` | Both processors | Retrieves the earliest verified telemetry observation |
| `take(n)` | Both processors | Fetches the top *n* sample records without pulling full datasets to driver |
| `collect()` | Both processors | Safely gathers strictly bounded subsystem metrics to driver |
| `foreach()` | Both processors | Emits real-time telemetry heartbeat logs |
| `write()` | Both processors | Persists processed telemetry to structured CSV/JSON storage under `output/` |

---

## 6. How to Build & Run

### Prerequisites
- JDK 8, 11, or 17
- Apache Spark 3.4.x / 3.5.x
- Scala 2.12.18
- SBT 1.9.x

### Running via SBT (from `scala-spark-processing/` directory):

```bash
# Run Probe Telemetry Processor
sbt "probeTelemetryProcessing/run"

# Run Earth Station Telemetry Processor
sbt "earthStationProcessing/run"
```

### Running independently from each module directory:

```bash
# In probe-telemetry-processing/
cd probe-telemetry-processing
sbt run

# In earth-station-processing/
cd ../earth-station-processing
sbt run
```
