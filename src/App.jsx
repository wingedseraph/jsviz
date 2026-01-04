import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import { useThrottle } from "react-use";
import { transform, registerPlugin } from "@babel/standalone";
import transpilerPlugin from "./worker/transpile_plugin";

// Register the custom plugin with Babel standalone
registerPlugin("transpilerPlugin", transpilerPlugin);

// Add Vue to global scope
// import Vue from 'vue';
// globalThis.Vue = Vue;

import add_waiting_time_steps from "./lib/add_waiting_time_steps";
import { undescribe, describe } from "./lib/describe";
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
import './prism-one-light.css'

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
  });

  // Periodically save the current script to localStorage (every 2 seconds)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      localStorage.setItem("js_visualized_last_session", code);
    }, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(saveInterval);
  }, [code]);

  useEffect(() => {
    if (worker && !cache[code]) {
      try {
        // Transpile the code in the main thread before sending to worker
        const transpiled = transform(code, {
          plugins: [["transpilerPlugin", { ns: "__V__" }]]
        }).code;

        // Send both the original code and the transpiled code to the worker
        worker.postMessage({
          code,
          transpiled,
          describeStr: describe.toString() // Send the describe function as a string
        });
      } catch (error) {
        // Handle syntax errors in the user's code
        worker.postMessage({
          code,
          config: {},
          error: {
            message: error.message,
            type: error.constructor.name
          }
        });
      }
    }
  }, [code, cache, worker]);

  const state = cache[code] || { loading: true };
  const { loading, steps } = state;
  const { loading: loading_throttled, error } = useThrottle(state, 200);

  const max = useMostRecent(steps, []).length - 1;
  const [at, set_at] = useState(0);
  const step =
    steps && steps[Math.max(0, Math.min(steps.length - 1, Math.round(at)))];

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
        ) : step ? (
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
      <p style={{ opacity: "0" }}>{scalePercentage}</p>
    </div>
  );
}
