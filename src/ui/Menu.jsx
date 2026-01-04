import { useRef, useState } from "react";
import { useClickAway } from "react-use";

import theme from "./theme";
import styles from "./Menu.module.css";

export default function Menu({ items, onSelect, ...props }) {
  const [open, set_open] = useState(false);
  const close = () => set_open(false);

  const ref = useRef(null);
  useClickAway(ref, close);

  return (
    <div {...props} className={styles.menuContainer} ref={ref}>
      <button
        onClick={() => set_open((open) => !open)}
        className={styles.menuButton}
      >
        <span className={styles.center}>
          <span
            style={{
              transform: open
                ? "translate(-6px, -6px) rotate(+45deg)"
                : "translate(-6px, -8px)",
            }}
          />
          <span
            style={{
              transform: open
                ? "translate(+6px, -6px) rotate(-45deg)"
                : "translate(+6px, -8px)",
            }}
          />
          <span
            style={{
              transform: open ? "scale(0, 1)" : "scale(1.6, 1)",
            }}
          />
          <span
            style={{
              transform: open
                ? "translate(-6px, +6px) rotate(-45deg)"
                : "translate(-6px, +8px)",
            }}
          />
          <span
            style={{
              transform: open
                ? "translate(+6px, +6px) rotate(+45deg)"
                : "translate(+6px, +8px)",
            }}
          />
        </span>
      </button>
      <div>
        {open && (
          <div className={styles.menuDropdown}>
            <div className={styles.menuListContainer}>
              <ul className={styles.menuList}>
                {items.map((item) => {
                  return (
                    <li key={item.key}>
                      <button
                        className={item.active ? styles.active : ''}
                        style={item.active ? {
                          backgroundColor: theme.blue,
                          color: 'white'
                        } : {}}
                        onClick={() => onSelect(item, close)}
                      >
                        {item.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
