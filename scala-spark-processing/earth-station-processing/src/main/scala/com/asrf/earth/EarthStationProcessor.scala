package com.asrf.earth

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

/**
 * ==============================================================================
 * ASRF: Autonomous Spacecraft Recovery Framework
 * Module: Earth Station Telemetry Processing (Ground Station Flight Dynamics)
 *
 * Demonstrates isolated, high-throughput ground-station telemetry processing
 * received from deep space exploration probes using Scala and Apache Spark.
 *
 * Mandatory Transformations Demonstrated:
 *  - map()
 *  - filter()
 *  - flatMap()
 *  - select()
 *  - withColumn()
 *  - drop()
 *  - groupBy()
 *  - agg()
 *  - join()
 *  - orderBy()
 *
 * Mandatory Actions Demonstrated:
 *  - count()
 *  - show()
 *  - collect() (bounded)
 *  - first()
 *  - take()
 *  - foreach()
 *  - write()
 * ==============================================================================
 */
case class EarthPacket(
  packet_seq_id: java.lang.Integer,
  probe_transmit_time: String,
  earth_receive_time: String,
  ground_station_id: String,
  subsystem: String,
  component_id: String,
  channel: String,
  received_signal_dbm: java.lang.Double,
  snr_db: java.lang.Double,
  telemetry_payload_value: java.lang.Double,
  payload_unit: String,
  crc_valid: java.lang.Boolean
)

object EarthStationProcessor {

  def main(args: Array[String]): Unit = {
    println("================================================================================")
    println("  ASRF — EARTH STATION TELEMETRY PROCESSING ENGINE (SCALA + APACHE SPARK)")
    println("================================================================================")

    // 1. Initialize local SparkSession
    val spark = SparkSession.builder()
      .appName("ASRF-EarthStationProcessor")
      .master("local[*]")
      .config("spark.driver.bindAddress", "127.0.0.1")
      .config("spark.ui.enabled", "false")
      .getOrCreate()

    import spark.implicits._

    val inputPath = "earth-station-processing/data/earth_received_telemetry.csv"
    val altInputPath = "data/earth_received_telemetry.csv"
    val actualInputPath = if (new java.io.File(inputPath).exists()) inputPath else altInputPath

    val metadataPath = "earth-station-processing/data/probe_metadata.csv"
    val altMetadataPath = "data/probe_metadata.csv"
    val actualMetadataPath = if (new java.io.File(metadataPath).exists()) metadataPath else altMetadataPath

    println(s"[1. RECEPTION] Ingesting received ground-station packet telemetry from: $actualInputPath")

    // 2. Strict Schema Validation
    val earthSchema = StructType(Array(
      StructField("packet_seq_id", IntegerType, nullable = false),
      StructField("probe_transmit_time", StringType, nullable = false),
      StructField("earth_receive_time", StringType, nullable = false),
      StructField("ground_station_id", StringType, nullable = false),
      StructField("subsystem", StringType, nullable = false),
      StructField("component_id", StringType, nullable = false),
      StructField("channel", StringType, nullable = false),
      StructField("received_signal_dbm", DoubleType, nullable = true),
      StructField("snr_db", DoubleType, nullable = true),
      StructField("telemetry_payload_value", DoubleType, nullable = true),
      StructField("payload_unit", StringType, nullable = true),
      StructField("crc_valid", BooleanType, nullable = false)
    ))

    val rawPacketsDf = spark.read
      .option("header", "true")
      .schema(earthSchema)
      .csv(actualInputPath)

    // ACTION: count()
    val totalReceivedPackets = rawPacketsDf.count()
    println(s"[ACTION: count()] Total packets downlinked from space probe: $totalReceivedPackets")

    // ACTION: show()
    println("\n--- Received Downlink Telemetry Packets ---")
    rawPacketsDf.show(5, truncate = false)

    // 3. TRANSFORMATION: filter() (Data cleaning: verify CRC checksum and non-null signal)
    val verifiedPacketsDf = rawPacketsDf
      .filter($"crc_valid" === true && $"received_signal_dbm".isNotNull && $"telemetry_payload_value" =!= -999.0)

    println(s"[TRANSFORMATION: filter()] Packets passing hardware CRC-32 validation: ${verifiedPacketsDf.count()}")

    // 4. TRANSFORMATION: withColumn() (Data transformation & latency calculation)
    val enrichedDownlinkDf = verifiedPacketsDf
      .withColumn("tx_timestamp", to_timestamp($"probe_transmit_time", "yyyy-MM-dd'T'HH:mm:ss'Z'"))
      .withColumn("rx_timestamp", to_timestamp($"earth_receive_time", "yyyy-MM-dd'T'HH:mm:ss'Z'"))
      .withColumn("one_way_light_time_seconds",
        unix_timestamp($"rx_timestamp") - unix_timestamp($"tx_timestamp")
      )
      .withColumn("link_margin_db", round($"snr_db" - 12.0, 2))
      .withColumn("signal_quality_grade",
        when($"snr_db" >= 20.0, "EXCELLENT")
          .when($"snr_db" >= 17.0, "GOOD")
          .when($"snr_db" >= 15.0, "MARGINAL")
          .otherwise("DEGRADED")
      )

    // 5. TRANSFORMATION: drop() (Drop redundant raw verification flags)
    val cleanDownlinkDf = enrichedDownlinkDf.drop("crc_valid", "tx_timestamp", "rx_timestamp")

    // 6. TRANSFORMATION: select() (Feature preparation for Earth Station analytics)
    val telemetryFeaturesDf = cleanDownlinkDf.select(
      $"packet_seq_id",
      $"ground_station_id",
      $"subsystem",
      $"component_id",
      $"channel",
      $"telemetry_payload_value",
      $"payload_unit",
      $"snr_db",
      $"one_way_light_time_seconds",
      $"signal_quality_grade"
    )

    // 7. TRANSFORMATION: join() (Enrich with Subsystem Flight Calibration Metadata)
    val metadataDf = spark.read
      .option("header", "true")
      .option("inferSchema", "true")
      .csv(actualMetadataPath)

    println("\n--- Spacecraft Subsystem Flight Metadata ---")
    metadataDf.show(8, truncate = false)

    val enrichedWithMetadataDf = telemetryFeaturesDf.join(
      metadataDf,
      Seq("subsystem"),
      "inner"
    )

    // 8. TRANSFORMATION: groupBy() and agg() (Station-wise and Subsystem-wise Telemetry Aggregation)
    val stationSummaryDf = enrichedWithMetadataDf
      .groupBy("ground_station_id", "subsystem", "telemetry_priority")
      .agg(
        count("packet_seq_id").as("packets_received"),
        round(avg("telemetry_payload_value"), 3).as("mean_telemetry_reading"),
        round(avg("snr_db"), 2).as("average_snr_db"),
        round(avg("one_way_light_time_seconds"), 1).as("mean_light_time_sec"),
        first("subsystem_lead").as("engineering_lead"),
        first("calibration_matrix_id").as("calibration_matrix")
      )

    // 9. TRANSFORMATION: orderBy() (Order summary by telemetry priority and packet count)
    val sortedStationSummary = stationSummaryDf.orderBy(
      desc("packets_received"),
      asc("ground_station_id"),
      asc("subsystem")
    )

    println("\n--- [TRANSFORMATION: groupBy() + agg() + orderBy()] Ground Station Telemetry Reception Summary ---")
    sortedStationSummary.show(10, truncate = false)

    // 10. TRANSFORMATION: map() on Dataset (Convert typed packet to formatted telemetry report line)
    val typedPackets = rawPacketsDf.as[EarthPacket]
    val mappedReportLines = typedPackets.map(packet =>
      s"[PACKET #${packet.packet_seq_id}] Ground=${packet.ground_station_id} Subsys=${packet.subsystem} Signal=${packet.snr_db}dB CRC=${packet.crc_valid}"
    )

    // 11. TRANSFORMATION: flatMap() (Tokenize flight dispatch messages)
    val tokenizedDispatchWords = mappedReportLines.flatMap(line => line.split("[\\s\\[\\]#=]+").filter(_.nonEmpty))
    println(s"[TRANSFORMATION: flatMap()] Dispatched token count: ${tokenizedDispatchWords.count()}")

    // 12. SPARK ACTIONS DEMONSTRATION

    // ACTION: first()
    val firstPacket = telemetryFeaturesDf.first()
    println(s"\n[ACTION: first()] First verified Earth ground packet: SeqID=${firstPacket.getAs[Int]("packet_seq_id")}, Station=${firstPacket.getAs[String]("ground_station_id")}, Component=${firstPacket.getAs[String]("component_id")}, Value=${firstPacket.getAs[Double]("telemetry_payload_value")}")

    // ACTION: take()
    val sampleDownlinkPackets = telemetryFeaturesDf.take(3)
    println(s"\n[ACTION: take(3)] Retrieved ${sampleDownlinkPackets.length} downlink packets:")
    sampleDownlinkPackets.foreach(p =>
      println(s"  - Seq #${p.getAs[Int]("packet_seq_id")} [${p.getAs[String]("ground_station_id")}]: Subsystem=${p.getAs[String]("subsystem")}, SNR=${p.getAs[Double]("snr_db")} dB, OWLT=${p.getAs[Long]("one_way_light_time_seconds")}s")
    )

    // ACTION: collect() on bounded results
    val topStations = sortedStationSummary.limit(4).collect()
    println(s"\n[ACTION: collect()] Collected ${topStations.length} station aggregates to driver:")
    topStations.foreach(row =>
      println(s"  * Station: ${row.getAs[String]("ground_station_id")} | Subsystem: ${row.getAs[String]("subsystem")} | Packets: ${row.getAs[Long]("packets_received")} | Mean SNR: ${row.getAs[Double]("average_snr_db")} dB")
    )

    // ACTION: foreach()
    println("\n[ACTION: foreach()] Dispatching ground-station telemetry broadcast:")
    telemetryFeaturesDf.limit(3).foreach(row =>
      println(s"  >>> Ground Telemetry Relay: Subsystem=${row.getAs[String]("subsystem")} | Channel=${row.getAs[String]("channel")} | Quality=${row.getAs[String]("signal_quality_grade")}")
    )

    // ACTION: write() - Persist processed output
    val outputPath = "scala-spark-processing/earth-station-processing/output/processed_earth_telemetry"
    println(s"\n[ACTION: write()] Writing processed Earth Station telemetry to: $outputPath")
    sortedStationSummary
      .coalesce(1)
      .write
      .mode("overwrite")
      .option("header", "true")
      .csv(outputPath)

    println("================================================================================")
    println("  EARTH STATION PROCESSING COMPLETE — STRUCTURED TELEMETRY STORED")
    println("================================================================================")

    spark.stop()
  }
}
