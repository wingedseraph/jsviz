import { useEffect, useRef } from "react";

const useCodeHighlight = (editorRef, monacoRef, step) => {
  const decorationsRef = useRef([]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !step) {
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          [],
        );
      }
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      [],
    );

    if (step && step.loc) {
      const { start, end } = step.loc;

      if (start && end) {
        const startLine = Math.max(1, start.line);
        const endLine = Math.max(startLine, end.line);
        const startColumn = Math.max(1, start.column + 1);
        const endColumn = Math.max(startColumn, end.column + 1);

        const range = new monaco.Range(
          startLine,
          startColumn,
          endLine,
          endColumn,
        );

        let scopeInfo = "";
        if (step.scopes && step.scopes.length > 0) {
          step.scopes.forEach((scope, index) => {
            const bindings = Object.entries(scope);
            if (bindings.length > 0) {
              scopeInfo += `Scope ${index + 1}:\n`;
              bindings.forEach(([variable, value]) => {
                scopeInfo += `  ${variable}: ${JSON.stringify(value)}\n`;
              });
            }
          });
        }

        const hoverMessage = scopeInfo
          ? {
              value: `Execution step: ${step.num || "unknown"}\n\n${scopeInfo}`,
            }
          : {
              value: `Execution step: ${step.num || "unknown"} - ${
                step.type || "unknown type"
              }`,
            };

        const isAboutToExecute = step.time === "before";
        const isCurrentlyExecuting = step.time === "after";

        const className = isCurrentlyExecuting
          ? "monaco-current-execution-code"
          : isAboutToExecute
            ? "monaco-about-to-execute-code"
            : "monaco-about-to-execute-code";
        const inlineClassName = isCurrentlyExecuting
          ? "monaco-current-execution-inline"
          : isAboutToExecute
            ? "monaco-about-to-execute-inline"
            : "monaco-about-to-execute-inline";

        const executionState = isCurrentlyExecuting
          ? step.category === "expression"
            ? "evaluated"
            : "executed"
          : isAboutToExecute
            ? step.category === "expression"
              ? "about to evaluate"
              : "about to execute"
            : step.category === "expression"
              ? "evaluated"
              : "executed";

        let valueInfo = "";
        if (
          isCurrentlyExecuting &&
          step.category === "expression" &&
          step.value !== undefined
        ) {
          try {
            valueInfo = `Value: ${JSON.stringify(step.value, null, 2)}`;
          } catch (e) {
            valueInfo = `Value: ${String(step.value)}`;
          }
        }

        const hoverMessageWithState = scopeInfo
          ? {
              value: `${executionState} step: ${step.num || "unknown"}\n\n${
                valueInfo ? valueInfo + "\n\n" : ""
              }${scopeInfo}`,
            }
          : {
              value: `${executionState} step: ${step.num || "unknown"} - ${
                step.type || "unknown type"
              }${valueInfo ? "\n\n" + valueInfo : ""}`,
            };

        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          [
            {
              range: range,
              options: {
                isWholeLine: false,
                className: className,
                inlineClassName: inlineClassName,
                hoverMessage: hoverMessageWithState,
              },
            },
          ],
        );
      }
    } else if (step && step.line) {
      const line = Math.max(1, step.line);
      const model = editor.getModel();
      const maxColumn = model ? model.getLineMaxColumn(line) : 1000;

      const range = new monaco.Range(line, 1, line, maxColumn);

      let scopeInfo = "";
      if (step.scopes && step.scopes.length > 0) {
        step.scopes.forEach((scope, index) => {
          const bindings = Object.entries(scope);
          if (bindings.length > 0) {
            scopeInfo += `Scope ${index + 1}:\n`;
            bindings.forEach(([variable, value]) => {
              scopeInfo += `  ${variable}: ${JSON.stringify(value)}\n`;
            });
          }
        });
      }

      const hoverMessage = scopeInfo
        ? { value: `Execution step: ${step.num || "unknown"}\n\n${scopeInfo}` }
        : {
            value: `Execution step: ${step.num || "unknown"} - ${
              step.type || "unknown type"
            }`,
          };

      const isAboutToExecute = step.time === "before";
      const isCurrentlyExecuting = step.time === "after";

      const className = isCurrentlyExecuting
        ? "monaco-current-execution-line"
        : isAboutToExecute
          ? "monaco-about-to-execute-line"
          : "monaco-about-to-execute-line";

      const executionState = isCurrentlyExecuting
        ? step.category === "expression"
          ? "evaluated"
          : "executed"
        : isAboutToExecute
          ? step.category === "expression"
            ? "about to evaluate"
            : "about to execute"
          : step.category === "expression"
            ? "evaluated"
            : "executed";

      let valueInfo = "";
      if (
        isCurrentlyExecuting &&
        step.category === "expression" &&
        step.value !== undefined
      ) {
        try {
          valueInfo = `Value: ${JSON.stringify(step.value, null, 2)}`;
        } catch (e) {
          valueInfo = `Value: ${String(step.value)}`;
        }
      }

      const hoverMessageWithState = scopeInfo
        ? {
            value: `${executionState} step: ${step.num || "unknown"}\n\n${
              valueInfo ? valueInfo + "\n\n" : ""
            }${scopeInfo}`,
          }
        : {
            value: `${executionState} step: ${step.num || "unknown"} - ${
              step.type || "unknown type"
            }${valueInfo ? "\n\n" + valueInfo : ""}`,
          };

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: range,
          options: {
            isWholeLine: true,
            className: className,
            hoverMessage: hoverMessageWithState,
          },
        },
      ]);
    }

    return () => {
      if (editor && decorationsRef.current) {
        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          [],
        );
      }
    };
  }, [editorRef, monacoRef, step]);

  return decorationsRef;
};

export default useCodeHighlight;
