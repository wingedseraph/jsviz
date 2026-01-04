import React from "react";

export default function Spinner({ size = 40, color = "black", ...props }) {
  const spinnerStyle = {
    position: 'relative',
    height: `${size}px`,
    width: `${size}px`,
  };

  // Add the keyframes to the document
  React.useEffect(() => {
    if (!document.getElementById('spinner-keyframes')) {
      const style = document.createElement('style');
      style.id = 'spinner-keyframes';
      style.innerHTML = `
        @keyframes Spinner_kf {
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div
      {...props}
      style={spinnerStyle}
    >
      <div
        style={{
          content: '""',
          boxSizing: 'border-box',
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${size}px`,
          height: `${size}px`,
          marginTop: `-${size / 2}px`,
          marginLeft: `-${size / 2}px`,
          borderRadius: '50%',
          border: '0.2rem solid #ccc',
          borderTopColor: color,
          animation: 'Spinner_kf 0.6s linear infinite',
        }}
      />
    </div>
  );
}
