import { stripIndent } from "common-tags";
import { highlight, languages } from "prismjs/components/prism-core";
import { useState } from "react";

import { IoIosArrowDropdownCircle } from "react-icons/io";
import styles from "./Explainer.module.css";

export default function Explainer() {
  const [expanded, set_expanded] = useState(false);

  return (
    <div>
      <h2
        className={`${styles.explainerHeader} ${expanded ? styles.expanded : ''}`}
        onClick={() => set_expanded(!expanded)}
      >
        How is it made?{" "}
        <IoIosArrowDropdownCircle
          className={`${styles.arrowIcon} ${expanded ? styles.expanded : ''}`}
        />
      </h2>
      {expanded && (
        <div className={styles.explainerContent}>
          <p>
            The tool uses a <a href="https://babeljs.io/">Babel</a> syntax
            transform to add in little "reporter" function calls around most
            every statement and/or expression in the code. For example, this
            code:
          </p>
          <Code>{stripIndent`
            let x = 6;
          `}</Code>
          <p>is translated into:</p>
          <Code>{stripIndent`
            _report("VariableDeclaration", ...);
            let x = _report(6, "NumericLiteral", ...);
          `}</Code>
          <p>
            These reporter calls note all kinds of metadata about the node in
            question, like its location, the current values of all variables
            currently in scope, etc.
          </p>
          <p>
            The transformed code is run inside of a web worker, and all the
            steps are recorded. These are then turned into the interactive
            visualization you see above.
          </p>
          <p>
            For more info, check the{" "}
            <a href="https://github.com/kelleyvanevert/js_visualized_v2">
              source code
            </a>{" "}
            <em>(all contributions are welcome!)</em>, or the slightly outdated{" "}
            <a href="https://observablehq.com/@kelleyvanevert/visualizing-js-execution-2">
              Observable notebook
            </a>{" "}
            I used for prototyping.
          </p>
        </div>
      )}
    </div>
  );
}

function Code({ children }) {
  return (
    <pre
      className={styles.codeBlock}
      dangerouslySetInnerHTML={{
        __html: highlight(children, languages.js),
      }}
    />
  );
}
