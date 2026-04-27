// Central API configuration
const API_BASE = process.env.NODE_ENV === 'production'
  ? "netsight-backend-production.up.railway.app/api/v1"
  : "http://localhost:5000/api/v1";

export default API_BASE;
