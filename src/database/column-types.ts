// sql.js (tests) no soporta timestamptz
export const TIMESTAMPTZ =
  process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';
