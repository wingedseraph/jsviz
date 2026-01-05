import React from "react";
import { ObjectInspector, chromeLight } from "react-inspector";

import format_dt from "../lib/format_dt";
import theme from "./theme";

import Intro from "./Intro";
import Explainer from "./Explainer";

const inspectorTheme = {
  ...chromeLight,
  BASE_FONT_FAMILY: "Menlo, Consolas, monospace",
  BASE_FONT_SIZE: "14px",
  BASE_LINE_HEIGHT: 1.5,
  TREENODE_FONT_FAMILY: "Menlo, Consolas, monospace",
  TREENODE_FONT_SIZE: "14px",
  TREENODE_LINE_HEIGHT: 1.5
};

export default function Step({ step = { category: "init" }, logs = [] }) {
  if (step.category === "init") {
    return (
      <div className="InfoPanelGroup hidden">
        <div className="InfoPanel">
          <Intro />
        </div>
        <div className="InfoPanel">
          <Explainer />
        </div>
      </div>
    );
  } else if (step.category === "wait") {
    return (
      <div className="wait-step">
        &hellip;not doing anything for ± {format_dt(step.wait)}
      </div>
    );
  } else {
    return (
      <div className="InfoPanelGroup">
        <div className="custom-panel-group">
        <div className="InfoPanel">
          <h2>Step</h2>
          {step.time && step.category && step.type && (
            <div>
              <p>
                <strong style={{ color: theme[step.time].fg }}>
                  {step.time === "before"
                    ? `about to ${
                        step.category === "expression" ? "evaluate" : "execute"
                      }`
                    : step.category === "statement"
                    ? "executed"
                    : "evaluated"}
                </strong>{" "}
                {step.category}
                <br />
                <span className="step-type-info">
                  (of type <strong>{step.type}</strong>)
                </span>
              </p>
              {step.time === "after" && step.category === "expression" && (
                <p>&hellip;to the value:</p>
              )}
            </div>
          )}
          {step.time === "after" && step.category === "expression" && (
            <ObjectInspector
              theme={{
                ...inspectorTheme,
                BASE_FONT_SIZE: "20px",
                TREENODE_FONT_SIZE: "20px"
              }}
              data={step.value}
            />
          )}
        </div>
        <div className="InfoPanel">
          <h2>Scope</h2>
          {step.scopes &&
            step.scopes.slice().reduce((childrenScopes, scope, j) => {
              const bindings = Object.entries(scope);
              return (
                <div
                  className={`scope-container ${j === 0 ? 'top-scope' : ''}`}
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    border: `2px solid ${j === 0 ? "black" : "#ccc"}`,
                    padding: '10px',
                    borderRadius: '4px',
                    ...(j === 0 && { boxShadow: '0 2px 6px rgba(0, 0, 0, .2)' })
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
                          paddingBottom: i === bindings.length - 1 ? 0 : 10
                        }}
                      >
                        <ObjectInspector
                          theme={inspectorTheme}
                          name={variable}
                          data={value}
                        />
                      </div>
                    );
                  })}
                  {childrenScopes}
                </div>
              );
            }, <div />)}
        </div>
</div>
        <div className="InfoPanel">
          <h2>Console</h2>
          {logs.map((items, i) => {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  paddingBottom: 10,
                  ...(i !== 0 && {
                    borderTop: "2px solid #ccc",
                    paddingTop: 10
                  })
                }}
              >
                {items.map((item, i) => {
                  return (
                    <div key={i} className="console-item">
                      <ObjectInspector theme={inspectorTheme} data={item} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
