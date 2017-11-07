export const getTraceAmount = () =>
  fetch("http://localhost:9411/api/v2/traces")
    .then(res => res.json())
    .then(res => res.length);

export const getLastTrace = () =>
  fetch("http://localhost:9411/api/v2/traces")
    .then(res => res.json())
    .then(res => res[res.length - 1][0]);
