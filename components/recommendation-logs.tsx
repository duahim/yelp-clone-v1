"use client"

import { useState, useEffect } from "react"
import { Terminal, Code, ChevronDown, ChevronUp, Clock } from "lucide-react"
import { logStore } from "@/lib/recommendation-logs-store"

// Fallback logs in case the import fails
const fallbackLogs = {
  contentBased: ['Log data not available - using fallback'],
  collaborative: ['Process logs not available for collaborative filtering'],
  matrix: ['Process logs not available for matrix factorization']
};

interface RecommendationLogsProps {
  algorithm: string
}

export default function RecommendationLogs({ algorithm }: RecommendationLogsProps) {
  const [expanded, setExpanded] = useState(true)
  const [logs, setLogs] = useState<string[]>(['Initializing logs...'])

  useEffect(() => {
    try {
      // Log the current state to help debug
      console.log("Current algorithm:", algorithm);
      console.log("LogStore contents:", {
        contentBased: logStore.getLogs('contentBased'),
        collaborative: logStore.getLogs('collaborative'),
        matrix: logStore.getLogs('matrix')
      });
      
      // Try to get logs from the primary source first
      let algorithmLogs: string[] = [];
      
      // Map hyphenated algorithm names to camelCase keys
      let algorithmType: 'contentBased' | 'collaborative' | 'matrix';
      switch(algorithm) {
        case 'content-based':
          algorithmType = 'contentBased';
          break;
        case 'collaborative':
          algorithmType = 'collaborative';
          break;
        case 'matrix':
          algorithmType = 'matrix';
          break;
        default:
          algorithmType = 'contentBased';
      }
      
      // Always try logStore first
      const storeContents = logStore.getLogs(algorithmType);
      if (storeContents && storeContents.length > 0) {
        console.log(`Using logs from logStore for ${algorithmType}:`, storeContents);
        algorithmLogs = storeContents;
      } else {
        // If no logs in store, use fallback
        console.log("Using fallback logs - no logs found in store");
        algorithmLogs = fallbackLogs[algorithmType];
      }
      
      if (algorithmLogs.length === 0) {
        algorithmLogs = ['No log entries found for this algorithm'];
      }
      
      setLogs(algorithmLogs);
    } catch (error) {
      console.error("Error accessing recommendation logs:", error);
      setLogs(["Error loading logs - check console for details"]);
    }
  }, [algorithm]);

  // Parse log entries with timestamps [HH:MM:SS]
  const parseLogEntry = (log: string) => {
    // Check if log has a timestamp pattern [XX:XX:XX] or HH:MM:SS -
    const timestampRegex = /^\[(\d{2}:\d{2}:\d{2})\]\s(.+)$|^(\d{2}:\d{2}:\d{2})\s-\s(.+)$/;
    const match = log.match(timestampRegex);
    
    if (match) {
      // Either [HH:MM:SS] format or HH:MM:SS - format
      const timestamp = match[1] || match[3];
      const message = match[2] || match[4];
      
      return {
        hasTimestamp: true,
        timestamp,
        message
      };
    }
    
    return {
      hasTimestamp: false,
      timestamp: '',
      message: log
    };
  };

  return (
    <div className="mb-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div 
        className="p-3 bg-gray-50 border-b flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Terminal className="h-4 w-4 mr-2 text-gray-500" />
          <h3 className="text-sm font-medium">Recommendation Process Logs</h3>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </div>

      {expanded && (
        <div className="p-3 bg-gray-50 text-sm font-mono text-gray-800 whitespace-pre-wrap overflow-auto max-h-60">
          {logs.length === 0 ? (
            <div className="py-1 text-gray-500">No logs available</div>
          ) : (
            <div className="border-l-2 border-gray-300 pl-3 ml-2">
              {logs.map((log, index) => {
                const { hasTimestamp, timestamp, message } = parseLogEntry(log);
                
                return (
                  <div key={index} className="py-1 relative">
                    <div className="absolute -left-3.5 top-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                    
                    {hasTimestamp ? (
                      <div className="flex items-start">
                        <span className="text-xs text-gray-500 font-normal mr-2 min-w-20 flex items-center">
                          <Clock className="h-3 w-3 mr-1 inline text-gray-400" />
                          {timestamp}
                        </span>
                        <span className="flex-1">{message}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Code className="h-3 w-3 mr-2 inline text-gray-500" />
                        <span>{log}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 