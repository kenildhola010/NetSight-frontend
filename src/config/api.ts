// Central API configuration
const API_BASE = process.env.NODE_ENV === 'production'
  ? "https://net-sight-tbd4.vercel.app/api/v1"
  : "http://localhost:5000/api/v1";

export default API_BASE;
