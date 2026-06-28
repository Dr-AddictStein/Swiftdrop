process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/swiftdrop_test';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.JWT_EXPIRES_IN ??= '1d';
process.env.API_KEY ??= 'test-api-key';
