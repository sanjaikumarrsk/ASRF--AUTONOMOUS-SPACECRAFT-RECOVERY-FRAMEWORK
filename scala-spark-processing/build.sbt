ThisBuild / scalaVersion     := "2.12.18"
ThisBuild / version          := "1.0.0"
ThisBuild / organization     := "com.asrf"
ThisBuild / organizationName := "ASRF - Autonomous Spacecraft Recovery Framework"

val sparkVersion = "3.5.0"

lazy val commonSettings = Seq(
  libraryDependencies ++= Seq(
    "org.apache.spark" %% "spark-core" % sparkVersion % "provided",
    "org.apache.spark" %% "spark-sql"  % sparkVersion % "provided"
  ),
  fork := true
)

lazy val root = (project in file("."))
  .aggregate(probeTelemetryProcessing, earthStationProcessing)
  .settings(
    name := "asrf-scala-spark-processing"
  )

lazy val probeTelemetryProcessing = (project in file("probe-telemetry-processing"))
  .settings(
    name := "probe-telemetry-processing",
    commonSettings
  )

lazy val earthStationProcessing = (project in file("earth-station-processing"))
  .settings(
    name := "earth-station-processing",
    commonSettings
  )
