import { registerPlugin, transform } from "@babel/standalone";
import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import { useThrottle, useDebounce } from "react-use";
import transpilerPlugin from "./worker/transpile_plugin";

registerPlugin("transpilerPlugin", transpilerPlugin);

import add_waiting_time_steps from "./lib/add_waiting_time_steps";
import { describe, undescribe } from "./lib/describe";
import presets from "./lib/presets";

import useBrowserZoom from "./lib/useBrowserZoom";
import useCode from "./lib/useCode";
import useMostRecent from "./lib/useMostRecent";
import useReplacableWorker from "./lib/useReplacableWorker";

import Highlight from "./ui/Highlight";
import Menu from "./ui/Menu";
import Step from "./ui/Step";
import StepSlider from "./ui/StepSlider";

import "./App.scss";
import "./prism-one-light.css";

export default function App() {
  // Load the latest session from localStorage on initial load, fallback to default preset
  const initialCode =
    localStorage.getItem("js_visualized_last_session") ||
    presets["Promise / fetch"];
  const [code, set_code] = useCode(initialCode);
  const [cache, set_cache] = useState({});
  const zoomLevel = useBrowserZoom();
  const scalePercentage = Math.round(zoomLevel * 100);

  const worker = useReplacableWorker((data) => {
    // Check if iframe mode is active for this code
    const iframeActive =
      code.includes("// @iframe") || code.includes("// @use-iframe");

    // Only process worker messages if iframe mode is not active for this code
    if (!iframeActive) {
      if (!data.error) {
        data.steps = JSON.parse(data.steps);
        data.steps.forEach((step) => {
          if ("value" in step) {
            step.value = undescribe(step.value);
          }
          if ("scopes" in step) {
            step.scopes.forEach((scope) => {
              Object.keys(scope).forEach((key) => {
                scope[key] = undescribe(scope[key]);
              });
            });
          }
          if ("logs" in step) {
            step.logs = step.logs.map((line) => {
              return line.map((item) => undescribe(item));
            });
          }
        });
        add_waiting_time_steps(data.steps);
      }
      set_cache((cache) => {
        return {
          ...cache,
          [data.code]: data,
        };
      });
    }
  });

  // Periodically save the current script to localStorage (every 2 seconds)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      localStorage.setItem("js_visualized_last_session", code);
    }, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(saveInterval);
  }, [code]);

  // Debounce the iframe execution to avoid constant re-execution
  const [debouncedCode, setDebouncedCode] = useState(code);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCode(code);
    }, 1000); // 1000ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [code]);

  useEffect(() => {
    // Check if user wants to enable iframe execution for web APIs
    const useIframe =
      debouncedCode.includes("// @iframe") || debouncedCode.includes("// @use-iframe");

    if (!cache[debouncedCode]) {
      if (useIframe) {
        // Handle iframe execution
        handleIframeExecution(debouncedCode);
      } else if (worker) {
        // Use the original worker-based execution
        try {
          // Transpile the code in the main thread before sending to worker
          const transpiled = transform(debouncedCode, {
            plugins: [["transpilerPlugin", { ns: "__V__" }]],
          }).code;

          // Send both the original code and the transpiled code to the worker
          worker.postMessage({
            code: debouncedCode,
            transpiled,
            describeStr: describe.toString(), // Send the describe function as a string
          });
        } catch (error) {
          // Handle syntax errors in the user's code
          worker.postMessage({
            code: debouncedCode,
            config: {},
            error: {
              message: error.message,
              type: error.constructor.name,
            },
          });
        }
      }
    }
  }, [debouncedCode, cache, worker, describe]);

  // Function to handle iframe-based execution
  const handleIframeExecution = (code) => {
    try {
      // Transpile the code
      const transpiled = transform(code, {
        plugins: [["transpilerPlugin", { ns: "__V__" }]],
      }).code;

      // Create iframe HTML with the transpiled code
      const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Visualization Sandbox</title>
        </head>
        <body>
            <script>
                // Set up the step reporting system in the iframe context
                (function() {
                    const __V__ = {
                        _t0: Date.now(),
                        _steps: [ { category: "init" } ],
                        _updated: false,
                        _logs: [],
                        _tmp: {}
                    };

                    // Function to send step reports to the parent window
                    __V__.report = function(value, meta) {
                        meta.dt = Date.now() - __V__._t0;
                        meta.num = __V__._steps.push(meta) - 1;
                        meta.value = __V__.describe(value);
                        meta.logs = __V__._logs;
                        __V__._logs = [];
                        __V__._updated = true;

                        // Sanitize data before sending via postMessage
                        const sanitizeForPostMessage = function(obj) {
                          const seen = new WeakSet();

                          // Custom replacer function that handles non-serializable objects
                          function replacer(key, val) {
                            // Prevent circular references
                            if (val != null && typeof val == "object") {
                              if (seen.has(val)) return "[Circular]";
                              seen.add(val);
                            }

                            // Don't serialize DOM nodes or window objects
                            if (val instanceof Node || (val && typeof val === 'object' && val.nodeType)) {
                              const nodeName = val.nodeName || 'Unknown';
                              const constructorName = val.constructor ? val.constructor.name || 'Node' : 'Node';
                              return '[' + constructorName + ': ' + nodeName + ']';
                            }
                            if (val === window) {
                              return '[Window]';
                            }
                            if (val === document) {
                              return '[Document]';
                            }
                            if (typeof val === 'function') {
                              return '[Function: ' + (val.name || 'anonymous') + ']';
                            }
                            // Handle objects with functions in them by removing functions
                            if (val && typeof val === 'object' && !val.toJSON) {
                              const newObj = {};
                              for (const k in val) {
                                if (val.hasOwnProperty(k)) {
                                  const propVal = val[k];
                                  if (typeof propVal === 'function') {
                                    newObj[k] = '[Function: ' + (propVal.name || k) + ']';
                                  } else {
                                    newObj[k] = propVal;
                                  }
                                }
                              }
                              return newObj;
                            }
                            return val;
                          }

                          try {
                            return JSON.parse(JSON.stringify(obj, replacer));
                          } catch(e) {
                            // If JSON serialization fails, return a safe representation
                            return String(obj);
                          }
                        };

                        // Send step data to parent window with sanitized data
                        window.parent.postMessage({
                            type: 'step',
                            step: sanitizeForPostMessage(meta),
                            value: sanitizeForPostMessage(typeof value === 'object' && value !== null ? __V__.describe(value) : value),
                            logs: sanitizeForPostMessage(meta.logs),
                            allSteps: sanitizeForPostMessage([...__V__._steps]),
                            updated: __V__._updated
                        }, '*');

                        return value;
                    };

                    // Add the describe function to the iframe context
                    __V__.describe = function(value) {
                      // Simple describe implementation for iframe that handles DOM objects
                      try {
                        // Check if it's a DOM object that can't be serialized
                        if (value instanceof Node || (value && typeof value === 'object' && value.nodeType)) {
                          // For DOM nodes, return a simple representation
                          const nodeName = value.nodeName || 'Unknown';
                          const constructorName = value.constructor ? value.constructor.name || 'Node' : 'Node';
                          return '[' + constructorName + ': ' + nodeName + ']';
                        }
                        // For other objects, try to serialize them
                        return JSON.stringify(value, function(key, val) {
                          // Don't serialize DOM nodes or window objects
                          if (val instanceof Node || (val && typeof val === 'object' && val.nodeType)) {
                            const nodeName = val.nodeName || 'Unknown';
                            const constructorName = val.constructor ? val.constructor.name || 'Node' : 'Node';
                            return '[' + constructorName + ': ' + nodeName + ']';
                          }
                          if (val === window) {
                            return '[Window]';
                          }
                          if (val === document) {
                            return '[Document]';
                          }
                          // For functions, return a string representation
                          if (typeof val === 'function') {
                            return '[Function: ' + (val.name || 'anonymous') + ']';
                          }
                          // Handle objects with functions in them by removing functions
                          if (val && typeof val === 'object' && !val.toJSON) {
                            const newObj = {};
                            for (const k in val) {
                              if (val.hasOwnProperty(k)) {
                                const propVal = val[k];
                                if (typeof propVal === 'function') {
                                  newObj[k] = '[Function: ' + (propVal.name || k) + ']';
                                } else {
                                  newObj[k] = propVal;
                                }
                              }
                            }
                            return newObj;
                          }
                          // Return the value as-is for other types
                          return val;
                        });
                      } catch(e) {
                        return String(value);
                      }
                    };

                    __V__.cache = {};

                    // Make the __V__ object available globally in the iframe
                    window.__V__ = __V__;
                })();

                // Execute the transpiled user code
                ${transpiled}
            </script>
        </body>
        </html>
      `;

      // Create a blob URL for the iframe content
      const blob = new Blob([iframeContent], { type: "text/html" });
      const iframeSrc = URL.createObjectURL(blob);

      // Update cache with iframe info
      set_cache((cache) => {
        return {
          ...cache,
          [code]: {
            code,
            iframeSrc,
            config: { executionMode: "iframe" },
            loading: true,
          },
        };
      });
    } catch (error) {
      // Handle transpilation errors
      set_cache((cache) => {
        return {
          ...cache,
          [code]: {
            code,
            config: { executionMode: "iframe" },
            error: {
              message: error.message,
              type: error.constructor.name,
            },
          },
        };
      });
    }
  };

  // Set up message listener for iframe communication
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify the message is from our iframe
      if (event.data && event.data.type === "step") {
        const { step, value, logs, allSteps, updated } = event.data;

        // Update cache with the step data
        set_cache((prevCache) => {
          // Find the code that matches this iframe
          const cacheKey = Object.keys(prevCache).find((key) => {
            const entry = prevCache[key];
            return entry.config && entry.config.executionMode === "iframe";
          });

          if (cacheKey) {
            const existingEntry = prevCache[cacheKey];

            // Process the steps to match the expected format for visualization
            // Make sure allSteps is an array before mapping
            const stepsArray = Array.isArray(allSteps) ? allSteps : [];
            const processedSteps = stepsArray.map((step, index) => {
              // If step already has the expected format, return as is
              if (step && typeof step === 'object' && step.value !== undefined && step.logs !== undefined) {
                return step;
              }
              // Otherwise, format it to match the expected structure
              return {
                ...step,
                value: step?.value || value,
                logs: step?.logs || logs || [],
                num: index,
              };
            });

            return {
              ...prevCache,
              [cacheKey]: {
                ...existingEntry,
                steps: processedSteps,
                loading: false,
              },
            };
          }
          return prevCache;
        });
      }
    };

    window.addEventListener("message", handleMessage);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [set_cache]);

  const state = cache[code] || { loading: true };
  const { loading, steps } = state;
  const { loading: loading_throttled, error } = useThrottle(state, 200);

  const max = useMostRecent(steps, []).length - 1;
  const [at, set_at] = useState(0);
  const step =
    steps && steps[Math.max(0, Math.min(steps.length - 1, Math.round(at)))];

  // State for tabs
  const [activeTab, setActiveTab] = useState("all"); // 'steps', 'scope', 'console', or 'all'
  const [showTabs, setShowTabs] = useState(true); // Whether to show tabs or all in one

  // State for the custom save prompt
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Function to save current script to localStorage
  const saveCurrentScript = () => {
    setShowSavePrompt(true);
    setPresetName("");
  };

  // Function to handle saving the preset
  const handleSavePreset = () => {
    if (presetName && code.trim()) {
      presets.savePresetToStorage(presetName, code);
      setShowSavePrompt(false);
      setPresetName("");
      // Simple way to refresh presets after saving
      window.location.reload();
    }
  };

  // Function to cancel saving
  const handleCancelSave = () => {
    setShowSavePrompt(false);
    setPresetName("");
  };

  return (
    <div className="App">
      <div className="app-header">
        <Menu
          className="menu"
          items={Object.entries(presets)
            .filter(
              ([key]) =>
                key !== "savePresetToStorage" &&
                key !== "removePresetFromStorage"
            )
            .map(([title, preset_code]) => {
              return {
                key: title,
                title,
                active: preset_code === code,
                code: preset_code,
              };
            })}
          onSelect={(item, close) => {
            set_code(item.code);
            set_at(0);
            close();
            const btn = document.getElementById("StepSliderThumb");
            btn && btn.focus();
          }}
        />
        <StepSlider
          max={max}
          step={step}
          value={at}
          onValueChange={set_at}
          loading={loading}
          error={error}
        />
        <button className="save-button" onClick={saveCurrentScript}>
          save
        </button>

        {/* Custom Save Prompt Modal */}
        {showSavePrompt && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Enter a name for your preset:</p>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="preset-input"
                placeholder="Preset name"
                autoFocus
              />
              <div className="button-group">
                <button className="cancel-button" onClick={handleCancelSave}>
                  Cancel
                </button>
                <button
                  className="save-preset-button"
                  onClick={handleSavePreset}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="rewrite-editor">
        <div className="Editor">
          <Editor
            value={code}
            onValueChange={set_code}
            highlight={(code) => <Highlight code={code} step={step} />}
            padding={24}
            preClassName="language-js"
            textareaClassName="Code"
          />
        </div>
        {error ? (
          <div className="InfoPanelGroup">
            <div className="InfoPanel">
              <h2 className="error-title">Uh oh!</h2>
              <pre className="error-message">
                {typeof error === "object"
                  ? `${"type" in error ? `${error.type}: ` : ``}${
                      error.message
                    }`
                  : typeof error === "string"
                  ? error
                  : null}
              </pre>
            </div>
          </div>
        ) : state.config && state.config.executionMode === "iframe" ? (
          // Show iframe when execution mode is iframe
          <div
            className="iframe-container"
            style={{
              width: "100%",
              height: "400px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {state.iframeSrc ? (
              <iframe
                src={state.iframeSrc}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Visualization Sandbox"
              />
            ) : (
              <div style={{ padding: "20px", textAlign: "center" }}>
                Loading iframe...
              </div>
            )}
          </div>
        ) : (
          <div className="visualization-container">
            {showTabs ? (
              // Tabbed interface
              <div className="tabs-interface">
                {/* Tab buttons */}
                <div
                  className="tab-nav"
                  style={{ display: "flex", borderBottom: "1px solid #ccc" }}
                >
                  <button
                    className={`tab-nav-btn ${
                      activeTab === "steps" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("steps")}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      background: activeTab === "steps" ? "#e9ecef" : "white",
                      cursor: "pointer",
                      fontWeight: activeTab === "steps" ? "bold" : "normal",
                    }}
                  >
                    Steps
                  </button>
                  <button
                    className={`tab-nav-btn ${
                      activeTab === "scope" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("scope")}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      background: activeTab === "scope" ? "#e9ecef" : "white",
                      cursor: "pointer",
                      fontWeight: activeTab === "scope" ? "bold" : "normal",
                    }}
                  >
                    Scope
                  </button>
                  <button
                    className={`tab-nav-btn ${
                      activeTab === "console" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("console")}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      background: activeTab === "console" ? "#e9ecef" : "white",
                      cursor: "pointer",
                      fontWeight: activeTab === "console" ? "bold" : "normal",
                    }}
                  >
                    Console
                  </button>
                </div>

                {/* Tab content */}
                <div
                  className="tab-content"
                  style={{ padding: "10px", border: "none" }}
                >
                  {activeTab === "steps" && (
                    <div>
                      {step ? (
                        <Step step={step} logs={[]} />
                      ) : (
                        <Step logs={[]} />
                      )}
                    </div>
                  )}
                  {activeTab === "scope" && (
                    <div>
                      {step ? (
                        <div className="InfoPanel">
                          {step.scopes &&
                            step.scopes
                              .slice()
                              .reduce((childrenScopes, scope, j) => {
                                const bindings = Object.entries(scope);
                                return (
                                  <div
                                    className={`scope-container ${
                                      j === 0 ? "top-scope" : ""
                                    }`}
                                    style={{
                                      display: "inline-block",
                                      marginTop: "10px",
                                      border: `2px solid ${
                                        j === 0 ? "black" : "#ccc"
                                      }`,
                                      padding: "10px",
                                      borderRadius: "4px",
                                      ...(j === 0 && {
                                        boxShadow:
                                          "0 2px 6px rgba(0, 0, 0, .2)",
                                      }),
                                    }}
                                  >
                                    {bindings.length === 0 && (
                                      <p className="no-variables">
                                        <em>(no variables in this scope)</em>
                                      </p>
                                    )}
                                    {bindings.map(([variable, value], i) => {
                                      return (
                                        <div
                                          key={i}
                                          className="binding-item"
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            paddingBottom:
                                              i === bindings.length - 1
                                                ? 0
                                                : 10,
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontFamily: "monospace",
                                              fontSize: "14px",
                                            }}
                                          >
                                            <strong>{variable}:</strong>{" "}
                                            {typeof value === "object"
                                              ? JSON.stringify(value)
                                              : String(value)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {childrenScopes}
                                  </div>
                                );
                              }, <div />)}
                        </div>
                      ) : (
                        <div className="InfoPanel">No scope data available</div>
                      )}
                    </div>
                  )}
                  {activeTab === "console" && (
                    <div>
                      {step && steps ? (
                        <div className="InfoPanel">
                          {steps
                            .slice(0, step.num + 1)
                            .map((s) => s.logs || [])
                            .flat()
                            .map((items, i) => {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    paddingBottom: 10,
                                    ...(i !== 0 && {
                                      borderTop: "2px solid #ccc",
                                      paddingTop: 10,
                                    }),
                                  }}
                                >
                                  {items.map((item, j) => {
                                    return (
                                      <div
                                        key={j}
                                        className="console-item"
                                        style={{
                                          fontFamily: "monospace",
                                          fontSize: "14px",
                                        }}
                                      >
                                        {typeof item === "object"
                                          ? JSON.stringify(item)
                                          : String(item)}{" "}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="InfoPanel">
                          No console output available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // All-in-one view
              <div className="all-in-one-view">
                <div style={{ display: "flex", gap: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <h3>Steps</h3>
                    {step && steps ? (
                      <Step
                        step={step}
                        logs={steps
                          .slice(0, step.num + 1)
                          .map((s) => s.logs || [])
                          .flat()}
                      />
                    ) : (
                      <Step />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3>Scope & Console</h3>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <div className="InfoPanel">
                        <h2>Scope</h2>
                        {step && step.scopes ? (
                          step.scopes
                            .slice()
                            .reduce((childrenScopes, scope, j) => {
                              const bindings = Object.entries(scope);
                              return (
                                <div
                                  className={`scope-container ${
                                    j === 0 ? "top-scope" : ""
                                  }`}
                                  style={{
                                    display: "inline-block",
                                    marginTop: "10px",
                                    border: `2px solid ${
                                      j === 0 ? "black" : "#ccc"
                                    }`,
                                    padding: "10px",
                                    borderRadius: "4px",
                                    ...(j === 0 && {
                                      boxShadow: "0 2px 6px rgba(0, 0, 0, .2)",
                                    }),
                                  }}
                                >
                                  {bindings.length === 0 && (
                                    <p className="no-variables">
                                      <em>(no variables in this scope)</em>
                                    </p>
                                  )}
                                  {bindings.map(([variable, value], i) => {
                                    return (
                                      <div
                                        key={i}
                                        className="binding-item"
                                        style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          paddingBottom:
                                            i === bindings.length - 1 ? 0 : 10,
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontFamily: "monospace",
                                            fontSize: "14px",
                                          }}
                                        >
                                          <strong>{variable}:</strong>{" "}
                                          {typeof value === "object"
                                            ? JSON.stringify(value)
                                            : String(value)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {childrenScopes}
                                </div>
                              );
                            }, <div />)
                        ) : (
                          <p>No scope data available</p>
                        )}
                      </div>
                      <div className="InfoPanel">
                        <h2>Console</h2>
                        {steps && step ? (
                          steps
                            .slice(0, step.num + 1)
                            .map((s) => s.logs || [])
                            .flat()
                            .map((items, i) => {
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    paddingBottom: 10,
                                    ...(i !== 0 && {
                                      borderTop: "2px solid #ccc",
                                      paddingTop: 10,
                                    }),
                                  }}
                                >
                                  {items.map((item, j) => {
                                    return (
                                      <div
                                        key={j}
                                        className="console-item"
                                        style={{
                                          fontFamily: "monospace",
                                          fontSize: "14px",
                                        }}
                                      >
                                        {typeof item === "object"
                                          ? JSON.stringify(item)
                                          : String(item)}{" "}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })
                        ) : (
                          <p>No console output available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <p style={{ opacity: "0" }}>{scalePercentage}</p>
      <p>todo: add web api somehow with iframe </p>
    </div>
  );
}
