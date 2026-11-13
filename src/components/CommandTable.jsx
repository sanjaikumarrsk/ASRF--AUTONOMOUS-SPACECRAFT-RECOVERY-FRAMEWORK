import React, { useState } from 'react';
import { ArrowUpDown, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import './CommandTable.css';

const defaultCommands = [
  { id: 'CMD-PRC-042', target: 'Flight Processor', action: 'PROCESSOR_RESTART', parameters: 'Timeout: 12s', validity: 'VALID', safety: 'PASSED', verifiedLib: 'VERIFIED', rollback: 'AVAILABLE', consistency: 'PASSED', auth: 'AUTHORIZED', status: 'PENDING' },
  { id: 'CMD-PWR-017', target: 'Power System', action: 'POWER_RECONFIG', parameters: 'Mode: Backup', validity: 'VALID', safety: 'PASSED', verifiedLib: 'VERIFIED', rollback: 'AVAILABLE', consistency: 'PASSED', auth: 'AUTHORIZED', status: 'PENDING' },
  { id: 'CMD-THM-031', target: 'Thermal Control', action: 'THERMAL_ADJUST', parameters: 'Target: 55°C', validity: 'VALID', safety: 'PASSED', verifiedLib: 'VERIFIED', rollback: 'AVAILABLE', consistency: 'PASSED', auth: 'AUTHORIZED', status: 'PENDING' },
  { id: 'CMD-COM-008', target: 'Communication', action: 'COMM_RECONFIG', parameters: 'Channel: B', validity: 'VALID', safety: 'PASSED', verifiedLib: 'VERIFIED', rollback: 'AVAILABLE', consistency: 'PASSED', auth: 'AUTHORIZED', status: 'PENDING' },
  { id: 'CMD-SAF-002', target: 'All Systems', action: 'SAFE_MODE', parameters: 'Duration: 300s', validity: 'VALID', safety: 'PASSED', verifiedLib: 'VERIFIED', rollback: 'AVAILABLE', consistency: 'PASSED', auth: 'AUTHORIZED', status: 'PENDING' },
  { id: 'CMD-SUB-019', target: 'Mobility', action: 'SUBSYSTEM_RESET', parameters: 'Component: Motor A', validity: 'VALID', safety: 'PASSED', verifiedLib: 'VERIFIED', rollback: 'AVAILABLE', consistency: 'PASSED', auth: 'AUTHORIZED', status: 'PENDING' },
];

const Badge = ({ text, type }) => {
  let className = 'badge';
  if (type === 'success' || text === 'VALID' || text === 'PASSED' || text === 'VERIFIED' || text === 'AVAILABLE' || text === 'AUTHORIZED') {
    className += ' badge-success';
  } else if (type === 'warning' || text === 'PENDING') {
    className += ' badge-warning';
  } else if (type === 'error' || text === 'FAILED' || text === 'UNAUTHORIZED') {
    className += ' badge-error';
  } else {
    className += ' badge-neutral';
  }

  return <span className={className}>{text}</span>;
};

const CommandTable = ({ commands = defaultCommands, compact = false, showAllColumns = true }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

  const sortedCommands = React.useMemo(() => {
    let sortableItems = [...commands];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [commands, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderHeader = (key, label) => (
    <th onClick={() => requestSort(key)} className="sortable-header">
      <div className="header-content">
        {label}
        <ArrowUpDown className="sort-icon" size={14} />
      </div>
    </th>
  );

  return (
    <div className={`command-table-container ${compact ? 'compact' : ''}`}>
      <div className="table-wrapper">
        <table className="command-table">
          <thead>
            <tr>
              {renderHeader('id', 'Command ID')}
              {renderHeader('target', 'Target')}
              {renderHeader('action', 'Action')}
              {renderHeader('parameters', 'Parameters')}
              {showAllColumns && (
                <>
                  {renderHeader('validity', 'Validity')}
                  {renderHeader('safety', 'Safety')}
                  {renderHeader('verifiedLib', 'Verified Lib')}
                  {renderHeader('rollback', 'Rollback')}
                  {renderHeader('consistency', 'Consistency')}
                  {renderHeader('auth', 'Authorization')}
                </>
              )}
              {renderHeader('status', 'Status')}
            </tr>
          </thead>
          <tbody>
            {sortedCommands.map((cmd) => (
              <tr key={cmd.id}>
                <td className="monospace font-medium">{cmd.id}</td>
                <td>{cmd.target}</td>
                <td className="monospace">{cmd.action}</td>
                <td className="monospace text-sm">{cmd.parameters}</td>
                {showAllColumns && (
                  <>
                    <td><Badge text={cmd.validity} /></td>
                    <td><Badge text={cmd.safety} /></td>
                    <td><Badge text={cmd.verifiedLib} /></td>
                    <td><Badge text={cmd.rollback} /></td>
                    <td><Badge text={cmd.consistency} /></td>
                    <td><Badge text={cmd.auth} /></td>
                  </>
                )}
                <td><Badge text={cmd.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommandTable;
