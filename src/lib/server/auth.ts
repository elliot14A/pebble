import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { createDB } from './db';

let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = (db: ReturnType<typeof createDB>, env: Env) => {
	if (!authInstance) {
		authInstance = betterAuth({
			database: drizzleAdapter(db, {
				provider: 'sqlite'
			}),
			baseURL: env.BASE_URL,
			socialProviders: {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET
				}
			}
		});
	}
	return authInstance;
};

export type Auth = ReturnType<typeof getAuth>;
