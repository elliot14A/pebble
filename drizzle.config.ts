import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema',
	out: './drizzle/migrations',
	dialect: 'sqlite',
	verbose: true,
	strict: true
});
