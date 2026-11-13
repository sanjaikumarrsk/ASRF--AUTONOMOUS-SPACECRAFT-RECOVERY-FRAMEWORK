import React from 'react';
import { Database, Activity, GitCommit, Server, ArrowRight } from 'lucide-react';
import './SparkPipeline.css';

export const SparkPipeline = ({ 
  sparkJob = { id: 'JOB-TLM-042', status: 'RUNNING', recordsProcessed: '2.84M', recordsPerSec: '18,420', partitions: 24, latency: '142ms', failedRecords: '0.02%' }, 
  scalaTransform = { name: 'TelemetryNormalization', status: 'SUCCESS' }, 
  featureExtraction = { name: 'TelemetryFeatureBuilder', status: 'SUCCESS' }, 
  stats = {} 
}) => {
  return (
    <div className="spark-pipeline">
      <div className="sim-label">SIMULATED SPARK PROCESSING</div>
      <h2 className="section-title">TELEMETRY PROCESSING PIPELINE</h2>
      
      <div className="pipeline-container">
        {/* Panels */}
        <div className="panels-row">
          <div className="pipeline-panel">
            <div className="panel-header">
              <Server size={16} /> Spark Job <span className="panel-badge running">{sparkJob.status}</span>
            </div>
            <div className="panel-body mono-text">
              <p>ID: {sparkJob.id}</p>
              <p>Processed: {sparkJob.recordsProcessed}</p>
              <p>Rate: {sparkJob.recordsPerSec} rec/s</p>
              <p>Latency: {sparkJob.latency}</p>
            </div>
          </div>
          
          <div className="pipeline-panel">
            <div className="panel-header">
              <GitCommit size={16} /> Scala Transform <span className="panel-badge success">{scalaTransform.status}</span>
            </div>
            <div className="panel-body mono-text">
              <p>Job: {scalaTransform.name}</p>
              <p>Partitions: {sparkJob.partitions}</p>
              <p>Failed: {sparkJob.failedRecords}</p>
            </div>
          </div>

          <div className="pipeline-panel">
            <div className="panel-header">
              <Database size={16} /> Feature Extraction <span className="panel-badge success">{featureExtraction.status}</span>
            </div>
            <div className="panel-body mono-text">
              <p>Module: {featureExtraction.name}</p>
              <p>Vector Size: 24 dims</p>
              <p>Output: Float32[]</p>
            </div>
          </div>
        </div>

        {/* Visualization Graph */}
        <div className="graph-viz">
          <div className="node">Telemetry Stream</div>
          <div className="edge"><div className="dot"></div></div>
          <div className="node">Spark Ingestion</div>
          <div className="edge"><div className="dot"></div></div>
          <div className="node stacked">
            <span>P01</span>
            <span>...</span>
            <span>P24</span>
          </div>
          <div className="edge"><div className="dot"></div></div>
          <div className="node highlight">Scala Transform</div>
          <div className="edge"><div className="dot"></div></div>
          <div className="node highlight">Feature Extraction</div>
          <div className="edge"><div className="dot"></div></div>
          <div className="node terminal">Health Monitor</div>
        </div>
      </div>
    </div>
  );
};
