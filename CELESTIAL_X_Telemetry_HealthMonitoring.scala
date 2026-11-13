import org.apache.spark.sql.{DataFrame, Row, SparkSession}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

object CELESTIAL_X_Telemetry_HealthMonitoring {



  case class SpacecraftTelemetry(
      timestamp: String,
      subsystemId: String,
      processorTemperature: Double,
      powerDraw: Double,
      batteryLevel: Double,
      communicationDelay: Double,
      thermalStatus: String,
      processorLoad: Double,
      memoryUsage: Double,
      storageUsage: Double,
      navigationStatus: String,
      sensorHealth: Double,
      systemState: String,
      faultType: String
  )

  private val validSubsystems = Seq(
    "POWER",
    "THERMAL",
    "FLIGHT_COMPUTER",
    "COMMUNICATION",
    "NAVIGATION",
    "MOBILITY",
    "SENSORS",
    "STORAGE"
  )

  private def printSection(title: String): Unit = {
    println("\n" + "=" * 76)
    println(title)
    println("=" * 76)
  }

  private def printStep(number: Int, title: String): Unit = {
    println(f"\n[$number%02d] $title")
    println("-" * 76)
  }

  // The recommendation is intentionally rule based. In the complete
  // CELESTIAL-X architecture, this processed state is supplied to the PPO
  // recovery policy, which selects the recovery action.
  private def recoveryRecommendation(
      subsystem: String,
      severity: String,
      thermalLoad: Boolean,
      lowBattery: Boolean,
      communicationFault: Boolean,
      criticalHealth: Boolean
  ): String = {
    if (criticalHealth) "SAFE_MODE"
    else if (thermalLoad) "PROCESSOR_RESTART"
    else if (lowBattery) "POWER_RECONFIGURATION"
    else if (communicationFault) "COMMUNICATION_RECONFIGURATION"
    else if (severity == "HIGH" || severity == "CRITICAL") "SUBSYSTEM_RESET"
    else "MONITOR_AND_CONTINUE"
  }

  // --------------------------------------------------------------------------
  // Main Spark demonstration
  // --------------------------------------------------------------------------

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("CELESTIAL-X Telemetry Health Monitoring")
      .master("local[*]")
      .config("spark.sql.shuffle.partitions", "4")
      .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")
    import spark.implicits._

    try {
      printSection("CELESTIAL-X TELEMETRY PROCESSING + HEALTH MONITORING")
      println("Standalone Spark + Scala research demonstration")
      println("Processing boundary: telemetry -> health monitoring -> fault screening")
      println("LSTM and PPO stages are intentionally outside this file.")

      // ----------------------------------------------------------------------
      // STEP 1 and STEP 2: Spark session and raw synthetic telemetry
      // ----------------------------------------------------------------------

      printStep(1, "SPARK SESSION")
      println("Application: CELESTIAL-X Telemetry Health Monitoring")
      println("Execution mode: local[*]")

      printStep(2, "RAW SPACECRAFT TELEMETRY")
      // The dataset is embedded so that the demonstration is completely
      // standalone and does not depend on an external CSV file.
      val rawRecords = Seq(
        SpacecraftTelemetry("2026-10-08T10:00:00Z", "POWER", 58.2, 82.0, 92.0, 10.2, "NOMINAL", 38.0, 42.0, 36.0, "NOMINAL", 98.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:05Z", "THERMAL", 61.4, 84.0, 91.8, 10.0, "NOMINAL", 41.0, 43.0, 36.2, "NOMINAL", 97.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:10Z", "FLIGHT_COMPUTER", 63.8, 88.0, 91.6, 11.0, "NOMINAL", 46.0, 48.0, 37.0, "NOMINAL", 96.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:15Z", "COMMUNICATION", 59.1, 79.0, 91.4, 12.4, "NOMINAL", 34.0, 40.0, 35.8, "NOMINAL", 98.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:20Z", "NAVIGATION", 57.6, 76.0, 91.2, 11.8, "NOMINAL", 32.0, 39.0, 35.4, "NOMINAL", 96.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:25Z", "MOBILITY", 64.0, 94.0, 91.0, 10.8, "NOMINAL", 48.0, 45.0, 38.0, "NOMINAL", 94.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:30Z", "SENSORS", 60.5, 81.0, 90.8, 10.5, "NOMINAL", 37.0, 44.0, 37.0, "NOMINAL", 95.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:00:35Z", "STORAGE", 62.0, 83.0, 90.6, 10.7, "NOMINAL", 39.0, 51.0, 44.0, "NOMINAL", 97.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:00Z", "POWER", 59.0, 86.0, 89.8, 10.9, "NOMINAL", 40.0, 43.0, 37.0, "NOMINAL", 97.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:05Z", "THERMAL", 65.2, 87.0, 89.6, 10.6, "NOMINAL", 43.0, 45.0, 37.1, "NOMINAL", 96.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:10Z", "FLIGHT_COMPUTER", 66.4, 91.0, 89.4, 11.2, "NOMINAL", 52.0, 55.0, 38.0, "NOMINAL", 95.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:15Z", "COMMUNICATION", 60.0, 81.0, 89.2, 13.0, "NOMINAL", 36.0, 41.0, 36.0, "NOMINAL", 97.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:20Z", "NAVIGATION", 58.4, 78.0, 89.0, 12.0, "NOMINAL", 34.0, 40.0, 35.8, "NOMINAL", 95.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:25Z", "MOBILITY", 65.1, 97.0, 88.8, 11.0, "NOMINAL", 51.0, 47.0, 39.0, "NOMINAL", 93.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:30Z", "SENSORS", 61.8, 84.0, 88.6, 11.3, "NOMINAL", 39.0, 46.0, 38.0, "NOMINAL", 94.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:01:35Z", "STORAGE", 63.4, 85.0, 88.4, 11.1, "NOMINAL", 42.0, 54.0, 46.0, "NOMINAL", 96.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:00Z", "POWER", 60.4, 90.0, 87.8, 11.4, "NOMINAL", 43.0, 45.0, 38.0, "NOMINAL", 96.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:05Z", "THERMAL", 69.2, 91.0, 87.6, 11.2, "NOMINAL", 49.0, 47.0, 38.0, "NOMINAL", 95.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:10Z", "FLIGHT_COMPUTER", 72.8, 98.0, 87.4, 12.2, "ELEVATED", 61.0, 63.0, 40.0, "NOMINAL", 93.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:15Z", "COMMUNICATION", 62.5, 84.0, 87.2, 15.1, "NOMINAL", 39.0, 44.0, 38.0, "NOMINAL", 96.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:20Z", "NAVIGATION", 60.0, 80.0, 87.0, 13.2, "NOMINAL", 37.0, 43.0, 37.0, "NOMINAL", 93.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:25Z", "MOBILITY", 67.0, 101.0, 86.8, 12.0, "ELEVATED", 56.0, 50.0, 41.0, "NOMINAL", 91.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:30Z", "SENSORS", 63.2, 86.0, 86.6, 12.0, "NOMINAL", 42.0, 48.0, 39.0, "NOMINAL", 92.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:02:35Z", "STORAGE", 65.0, 88.0, 86.4, 12.0, "NOMINAL", 45.0, 58.0, 49.0, "NOMINAL", 95.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:03:00Z", "POWER", 63.0, 104.0, 84.0, 12.8, "ELEVATED", 47.0, 48.0, 40.0, "NOMINAL", 94.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:03:05Z", "THERMAL", 74.5, 103.0, 83.8, 12.5, "ELEVATED", 55.0, 50.0, 40.0, "NOMINAL", 92.0, "NOMINAL", "NONE"),
        SpacecraftTelemetry("2026-10-08T10:03:10Z", "FLIGHT_COMPUTER", 82.7, 119.0, 83.6, 16.8, "WARNING", 78.0, 76.0, 43.0, "NOMINAL", 84.0, "DEGRADED", "PROCESSOR_THERMAL_LOAD"),
        SpacecraftTelemetry("2026-10-08T10:03:15Z", "COMMUNICATION", 64.1, 89.0, 83.4, 27.5, "NOMINAL", 44.0, 46.0, 40.0, "NOMINAL", 88.0, "DEGRADED", "COMMUNICATION_DELAY"),
        SpacecraftTelemetry("2026-10-08T10:03:20Z", "NAVIGATION", 62.8, 86.0, 83.2, 18.0, "NOMINAL", 43.0, 47.0, 40.0, "DEGRADED", 76.0, "DEGRADED", "NAVIGATION_DEGRADATION"),
        SpacecraftTelemetry("2026-10-08T10:03:25Z", "MOBILITY", 69.8, 110.0, 83.0, 14.5, "ELEVATED", 63.0, 54.0, 43.0, "NOMINAL", 87.0, "DEGRADED", "MOBILITY_LOAD"),
        SpacecraftTelemetry("2026-10-08T10:03:30Z", "SENSORS", 66.8, 92.0, 82.8, 15.0, "ELEVATED", 48.0, 54.0, 41.0, "NOMINAL", 55.0, "DEGRADED", "SENSOR_HEALTH_DROP"),
        SpacecraftTelemetry("2026-10-08T10:03:35Z", "STORAGE", 67.4, 93.0, 82.6, 14.0, "ELEVATED", 49.0, 64.0, 68.0, "NOMINAL", 89.0, "DEGRADED", "STORAGE_PRESSURE"),
        SpacecraftTelemetry("2026-10-08T10:04:00Z", "POWER", 65.7, 126.0, 28.0, 14.8, "WARNING", 58.0, 52.0, 42.0, "NOMINAL", 86.0, "DEGRADED", "POWER_FLUCTUATION"),
        SpacecraftTelemetry("2026-10-08T10:04:05Z", "THERMAL", 86.2, 114.0, 27.8, 15.2, "CRITICAL", 71.0, 59.0, 43.0, "NOMINAL", 82.0, "DEGRADED", "THERMAL_OVERHEAT"),
        SpacecraftTelemetry("2026-10-08T10:04:10Z", "FLIGHT_COMPUTER", 91.4, 138.0, 27.6, 31.0, "CRITICAL", 93.0, 91.0, 47.0, "NOMINAL", 62.0, "FAULT", "PROCESSOR_THERMAL_LOAD"),
        SpacecraftTelemetry("2026-10-08T10:04:15Z", "COMMUNICATION", 70.0, 101.0, 27.4, 34.0, "WARNING", 66.0, 61.0, 44.0, "NOMINAL", 72.0, "FAULT", "COMMUNICATION_LOSS"),
        SpacecraftTelemetry("2026-10-08T10:04:20Z", "NAVIGATION", 68.2, 95.0, 27.2, 28.0, "WARNING", 65.0, 62.0, 44.0, "DEGRADED", 69.0, "FAULT", "NAVIGATION_DEGRADATION"),
        SpacecraftTelemetry("2026-10-08T10:04:25Z", "MOBILITY", 77.6, 132.0, 27.0, 19.0, "CRITICAL", 82.0, 70.0, 49.0, "DEGRADED", 73.0, "FAULT", "MOBILITY_OVERLOAD"),
        SpacecraftTelemetry("2026-10-08T10:04:30Z", "SENSORS", 73.9, 108.0, 26.8, 20.0, "WARNING", 73.0, 72.0, 48.0, "DEGRADED", 48.0, "FAULT", "SENSOR_HEALTH_DROP"),
        SpacecraftTelemetry("2026-10-08T10:04:35Z", "STORAGE", 75.1, 109.0, 26.6, 18.0, "WARNING", 69.0, 81.0, 88.0, "NOMINAL", 78.0, "DEGRADED", "STORAGE_CAPACITY"),
        SpacecraftTelemetry("2026-10-08T10:05:00Z", "POWER", 67.0, 121.0, 25.0, 16.0, "WARNING", 60.0, 58.0, 44.0, "NOMINAL", 84.0, "DEGRADED", "POWER_FLUCTUATION"),
        SpacecraftTelemetry("2026-10-08T10:05:05Z", "THERMAL", 88.4, 117.0, 24.8, 17.0, "CRITICAL", 76.0, 65.0, 45.0, "NOMINAL", 79.0, "FAULT", "THERMAL_OVERHEAT"),
        SpacecraftTelemetry("2026-10-08T10:05:10Z", "FLIGHT_COMPUTER", 87.9, 133.0, 24.6, 29.0, "CRITICAL", 89.0, 88.0, 48.0, "NOMINAL", 68.0, "FAULT", "PROCESSOR_THERMAL_LOAD"),
        SpacecraftTelemetry("2026-10-08T10:05:15Z", "COMMUNICATION", 71.5, 104.0, 24.4, 29.0, "WARNING", 70.0, 64.0, 45.0, "NOMINAL", 68.0, "FAULT", "COMMUNICATION_LOSS"),
        SpacecraftTelemetry("2026-10-08T10:05:20Z", "NAVIGATION", 69.0, 98.0, 24.2, 26.0, "WARNING", 72.0, 66.0, 46.0, "DEGRADED", 63.0, "FAULT", "NAVIGATION_DEGRADATION"),
        SpacecraftTelemetry("2026-10-08T10:05:25Z", "MOBILITY", 79.0, 128.0, 24.0, 20.0, "CRITICAL", 86.0, 75.0, 51.0, "DEGRADED", 70.0, "FAULT", "MOBILITY_OVERLOAD"),
        SpacecraftTelemetry("2026-10-08T10:05:30Z", "SENSORS", 75.0, 111.0, 23.8, 21.0, "WARNING", 77.0, 76.0, 50.0, "DEGRADED", 44.0, "FAULT", "SENSOR_HEALTH_DROP"),
        SpacecraftTelemetry("2026-10-08T10:05:35Z", "STORAGE", 76.2, 112.0, 23.6, 19.0, "WARNING", 72.0, 83.0, 91.0, "NOMINAL", 75.0, "DEGRADED", "STORAGE_CAPACITY")
      )

      val rawTelemetry = rawRecords.toDF()
      println(s"Synthetic records created: ${rawRecords.size}")
      rawTelemetry.select(
        "timestamp", "subsystemId", "processorTemperature", "powerDraw",
        "batteryLevel", "communicationDelay", "processorLoad", "memoryUsage",
        "storageUsage", "systemState", "faultType"
      ).show(50, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 3: Data validation with Spark transformations
      // ----------------------------------------------------------------------

      printStep(3, "DATA VALIDATION")
      // A validation expression is a transformation: it builds a logical plan
      // and does not execute until an action such as count() is requested.
      val validationCondition =
        col("timestamp").isNotNull &&
        col("subsystemId").isNotNull &&
        col("subsystemId").isin(validSubsystems: _*) &&
        col("powerDraw").between(0.0, 250.0) &&
        col("batteryLevel").between(0.0, 100.0) &&
        col("processorTemperature").between(-100.0, 180.0) &&
        col("processorLoad").between(0.0, 100.0) &&
        col("communicationDelay").between(0.0, 300.0)

      val validatedTelemetry = rawTelemetry
        .withColumn("validationStatus", when(validationCondition, "VALID").otherwise("INVALID"))

      val validRecordCount = validatedTelemetry.where(col("validationStatus") === "VALID").count()
      val invalidRecordCount = validatedTelemetry.where(col("validationStatus") === "INVALID").count()
      println(s"VALID RECORD COUNT: $validRecordCount")
      println(s"INVALID RECORD COUNT: $invalidRecordCount")
      validatedTelemetry.select("timestamp", "subsystemId", "validationStatus").show(10, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 4: Data cleaning and normalization
      // ----------------------------------------------------------------------

      printStep(4, "DATA CLEANING AND NORMALIZATION")
      // filter/where keeps valid observations; trim and upper normalize labels;
      // coalesce fills missing labels; round normalizes numeric precision.
      val cleanedTelemetry = validatedTelemetry
        .filter(col("validationStatus") === "VALID")
        .withColumn("subsystemId", upper(trim(col("subsystemId"))))
        .withColumn("thermalStatus", upper(trim(coalesce(col("thermalStatus"), lit("UNKNOWN")))))
        .withColumn("navigationStatus", upper(trim(coalesce(col("navigationStatus"), lit("UNKNOWN")))))
        .withColumn("systemState", upper(trim(coalesce(col("systemState"), lit("UNKNOWN")))))
        .withColumn("faultType", upper(trim(coalesce(col("faultType"), lit("NONE")))))
        .withColumn("processorTemperature", round(col("processorTemperature"), 2))
        .withColumn("powerDraw", round(col("powerDraw"), 2))
        .withColumn("batteryLevel", round(col("batteryLevel"), 2))
        .drop("validationStatus")

      println("CLEANED TELEMETRY SAMPLE")
      cleanedTelemetry.select("timestamp", "subsystemId", "thermalStatus", "systemState", "faultType").show(12, truncate = false)
      println(s"Distinct subsystems observed: ${cleanedTelemetry.select("subsystemId").distinct().count()}")

      // ----------------------------------------------------------------------
      // STEP 5: Feature engineering
      // ----------------------------------------------------------------------

      printStep(5, "FEATURE ENGINEERING")
      // Each withColumn below is a Spark transformation. Risk features are
      // bounded between 0 and 1 to make later health calculations comparable.
      val featuredTelemetry = cleanedTelemetry
        .withColumn(
          "temperatureRisk",
          when(col("processorTemperature") >= 85, 1.0)
            .when(col("processorTemperature") >= 75, 0.7)
            .when(col("processorTemperature") >= 70, 0.45)
            .otherwise(0.2)
        )
        .withColumn(
          "powerRisk",
          when(col("powerDraw") >= 130, 1.0)
            .when(col("powerDraw") >= 115, 0.75)
            .when(col("powerDraw") >= 100, 0.5)
            .otherwise(0.15)
        )
        .withColumn(
          "batteryRisk",
          when(col("batteryLevel") < 25, 1.0)
            .when(col("batteryLevel") < 40, 0.75)
            .when(col("batteryLevel") < 60, 0.45)
            .otherwise(0.1)
        )
        .withColumn(
          "cpuLoadRisk",
          when(col("processorLoad") >= 90, 1.0)
            .when(col("processorLoad") >= 75, 0.75)
            .when(col("processorLoad") >= 60, 0.5)
            .otherwise(0.15)
        )
        .withColumn(
          "communicationRisk",
          when(col("communicationDelay") > 30, 1.0)
            .when(col("communicationDelay") > 25, 0.8)
            .when(col("communicationDelay") > 18, 0.5)
            .otherwise(0.1)
        )
        .withColumn(
          "memoryRisk",
          when(col("memoryUsage") >= 90, 1.0)
            .when(col("memoryUsage") >= 80, 0.75)
            .when(col("memoryUsage") >= 65, 0.45)
            .otherwise(0.1)
        )
        .withColumn(
          "storageRisk",
          when(col("storageUsage") >= 90, 1.0)
            .when(col("storageUsage") >= 80, 0.75)
            .when(col("storageUsage") >= 65, 0.45)
            .otherwise(0.1)
        )
        .withColumn("thermalStress", round((col("temperatureRisk") * 0.7) + (col("powerRisk") * 0.3), 3))
        .withColumn("computeStress", round((col("cpuLoadRisk") * 0.6) + (col("memoryRisk") * 0.4), 3))
        .withColumn("communicationStress", round((col("communicationRisk") * 0.7) + ((lit(100.0) - col("sensorHealth")) / 100.0 * 0.3), 3))

      featuredTelemetry.select(
        "subsystemId", "processorTemperature", "temperatureRisk", "powerRisk",
        "batteryRisk", "cpuLoadRisk", "communicationRisk", "thermalStress",
        "computeStress", "communicationStress"
      ).show(20, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 6: Health monitoring
      // ----------------------------------------------------------------------

      printStep(6, "HEALTH MONITORING")
      // Health score is a bounded transformation derived from engineered risk
      // columns and sensor quality. least/greatest keep the score in 0..100.
      val healthMonitored = featuredTelemetry
        .withColumn(
          "healthScore",
          round(
            greatest(
              lit(0.0),
              least(
                lit(100.0),
                lit(100.0)
                  - (col("temperatureRisk") * 20.0)
                  - (col("powerRisk") * 10.0)
                  - (col("batteryRisk") * 18.0)
                  - (col("cpuLoadRisk") * 16.0)
                  - (col("communicationRisk") * 12.0)
                  - (col("memoryRisk") * 8.0)
                  - (col("storageRisk") * 5.0)
                  - ((lit(100.0) - col("sensorHealth")) * 0.11)
              )
            ),
            2
          )
        )
        .withColumn(
          "healthStatus",
          when(col("healthScore") >= 85, "HEALTHY")
            .when(col("healthScore") >= 70, "WARNING")
            .when(col("healthScore") >= 50, "DEGRADED")
            .otherwise("CRITICAL")
        )

      healthMonitored.select(
        "timestamp", "subsystemId", "healthScore", "healthStatus",
        "thermalStress", "computeStress", "communicationStress"
      ).show(50, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 7: Pre-AI telemetry anomaly screening
      // ----------------------------------------------------------------------

      printStep(7, "PRE-AI TELEMETRY ANOMALY SCREENING")
      // This is a transparent rule-based screening layer, not an LSTM model.
      // The boolean conditions demonstrate where AI-ready labels can begin.
      val thermalLoadCondition = col("processorTemperature") > 80 && col("processorLoad") > 75
      val batteryCondition = col("batteryLevel") < 30
      val communicationCondition = col("communicationDelay") > 25
      val sensorCondition = col("sensorHealth") < 60
      val powerCondition = col("powerDraw") > 120

      val anomalyTelemetry = healthMonitored
        .withColumn(
          "anomalyScore",
          least(
            lit(1.0),
            round(
              when(thermalLoadCondition, 0.45).otherwise(0.0) +
                when(batteryCondition, 0.20).otherwise(0.0) +
                when(communicationCondition, 0.15).otherwise(0.0) +
                when(sensorCondition, 0.10).otherwise(0.0) +
                when(powerCondition, 0.10).otherwise(0.0),
              2
            )
          )
        )
        .withColumn(
          "anomalyFlag",
          when(
            thermalLoadCondition || batteryCondition || communicationCondition || sensorCondition || powerCondition,
            "ANOMALY"
          ).otherwise("NORMAL")
        )

      anomalyTelemetry.select(
        "timestamp", "subsystemId", "anomalyFlag", "anomalyScore",
        "processorTemperature", "processorLoad", "batteryLevel",
        "communicationDelay", "sensorHealth", "powerDraw"
      ).where(col("anomalyFlag") === "ANOMALY").show(50, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 8: Fault severity estimation
      // ----------------------------------------------------------------------

      printStep(8, "FAULT SEVERITY")
      val severityTelemetry = anomalyTelemetry
        .withColumn(
          "faultSeverity",
          when(col("anomalyFlag") === "NORMAL", "NORMAL")
            .when(col("healthScore") < 35 || col("anomalyScore") >= 0.85, "CRITICAL")
            .when(col("healthScore") < 50 || col("anomalyScore") >= 0.60, "HIGH")
            .when(col("healthScore") < 70 || col("anomalyScore") >= 0.35, "MEDIUM")
            .otherwise("LOW")
        )

      severityTelemetry.select(
        "timestamp", "subsystemId", "healthScore", "anomalyScore",
        "anomalyFlag", "faultSeverity", "faultType"
      ).orderBy(desc("anomalyScore"), desc("healthScore")).show(50, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 9: Subsystem health summary
      // ----------------------------------------------------------------------

      printStep(9, "SUBSYSTEM HEALTH SUMMARY")
      // groupBy and agg are transformations. The following action occurs when
      // show() materializes the grouped health report.
      val subsystemHealth = severityTelemetry
        .groupBy("subsystemId")
        .agg(
          round(avg("processorTemperature"), 2).alias("averageTemperature"),
          round(avg("powerDraw"), 2).alias("averagePower"),
          round(avg("batteryLevel"), 2).alias("averageBattery"),
          round(avg("processorLoad"), 2).alias("averageCpuLoad"),
          round(avg("communicationDelay"), 2).alias("averageCommunicationDelay"),
          round(avg("healthScore"), 2).alias("averageHealthScore"),
          round(avg("anomalyScore"), 2).alias("averageAnomalyScore"),
          sum(when(col("anomalyFlag") === "ANOMALY", 1).otherwise(0)).alias("anomalyCount"),
          count(lit(1)).alias("telemetryCount"),
          min("healthScore").alias("minimumHealthScore"),
          max("healthScore").alias("maximumHealthScore")
        )
        .orderBy(asc("averageHealthScore"))

      subsystemHealth.show(20, truncate = false)
      val subsystemHealthRows: Array[Row] = subsystemHealth.collect()
      println(s"Subsystem summaries collected: ${subsystemHealthRows.length}")

      // ----------------------------------------------------------------------
      // STEP 10: Overall spacecraft health
      // ----------------------------------------------------------------------

      printStep(10, "OVERALL SPACECRAFT HEALTH")
      val overallHealthRow = severityTelemetry
        .agg(
          round(avg("healthScore"), 2).alias("overallHealthScore"),
          round(avg("anomalyScore"), 2).alias("overallAnomalyScore"),
          count(when(col("anomalyFlag") === "ANOMALY", true)).alias("totalAnomalies")
        )
        .first()

      val overallHealthScore = overallHealthRow.getAs[Double]("overallHealthScore")
      val overallAnomalyScore = overallHealthRow.getAs[Double]("overallAnomalyScore")
      val totalAnomalies = overallHealthRow.getAs[Long]("totalAnomalies")

      val overallMissionHealth =
        if (overallHealthScore >= 85 && totalAnomalies <= 2) "NOMINAL"
        else if (overallHealthScore >= 70) "CAUTION"
        else if (overallHealthScore >= 50) "DEGRADED"
        else "CRITICAL"

      println(f"Overall Health Score: $overallHealthScore%.2f")
      println(f"Overall Anomaly Score: $overallAnomalyScore%.2f")
      println(s"Anomalies Detected: $totalAnomalies")
      println(s"OVERALL MISSION HEALTH: $overallMissionHealth")

      // ----------------------------------------------------------------------
      // STEP 11: Affected subsystem and primary indicators
      // ----------------------------------------------------------------------

      printStep(11, "FAULT IDENTIFICATION")
      val affectedSubsystemRow = subsystemHealth.first()
      val affectedSubsystem = affectedSubsystemRow.getAs[String]("subsystemId")
      val affectedHealthScore = affectedSubsystemRow.getAs[Double]("averageHealthScore")
      val affectedAnomalyScore = affectedSubsystemRow.getAs[Double]("averageAnomalyScore")
      val affectedSeverity = severityTelemetry
        .where(col("subsystemId") === affectedSubsystem)
        .orderBy(desc("anomalyScore"))
        .select("faultSeverity")
        .first()
        .getAs[String]("faultSeverity")

      val primaryIndicator =
        if (affectedSubsystem == "FLIGHT_COMPUTER") "Processor thermal-load instability"
        else if (affectedSubsystem == "COMMUNICATION") "Communication delay and link degradation"
        else if (affectedSubsystem == "POWER") "Power draw increase and low battery reserve"
        else if (affectedSubsystem == "SENSORS") "Reduced sensor health confidence"
        else "Subsystem telemetry anomaly cluster"

      println(s"Affected Subsystem: $affectedSubsystem")
      println(f"Health Score: $affectedHealthScore%.2f")
      println(f"Anomaly Score: $affectedAnomalyScore%.2f")
      println(s"Fault Severity: $affectedSeverity")
      println(s"Primary Indicator: $primaryIndicator")

      // take() is an action that returns a bounded array, useful for a small
      // diagnostic sample without collecting the entire DataFrame.
      val diagnosticSample = severityTelemetry.orderBy(desc("anomalyScore")).take(3)
      println("Top three diagnostic observations:")
      diagnosticSample.foreach(row => println(row))

      // ----------------------------------------------------------------------
      // STEP 12: Recovery recommendation placeholder
      // ----------------------------------------------------------------------

      printStep(12, "RECOVERY RECOMMENDATION - PRE-PPO DEMONSTRATION")
      val affectedWorstRow = severityTelemetry
        .where(col("subsystemId") === affectedSubsystem)
        .orderBy(desc("anomalyScore"), asc("healthScore"))
        .first()

      val recommendation = recoveryRecommendation(
        subsystem = affectedSubsystem,
        severity = affectedWorstRow.getAs[String]("faultSeverity"),
        thermalLoad = affectedWorstRow.getAs[String]("faultType").contains("THERMAL") ||
          (affectedWorstRow.getAs[Double]("processorTemperature") > 80 && affectedWorstRow.getAs[Double]("processorLoad") > 75),
        lowBattery = affectedWorstRow.getAs[Double]("batteryLevel") < 30,
        communicationFault = affectedWorstRow.getAs[Double]("communicationDelay") > 25,
        criticalHealth = affectedWorstRow.getAs[String]("healthStatus") == "CRITICAL"
      )

      println(s"Affected Subsystem: $affectedSubsystem")
      println(s"Primary Indicator: $primaryIndicator")
      println(s"Recommendation: $recommendation")
      println("This is a rule-based handoff placeholder; PPO is not implemented here.")
      println("In the complete CELESTIAL-X architecture, this processed state is supplied")
      println("to the PPO recovery policy, which selects the recovery action.")

      // ----------------------------------------------------------------------
      // STEP 13: Spark SQL demonstrations
      // ----------------------------------------------------------------------

      printStep(13, "SPARK SQL REPORTS")
      // Temporary views expose the DataFrame to Spark SQL without persistence.
      severityTelemetry.createOrReplaceTempView("spacecraft_telemetry")
      subsystemHealth.createOrReplaceTempView("subsystem_health")

      println("SQL QUERY: average telemetry and health by subsystem")
      spark.sql("""
        SELECT subsystemId,
               ROUND(AVG(processorTemperature), 2) AS avg_temperature,
               ROUND(AVG(powerDraw), 2) AS avg_power,
               ROUND(AVG(healthScore), 2) AS avg_health,
               SUM(CASE WHEN anomalyFlag = 'ANOMALY' THEN 1 ELSE 0 END) AS anomaly_count
        FROM spacecraft_telemetry
        GROUP BY subsystemId
        ORDER BY avg_health ASC
      """).show(20, truncate = false)

      println("SQL QUERY: anomalous observations")
      spark.sql("""
        SELECT timestamp, subsystemId, processorTemperature, processorLoad,
               batteryLevel, communicationDelay, anomalyScore, faultSeverity
        FROM spacecraft_telemetry
        WHERE anomalyFlag = 'ANOMALY'
        ORDER BY anomalyScore DESC, timestamp ASC
      """).show(20, truncate = false)

      println("SQL QUERY: critical health records")
      spark.sql("""
        SELECT timestamp, subsystemId, healthScore, healthStatus,
               faultType, faultSeverity
        FROM spacecraft_telemetry
        WHERE healthStatus = 'CRITICAL' OR faultSeverity = 'CRITICAL'
        ORDER BY healthScore ASC
      """).show(20, truncate = false)

      println("SQL QUERY: subsystem health view")
      spark.sql("""
        SELECT subsystemId, averageHealthScore, averageAnomalyScore,
               anomalyCount, minimumHealthScore, maximumHealthScore
        FROM subsystem_health
        ORDER BY averageHealthScore ASC
      """).show(20, truncate = false)

      // ----------------------------------------------------------------------
      // STEP 14: Explicit transformation/action notes
      // ----------------------------------------------------------------------

      printStep(14, "SPARK TRANSFORMATIONS AND ACTIONS USED")
      println("Transformations: filter, where, select, withColumn, drop, distinct")
      println("Transformations: groupBy, agg, orderBy, createOrReplaceTempView")
      println("Actions: show, count, collect, first, take")
      println("Transformations build a lazy execution plan; actions materialize results.")

      val firstProcessedRecord = severityTelemetry.first()
      println("First processed record action result:")
      println(firstProcessedRecord)

      // ----------------------------------------------------------------------
      // STEP 15: Pipeline summary and future architecture boundary
      // ----------------------------------------------------------------------

      printSection("CELESTIAL-X TELEMETRY PROCESSING")
      println("1. Raw telemetry received")
      println("2. Data validation completed")
      println("3. Invalid records filtered")
      println("4. Telemetry normalized")
      println("5. Features generated")
      println("6. Health metrics calculated")
      println("7. Anomalies screened")
      println("8. Fault severity estimated")
      println("9. Subsystem health calculated")
      println("10. Overall spacecraft health calculated")
      println("11. Affected subsystem identified")
      println("12. Recovery recommendation generated")

      println("\nNEXT STAGE:")
      println("LSTM TEMPORAL FAULT ANALYSIS")
      println("        |")
      println("PPO RECOVERY POLICY")
      println("        |")
      println("REPLICATION CORE")
      println("        |")
      println("COMPUTATIONAL CORE")
      println("        |")
      println("EXECUTION")
      println("\nThis file stops at telemetry processing, health monitoring, and fault screening.")
      println("The Replication Core is not called a digital twin in CELESTIAL-X terminology.")
    } finally {
      // Stop the local Spark context so the isolated demonstration exits cleanly.
      spark.stop()
    }
  }
}
