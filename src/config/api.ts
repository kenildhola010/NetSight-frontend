// Central API configuration
const API_BASE = process.env.NODE_ENV === 'production'
  ? "https://github.com/kenildhola010/NetSight-frontend/api/v1"
  : "http://localhost:5000/api/v1";

export default API_BASE;
