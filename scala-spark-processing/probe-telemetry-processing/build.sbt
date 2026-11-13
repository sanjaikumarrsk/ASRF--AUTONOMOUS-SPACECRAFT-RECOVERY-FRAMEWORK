name := "probe-telemetry-processing"
version := "1.0.0"
scalaVersion := "2.12.18"

val sparkVersion = "3.5.0"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % sparkVersion,
  "org.apache.spark" %% "spark-sql"  % sparkVersion
)

fork := true
mainClass in (Compile, run) := Some("com.asrf.probe.ProbeTelemetryProcessor")
