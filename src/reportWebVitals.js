const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals")
      .then((webVitals) => {
        webVitals.getCLS(onPerfEntry);
        webVitals.getFID(onPerfEntry);
        webVitals.getFCP(onPerfEntry);
        webVitals.getLCP(onPerfEntry);
        webVitals.getTTFB(onPerfEntry);
      })
      .catch((err) => {
        console.error("Error importing web-vitals:", err);
      });
  }
};

export default reportWebVitals;
