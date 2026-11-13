import React from 'react';
import { CheckCircle, ShieldCheck, Database, GitCommit, FileCheck, CheckSquare, Play, Loader2 } from 'lucide-react';
import CommandTable from './CommandTable';
import './ComputationalCore.css';

const defaultPipeline = [
  { id: 'prop', label: 'PROPOSED', status: 'complete', icon: FileCheck },
  { id: 'valid', label: 'VALIDITY CHECK', status: 'complete', icon: CheckSquare },
  { id: 'safety', label: 'SAFETY CONSTRAINT CHECK', status: 'complete', icon: ShieldCheck },
  { id: 'lib', label: 'VERIFIED LIBRARY CHECK', status: 'complete', icon: Database },
  { id: 'consist', label: 'RECOVERY CONSISTENCY', status: 'complete', icon: GitCommit },
  { id: 'roll', label: 'ROLLBACK CHECK', status: 'complete', icon: GitCommit },
  { id: 'auth', label: 'AUTHORIZATION', status: 'complete', icon: ShieldCheck },
  { id: 'exec', label: 'EXECUTION', status: 'pending', icon: Play }
];

const ComputationalCore = ({ commands, verificationPipeline = defaultPipeline }) => {
  return (
    <div className="comp-core-container">
      <div className="comp-core-header">
        <h2 className="comp-core-title">COMPUTATIONAL CORE</h2>
        <p className="comp-core-subtitle">Command verification and safety authorization layer</p>
      </div>

      <div className="comp-core-section">
        <h3 className="section-title">Command Lifecycle Pipeline</h3>
        <div className="pipeline-container">
          {verificationPipeline.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <div className={`pipeline-step ${step.status}`}>
                  <div className="step-icon-container">
                    {step.status === 'pending' ? (
                      <Loader2 className="step-icon animate-spin text-blue-500" />
                    ) : step.status === 'complete' ? (
                      <CheckCircle className="step-icon text-green-500" />
                    ) : (
                      <Icon className="step-icon text-gray-400" />
                    )}
                  </div>
                  <span className="step-label">{step.label}</span>
                </div>
                {index < verificationPipeline.length - 1 && (
                  <div className={`pipeline-connector ${step.status === 'complete' ? 'active' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="comp-core-section">
        <h3 className="section-title">Command Verification Matrix</h3>
        <CommandTable commands={commands} />
      </div>
    </div>
  );
};

export default ComputationalCore;
