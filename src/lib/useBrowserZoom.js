import { useLayoutEffect, useState } from "react";

const useBrowserZoom = () => {
  const [zoomLevel, setZoomLevel] = useState(1); // Default to 1 (100%)

  const handleResize = () => {
    const newZoomLevel = window.outerWidth / window.innerWidth;

    setZoomLevel(newZoomLevel);
  };

  useLayoutEffect(() => {
    window.addEventListener("resize", handleResize);

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return zoomLevel;
};

export default useBrowserZoom;
