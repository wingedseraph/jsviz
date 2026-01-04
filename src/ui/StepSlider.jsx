import React, { useRef, useMemo, useEffect, useState } from "react";
import { Range, getTrackBackground } from "react-range";
import { IoIosArrowDroprightCircle, IoIosCloseCircle } from "react-icons/io";

import format_dt from "../lib/format_dt";

import Spinner from "./Spinner";
import theme from "./theme";
import styles from "./StepSlider.module.css";

export default function StepSlider({
  max,
  value,
  onValueChange,
  error,
  loading,
  step
}) {
  max = Math.max(1, max);
  value = Math.max(0, Math.min(value, max));

  const btn = useRef(null);

  const at = Math.round(value);

  const thumb = useDelayed(
    useMemo(() => {
      return {
        loading,
        error,
        content: loading ? (
          <Spinner size={32} color={theme.blue} />
        ) : error ? (
          <IoIosCloseCircle size="24px" />
        ) : (
          <>{at || <IoIosArrowDroprightCircle size="24px" />}</>
        )
      };
    }, [loading, error, value]),
    // Directly update the step number, but
    //  defer notification of loading/error state
    //  just a bit for a less haptic feel (while typing)
    loading || error ? 100 : 0
  );

  const focusNow = () => {
    if (btn.current) {
      btn.current.focus();
    }
  };

  return (
    <div className={styles.container}>
      <Range
        values={[value]}
        step={0.001}
        min={0}
        max={max}
        onChange={([value]) => {
          focusNow();
          onValueChange(value);
        }}
        renderTrack={({ props, children }) => {
          return (
            <div
              onMouseDown={e => {
                props.onMouseDown(e);
              }}
              onTouchStart={e => {
                props.onTouchStart(e);
              }}
              // onTouchStart={e => {
              //   if (e.touches.length > 1) {
              //     e.stopPropagation();   // stops react-range from seeing a "drag"
              //     return;
              //   }
              //   props.onTouchStart(e);
              // }}
              style={props.style}
              className={styles.trackContainer}
            >
              <div
                ref={props.ref}
                className={styles.trackInner}
              >
                {children}
                <div
                  className={styles.trackBackground}
                  style={{
                    background: getTrackBackground({
                      values: [value],
                      colors: [
                        thumb.error
                          ? "#c00"
                          : thumb.loading
                          ? "#eee"
                          : theme.blue,
                        "#eee"
                      ],
                      min: 0,
                      max
                    })
                  }}
                />
                {value < 0.1 && (
                  <div
                    className={styles.trackHelperText}
                  >
                    {thumb.loading
                      ? "Loading..."
                      : !thumb.error && "Drag me to start!"}
                  </div>
                )}
              </div>
            </div>
          );
        }}
        renderThumb={({ props }) => {
          return (
            <div
              {...props}
              style={{ ...props.style, zIndex: 30 }}
              onKeyDown={e => {
                if (e.key === "ArrowLeft") {
                  onValueChange(Math.round(value - 1));
                } else if (e.key === "ArrowRight") {
                  onValueChange(Math.round(value + 1));
                }
              }}
            >
              <button
                id="StepSliderThumb"
                autoFocus
                ref={btn}
                className={`${styles.thumbButton} ${thumb.error ? styles.error : ''}`}
                style={{
                  color: thumb.error ? '#c00' : (btn.current === document.activeElement ? theme.blue : undefined),
                  borderColor: thumb.error ? '#c00' : (btn.current === document.activeElement ? theme.blue : undefined)
                }}
              >
                {thumb.content}
              </button>
              <div className={styles.thumbButtonContainer}>
                {step && "dt" in step && (
                  <div
                    className={styles.stepTime}
                  >
                    {format_dt(step.dt, "@ ")}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

function useDelayed(stableMostRecent, ms) {
  const [last, set_last] = useState(stableMostRecent);

  useEffect(() => {
    let id = setTimeout(() => {
      set_last(stableMostRecent);
    }, ms);
    return () => clearTimeout(id);
  }, [stableMostRecent]);

  return last;
}
