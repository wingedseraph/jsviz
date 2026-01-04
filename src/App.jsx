import "styled-components/macro";
import React, { useState, useEffect } from "react";
import { useThrottle } from "react-use";
import Editor from "react-simple-code-editor";

import { undescribe } from "./lib/describe";
import add_waiting_time_steps from "./lib/add_waiting_time_steps";
import presets from "./lib/presets";

import useCode from "./lib/useCode";
import useMostRecent from "./lib/useMostRecent";
import useReplacableWorker from "./lib/useReplacableWorker";
import useBrowserZoom from "./lib/useBrowserZoom";

import StepSlider from "./ui/StepSlider";
import Highlight from "./ui/Highlight";
import Menu from "./ui/Menu";
import Step from "./ui/Step";

import "./App.scss";

export default function App() {
  // Load the latest session from localStorage on initial load, fallback to default preset
  const initialCode = localStorage.getItem('js_visualized_last_session') || presets["Promise / fetch"];
  const [code, set_code] = useCode(initialCode);
  const [cache, set_cache] = useState({});
const zoomLevel = useBrowserZoom();
  const scalePercentage = Math.round(zoomLevel * 100)

  const worker = useReplacableWorker(data => {
    if (!data.error) {
      data.steps = JSON.parse(data.steps);
      data.steps.forEach(step => {
        if ("value" in step) {
          step.value = undescribe(step.value);
        }
        if ("scopes" in step) {
          step.scopes.forEach(scope => {
            Object.keys(scope).forEach(key => {
              scope[key] = undescribe(scope[key]);
            });
          });
        }
        if ("logs" in step) {
          step.logs = step.logs.map(line => {
            return line.map(item => undescribe(item));
          });
        }
      });
      add_waiting_time_steps(data.steps);
    }
    set_cache(cache => {
      return {
        ...cache,
        [data.code]: data
      };
    });
  });

  // Periodically save the current script to localStorage (every 2 seconds)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      localStorage.setItem('js_visualized_last_session', code);
    }, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(saveInterval);
  }, [code]);

  useEffect(() => {
    if (worker && !cache[code]) {
      worker.postMessage({ code });
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
      <div
        css={`
          display: flex;
          align-items: center;
        `}
      >
        <Menu
          css="margin-right: 1rem;"
          items={Object.entries(presets).filter(([key]) => key !== 'savePresetToStorage' && key !== 'removePresetFromStorage').map(([title, preset_code]) => {
            return {
              key: title,
              title,
              active: preset_code === code,
              code: preset_code
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
        <button
          css={`
            cursor: pointer;
            border: none;
            outline: none;
            color:black;
            background:transparent;
            font-size: 2rem;
          `}
          onClick={saveCurrentScript}
        >
          save
        </button>

        {/* Custom Save Prompt Modal */}
        {showSavePrompt && (
          <div
            css={`
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
            `}
          >
            <div
              css={`
                background: white;
                padding: 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                min-width: 300px;
              `}
            >
              <p>Enter a name for your preset:</p>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                css={`
                  width: 100%;
                  padding: 0.5rem;
                  margin-bottom: 1rem;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  box-sizing: border-box;
                  outline:none;
                `}
                placeholder="Preset name"
                autoFocus
              />
              <div css="display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button
                  css={`
                    padding: 0.5rem 1rem;
                    background: transparent;
                    color: color;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                  `}
                  onClick={handleCancelSave}
                >
                  Cancel
                </button>
                <button
                  css={`
                    padding: 0.5rem 1rem;
                    background: transparent;
                    color: color;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                  `}
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
          highlight={code => <Highlight code={code} step={step} />}
          padding={24}
          preClassName="language-js"
          textareaClassName="Code"
        />
      </div>
      {error ? (
        <div className="InfoPanelGroup">
          <div className="InfoPanel">
            <h2 css="color: #c00;">Uh oh!</h2>
            <pre css="color: #c00;">
              {typeof error === "object"
                ? `${"type" in error ? `${error.type}: ` : ``}${error.message}`
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
            .map(s => s.logs || [])
            .flat()}
        />
      ) : (
        <Step />
      )}

</div>
<p style={{opacity:'0'}}>{scalePercentage}</p>
    </div>
  );
}
